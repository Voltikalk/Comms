import { useState, useEffect, useCallback, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, checkSupabaseHealth } from '../lib/supabase/client';
import { userQueries, roomQueries, messageQueries } from '../lib/supabase/queries';
import type { 
  User, 
  Room, 
  EnrichedMessage 
} from '../lib/supabase/types';

export interface UseSupabaseReturn {
  client: typeof supabase;
  isConnected: boolean;
  latencyMs: number;
  currentUser: User | null;
  rooms: Room[];
  activeMessages: EnrichedMessage[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchRooms: (userId: string) => Promise<void>;
  fetchMessages: (roomId: string, page?: number) => Promise<void>;
  sendMessage: (roomId: string, senderId: string, content: string, replyToId?: string) => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  toggleReaction: (messageId: string, userId: string, emoji: string) => Promise<void>;
  subscribeToRoom: (roomId: string) => () => void;
}

/**
 * Custom React Hook for Supabase Client, Queries, and Real-time Subscriptions
 */
export function useSupabase(): UseSupabaseReturn {
  const [isConnected, setIsConnected] = useState(true);
  const [latencyMs, setLatencyMs] = useState(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeMessages, setActiveMessages] = useState<EnrichedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeChannelRef = useRef<RealtimeChannel | null>(null);

  // Initial Health Check & Auth Listener
  useEffect(() => {
    let isMounted = true;

    async function init() {
      const health = await checkSupabaseHealth();
      if (isMounted) {
        setIsConnected(health.ok);
        setLatencyMs(health.latencyMs);
      }

      // Check current session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && isMounted) {
        const profile = await userQueries.getProfileById(session.user.id);
        setCurrentUser(profile);
      }
    }

    init();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await userQueries.getProfileById(session.user.id);
        if (isMounted) setCurrentUser(profile);
      } else {
        if (isMounted) setCurrentUser(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      if (activeChannelRef.current) {
        activeChannelRef.current.unsubscribe();
      }
    };
  }, []);

  // Fetch Rooms
  const fetchRooms = useCallback(async (userId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await roomQueries.getUserRooms(userId);
      setRooms(result);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки комнат');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch Messages for Room
  const fetchMessages = useCallback(async (roomId: string, page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await messageQueries.getRoomMessages(roomId, { page, pageSize: 40 });
      setActiveMessages(result.data);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки сообщений');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Send Message
  const sendMessage = useCallback(async (
    roomId: string,
    senderId: string,
    content: string,
    replyToId?: string
  ) => {
    try {
      const newMsg = await messageQueries.sendMessage(roomId, senderId, content, replyToId);
      if (newMsg) {
        setActiveMessages((prev) => [...prev, { ...newMsg, attachments: [], reactions: [] }]);
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка отправки сообщения');
      throw err;
    }
  }, []);

  // Edit Message
  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    try {
      const updated = await messageQueries.editMessage(messageId, newContent);
      if (updated) {
        setActiveMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, content: newContent, edited_at: updated.edited_at } : m))
        );
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка редактирования сообщения');
    }
  }, []);

  // Delete Message
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      const ok = await messageQueries.deleteMessage(messageId);
      if (ok) {
        setActiveMessages((prev) => prev.filter((m) => m.id !== messageId));
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка удаления сообщения');
    }
  }, []);

  // Toggle Reaction
  const toggleReaction = useCallback(async (messageId: string, userId: string, emoji: string) => {
    try {
      await messageQueries.toggleReaction(messageId, userId, emoji);
    } catch (err: any) {
      setError(err.message || 'Ошибка обновления реакции');
    }
  }, []);

  // Subscribe to Realtime Messages in Room
  const subscribeToRoom = useCallback((roomId: string) => {
    if (activeChannelRef.current) {
      activeChannelRef.current.unsubscribe();
    }

    const channel = supabase
      .channel(`room-live:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const incoming = payload.new as EnrichedMessage;
          setActiveMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, { ...incoming, attachments: [], reactions: [] }];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const updated = payload.new as EnrichedMessage;
          setActiveMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
          );
        }
      )
      .subscribe();

    activeChannelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return {
    client: supabase,
    isConnected,
    latencyMs,
    currentUser,
    rooms,
    activeMessages,
    isLoading,
    error,
    fetchRooms,
    fetchMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    subscribeToRoom,
  };
}

export default useSupabase;
