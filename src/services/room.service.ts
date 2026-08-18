import { supabase } from '../lib/supabase/client';
import { dbCache } from '../lib/supabase/cache';
import { SUPABASE_CONFIG } from '../lib/supabase/config';
import type { Room, RoomMember, RoomType, UserRole, User } from '../lib/supabase/types';

export interface RoomWithMembers extends Room {
  members?: (RoomMember & { profile?: Partial<User> })[];
  memberCount?: number;
}

export interface UpdateRoomDTO {
  name?: string;
  description?: string | null;
  avatar_url?: string | null;
  is_active?: boolean;
}

export const RoomService = {
  /**
   * 1. Create a new room and add creator as admin (+ optional initial members)
   */
  async createRoom(
    name: string,
    type: RoomType = 'direct',
    description?: string,
    avatarUrl?: string,
    creatorId?: string,
    initialMemberIds: string[] = []
  ): Promise<Room> {
    try {
      // Resolve current user if not provided
      let authorId = creatorId;
      if (!authorId) {
        const { data: { session } } = await supabase.auth.getSession();
        authorId = session?.user?.id;
      }

      if (!authorId) {
        throw new Error('Необходима авторизация для создания комнаты.');
      }

      const { data: newRoom, error: roomError } = await supabase
        .from('rooms')
        .insert({
          name: name.trim(),
          type,
          description: description || null,
          avatar_url: avatarUrl || null,
          created_by: authorId,
        })
        .select()
        .single();

      if (roomError || !newRoom) {
        console.error('[RoomService.createRoom] Room insert error:', roomError);
        throw roomError;
      }

      // Add creator as Admin
      const membersToInsert = [
        { room_id: newRoom.id, user_id: authorId, role: 'admin' as UserRole },
        ...initialMemberIds
          .filter((id) => id !== authorId)
          .map((id) => ({ room_id: newRoom.id, user_id: id, role: 'member' as UserRole })),
      ];

      const { error: membersError } = await supabase
        .from('room_members')
        .insert(membersToInsert);

      if (membersError) {
        console.warn('[RoomService.createRoom] Members insert warning:', membersError);
      }

      // Invalidate cache
      [authorId, ...initialMemberIds].forEach((uid) => {
        dbCache.invalidate(`rooms:user:${uid}`);
      });

      return newRoom;
    } catch (err: any) {
      console.error('[RoomService.createRoom] Failed:', err);
      throw err;
    }
  },

  /**
   * 2. Get all active rooms for a user
   */
  async getRooms(userId: string): Promise<Room[]> {
    const cacheKey = `rooms:user:${userId}`;
    return dbCache.getOrFetch(
      cacheKey,
      async () => {
        const { data: userMemberships, error: memberErr } = await supabase
          .from('room_members')
          .select('room_id')
          .eq('user_id', userId)
          .is('left_at', null);

        if (memberErr || !userMemberships?.length) {
          return [];
        }

        const roomIds = userMemberships.map((m) => m.room_id);

        const { data: rooms, error: roomErr } = await supabase
          .from('rooms')
          .select('*')
          .in('id', roomIds)
          .eq('is_active', true)
          .order('updated_at', { ascending: false });

        if (roomErr) {
          console.error('[RoomService.getRooms] Query error:', roomErr);
          return [];
        }

        return rooms || [];
      },
      SUPABASE_CONFIG.cache.roomListTTL
    );
  },

  /**
   * 3. Get room by ID with all participants
   */
  async getRoomById(roomId: string): Promise<RoomWithMembers | null> {
    try {
      const { data: room, error: roomErr } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .eq('is_active', true)
        .single();

      if (roomErr || !room) {
        return null;
      }

      const { data: members } = await supabase
        .from('room_members')
        .select('*, users:user_id(id, username, display_name, avatar_url, last_login)')
        .eq('room_id', roomId)
        .is('left_at', null);

      return {
        ...room,
        members: (members as any) || [],
        memberCount: members?.length || 0,
      };
    } catch (err) {
      console.error('[RoomService.getRoomById] Error:', err);
      return null;
    }
  },

  /**
   * 4. Update room details
   */
  async updateRoom(roomId: string, data: UpdateRoomDTO): Promise<Room | null> {
    try {
      const { data: updated, error } = await supabase
        .from('rooms')
        .update(data)
        .eq('id', roomId)
        .select()
        .single();

      if (error) {
        console.error('[RoomService.updateRoom] Error:', error);
        throw error;
      }

      dbCache.invalidatePrefix('rooms:user:');
      return updated;
    } catch (err: any) {
      console.error('[RoomService.updateRoom] Failed:', err);
      throw err;
    }
  },

  /**
   * 5. Delete room (Soft delete)
   */
  async deleteRoom(roomId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ is_active: false })
        .eq('id', roomId);

      if (error) {
        console.error('[RoomService.deleteRoom] Error:', error);
        return false;
      }

      dbCache.invalidatePrefix('rooms:user:');
      return true;
    } catch (err) {
      console.error('[RoomService.deleteRoom] Failed:', err);
      return false;
    }
  },

  /**
   * 6. Add a member to a room
   */
  async addMemberToRoom(roomId: string, userId: string, role: UserRole = 'member'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('room_members')
        .upsert(
          { room_id: roomId, user_id: userId, role, left_at: null },
          { onConflict: 'room_id, user_id' }
        );

      if (error) {
        console.error('[RoomService.addMemberToRoom] Error:', error);
        return false;
      }

      dbCache.invalidate(`rooms:user:${userId}`);
      return true;
    } catch (err) {
      console.error('[RoomService.addMemberToRoom] Failed:', err);
      return false;
    }
  },

  /**
   * 7. Remove member from room / leave room
   */
  async removeMemberFromRoom(roomId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('room_members')
        .update({ left_at: new Date().toISOString() })
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (error) {
        console.error('[RoomService.removeMemberFromRoom] Error:', error);
        return false;
      }

      dbCache.invalidate(`rooms:user:${userId}`);
      return true;
    } catch (err) {
      console.error('[RoomService.removeMemberFromRoom] Failed:', err);
      return false;
    }
  },

  /**
   * 8. Get all active members in room
   */
  async getRoomMembers(roomId: string): Promise<RoomMember[]> {
    try {
      const { data, error } = await supabase
        .from('room_members')
        .select('*')
        .eq('room_id', roomId)
        .is('left_at', null);

      if (error) {
        console.error('[RoomService.getRoomMembers] Error:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      return [];
    }
  },

  /**
   * 9. Get role of specific member in room
   */
  async getRoomMemberRole(roomId: string, userId: string): Promise<UserRole | null> {
    try {
      const { data, error } = await supabase
        .from('room_members')
        .select('role')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .is('left_at', null)
        .maybeSingle();

      if (error || !data) {
        return null;
      }
      return data.role;
    } catch (err) {
      return null;
    }
  },
};

export default RoomService;
