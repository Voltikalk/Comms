import { supabase } from '../lib/supabase/client';
import { dbCache } from '../lib/supabase/cache';
import type { EnrichedMessage, MessageAttachment, MessageReaction } from '../lib/supabase/types';

export interface HistoryOptions {
  limit?: number;
  offset?: number;
  startFrom?: string | number; // timestamp ISO or message ID
  direction?: 'before' | 'after';
  includeDeleted?: boolean;
  filterType?: 'all' | 'media' | 'docs' | 'voice' | 'calls';
}

export interface HistoryResponse {
  messages: EnrichedMessage[];
  hasMore: boolean;
  total: number;
  oldestMessageTimestamp?: string;
  newestMessageTimestamp?: string;
}

export const MessageHistoryService = {
  /**
   * 1. Retrieve paginated message history (cursor-based or offset)
   */
  async getMessageHistory(
    roomId: string,
    options: HistoryOptions = {}
  ): Promise<HistoryResponse> {
    const {
      limit = 30,
      offset = 0,
      startFrom,
      direction = 'before',
      includeDeleted = false,
      filterType = 'all',
    } = options;

    const cacheKey = `history:${roomId}:${JSON.stringify(options)}`;

    return dbCache.getOrFetch(
      cacheKey,
      async () => {
        try {
          let query = supabase
            .from('messages')
            .select('*, sender:sender_id(id, username, display_name, avatar_url)', { count: 'exact' })
            .eq('room_id', roomId);

          if (!includeDeleted) {
            query = query.is('deleted_at', null);
          }

          // Cursor based direction
          if (startFrom) {
            let cursorDate = typeof startFrom === 'number' ? new Date(startFrom).toISOString() : startFrom;
            if (direction === 'before') {
              query = query.lt('created_at', cursorDate);
            } else {
              query = query.gt('created_at', cursorDate);
            }
          }

          // Sort order
          query = query
            .order('created_at', { ascending: direction === 'after' })
            .range(offset, offset + limit - 1);

          const { data: rawMessages, error, count } = await query;

          if (error || !rawMessages) {
            console.error('[MessageHistoryService.getMessageHistory] Query error:', error);
            return { messages: [], hasMore: false, total: 0 };
          }

          const msgIds = rawMessages.map((m) => m.id);

          // Parallel fetch of attachments and reactions
          const [attRes, reactRes] = await Promise.all([
            msgIds.length > 0
              ? supabase.from('message_attachments').select('*').in('message_id', msgIds)
              : { data: [] },
            msgIds.length > 0
              ? supabase.from('message_reactions').select('*').in('message_id', msgIds)
              : { data: [] },
          ]);

          const attachments: MessageAttachment[] = attRes.data || [];
          const reactions: MessageReaction[] = reactRes.data || [];

          let enriched: EnrichedMessage[] = rawMessages.map((m: any) => ({
            ...m,
            sender: m.sender || undefined,
            attachments: attachments.filter((a) => a.message_id === m.id),
            reactions: reactions.filter((r) => r.message_id === m.id),
          }));

          // Type filtering
          if (filterType === 'media') {
            enriched = enriched.filter((m) =>
              m.attachments?.some((a) => a.file_type?.startsWith('image/') || a.file_type?.startsWith('video/'))
            );
          } else if (filterType === 'docs') {
            enriched = enriched.filter((m) =>
              m.attachments?.some((a) => !a.file_type?.startsWith('image/') && !a.file_type?.startsWith('audio/'))
            );
          } else if (filterType === 'voice') {
            enriched = enriched.filter((m) =>
              m.attachments?.some((a) => a.file_type?.startsWith('audio/'))
            );
          }

          // Sort chronologically (oldest to newest for chat rendering)
          enriched.sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );

          const total = count || enriched.length;
          const hasMore = offset + limit < total;

          return {
            messages: enriched,
            hasMore,
            total,
            oldestMessageTimestamp: enriched[0]?.created_at,
            newestMessageTimestamp: enriched[enriched.length - 1]?.created_at,
          };
        } catch (err) {
          console.error('[MessageHistoryService.getMessageHistory] Error:', err);
          return { messages: [], hasMore: false, total: 0 };
        }
      },
      10000 // 10s TTL
    );
  },

  /**
   * 2. Get messages within a date range (for exports or archival)
   */
  async getMessagesByDateRange(
    roomId: string,
    startDate: string | Date,
    endDate: string | Date
  ): Promise<EnrichedMessage[]> {
    const { data: rawMessages, error } = await supabase
      .from('messages')
      .select('*, sender:sender_id(id, username, display_name, avatar_url)')
      .eq('room_id', roomId)
      .gte('created_at', new Date(startDate).toISOString())
      .lte('created_at', new Date(endDate).toISOString())
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error || !rawMessages) return [];

    const msgIds = rawMessages.map((m) => m.id);
    const { data: attachments } = await supabase
      .from('message_attachments')
      .select('*')
      .in('message_id', msgIds);

    return rawMessages.map((m: any) => ({
      ...m,
      sender: m.sender || undefined,
      attachments: (attachments || []).filter((a) => a.message_id === m.id),
      reactions: [],
    }));
  },

  /**
   * 3. Get all unread messages for a user in a room
   */
  async getUnreadMessages(
    roomId: string,
    userId: string
  ): Promise<{ messages: EnrichedMessage[]; unreadCount: number }> {
    try {
      // Find read message IDs for this user
      const { data: receipts } = await supabase
        .from('message_read_receipts')
        .select('message_id')
        .eq('user_id', userId);

      const readIds = new Set(receipts?.map((r) => r.message_id) || []);

      const { data: messages } = await supabase
        .from('messages')
        .select('*, sender:sender_id(id, username, display_name, avatar_url)')
        .eq('room_id', roomId)
        .neq('sender_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      const unread = (messages || [])
        .filter((m) => !readIds.has(m.id))
        .map((m: any) => ({
          ...m,
          sender: m.sender || undefined,
          attachments: [],
          reactions: [],
        }));

      return {
        messages: unread,
        unreadCount: unread.length,
      };
    } catch (err) {
      console.error('[MessageHistoryService.getUnreadMessages] Error:', err);
      return { messages: [], unreadCount: 0 };
    }
  },

  /**
   * 4. Get message context (N messages before and after a specific messageId)
   */
  async getMessageContext(
    messageId: string,
    contextCount = 5
  ): Promise<{ targetMessage?: EnrichedMessage; messages: EnrichedMessage[] }> {
    try {
      // 1. Get target message
      const { data: target } = await supabase
        .from('messages')
        .select('*, sender:sender_id(id, username, display_name, avatar_url)')
        .eq('id', messageId)
        .single();

      if (!target) return { messages: [] };

      const roomId = target.room_id;
      const targetTime = target.created_at;

      // 2. Fetch messages before and after
      const [beforeRes, afterRes] = await Promise.all([
        supabase
          .from('messages')
          .select('*, sender:sender_id(id, username, display_name, avatar_url)')
          .eq('room_id', roomId)
          .lt('created_at', targetTime)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(contextCount),
        supabase
          .from('messages')
          .select('*, sender:sender_id(id, username, display_name, avatar_url)')
          .eq('room_id', roomId)
          .gt('created_at', targetTime)
          .is('deleted_at', null)
          .order('created_at', { ascending: true })
          .limit(contextCount),
      ]);

      const beforeMessages = (beforeRes.data || []).reverse();
      const afterMessages = afterRes.data || [];

      const all = [...beforeMessages, target, ...afterMessages].map((m: any) => ({
        ...m,
        sender: m.sender || undefined,
        attachments: [],
        reactions: [],
      }));

      return {
        targetMessage: target as any,
        messages: all,
      };
    } catch (err) {
      console.error('[MessageHistoryService.getMessageContext] Error:', err);
      return { messages: [] };
    }
  },

  /**
   * 5. Export chat history to JSON or CSV
   */
  async exportHistory(roomId: string, format: 'json' | 'csv' = 'json'): Promise<string> {
    const history = await MessageHistoryService.getMessageHistory(roomId, { limit: 1000 });
    const msgs = history.messages;

    if (format === 'json') {
      return JSON.stringify(msgs, null, 2);
    }

    // CSV format
    const header = 'id,created_at,sender,content,attachments_count\n';
    const rows = msgs
      .map((m) => {
        const senderName = m.sender?.display_name || m.sender?.username || m.sender_id;
        const cleanContent = `"${(m.content || '').replace(/"/g, '""')}"`;
        return `${m.id},${m.created_at},"${senderName}",${cleanContent},${m.attachments?.length || 0}`;
      })
      .join('\n');

    return header + rows;
  },

  /**
   * 6. Scroll position persistence in LocalStorage
   */
  saveScrollPosition(roomId: string, scrollOffset: number, lastMessageId?: string): void {
    try {
      localStorage.setItem(
        `comms_scroll_pos_${roomId}`,
        JSON.stringify({ scrollOffset, lastMessageId, savedAt: Date.now() })
      );
    } catch {}
  },

  getSavedScrollPosition(roomId: string): { scrollOffset: number; lastMessageId?: string } | null {
    try {
      const data = localStorage.getItem(`comms_scroll_pos_${roomId}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
};

export default MessageHistoryService;
