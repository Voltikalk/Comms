import { createClient, type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';

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
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      rooms: {
        Row: {
          id: string;
          name: string;
          type: 'direct' | 'group';
          created_by: string | null;
          is_active: boolean;
          description: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['rooms']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['rooms']['Insert']>;
      };
      room_members: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          role: 'admin' | 'moderator' | 'member';
          joined_at: string;
          left_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['room_members']['Row'], 'id' | 'joined_at'> & {
          id?: string;
          joined_at?: string;
        };
        Update: Partial<Database['public']['Tables']['room_members']['Insert']>;
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
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
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
        Insert: Omit<Database['public']['Tables']['message_attachments']['Row'], 'id' | 'uploaded_at'> & {
          id?: string;
          uploaded_at?: string;
        };
        Update: Partial<Database['public']['Tables']['message_attachments']['Insert']>;
      };
      message_reactions: {
        Row: {
          id: string;
          message_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['message_reactions']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['message_reactions']['Insert']>;
      };
      message_read_receipts: {
        Row: {
          id: string;
          message_id: string;
          user_id: string;
          read_at: string;
        };
        Insert: Omit<Database['public']['Tables']['message_read_receipts']['Row'], 'id' | 'read_at'> & {
          id?: string;
          read_at?: string;
        };
        Update: Partial<Database['public']['Tables']['message_read_receipts']['Insert']>;
      };
    };
  };
}

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://comms-messenger.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon-placeholder-key';

/**
 * Singleton Supabase client instance
 */
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 20,
      },
    },
  }
);

/**
 * Real-time Subscription Helper: Listen for new messages in a specific room
 */
export function subscribeToRoomMessages(
  roomId: string,
  onNewMessage: (message: Database['public']['Tables']['messages']['Row']) => void,
  onMessageUpdate?: (message: Database['public']['Tables']['messages']['Row']) => void
): RealtimeChannel {
  return supabase
    .channel(`room-messages:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        onNewMessage(payload.new as Database['public']['Tables']['messages']['Row']);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        if (onMessageUpdate) {
          onMessageUpdate(payload.new as Database['public']['Tables']['messages']['Row']);
        }
      }
    )
    .subscribe();
}

/**
 * Real-time Subscription Helper: Listen for live reactions in a room
 */
export function subscribeToReactions(
  onReactionChange: (reaction: Database['public']['Tables']['message_reactions']['Row']) => void
): RealtimeChannel {
  return supabase
    .channel('room-reactions')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'message_reactions',
      },
      (payload) => {
        onReactionChange((payload.new || payload.old) as Database['public']['Tables']['message_reactions']['Row']);
      }
    )
    .subscribe();
}

export default supabase;
