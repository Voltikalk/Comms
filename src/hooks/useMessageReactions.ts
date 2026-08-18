import { useState, useEffect, useMemo, useCallback } from 'react';
import type { MessageReaction } from '../lib/supabase/types';
import { ReactionService } from '../services/reaction.service';
import { RealtimeService } from '../services/realtime.service';

export interface GroupedReaction {
  emoji: string;
  count: number;
  users: string[];
  hasReacted: boolean;
}

export function useMessageReactions(messageId: string | null, currentUserId?: string) {
  const [reactions, setReactions] = useState<MessageReaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 1. Load initial reactions
  useEffect(() => {
    if (!messageId) {
      setReactions([]);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    ReactionService.getReactions(messageId)
      .then((data) => {
        if (isMounted) {
          setReactions(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [messageId]);

  // 2. Real-time Subscription for message reactions
  useEffect(() => {
    if (!messageId) return;

    const channel = RealtimeService.subscribeToMessageReactions(messageId, {
      onInsert: (newReaction) => {
        setReactions((prev) => {
          if (prev.some((r) => r.id === newReaction.id)) return prev;
          return [...prev, newReaction];
        });
      },
      onDelete: (deletedReactionId) => {
        setReactions((prev) => prev.filter((r) => r.id !== deletedReactionId));
      },
    });

    return () => {
      RealtimeService.unsubscribeChannel(channel);
    };
  }, [messageId]);

  // 3. Toggle reaction action
  const toggleReaction = useCallback(
    async (emoji: string) => {
      if (!messageId || !currentUserId) return;

      try {
        await ReactionService.toggleReaction(messageId, currentUserId, emoji);
      } catch (err) {
        console.error('[useMessageReactions.toggleReaction] Error:', err);
      }
    },
    [messageId, currentUserId]
  );

  // 4. Group reactions by emoji
  const groupedReactions = useMemo<GroupedReaction[]>(() => {
    const map = new Map<string, { count: number; users: string[]; hasReacted: boolean }>();

    reactions.forEach((r) => {
      const existing = map.get(r.emoji) || { count: 0, users: [], hasReacted: false };
      existing.count += 1;
      existing.users.push(r.user_id);
      if (currentUserId && r.user_id === currentUserId) {
        existing.hasReacted = true;
      }
      map.set(r.emoji, existing);
    });

    return Array.from(map.entries()).map(([emoji, data]) => ({
      emoji,
      count: data.count,
      users: data.users,
      hasReacted: data.hasReacted,
    }));
  }, [reactions, currentUserId]);

  return {
    reactions,
    groupedReactions,
    toggleReaction,
    isLoading,
  };
}

export default useMessageReactions;
