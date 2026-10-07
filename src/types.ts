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
}

export interface UserSearchResult {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  isOnline?: boolean;
}

export interface Room {
  id: string;
  name: string;
  type: 'direct' | 'group';
  participants: UserId[];
  avatarUrl?: string;
  description?: string;
  /** End-to-end encrypted secret chat (`secret-…` id, ciphertext only on the server). */
  secret?: boolean;
}

export type ConnectionStatus = Record<UserId, boolean>;

/** Delivery status of a message, used for the read-receipt checkmarks. */
export type DeliveryStatus = 'queued' | 'pending' | 'sent' | 'read';
