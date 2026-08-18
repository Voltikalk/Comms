import { supabase } from '../lib/supabase/client';
import type { MessageReadReceipt } from '../lib/supabase/types';

export const ReadReceiptService = {
  /**
   * 1. Mark a message (or multiple messages) as read by the user
   */
  async markMessageAsRead(
    messageId: string | string[],
    userId: string
  ): Promise<boolean> {
    try {
      const ids = Array.isArray(messageId) ? messageId : [messageId];
      if (ids.length === 0) return true;

      const records = ids.map((id) => ({
        message_id: id,
        user_id: userId,
        read_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('message_read_receipts')
        .upsert(records, { onConflict: 'message_id, user_id' });

      if (error) {
        console.error('[ReadReceiptService.markMessageAsRead] Error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[ReadReceiptService.markMessageAsRead] Failed:', err);
      return false;
    }
  },

  /**
   * 2. Get list of user IDs who read a message
   */
  async getMessageReadBy(messageId: string): Promise<MessageReadReceipt[]> {
    try {
      const { data, error } = await supabase
        .from('message_read_receipts')
        .select('*')
        .eq('message_id', messageId)
        .order('read_at', { ascending: true });

      if (error) {
        return [];
      }
      return data || [];
    } catch (err) {
      return [];
    }
  },

  /**
   * 3. Get count of unread messages in a room for a user
   */
  async getUnreadCount(roomId: string, userId: string): Promise<number> {
    try {
      // Get all active message IDs in room not sent by this user
      const { data: messages, error: msgErr } = await supabase
        .from('messages')
        .select('id')
        .eq('room_id', roomId)
        .neq('sender_id', userId)
        .is('deleted_at', null);

      if (msgErr || !messages?.length) {
        return 0;
      }

      const allMsgIds = messages.map((m) => m.id);

      // Get read receipts for this user in this room
      const { data: receipts } = await supabase
        .from('message_read_receipts')
        .select('message_id')
        .eq('user_id', userId)
        .in('message_id', allMsgIds);

      const readIds = new Set(receipts?.map((r) => r.message_id) || []);
      const unreadCount = allMsgIds.filter((id) => !readIds.has(id)).length;

      return unreadCount;
    } catch (err) {
      console.error('[ReadReceiptService.getUnreadCount] Error:', err);
      return 0;
    }
  },
};

export default ReadReceiptService;
