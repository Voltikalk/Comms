import { useState, useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { SubscriptionStatus } from '../services/realtime.service';
import { RealtimeService } from '../services/realtime.service';

export interface UseRealtimeSubscriptionOptions {
  channelName: string;
  createChannel: (onStatusChange: (status: SubscriptionStatus) => void) => RealtimeChannel;
  enabled?: boolean;
  onReconnect?: () => void;
}

export function useRealtimeSubscription({
  channelName,
  createChannel,
  enabled = true,
  onReconnect,
}: UseRealtimeSubscriptionOptions) {
  const [status, setStatus] = useState<SubscriptionStatus>('CONNECTING');
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (channelRef.current) {
        RealtimeService.unsubscribeChannel(channelRef.current);
        channelRef.current = null;
      }
      setStatus('CLOSED');
      return;
    }

    setStatus('CONNECTING');
    setError(null);

    const channel = createChannel((newStatus) => {
      setStatus(newStatus);
      if (newStatus === 'SUBSCRIBED' && onReconnect) {
        onReconnect();
      }
      if (newStatus === 'CHANNEL_ERROR') {
        setError(`Ошибка в канале ${channelName}`);
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        RealtimeService.unsubscribeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [channelName, enabled]);

  return {
    status,
    isConnected: status === 'SUBSCRIBED',
    error,
    channel: channelRef.current,
  };
}

export default useRealtimeSubscription;
