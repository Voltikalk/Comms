import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type { Message, UserId, Room, ConnectionStatus, CallSession } from '../types';
import { USER_NAMES, KEY_TO_USER, ALL_ROOMS, SERVER_URL } from '../constants';

interface SocketContextType {
  currentUser: UserId | null;
  currentUserName: string | null;
  rooms: Room[];
  activeRoomId: string;
  setActiveRoomId: (id: string) => void;
  activeRoom: Room | null;
  isConnected: boolean;
  onlineStatus: ConnectionStatus;
  messages: Message[];
  activeMessages: Message[];
  error: string | null;
  login: (key: string) => Promise<boolean>;
  logout: () => void;
  sendMessage: (
    text: string, 
    replyToId?: string,
    filePayload?: { name: string; type: 'image' | 'audio' | 'video' | 'video_note' | 'file'; data: string; size: number; rawBlob?: Blob | File }
  ) => void;
  editMessage: (messageId: string, newText: string) => void;
  deleteMessage: (messageId: string) => void;
  toggleReaction: (messageId: string, reaction: string) => void;
  markRoomAsRead: (roomId: string) => void;
  unreadCount: (roomId: string) => number;
  lastMessageOf: (roomId: string) => Message | null;
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
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const sanitizeMessage = (msg: Message): Message => {
  if (msg.file && msg.file.data && msg.file.data.startsWith('/uploads/')) {
    return {
      ...msg,
      file: {
        ...msg.file,
        data: `${SERVER_URL}${msg.file.data}`
      }
    };
  }
  return msg;
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

  // WebRTC Call States
  const [callSession, setCallSession] = useState<CallSession | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRoomIdRef = useRef<string>('');
  const targetSocketIdRef = useRef<string>('');
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  // Filter rooms based on participants
  const rooms = ALL_ROOMS.filter(r => currentUser && r.participants.includes(currentUser));
  const activeRoom = rooms.find(r => r.id === activeRoomId) || rooms[0] || null;

  // Sync activeRoomId if it becomes invalid or empty
  useEffect(() => {
    if (activeRoom && activeRoom.id !== activeRoomId) {
      setActiveRoomId(activeRoom.id);
      localStorage.setItem('chat_active_room_v2', activeRoom.id);
    }
  }, [activeRoom, activeRoomId]);

  const currentUserName = currentUser ? USER_NAMES[currentUser] : null;
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

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    activeRoomIdRef.current = activeRoomId;
  }, [activeRoomId]);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

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

  // ===== Sound + Browser Notifications =====
  const notifyNewMessage = useCallback((message: Message) => {
    const room = ALL_ROOMS.find((r) => r.id === message.roomId);
    const senderName = USER_NAMES[message.sender] || message.sender;
    const roomName = room ? (room.type === 'group' ? room.name : senderName) : 'Чат';

    const isViewingRoom = activeRoomIdRef.current === message.roomId && document.visibilityState === 'visible';
    if (isViewingRoom) {
      markRoomAsRead(message.roomId);
      return;
    }

    playNotificationSound();

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const preview = message.text || (message.file ? '📎 Вложение' : 'Новое сообщение');
        const n = new Notification(`${senderName} · ${roomName}`, {
          body: preview,
          tag: message.roomId,
          icon: '/icon-192.png'
        });
        n.onclick = () => {
          window.focus();
          n.close();
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
      }
      setIsConnected(false);
      return;
    }

    const socket = io(SERVER_URL, {
      auth: {
        token: authKey
      },
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      autoConnect: true
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setError(null);
      console.log('Connected to server as', currentUser);
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch((_err) => {
          // Notification denied or unsupported
        });
      }
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

    socket.on('history', (historyMessages: Message[]) => {
      setMessages(historyMessages.map(sanitizeMessage));
    });

    socket.on('receive_message', (message: Message) => {
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
      setIsConnected(false);
    };
  }, [currentUser, authKey]);

  const login = async (key: string): Promise<boolean> => {
    setError(null);
    const normalizedKey = key.trim();
    const mappedUser = KEY_TO_USER[normalizedKey];

    if (!mappedUser) {
      setError('Неверный ключ. Попробуйте "vladpass", "anyapass", "mompass" и т.д.');
      return false;
    }

    setCurrentUser(mappedUser);
    setAuthKey(normalizedKey);
    localStorage.setItem('chat_user_v2', mappedUser);
    localStorage.setItem('chat_auth_key_v2', normalizedKey);

    const userRooms = ALL_ROOMS.filter(r => r.participants.includes(mappedUser));
    if (userRooms.length > 0) {
      setActiveRoomId(userRooms[0].id);
      localStorage.setItem('chat_active_room_v2', userRooms[0].id);
    }

    return true;
  };

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
    filePayload?: { name: string; type: 'image' | 'audio' | 'video' | 'video_note' | 'file'; data: string; size: number; rawBlob?: Blob | File }
  ) => {
    if (!socketRef.current || !isConnected || !currentUser || !activeRoomId) {
      setError('Не удалось отправить сообщение. Ошибка подключения.');
      return;
    }

    const messageId = Math.random().toString(36).substring(2, 9);
    let finalFilePayload = filePayload ? { ...filePayload } : undefined;

    // Optimistic rendering: add text-only messages to UI immediately
    if (!filePayload && text.trim()) {
      const optimisticMessage: Message = {
        id: messageId,
        roomId: activeRoomId,
        sender: currentUser,
        text: text.trim(),
        timestamp: Date.now(),
        replyToId: replyToId || undefined,
        pending: true
      };
      setMessages((prev) => [...prev, optimisticMessage]);
    }

    if (filePayload) {
      const tempMessage: Message = {
        id: messageId,
        roomId: activeRoomId,
        sender: currentUser,
        text: text.trim(),
        timestamp: Date.now(),
        replyToId,
        file: {
          ...filePayload,
          isUploading: true,
          uploadProgress: 0
        }
      };

      setMessages((prev) => [...prev, tempMessage]);

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
        }
      } catch (err) {
        console.warn('File upload via HTTP failed, falling back to Socket.io directly:', err);
      }
    }

    const payload = {
      id: messageId,
      roomId: activeRoomId,
      sender: currentUser,
      text: text.trim(),
      timestamp: Date.now(),
      replyToId: replyToId || undefined,
      file: finalFilePayload || undefined
    };

    socketRef.current.emit('send_message', payload);
  };

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
    if (socketRef.current && isConnected && activeRoomId) {
      socketRef.current.emit('delete_message', { messageId, roomId: activeRoomId });
    }
  };

  const toggleReaction = (messageId: string, reaction: string) => {
    if (socketRef.current && isConnected && activeRoomId) {
      socketRef.current.emit('toggle_reaction', { messageId, roomId: activeRoomId, reaction });
    }
  };

  const handleSetActiveRoomId = (id: string) => {
    if (socketRef.current && isConnected && currentUser && activeRoomId) {
      socketRef.current.emit('typing', {
        roomId: activeRoomId,
        isTyping: false
      });
    }
    setActiveRoomId(id);
    localStorage.setItem('chat_active_room_v2', id);
    setTimeout(() => markRoomAsRead(id), 50);
  };

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
        logout,
        sendMessage,
        editMessage,
        deleteMessage,
        toggleReaction,
        markRoomAsRead,
        unreadCount,
        lastMessageOf,
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
        toggleCamera
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
