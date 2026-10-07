import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Message, Poll, Room, SecretChatTtl, UserId, UserProfile } from '../types';
import { DEFAULT_USER_PROFILES, SERVER_URL } from '../constants';
import { isUserMentionedInText } from '../lib/mentions';
import { isMessageExpired, isValidTtl } from '../lib/e2ee';
import { OfflineQueue, createClientId, toOptimisticMessage, type OutgoingMessage } from '../lib/offline-queue';
import { SecretChatError, SecretSessionManager, isSecretRoom, secretPeer } from '../lib/secret-sessions';
import {
  applyPollVote,
  applySendAck,
  countUnread,
  dedupeMessages,
  encodeForwardMarker,
  isMeaningfulMessage,
  mergeHistory,
  sanitizeMessage,
  stripForwardMarker,
  unreadIds,
  upsertIncoming,
} from '../lib/message-sync';
import { uploadFile } from '../services/upload.service';
import {
  MessagesContext,
  useAuth,
  useConnection,
  useRooms,
  type ForwardSource,
  type MessagesContextValue,
  type OutgoingFile,
  type SendOptions,
} from './contexts';

const TTL_KEY = 'tg_secret_ttl_v1';
const MUTED_KEY = 'tg_muted_rooms';
const NOTIFY_KEY = 'tg_notifications_enabled';
const SEND_TIMEOUT_MS = 8000;
const DECRYPT_FAILED = '🔒 Не удалось расшифровать сообщение';

interface SendAck {
  ok: boolean;
  id?: string;
  clientId?: string;
  duplicate?: boolean;
  scheduled?: boolean;
  scheduledAt?: number;
  error?: string;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function playNotificationSound() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
    osc.onended = () => void ctx.close();
  } catch {
    // AudioContext may be blocked before the first user gesture
  }
}

const withNavigatorLock = <T,>(name: string, fn: () => Promise<T>): Promise<T> =>
  typeof navigator !== 'undefined' && navigator.locks ? navigator.locks.request(name, fn) : fn();

const needsUpload = (file: OutgoingFile) =>
  Boolean(file.rawBlob) ||
  !(file.type === 'sticker' || (file.data.startsWith('http') && !file.data.startsWith('blob:')) || file.data.startsWith('data:image/svg'));

/**
 * Message list + delivery pipeline:
 *  optimistic bubble → (upload) → (E2EE encrypt) → `send_message` with ack →
 *  on timeout/offline the payload goes to the IndexedDB outbox («ожидание 🕒»)
 *  and is flushed on reconnect; the server dedupes retries by `clientId`.
 */
export const MessagesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { socket, isConnected, emitWithAck, setError } = useConnection();
  const { rooms, activeRoomId, setActiveRoomId, userProfiles, getUserDisplayName } = useRooms();

  const [messages, setMessages] = useState<Message[]>([]);
  const [scheduledMessages, setScheduledMessages] = useState<Message[]>([]);
  const [queuedCount, setQueuedCount] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [keyEpoch, setKeyEpoch] = useState(0);
  const [ttlByRoom, setTtlByRoom] = useState<Record<string, SecretChatTtl>>(() => readJson(TTL_KEY, {}));
  const [notificationsEnabled, setNotificationsEnabledState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(NOTIFY_KEY) !== 'false';
    } catch {
      return true;
    }
  });

  const queue = useMemo(() => (currentUser ? new OfflineQueue(undefined, currentUser) : null), [currentUser]);
  const secrets = useMemo(
    () =>
      currentUser
        ? new SecretSessionManager(currentUser, {
            fetchPeerKey: async (userId) =>
              (await emitWithAck<{ publicKey: string | null }>('e2ee_get_key', { userId }, 4000))?.publicKey ?? null,
            withLock: withNavigatorLock,
          })
        : null,
    [currentUser, emitWithAck],
  );

  // ----- refs for socket handlers (registered once per socket) -----
  const messagesRef = useRef(messages);
  const roomsRef = useRef<Room[]>(rooms);
  const activeRoomIdRef = useRef(activeRoomId);
  const currentUserRef = useRef(currentUser);
  const notificationsRef = useRef(notificationsEnabled);
  const profilesRef = useRef<Record<UserId, UserProfile>>(userProfiles);
  const displayNameRef = useRef(getUserDisplayName);
  const navigateRef = useRef(setActiveRoomId);
  useEffect(() => {
    messagesRef.current = messages;
    roomsRef.current = rooms;
    activeRoomIdRef.current = activeRoomId;
    currentUserRef.current = currentUser;
    notificationsRef.current = notificationsEnabled;
    profilesRef.current = userProfiles;
    displayNameRef.current = getUserDisplayName;
    navigateRef.current = setActiveRoomId;
  });

  const setNotificationsEnabled = useCallback((enabled: boolean) => {
    setNotificationsEnabledState(enabled);
    try {
      localStorage.setItem(NOTIFY_KEY, String(enabled));
      if (enabled && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => undefined);
      }
    } catch {
      // ignore
    }
  }, []);

  // ===== Sign-out: wipe the local outbox and in-memory plaintext =====
  const lastQueueRef = useRef<OfflineQueue | null>(null);
  useEffect(() => {
    if (queue) {
      lastQueueRef.current = queue;
      return;
    }
    void lastQueueRef.current?.clear();
    lastQueueRef.current = null;
    setMessages([]);
    setScheduledMessages([]);
    setQueuedCount(0);
    setPlayingAudioId(null);
  }, [queue]);

  // ===== Read receipts =====
  const markRoomAsRead = useCallback(
    (roomId: string) => {
      const user = currentUserRef.current;
      if (!socket || !isConnected || !user) return;
      const ids = new Set(unreadIds(messagesRef.current, roomId, user));
      if (ids.size === 0) return;
      socket.emit('mark_read', { roomId, messageIds: [...ids] });
      setMessages((prev) =>
        prev.map((m) => (ids.has(m.id) ? { ...m, readBy: Array.from(new Set([...(m.readBy || []), user])) } : m)),
      );
    },
    [socket, isConnected],
  );

  const unreadCount = useCallback(
    (roomId: string) => (currentUser ? countUnread(messages, roomId, currentUser) : 0),
    [messages, currentUser],
  );

  const lastMessageOf = useCallback(
    (roomId: string) => {
      for (let i = messages.length - 1; i >= 0; i -= 1) if (messages[i].roomId === roomId) return messages[i];
      return null;
    },
    [messages],
  );

  // ===== Sound + browser notifications =====
  const notifyNewMessage = useCallback(
    (message: Message) => {
      if (activeRoomIdRef.current === message.roomId && document.visibilityState === 'visible') {
        markRoomAsRead(message.roomId);
        return;
      }
      if (!notificationsRef.current) return;

      const room = roomsRef.current.find((r) => r.id === message.roomId);
      const senderName = displayNameRef.current(message.sender);
      const roomName = room ? (room.type === 'group' ? room.name : senderName) : 'Чат';
      const secret = isSecretRoom(room ?? { id: message.roomId });

      // Mentions bypass per-chat mute (Telegram behaviour). Secret chats never leak plaintext.
      const me = currentUserRef.current;
      const myProfile = me ? profilesRef.current[me] || DEFAULT_USER_PROFILES[me] : null;
      const isMention =
        !secret &&
        isUserMentionedInText(message.text, { id: me || undefined, username: myProfile?.username, firstName: myProfile?.firstName });
      if (!isMention && readJson<Record<string, boolean>>(MUTED_KEY, {})[message.roomId]) return;

      // «Отправить без звука»: the notification is shown silently.
      if (!message.silent) playNotificationSound();

      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          const body = secret
            ? '🔒 Новое сообщение'
            : message.text
              ? stripForwardMarker(message.text)
              : message.file
                ? '📎 Вложение'
                : 'Новое сообщение';
          const n = new Notification(isMention ? `${senderName} упомянул(а) вас · ${roomName}` : `${senderName} · ${roomName}`, {
            body,
            tag: isMention ? `mention-${message.id}` : message.roomId,
            icon: '/icon-192.png',
            silent: Boolean(message.silent),
          });
          n.onclick = () => {
            window.focus();
            n.close();
            navigateRef.current(message.roomId);
          };
        } catch {
          // ignore notification errors
        }
      }
    },
    [markRoomAsRead],
  );
  const notifyRef = useRef(notifyNewMessage);
  useEffect(() => {
    notifyRef.current = notifyNewMessage;
  }, [notifyNewMessage]);

  // ===== Scheduled messages («Отправить позже») =====
  const decryptForDisplay = useCallback(
    async (m: Message): Promise<Message> => {
      const user = currentUserRef.current;
      const room = roomsRef.current.find((r) => r.id === m.roomId);
      const peer = room && user ? secretPeer(room, user) : null;
      if (!m.encrypted || m.text || !secrets || !peer) return m;
      try {
        return { ...m, text: await secrets.decrypt(m.roomId, peer, m.encrypted) };
      } catch {
        return { ...m, text: DECRYPT_FAILED };
      }
    },
    [secrets],
  );

  const refreshScheduled = useCallback(async () => {
    const res = await emitWithAck<{ messages?: Message[] }>('get_scheduled_messages', {}, 5000);
    if (!res?.messages) return;
    const list = await Promise.all(res.messages.map((m) => decryptForDisplay(sanitizeMessage(m, SERVER_URL))));
    setScheduledMessages(list);
  }, [emitWithAck, decryptForDisplay]);

  useEffect(() => {
    if (isConnected && currentUser) void refreshScheduled();
  }, [isConnected, currentUser, refreshScheduled]);

  const cancelScheduledMessage = useCallback(
    async (messageId: string) => {
      const res = await emitWithAck<SendAck>('cancel_scheduled_message', { messageId });
      if (!res?.ok) return false;
      setScheduledMessages((prev) => prev.filter((m) => m.id !== messageId));
      return true;
    },
    [emitWithAck],
  );

  const sendScheduledNow = useCallback(
    async (messageId: string) => {
      const res = await emitWithAck<SendAck>('send_scheduled_now', { messageId });
      if (!res?.ok) return false;
      setScheduledMessages((prev) => prev.filter((m) => m.id !== messageId));
      return true;
    },
    [emitWithAck],
  );

  // ===== Ack handling & offline queue =====
  const applyAck = useCallback(
    (clientId: string, ack: SendAck) => {
      if (!ack.ok || !ack.id) {
        setMessages((prev) => prev.filter((m) => m.clientId !== clientId && m.id !== clientId));
        if (ack.error && ack.error !== 'rate_limited') setError(ack.error);
        else if (ack.error === 'rate_limited') setError('Слишком частая отправка сообщений. Подождите пару секунд.');
        return;
      }
      if (ack.scheduled) {
        void refreshScheduled();
        return;
      }
      const id = ack.id;
      setMessages((prev) => dedupeMessages(applySendAck(prev, clientId, id)));
    },
    [setError, refreshScheduled],
  );
  const applyAckRef = useRef(applyAck);
  useEffect(() => {
    applyAckRef.current = applyAck;
  }, [applyAck]);

  const refreshQueuedCount = useCallback(async () => {
    if (queue) setQueuedCount((await queue.list()).length);
  }, [queue]);

  const enqueue = useCallback(
    async (payload: OutgoingMessage) => {
      if (!queue) return;
      await queue.enqueue(payload);
      setMessages((prev) => prev.map((m) => (m.clientId === payload.clientId ? { ...m, queued: true } : m)));
      await refreshQueuedCount();
    },
    [queue, refreshQueuedCount],
  );

  // Restore the outbox after a reload (bubbles show «ожидание 🕒»).
  useEffect(() => {
    if (!queue || !currentUser) return;
    let cancelled = false;
    void queue.list().then((items) => {
      if (cancelled) return;
      setQueuedCount(items.length);
      if (items.length === 0) return;
      setMessages((prev) =>
        dedupeMessages([
          ...prev,
          ...items.filter((i) => !prev.some((m) => m.clientId === i.clientId)).map((i) => toOptimisticMessage(i, currentUser)),
        ]),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [queue, currentUser]);

  // Flush the outbox on every (re)connect.
  useEffect(() => {
    if (!queue || !isConnected) return;
    let cancelled = false;
    void queue
      .flush(async (item) => {
        const ack = await emitWithAck<SendAck>('send_message', item.payload, SEND_TIMEOUT_MS);
        if (!ack) return false;
        applyAckRef.current(item.clientId, ack);
        return true;
      })
      .then(async (result) => {
        if (result.dropped.length > 0) {
          const dropped = new Set(result.dropped);
          setMessages((prev) => prev.filter((m) => !(m.clientId && dropped.has(m.clientId))));
          setError('Часть сообщений не удалось отправить после нескольких попыток.');
        }
        if (!cancelled) setQueuedCount((await queue.list()).length);
      });
    return () => {
      cancelled = true;
    };
  }, [queue, isConnected, emitWithAck, setError]);

  // ===== E2EE identity: publish this device's public key =====
  useEffect(() => {
    if (!secrets || !isConnected) return;
    let cancelled = false;
    secrets
      .getPublicKey()
      .then((publicKey) => {
        if (!cancelled) void emitWithAck('e2ee_publish_key', { publicKey });
      })
      .catch(() => setError('Не удалось подготовить ключи секретных чатов на этом устройстве.'));
    return () => {
      cancelled = true;
    };
  }, [secrets, isConnected, emitWithAck, setError]);

  // Decrypt incoming / restored ciphertext into in-memory plaintext.
  const decryptingRef = useRef(new Set<string>());
  useEffect(() => {
    if (!secrets || !currentUser) return;
    for (const m of messages) {
      if (!m.encrypted || m.text) continue;
      const envelope = m.encrypted;
      const tag = `${m.id}:${envelope.iv}`;
      if (decryptingRef.current.has(tag)) continue;
      const room = rooms.find((r) => r.id === m.roomId);
      const peer = room ? secretPeer(room, currentUser) : null;
      if (!peer) continue;
      decryptingRef.current.add(tag);
      secrets
        .decrypt(m.roomId, peer, envelope)
        .catch((err: unknown) => (err instanceof SecretChatError && err.code === 'no-peer-key' ? null : DECRYPT_FAILED))
        .then((text) => {
          if (text === null) {
            decryptingRef.current.delete(tag); // retried after `e2ee_key_updated`
            return;
          }
          setMessages((prev) =>
            prev.map((x) => (x.id === m.id && x.encrypted?.iv === envelope.iv && !x.text ? { ...x, text } : x)),
          );
        });
    }
  }, [messages, rooms, secrets, currentUser, keyEpoch]);

  // Self-destruct: expired secret messages disappear locally (server also emits `message_deleted`).
  const hasExpiring = messages.some((m) => m.expiresAt);
  useEffect(() => {
    if (!hasExpiring) return;
    const timer = window.setInterval(() => {
      setMessages((prev) => {
        const now = Date.now();
        const next = prev.filter((m) => !isMessageExpired(m, now));
        return next.length === prev.length ? prev : next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [hasExpiring]);

  // ===== Socket events =====
  useEffect(() => {
    if (!socket) return;
    const sanitize = (m: Message) => sanitizeMessage(m, SERVER_URL);

    const onHistory = (history: Message[]) => {
      const clean = (Array.isArray(history) ? history : []).filter(isMeaningfulMessage).map(sanitize);
      setMessages((prev) => dedupeMessages(mergeHistory(clean, prev)));
    };
    const onReceive = (raw: Message) => {
      if (!isMeaningfulMessage(raw)) return;
      const message = sanitize(raw);
      const known = messagesRef.current.some(
        (m) => m.id === message.id || Boolean(message.clientId && m.clientId === message.clientId),
      );
      setMessages((prev) => upsertIncoming(prev, message).next);
      setScheduledMessages((prev) => (prev.some((m) => m.id === message.id) ? prev.filter((m) => m.id !== message.id) : prev));
      if (!known && message.sender !== currentUserRef.current) notifyRef.current(message);
    };
    const onEdited = (data: { messageId: string; roomId: string; newText: string; encrypted?: Message['encrypted'] }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId && m.roomId === data.roomId
            ? data.encrypted
              ? m.encrypted?.iv === data.encrypted.iv
                ? { ...m, isEdited: true }
                : { ...m, text: '', encrypted: data.encrypted, isEdited: true }
              : { ...m, text: data.newText, isEdited: true }
            : m,
        ),
      );
    };
    const onDeleted = (data: { messageId: string; roomId: string }) => {
      setMessages((prev) => prev.filter((m) => !(m.id === data.messageId && m.roomId === data.roomId)));
    };
    const onReactions = (data: { messageId: string; roomId: string; reactions: Record<string, UserId[]> }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === data.messageId && m.roomId === data.roomId ? { ...m, reactions: data.reactions } : m)),
      );
    };
    const onPoll = (data: { messageId: string; roomId: string; poll: Poll }) => {
      setMessages((prev) => prev.map((m) => (m.id === data.messageId && m.roomId === data.roomId ? { ...m, poll: data.poll } : m)));
    };
    const onRead = (data: { roomId: string; updatedMessages: { messageId: string; readBy: UserId[] }[] }) => {
      const updates = new Map(data.updatedMessages.map((u) => [u.messageId, u.readBy]));
      setMessages((prev) => prev.map((m) => (updates.has(m.id) ? { ...m, readBy: updates.get(m.id) } : m)));
    };
    const onKeyUpdated = (data: { userId: UserId; publicKey: string }) => {
      if (!secrets || data.userId === currentUserRef.current) return;
      secrets.updatePeerKey(data.userId, data.publicKey);
      setKeyEpoch((e) => e + 1);
    };
    const onRateLimit = (data: { error?: string }) => setError(data?.error || 'Слишком много запросов.');

    socket.on('history', onHistory);
    socket.on('receive_message', onReceive);
    socket.on('message_edited', onEdited);
    socket.on('message_deleted', onDeleted);
    socket.on('reactions_updated', onReactions);
    socket.on('poll_updated', onPoll);
    socket.on('messages_read', onRead);
    socket.on('e2ee_key_updated', onKeyUpdated);
    socket.on('rate_limit', onRateLimit);
    return () => {
      socket.off('history', onHistory);
      socket.off('receive_message', onReceive);
      socket.off('message_edited', onEdited);
      socket.off('message_deleted', onDeleted);
      socket.off('reactions_updated', onReactions);
      socket.off('poll_updated', onPoll);
      socket.off('messages_read', onRead);
      socket.off('e2ee_key_updated', onKeyUpdated);
      socket.off('rate_limit', onRateLimit);
    };
  }, [socket, secrets, setError]);

  // ===== Sending =====
  const roomById = useCallback((roomId: string) => rooms.find((r) => r.id === roomId) ?? null, [rooms]);

  const sendMessage = useCallback(
    async (
      text: string,
      replyToId?: string,
      filePayload?: OutgoingFile,
      targetRoomId?: string,
      forwardedFrom?: ForwardSource,
      poll?: Poll,
      options: SendOptions = {},
    ) => {
      const roomId = targetRoomId || activeRoomId;
      const user = currentUser;
      if (!user || !roomId) return;
      const trimmed = (text || '').trim();
      if (!trimmed && !filePayload && !forwardedFrom && !poll) return;

      const room = roomById(roomId);
      const secret = isSecretRoom(room ?? { id: roomId });
      const scheduledAt = options.scheduledAt;
      if (scheduledAt && !isConnected) {
        setError('Отложенную отправку можно запланировать только при подключении к сети.');
        return;
      }

      // --- E2EE: only ciphertext leaves the device -------------------------
      let encrypted: Message['encrypted'];
      let ttl: SecretChatTtl | undefined;
      if (secret) {
        if (filePayload || poll || forwardedFrom) {
          setError('Секретный чат поддерживает только текстовые сообщения.');
          return;
        }
        const peer = room ? secretPeer(room, user) : null;
        if (!peer || !secrets) {
          setError('Секретный чат недоступен.');
          return;
        }
        try {
          encrypted = await secrets.encrypt(roomId, peer, trimmed);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Не удалось зашифровать сообщение.');
          return;
        }
        ttl = ttlByRoom[roomId];
      }

      const clientId = createClientId();
      const payload: OutgoingMessage = {
        clientId,
        roomId,
        text: secret ? '' : trimmed,
        replyToId: replyToId || undefined,
        forwardedFrom: forwardedFrom || undefined,
        poll: poll ? { ...poll } : undefined,
        silent: options.silent || undefined,
        scheduledAt,
        albumId: options.albumId,
        encrypted,
        ttl,
      };

      const upload = filePayload ? needsUpload(filePayload) : false;
      const showBubble = !scheduledAt;
      if (showBubble) {
        const optimistic: Message = {
          ...payload,
          id: clientId,
          sender: user,
          text: trimmed,
          timestamp: Date.now(),
          pending: true,
          file: filePayload ? { ...filePayload, isUploading: upload, uploadProgress: upload ? 0 : undefined } : undefined,
        };
        setMessages((prev) => [...prev, optimistic]);
      }
      const patchBubble = (patch: (m: Message) => Message) =>
        setMessages((prev) => prev.map((m) => (m.clientId === clientId ? patch(m) : m)));

      // --- Media upload (magic-byte validated + EXIF stripped server-side) --
      if (filePayload) {
        let data = filePayload.data;
        if (upload) {
          try {
            if (!isConnected) throw new Error('offline');
            data = await uploadFile(filePayload, (percent) =>
              patchBubble((m) => (m.file ? { ...m, file: { ...m.file, uploadProgress: percent } } : m)),
            );
          } catch (err) {
            // A data: URL can still go through the socket (validated there too).
            if (!data.startsWith('data:')) {
              setMessages((prev) => prev.filter((m) => m.clientId !== clientId));
              setError(
                isConnected
                  ? `Не удалось загрузить файл${err instanceof Error && err.message !== 'offline' ? `: ${err.message}` : '.'}`
                  : 'Файлы отправляются только при подключении к сети.',
              );
              return;
            }
          }
        }
        payload.file = {
          name: filePayload.name,
          type: filePayload.type,
          data,
          size: filePayload.size,
          width: filePayload.width,
          height: filePayload.height,
          orientation: filePayload.orientation,
          stickerData: filePayload.stickerData,
          waveform: filePayload.waveform,
          duration: filePayload.duration,
        };
        patchBubble((m) => (m.file ? { ...m, file: { ...m.file, data, isUploading: false, uploadProgress: undefined } } : m));
      }

      // --- Delivery ----------------------------------------------------------
      if (!isConnected) {
        await enqueue(payload);
        return;
      }
      const ack = await emitWithAck<SendAck>('send_message', payload, SEND_TIMEOUT_MS);
      if (ack) {
        applyAck(clientId, ack);
      } else if (scheduledAt) {
        setError('Не удалось запланировать сообщение. Проверьте подключение.');
      } else {
        await enqueue(payload);
      }
    },
    [activeRoomId, currentUser, roomById, isConnected, secrets, ttlByRoom, emitWithAck, applyAck, enqueue, setError],
  );

  const forwardMessage = useCallback(
    (targetRoomId: string, original: Message) => {
      if (!currentUser || !targetRoomId) return;
      if (original.encrypted || isSecretRoom(roomById(targetRoomId) ?? { id: targetRoomId })) {
        setError('Сообщения секретных чатов нельзя пересылать.');
        return;
      }
      const sender = original.forwardedFrom?.sender || original.sender;
      const senderName = original.forwardedFrom?.senderName || getUserDisplayName(sender) || sender;
      const text = `${encodeForwardMarker(sender, senderName)}${stripForwardMarker(original.text || '')}`;
      const file: OutgoingFile | undefined = original.file
        ? {
            name: original.file.name,
            type: original.file.type,
            data: original.file.data,
            size: original.file.size,
            width: original.file.width,
            height: original.file.height,
            orientation: original.file.orientation,
            stickerData: original.file.stickerData,
            waveform: original.file.waveform,
            duration: original.file.duration,
          }
        : undefined;
      void sendMessage(
        text,
        undefined,
        file,
        targetRoomId,
        { sender, senderName, originalMessageId: original.forwardedFrom?.originalMessageId || original.id },
        original.poll ? { ...original.poll, votes: {}, closed: false } : undefined,
      );
    },
    [currentUser, roomById, getUserDisplayName, sendMessage, setError],
  );

  const roomOf = useCallback(
    (messageId: string) => messagesRef.current.find((m) => m.id === messageId)?.roomId ?? activeRoomIdRef.current,
    [],
  );

  const editMessage = useCallback(
    async (messageId: string, newText: string) => {
      const text = newText.trim();
      const roomId = roomOf(messageId);
      if (!socket || !isConnected || !roomId || !text || !currentUser) return;
      const room = roomById(roomId);
      if (isSecretRoom(room ?? { id: roomId })) {
        const peer = room ? secretPeer(room, currentUser) : null;
        if (!peer || !secrets) return;
        try {
          const encrypted = await secrets.encrypt(roomId, peer, text);
          setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, text, encrypted, isEdited: true } : m)));
          socket.emit('edit_message', { messageId, roomId, newText: '', encrypted });
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Не удалось зашифровать сообщение.');
        }
        return;
      }
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, text, isEdited: true } : m)));
      socket.emit('edit_message', { messageId, roomId, newText: text });
    },
    [socket, isConnected, currentUser, roomOf, roomById, secrets, setError],
  );

  // Messages the current user removed "for me only" (persisted per account).
  const [hiddenMessageIds, setHiddenMessageIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!currentUser) return;
    try {
      const raw = localStorage.getItem(`chat_hidden_messages_${currentUser}`);
      setHiddenMessageIds(new Set(raw ? (JSON.parse(raw) as string[]) : []));
    } catch {
      setHiddenMessageIds(new Set());
    }
  }, [currentUser]);

  const hideMessagesForMe = useCallback(
    (messageIds: string[]) => {
      if (messageIds.length === 0 || !currentUser) return;
      setHiddenMessageIds((prev) => {
        const next = new Set(prev);
        messageIds.forEach((id) => next.add(id));
        try {
          // Keep the newest 2000 ids so localStorage never grows unbounded.
          localStorage.setItem(`chat_hidden_messages_${currentUser}`, JSON.stringify(Array.from(next).slice(-2000)));
        } catch {
          // ignore quota errors
        }
        return next;
      });
    },
    [currentUser],
  );

  const deleteMessage = useCallback(
    (messageId: string) => {
      const target = messagesRef.current.find((m) => m.id === messageId);
      const roomId = target?.roomId ?? activeRoomIdRef.current;
      if (!roomId) return;
      // The server only accepts deletes from the author; anything else is hidden locally.
      if (target && currentUserRef.current && target.sender !== currentUserRef.current) {
        hideMessagesForMe([messageId]);
        return;
      }
      setMessages((prev) => prev.filter((m) => !(m.id === messageId && m.roomId === roomId)));
      if (target?.queued && target.clientId && queue) {
        void queue.remove(target.clientId).then(refreshQueuedCount);
        return;
      }
      if (socket && isConnected) socket.emit('delete_message', { messageId, roomId });
    },
    [socket, isConnected, queue, refreshQueuedCount, hideMessagesForMe],
  );

  const toggleReaction = useCallback(
    (messageId: string, reaction: string) => {
      const roomId = roomOf(messageId);
      if (socket && isConnected && roomId) socket.emit('toggle_reaction', { messageId, roomId, reaction });
    },
    [socket, isConnected, roomOf],
  );

  const votePoll = useCallback(
    (messageId: string, roomId: string, optionIds: string[]) => {
      if (!currentUser) return;
      setMessages((prev) => prev.map((m) => (m.id === messageId ? applyPollVote(m, currentUser, optionIds) : m)));
      if (socket && isConnected) socket.emit('vote_poll', { messageId, roomId, optionIds });
    },
    [socket, isConnected, currentUser],
  );

  const closePoll = useCallback(
    (messageId: string, roomId: string) => {
      setMessages((prev) => prev.map((m) => (m.id === messageId && m.poll ? { ...m, poll: { ...m.poll, closed: true } } : m)));
      if (socket && isConnected) socket.emit('close_poll', { messageId, roomId });
    },
    [socket, isConnected],
  );

  // ===== Secret chat settings =====
  const secretTtl = useCallback((roomId: string) => ttlByRoom[roomId], [ttlByRoom]);

  const setSecretTtl = useCallback((roomId: string, ttl: SecretChatTtl | undefined) => {
    setTtlByRoom((prev) => {
      const next = { ...prev };
      if (ttl && isValidTtl(ttl)) next[roomId] = ttl;
      else delete next[roomId];
      try {
        localStorage.setItem(TTL_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const secretFingerprint = useCallback(
    async (roomId: string) => {
      const room = roomById(roomId);
      const peer = room && currentUser ? secretPeer(room, currentUser) : null;
      if (!peer || !secrets) return null;
      try {
        return await secrets.fingerprint(roomId, peer);
      } catch {
        return null;
      }
    },
    [roomById, currentUser, secrets],
  );

  // ===== Read state of the open chat + tab title =====
  const activeUnread = currentUser && activeRoomId ? countUnread(messages, activeRoomId, currentUser) : 0;
  useEffect(() => {
    if (activeRoomId && activeUnread > 0 && document.visibilityState === 'visible') markRoomAsRead(activeRoomId);
  }, [activeRoomId, activeUnread, markRoomAsRead]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && activeRoomIdRef.current) markRoomAsRead(activeRoomIdRef.current);
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [markRoomAsRead]);

  const totalUnread = useMemo(() => {
    if (!currentUser) return 0;
    const roomIds = new Set(rooms.map((r) => r.id));
    return messages.filter(
      (m) => roomIds.has(m.roomId) && m.sender !== currentUser && !m.pending && !m.readBy?.includes(currentUser),
    ).length;
  }, [messages, currentUser, rooms]);

  useEffect(() => {
    document.title = totalUnread > 0 ? `(${totalUnread}) Telegram Web` : 'Telegram Web';
  }, [totalUnread]);

  const visibleMessages = useMemo(
    () => (hiddenMessageIds.size === 0 ? messages : messages.filter((m) => !hiddenMessageIds.has(m.id))),
    [messages, hiddenMessageIds],
  );
  const activeMessages = useMemo(
    () => visibleMessages.filter((m) => m.roomId === activeRoomId),
    [visibleMessages, activeRoomId],
  );

  const value = useMemo<MessagesContextValue>(
    () => ({
      messages: visibleMessages,
      activeMessages,
      sendMessage: (...args) => void sendMessage(...args),
      forwardMessage,
      editMessage: (id, text) => void editMessage(id, text),
      deleteMessage,
      hideMessagesForMe,
      toggleReaction,
      votePoll,
      closePoll,
      markRoomAsRead,
      unreadCount,
      lastMessageOf,
      notificationsEnabled,
      setNotificationsEnabled,
      playingAudioId,
      setPlayingAudioId,
      scheduledMessages,
      cancelScheduledMessage,
      sendScheduledNow,
      queuedCount,
      secretTtl,
      setSecretTtl,
      secretFingerprint,
    }),
    [
      visibleMessages,
      activeMessages,
      sendMessage,
      forwardMessage,
      editMessage,
      deleteMessage,
      hideMessagesForMe,
      toggleReaction,
      votePoll,
      closePoll,
      markRoomAsRead,
      unreadCount,
      lastMessageOf,
      notificationsEnabled,
      setNotificationsEnabled,
      playingAudioId,
      scheduledMessages,
      cancelScheduledMessage,
      sendScheduledNow,
      queuedCount,
      secretTtl,
      setSecretTtl,
      secretFingerprint,
    ],
  );

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
};
