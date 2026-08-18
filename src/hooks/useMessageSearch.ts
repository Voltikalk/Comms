import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageSearchService } from '../services/message-search.service';
import type {
  SearchFilters,
  SearchResultItem,
  SearchResponse,
} from '../services/message-search.service';

export interface UseMessageSearchOptions {
  roomId?: string;
  userId?: string;
  debounceMs?: number;
  initialFilters?: SearchFilters;
}

export function useMessageSearch(options: UseMessageSearchOptions = {}) {
  const { roomId, userId = 'anonymous', debounceMs = 300, initialFilters = {} } = options;

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [groupedResults, setGroupedResults] = useState<Record<string, { roomName?: string; results: SearchResultItem[] }>>({});
  const [isSearching, setIsSearching] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const limit = 20;
  const timeoutRef = useRef<any>(null);

  // Load history on mount
  useEffect(() => {
    setHistory(MessageSearchService.getSearchHistory(userId, 8));
  }, [userId]);

  // Execute Search
  const executeSearch = useCallback(
    async (searchQuery: string, currentFilters: SearchFilters, currentOffset = 0, isAppend = false) => {
      if (!searchQuery.trim() || searchQuery.trim().length < 2) {
        setResults([]);
        setGroupedResults({});
        setTotalCount(0);
        setHasMore(false);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      setError(null);

      try {
        if (roomId) {
          // Room search
          const res: SearchResponse = await MessageSearchService.searchMessages(
            roomId,
            searchQuery,
            currentFilters,
            { limit, offset: currentOffset },
            userId
          );

          if (isAppend) {
            setResults((prev) => [...prev, ...res.results]);
          } else {
            setResults(res.results);
          }

          setTotalCount(res.total);
          setHasMore(res.hasMore);
        } else {
          // Global search
          const res = await MessageSearchService.searchGlobal(searchQuery, currentFilters, userId);
          setGroupedResults(res.groupedByRoom);
          setTotalCount(res.totalMatches);
          setHasMore(false);
        }

        // Refresh search history list
        setHistory(MessageSearchService.getSearchHistory(userId, 8));
      } catch (err: any) {
        setError(err.message || 'Ошибка выполнения поиска');
      } finally {
        setIsSearching(false);
      }
    },
    [roomId, userId, limit]
  );

  // Debounced trigger on query or filters change
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setGroupedResults({});
      setTotalCount(0);
      setHasMore(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setOffset(0);

    timeoutRef.current = setTimeout(() => {
      executeSearch(query, filters, 0, false);
    }, debounceMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query, filters, debounceMs, executeSearch]);

  // Load More (Pagination)
  const loadMore = useCallback(() => {
    if (!hasMore || isSearching || !roomId) return;
    const nextOffset = offset + limit;
    setOffset(nextOffset);
    executeSearch(query, filters, nextOffset, true);
  }, [hasMore, isSearching, roomId, offset, limit, query, filters, executeSearch]);

  // Clear query and results
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setGroupedResults({});
    setTotalCount(0);
    setHasMore(false);
    setError(null);
  }, []);

  // Clear user history
  const clearHistory = useCallback(() => {
    MessageSearchService.clearSearchHistory(userId);
    setHistory([]);
  }, [userId]);

  return {
    query,
    setQuery,
    filters,
    setFilters,
    results,
    groupedResults,
    isSearching,
    totalCount,
    hasMore,
    error,
    history,
    loadMore,
    clearSearch,
    clearHistory,
    refetch: () => executeSearch(query, filters, 0, false),
  };
}

export default useMessageSearch;
