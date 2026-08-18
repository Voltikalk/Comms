import type { RealtimeChannel } from '@supabase/supabase-js';

export type { RealtimeChannel };

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'admin' | 'moderator' | 'member';
export type RoomType = 'direct' | 'group';
export type AttachmentType = 'image' | 'audio' | 'video' | 'video_note' | 'file';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          username: string;
          password_hash: string;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          is_active: boolean;
          last_login: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          username: string;
          password_hash: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          is_active?: boolean;
          last_login?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string;
          password_hash?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          is_active?: boolean;
          last_login?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          access_token: string;
          refresh_token: string;
          token_type: string;
          expires_at: string;
          created_at: string;
          user_agent: string | null;
          ip_address: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          access_token: string;
          refresh_token: string;
          token_type?: string;
          expires_at: string;
          created_at?: string;
          user_agent?: string | null;
          ip_address?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          access_token?: string;
          refresh_token?: string;
          token_type?: string;
          expires_at?: string;
          created_at?: string;
          user_agent?: string | null;
          ip_address?: string | null;
        };
        Relationships: [];
      };
      rooms: {
        Row: {
          id: string;
          name: string;
          type: RoomType;
          created_by: string | null;
          is_active: boolean;
          description: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: RoomType;
          created_by?: string | null;
          is_active?: boolean;
          description?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: RoomType;
          created_by?: string | null;
          is_active?: boolean;
          description?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      room_members: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          role: UserRole;
          joined_at: string;
          left_at: string | null;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          role?: UserRole;
          joined_at?: string;
          left_at?: string | null;
        };
        Update: {
          id?: string;
          room_id?: string;
          user_id?: string;
          role?: UserRole;
          joined_at?: string;
          left_at?: string | null;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          room_id: string;
          sender_id: string;
          content: string;
          edited_at: string | null;
          deleted_at: string | null;
          created_at: string;
          reply_to_id: string | null;
        };
        Insert: {
          id?: string;
          room_id: string;
          sender_id: string;
          content: string;
          edited_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          reply_to_id?: string | null;
        };
        Update: {
          id?: string;
          room_id?: string;
          sender_id?: string;
          content?: string;
          edited_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          reply_to_id?: string | null;
          search_vector?: string | null;
        };
        Relationships: [];
      };
      message_attachments: {
        Row: {
          id: string;
          message_id: string;
          file_url: string;
          file_name: string;
          file_type: string | null;
          file_size: number | null;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          file_url: string;
          file_name: string;
          file_type?: string | null;
          file_size?: number | null;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          file_url?: string;
          file_name?: string;
          file_type?: string | null;
          file_size?: number | null;
          uploaded_at?: string;
        };
        Relationships: [];
      };
      message_reactions: {
        Row: {
          id: string;
          message_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          user_id: string;
          emoji: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          user_id?: string;
          emoji?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      message_read_receipts: {
        Row: {
          id: string;
          message_id: string;
          user_id: string;
          read_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          user_id: string;
          read_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          user_id?: string;
          read_at?: string;
        };
        Relationships: [];
      };
      login_attempts: {
        Row: {
          id: string;
          email: string;
          success: boolean;
          ip_address: string | null;
          user_agent: string | null;
          attempted_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          success: boolean;
          ip_address?: string | null;
          user_agent?: string | null;
          attempted_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          success?: boolean;
          ip_address?: string | null;
          user_agent?: string | null;
          attempted_at?: string;
        };
        Relationships: [];
      };
      messages_archive: {
        Row: {
          id: string;
          room_id: string;
          sender_id: string;
          content: string;
          reply_to_id: string | null;
          search_vector: string | null;
          created_at: string;
          edited_at: string | null;
          deleted_at: string | null;
          archived_at: string;
        };
        Insert: {
          id: string;
          room_id: string;
          sender_id: string;
          content: string;
          reply_to_id?: string | null;
          search_vector?: string | null;
          created_at: string;
          edited_at?: string | null;
          deleted_at?: string | null;
          archived_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          sender_id?: string;
          content?: string;
          reply_to_id?: string | null;
          search_vector?: string | null;
          created_at?: string;
          edited_at?: string | null;
          deleted_at?: string | null;
          archived_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      search_messages: {
        Args: {
          query_text: string;
          target_room_id?: string | null;
          max_limit?: number;
          min_offset?: number;
        };
        Returns: {
          id: string;
          room_id: string;
          sender_id: string;
          content: string;
          created_at: string;
          edited_at: string | null;
          rank: number;
          headline: string;
        }[];
      };
      archive_old_messages: {
        Args: {
          days_to_keep?: number;
          target_room_id?: string | null;
        };
        Returns: {
          archived_count: number;
          cutoff_date: string;
        }[];
      };
      restore_archived_message: {
        Args: {
          target_msg_id: string;
        };
        Returns: boolean;
      };
      get_archive_stats: {
        Args: {
          target_room_id?: string | null;
        };
        Returns: {
          total_archived: number;
          oldest_message: string | null;
          newest_message: string | null;
          estimated_size_kb: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Convenient Model Aliases
export type User = Database['public']['Tables']['users']['Row'];
export type Session = Database['public']['Tables']['sessions']['Row'];
export type Room = Database['public']['Tables']['rooms']['Row'];
export type RoomMember = Database['public']['Tables']['room_members']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type MessageAttachment = Database['public']['Tables']['message_attachments']['Row'];
export type MessageReaction = Database['public']['Tables']['message_reactions']['Row'];
export type MessageReadReceipt = Database['public']['Tables']['message_read_receipts']['Row'];
export type LoginAttempt = Database['public']['Tables']['login_attempts']['Row'];

// Extended Message with attachments, sender profile, and reactions
export interface EnrichedMessage extends Message {
  sender?: Partial<User>;
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
  readBy?: string[];
  replyTo?: Partial<Message>;
}

// Pagination Options
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  nextCursor?: string;
}
