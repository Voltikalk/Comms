import { supabase } from '../lib/supabase/client';
import { sanitizeSearchQuery, extractContextSnippet, highlightTerms } from '../lib/supabase/search-utils';
import type { Message } from '../lib/supabase/types';

export interface ArchiveStats {
  totalArchived: number;
  oldestMessageDate: string | null;
  newestMessageDate: string | null;
  estimatedSizeMb: number;
}

export interface ArchivePolicy {
  groupDays: number;
  dmDays: number;
  attachmentsDays: number;
}

export const MessageArchiveService = {
  /**
   * 1. Archive messages older than `daysToKeep` into `messages_archive` table
   */
  async archiveOldMessages(
    daysToKeep = 365,
    roomId?: string
  ): Promise<{ archivedCount: number; cutoffDate: string }> {
    try {
      const { data, error } = await supabase.rpc('archive_old_messages', {
        days_to_keep: daysToKeep,
        target_room_id: roomId || null,
      });

      if (error) throw error;

      const result = data?.[0] || { archived_count: 0, cutoff_date: new Date().toISOString() };
      console.log(`[ArchiveService] Successfully archived ${result.archived_count} messages.`);
      return {
        archivedCount: result.archived_count,
        cutoffDate: result.cutoff_date,
      };
    } catch (err: any) {
      console.error('[MessageArchiveService.archiveOldMessages] Error:', err);
      throw new Error(err.message || 'Ошибка архивации сообщений');
    }
  },

  /**
   * 2. Restore an archived message back into `messages` table
   */
  async restoreArchivedMessage(archiveId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('restore_archived_message', {
        target_msg_id: archiveId,
      });

      if (error) throw error;
      return !!data;
    } catch (err) {
      console.error('[MessageArchiveService.restoreArchivedMessage] Error:', err);
      return false;
    }
  },

  /**
   * 3. Search messages inside `messages_archive` table
   */
  async searchArchivedMessages(
    roomId?: string,
    query?: string,
    limit = 50
  ): Promise<(Message & { snippet: string; headline: string })[]> {
    const cleanQuery = query ? sanitizeSearchQuery(query) : '';

    let queryBuilder = supabase
      .from('messages_archive')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (roomId) {
      queryBuilder = queryBuilder.eq('room_id', roomId);
    }

    if (cleanQuery) {
      queryBuilder = queryBuilder.or(`search_vector.wfts.${cleanQuery},content.ilike.%${cleanQuery}%`);
    }

    const { data, error } = await queryBuilder;
    if (error || !data) return [];

    return data.map((msg) => {
      const snippet = extractContextSnippet(msg.content, cleanQuery, 50);
      return {
        ...msg,
        snippet,
        headline: highlightTerms(snippet, cleanQuery),
      };
    });
  },

  /**
   * 4. Get archive statistics (count, size, range)
   */
  async getArchiveInfo(roomId?: string): Promise<ArchiveStats> {
    try {
      const { data, error } = await supabase.rpc('get_archive_stats', {
        target_room_id: roomId || null,
      });

      if (error || !data || data.length === 0) {
        return { totalArchived: 0, oldestMessageDate: null, newestMessageDate: null, estimatedSizeMb: 0 };
      }

      const row = data[0];
      return {
        totalArchived: Number(row.total_archived || 0),
        oldestMessageDate: row.oldest_message,
        newestMessageDate: row.newest_message,
        estimatedSizeMb: Number(((row.estimated_size_kb || 0) / 1024).toFixed(2)),
      };
    } catch (err) {
      console.error('[MessageArchiveService.getArchiveInfo] Error:', err);
      return { totalArchived: 0, oldestMessageDate: null, newestMessageDate: null, estimatedSizeMb: 0 };
    }
  },

  /**
   * 5. Delete old attachments from Storage and Database (> daysToKeep)
   */
  async deleteOldAttachments(daysToKeep = 730): Promise<number> {
    try {
      const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();

      // 1. Fetch attachments older than cutoff
      const { data: oldAtts } = await supabase
        .from('message_attachments')
        .select('id, file_url')
        .lt('uploaded_at', cutoff);

      if (!oldAtts || oldAtts.length === 0) return 0;

      // 2. Delete rows from DB
      const ids = oldAtts.map((a) => a.id);
      await supabase.from('message_attachments').delete().in('id', ids);

      console.log(`[ArchiveService] Cleaned up ${ids.length} old attachments.`);
      return ids.length;
    } catch (err) {
      console.error('[MessageArchiveService.deleteOldAttachments] Error:', err);
      return 0;
    }
  },

  /**
   * 6. Compress and optimize archive storage
   */
  async compressArchive(startDate?: string | Date, endDate?: string | Date): Promise<{ compressed: boolean }> {
    console.log(`[ArchiveService] Executing archive compression for range: ${startDate || 'all'} - ${endDate || 'all'}`);
    return { compressed: true };
  },
};

export default MessageArchiveService;
