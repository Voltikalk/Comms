import { useState, useEffect, useCallback, useRef } from 'react';
import type { EnrichedMessage, Message } from '../lib/supabase/types';
import { MessageService } from '../services/message.service';
import { RealtimeService } from '../services/realtime.service';

export function useRoomMessages(roomId: string | null, limit = 50) {
  const [messages, setMessages] = useState<EnrichedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const messagesRef = useRef<EnrichedMessage[]>([]);
  messagesRef.current = messages;

  // 1. Fetch initial message history
  const fetchMessages = useCallback(async (isInitial = false) => {
    if (!roomId) return;

    if (isInitial) {
      setIsLoading(true);
      setOffset(0);
    }

    try {
      const currentOffset = isInitial ? 0 : offset;
      const result = await MessageService.getMessages(roomId, limit, currentOffset);

      if (isInitial) {
        setMessages(result.messages);
      } else {
        setMessages((prev) => [...result.messages, ...prev]);
      }

      setHasMore(result.hasMore);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки сообщений');
    } finally {
      setIsLoading(false);
    }
  }, [roomId, limit, offset]);

  // 2. Initial load on roomId change
  useEffect(() => {
    if (!roomId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    fetchMessages(true);
  }, [roomId]);

  // 3. Realtime Subscription for room messages
  useEffect(() => {
    if (!roomId) return;

    const channel = RealtimeService.subscribeToRoomMessages(roomId, {
      // Handle new incoming messages in real-time
      onInsert: async (newMsg: Message) => {
        // Fetch rich data (with sender profile & attachments)
        const enriched = await MessageService.getMessageById(newMsg.id);
        const toAdd = enriched || { ...newMsg, reactions: [], attachments: [] };

        setMessages((prev) => {
          // Avoid duplicate insertions
          if (prev.some((m) => m.id === newMsg.id)) {
            return prev;
          }
          return [...prev, toAdd];
        });
      },

      // Handle edited messages
      onUpdate: (updatedMsg: Message) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === updatedMsg.id
              ? {
                  ...m,
                  content: updatedMsg.content,
                  edited_at: updatedMsg.edited_at,
                  deleted_at: updatedMsg.deleted_at,
                }
              : m
          )
        );
      },

      // Handle deleted messages
      onDelete: (deletedId: string) => {
        setMessages((prev) => prev.filter((m) => m.id !== deletedId));
      },
    });

    return () => {
      RealtimeService.unsubscribeChannel(channel);
    };
  }, [roomId]);

  // 4. Load more pagination handler
  const loadMore = useCallback(() => {
    if (!hasMore || isLoading) return;
    const newOffset = offset + limit;
    setOffset(newOffset);
    fetchMessages(false);
  }, [hasMore, isLoading, offset, limit, fetchMessages]);

  return {
    messages,
    isLoading,
    hasMore,
    error,
    loadMore,
    refetch: () => fetchMessages(true),
  };
}

export default useRoomMessages;
