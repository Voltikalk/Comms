/**
 * Pure keyboard-shortcut resolution for the chat screen (no DOM / React).
 * Consumed by `useChatHotkeys`, covered by `chat-hotkeys.test.ts`.
 */
import type { ChatFolderId } from '../components/Navigation/ChatFolderTabs';

export const HOTKEY_FOLDERS: readonly ChatFolderId[] = ['all', 'direct', 'groups', 'channels', 'unread', 'saved'];

export type ChatHotkeyAction =
  | { type: 'commandPalette' }
  | { type: 'adjacentChat'; direction: -1 | 1 }
  | { type: 'adjacentUnread'; direction: -1 | 1 }
  | { type: 'savedMessages' }
  | { type: 'folder'; folder: ChatFolderId }
  | { type: 'shortcuts' }
  | { type: 'settings' }
  | { type: 'chatIndex'; index: number }
  | { type: 'escape' };

export interface HotkeyEventLike {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey?: boolean;
}

/** Maps a keydown to a chat action; `null` when the key is not a chat shortcut. */
export function resolveChatHotkey(e: HotkeyEventLike): ChatHotkeyAction | null {
  const mod = e.ctrlKey || e.metaKey;
  if (mod && (e.key === 'k' || e.key === 'K')) return { type: 'commandPalette' };
  // Telegram Desktop: Alt+Shift+↑/↓ jumps between unread chats, Ctrl+Tab cycles chats.
  if (e.altKey && e.shiftKey && e.key === 'ArrowUp') return { type: 'adjacentUnread', direction: -1 };
  if (e.altKey && e.shiftKey && e.key === 'ArrowDown') return { type: 'adjacentUnread', direction: 1 };
  if (e.ctrlKey && e.key === 'Tab') return { type: 'adjacentChat', direction: e.shiftKey ? -1 : 1 };
  if (e.altKey && e.key === 'ArrowUp') return { type: 'adjacentChat', direction: -1 };
  if (e.altKey && e.key === 'ArrowDown') return { type: 'adjacentChat', direction: 1 };
  if (e.altKey && /^[1-6]$/.test(e.key)) return { type: 'folder', folder: HOTKEY_FOLDERS[Number(e.key) - 1] };
  if (mod && e.key === '/') return { type: 'shortcuts' };
  if (mod && e.key === ',') return { type: 'settings' };
  if (mod && /^[1-9]$/.test(e.key)) return { type: 'chatIndex', index: Number(e.key) - 1 };
  if (mod && e.key === '0') return { type: 'savedMessages' };
  if (e.key === 'Escape') return { type: 'escape' };
  return null;
}

/**
 * Next / previous room id with wrap-around. When the active room is not in
 * the list, ↓ starts from the top and ↑ from the bottom.
 */
export function adjacentRoomId(roomIds: readonly string[], activeId: string | null | undefined, direction: -1 | 1): string | null {
  if (roomIds.length === 0) return null;
  const idx = activeId ? roomIds.indexOf(activeId) : -1;
  if (idx === -1) return direction === 1 ? roomIds[0] : roomIds[roomIds.length - 1];
  return roomIds[(idx + direction + roomIds.length) % roomIds.length];
}

/**
 * Next / previous room after the active one that satisfies `match` (e.g. has
 * unread messages), wrapping around; never returns the active room itself.
 */
export function adjacentMatchingRoomId(
  roomIds: readonly string[],
  activeId: string | null | undefined,
  direction: -1 | 1,
  match: (id: string) => boolean,
): string | null {
  const n = roomIds.length;
  const start = activeId ? roomIds.indexOf(activeId) : -1;
  const from = start === -1 ? (direction === 1 ? -1 : n) : start;
  for (let step = 1; step <= n; step++) {
    const id = roomIds[(((from + direction * step) % n) + n) % n];
    if (id !== activeId && match(id)) return id;
  }
  return null;
}

/** Returns a new Set with `id` toggled (immutable — safe for React state). */
export function toggleInSet<T>(set: ReadonlySet<T>, id: T): Set<T> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}
