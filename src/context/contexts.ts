/**
 * Context objects and hooks for the split app state.
 *
 *   AuthProvider        → useAuth()        JWT session, 2FA step, login/register/logout
 *   ConnectionProvider  → useConnection()  Socket.io instance, connection state, global error
 *   RoomsProvider       → useRooms()       chats, navigation, presence, typing, profiles
 *   MessagesProvider    → useMessages()    messages, offline queue, E2EE, scheduling
 *   CallProvider        → useCall()        WebRTC calls, screen sharing, PiP
 *
 * `useSocket()` below merges them for legacy components. Contexts and hooks live
 * in this `.ts` file so the providers' `.tsx` modules export components only
 * (React Fast Refresh / oxlint `only-export-components`).
 */
import { createContext, useContext } from 'react';
import type { Socket } from 'socket.io-client';
import type {
  CallSession,
  ConnectionStatus,
  Message,
  Poll,
  Room,
  SecretChatTtl,
  UserId,
  UserProfile,
  UserSearchResult,
} from '../types';
import type { RegisterRequest, UserSanitized } from '../types/auth.types';

// ===== Auth =====

export type AuthStatus = 'restoring' | 'anonymous' | 'authenticated';

export interface TwoFactorPrompt {
  challenge: string;
  hint: string;
  /** Remaining attempts reported by the server after a wrong password. */
  remaining?: number;
}

export interface AuthContextValue {
  status: AuthStatus;
  user: UserSanitized | null;
  currentUser: UserId | null;
  error: string | null;
  setError: (message: string | null) => void;
  twoFactor: TwoFactorPrompt | null;
  /** Resolves `true` when a session is open; `false` on error or when the 2FA step is required. */
  login: (identifier: string, password?: string) => Promise<boolean>;
  verifyTwoFactor: (cloudPassword: string) => Promise<boolean>;
  cancelTwoFactor: () => void;
  register: (payload: RegisterRequest) => Promise<boolean>;
  logout: () => void;
  /** Local sign-out after the server revoked this device (no API call). */
  endSession: (message?: string) => void;
}

// ===== Connection =====

export interface ConnectionContextValue {
  socket: Socket | null;
  isConnected: boolean;
  error: string | null;
  setError: (message: string | null) => void;
  /** Emits with an ack; resolves `null` on timeout or when offline. */
  emitWithAck: <T>(event: string, payload: unknown, timeoutMs?: number) => Promise<T | null>;
}

// ===== Rooms =====

export interface RoomsContextValue {
  rooms: Room[];
  activeRoomId: string;
  setActiveRoomId: (id: string) => void;
  activeRoom: Room | null;
  onlineStatus: ConnectionStatus;
  typingUsers: Record<string, Record<string, boolean>>;
  sendTypingStatus: (isTyping: boolean) => void;
  userProfiles: Record<UserId, UserProfile>;
  currentUserProfile: UserProfile | null;
  currentUserName: string | null;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
  getUserDisplayName: (userId: UserId) => string;
  getUserAvatar: (userId: UserId) => string | undefined;
  searchUsers: (query: string) => Promise<UserSearchResult[]>;
  createDirectChat: (targetUserId: string) => Promise<Room | null>;
  createGroupChat: (name: string, participantIds: string[], avatarUrl?: string) => Promise<Room | null>;
  createSecretChat: (targetUserId: string) => Promise<Room | null>;
}

// ===== Messages =====

export type FileKind = 'image' | 'audio' | 'video' | 'video_note' | 'file' | 'sticker';

export interface OutgoingFile {
  name: string;
  type: FileKind;
  data: string;
  size: number;
  rawBlob?: Blob | File;
  width?: number;
  height?: number;
  orientation?: 'vertical' | 'horizontal' | 'square';
  stickerData?: any;
  waveform?: number[];
  duration?: number;
}

export interface ForwardSource {
  sender: UserId;
  senderName: string;
  originalMessageId?: string;
}

/** Extra delivery options from the send button menu. */
export interface SendOptions {
  /** «Отправить без звука» — recipients get no sound/notification. */
  silent?: boolean;
  /** «Отправить позже» — server delivers at this time (ms epoch). */
  scheduledAt?: number;
  /** Groups several media into one bento album. */
  albumId?: string;
}

export interface MessagesContextValue {
  messages: Message[];
  activeMessages: Message[];
  sendMessage: (
    text: string,
    replyToId?: string,
    filePayload?: OutgoingFile,
    targetRoomId?: string,
    forwardedFrom?: ForwardSource,
    poll?: Poll,
    options?: SendOptions,
  ) => void;
  forwardMessage: (targetRoomId: string, message: Message) => void;
  editMessage: (messageId: string, newText: string) => void;
  deleteMessage: (messageId: string) => void;
  toggleReaction: (messageId: string, reaction: string) => void;
  votePoll: (messageId: string, roomId: string, optionIds: string[]) => void;
  closePoll: (messageId: string, roomId: string) => void;
  markRoomAsRead: (roomId: string) => void;
  unreadCount: (roomId: string) => number;
  lastMessageOf: (roomId: string) => Message | null;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  playingAudioId: string | null;
  setPlayingAudioId: (id: string | null) => void;
  /** Messages accepted by the server for later delivery (own, current user). */
  scheduledMessages: Message[];
  cancelScheduledMessage: (messageId: string) => Promise<boolean>;
  sendScheduledNow: (messageId: string) => Promise<boolean>;
  /** Number of messages waiting in the IndexedDB offline queue. */
  queuedCount: number;
  /** Self-destruct timer chosen for a secret chat (seconds), `undefined` = off. */
  secretTtl: (roomId: string) => SecretChatTtl | undefined;
  setSecretTtl: (roomId: string, ttl: SecretChatTtl | undefined) => void;
  /** Safety fingerprint of the E2EE session key for a secret chat. */
  secretFingerprint: (roomId: string) => Promise<string | null>;
}

// ===== Calls =====

export interface CallContextValue {
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
  /** `getDisplayMedia` screen sharing replaces the outgoing video track. */
  isScreenSharing: boolean;
  /** The peer is currently showing their screen (layout hint for the call UI). */
  isRemoteScreenSharing: boolean;
  toggleScreenShare: () => Promise<void>;
  /** Floating picture-in-picture call window. */
  isCallMinimized: boolean;
  setCallMinimized: (minimized: boolean) => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
export const ConnectionContext = createContext<ConnectionContextValue | undefined>(undefined);
export const RoomsContext = createContext<RoomsContextValue | undefined>(undefined);
export const MessagesContext = createContext<MessagesContextValue | undefined>(undefined);
export const CallContext = createContext<CallContextValue | undefined>(undefined);

function required<T>(value: T | undefined, hook: string, provider: string): T {
  if (value === undefined) throw new Error(`${hook} must be used within ${provider}`);
  return value;
}

export const useAuth = () => required(useContext(AuthContext), 'useAuth', 'AuthProvider');
export const useConnection = () => required(useContext(ConnectionContext), 'useConnection', 'ConnectionProvider');
export const useRooms = () => required(useContext(RoomsContext), 'useRooms', 'RoomsProvider');
export const useMessages = () => required(useContext(MessagesContext), 'useMessages', 'MessagesProvider');
export const useCall = () => required(useContext(CallContext), 'useCall', 'CallProvider');

/** Legacy all-in-one facade (was the 1700-line SocketContext value). */
export type SocketContextType = Omit<AuthContextValue, 'error' | 'setError'> &
  Omit<ConnectionContextValue, 'error' | 'setError'> &
  RoomsContextValue &
  MessagesContextValue &
  CallContextValue & {
    error: string | null;
  };

export function useSocket(): SocketContextType {
  const auth = useAuth();
  const connection = useConnection();
  const rooms = useRooms();
  const messages = useMessages();
  const call = useCall();
  return {
    ...auth,
    ...connection,
    ...rooms,
    ...messages,
    ...call,
    error: auth.error ?? connection.error,
  };
}
