import { describe, it, expect } from 'vitest';
import type { Message } from '../types';
import {
  buildFeedEntries,
  canAlbumWith,
  canClusterWith,
  getAlbumLayout,
  getAlbumTileRadius,
  getBubbleCorners,
  ALBUM_MAX_ITEMS,
} from './message-grouping';

const T0 = new Date(2026, 9, 7, 12, 0, 0).getTime();

const msg = (id: string, over: Partial<Message> = {}): Message => ({
  id,
  roomId: 'r1',
  sender: 'vlad',
  text: 'hi',
  timestamp: T0,
  ...over,
});

const photo = (id: string, over: Partial<Message> = {}): Message =>
  msg(id, { text: '', file: { name: `${id}.jpg`, type: 'image', data: `/uploads/${id}.jpg`, size: 10 }, ...over });

describe('message clustering', () => {
  it('clusters same author within 5 minutes on the same day', () => {
    expect(canClusterWith(msg('a'), msg('b', { timestamp: T0 + 60_000 }))).toBe(true);
    expect(canClusterWith(msg('a'), msg('b', { timestamp: T0 + 6 * 60_000 }))).toBe(false);
    expect(canClusterWith(msg('a'), msg('b', { sender: 'anya' }))).toBe(false);
    expect(canClusterWith(msg('a'), msg('b', { replyToId: 'a' }))).toBe(false);
    expect(canClusterWith(null, msg('b'))).toBe(false);
  });

  it('marks tail only on the last bubble of a run', () => {
    const entries = buildFeedEntries([
      msg('1'),
      msg('2', { timestamp: T0 + 1000 }),
      msg('3', { timestamp: T0 + 2000 }),
      msg('4', { sender: 'anya', timestamp: T0 + 3000 }),
    ]);
    expect(entries.map((e) => [e.groupedAbove, e.groupedBelow])).toEqual([
      [false, true],
      [true, true],
      [true, false],
      [false, false],
    ]);
    expect(entries.map((e) => getBubbleCorners(true, e.groupedAbove, e.groupedBelow).showTail)).toEqual([
      false,
      false,
      true,
      true,
    ]);
  });

  it('inserts date separators and group sender labels', () => {
    const nextDay = T0 + 24 * 3600_000;
    const entries = buildFeedEntries(
      [msg('1'), msg('2', { timestamp: T0 + 1000 }), msg('3', { timestamp: nextDay })],
      { isGroupChat: true },
    );
    expect(entries.map((e) => e.showDateSeparator)).toEqual([true, false, true]);
    expect(entries.map((e) => e.showSenderLabel)).toEqual([true, false, true]);
  });
});

describe('adaptive bubble corners', () => {
  it('uses small radius on author side for middle bubbles', () => {
    expect(getBubbleCorners(true, true, true)).toEqual({
      topLeft: 18,
      bottomLeft: 18,
      topRight: 4,
      bottomRight: 4,
      showTail: false,
    });
  });

  it('swaps the bottom author corner for the tail on peer last bubble', () => {
    const c = getBubbleCorners(false, true, false);
    expect(c.bottomLeft).toBe(0);
    expect(c.topLeft).toBe(4);
    expect(c.topRight).toBe(18);
    expect(c.showTail).toBe(true);
  });
});

describe('album grouping', () => {
  it('groups caption-less media sent within 1.5s', () => {
    expect(canAlbumWith(photo('a'), photo('b', { timestamp: T0 + 500 }))).toBe(true);
    expect(canAlbumWith(photo('a'), photo('b', { timestamp: T0 + 5000 }))).toBe(false);
    expect(canAlbumWith(photo('a'), msg('b'))).toBe(false);
  });

  it('respects explicit albumId', () => {
    expect(canAlbumWith(photo('a', { albumId: 'x', text: 'cap' }), photo('b', { albumId: 'x', timestamp: T0 + 60_000 }))).toBe(
      true,
    );
    expect(canAlbumWith(photo('a', { albumId: 'x' }), photo('b', { albumId: 'y' }))).toBe(false);
    expect(canAlbumWith(photo('a', { albumId: 'x' }), photo('b'))).toBe(false);
  });

  it('collapses albums into a single entry with the last message as representative', () => {
    const entries = buildFeedEntries([msg('t'), photo('p1', { albumId: 'A' }), photo('p2', { albumId: 'A' }), photo('p3', { albumId: 'A' })]);
    expect(entries).toHaveLength(2);
    const album = entries[1];
    expect(album.kind).toBe('album');
    if (album.kind === 'album') {
      expect(album.items.map((m) => m.id)).toEqual(['p1', 'p2', 'p3']);
      expect(album.message.id).toBe('p3');
      expect(album.key).toBe('p1');
    }
  });

  it('splits albums larger than 10 items', () => {
    const items = Array.from({ length: 12 }, (_, i) => photo(`p${i}`, { albumId: 'A' }));
    const entries = buildFeedEntries(items);
    expect(entries.map((e) => (e.kind === 'album' ? e.items.length : 1))).toEqual([ALBUM_MAX_ITEMS, 2]);
  });

  it('degrades a single media to a plain message entry', () => {
    const entries = buildFeedEntries([photo('solo', { albumId: 'A' })]);
    expect(entries[0].kind).toBe('message');
  });
});

describe('bento layout', () => {
  it.each([2, 3, 4, 5, 6, 7, 8, 9, 10])('fills a 6-column grid exactly for %i tiles', (n) => {
    const layout = getAlbumLayout(n);
    expect(layout.cells).toHaveLength(n);
    const area = layout.cells.reduce((s, c) => s + c.colSpan * c.rowSpan, 0);
    expect(area).toBe(layout.columns * layout.rows);
  });

  it('rounds only the outer corners of the collage', () => {
    const layout = getAlbumLayout(4); // 2x2
    expect(getAlbumTileRadius(layout, 0, 18)).toBe('18px 2px 2px 2px');
    expect(getAlbumTileRadius(layout, 1, 18)).toBe('2px 18px 2px 2px');
    expect(getAlbumTileRadius(layout, 2, 18)).toBe('2px 2px 2px 18px');
    expect(getAlbumTileRadius(layout, 3, 18)).toBe('2px 2px 18px 2px');
  });

  it('handles the 3-tile hero layout', () => {
    const layout = getAlbumLayout(3);
    expect(getAlbumTileRadius(layout, 0, 10)).toBe('10px 2px 2px 10px');
    expect(getAlbumTileRadius(layout, 1, 10)).toBe('2px 10px 2px 2px');
    expect(getAlbumTileRadius(layout, 2, 10)).toBe('2px 2px 10px 2px');
  });
});
