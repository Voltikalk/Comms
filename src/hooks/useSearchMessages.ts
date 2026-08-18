import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MessageSearchService, type SearchFilters, type SearchResultItem } from '../services/message-search.service';
import type { SearchSortOrder } from '../components/Search/SearchStats';

export interface UseSearchMessagesOptions {
  roomId?: string;
  userId?: string;
  debounceMs?: number;
  initialFilters?: SearchFilters;
}

export function useSearchMessages(options: UseSearchMessagesOptions = {}) {
  const { roomId, userId = 'anonymous', debounceMs = 300, initialFilters = {} } = options;

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [sortOrder, setSortOrder] = useState<SearchSortOrder>('relevance');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const limit = 20;
  const timeoutRef = useRef<any>(null);

  // Load search history on mount
  useEffect(() => {
    setHistory(MessageSearchService.getSearchHistory(userId, 8));
  }, [userId]);

  const executeSearch = useCallback(
    async (
      searchQuery: string,
      currentFilters: SearchFilters,
      currentOffset = 0,
      isAppend = false
    ) => {
      const clean = searchQuery.trim();
      if (!clean || clean.length < 2) {
        setResults([]);
        setTotalCount(0);
        setHasMore(false);
        setIsLoading(false);
        setElapsedMs(undefined);
        return;
      }

      setIsLoading(true);
      setError(null);
      const startTime = performance.now();

      try {
        if (roomId) {
          const res = await MessageSearchService.searchMessages(
            roomId,
            clean,
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
          const res = await MessageSearchService.searchGlobal(clean, currentFilters, userId);
          const allItems = Object.values(res.groupedByRoom).flatMap((g) => g.results);
          setResults(allItems);
          setTotalCount(res.totalMatches);
          setHasMore(false);
        }

        setElapsedMs(Math.round(performance.now() - startTime));
        setHistory(MessageSearchService.getSearchHistory(userId, 8));
      } catch (err: any) {
        setError(err.message || 'Ошибка поиска');
      } finally {
        setIsLoading(false);
      }
    },
    [roomId, userId, limit]
  );

  // Debounced search trigger
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setTotalCount(0);
      setHasMore(false);
      setIsLoading(false);
      setElapsedMs(undefined);
      return;
    }

    setIsLoading(true);
    setOffset(0);

    timeoutRef.current = setTimeout(() => {
      executeSearch(query, filters, 0, false);
    }, debounceMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query, filters, debounceMs, executeSearch]);

  // Sort results based on sortOrder
  const sortedResults = useMemo(() => {
    if (sortOrder === 'relevance') return results;
    return [...results].sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });
  }, [results, sortOrder]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading || !roomId) return;
    const nextOffset = offset + limit;
    setOffset(nextOffset);
    executeSearch(query, filters, nextOffset, true);
  }, [hasMore, isLoading, roomId, offset, limit, query, filters, executeSearch]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setTotalCount(0);
    setHasMore(false);
    setElapsedMs(undefined);
    setError(null);
  }, []);

  const clearHistory = useCallback(() => {
    MessageSearchService.clearSearchHistory(userId);
    setHistory([]);
  }, [userId]);

  const exportResults = useCallback(
    (format: 'json' | 'csv') => {
      if (results.length === 0) return;
      let dataStr = '';
      if (format === 'json') {
        dataStr = JSON.stringify(results, null, 2);
      } else {
        const header = 'id,created_at,sender,content\n';
        const rows = results
          .map((r) => {
            const senderName = r.sender?.display_name || r.sender?.username || r.sender_id;
            const content = `"${(r.content || '').replace(/"/g, '""')}"`;
            return `${r.id},${r.created_at},"${senderName}",${content}`;
          })
          .join('\n');
        dataStr = header + rows;
      }

      const blob = new Blob([dataStr], { type: format === 'json' ? 'application/json' : 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `search-results-${Date.now()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [results]
  );

  return {
    query,
    setQuery,
    filters,
    setFilters,
    sortOrder,
    setSortOrder,
    results: sortedResults,
    totalCount,
    elapsedMs,
    isLoading,
    hasMore,
    error,
    history,
    loadMore,
    clearSearch,
    clearHistory,
    exportResults,
  };
}

export default useSearchMessages;
