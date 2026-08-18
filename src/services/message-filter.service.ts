import { supabase } from '../lib/supabase/client';
import { dbCache } from '../lib/supabase/cache';
import {
  type FilterOptions,
  type MessageSortBy,
  type FilterPreset,
  type FilterValidationResult,
  applyFilters,
  sortMessages,
  buildFilterQuery,
  validateFilters,
  getCommonFilters,
  saveFilterPreset,
  getSavedPresets,
  deleteSavedPreset,
  exportFilteredMessagesToJSON,
  exportFilteredMessagesToCSV,
} from '../lib/filter-utils';
import type { EnrichedMessage, MessageAttachment, MessageReaction } from '../lib/supabase/types';

export interface FilterPaginationParams {
  limit?: number;
  offset?: number;
}

export interface FilteredMessagesResponse {
  messages: EnrichedMessage[];
  totalCount: number;
  hasMore: boolean;
  appliedFilters: FilterOptions;
  sortBy: MessageSortBy;
}

export interface ValidationEntityResult {
  valid: boolean;
  invalidIds: string[];
}

export const MessageFilterService = {
  /**
   * 1. Validate filter criteria before execution
   */
  validate(filters: FilterOptions): FilterValidationResult {
    return validateFilters(filters);
  },

  /**
   * 2. Apply filters to in-memory message list (Fast & Zero Latency)
   */
  filterLocalMessages<T = any>(
    messages: T[],
    filters: FilterOptions = {},
    sortBy: MessageSortBy = 'date_desc'
  ): T[] {
    return applyFilters(messages, filters, sortBy);
  },

  /**
   * 3. Sort messages list
   */
  sortLocalMessages<T = any>(
    messages: T[],
    sortBy: MessageSortBy = 'date_desc'
  ): T[] {
    return sortMessages(messages, sortBy);
  },

  /**
   * 4. Query filtered messages from Supabase with joined metadata, caching and pagination
   */
  async queryMessages(options: {
    roomId?: string;
    filters?: FilterOptions;
    sortBy?: MessageSortBy;
    pagination?: FilterPaginationParams;
    userId?: string;
  }): Promise<FilteredMessagesResponse> {
    const {
      roomId,
      filters = {},
      sortBy = 'date_desc',
      pagination = { limit: 30, offset: 0 },
      userId = 'anonymous',
    } = options;

    const limit = Math.min(Math.max(pagination.limit || 30, 1), 100);
    const offset = Math.max(pagination.offset || 0, 0);

    // Merge roomId into filters if provided
    const effectiveFilters: FilterOptions = {
      ...filters,
      roomIds: roomId ? [roomId] : filters.roomIds,
    };

    // Check filters validation
    const validation = validateFilters(effectiveFilters);
    if (!validation.isValid) {
      console.warn('[MessageFilterService] Filter validation warning:', validation.errors);
    }

    const cacheKey = `filtered_msgs:${userId}:${roomId || 'global'}:${JSON.stringify(effectiveFilters)}:${sortBy}:${limit}:${offset}`;

    return dbCache.getOrFetch(
      cacheKey,
      async () => {
        try {
          let baseQuery = supabase
            .from('messages')
            .select('*, sender:sender_id(id, username, display_name, avatar_url)', { count: 'exact' });

          // Apply PostgREST filter rules
          const { applyToQuery } = buildFilterQuery(effectiveFilters);
          baseQuery = applyToQuery(baseQuery);

          // Apply search query if specified
          if (effectiveFilters.searchQuery && effectiveFilters.searchQuery.trim()) {
            const cleanQuery = effectiveFilters.searchQuery.trim();
            baseQuery = baseQuery.or(`search_vector.wfts.${cleanQuery},content.ilike.%${cleanQuery}%`);
          }

          // Apply DB-level sorting when possible
          if (sortBy === 'date_desc') {
            baseQuery = baseQuery.order('created_at', { ascending: false });
          } else if (sortBy === 'date_asc') {
            baseQuery = baseQuery.order('created_at', { ascending: true });
          } else if (sortBy === 'edited_desc') {
            baseQuery = baseQuery.order('edited_at', { ascending: false, nullsFirst: false });
          } else {
            baseQuery = baseQuery.order('created_at', { ascending: false });
          }

          // Range limit for pagination
          baseQuery = baseQuery.range(offset, offset + limit - 1);

          const { data: rawMessages, error, count } = await baseQuery;

          if (error || !rawMessages) {
            console.error('[MessageFilterService.queryMessages] Query error:', error);
            return {
              messages: [],
              totalCount: 0,
              hasMore: false,
              appliedFilters: effectiveFilters,
              sortBy,
            };
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

          // Apply client-side attachments/reactions specific filters if needed
          if (effectiveFilters.hasAttachments !== undefined || effectiveFilters.attachmentTypes || effectiveFilters.hasReactions !== undefined || effectiveFilters.minReactions) {
            enriched = applyFilters(enriched, effectiveFilters, sortBy);
          } else {
            // Apply sorting for custom algorithms like reactions_desc or relevance
            if (sortBy === 'reactions_desc' || sortBy === 'relevance') {
              enriched = sortMessages(enriched, sortBy);
            }
          }

          const total = count || enriched.length;
          const hasMore = offset + limit < total;

          return {
            messages: enriched,
            totalCount: total,
            hasMore,
            appliedFilters: effectiveFilters,
            sortBy,
          };
        } catch (err) {
          console.error('[MessageFilterService.queryMessages] Error:', err);
          return {
            messages: [],
            totalCount: 0,
            hasMore: false,
            appliedFilters: effectiveFilters,
            sortBy,
          };
        }
      },
      12000 // 12 seconds TTL
    );
  },

  /**
   * 5. Verify whether sender userIds exist
   */
  async validateSenders(senderIds: string[]): Promise<ValidationEntityResult> {
    if (!senderIds || senderIds.length === 0) return { valid: true, invalidIds: [] };

    try {
      const { data } = await supabase
        .from('users')
        .select('id')
        .in('id', senderIds);

      const existingIds = new Set(data?.map((u) => u.id) || []);
      const invalidIds = senderIds.filter((id) => !existingIds.has(id));

      return {
        valid: invalidIds.length === 0,
        invalidIds,
      };
    } catch {
      return { valid: true, invalidIds: [] };
    }
  },

  /**
   * 6. Verify whether roomIds exist
   */
  async validateRooms(roomIds: string[]): Promise<ValidationEntityResult> {
    if (!roomIds || roomIds.length === 0) return { valid: true, invalidIds: [] };

    try {
      const { data } = await supabase
        .from('rooms')
        .select('id')
        .in('id', roomIds);

      const existingIds = new Set(data?.map((r) => r.id) || []);
      const invalidIds = roomIds.filter((id) => !existingIds.has(id));

      return {
        valid: invalidIds.length === 0,
        invalidIds,
      };
    } catch {
      return { valid: true, invalidIds: [] };
    }
  },

  /**
   * 7. Presets management
   */
  getPresets(): FilterPreset[] {
    const common = getCommonFilters();
    const saved = getSavedPresets();
    return [...common, ...saved];
  },

  savePreset(
    name: string,
    filters: FilterOptions,
    sortBy: MessageSortBy = 'date_desc',
    icon = '⭐'
  ): FilterPreset {
    return saveFilterPreset(name, filters, sortBy, icon);
  },

  deletePreset(presetId: string): void {
    deleteSavedPreset(presetId);
  },

  /**
   * 8. Export filtered messages
   */
  exportToJSON(messages: any[], filename?: string): void {
    exportFilteredMessagesToJSON(messages, filename);
  },

  exportToCSV(messages: any[], filename?: string): void {
    exportFilteredMessagesToCSV(messages, filename);
  },
};

export default MessageFilterService;
