/**
 * Telegram-style message clustering & album (bento) grouping.
 *
 * Pure functions only — consumed by `ChatMessageFeed` and covered by
 * `message-grouping.test.ts`.
 */
import type { Message } from '../types';

/** Max gap between two messages of one author that still form a visual cluster. */
export const CLUSTER_WINDOW_MS = 5 * 60 * 1000;
/** Max gap between media items that were sent "together" without an explicit albumId. */
export const ALBUM_WINDOW_MS = 1500;
export const ALBUM_MIN_ITEMS = 2;
export const ALBUM_MAX_ITEMS = 10;

/** Large / small bubble radii (px), mirrored in `telegram-tokens.css`. */
export const BUBBLE_RADIUS = 18;
export const BUBBLE_RADIUS_GROUPED = 4;

const isSameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();

/** Two adjacent messages belong to one cluster: same author, < 5 min apart, same day, `b` is not a reply. */
export function canClusterWith(a: Message | null | undefined, b: Message | null | undefined): boolean {
  if (!a || !b) return false;
  return (
    a.sender === b.sender &&
    !b.replyToId &&
    b.timestamp - a.timestamp >= 0 &&
    b.timestamp - a.timestamp < CLUSTER_WINDOW_MS &&
    isSameDay(a.timestamp, b.timestamp)
  );
}

export function isAlbumMedia(m: Message): boolean {
  return !!m.file && (m.file.type === 'image' || m.file.type === 'video') && !m.poll && !m.sticker;
}

/** `b` continues the album started by `a`. Explicit `albumId` wins; otherwise caption-less media sent within 1.5s. */
export function canAlbumWith(a: Message, b: Message): boolean {
  if (!isAlbumMedia(a) || !isAlbumMedia(b) || a.sender !== b.sender) return false;
  if (a.albumId || b.albumId) return !!a.albumId && a.albumId === b.albumId;
  return (
    !b.replyToId &&
    !a.text.trim() &&
    !b.text.trim() &&
    b.timestamp - a.timestamp >= 0 &&
    b.timestamp - a.timestamp <= ALBUM_WINDOW_MS
  );
}

export interface FeedEntryBase {
  /** Stable React key (first message id). */
  key: string;
  /** Representative message (last one in an album — carries timestamp / status / caption). */
  message: Message;
  showDateSeparator: boolean;
  groupedAbove: boolean;
  groupedBelow: boolean;
  showSenderLabel: boolean;
}

export interface FeedMessageEntry extends FeedEntryBase {
  kind: 'message';
}

export interface FeedAlbumEntry extends FeedEntryBase {
  kind: 'album';
  items: Message[];
}

export type FeedEntry = FeedMessageEntry | FeedAlbumEntry;

/**
 * Collapses a chronologically sorted message list into feed entries:
 * - runs of 2–10 album media become one `album` entry,
 * - every entry knows whether it is clustered with its neighbours (for radii / tails),
 * - date separators and group sender labels are pre-computed.
 */
export function buildFeedEntries(messages: Message[], opts: { isGroupChat?: boolean } = {}): FeedEntry[] {
  // Pass 1: chunk into albums / singles.
  const chunks: Message[][] = [];
  for (const m of messages) {
    const last = chunks[chunks.length - 1];
    const tail = last?.[last.length - 1];
    if (last && tail && last.length < ALBUM_MAX_ITEMS && canAlbumWith(tail, m) && isSameDay(tail.timestamp, m.timestamp)) {
      last.push(m);
    } else {
      chunks.push([m]);
    }
  }

  // Albums with a single item degrade to a plain message.
  const units = chunks.map((items) => ({
    items,
    first: items[0],
    last: items[items.length - 1],
    isAlbum: items.length >= ALBUM_MIN_ITEMS,
  }));

  return units.map((unit, i): FeedEntry => {
    const prev = i > 0 ? units[i - 1] : null;
    const next = i < units.length - 1 ? units[i + 1] : null;
    const showDateSeparator = !prev || !isSameDay(prev.last.timestamp, unit.first.timestamp);
    const groupedAbove = !!prev && canClusterWith(prev.last, unit.first);
    const groupedBelow = !!next && canClusterWith(unit.last, next.first);
    const isSameSender = !!prev && prev.last.sender === unit.first.sender && !showDateSeparator;
    const base: FeedEntryBase = {
      key: unit.first.id,
      message: unit.isAlbum ? unit.last : unit.first,
      showDateSeparator,
      groupedAbove,
      groupedBelow,
      showSenderLabel: !!opts.isGroupChat && !isSameSender,
    };
    return unit.isAlbum ? { ...base, kind: 'album', items: unit.items } : { ...base, kind: 'message' };
  });
}

export interface BubbleCorners {
  topLeft: number;
  topRight: number;
  bottomLeft: number;
  bottomRight: number;
  /** Render the SVG tail (`.tg-tail-self` / `.tg-tail-peer`) — only on the last message of a cluster. */
  showTail: boolean;
}

/**
 * Adaptive radii for a bubble inside a cluster. The author side gets the small
 * radius where the bubble touches a neighbour; the last bubble swaps its
 * bottom author corner for the tail.
 */
export function getBubbleCorners(isSelf: boolean, groupedAbove: boolean, groupedBelow: boolean): BubbleCorners {
  const big = BUBBLE_RADIUS;
  const small = BUBBLE_RADIUS_GROUPED;
  const showTail = !groupedBelow;
  const authorTop = groupedAbove ? small : big;
  const authorBottom = showTail ? 0 : small;
  return isSelf
    ? { topLeft: big, bottomLeft: big, topRight: authorTop, bottomRight: authorBottom, showTail }
    : { topRight: big, bottomRight: big, topLeft: authorTop, bottomLeft: authorBottom, showTail };
}

export interface AlbumCell {
  /** CSS grid column span (grid is always 6 columns wide). */
  colSpan: number;
  /** CSS grid row span. */
  rowSpan: number;
}

export interface AlbumLayout {
  columns: 6;
  rows: number;
  cells: AlbumCell[];
}

/**
 * Bento layout for 2–10 tiles on a 6-column grid. The first tile is the hero
 * for odd counts; remaining rows are split into pairs / triples.
 */
export function getAlbumLayout(count: number): AlbumLayout {
  const n = Math.max(1, Math.min(ALBUM_MAX_ITEMS, Math.floor(count)));
  if (n === 1) return { columns: 6, rows: 1, cells: [{ colSpan: 6, rowSpan: 2 }] };
  if (n === 2) return { columns: 6, rows: 2, cells: [{ colSpan: 3, rowSpan: 2 }, { colSpan: 3, rowSpan: 2 }] };
  if (n === 3) {
    return {
      columns: 6,
      rows: 2,
      cells: [{ colSpan: 4, rowSpan: 2 }, { colSpan: 2, rowSpan: 1 }, { colSpan: 2, rowSpan: 1 }],
    };
  }

  // n >= 4: hero row (full width when odd), then rows of 2 or 3 tiles.
  const cells: AlbumCell[] = [];
  let remaining = n;
  let rows = 0;
  if (n % 2 === 1) {
    cells.push({ colSpan: 6, rowSpan: 2 });
    rows += 2;
    remaining -= 1;
  }
  while (remaining > 0) {
    // Prefer rows of 3 while the leftover can still be split into 2s/3s cleanly.
    const take = remaining === 4 || remaining === 2 ? 2 : 3;
    for (let k = 0; k < take; k += 1) cells.push({ colSpan: 6 / take, rowSpan: 1 });
    rows += 1;
    remaining -= take;
  }
  return { columns: 6, rows, cells };
}

/** Outer-corner rounding for a tile so the collage reads as one rounded rectangle. */
export function getAlbumTileRadius(layout: AlbumLayout, index: number, radius = BUBBLE_RADIUS): string {
  // Reconstruct tile positions by flowing cells through the grid.
  const occupied: boolean[][] = [];
  const pos: Array<{ r: number; c: number; cell: AlbumCell }> = [];
  let r = 0;
  let c = 0;
  const isFree = (row: number, col: number) => !occupied[row]?.[col];
  for (const cell of layout.cells) {
    while (!isFree(r, c)) {
      c += 1;
      if (c >= layout.columns) {
        c = 0;
        r += 1;
      }
    }
    while (c + cell.colSpan > layout.columns || ![...Array(cell.colSpan)].every((_, k) => isFree(r, c + k))) {
      c += 1;
      if (c >= layout.columns) {
        c = 0;
        r += 1;
      }
    }
    for (let dr = 0; dr < cell.rowSpan; dr += 1) {
      occupied[r + dr] = occupied[r + dr] || [];
      for (let dc = 0; dc < cell.colSpan; dc += 1) occupied[r + dr][c + dc] = true;
    }
    pos.push({ r, c, cell });
  }
  const p = pos[index];
  if (!p) return '0';
  const top = p.r === 0;
  const bottom = p.r + p.cell.rowSpan >= layout.rows;
  const left = p.c === 0;
  const right = p.c + p.cell.colSpan >= layout.columns;
  const px = (on: boolean) => (on ? `${radius}px` : '2px');
  return `${px(top && left)} ${px(top && right)} ${px(bottom && right)} ${px(bottom && left)}`;
}
