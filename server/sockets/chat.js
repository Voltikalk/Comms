/**
 * Chat events: send (silent / scheduled / E2EE + self-destruct / offline-queue
 * dedupe), edit, delete, reactions, polls, read receipts and the E2EE public
 * key relay. Plus the background sweeper that delivers scheduled messages and
 * expires self-destructing ones.
 */
import crypto from 'crypto';
import { checkSocketRateLimit } from '../middleware/rateLimit.js';
import { CLIENT_ID_RE, MAX_MESSAGE_LENGTH } from '../middleware/validate.js';
import { isEncryptedEnvelope, isValidPublicKey, isValidTtl, pickEnvelope } from '../services/crypto.js';
import { ensureManaged, hasRight, isManaged, roleOf, sendRestriction } from '../services/roles.js';
import { isUuid, resolveRoomUuid, resolveUserUuid, supabase } from '../services/supabase.js';
import {
  MAX_SCHEDULE_AHEAD_MS,
  MAX_SCHEDULED_PER_USER,
  SAVED_MESSAGES_ID,
  broadcastTarget,
  canSeeMessage,
  e2eePublicKeys,
  isRoomAllowedForUser,
  isSecretRoom,
  memoryRooms,
  messageHistory,
  pushMessage,
  scheduledFor,
  scheduledMessages,
  takeDueScheduled,
  takeExpiredMessages,
  userSockets,
} from '../services/store.js';
import { decodeBase64Payload, storeUpload } from '../routes/upload.js';
import { displayNameOf, getUser } from '../services/users.js';

/** Scheduled messages must be at least this far in the future. */
export const MIN_SCHEDULE_DELAY_MS = 5000;

const managedRoom = (roomId) => {
  const room = memoryRooms.get(roomId);
  return isManaged(room) ? ensureManaged(room) : null;
};

/** `${roomId}:${user}` -> last send time, for group slow mode. */
const slowModeLastSent = new Map();

/** Channel post viewers (kept server-side; clients only get the count). */
const channelViewers = new Map();

const findMessage = (messageId, roomId, user) =>
  messageHistory.find((m) => m.id === messageId && m.roomId === roomId && canSeeMessage(m, user));

async function swallow(label, fn) {
  try {
    const res = await fn();
    if (res?.error) console.warn(`[Supabase ${label}]`, res.error.message);
  } catch (err) {
    console.warn(`[Supabase ${label}]`, err?.message || err);
  }
}

/** Persists a plaintext message (+ attachment) to Supabase. E2EE messages are never persisted. */
export async function persistMessage(message) {
  if (message.encrypted || message.service) return;
  try {
    const senderUuid = await resolveUserUuid(message.sender);
    const roomUuid = await resolveRoomUuid(message.roomId);
    if (!senderUuid || !roomUuid) return;
    const insertPayload = { room_id: roomUuid, sender_id: senderUuid, content: message.text || '' };
    if (isUuid(message.id)) insertPayload.id = message.id;
    if (message.replyToId && isUuid(message.replyToId)) insertPayload.reply_to_id = message.replyToId;

    const { data: insertedMsg, error } = await supabase.from('messages').insert(insertPayload).select().single();
    if (error) console.warn('[Supabase Sync Warning]', error.message);
    if (insertedMsg && message.file) {
      await supabase.from('message_attachments').insert({
        message_id: insertedMsg.id,
        file_url: message.file.data,
        file_name: message.file.name || 'file',
        file_type: message.file.type || 'file',
        file_size: message.file.size || 0,
      });
    }
  } catch (err) {
    console.error('[Supabase Message Persist Error]', err);
  }
}

/** Delivers a message to its room and the cache. */
export function deliverMessage(io, message) {
  pushMessage(message);
  io.to(broadcastTarget(message.roomId, message.sender)).emit('receive_message', message);
  void persistMessage(message);
}

/** One sweeper tick: due scheduled messages are delivered, expired secret messages are destroyed. */
export function runChatSweep(io, now = Date.now()) {
  for (const m of takeDueScheduled(now)) {
    const { scheduledAt: _scheduledAt, ...rest } = m;
    deliverMessage(io, { ...rest, timestamp: now });
  }
  for (const m of takeExpiredMessages(now)) {
    io.to(broadcastTarget(m.roomId, m.sender)).emit('message_deleted', { messageId: m.id, roomId: m.roomId, reason: 'expired' });
  }
}

export function startChatSweeper(io, intervalMs = 1000) {
  const timer = setInterval(() => runChatSweep(io), intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}

const sameSenderDuplicate = (user, id, clientId) =>
  messageHistory.find((m) => m.sender === user && ((id && m.id === id) || (clientId && m.clientId === clientId))) ||
  [...scheduledMessages.values()].find((m) => m.sender === user && ((id && m.id === id) || (clientId && m.clientId === clientId)));

export function registerChatHandlers({ io, socket, user, on }) {
  const reject = (ack, error) => {
    ack?.({ ok: false, error });
    return undefined;
  };

  on('send_message', async (data, ack) => {
    if (data.sender !== undefined && data.sender !== user) return reject(ack, 'Неверный отправитель.');
    const roomId = data.roomId;
    if (!isRoomAllowedForUser(roomId, user)) return reject(ack, 'Нет доступа к чату.');

    if (!checkSocketRateLimit(socket.id, 'send_message', 25, 10000)) {
      socket.emit('rate_limit', { error: 'Слишком частая отправка сообщений. Подождите пару секунд.' });
      return reject(ack, 'rate_limited');
    }
    if (typeof data.text === 'string' && data.text.length > MAX_MESSAGE_LENGTH) {
      socket.emit('error', { message: 'Текст сообщения не должен превышать 10 000 символов.' });
      return reject(ack, 'Текст слишком длинный.');
    }

    const clientId = typeof data.clientId === 'string' && CLIENT_ID_RE.test(data.clientId) ? data.clientId : undefined;
    const requestedId = isUuid(data.id) ? data.id : undefined;

    // Offline-queue retries: the same message must never be delivered twice.
    const duplicate = sameSenderDuplicate(user, requestedId, clientId);
    if (duplicate) {
      ack?.({ ok: true, id: duplicate.id, clientId, duplicate: true, scheduled: Boolean(duplicate.scheduledAt) });
      return;
    }

    // --- E2EE secret chat payload --------------------------------------------
    const secretRoom = isSecretRoom(roomId);
    const encrypted = data.encrypted !== undefined ? data.encrypted : undefined;
    if (encrypted !== undefined && !isEncryptedEnvelope(encrypted)) return reject(ack, 'Некорректный шифротекст.');
    if (secretRoom && !encrypted) return reject(ack, 'В секретном чате разрешены только зашифрованные сообщения.');
    if (secretRoom && (data.file || data.poll || data.forwardedFrom)) {
      return reject(ack, 'Секретный чат поддерживает только текст.');
    }
    let ttl;
    if (data.ttl !== undefined && data.ttl !== null) {
      if (!encrypted || !isValidTtl(data.ttl)) return reject(ack, 'Некорректный таймер самоуничтожения.');
      ttl = data.ttl;
    }

    // DM rooms: make sure the peer's sockets are subscribed.
    if (roomId !== SAVED_MESSAGES_ID) socket.join(roomId);
    if (roomId.startsWith('dm-')) {
      const otherUser = roomId.slice(3).split('-').find((p) => p !== user);
      for (const sockId of userSockets.get(otherUser) || []) io.sockets.sockets.get(sockId)?.join(roomId);
    }

    const text = encrypted ? '' : typeof data.text === 'string' ? data.text : '';
    const hasContent = Boolean(encrypted || text.trim() || data.file || data.forwardedFrom || data.poll || data.sticker);
    if (!hasContent) return reject(ack, 'Пустое сообщение.');

    // --- Groups & channels: who may post what, slow mode ---------------------
    const managed = managedRoom(roomId);
    if (managed) {
      const kind = data.poll ? 'poll' : data.file && data.file.type !== 'sticker' ? 'media' : 'text';
      const restriction = sendRestriction(managed, user, kind);
      if (restriction) return reject(ack, restriction);
      if (managed.type === 'group' && managed.slowMode > 0 && roleOf(managed, user) === 'member') {
        const key = `${roomId}:${user}`;
        const wait = (slowModeLastSent.get(key) || 0) + managed.slowMode * 1000 - Date.now();
        if (wait > 0) return reject(ack, `Медленный режим: следующее сообщение через ${Math.ceil(wait / 1000)} с.`);
        slowModeLastSent.set(key, Date.now());
      }
    }

    let finalFile = data.file && typeof data.file === 'object' ? data.file : undefined;
    if (
      finalFile &&
      typeof finalFile.data === 'string' &&
      finalFile.data.startsWith('data:') &&
      finalFile.type !== 'sticker' &&
      !finalFile.data.startsWith('data:image/svg+xml')
    ) {
      const mimeMatch = /^data:([^;,]+)/.exec(finalFile.data);
      const stored = await storeUpload(decodeBase64Payload(finalFile.data), {
        filename: finalFile.name || (finalFile.type === 'audio' ? 'voice.webm' : 'file.bin'),
        declaredMime: mimeMatch?.[1],
      });
      if (!stored.ok) return reject(ack, stored.error);
      finalFile = { ...finalFile, data: stored.url };
    }

    const now = Date.now();
    let scheduledAt;
    if (data.scheduledAt !== undefined && data.scheduledAt !== null) {
      const at = Number(data.scheduledAt);
      if (!Number.isFinite(at) || at < now + MIN_SCHEDULE_DELAY_MS || at > now + MAX_SCHEDULE_AHEAD_MS) {
        return reject(ack, 'Некорректное время отправки.');
      }
      if (scheduledFor(user).length >= MAX_SCHEDULED_PER_USER) return reject(ack, 'Слишком много отложенных сообщений.');
      scheduledAt = at;
    }

    const message = {
      id: requestedId || crypto.randomUUID(),
      clientId,
      roomId,
      sender: user,
      text,
      timestamp: now,
      replyToId: typeof data.replyToId === 'string' ? data.replyToId.slice(0, 64) : undefined,
      forwardedFrom: data.forwardedFrom || undefined,
      file: finalFile || undefined,
      poll: data.poll || undefined,
      silent: data.silent === true || undefined,
      albumId: typeof data.albumId === 'string' && CLIENT_ID_RE.test(data.albumId) ? data.albumId : undefined,
      encrypted: encrypted ? pickEnvelope(encrypted) : undefined,
      ttl,
      expiresAt: ttl ? now + ttl * 1000 : undefined,
      signature: managed?.type === 'channel' && managed.signMessages ? displayNameOf(getUser(user), user) : undefined,
      views: managed?.type === 'channel' ? 0 : undefined,
      readBy: [],
    };

    if (scheduledAt) {
      scheduledMessages.set(message.id, { ...message, scheduledAt, expiresAt: undefined });
      ack?.({ ok: true, id: message.id, clientId, scheduled: true, scheduledAt });
      return;
    }

    deliverMessage(io, message);
    ack?.({ ok: true, id: message.id, clientId });
  });

  on('get_scheduled_messages', ({ roomId }, ack) => {
    const list = scheduledFor(user).filter((m) => !roomId || m.roomId === roomId);
    ack?.({ messages: list.sort((a, b) => a.scheduledAt - b.scheduledAt) });
  });

  on('cancel_scheduled_message', ({ messageId }, ack) => {
    const m = scheduledMessages.get(messageId);
    if (!m || m.sender !== user) return reject(ack, 'Сообщение не найдено.');
    scheduledMessages.delete(messageId);
    ack?.({ ok: true });
  });

  on('send_scheduled_now', ({ messageId }, ack) => {
    const m = scheduledMessages.get(messageId);
    if (!m || m.sender !== user) return reject(ack, 'Сообщение не найдено.');
    scheduledMessages.delete(messageId);
    const { scheduledAt: _scheduledAt, ...rest } = m;
    deliverMessage(io, { ...rest, timestamp: Date.now() });
    ack?.({ ok: true });
  });

  on('edit_message', async ({ messageId, roomId, newText, encrypted }) => {
    if (!checkSocketRateLimit(socket.id, 'edit_message', 15, 10000)) return;
    if (!isRoomAllowedForUser(roomId, user)) return;
    const msg = findMessage(messageId, roomId, user);
    if (!msg || msg.service) return;
    const managed = managedRoom(roomId);
    // Channel admins with "Редактирование публикаций" may edit any post.
    const mayEdit = msg.sender === user || (managed?.type === 'channel' && hasRight(managed, user, 'editMessages'));
    if (!mayEdit) return;

    if (msg.encrypted) {
      if (!isEncryptedEnvelope(encrypted)) return;
      msg.encrypted = pickEnvelope(encrypted);
      msg.isEdited = true;
      io.to(broadcastTarget(roomId, msg.sender)).emit('message_edited', { messageId, roomId, newText: '', encrypted: msg.encrypted });
      return;
    }

    if (typeof newText !== 'string' || newText.length > MAX_MESSAGE_LENGTH) return;
    msg.text = newText;
    msg.isEdited = true;
    io.to(broadcastTarget(roomId, msg.sender)).emit('message_edited', { messageId, roomId, newText });
    if (isUuid(messageId)) {
      await swallow('Edit Warning', () =>
        supabase.from('messages').update({ content: newText, edited_at: new Date().toISOString() }).eq('id', messageId),
      );
    }
  });

  on('delete_message', async ({ messageId, roomId }) => {
    if (!checkSocketRateLimit(socket.id, 'delete_message', 20, 10000)) return;
    if (!isRoomAllowedForUser(roomId, user)) return;
    const msgIndex = messageHistory.findIndex((m) => m.id === messageId && m.roomId === roomId && canSeeMessage(m, user));
    if (msgIndex === -1) return;
    const msg = messageHistory[msgIndex];
    const managed = managedRoom(roomId);
    if (msg.sender !== user && !(managed && hasRight(managed, user, 'deleteMessages'))) return;

    messageHistory.splice(msgIndex, 1);
    channelViewers.delete(messageId);
    io.to(broadcastTarget(roomId, msg.sender)).emit('message_deleted', { messageId, roomId });
    if (isUuid(messageId)) {
      await swallow('Delete Warning', () =>
        supabase.from('messages').update({ deleted_at: new Date().toISOString() }).eq('id', messageId),
      );
    }
  });

  on('toggle_reaction', async ({ messageId, roomId, reaction }) => {
    if (!checkSocketRateLimit(socket.id, 'toggle_reaction', 30, 10000)) return;
    if (!reaction || typeof reaction !== 'string' || reaction.length > 32) return;
    if (!isRoomAllowedForUser(roomId, user)) return;
    const msg = findMessage(messageId, roomId, user);
    if (!msg) return;

    if (!msg.reactions) msg.reactions = {};
    const reactors = msg.reactions[reaction] || [];
    const reactorIndex = reactors.indexOf(user);
    if (reactorIndex === -1) reactors.push(user);
    else reactors.splice(reactorIndex, 1);
    if (reactors.length === 0) delete msg.reactions[reaction];
    else msg.reactions[reaction] = reactors;

    io.to(broadcastTarget(roomId, msg.sender)).emit('reactions_updated', { messageId, roomId, reactions: msg.reactions });

    if (msg.encrypted || !isUuid(messageId)) return;
    const userUuid = await resolveUserUuid(user);
    if (!userUuid) return;
    await swallow('Reaction Sync', () =>
      reactorIndex === -1
        ? supabase.from('message_reactions').insert({ message_id: messageId, user_id: userUuid, emoji: reaction })
        : supabase.from('message_reactions').delete().eq('message_id', messageId).eq('user_id', userUuid).eq('emoji', reaction),
    );
  });

  on('vote_poll', ({ messageId, roomId, optionIds }) => {
    if (!isRoomAllowedForUser(roomId, user)) return;
    const msg = findMessage(messageId, roomId, user);
    if (!msg || !msg.poll || msg.poll.closed) return;
    if (!msg.poll.votes) msg.poll.votes = {};

    // Quiz votes cannot be changed or retracted
    const isQuiz = Boolean(msg.poll.quiz);
    const hasAlreadyVoted = Object.values(msg.poll.votes).some((voters) => voters.includes(user));
    if (isQuiz && hasAlreadyVoted) return;

    let ids = Array.isArray(optionIds) ? optionIds : [optionIds].filter(Boolean);
    if ((isQuiz || !msg.poll.multiple) && ids.length > 1) ids = ids.slice(0, 1);

    for (const optId of Object.keys(msg.poll.votes)) {
      msg.poll.votes[optId] = (msg.poll.votes[optId] || []).filter((voter) => voter !== user);
      if (msg.poll.votes[optId].length === 0) delete msg.poll.votes[optId];
    }
    for (const optionId of ids) {
      if (!msg.poll.options?.some((o) => o.id === optionId)) continue;
      if (!msg.poll.votes[optionId]) msg.poll.votes[optionId] = [];
      if (!msg.poll.votes[optionId].includes(user)) msg.poll.votes[optionId].push(user);
    }
    io.to(broadcastTarget(roomId, msg.sender)).emit('poll_updated', { messageId, roomId, poll: msg.poll });
  });

  on('close_poll', ({ messageId, roomId }) => {
    if (!isRoomAllowedForUser(roomId, user)) return;
    const msg = findMessage(messageId, roomId, user);
    if (!msg || !msg.poll || msg.poll.closed || msg.sender !== user) return;
    msg.poll.closed = true;
    io.to(broadcastTarget(roomId, msg.sender)).emit('poll_updated', { messageId, roomId, poll: msg.poll });
  });

  on('mark_read', async ({ roomId, messageIds }) => {
    if (!isRoomAllowedForUser(roomId, user) || !Array.isArray(messageIds)) return;
    const ids = messageIds.slice(0, 500);
    const updatedMessages = [];

    // Channels: count views without revealing who the subscribers are.
    if (managedRoom(roomId)?.type === 'channel') {
      for (const messageId of ids) {
        const msg = findMessage(messageId, roomId, user);
        if (!msg || msg.sender === user || msg.service) continue;
        const viewers = channelViewers.get(messageId) || new Set();
        if (viewers.has(user)) continue;
        viewers.add(user);
        channelViewers.set(messageId, viewers);
        msg.views = viewers.size;
        updatedMessages.push({ messageId, readBy: [], views: msg.views });
      }
      if (updatedMessages.length > 0) io.to(roomId).emit('messages_read', { roomId, updatedMessages });
      return;
    }

    for (const messageId of ids) {
      const msg = findMessage(messageId, roomId, user);
      if (!msg || msg.sender === user) continue;
      if (!msg.readBy) msg.readBy = [];
      if (!msg.readBy.includes(user)) {
        msg.readBy.push(user);
        updatedMessages.push({ messageId, readBy: msg.readBy });
      }
    }
    if (updatedMessages.length === 0) return;
    io.to(broadcastTarget(roomId, user)).emit('messages_read', { roomId, updatedMessages });

    const validUuids = updatedMessages.map((u) => u.messageId).filter(isUuid);
    if (validUuids.length === 0) return;
    const userUuid = await resolveUserUuid(user);
    if (!userUuid) return;
    const readAt = new Date().toISOString();
    await swallow('Read Sync', () =>
      supabase
        .from('message_read_receipts')
        .upsert(validUuids.map((id) => ({ message_id: id, user_id: userUuid, read_at: readAt })), { onConflict: 'message_id, user_id' }),
    );
  });

  // --- E2EE public identity keys (the server never sees private keys) --------
  on('e2ee_publish_key', ({ publicKey }, ack) => {
    if (!checkSocketRateLimit(socket.id, 'e2ee_publish_key', 5, 60000)) return reject(ack, 'rate_limited');
    if (!isValidPublicKey(publicKey)) return reject(ack, 'Некорректный публичный ключ.');
    const previous = e2eePublicKeys.get(user);
    e2eePublicKeys.set(user, { publicKey, updatedAt: Date.now() });
    if (previous?.publicKey !== publicKey) io.emit('e2ee_key_updated', { userId: user, publicKey });
    ack?.({ ok: true });
  });

  on('e2ee_get_key', ({ userId }, ack) => {
    const key = typeof userId === 'string' ? e2eePublicKeys.get(userId.toLowerCase()) : undefined;
    ack?.({ publicKey: key?.publicKey || null, updatedAt: key?.updatedAt || null });
  });
}
