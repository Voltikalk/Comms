import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageHistoryService, type HistoryOptions } from '../services/message-history.service';
import type { EnrichedMessage } from '../lib/supabase/types';

export interface UseInfiniteMessageHistoryOptions {
  roomId: string;
  userId?: string;
  pageSize?: number;
  initialFilter?: HistoryOptions['filterType'];
}

export function useInfiniteMessageHistory({
  roomId,
  userId = 'anonymous',
  pageSize = 40,
  initialFilter = 'all',
}: UseInfiniteMessageHistoryOptions) {
  const [messages, setMessages] = useState<EnrichedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [hasMoreNewer, setHasMoreNewer] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [filterType, setFilterType] = useState<HistoryOptions['filterType']>(initialFilter);
  const [unreadSeparatorIndex, setUnreadSeparatorIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Initial load & position restore
  const loadInitialMessages = useCallback(async () => {
    if (!roomId) return;
    setIsLoading(true);

    try {
      const res = await MessageHistoryService.getMessageHistory(roomId, {
        limit: pageSize,
        filterType,
      });

      setMessages(res.messages);
      setHasMoreOlder(res.hasMore);
      setTotalCount(res.total);

      // Check unread messages to place divider
      const unreadRes = await MessageHistoryService.getUnreadMessages(roomId, userId);
      if (unreadRes.unreadCount > 0 && res.messages.length > 0) {
        const firstUnreadId = unreadRes.messages[0]?.id;
        const index = res.messages.findIndex((m) => m.id === firstUnreadId);
        if (index !== -1) {
          setUnreadSeparatorIndex(index);
        }
      }
    } catch (err) {
      console.error('[useInfiniteMessageHistory] Initial load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, userId, pageSize, filterType]);

  useEffect(() => {
    loadInitialMessages();
  }, [loadInitialMessages]);

  // Load older messages (Scrolling UP)
  const loadOlderMessages = useCallback(async () => {
    if (!hasMoreOlder || isLoadingMore || messages.length === 0) return;

    setIsLoadingMore(true);
    const oldestTimestamp = messages[0]?.created_at;

    try {
      const res = await MessageHistoryService.getMessageHistory(roomId, {
        limit: pageSize,
        startFrom: oldestTimestamp,
        direction: 'before',
        filterType,
      });

      if (res.messages.length > 0) {
        setMessages((prev) => [...res.messages, ...prev]);
        setHasMoreOlder(res.hasMore);
      } else {
        setHasMoreOlder(false);
      }
    } catch (err) {
      console.error('[useInfiniteMessageHistory] Load older error:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMoreOlder, isLoadingMore, messages, roomId, pageSize, filterType]);

  // Jump to specific message with context
  const jumpToMessage = useCallback(async (messageId: string) => {
    setIsLoading(true);
    try {
      const res = await MessageHistoryService.getMessageContext(messageId, 15);
      if (res.messages.length > 0) {
        setMessages(res.messages);
        setHasMoreOlder(true);
        setHasMoreNewer(true);
      }
    } catch (err) {
      console.error('[useInfiniteMessageHistory] Jump error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Filter changer
  const handleFilterChange = (newFilter: HistoryOptions['filterType']) => {
    setFilterType(newFilter);
  };

  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMoreOlder,
    hasMoreNewer,
    totalCount,
    filterType,
    unreadSeparatorIndex,
    containerRef,
    loadOlderMessages,
    jumpToMessage,
    setFilterType: handleFilterChange,
    refetch: loadInitialMessages,
  };
}

export default useInfiniteMessageHistory;
