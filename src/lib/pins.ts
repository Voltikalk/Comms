/**
 * Multi-pinned messages per room (Telegram style).
 *
 * State shape: `Record<roomId, messageId[]>` ordered oldest → newest pin.
 * The pin bar shows the pin at `cursor`; clicking it jumps to that message and
 * advances the cursor to the previous (older) pin, wrapping around.
 */

export type PinnedMap = Record<string, string[]>;

export const MAX_PINS_PER_ROOM = 50;
export const PINS_STORAGE_KEY = 'tg_pinned_messages_v2';

export function getPins(map: PinnedMap, roomId: string): string[] {
  return map[roomId] ?? [];
}

export function isPinned(map: PinnedMap, roomId: string, messageId: string): boolean {
  return getPins(map, roomId).includes(messageId);
}

/** Pins (appends as newest) or unpins. Returns a new map; never mutates. */
export function togglePin(map: PinnedMap, roomId: string, messageId: string): { map: PinnedMap; pinned: boolean } {
  const current = getPins(map, roomId);
  if (current.includes(messageId)) {
    const next = current.filter((id) => id !== messageId);
    const copy = { ...map };
    if (next.length) copy[roomId] = next;
    else delete copy[roomId];
    return { map: copy, pinned: false };
  }
  const next = [...current, messageId].slice(-MAX_PINS_PER_ROOM);
  return { map: { ...map, [roomId]: next }, pinned: true };
}

export function unpinAll(map: PinnedMap, roomId: string): PinnedMap {
  const copy = { ...map };
  delete copy[roomId];
  return copy;
}

/** Drops pins whose messages no longer exist (deleted / expired). */
export function prunePins(map: PinnedMap, roomId: string, existingIds: ReadonlySet<string>): PinnedMap {
  const current = getPins(map, roomId);
  const next = current.filter((id) => existingIds.has(id));
  if (next.length === current.length) return map;
  const copy = { ...map };
  if (next.length) copy[roomId] = next;
  else delete copy[roomId];
  return copy;
}

/** Clamp a cursor into range; `-1`/out-of-range → newest pin. */
export function normalizeCursor(count: number, cursor: number): number {
  if (count <= 0) return 0;
  if (cursor < 0 || cursor >= count) return count - 1;
  return cursor;
}

/** Next cursor after clicking the bar: walk towards older pins, wrap to newest. */
export function nextPinCursor(count: number, cursor: number): number {
  if (count <= 0) return 0;
  const c = normalizeCursor(count, cursor);
  return c === 0 ? count - 1 : c - 1;
}

/** 1-based label for the bar, e.g. "Закреплённое сообщение #2". */
export function pinLabel(count: number, cursor: number): string {
  if (count <= 1) return 'Закреплённое сообщение';
  return `Закреплённое сообщение #${normalizeCursor(count, cursor) + 1}`;
}

/** Accepts the legacy `Record<string, string>` (single pin) format and upgrades it. */
export function parsePinnedMap(raw: string | null): PinnedMap {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: PinnedMap = {};
    for (const [roomId, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === 'string' && v) out[roomId] = [v];
      else if (Array.isArray(v)) {
        const ids = v.filter((x): x is string => typeof x === 'string' && x.length > 0);
        if (ids.length) out[roomId] = Array.from(new Set(ids)).slice(-MAX_PINS_PER_ROOM);
      }
    }
    return out;
  } catch {
    return {};
  }
}
