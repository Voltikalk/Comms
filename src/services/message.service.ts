import { supabase } from '../lib/supabase/client';
import { dbCache } from '../lib/supabase/cache';
import type { 
  Message, 
  EnrichedMessage, 
  MessageAttachment 
} from '../lib/supabase/types';

export interface SendMessageDTO {
  roomId: string;
  content: string;
  senderId?: string;
  replyToId?: string;
  attachments?: {
    fileUrl: string;
    fileName: string;
    fileType?: string;
    fileSize?: number;
  }[];
}

export const MessageService = {
  /**
   * 1. Send a new message with optional attachments & reply-to link
   */
  async sendMessage(dto: SendMessageDTO): Promise<EnrichedMessage> {
    const { roomId, content, replyToId, attachments } = dto;

    let sender = dto.senderId;
    if (!sender) {
      const { data: { session } } = await supabase.auth.getSession();
      sender = session?.user?.id;
    }

    if (!sender) {
      throw new Error('Необходима авторизация для отправки сообщения.');
    }

    // Insert Message
    const { data: msg, error: msgErr } = await supabase
      .from('messages')
      .insert({
        room_id: roomId,
        sender_id: sender,
        content: content.trim(),
        reply_to_id: replyToId || null,
      })
      .select()
      .single();

    if (msgErr || !msg) {
      console.error('[MessageService.sendMessage] Insert error:', msgErr);
      throw msgErr;
    }

    // Insert Attachments if provided
    let savedAttachments: MessageAttachment[] = [];
    if (attachments && attachments.length > 0) {
      const attachmentsToInsert = attachments.map((att) => ({
        message_id: msg.id,
        file_url: att.fileUrl,
        file_name: att.fileName,
        file_type: att.fileType || null,
        file_size: att.fileSize || null,
      }));

      const { data: attData, error: attErr } = await supabase
        .from('message_attachments')
        .insert(attachmentsToInsert)
        .select();

      if (!attErr && attData) {
        savedAttachments = attData;
      }
    }

    // Update room's updated_at timestamp
    await supabase
      .from('rooms')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', roomId);

    dbCache.invalidatePrefix(`messages:room:${roomId}`);

    return {
      ...msg,
      attachments: savedAttachments,
      reactions: [],
    };
  },

  /**
   * 2. Get messages for a room with pagination, reactions, and attachments
   */
  async getMessages(
    roomId: string,
    limit = 50,
    offset = 0
  ): Promise<{ messages: EnrichedMessage[]; totalCount: number; hasMore: boolean }> {
    try {
      const from = offset;
      const to = offset + limit - 1;

      const { data: rawMessages, error, count } = await supabase
        .from('messages')
        .select('*', { count: 'exact' })
        .eq('room_id', roomId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error || !rawMessages) {
        console.error('[MessageService.getMessages] Query error:', error);
        return { messages: [], totalCount: 0, hasMore: false };
      }

      const messageIds = rawMessages.map((m) => m.id);

      // Fetch reactions & attachments in parallel
      const [reactionsRes, attachmentsRes] = await Promise.all([
        messageIds.length > 0
          ? supabase.from('message_reactions').select('*').in('message_id', messageIds)
          : { data: [] },
        messageIds.length > 0
          ? supabase.from('message_attachments').select('*').in('message_id', messageIds)
          : { data: [] },
      ]);

      const reactions = reactionsRes.data || [];
      const attachments = attachmentsRes.data || [];

      const enriched: EnrichedMessage[] = rawMessages.map((msg) => ({
        ...msg,
        reactions: reactions.filter((r) => r.message_id === msg.id),
        attachments: attachments.filter((a) => a.message_id === msg.id),
      }));

      const totalCount = count || 0;
      const hasMore = to < totalCount - 1;

      return {
        messages: enriched.reverse(), // Chronological order
        totalCount,
        hasMore,
      };
    } catch (err) {
      console.error('[MessageService.getMessages] Error:', err);
      return { messages: [], totalCount: 0, hasMore: false };
    }
  },

  /**
   * 3. Get single message with full details
   */
  async getMessageById(messageId: string): Promise<EnrichedMessage | null> {
    try {
      const { data: msg, error } = await supabase
        .from('messages')
        .select('*')
        .eq('id', messageId)
        .is('deleted_at', null)
        .maybeSingle();

      if (error || !msg) return null;

      const [reactionsRes, attachmentsRes] = await Promise.all([
        supabase.from('message_reactions').select('*').eq('message_id', messageId),
        supabase.from('message_attachments').select('*').eq('message_id', messageId),
      ]);

      return {
        ...msg,
        reactions: reactionsRes.data || [],
        attachments: attachmentsRes.data || [],
      };
    } catch (err) {
      console.error('[MessageService.getMessageById] Error:', err);
      return null;
    }
  },

  /**
   * 4. Edit message content
   */
  async editMessage(messageId: string, newContent: string): Promise<Message | null> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .update({
          content: newContent.trim(),
          edited_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .select()
        .single();

      if (error) {
        console.error('[MessageService.editMessage] Error:', error);
        throw error;
      }
      return data;
    } catch (err) {
      console.error('[MessageService.editMessage] Failed:', err);
      throw err;
    }
  },

  /**
   * 5. Delete message (Soft Delete)
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId);

      if (error) {
        console.error('[MessageService.deleteMessage] Error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[MessageService.deleteMessage] Failed:', err);
      return false;
    }
  },

  /**
   * 6. Search messages in a room
   */
  async searchMessages(roomId: string, query: string, limit = 30): Promise<EnrichedMessage[]> {
    if (!query.trim()) return [];

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .is('deleted_at', null)
        .ilike('content', `%${query.trim()}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error || !data) return [];
      return data.reverse();
    } catch (err) {
      return [];
    }
  },

  /**
   * 7. Get messages by specific user in a room
   */
  async getMessagesByUser(userId: string, roomId: string, limit = 50): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .eq('sender_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error || !data) return [];
      return data.reverse();
    } catch (err) {
      return [];
    }
  },
};

export default MessageService;
