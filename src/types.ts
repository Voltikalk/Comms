export type UserId = 'vlad' | 'anya' | 'mom' | 'dad' | 'sister' | (string & {});


export * from './types/sticker.types';
import type { Sticker } from './types/sticker.types';

export interface PollOption {
  id: string;
  text: string;
}

export interface Poll {
  question: string;
  options: PollOption[];
  /** optionId -> list of users who voted for it */
  votes: Record<string, UserId[]>;
  multiple?: boolean;
  anonymous?: boolean;
  closed?: boolean;
  quiz?: boolean;
  correctOptionId?: string;
  explanation?: string;
}

export interface Message {
  id: string;
  roomId: string;
  sender: UserId;
  text: string;
  timestamp: number;
  reactions?: Record<string, UserId[]>;
  replyToId?: string;
  forwardedFrom?: {
    sender: UserId;
    senderName: string;
    originalMessageId?: string;
  };
  isEdited?: boolean;
  pending?: boolean; // Optimistic local message not yet confirmed by server
  readBy?: UserId[]; // Users who have read this message (excludes sender)
  sticker?: Sticker;
  poll?: Poll;
  file?: {
    name: string;
    type: 'image' | 'audio' | 'video' | 'video_note' | 'file' | 'sticker';
    data: string; // Base64 representation or URL
    size: number;
    uploadProgress?: number;
    isUploading?: boolean;
    rawBlob?: Blob | File;
    width?: number;
    height?: number;
    orientation?: 'vertical' | 'horizontal' | 'square';
    stickerData?: Sticker;
    waveform?: number[]; // Normalized audio amplitude bars (0-100)
    duration?: number; // Duration in seconds
  };
  /** Client-generated id used for idempotent re-delivery from the offline queue. */
  clientId?: string;
  /** Message is waiting in the IndexedDB offline queue (shown as «ожидание 🕒»). */
  queued?: boolean;
  /** Delivered without a notification sound ("Отправить без звука"). */
  silent?: boolean;
  /** Scheduled delivery time (ms epoch) for "Отправить позже". */
  scheduledAt?: number;
  /** Shared id of an album (2–10 media sent together) rendered as a bento collage. */
  albumId?: string;
  /** E2EE envelope — the server only ever sees this ciphertext, `text` stays empty. */
  encrypted?: EncryptedPayload;
  /** Self-destruct timer in seconds for secret chats. */
  ttl?: SecretChatTtl;
  /** Absolute expiry time (ms epoch) computed from `ttl` once the message is sent. */
  expiresAt?: number;
  /** System event in a group/channel ("X добавил Y", "Название изменено…"), rendered as a centered pill. */
  service?: ServiceEvent;
  /** Author signature under a channel post (when "Подписывать сообщения" is on). */
  signature?: string;
  /** Channel post view counter. */
  views?: number;
}

export type ServiceEventType =
  | 'created'
  | 'added'
  | 'removed'
  | 'left'
  | 'joined'
  | 'title'
  | 'photo'
  | 'photo_removed'
  | 'pinned';

export interface ServiceEvent {
  type: ServiceEventType;
  targets?: UserId[];
  text?: string;
  messageId?: string;
}

/** Allowed self-destruct timers for secret chats (seconds). */
export type SecretChatTtl = 10 | 60 | 3600 | 86400;

/** AES-GCM 256 ciphertext envelope produced by `src/lib/e2ee.ts`. */
export interface EncryptedPayload {
  /** Algorithm marker for forward compatibility. */
  alg: 'ECDH-P256+AES-GCM-256';
  /** Base64 12-byte IV. */
  iv: string;
  /** Base64 ciphertext (includes the GCM auth tag). */
  ct: string;
  /** Sender's public key fingerprint (first 16 hex chars of SHA-256 over raw key). */
  kid: string;
}

/** A single active login session as returned by `GET /api/auth/sessions`. */
export interface AuthSessionInfo {
  id: string;
  os: string;
  browser: string;
  ip: string;
  createdAt: number;
  lastActiveAt: number;
  current: boolean;
}

export interface CallSession {
  roomId: string;
  caller: UserId;
  receiver: UserId;
  type: 'audio' | 'video';
  status: 'idle' | 'calling' | 'incoming' | 'active';
}

export interface User {
  id: UserId;
  name: string;
  avatarColor: string;
}

export interface UserProfile {
  userId: UserId;
  firstName: string;
  lastName?: string;
  bio?: string;
  username?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  statusEmoji?: string;
  /** Palette id from `PROFILE_COLORS` (constants). */
  profileColor?: string;
  /** `MM-DD` or `YYYY-MM-DD`; only visible to contacts. */
  birthday?: string;
}

export interface UserSearchResult {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  isOnline?: boolean;
}

export type RoomType = 'direct' | 'group' | 'channel';

/** Rights an admin can hold (Telegram "Права администратора"). */
export type AdminRight =
  | 'changeInfo'
  | 'postMessages'
  | 'editMessages'
  | 'deleteMessages'
  | 'banUsers'
  | 'inviteUsers'
  | 'pinMessages'
  | 'addAdmins';
export type AdminRights = Record<AdminRight, boolean>;

/** What regular group members may do (Telegram "Разрешения"). */
export type MemberPermission = 'sendMessages' | 'sendMedia' | 'sendPolls' | 'addMembers' | 'pinMessages' | 'changeInfo';
export type GroupPermissions = Record<MemberPermission, boolean>;

export interface RoomAdmin {
  rights: AdminRights;
  /** Custom title shown instead of «админ». */
  title?: string;
  promotedBy?: UserId;
  since?: number;
}

export interface InviteLink {
  code: string;
  title?: string;
  createdBy: UserId;
  createdAt: number;
  expiresAt?: number;
  usageLimit?: number;
  uses: number;
  revoked?: boolean;
  /** The main link of the chat (re-issued when revoked). */
  primary?: boolean;
  /** Not revoked, not expired and under its usage limit. */
  active?: boolean;
}

/** Public card of a group/channel (invite link / @username preview, search). */
export interface RoomPreview {
  id: string;
  name: string;
  type: 'group' | 'channel';
  avatarUrl?: string;
  description?: string;
  username?: string;
  memberCount: number;
  isMember: boolean;
}

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  participants: UserId[];
  avatarUrl?: string;
  description?: string;
  /** End-to-end encrypted secret chat (`secret-…` id, ciphertext only on the server). */
  secret?: boolean;
  // --- groups & channels ---
  ownerId?: UserId;
  admins?: Record<UserId, RoomAdmin>;
  permissions?: GroupPermissions;
  /** Seconds between messages for regular members (0 = off). */
  slowMode?: number;
  /** Public @username; absent = private chat. */
  username?: string;
  /** Channels: sign posts with the author's name. */
  signMessages?: boolean;
  /** Only present for people allowed to invite. */
  inviteLinks?: InviteLink[];
  /** Only present for people allowed to ban. */
  banned?: UserId[];
  /** Pinned for everyone, oldest → newest. */
  pinnedIds?: string[];
  /** Total members/subscribers (channel subscriber lists are only sent to admins). */
  memberCount?: number;
  createdAt?: number;
}

export type ConnectionStatus = Record<UserId, boolean>;

/** Delivery status of a message, used for the read-receipt checkmarks. */
export type DeliveryStatus = 'queued' | 'pending' | 'sent' | 'read';
