import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type { Message, UserId, Room, ConnectionStatus, CallSession, UserProfile, Poll, UserSearchResult } from '../types';
import { USER_NAMES, KEY_TO_USER, ALL_ROOMS, SERVER_URL, DEFAULT_USER_PROFILES } from '../constants';
import authService from '../services/auth.service';
import type { RegisterRequest } from '../types/auth.types';
import { supabase } from '../lib/supabase/client';
import { isUserMentionedInText } from '../lib/mentions';


interface SocketContextType {
  currentUser: UserId | null;
  currentUserName: string | null;
  currentUserProfile: UserProfile | null;
  userProfiles: Record<UserId, UserProfile>;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
  getUserDisplayName: (userId: UserId) => string;
  getUserAvatar: (userId: UserId) => string | undefined;
  rooms: Room[];
  activeRoomId: string;
  setActiveRoomId: (id: string) => void;
  activeRoom: Room | null;
  isConnected: boolean;
  onlineStatus: ConnectionStatus;
  messages: Message[];
  activeMessages: Message[];
  error: string | null;
  login: (emailOrKey: string, password?: string) => Promise<boolean>;
  register: (payload: RegisterRequest) => Promise<boolean>;
  logout: () => void;
  searchUsers: (query: string) => Promise<UserSearchResult[]>;
  createDirectChat: (targetUserId: string) => Promise<Room | null>;
  createGroupChat: (name: string, participantIds: string[], avatarUrl?: string) => Promise<Room | null>;
  sendMessage: (
    text: string, 
    replyToId?: string,
    filePayload?: { 
      name: string; 
      type: 'image' | 'audio' | 'video' | 'video_note' | 'file' | 'sticker'; 
      data: string; 
      size: number; 
      rawBlob?: Blob | File; 
      width?: number; 
      height?: number; 
      orientation?: 'vertical' | 'horizontal' | 'square'; 
      stickerData?: any;
      waveform?: number[];
      duration?: number;
    },
    targetRoomId?: string,
    forwardedFrom?: { sender: UserId; senderName: string; originalMessageId?: string },
    poll?: Poll
  ) => void;
  votePoll: (messageId: string, roomId: string, optionIds: string[]) => void;
  closePoll: (messageId: string, roomId: string) => void;
  forwardMessage: (targetRoomId: string, message: Message) => void;
  editMessage: (messageId: string, newText: string) => void;
  deleteMessage: (messageId: string) => void;
  toggleReaction: (messageId: string, reaction: string) => void;
  markRoomAsRead: (roomId: string) => void;
  unreadCount: (roomId: string) => number;
  lastMessageOf: (roomId: string) => Message | null;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  typingUsers: Record<string, Record<string, boolean>>;
  sendTypingStatus: (isTyping: boolean) => void;

  // Global Audio Player state
  playingAudioId: string | null;
  setPlayingAudioId: (id: string | null) => void;

  // WebRTC Calling
  callSession: CallSession | null;
  startCall: (type: 'audio' | 'video') => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  toggleMute: () => void;
  isCameraOff: boolean;
  toggleCamera: () => void;
  socket: Socket | null;
}

const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const sanitizeMessage = (msg: Message): Message => {
  let forwardedFrom = msg.forwardedFrom;
  if (!forwardedFrom && msg.text) {
    const zeroWidthMatch = msg.text.match(/^\u200B\u200B\[fwd:([^\]]+)\]\u200B\u200B/);
    if (zeroWidthMatch) {
      try {
        const parsed = JSON.parse(zeroWidthMatch[1]);
        forwardedFrom = {
          sender: parsed.s,
          senderName: parsed.n || parsed.s
        };
      } catch {
        // ignore
      }
    }
  }

  if (msg.file) {
    let fileType = msg.file.type;
    const fName = (msg.file.name || '').toLowerCase();
    const fData = (msg.file.data || '').toLowerCase();
    if (
      fileType === 'sticker' ||
      fName.startsWith('sticker_') ||
      fName.endsWith('.tgs') ||
      fData.endsWith('.tgs') ||
      fData.includes('/stickers/') ||
      fData.startsWith('data:image/svg+xml') ||
      fName.includes('уточка') ||
      fName.includes('вишенка') ||
      fName.includes('stonks') ||
      fName.includes('бокс') ||
      fName.includes('пепе') ||
      fName.includes('колобок')
    ) {
      fileType = 'sticker';
    }

    return {
      ...msg,
      forwardedFrom,
      file: {
        ...msg.file,
        type: fileType,
        isUploading: false,
        uploadProgress: undefined,
        data: msg.file.data && msg.file.data.startsWith('/uploads/') ? `${SERVER_URL}${msg.file.data}` : msg.file.data
      }
    };
  }
  return {
    ...msg,
    forwardedFrom
  };
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserId | null>(() => {
    const saved = localStorage.getItem('chat_user_v2');
    return saved ? (saved as UserId) : null;
  });
  const [authKey, setAuthKey] = useState<string | null>(() => {
    return localStorage.getItem('chat_auth_key_v2');
  });

  const [activeRoomId, setActiveRoomId] = useState<string>(() => {
    // Deep link first: #/chat/{roomId}
    const hashMatch = window.location.hash.match(/^#\/chat\/(.+)$/);
    if (hashMatch) {
      return decodeURIComponent(hashMatch[1]);
    }
    return localStorage.getItem('chat_active_room_v2') || '';
  });

  const [isConnected, setIsConnected] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState<ConnectionStatus>({
    vlad: false,
    anya: false,
    mom: false,
    dad: false,
    sister: false
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, Record<string, boolean>>>({});
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabledState] = useState<boolean>(() => {
    return localStorage.getItem('tg_notifications_enabled') !== 'false';
  });

  const setNotificationsEnabled = useCallback((enabled: boolean) => {
    setNotificationsEnabledState(enabled);
    try {
      localStorage.setItem('tg_notifications_enabled', String(enabled));
      if (enabled && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => { /* ignore */ });
      }
    } catch { /* ignore */ }
  }, []);

  // WebRTC Call States
  const [callSession, setCallSession] = useState<CallSession | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRoomIdRef = useRef<string>('');
  const targetSocketIdRef = useRef<string>('');
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  // Dynamic server-synced rooms
  const [serverRooms, setServerRooms] = useState<Room[]>(() => {
    try {
      const saved = localStorage.getItem(`chat_server_rooms_${currentUser}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Calculate dynamic rooms for current user
  const rooms = useMemo(() => {
    if (!currentUser) return ALL_ROOMS;
    const savedRoom: Room = {
      id: 'saved-messages',
      name: 'Избранное',
      type: 'direct',
      participants: [currentUser]
    };

    if (serverRooms.length > 0) {
      const filtered = serverRooms.filter((r) => r.id !== 'saved-messages');
      return [savedRoom, ...filtered];
    }

    const isPresetUser = ['vlad', 'anya', 'mom', 'dad', 'sister'].includes(currentUser);
    if (isPresetUser) {
      const baseRooms = ALL_ROOMS.filter(r => r.participants.includes(currentUser) || r.id === 'family');
      return [savedRoom, ...baseRooms];
    }

    return [savedRoom];
  }, [currentUser, serverRooms]);

  const activeRoom = rooms.find(r => r.id === activeRoomId) || rooms[0] || null;

  // Sync activeRoomId if it becomes invalid or empty
  useEffect(() => {
    if (activeRoom && activeRoom.id !== activeRoomId) {
      setActiveRoomId(activeRoom.id);
      localStorage.setItem('chat_active_room_v2', activeRoom.id);
    }
  }, [activeRoom, activeRoomId]);

  // Custom user profiles with local persistence
  const [userProfiles, setUserProfiles] = useState<Record<UserId, UserProfile>>(() => {
    try {
      const saved = localStorage.getItem('chat_user_profiles_v2');
      if (saved) {
        return { ...DEFAULT_USER_PROFILES, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_USER_PROFILES;
  });

  const updateUserProfile = useCallback((updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    setUserProfiles((prev) => {
      const existing = prev[currentUser] || DEFAULT_USER_PROFILES[currentUser];
      const updated = { ...existing, ...updates };
      const next = { ...prev, [currentUser]: updated };
      try {
        localStorage.setItem('chat_user_profiles_v2', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [currentUser]);

  const getUserDisplayName = useCallback((userId: UserId) => {
    const profile = userProfiles[userId] || DEFAULT_USER_PROFILES[userId];
    if (profile) {
      const full = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();
      if (full) return full;
    }
    return USER_NAMES[userId] || userId;
  }, [userProfiles]);

  const getUserAvatar = useCallback((userId: UserId) => {
    return userProfiles[userId]?.avatarUrl;
  }, [userProfiles]);

  const currentUserProfile = currentUser ? (userProfiles[currentUser] || DEFAULT_USER_PROFILES[currentUser]) : null;
  const currentUserName = currentUser ? getUserDisplayName(currentUser) : null;
  const activeMessages = messages.filter(m => m.roomId === activeRoomId);

  const cleanupCall = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    setCallSession(null);
    setIsMuted(false);
    setIsCameraOff(false);
    pcRoomIdRef.current = '';
    targetSocketIdRef.current = '';
  }, []);

  const logout = useCallback(() => {
    cleanupCall();

    if (socketRef.current && isConnected && currentUser && activeRoomId) {
      socketRef.current.emit('typing', { roomId: activeRoomId, isTyping: false });
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    authService.logout().catch(() => {});
    setCurrentUser(null);
    setAuthKey(null);
    setMessages([]);
    setIsConnected(false);
    setTypingUsers({});
    setPlayingAudioId(null);
    localStorage.removeItem('chat_user_v2');
    localStorage.removeItem('chat_auth_key_v2');
    localStorage.removeItem('chat_active_room_v2');
  }, [cleanupCall, isConnected, currentUser, activeRoomId]);

  const playNotificationSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
      osc.onended = () => ctx.close();
    } catch {
      // AudioContext may be blocked before user interaction; ignore
    }
  };

  const currentUserRef = useRef<UserId | null>(currentUser);
  const activeRoomIdRef = useRef<string>(activeRoomId);
  const isConnectedRef = useRef<boolean>(isConnected);
  const notificationsEnabledRef = useRef<boolean>(notificationsEnabled);
  const userProfilesRef = useRef<Record<UserId, UserProfile>>(userProfiles);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    activeRoomIdRef.current = activeRoomId;
  }, [activeRoomId]);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  useEffect(() => {
    notificationsEnabledRef.current = notificationsEnabled;
  }, [notificationsEnabled]);

  useEffect(() => {
    userProfilesRef.current = userProfiles;
  }, [userProfiles]);

  // ===== Read Receipts =====
  const markRoomAsRead = useCallback((roomId: string) => {
    const user = currentUserRef.current;
    if (!socketRef.current || !isConnectedRef.current || !user) return;
    
    setMessages((prev) => {
      const roomMessages = prev.filter(
        (m) => m.roomId === roomId && m.sender !== user && !m.pending
      );
      const unreadIds = roomMessages
        .filter((m) => !(m.readBy && m.readBy.includes(user)))
        .map((m) => m.id);

      if (unreadIds.length === 0) return prev;

      socketRef.current?.emit('mark_read', { roomId, messageIds: unreadIds });

      return prev.map((m) =>
        unreadIds.includes(m.id)
          ? { ...m, readBy: Array.from(new Set([...(m.readBy || []), user])) }
          : m
      );
    });
  }, []);

  const unreadCount = (roomId: string): number => {
    if (!currentUser) return 0;
    return messages.filter(
      (m) =>
        m.roomId === roomId &&
        m.sender !== currentUser &&
        !m.pending &&
        !(m.readBy && m.readBy.includes(currentUser))
    ).length;
  };

  const lastMessageOf = (roomId: string): Message | null => {
    const roomMessages = messages.filter((m) => m.roomId === roomId);
    if (roomMessages.length === 0) return null;
    return roomMessages[roomMessages.length - 1];
  };

  const roomsRef = useRef<Room[]>(rooms);
  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  // ===== Sound + Browser Notifications =====
  const navigateToRoomRef = useRef<(id: string) => void>(() => { });

  const notifyNewMessage = useCallback((message: Message) => {
    const room = roomsRef.current.find((r) => r.id === message.roomId);
    const senderName = USER_NAMES[message.sender] || message.sender;
    const roomName = room ? (room.type === 'group' ? room.name : senderName) : 'Чат';

    const isViewingRoom = activeRoomIdRef.current === message.roomId && document.visibilityState === 'visible';
    if (isViewingRoom) {
      markRoomAsRead(message.roomId);
      return;
    }

    if (!notificationsEnabledRef.current) return;

    // Mentions bypass per-chat mute and get an accent notification (Telegram behavior)
    const me = currentUserRef.current;
    const myProfile = me ? userProfilesRef.current[me] || DEFAULT_USER_PROFILES[me as UserId] : null;
    const isMentionOfMe = isUserMentionedInText(message.text, {
      id: me || undefined,
      username: myProfile?.username,
      firstName: myProfile?.firstName
    });

    // Respect per-chat mute (persisted by ChatScreen in localStorage)
    if (!isMentionOfMe) {
      try {
        const muted: Record<string, boolean> = JSON.parse(localStorage.getItem('tg_muted_rooms') || '{}');
        if (muted[message.roomId]) return;
      } catch { /* ignore */ }
    }

    playNotificationSound();

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const preview = message.text || (message.file ? '📎 Вложение' : 'Новое сообщение');
        const title = isMentionOfMe
          ? `${senderName} упомянул(а) вас · ${roomName}`
          : `${senderName} · ${roomName}`;
        const n = new Notification(title, {
          body: preview,
          tag: isMentionOfMe ? `mention-${message.id}` : message.roomId,
          icon: '/icon-192.png'
        });
        n.onclick = () => {
          window.focus();
          n.close();
          navigateToRoomRef.current(message.roomId);
        };
      } catch {
        // Ignore notification errors
      }
    }
  }, [markRoomAsRead]);

  const notifyNewMessageRef = useRef(notifyNewMessage);
  useEffect(() => {
    notifyNewMessageRef.current = notifyNewMessage;
  }, [notifyNewMessage]);

  const cleanupCallRef = useRef(cleanupCall);
  useEffect(() => {
    cleanupCallRef.current = cleanupCall;
  }, [cleanupCall]);

  const logoutRef = useRef(logout);
  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  useEffect(() => {
    if (!currentUser || !authKey) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocketInstance(null);
      }
      setIsConnected(false);
      return;
    }

    const socket = io(SERVER_URL, {
      auth: {
        token: authKey
      },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      autoConnect: true
    });

    socketRef.current = socket;
    setSocketInstance(socket);

    socket.on('connect', () => {
      setIsConnected(true);
      setError(null);
      console.log('Connected to server as', currentUser);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', () => {
      setIsConnected(false);
      setError('Не удалось подключиться к серверу. Убедитесь, что сервер чата запущен.');
    });

    socket.on('auth_error', (data: { message: string }) => {
      setError(data.message);
      logoutRef.current();
    });

    socket.on('rooms_list', (roomsList: Room[]) => {
      if (Array.isArray(roomsList)) {
        setServerRooms(roomsList);
        if (currentUserRef.current) {
          try {
            localStorage.setItem(`chat_server_rooms_${currentUserRef.current}`, JSON.stringify(roomsList));
          } catch {}
        }
      }
    });

    socket.on('room_created', (newRoom: Room) => {
      setServerRooms((prev) => {
        if (prev.some((r) => r.id === newRoom.id)) return prev;
        const next = [newRoom, ...prev];
        if (currentUserRef.current) {
          try {
            localStorage.setItem(`chat_server_rooms_${currentUserRef.current}`, JSON.stringify(next));
          } catch {}
        }
        return next;
      });
      setActiveRoomId(newRoom.id);
      localStorage.setItem('chat_active_room_v2', newRoom.id);
    });

    socket.on('status_update', (status: ConnectionStatus) => {
      setOnlineStatus(status);
      setTypingUsers((prev) => {
        const next = { ...prev };
        let modified = false;
        Object.keys(next).forEach((roomId) => {
          const roomTyping = { ...next[roomId] };
          let roomModified = false;
          Object.keys(roomTyping).forEach((username) => {
            if (!status[username as UserId]) {
              delete roomTyping[username];
              roomModified = true;
              modified = true;
            }
          });
          if (roomModified) {
            next[roomId] = roomTyping;
          }
        });
        return modified ? next : prev;
      });
    });

    socket.on('typing_update', (data: { roomId: string; username: string; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        const roomTyping = prev[data.roomId] ? { ...prev[data.roomId] } : {};
        if (data.isTyping) {
          roomTyping[data.username] = true;
        } else {
          delete roomTyping[data.username];
        }
        return {
          ...prev,
          [data.roomId]: roomTyping
        };
      });
    });

    const isMeaningfulMessage = (m: Message) => Boolean(
      (m.text && m.text.trim().length > 0) ||
      m.file ||
      m.forwardedFrom ||
      m.poll ||
      m.sticker
    );

    socket.on('history', (historyMessages: Message[]) => {
      setMessages(historyMessages.filter(isMeaningfulMessage).map(sanitizeMessage));
    });

    socket.on('receive_message', (message: Message) => {
      if (!isMeaningfulMessage(message)) return;
      const sanitized = sanitizeMessage(message);
      setMessages((prev) => {
        const existing = prev.find((m) => m.id === sanitized.id);
        if (existing) {
          return prev.map((m) => m.id === sanitized.id ? { ...sanitized, pending: false } : m);
        }
        if (sanitized.sender !== currentUserRef.current) {
          notifyNewMessageRef.current(sanitized);
        }
        return [...prev, sanitized];
      });
    });

    socket.on('message_edited', (data: { messageId: string; roomId: string; newText: string }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId && msg.roomId === data.roomId
            ? { ...msg, text: data.newText, isEdited: true }
            : msg
        )
      );
    });

    socket.on('message_deleted', (data: { messageId: string; roomId: string }) => {
      setMessages((prev) =>
        prev.filter((msg) => !(msg.id === data.messageId && msg.roomId === data.roomId))
      );
    });

    socket.on('reactions_updated', (data: { messageId: string; roomId: string; reactions: Record<string, UserId[]> }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId && msg.roomId === data.roomId
            ? { ...msg, reactions: data.reactions }
            : msg
        )
      );
    });

    socket.on('poll_updated', (data: { messageId: string; roomId: string; poll: Poll }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId && msg.roomId === data.roomId
            ? { ...msg, poll: data.poll }
            : msg
        )
      );
    });

    socket.on('messages_read', (data: { roomId: string; updatedMessages: { messageId: string; readBy: UserId[] }[] }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          const update = data.updatedMessages.find((u) => u.messageId === msg.id);
          return update ? { ...msg, readBy: update.readBy } : msg;
        })
      );
    });

    // WebRTC Calling Event Listeners
    socket.on('call_incoming', (data: { roomId: string; caller: UserId; callerSocketId?: string; type: 'audio' | 'video' }) => {
      if (data.callerSocketId) {
        targetSocketIdRef.current = data.callerSocketId;
      }
      setCallSession({
        roomId: data.roomId,
        caller: data.caller,
        receiver: currentUserRef.current!,
        type: data.type,
        status: 'incoming'
      });
    });

    socket.on('call_accepted', async (data?: { roomId?: string; targetSocketId?: string }) => {
      if (data?.targetSocketId) {
        targetSocketIdRef.current = data.targetSocketId;
      }
      const pc = peerConnectionRef.current;
      if (!pc || !socketRef.current) return;
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current.emit('webrtc_signal', {
          roomId: pcRoomIdRef.current,
          targetSocketId: targetSocketIdRef.current || undefined,
          signal: { sdp: offer }
        });
        setCallSession((prev) => prev ? { ...prev, status: 'active' } : null);
      } catch (err) {
        console.error('[WebRTC] Failed to create offer:', err);
      }
    });

    socket.on('call_rejected', () => {
      cleanupCallRef.current();
    });

    socket.on('call_ended', () => {
      cleanupCallRef.current();
    });

    socket.on('webrtc_signal', async ({ signal, senderSocketId }: { signal: any; senderSocketId?: string }) => {
      if (!socketRef.current) return;
      if (senderSocketId) {
        targetSocketIdRef.current = senderSocketId;
      }
      const pc = peerConnectionRef.current;
      try {
        if (signal.sdp) {
          if (!pc) return;
          const desc = new RTCSessionDescription(signal.sdp);
          await pc.setRemoteDescription(desc);
          
          while (pendingCandidatesRef.current.length > 0) {
            const candidate = pendingCandidatesRef.current.shift();
            if (candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((_e) => {
                // Ignore transient ICE candidate error
              });
            }
          }

          if (desc.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socketRef.current.emit('webrtc_signal', {
              roomId: pcRoomIdRef.current,
              targetSocketId: targetSocketIdRef.current || undefined,
              signal: { sdp: answer }
            });
            setCallSession((prev) => prev ? { ...prev, status: 'active' } : null);
          }
        } else if (signal.candidate) {
          if (pc && pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch((_e) => {
              // Ignore candidate error
            });
          } else {
            pendingCandidatesRef.current.push(signal.candidate);
          }
        }
      } catch (err) {
        console.error('[WebRTC] Error handling signal:', err);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocketInstance(null);
      setIsConnected(false);
    };
  }, [currentUser, authKey]);

  const login = async (emailOrKey: string, password?: string): Promise<boolean> => {
    setError(null);
    let normalizedInput = emailOrKey.trim();
    if (normalizedInput.startsWith('@')) {
      normalizedInput = normalizedInput.slice(1).trim();
    }

    // 1. If password is provided, perform real API login via JWT & MongoDB + Supabase Auth
    if (password !== undefined && password !== '') {
      try {
        const authData = await authService.login({
          email: normalizedInput,
          password
        });

        // Background Supabase Auth login
        supabase.auth.signInWithPassword({
          email: normalizedInput.includes('@') ? normalizedInput : `${normalizedInput}@telegram.org`,
          password
        }).catch((e) => console.warn('Supabase auth background login notice:', e));

        const loggedUser = authData.user;
        const uid = loggedUser.userId as UserId;
        const token = authData.tokens.accessToken;

        setCurrentUser(uid);
        setAuthKey(token);

        // Update profile in state
        setUserProfiles((prev) => ({
          ...prev,
          [uid]: {
            userId: uid,
            firstName: loggedUser.firstName || loggedUser.username,
            lastName: loggedUser.lastName || '',
            bio: loggedUser.bio || '',
            username: loggedUser.username,
            phoneNumber: loggedUser.phoneNumber || '',
            avatarUrl: loggedUser.avatarUrl || '',
            statusEmoji: loggedUser.statusEmoji || ''
          }
        }));

        localStorage.setItem('chat_user_v2', uid);
        localStorage.setItem('chat_auth_key_v2', token);

        const isPreset = ['vlad', 'anya', 'mom', 'dad', 'sister'].includes(uid);
        if (isPreset) {
          const userRooms = ALL_ROOMS.filter(r => r.participants.includes(uid) || r.id === 'family');
          if (userRooms.length > 0) {
            setActiveRoomId(userRooms[0].id);
            localStorage.setItem('chat_active_room_v2', userRooms[0].id);
          }
        } else {
          setActiveRoomId('saved-messages');
          localStorage.setItem('chat_active_room_v2', 'saved-messages');
        }

        return true;
      } catch (err: any) {
        // Fallback for preset testing accounts if API is temporarily unreachable or returned 401
        const cleanName = normalizedInput.toLowerCase();
        const mappedUser = KEY_TO_USER[password] || KEY_TO_USER[cleanName] || (['vlad', 'anya', 'mom', 'dad', 'sister'].includes(cleanName) ? cleanName as UserId : null);
        if (mappedUser) {
          setCurrentUser(mappedUser);
          setAuthKey(password || cleanName);
          localStorage.setItem('chat_user_v2', mappedUser);
          localStorage.setItem('chat_auth_key_v2', password || cleanName);
          setActiveRoomId('family');
          localStorage.setItem('chat_active_room_v2', 'family');
          return true;
        }

        setError(err.message || 'Ошибка авторизации');
        return false;
      }
    }

    // 2. Legacy key or preset account login (e.g. 'vladpass', 'anyapass')
    const mappedUser = KEY_TO_USER[normalizedInput];
    if (mappedUser) {
      setCurrentUser(mappedUser);
      setAuthKey(normalizedInput);
      localStorage.setItem('chat_user_v2', mappedUser);
      localStorage.setItem('chat_auth_key_v2', normalizedInput);

      // Background Supabase Auth login for preset
      supabase.auth.signInWithPassword({
        email: `${mappedUser}@telegram.org`,
        password: normalizedInput
      }).catch((e) => console.warn('Supabase preset auth notice:', e));

      const userRooms = ALL_ROOMS.filter(r => r.participants.includes(mappedUser) || r.id === 'family');
      if (userRooms.length > 0) {
        setActiveRoomId(userRooms[0].id);
        localStorage.setItem('chat_active_room_v2', userRooms[0].id);
      }
      return true;
    }

    setError('Неверный логин или пароль.');
    return false;
  };

  const register = async (payload: RegisterRequest): Promise<boolean> => {
    setError(null);
    try {
      const authData = await authService.register(payload);
      const registeredUser = authData.user;
      const uid = registeredUser.userId as UserId;
      const token = authData.tokens.accessToken;

      setCurrentUser(uid);
      setAuthKey(token);

      setUserProfiles((prev) => {
        const next = {
          ...prev,
          [uid]: {
            userId: uid,
            firstName: registeredUser.firstName || registeredUser.username,
            lastName: registeredUser.lastName || '',
            bio: registeredUser.bio || '',
            username: registeredUser.username,
            phoneNumber: registeredUser.phoneNumber || '',
            avatarUrl: registeredUser.avatarUrl || '',
            statusEmoji: registeredUser.statusEmoji || '✨'
          }
        };
        try {
          localStorage.setItem('chat_user_profiles_v2', JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });

      localStorage.setItem('chat_user_v2', uid);
      localStorage.setItem('chat_auth_key_v2', token);

      // New users start with Saved Messages
      setActiveRoomId('saved-messages');
      localStorage.setItem('chat_active_room_v2', 'saved-messages');

      return true;
    } catch (err: any) {
      setError(err.message || 'Ошибка при регистрации');
      return false;
    }
  };

  const searchUsers = useCallback(async (query: string): Promise<UserSearchResult[]> => {
    const q = (query || '').trim();
    if (!q) return [];

    if (socketRef.current && isConnected) {
      return new Promise((resolve) => {
        socketRef.current?.emit('search_users', { query: q }, (response: { users?: UserSearchResult[] }) => {
          resolve(response?.users || []);
        });
        setTimeout(() => resolve([]), 3500);
      });
    }

    try {
      const res = await fetch(`${SERVER_URL}/api/users/search?q=${encodeURIComponent(q)}&currentUserId=${encodeURIComponent(currentUser || '')}`);
      if (res.ok) {
        const data = await res.json();
        return data.users || [];
      }
    } catch {
      // ignore
    }
    return [];
  }, [isConnected, currentUser]);

  const createDirectChat = useCallback(async (targetUserId: string): Promise<Room | null> => {
    if (!targetUserId || targetUserId.toLowerCase() === currentUser?.toLowerCase()) return null;

    if (socketRef.current && isConnected) {
      return new Promise((resolve) => {
        socketRef.current?.emit('create_direct_chat', { targetUserId }, (response: { room?: Room }) => {
          if (response?.room) {
            setServerRooms((prev) => {
              if (prev.some((r) => r.id === response.room!.id)) return prev;
              const next = [response.room!, ...prev];
              if (currentUser) {
                try {
                  localStorage.setItem(`chat_server_rooms_${currentUser}`, JSON.stringify(next));
                } catch {}
              }
              return next;
            });
            setActiveRoomId(response.room.id);
            localStorage.setItem('chat_active_room_v2', response.room.id);
            resolve(response.room);
          } else {
            resolve(null);
          }
        });
        setTimeout(() => resolve(null), 5000);
      });
    }
    return null;
  }, [isConnected, currentUser]);

  const createGroupChat = useCallback(async (name: string, participantIds: string[], avatarUrl?: string): Promise<Room | null> => {
    if (!name || !name.trim()) return null;

    if (socketRef.current && isConnected) {
      return new Promise((resolve) => {
        socketRef.current?.emit('create_group_chat', { name: name.trim(), participantIds, avatarUrl }, (response: { room?: Room }) => {
          if (response?.room) {
            setServerRooms((prev) => {
              if (prev.some((r) => r.id === response.room!.id)) return prev;
              const next = [response.room!, ...prev];
              if (currentUser) {
                try {
                  localStorage.setItem(`chat_server_rooms_${currentUser}`, JSON.stringify(next));
                } catch {}
              }
              return next;
            });
            setActiveRoomId(response.room.id);
            localStorage.setItem('chat_active_room_v2', response.room.id);
            resolve(response.room);
          } else {
            resolve(null);
          }
        });
        setTimeout(() => resolve(null), 5000);
      });
    }
    return null;
  }, [isConnected, currentUser]);

  const sendTypingStatus = (isTyping: boolean) => {
    if (socketRef.current && isConnected && currentUser && activeRoomId) {
      socketRef.current.emit('typing', {
        roomId: activeRoomId,
        isTyping
      });
    }
  };

  const sendMessage = async (
    text: string, 
    replyToId?: string,
    filePayload?: { 
      name: string; 
      type: 'image' | 'audio' | 'video' | 'video_note' | 'file' | 'sticker'; 
      data: string; 
      size: number; 
      rawBlob?: Blob | File; 
      width?: number;
      height?: number;
      orientation?: 'vertical' | 'horizontal' | 'square';
      stickerData?: any;
      waveform?: number[];
      duration?: number;
    },
    targetRoomId?: string,
    forwardedFrom?: { sender: UserId; senderName: string; originalMessageId?: string },
    poll?: Poll
  ) => {
    const effectiveRoomId = targetRoomId || activeRoomId;
    if (!socketRef.current || !isConnected || !currentUser || !effectiveRoomId) {
      setError('Не удалось отправить сообщение. Ошибка подключения.');
      return;
    }

    const hasValidContent = Boolean(
      (text && text.trim().length > 0) ||
      filePayload ||
      forwardedFrom ||
      poll
    );
    if (!hasValidContent) {
      return;
    }

    const messageId = generateUUID();
    let finalFilePayload = filePayload ? { ...filePayload } : undefined;

    // Optimistic rendering: add text-only messages to UI immediately
    if (!filePayload && (text.trim() || forwardedFrom || poll)) {
      const optimisticMessage: Message = {
        id: messageId,
        roomId: effectiveRoomId,
        sender: currentUser,
        text: text.trim(),
        timestamp: Date.now(),
        replyToId: replyToId || undefined,
        forwardedFrom: forwardedFrom || undefined,
        poll: poll ? { ...poll } : undefined,
        pending: true
      };
      setMessages((prev) => [...prev, optimisticMessage]);
    }

    if (filePayload) {
      const isInstantMedia = !filePayload.rawBlob && (
        filePayload.type === 'sticker' || 
        (filePayload.data.startsWith('http') && !filePayload.data.startsWith('blob:')) || 
        filePayload.data.startsWith('data:image/svg')
      );

      const tempMessage: Message = {
        id: messageId,
        roomId: effectiveRoomId,
        sender: currentUser,
        text: text.trim(),
        timestamp: Date.now(),
        replyToId,
        forwardedFrom: forwardedFrom || undefined,
        file: {
          ...filePayload,
          isUploading: !isInstantMedia,
          uploadProgress: isInstantMedia ? undefined : 0
        }
      };

      setMessages((prev) => [...prev, tempMessage]);

      if (!isInstantMedia) {
        try {
          const uploadedUrl = await new Promise<string>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${SERVER_URL}/api/upload`);

            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === messageId
                      ? {
                          ...msg,
                          file: msg.file
                            ? { ...msg.file, uploadProgress: percent }
                            : undefined
                        }
                      : msg
                  )
                );
              }
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const res = JSON.parse(xhr.responseText);
                  resolve(res.url);
                } catch {
                  reject(new Error('Invalid upload response'));
                }
              } else {
                reject(new Error(`Upload failed: ${xhr.status}`));
              }
            };

            xhr.onerror = () => reject(new Error('Network error during upload'));
            
            if (filePayload.rawBlob) {
              const formData = new FormData();
              formData.append('file', filePayload.rawBlob, filePayload.name);
              xhr.send(formData);
            } else {
              xhr.setRequestHeader('Content-Type', 'application/json');
              xhr.send(JSON.stringify({
                name: filePayload.name,
                type: filePayload.type,
                data: filePayload.data
              }));
            }
          });

          if (finalFilePayload) {
            finalFilePayload.data = uploadedUrl;
            delete (finalFilePayload as any).rawBlob;
            delete (finalFilePayload as any).isUploading;
            delete (finalFilePayload as any).uploadProgress;
          }

          // Immediately update local message state to clear uploading spinner
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? {
                    ...msg,
                    file: msg.file
                      ? {
                          ...msg.file,
                          data: uploadedUrl,
                          isUploading: false,
                          uploadProgress: undefined
                        }
                      : undefined
                  }
                : msg
            )
          );
        } catch (err) {
          console.warn('File upload via HTTP failed, falling back to Socket.io directly:', err);
          if (finalFilePayload) {
            delete (finalFilePayload as any).rawBlob;
            delete (finalFilePayload as any).isUploading;
            delete (finalFilePayload as any).uploadProgress;
          }
          // Clear isUploading in state so spinner is not stuck on error
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? {
                    ...msg,
                    file: msg.file
                      ? {
                          ...msg.file,
                          isUploading: false,
                          uploadProgress: undefined
                        }
                      : undefined
                  }
                : msg
            )
          );
        }
      }
    }

    const payload: Message = {
      id: messageId,
      roomId: effectiveRoomId,
      sender: currentUser,
      text: text.trim(),
      timestamp: Date.now(),
      replyToId: replyToId || undefined,
      forwardedFrom: forwardedFrom || undefined,
      file: finalFilePayload || undefined,
      poll: poll ? { ...poll } : undefined
    };

    socketRef.current.emit('send_message', payload);

    // Persist directly to Supabase messages table in cloud PostgreSQL
    (async () => {
      try {
        const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

        // 1. Resolve Sender
        let senderUser: { id: string } | null = null;
        if (isUuid(currentUser)) {
          const { data } = await supabase.from('users').select('id').eq('id', currentUser).maybeSingle();
          senderUser = data;
        }
        if (!senderUser) {
          const { data } = await supabase.from('users').select('id').eq('username', currentUser).maybeSingle();
          senderUser = data;
        }

        // 2. Resolve Room
        const targetRoomObj = rooms.find(r => r.id === effectiveRoomId);
        const roomName = targetRoomObj?.name || effectiveRoomId;
        let targetRoom: { id: string } | null = null;
        if (isUuid(effectiveRoomId)) {
          const { data } = await supabase.from('rooms').select('id').eq('id', effectiveRoomId).maybeSingle();
          targetRoom = data;
        }
        if (!targetRoom) {
          const { data } = await supabase.from('rooms').select('id').eq('name', roomName).maybeSingle();
          targetRoom = data;
        }

        // 3. Fallback: if room doesn't exist yet, auto-create it
        if (!targetRoom && senderUser) {
          const { data: newRoom } = await supabase.from('rooms').insert({
            name: roomName,
            type: activeRoom?.type || 'direct',
            created_by: senderUser.id,
            is_active: true
          }).select('id').single();
          targetRoom = newRoom;
        }

        if (senderUser && targetRoom) {
          const { data: insertedMsg, error: insErr } = await supabase
            .from('messages')
            .insert({
              room_id: targetRoom.id,
              sender_id: senderUser.id,
              content: text.trim() || (finalFilePayload ? `📎 ${finalFilePayload.name}` : ''),
            })
            .select()
            .single();

          if (insErr) {
            console.error('[Supabase Insert Message Error]', insErr);
          }

          if (insertedMsg && finalFilePayload) {
            await supabase.from('message_attachments').insert({
              message_id: insertedMsg.id,
              file_url: finalFilePayload.data,
              file_name: finalFilePayload.name,
              file_type: finalFilePayload.type,
              file_size: finalFilePayload.size,
            });
          }
        }
      } catch (e) {
        console.error('[Supabase Message Sync Error]', e);
      }
    })();
  };

  const forwardMessage = useCallback((targetRoomId: string, messageToForward: Message) => {
    if (!socketRef.current || !isConnected || !currentUser || !targetRoomId) {
      setError('Не удалось переслать сообщение. Ошибка подключения.');
      return;
    }

    const messageId = generateUUID();
    const originalSender = messageToForward.forwardedFrom?.sender || messageToForward.sender;
    const originalSenderName = messageToForward.forwardedFrom?.senderName || 
      getUserDisplayName(originalSender) || 
      USER_NAMES[originalSender] || 
      DEFAULT_USER_PROFILES[originalSender]?.firstName || 
      originalSender;

    // Clean text of any legacy or zero-width forward prefix if present
    const rawCleanText = (messageToForward.text || '')
      .replace(/^\u200B\u200B\[fwd:[^\]]+\]\u200B\u200B/, '')
      .replace(/^\[Переслано от [^\]]+\]:\s*/, '');

    // Encode zero-width metadata tag for 100% resilient transport
    const fwdMeta = `\u200B\u200B[fwd:${JSON.stringify({ s: originalSender, n: originalSenderName })}]\u200B\u200B`;
    const payloadText = `${fwdMeta}${rawCleanText}`;

    const forwardedPayload: Message = {
      id: messageId,
      roomId: targetRoomId,
      sender: currentUser,
      text: payloadText,
      timestamp: Date.now(),
      forwardedFrom: {
        sender: originalSender,
        senderName: originalSenderName,
        originalMessageId: messageToForward.forwardedFrom?.originalMessageId || messageToForward.id
      },
      file: messageToForward.file ? {
        ...messageToForward.file,
        isUploading: false,
        uploadProgress: undefined
      } : undefined,
      poll: messageToForward.poll ? {
        ...messageToForward.poll,
        votes: {}
      } : undefined
    };

    // Optimistic local add
    setMessages((prev) => [...prev, { ...forwardedPayload, pending: true }]);

    // Emit over socket
    socketRef.current.emit('send_message', forwardedPayload);
  }, [currentUser, isConnected, getUserDisplayName]);

  // WebRTC Signaling functions
  const initPeerConnection = (stream: MediaStream, roomId: string) => {
    pcRoomIdRef.current = roomId;
    pendingCandidatesRef.current = [];
    
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    peerConnectionRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('webrtc_signal', {
          roomId,
          targetSocketId: targetSocketIdRef.current || undefined,
          signal: { candidate: event.candidate }
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else {
        setRemoteStream((prevStream) => {
          const s = prevStream || new MediaStream();
          s.addTrack(event.track);
          return s;
        });
      }
    };

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    return pc;
  };

  const startCall = async (type: 'audio' | 'video') => {
    if (!socketRef.current || !currentUser || !activeRoomId || activeRoom?.type !== 'direct') return;
    
    const receiver = activeRoom.participants.find((p) => p !== currentUser)!;
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError(
        'Камера/микрофон заблокированы. WebRTC звонки требуют HTTPS или localhost. ' +
        'В Chrome откройте chrome://flags/#unsafely-treat-insecure-origin-as-secure ' +
        'и добавьте адрес вашего сайта в список разрешенных.'
      );
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video'
      });
      
      localStreamRef.current = stream;
      setLocalStream(stream);
      
      setCallSession({
        roomId: activeRoomId,
        caller: currentUser,
        receiver,
        type,
        status: 'calling'
      });

      initPeerConnection(stream, activeRoomId);

      socketRef.current.emit('call_user', {
        roomId: activeRoomId,
        receiver,
        type
      });
    } catch (err) {
      console.error('[WebRTC] startCall error:', err);
      setError('Не удалось получить доступ к микрофону/камере.');
    }
  };

  const acceptCall = async () => {
    if (!socketRef.current || !callSession) return;
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError(
        'Камера/микрофон заблокированы. WebRTC звонки требуют HTTPS или localhost. ' +
        'В Chrome откройте chrome://flags/#unsafely-treat-insecure-origin-as-secure ' +
        'и добавьте адрес вашего сайта в список разрешенных.'
      );
      rejectCall();
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callSession.type === 'video'
      });
      
      localStreamRef.current = stream;
      setLocalStream(stream);
      
      initPeerConnection(stream, callSession.roomId);
      
      setCallSession((prev) => prev ? { ...prev, status: 'active' } : null);
      
      socketRef.current.emit('call_accept', { 
        roomId: callSession.roomId,
        targetSocketId: targetSocketIdRef.current || undefined
      });
    } catch (err) {
      console.error('[WebRTC] acceptCall error:', err);
      setError('Не удалось получить доступ к микрофону/камере.');
      rejectCall();
    }
  };

  const rejectCall = () => {
    if (socketRef.current && callSession) {
      socketRef.current.emit('call_reject', { 
        roomId: callSession.roomId,
        targetSocketId: targetSocketIdRef.current || undefined
      });
    }
    cleanupCall();
  };

  const endCall = () => {
    if (socketRef.current && callSession) {
      socketRef.current.emit('call_end', { 
        roomId: callSession.roomId,
        targetSocketId: targetSocketIdRef.current || undefined
      });
    }
    cleanupCall();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  };

  const editMessage = (messageId: string, newText: string) => {
    if (socketRef.current && isConnected && activeRoomId) {
      socketRef.current.emit('edit_message', { messageId, roomId: activeRoomId, newText: newText.trim() });
    }
  };

  const deleteMessage = (messageId: string) => {
    if (activeRoomId) {
      setMessages((prev) => prev.filter((msg) => !(msg.id === messageId && msg.roomId === activeRoomId)));
      if (socketRef.current && isConnected) {
        socketRef.current.emit('delete_message', { messageId, roomId: activeRoomId });
      }
    }
  };

  const toggleReaction = (messageId: string, reaction: string) => {
    if (socketRef.current && isConnected && activeRoomId) {
      socketRef.current.emit('toggle_reaction', { messageId, roomId: activeRoomId, reaction });
    }
  };

  const votePoll = useCallback((messageId: string, roomId: string, optionIds: string[]) => {
    if (!currentUser) return;

    // Optimistic local update for instant UI feedback
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId || !msg.poll || msg.poll.closed) return msg;
        const newVotes: Record<string, UserId[]> = {};
        // Clone existing votes excluding current user
        Object.entries(msg.poll.votes || {}).forEach(([optId, voters]) => {
          const filtered = voters.filter((v) => v !== currentUser);
          if (filtered.length > 0) {
            newVotes[optId] = filtered;
          }
        });
        // Add current user to selected options
        optionIds.forEach((optId) => {
          if (!newVotes[optId]) newVotes[optId] = [];
          if (!newVotes[optId].includes(currentUser)) {
            newVotes[optId].push(currentUser);
          }
        });
        return {
          ...msg,
          poll: {
            ...msg.poll,
            votes: newVotes
          }
        };
      })
    );

    if (socketRef.current && isConnected) {
      socketRef.current.emit('vote_poll', { messageId, roomId, optionIds });
    }
  }, [isConnected, currentUser]);

  const closePoll = useCallback((messageId: string, roomId: string) => {
    // Optimistic local update
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId || !msg.poll) return msg;
        return {
          ...msg,
          poll: {
            ...msg.poll,
            closed: true
          }
        };
      })
    );

    if (socketRef.current && isConnected) {
      socketRef.current.emit('close_poll', { messageId, roomId });
    }
  }, [isConnected]);

  const handleSetActiveRoomId = (id: string) => {
    if (socketRef.current && isConnected && currentUser && activeRoomId) {
      socketRef.current.emit('typing', {
        roomId: activeRoomId,
        isTyping: false
      });
    }
    setActiveRoomId(id);
    localStorage.setItem('chat_active_room_v2', id);
    // URL sync: #/chat/{roomId} (pushState keeps browser Back working between chats)
    try {
      const newHash = `#/chat/${encodeURIComponent(id)}`;
      if (window.location.hash !== newHash) {
        window.history.pushState({ chatRoom: id }, '', newHash);
      }
    } catch { /* ignore */ }
    setTimeout(() => markRoomAsRead(id), 50);
  };

  // Browser Back/Forward + manual hash edits → switch chat
  useEffect(() => {
    const onPopState = () => {
      const hashMatch = window.location.hash.match(/^#\/chat\/(.+)$/);
      if (hashMatch) {
        const targetRoom = decodeURIComponent(hashMatch[1]);
        setActiveRoomId((prev) => {
          if (prev === targetRoom) return prev;
          localStorage.setItem('chat_active_room_v2', targetRoom);
          setTimeout(() => markRoomAsRead(targetRoom), 50);
          return targetRoom;
        });
      }
    };
    window.addEventListener('popstate', onPopState);
    window.addEventListener('hashchange', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('hashchange', onPopState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    navigateToRoomRef.current = (id: string) => {
      handleSetActiveRoomId(id);
    };
  });

  // ===== Unread Badge in Browser Tab Title =====
  const totalUnread = useMemo(() => {
    if (!currentUser) return 0;
    return messages.reduce((sum, m) => {
      if (
        rooms.some((r) => r.id === m.roomId) &&
        m.sender !== currentUser &&
        !m.pending &&
        !(m.readBy && m.readBy.includes(currentUser))
      ) {
        return sum + 1;
      }
      return sum;
    }, 0);
  }, [messages, currentUser, rooms]);

  useEffect(() => {
    const baseTitle = 'Telegram Web';
    document.title = totalUnread > 0 ? `(${totalUnread}) ${baseTitle}` : baseTitle;
  }, [totalUnread]);

  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' && activeRoomId) {
        markRoomAsRead(activeRoomId);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [activeRoomId, messages, markRoomAsRead]);

  return (
    <SocketContext.Provider
      value={{
        currentUser,
        currentUserName,
        currentUserProfile,
        userProfiles,
        updateUserProfile,
        getUserDisplayName,
        getUserAvatar,
        rooms,
        activeRoomId,
        setActiveRoomId: handleSetActiveRoomId,
        activeRoom,
        isConnected,
        onlineStatus,
        messages,
        activeMessages,
        error,
        login,
        register,
        logout,
        searchUsers,
        createDirectChat,
        createGroupChat,
        sendMessage,
        forwardMessage,
        editMessage,
        deleteMessage,
        toggleReaction,
        votePoll,
        closePoll,
        markRoomAsRead,
        unreadCount,
        lastMessageOf,
        notificationsEnabled,
        setNotificationsEnabled,
        typingUsers,
        sendTypingStatus,
        
        // Global Audio state
        playingAudioId,
        setPlayingAudioId,

        // Calling variables
        callSession,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        localStream,
        remoteStream,
        isMuted,
        toggleMute,
        isCameraOff,
        toggleCamera,
        socket: socketInstance
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

// eslint-disable-next-line react/only-export-components
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
