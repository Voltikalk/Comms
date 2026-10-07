import { describe, it, expect } from 'vitest';
import {
  getPins,
  isPinned,
  MAX_PINS_PER_ROOM,
  nextPinCursor,
  normalizeCursor,
  parsePinnedMap,
  pinLabel,
  prunePins,
  togglePin,
  unpinAll,
  type PinnedMap,
} from './pins';

describe('multi-pinned messages', () => {
  it('pins multiple messages per room in order and unpins', () => {
    let map: PinnedMap = {};
    map = togglePin(map, 'r', 'a').map;
    map = togglePin(map, 'r', 'b').map;
    expect(getPins(map, 'r')).toEqual(['a', 'b']);
    expect(isPinned(map, 'r', 'a')).toBe(true);
    const res = togglePin(map, 'r', 'a');
    expect(res.pinned).toBe(false);
    expect(getPins(res.map, 'r')).toEqual(['b']);
    expect(togglePin(res.map, 'r', 'b').map).toEqual({});
  });

  it('does not mutate the input map', () => {
    const map: PinnedMap = { r: ['a'] };
    togglePin(map, 'r', 'b');
    expect(map).toEqual({ r: ['a'] });
  });

  it('caps pins per room', () => {
    let map: PinnedMap = {};
    for (let i = 0; i < MAX_PINS_PER_ROOM + 5; i += 1) map = togglePin(map, 'r', `m${i}`).map;
    expect(getPins(map, 'r')).toHaveLength(MAX_PINS_PER_ROOM);
    expect(getPins(map, 'r')[0]).toBe('m5');
  });

  it('cycles from newest towards oldest and wraps', () => {
    expect(normalizeCursor(3, -1)).toBe(2);
    expect(nextPinCursor(3, 2)).toBe(1);
    expect(nextPinCursor(3, 1)).toBe(0);
    expect(nextPinCursor(3, 0)).toBe(2);
    expect(nextPinCursor(0, 0)).toBe(0);
  });

  it('labels the bar with the pin index when there are several', () => {
    expect(pinLabel(1, 0)).toBe('Закреплённое сообщение');
    expect(pinLabel(3, 1)).toBe('Закреплённое сообщение #2');
  });

  it('prunes deleted messages and unpins all', () => {
    const map: PinnedMap = { r: ['a', 'b', 'c'], s: ['z'] };
    expect(prunePins(map, 'r', new Set(['a', 'c']))).toEqual({ r: ['a', 'c'], s: ['z'] });
    expect(prunePins(map, 'r', new Set())).toEqual({ s: ['z'] });
    expect(prunePins(map, 'r', new Set(['a', 'b', 'c']))).toBe(map);
    expect(unpinAll(map, 'r')).toEqual({ s: ['z'] });
  });

  it('parses and upgrades the legacy single-pin format', () => {
    expect(parsePinnedMap(JSON.stringify({ r: 'a', s: ['b', 'b', 'c', 1] }))).toEqual({ r: ['a'], s: ['b', 'c'] });
    expect(parsePinnedMap('not json')).toEqual({});
    expect(parsePinnedMap(null)).toEqual({});
    expect(parsePinnedMap('[]')).toEqual({});
  });
});
