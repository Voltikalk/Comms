import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';
import type { 
  Message, 
  RoomMember, 
  MessageReaction, 
  MessageReadReceipt 
} from '../lib/supabase/types';

export interface PresenceUser {
  userId: string;
  username: string;
  onlineAt: string;
  status: 'online' | 'offline' | 'away';
}

export type SubscriptionStatus = 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR' | 'CONNECTING';

export interface MessageSubscriptionCallbacks {
  onInsert?: (message: Message) => void;
  onUpdate?: (message: Message) => void;
  onDelete?: (deletedId: string) => void;
}

export interface MemberSubscriptionCallbacks {
  onJoin?: (member: RoomMember) => void;
  onLeave?: (member: RoomMember) => void;
  onUpdate?: (member: RoomMember) => void;
}

export interface ReactionSubscriptionCallbacks {
  onInsert?: (reaction: MessageReaction) => void;
  onDelete?: (reactionId: string) => void;
}

class RealtimeServiceManager {
  private channels: Map<string, RealtimeChannel> = new Map();

  /**
   * 1. Subscribe to all message events in a room (INSERT, UPDATE, DELETE)
   */
  subscribeToRoomMessages(
    roomId: string,
    callbacks: MessageSubscriptionCallbacks,
    onStatusChange?: (status: SubscriptionStatus) => void
  ): RealtimeChannel {
    const channelName = `room-messages:${roomId}`;

    // Remove existing channel if present
    this.unsubscribeChannel(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (callbacks.onInsert && payload.new) {
            callbacks.onInsert(payload.new as Message);
          }
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
          if (callbacks.onUpdate && payload.new) {
            callbacks.onUpdate(payload.new as Message);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (callbacks.onDelete && payload.old) {
            callbacks.onDelete((payload.old as { id: string }).id);
          }
        }
      )
      .subscribe((status) => {
        if (onStatusChange) {
          onStatusChange(status as SubscriptionStatus);
        }
      });

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * 2. Subscribe to updates on a specific message
   */
  subscribeToMessageUpdates(
    messageId: string,
    onUpdate: (message: Message) => void
  ): RealtimeChannel {
    const channelName = `message-update:${messageId}`;
    this.unsubscribeChannel(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `id=eq.${messageId}`,
        },
        (payload) => {
          if (payload.new) {
            onUpdate(payload.new as Message);
          }
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * 3. Subscribe to room members changes (joins, leaves, role updates)
   */
  subscribeToRoomMembers(
    roomId: string,
    callbacks: MemberSubscriptionCallbacks
  ): RealtimeChannel {
    const channelName = `room-members:${roomId}`;
    this.unsubscribeChannel(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_members',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (callbacks.onJoin && payload.new) {
            callbacks.onJoin(payload.new as RoomMember);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'room_members',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const member = payload.new as RoomMember;
          if (member.left_at && callbacks.onLeave) {
            callbacks.onLeave(member);
          } else if (callbacks.onUpdate) {
            callbacks.onUpdate(member);
          }
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * 4. Presence: Real-time user online/offline tracking
   */
  subscribeToPresence(
    roomId: string,
    currentUser: { userId: string; username: string },
    onPresenceChange: (users: PresenceUser[]) => void
  ): RealtimeChannel {
    const channelName = `presence:${roomId}`;
    this.unsubscribeChannel(channelName);

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: currentUser.userId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const activeUsers: PresenceUser[] = [];

        Object.keys(state).forEach((key) => {
          const presences = state[key] as any[];
          if (presences && presences.length > 0) {
            const latest = presences[presences.length - 1];
            activeUsers.push({
              userId: latest.userId || key,
              username: latest.username || 'User',
              onlineAt: latest.onlineAt || new Date().toISOString(),
              status: latest.status || 'online',
            });
          }
        });

        onPresenceChange(activeUsers);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('[Presence Join]', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('[Presence Leave]', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId: currentUser.userId,
            username: currentUser.username,
            onlineAt: new Date().toISOString(),
            status: 'online',
          });
        }
      });

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * 5. Real-time message reactions listener
   */
  subscribeToMessageReactions(
    messageId: string,
    callbacks: ReactionSubscriptionCallbacks
  ): RealtimeChannel {
    const channelName = `reactions:${messageId}`;
    this.unsubscribeChannel(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=eq.${messageId}`,
        },
        (payload) => {
          if (callbacks.onInsert && payload.new) {
            callbacks.onInsert(payload.new as MessageReaction);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=eq.${messageId}`,
        },
        (payload) => {
          if (callbacks.onDelete && payload.old) {
            callbacks.onDelete((payload.old as { id: string }).id);
          }
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * 6. Real-time read receipts listener
   */
  subscribeToReadReceipts(
    roomId: string,
    onRead: (receipt: MessageReadReceipt) => void
  ): RealtimeChannel {
    const channelName = `read-receipts:${roomId}`;
    this.unsubscribeChannel(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_read_receipts',
        },
        (payload) => {
          if (payload.new) {
            onRead(payload.new as MessageReadReceipt);
          }
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * 7. Unsubscribe from a single channel by name or instance
   */
  unsubscribeChannel(channelOrName: string | RealtimeChannel): void {
    if (typeof channelOrName === 'string') {
      const channel = this.channels.get(channelOrName);
      if (channel) {
        supabase.removeChannel(channel);
        this.channels.delete(channelOrName);
      }
    } else {
      supabase.removeChannel(channelOrName);
      for (const [key, val] of this.channels.entries()) {
        if (val === channelOrName) {
          this.channels.delete(key);
          break;
        }
      }
    }
  }

  /**
   * 8. Unsubscribe and clean up all channels
   */
  unsubscribeAll(): void {
    for (const [, channel] of this.channels.entries()) {
      supabase.removeChannel(channel);
    }
    this.channels.clear();
  }
}

export const RealtimeService = new RealtimeServiceManager();
export default RealtimeService;
