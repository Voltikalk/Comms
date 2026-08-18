import { supabase } from './client';
import { dbCache } from './cache';
import { SUPABASE_CONFIG } from './config';
import type { 
  User, 
  Room, 
  RoomMember, 
  Message, 
  EnrichedMessage, 
  PaginationParams, 
  PaginatedResult 
} from './types';

/* ==========================================================================
   1. USER QUERIES
   ========================================================================== */

export const userQueries = {
  /**
   * Get user profile by ID with caching
   */
  async getProfileById(userId: string): Promise<User | null> {
    const cacheKey = `user:${userId}`;
    return dbCache.getOrFetch(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          console.error(`[userQueries.getProfileById] Error:`, error);
          return null;
        }
        return data;
      },
      SUPABASE_CONFIG.cache.userProfileTTL
    );
  },

  /**
   * Update user profile & invalidate cache
   */
  async updateProfile(userId: string, updates: Partial<User>): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error(`[userQueries.updateProfile] Error:`, error);
      throw error;
    }

    dbCache.invalidate(`user:${userId}`);
    return data;
  },

  /**
   * Search active users by username or display name
   */
  async searchUsers(query: string, limit = 20): Promise<User[]> {
    if (!query.trim()) return [];
    const clean = query.trim().replace(/^@/, '');

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('is_active', true)
      .or(`username.ilike.%${clean}%,display_name.ilike.%${clean}%`)
      .limit(limit);

    if (error) {
      console.error(`[userQueries.searchUsers] Error:`, error);
      return [];
    }
    return data || [];
  },
};

/* ==========================================================================
   2. ROOM QUERIES
   ========================================================================== */

export const roomQueries = {
  /**
   * Fetch all rooms the user participates in
   */
  async getUserRooms(userId: string): Promise<Room[]> {
    const cacheKey = `rooms:user:${userId}`;
    return dbCache.getOrFetch(
      cacheKey,
      async () => {
        const { data: memberRooms, error: memberErr } = await supabase
          .from('room_members')
          .select('room_id')
          .eq('user_id', userId)
          .is('left_at', null);

        if (memberErr || !memberRooms?.length) {
          return [];
        }

        const roomIds = memberRooms.map((rm) => rm.room_id);
        const { data: rooms, error: roomErr } = await supabase
          .from('rooms')
          .select('*')
          .in('id', roomIds)
          .eq('is_active', true)
          .order('updated_at', { ascending: false });

        if (roomErr) {
          console.error(`[roomQueries.getUserRooms] Error:`, roomErr);
          return [];
        }
        return rooms || [];
      },
      SUPABASE_CONFIG.cache.roomListTTL
    );
  },

  /**
   * Create a new chat room and add initial creator member
   */
  async createRoom(
    name: string,
    type: 'direct' | 'group',
    creatorId: string,
    participantIds: string[] = []
  ): Promise<Room | null> {
    const { data: newRoom, error: createErr } = await supabase
      .from('rooms')
      .insert({
        name,
        type,
        created_by: creatorId,
      })
      .select()
      .single();

    if (createErr || !newRoom) {
      console.error(`[roomQueries.createRoom] Error:`, createErr);
      throw createErr;
    }

    // Add creator as admin
    const membersToInsert = [
      { room_id: newRoom.id, user_id: creatorId, role: 'admin' as const },
      ...participantIds
        .filter((id) => id !== creatorId)
        .map((id) => ({ room_id: newRoom.id, user_id: id, role: 'member' as const })),
    ];

    await supabase.from('room_members').insert(membersToInsert);

    // Invalidate room cache for all involved users
    [creatorId, ...participantIds].forEach((uid) => {
      dbCache.invalidate(`rooms:user:${uid}`);
    });

    return newRoom;
  },

  /**
   * Get all active members in a room
   */
  async getRoomMembers(roomId: string): Promise<RoomMember[]> {
    const { data, error } = await supabase
      .from('room_members')
      .select('*')
      .eq('room_id', roomId)
      .is('left_at', null);

    if (error) {
      console.error(`[roomQueries.getRoomMembers] Error:`, error);
      return [];
    }
    return data || [];
  },
};

/* ==========================================================================
   3. MESSAGE QUERIES
   ========================================================================== */

export const messageQueries = {
  /**
   * Fetch paginated messages with attachments & reactions for a room
   */
  async getRoomMessages(
    roomId: string,
    pagination: PaginationParams = { page: 1, pageSize: 40 }
  ): Promise<PaginatedResult<EnrichedMessage>> {
    const { page = 1, pageSize = 40 } = pagination;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: rawMessages, error, count } = await supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .eq('room_id', roomId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error || !rawMessages) {
      console.error(`[messageQueries.getRoomMessages] Error:`, error);
      return { data: [], count: 0, page, pageSize, hasMore: false };
    }

    const messageIds = rawMessages.map((m) => m.id);

    // Fetch reactions for fetched messages
    const { data: reactions } = await supabase
      .from('message_reactions')
      .select('*')
      .in('message_id', messageIds);

    // Fetch attachments for fetched messages
    const { data: attachments } = await supabase
      .from('message_attachments')
      .select('*')
      .in('message_id', messageIds);

    // Enrich messages
    const enrichedMessages: EnrichedMessage[] = rawMessages.map((msg) => ({
      ...msg,
      reactions: reactions?.filter((r) => r.message_id === msg.id) || [],
      attachments: attachments?.filter((a) => a.message_id === msg.id) || [],
    }));

    const totalCount = count || 0;
    const hasMore = to < totalCount - 1;

    return {
      data: enrichedMessages.reverse(), // Chronological order
      count: totalCount,
      page,
      pageSize,
      hasMore,
    };
  },

  /**
   * Send a new message
   */
  async sendMessage(
    roomId: string,
    senderId: string,
    content: string,
    replyToId?: string
  ): Promise<Message | null> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        room_id: roomId,
        sender_id: senderId,
        content,
        reply_to_id: replyToId || null,
      })
      .select()
      .single();

    if (error) {
      console.error(`[messageQueries.sendMessage] Error:`, error);
      throw error;
    }

    // Invalidate room cache & updated_at timestamp
    await supabase
      .from('rooms')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', roomId);

    dbCache.invalidatePrefix(`messages:room:${roomId}`);
    return data;
  },

  /**
   * Edit existing message
   */
  async editMessage(messageId: string, newContent: string): Promise<Message | null> {
    const { data, error } = await supabase
      .from('messages')
      .update({
        content: newContent,
        edited_at: new Date().toISOString(),
      })
      .eq('id', messageId)
      .select()
      .single();

    if (error) {
      console.error(`[messageQueries.editMessage] Error:`, error);
      throw error;
    }
    return data;
  },

  /**
   * Soft-delete message
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    const { error } = await supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId);

    if (error) {
      console.error(`[messageQueries.deleteMessage] Error:`, error);
      return false;
    }
    return true;
  },

  /**
   * Toggle emoji reaction on message
   */
  async toggleReaction(messageId: string, userId: string, emoji: string): Promise<boolean> {
    // Check if reaction already exists
    const { data: existing } = await supabase
      .from('message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji)
      .maybeSingle();

    if (existing) {
      // Remove reaction
      await supabase.from('message_reactions').delete().eq('id', existing.id);
      return false;
    } else {
      // Insert reaction
      await supabase.from('message_reactions').insert({
        message_id: messageId,
        user_id: userId,
        emoji,
      });
      return true;
    }
  },

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(messageIds: string[], userId: string): Promise<void> {
    if (!messageIds.length) return;
    const inserts = messageIds.map((msgId) => ({
      message_id: msgId,
      user_id: userId,
    }));
    await supabase.from('message_read_receipts').upsert(inserts, { ignoreDuplicates: true });
  },
};

export default {
  user: userQueries,
  room: roomQueries,
  message: messageQueries,
};
