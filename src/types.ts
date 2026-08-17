export type UserId = 'vlad' | 'anya' | 'mom' | 'dad' | 'sister' | (string & {});


export interface Message {
  id: string;
  roomId: string;
  sender: UserId;
  text: string;
  timestamp: number;
  reactions?: Record<string, UserId[]>;
  replyToId?: string;
  isEdited?: boolean;
  pending?: boolean; // Optimistic local message not yet confirmed by server
  readBy?: UserId[]; // Users who have read this message (excludes sender)
  file?: {
    name: string;
    type: 'image' | 'audio' | 'video' | 'video_note' | 'file';
    data: string; // Base64 representation or URL
    size: number;
    uploadProgress?: number;
    isUploading?: boolean;
    rawBlob?: Blob | File;
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

export interface Room {
  id: string;
  name: string;
  type: 'direct' | 'group';
  participants: UserId[];
}

export type ConnectionStatus = Record<UserId, boolean>;

/** Delivery status of a message, used for the read-receipt checkmarks. */
export type DeliveryStatus = 'pending' | 'sent' | 'read';
