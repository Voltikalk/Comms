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
}

export type ConnectionStatus = Record<UserId, boolean>;

/** Delivery status of a message, used for the read-receipt checkmarks. */
export type DeliveryStatus = 'pending' | 'sent' | 'read';
