import { describe, expect, it } from 'vitest';
import { adjacentMatchingRoomId, adjacentRoomId, resolveChatHotkey, toggleInSet } from './chat-hotkeys';

const key = (k: string, mods: Partial<{ ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean }> = {}) => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...mods,
});

describe('resolveChatHotkey', () => {
  it('opens the command palette with Ctrl+K and Cmd+K (any case)', () => {
    expect(resolveChatHotkey(key('k', { ctrlKey: true }))).toEqual({ type: 'commandPalette' });
    expect(resolveChatHotkey(key('K', { metaKey: true }))).toEqual({ type: 'commandPalette' });
    expect(resolveChatHotkey(key('k'))).toBeNull();
  });

  it('maps Alt+ArrowUp/Down to adjacent chats', () => {
    expect(resolveChatHotkey(key('ArrowUp', { altKey: true }))).toEqual({ type: 'adjacentChat', direction: -1 });
    expect(resolveChatHotkey(key('ArrowDown', { altKey: true }))).toEqual({ type: 'adjacentChat', direction: 1 });
    expect(resolveChatHotkey(key('ArrowDown'))).toBeNull();
  });

  it('cycles chats with Ctrl+Tab / Ctrl+Shift+Tab', () => {
    expect(resolveChatHotkey(key('Tab', { ctrlKey: true }))).toEqual({ type: 'adjacentChat', direction: 1 });
    expect(resolveChatHotkey(key('Tab', { ctrlKey: true, shiftKey: true }))).toEqual({ type: 'adjacentChat', direction: -1 });
    expect(resolveChatHotkey(key('Tab'))).toBeNull();
  });

  it('maps Alt+Shift+ArrowUp/Down to adjacent unread chats', () => {
    expect(resolveChatHotkey(key('ArrowUp', { altKey: true, shiftKey: true }))).toEqual({ type: 'adjacentUnread', direction: -1 });
    expect(resolveChatHotkey(key('ArrowDown', { altKey: true, shiftKey: true }))).toEqual({ type: 'adjacentUnread', direction: 1 });
  });

  it('maps Alt+1..6 to folders and ignores Alt+7', () => {
    expect(resolveChatHotkey(key('1', { altKey: true }))).toEqual({ type: 'folder', folder: 'all' });
    expect(resolveChatHotkey(key('3', { altKey: true }))).toEqual({ type: 'folder', folder: 'groups' });
    expect(resolveChatHotkey(key('4', { altKey: true }))).toEqual({ type: 'folder', folder: 'channels' });
    expect(resolveChatHotkey(key('6', { altKey: true }))).toEqual({ type: 'folder', folder: 'saved' });
    expect(resolveChatHotkey(key('7', { altKey: true }))).toBeNull();
  });

  it('maps Ctrl+1..9 to zero-based chat indexes', () => {
    expect(resolveChatHotkey(key('1', { ctrlKey: true }))).toEqual({ type: 'chatIndex', index: 0 });
    expect(resolveChatHotkey(key('9', { metaKey: true }))).toEqual({ type: 'chatIndex', index: 8 });
    expect(resolveChatHotkey(key('0'))).toBeNull();
  });

  it('opens Saved Messages with Ctrl+0', () => {
    expect(resolveChatHotkey(key('0', { ctrlKey: true }))).toEqual({ type: 'savedMessages' });
    expect(resolveChatHotkey(key('0', { metaKey: true }))).toEqual({ type: 'savedMessages' });
  });

  it('maps Ctrl+/ and Ctrl+, to shortcuts and settings', () => {
    expect(resolveChatHotkey(key('/', { ctrlKey: true }))).toEqual({ type: 'shortcuts' });
    expect(resolveChatHotkey(key(',', { ctrlKey: true }))).toEqual({ type: 'settings' });
    expect(resolveChatHotkey(key('/'))).toBeNull();
  });

  it('maps Escape regardless of modifiers and ignores plain typing', () => {
    expect(resolveChatHotkey(key('Escape'))).toEqual({ type: 'escape' });
    expect(resolveChatHotkey(key('a'))).toBeNull();
    expect(resolveChatHotkey(key('Enter'))).toBeNull();
  });
});

describe('adjacentMatchingRoomId', () => {
  const ids = ['a', 'b', 'c', 'd'];
  const unread = new Set(['a', 'c']);
  const isUnread = (id: string) => unread.has(id);

  it('skips rooms that do not match and wraps around', () => {
    expect(adjacentMatchingRoomId(ids, 'a', 1, isUnread)).toBe('c');
    expect(adjacentMatchingRoomId(ids, 'c', 1, isUnread)).toBe('a');
    expect(adjacentMatchingRoomId(ids, 'b', -1, isUnread)).toBe('a');
  });

  it('starts from the edge when the active room is not listed', () => {
    expect(adjacentMatchingRoomId(ids, null, 1, isUnread)).toBe('a');
    expect(adjacentMatchingRoomId(ids, 'x', -1, isUnread)).toBe('c');
  });

  it('returns null when only the active room (or nothing) matches', () => {
    expect(adjacentMatchingRoomId(ids, 'a', 1, (id) => id === 'a')).toBeNull();
    expect(adjacentMatchingRoomId([], null, 1, isUnread)).toBeNull();
  });
});

describe('adjacentRoomId', () => {
  const ids = ['a', 'b', 'c'];

  it('moves forward and backward', () => {
    expect(adjacentRoomId(ids, 'a', 1)).toBe('b');
    expect(adjacentRoomId(ids, 'c', -1)).toBe('b');
  });

  it('wraps around both ends', () => {
    expect(adjacentRoomId(ids, 'c', 1)).toBe('a');
    expect(adjacentRoomId(ids, 'a', -1)).toBe('c');
  });

  it('starts from an edge when the active room is missing', () => {
    expect(adjacentRoomId(ids, null, 1)).toBe('a');
    expect(adjacentRoomId(ids, 'zzz', -1)).toBe('c');
  });

  it('returns null for an empty list', () => {
    expect(adjacentRoomId([], 'a', 1)).toBeNull();
  });
});

describe('toggleInSet', () => {
  it('adds and removes without mutating the input', () => {
    const base = new Set(['x']);
    const added = toggleInSet(base, 'y');
    const removed = toggleInSet(base, 'x');
    expect([...added].sort()).toEqual(['x', 'y']);
    expect(removed.size).toBe(0);
    expect([...base]).toEqual(['x']);
  });
});
