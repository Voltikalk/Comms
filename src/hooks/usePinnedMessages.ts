import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Message } from '../types';
import {
  PINS_STORAGE_KEY,
  getPins,
  nextPinCursor,
  normalizeCursor,
  parsePinnedMap,
  pinLabel,
  togglePin as togglePinPure,
  unpinAll as unpinAllPure,
  type PinnedMap,
} from '../lib/pins';

const readPins = (): PinnedMap => {
  try {
    return parsePinnedMap(localStorage.getItem(PINS_STORAGE_KEY));
  } catch {
    return {};
  }
};

export interface PinnedMessagesState {
  /** Pinned messages of the active room that are loaded, oldest → newest. */
  pins: Message[];
  /** Pin currently shown in the bar. */
  current: Message | null;
  /** Index of `current` in `pins`. */
  cursor: number;
  label: string;
  isPinned: (messageId: string) => boolean;
  /** Pins / unpins; returns `true` when the message became pinned. */
  toggle: (messageId: string) => boolean;
  /** Bar click: move to the previous (older) pin, wrapping to the newest. */
  advance: () => void;
  /** Show a specific pin in the bar (e.g. picked from the side panel). */
  select: (messageId: string) => void;
  unpinAll: () => void;
}

/**
 * Telegram multi-pin state for the active chat (Direction 2 · multi-pins).
 * Persisted in localStorage (`tg_pinned_messages_v2`, upgrades the legacy
 * single-pin format). Pins whose messages are not loaded are hidden, not
 * dropped, so history pagination can't silently unpin anything.
 */
export function usePinnedMessages(roomId: string | null | undefined, messageMap: ReadonlyMap<string, Message>): PinnedMessagesState {
  const [map, setMap] = useState<PinnedMap>(readPins);
  // Cursor is scoped to the room it was set in → switching chats resets to the newest pin.
  const [cursorState, setCursorState] = useState<{ roomId: string; cursor: number }>({ roomId: '', cursor: -1 });

  useEffect(() => {
    try {
      localStorage.setItem(PINS_STORAGE_KEY, JSON.stringify(map));
    } catch {
      // Storage full / private mode — pins stay in memory for this session.
    }
  }, [map]);

  const pins = useMemo(
    () =>
      roomId
        ? getPins(map, roomId)
            .map((id) => messageMap.get(id))
            .filter((m): m is Message => !!m)
        : [],
    [map, roomId, messageMap],
  );

  const rawCursor = cursorState.roomId === roomId ? cursorState.cursor : -1;
  const cursor = normalizeCursor(pins.length, rawCursor);
  const current = pins[cursor] ?? null;

  const isPinned = useCallback((id: string) => (roomId ? getPins(map, roomId).includes(id) : false), [map, roomId]);

  const toggle = useCallback(
    (messageId: string) => {
      if (!roomId) return false;
      const res = togglePinPure(map, roomId, messageId);
      setMap(res.map);
      setCursorState({ roomId, cursor: -1 });
      return res.pinned;
    },
    [map, roomId],
  );

  const advance = useCallback(() => {
    if (!roomId) return;
    setCursorState({ roomId, cursor: nextPinCursor(pins.length, cursor) });
  }, [roomId, pins.length, cursor]);

  const select = useCallback(
    (messageId: string) => {
      if (!roomId) return;
      const idx = pins.findIndex((m) => m.id === messageId);
      if (idx >= 0) setCursorState({ roomId, cursor: idx });
    },
    [roomId, pins],
  );

  const unpinAll = useCallback(() => {
    if (!roomId) return;
    setMap((prev) => unpinAllPure(prev, roomId));
    setCursorState({ roomId, cursor: -1 });
  }, [roomId]);

  return { pins, current, cursor, label: pinLabel(pins.length, cursor), isPinned, toggle, advance, select, unpinAll };
}
