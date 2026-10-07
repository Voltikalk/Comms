import { describe, expect, it } from 'vitest';
import { adjacentRoomId, resolveChatHotkey, toggleInSet } from './chat-hotkeys';

const key = (k: string, mods: Partial<{ ctrlKey: boolean; metaKey: boolean; altKey: boolean }> = {}) => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
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

  it('maps Alt+1..5 to folders and ignores Alt+6', () => {
    expect(resolveChatHotkey(key('1', { altKey: true }))).toEqual({ type: 'folder', folder: 'all' });
    expect(resolveChatHotkey(key('3', { altKey: true }))).toEqual({ type: 'folder', folder: 'groups' });
    expect(resolveChatHotkey(key('5', { altKey: true }))).toEqual({ type: 'folder', folder: 'saved' });
    expect(resolveChatHotkey(key('6', { altKey: true }))).toBeNull();
  });

  it('maps Ctrl+1..9 to zero-based chat indexes', () => {
    expect(resolveChatHotkey(key('1', { ctrlKey: true }))).toEqual({ type: 'chatIndex', index: 0 });
    expect(resolveChatHotkey(key('9', { metaKey: true }))).toEqual({ type: 'chatIndex', index: 8 });
    expect(resolveChatHotkey(key('0', { ctrlKey: true }))).toBeNull();
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
