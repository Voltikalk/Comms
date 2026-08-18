import { supabase } from './client';
import type { Message } from './types';

export interface SearchResultItem extends Message {
  rank?: number;
  headline?: string;
}

export interface SearchOptions {
  roomId?: string;
  limit?: number;
  offset?: number;
  language?: 'russian' | 'english' | 'auto';
}

/**
 * 1. Automatic Language Detection (Cyrillic vs Latin)
 */
export function detectLanguage(text: string): 'russian' | 'english' {
  const cyrillicPattern = /[\u0400-\u04FF]/;
  return cyrillicPattern.test(text) ? 'russian' : 'english';
}

/**
 * 2. Text Normalization for Search Queries
 */
export function normalizeSearchQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 3. Search Configuration Constants
 */
export const SEARCH_CONFIG = {
  defaultLimit: 30,
  maxLimit: 100,
  minQueryLength: 2,
  weights: {
    title: 'A',
    content: 'B',
  },
  languages: ['russian', 'english'] as const,
};

/**
 * 4. Execute Full-Text Search in Supabase PostgreSQL
 */
export async function searchMessages(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResultItem[]> {
  const { roomId, limit = SEARCH_CONFIG.defaultLimit, offset = 0 } = options;
  const cleanQuery = normalizeSearchQuery(query);

  if (!cleanQuery || cleanQuery.length < SEARCH_CONFIG.minQueryLength) {
    return [];
  }

  try {
    // Try Stored Procedure RPC search_messages first
    const { data: rpcData, error: rpcError } = await supabase.rpc('search_messages', {
      query_text: cleanQuery,
      target_room_id: roomId || null,
      max_limit: limit,
      min_offset: offset,
    });

    if (!rpcError && rpcData) {
      return rpcData as SearchResultItem[];
    }

    if (rpcError) {
      console.warn('[FullTextSearch] RPC notice, falling back to PostgREST query:', rpcError.message);
    }

    // Fallback: PostgREST textSearch with search_vector or ILIKE
    let queryBuilder = supabase
      .from('messages')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (roomId) {
      queryBuilder = queryBuilder.eq('room_id', roomId);
    }

    // Try textSearch or ilike
    const { data: fallbackData, error: fallbackError } = await queryBuilder.or(
      `search_vector.wfts.${cleanQuery},content.ilike.%${cleanQuery}%`
    );

    if (fallbackError || !fallbackData) {
      // Direct ILIKE query
      let ilikeBuilder = supabase
        .from('messages')
        .select('*')
        .is('deleted_at', null)
        .ilike('content', `%${cleanQuery}%`)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (roomId) {
        ilikeBuilder = ilikeBuilder.eq('room_id', roomId);
      }

      const { data: simpleData } = await ilikeBuilder;
      return (simpleData || []) as SearchResultItem[];
    }

    return fallbackData as SearchResultItem[];
  } catch (err) {
    console.error('[SearchMessages Error]', err);
    return [];
  }
}

/**
 * 5. Highlight search terms in snippet text
 */
export function highlightSearchText(text: string, query: string): string {
  if (!query.trim()) return text;
  const terms = normalizeSearchQuery(query).split(' ').filter(Boolean);
  if (terms.length === 0) return text;

  const pattern = new RegExp(`(${terms.join('|')})`, 'gi');
  return text.replace(pattern, '<mark class="bg-cyan-400/30 text-cyan-200 rounded px-0.5">$1</mark>');
}
