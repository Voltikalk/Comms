import { useCallback } from 'react';
import type { Room } from '../types';
import { adjacentRoomId } from '../lib/chat-hotkeys';

export interface ChatNavigationOptions {
  /** All rooms in sidebar order (Ctrl+1..9). */
  rooms: Room[];
  /** Rooms of the current folder / search (Alt+↑/↓). */
  filteredRooms: Room[];
  activeRoomId: string | null;
  setActiveRoomId: (id: string) => void;
  setMobileView: (view: 'list' | 'chat') => void;
}

/** Room switching shared by hotkeys, the command palette and toasts. */
export function useChatNavigation({ rooms, filteredRooms, activeRoomId, setActiveRoomId, setMobileView }: ChatNavigationOptions) {
  const openRoom = useCallback(
    (roomId: string) => {
      setActiveRoomId(roomId);
      setMobileView('chat');
    },
    [setActiveRoomId, setMobileView],
  );

  /** Alt+↑ / Alt+↓ with wrap-around; returns `false` when there is nowhere to go. */
  const openAdjacentRoom = useCallback(
    (direction: -1 | 1) => {
      const id = adjacentRoomId(filteredRooms.map((r) => r.id), activeRoomId, direction);
      if (!id) return false;
      openRoom(id);
      return true;
    },
    [filteredRooms, activeRoomId, openRoom],
  );

  /** Ctrl+N: N-th room of the full list; `false` when it does not exist. */
  const openRoomByIndex = useCallback(
    (index: number) => {
      const room = rooms[index];
      if (!room) return false;
      openRoom(room.id);
      return true;
    },
    [rooms, openRoom],
  );

  return { openRoom, openAdjacentRoom, openRoomByIndex };
}
