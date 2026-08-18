import { supabase } from '../lib/supabase/client';
import { dbCache } from '../lib/supabase/cache';
import {
  sanitizeSearchQuery,
  extractContextSnippet,
  highlightTerms,
  checkSearchRateLimit,
} from '../lib/supabase/search-utils';
import type { Message, MessageAttachment, User } from '../lib/supabase/types';

export interface SearchFilters {
  startDate?: string | Date;
  endDate?: string | Date;
  senderId?: string;
  hasAttachments?: boolean;
  contentType?: 'image' | 'video' | 'audio' | 'document' | string;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface SearchResultItem extends Message {
  snippet: string;
  headline?: string;
  rank?: number;
  sender?: Partial<User>;
  attachments?: MessageAttachment[];
}

export interface SearchResponse {
  results: SearchResultItem[];
  total: number;
  hasMore: boolean;
}

export interface GlobalSearchResponse {
  groupedByRoom: Record<string, { roomName?: string; results: SearchResultItem[] }>;
  totalMatches: number;
}

// In-Memory Search History Cache (persisted per user)
const memorySearchHistory = new Map<string, string[]>();

export const MessageSearchService = {
  /**
   * 1. Search messages within a specific room with filters & pagination
   */
  async searchMessages(
    roomId: string,
    query: string,
    filters: SearchFilters = {},
    pagination: PaginationOptions = {},
    currentUserId = 'anonymous'
  ): Promise<SearchResponse> {
    // 1. Rate Limiting Check
    if (!checkSearchRateLimit(currentUserId, 10)) {
      throw new Error('Слишком много поисковых запросов. Пожалуйста, подождите секунду.');
    }

    const cleanQuery = sanitizeSearchQuery(query);
    if (!cleanQuery || cleanQuery.length < 2) {
      return { results: [], total: 0, hasMore: false };
    }

    const limit = Math.min(Math.max(pagination.limit || 20, 1), 100);
    const offset = Math.max(pagination.offset || 0, 0);

    const cacheKey = `search:${roomId}:${cleanQuery}:${JSON.stringify(filters)}:${limit}:${offset}`;

    return dbCache.getOrFetch(
      cacheKey,
      async () => {
        try {
          // Build query
          let queryBuilder = supabase
            .from('messages')
            .select('*, sender:sender_id(id, username, display_name, avatar_url)', { count: 'exact' })
            .eq('room_id', roomId)
            .is('deleted_at', null);

          // Apply fulltext search / ILIKE
          queryBuilder = queryBuilder.or(`search_vector.wfts.${cleanQuery},content.ilike.%${cleanQuery}%`);

          // Apply date filters
          if (filters.startDate) {
            const startIso = new Date(filters.startDate).toISOString();
            queryBuilder = queryBuilder.gte('created_at', startIso);
          }
          if (filters.endDate) {
            const endIso = new Date(filters.endDate).toISOString();
            queryBuilder = queryBuilder.lte('created_at', endIso);
          }

          // Apply sender filter
          if (filters.senderId) {
            queryBuilder = queryBuilder.eq('sender_id', filters.senderId);
          }

          // Apply ordering and pagination
          queryBuilder = queryBuilder
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

          const { data: rawMessages, error, count } = await queryBuilder;

          if (error || !rawMessages) {
            console.error('[MessageSearchService.searchMessages] Query error:', error);
            return { results: [], total: 0, hasMore: false };
          }

          const msgIds = rawMessages.map((m) => m.id);

          // Fetch attachments if needed
          let attachments: MessageAttachment[] = [];
          if (msgIds.length > 0) {
            const { data: attData } = await supabase
              .from('message_attachments')
              .select('*')
              .in('message_id', msgIds);
            attachments = attData || [];
          }

          let results: SearchResultItem[] = rawMessages.map((msg: any) => {
            const msgAttachments = attachments.filter((a) => a.message_id === msg.id);
            const snippet = extractContextSnippet(msg.content, cleanQuery, 50);
            const headline = highlightTerms(snippet, cleanQuery);

            return {
              ...msg,
              snippet,
              headline,
              sender: msg.sender || undefined,
              attachments: msgAttachments,
            };
          });

          // Filter by attachment type if specified
          if (filters.hasAttachments) {
            results = results.filter((r) => r.attachments && r.attachments.length > 0);
          }
          if (filters.contentType) {
            results = results.filter((r) =>
              r.attachments?.some((a) => a.file_type?.toLowerCase().includes(filters.contentType!.toLowerCase()))
            );
          }

          const total = count || results.length;
          const hasMore = offset + limit < total;

          // Save search query to history
          MessageSearchService.saveSearchHistory(currentUserId, cleanQuery);

          return {
            results,
            total,
            hasMore,
          };
        } catch (err: any) {
          console.error('[MessageSearchService.searchMessages] Exception:', err);
          return { results: [], total: 0, hasMore: false };
        }
      },
      15000 // 15 seconds search cache TTL
    );
  },

  /**
   * 2. Search across all rooms of a user (Global Search)
   */
  async searchGlobal(
    query: string,
    filters: SearchFilters = {},
    userId = 'anonymous'
  ): Promise<GlobalSearchResponse> {
    const cleanQuery = sanitizeSearchQuery(query);
    if (!cleanQuery || cleanQuery.length < 2) {
      return { groupedByRoom: {}, totalMatches: 0 };
    }

    try {
      // Find all rooms the user belongs to
      const { data: userMemberships } = await supabase
        .from('room_members')
        .select('room_id, rooms:room_id(name)')
        .eq('user_id', userId)
        .is('left_at', null);

      const roomIds = userMemberships?.map((m) => m.room_id) || [];
      if (roomIds.length === 0) {
        return { groupedByRoom: {}, totalMatches: 0 };
      }

      let queryBuilder = supabase
        .from('messages')
        .select('*, rooms:room_id(name), sender:sender_id(id, username, display_name, avatar_url)')
        .in('room_id', roomIds)
        .is('deleted_at', null)
        .or(`search_vector.wfts.${cleanQuery},content.ilike.%${cleanQuery}%`)
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters.startDate) {
        queryBuilder = queryBuilder.gte('created_at', new Date(filters.startDate).toISOString());
      }
      if (filters.endDate) {
        queryBuilder = queryBuilder.lte('created_at', new Date(filters.endDate).toISOString());
      }
      if (filters.senderId) {
        queryBuilder = queryBuilder.eq('sender_id', filters.senderId);
      }

      const { data: rawMessages, error } = await queryBuilder;

      if (error || !rawMessages) {
        return { groupedByRoom: {}, totalMatches: 0 };
      }

      const grouped: Record<string, { roomName?: string; results: SearchResultItem[] }> = {};
      let total = 0;

      rawMessages.forEach((msg: any) => {
        const rId = msg.room_id;
        const rName = msg.rooms?.name || 'Диалог';

        if (!grouped[rId]) {
          grouped[rId] = { roomName: rName, results: [] };
        }

        const snippet = extractContextSnippet(msg.content, cleanQuery, 50);
        grouped[rId].results.push({
          ...msg,
          snippet,
          headline: highlightTerms(snippet, cleanQuery),
          sender: msg.sender || undefined,
        });
        total += 1;
      });

      MessageSearchService.saveSearchHistory(userId, cleanQuery);

      return {
        groupedByRoom: grouped,
        totalMatches: total,
      };
    } catch (err) {
      console.error('[MessageSearchService.searchGlobal] Error:', err);
      return { groupedByRoom: {}, totalMatches: 0 };
    }
  },

  /**
   * 3. Search messages sent by a specific user
   */
  async searchByUser(userId: string, query: string, roomId?: string): Promise<SearchResultItem[]> {
    const cleanQuery = sanitizeSearchQuery(query);
    if (!cleanQuery) return [];

    let queryBuilder = supabase
      .from('messages')
      .select('*, sender:sender_id(id, username, display_name, avatar_url)')
      .eq('sender_id', userId)
      .is('deleted_at', null)
      .or(`search_vector.wfts.${cleanQuery},content.ilike.%${cleanQuery}%`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (roomId) {
      queryBuilder = queryBuilder.eq('room_id', roomId);
    }

    const { data, error } = await queryBuilder;
    if (error || !data) return [];

    return data.map((msg: any) => ({
      ...msg,
      snippet: extractContextSnippet(msg.content, cleanQuery, 50),
      headline: highlightTerms(extractContextSnippet(msg.content, cleanQuery, 50), cleanQuery),
      sender: msg.sender || undefined,
    }));
  },

  /**
   * 4. Retrieve messages in a date range (e.g. for archival)
   */
  async searchByDateRange(
    roomId: string,
    startDate: string | Date,
    endDate: string | Date,
    limit = 200
  ): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .gte('created_at', new Date(startDate).toISOString())
        .lte('created_at', new Date(endDate).toISOString())
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[MessageSearchService.searchByDateRange] Error:', err);
      return [];
    }
  },

  /**
   * 5. User Search History Management
   */
  saveSearchHistory(userId: string, query: string): void {
    if (!query.trim() || query.length < 2) return;
    const history = memorySearchHistory.get(userId) || [];
    const filtered = history.filter((q) => q.toLowerCase() !== query.toLowerCase());
    filtered.unshift(query);
    if (filtered.length > 20) filtered.pop();
    memorySearchHistory.set(userId, filtered);
  },

  getSearchHistory(userId: string, limit = 10): string[] {
    const list = memorySearchHistory.get(userId) || [];
    return list.slice(0, limit);
  },

  clearSearchHistory(userId: string): void {
    memorySearchHistory.delete(userId);
  },
};

export default MessageSearchService;
