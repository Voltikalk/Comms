import { useState, useEffect, useMemo, useCallback } from 'react';
import { RealtimeService } from '../services/realtime.service';
import type { PresenceUser } from '../services/realtime.service';

export function useUserStatus(
  roomId: string = 'global-presence',
  currentUser: { userId: string; username: string } | null
) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!currentUser?.userId) {
      setOnlineUsers([]);
      return;
    }

    const channel = RealtimeService.subscribeToPresence(
      roomId,
      currentUser,
      (users) => {
        setOnlineUsers(users);
      }
    );

    return () => {
      RealtimeService.unsubscribeChannel(channel);
    };
  }, [roomId, currentUser?.userId]);

  // Fast map lookup for user online state
  const onlineUserMap = useMemo(() => {
    const map = new Map<string, PresenceUser>();
    onlineUsers.forEach((u) => map.set(u.userId, u));
    return map;
  }, [onlineUsers]);

  const isUserOnline = useCallback(
    (userId: string): boolean => {
      return onlineUserMap.has(userId);
    },
    [onlineUserMap]
  );

  const getUserStatus = useCallback(
    (userId: string): 'online' | 'offline' | 'away' => {
      return onlineUserMap.get(userId)?.status || 'offline';
    },
    [onlineUserMap]
  );

  return {
    onlineUsers,
    onlineCount: onlineUsers.length,
    isUserOnline,
    getUserStatus,
  };
}

export default useUserStatus;
