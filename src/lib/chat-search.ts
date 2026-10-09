import type { Message } from '../types';

/**
 * Pure helpers behind the sidebar search (Telegram-style): forgiving text
 * matching with highlight ranges, message search with snippets and the
 * Media / Links / Files / Voice categories.
 */

/** Half-open `[start, end)` character range inside the displayed text. */
export type MatchRange = readonly [number, number];

export interface TextMatch {
  /** Higher is better: exact > prefix > word start > substring > fuzzy. */
  score: number;
  /** Ranges to highlight; empty when the match came from transliteration. */
  ranges: MatchRange[];
}

// ── Normalisation ────────────────────────────────────────────────────────────

/**
 * Lower case, «ё» → «е», Latin diacritics dropped («é» → «e»). Cyrillic «й»
 * survives (NFD splits it too, so only Latin letters lose their marks). The
 * length is preserved for normal text, which keeps highlight ranges valid.
 */
export function normalizeSearch(s: string): string {
  return s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .normalize('NFD')
    .replace(/([a-z])[\u0300-\u036f]+/g, '$1')
    .normalize('NFC');
}

const EN_KEYS = "qwertyuiop[]asdfghjkl;'zxcvbnm,.`";
const RU_KEYS = 'йцукенгшщзхъфывапролджэячсмитьбюё';
const EN_TO_RU = new Map([...EN_KEYS].map((c, i) => [c, RU_KEYS[i]]));
const RU_TO_EN = new Map([...RU_KEYS].map((c, i) => [c, EN_KEYS[i]]));

/**
 * The same keys typed in the other layout: «ghbdtn» ↔ «привет». Picks the
 * direction from the letters present; returns '' when nothing changes.
 */
export function swapKeyboardLayout(s: string): string {
  const lower = s.toLowerCase();
  const hasRu = /[а-яё]/.test(lower);
  const hasEn = /[a-z]/.test(lower);
  if (hasRu === hasEn) return '';
  const map = hasEn ? EN_TO_RU : RU_TO_EN;
  const out = [...lower].map((c) => map.get(c) ?? c).join('');
  return out === lower ? '' : out;
}

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

/** Cyrillic → Latin so «anya» finds «Аня». Expects normalised input. */
export function transliterate(s: string): string {
  return [...s].map((c) => TRANSLIT[c] ?? c).join('');
}

/** Normalised query plus its other-layout twin, without duplicates. */
export function searchVariants(query: string): string[] {
  const q = normalizeSearch(query.trim().replace(/\s+/g, ' '));
  if (!q) return [];
  const swapped = normalizeSearch(swapKeyboardLayout(q));
  return swapped && swapped !== q ? [q, swapped] : [q];
}

// ── Text matching ────────────────────────────────────────────────────────────

const isWordChar = (c: string | undefined) => !!c && /[\p{L}\p{N}]/u.test(c);

/** First occurrence of `needle` starting a word, else -1. */
function wordStartIndex(hay: string, needle: string): number {
  let i = hay.indexOf(needle);
  while (i !== -1) {
    if (i === 0 || !isWordChar(hay[i - 1])) return i;
    i = hay.indexOf(needle, i + 1);
  }
  return -1;
}

function matchVariant(text: string, norm: string, v: string): TextMatch | null {
  // Ranges are only trustworthy when normalisation kept the length.
  const ranged = (start: number, len: number): MatchRange[] => (norm.length === text.length ? [[start, start + len]] : []);
  if (norm === v) return { score: 1000, ranges: ranged(0, v.length) };
  if (norm.startsWith(v)) return { score: 900, ranges: ranged(0, v.length) };
  const ws = wordStartIndex(norm, v);
  if (ws !== -1) return { score: 700, ranges: ranged(ws, v.length) };
  const sub = norm.indexOf(v);
  if (sub !== -1) return { score: 400, ranges: ranged(sub, v.length) };

  // Several words in any order: «петров влад» → «Влад Петров».
  const tokens = v.split(' ').filter(Boolean);
  if (tokens.length > 1) {
    const ranges: MatchRange[] = [];
    let allWordStarts = true;
    for (const t of tokens) {
      let at = wordStartIndex(norm, t);
      if (at === -1) {
        allWordStarts = false;
        at = norm.indexOf(t);
      }
      if (at === -1) return null;
      ranges.push(...ranged(at, t.length));
    }
    return { score: allWordStarts ? 600 : 350, ranges: ranges.sort((a, b) => a[0] - b[0]) };
  }
  return null;
}

/**
 * How well `text` matches the query (pass `searchVariants(query)`): exact,
 * prefix, word start, substring, words in any order, then the other keyboard
 * layout and transliteration as lower-ranked fallbacks.
 */
export function matchText(text: string | undefined | null, variants: readonly string[]): TextMatch | null {
  if (!text || variants.length === 0) return null;
  const norm = normalizeSearch(text);
  let best: TextMatch | null = null;
  variants.forEach((v, i) => {
    const m = matchVariant(text, norm, v);
    // The other-layout guess ranks just below the query as typed.
    if (m && (!best || m.score - i * 50 > best.score)) best = { score: m.score - i * 50, ranges: m.ranges };
  });
  if (best) return best;

  // «anya» → «Аня»: compare against the transliterated text.
  const latin = variants.find((v) => /^[a-z0-9 ]+$/.test(v));
  if (latin && /[а-я]/.test(norm)) {
    const tr = transliterate(norm);
    if (tr.startsWith(latin)) return { score: 300, ranges: [] };
    if (wordStartIndex(tr, latin) !== -1) return { score: 250, ranges: [] };
  }
  return null;
}

/** Splits text into plain / highlighted parts for rendering. */
export function splitHighlight(text: string, ranges: readonly MatchRange[]): { text: string; hit: boolean }[] {
  if (ranges.length === 0) return [{ text, hit: false }];
  const parts: { text: string; hit: boolean }[] = [];
  let pos = 0;
  for (const [s, e] of [...ranges].sort((a, b) => a[0] - b[0])) {
    const start = Math.max(s, pos);
    if (start >= e) continue;
    if (start > pos) parts.push({ text: text.slice(pos, start), hit: false });
    parts.push({ text: text.slice(start, e), hit: true });
    pos = e;
  }
  if (pos < text.length) parts.push({ text: text.slice(pos), hit: false });
  return parts;
}

/**
 * Cuts a one-line snippet around the first match so it stays visible in a
 * narrow row: up to `before` characters of context, then «…» on the cut side.
 */
export function makeSnippet(
  text: string,
  ranges: readonly MatchRange[],
  before = 24
): { text: string; ranges: MatchRange[] } {
  const flat = text.replace(/\s+/g, ' ');
  // Collapsing whitespace may shift offsets; fall back to the unhighlighted line.
  const safe = flat.length === text.length ? ranges : [];
  const first = safe[0]?.[0] ?? 0;
  if (first <= before) return { text: flat, ranges: [...safe] };
  // Start at a word boundary inside the context window when there is one.
  let start = first - before;
  const space = flat.indexOf(' ', start);
  if (space !== -1 && space < first) start = space + 1;
  const shift = start - 1; // «…» takes one character
  return {
    text: `…${flat.slice(start)}`,
    ranges: safe.map(([s, e]) => [s - shift, e - shift] as const).filter(([s]) => s >= 1),
  };
}

// ── Messages ─────────────────────────────────────────────────────────────────

export type SearchCategory = 'chats' | 'messages' | 'media' | 'links' | 'files' | 'voice';

export const SEARCH_CATEGORIES: { id: SearchCategory; label: string }[] = [
  { id: 'chats', label: 'Чаты' },
  { id: 'messages', label: 'Сообщения' },
  { id: 'media', label: 'Медиа' },
  { id: 'links', label: 'Ссылки' },
  { id: 'files', label: 'Файлы' },
  { id: 'voice', label: 'Голосовые' },
];

const FWD_PREFIX = /^[\u200B\s]*\[fwd:[^\]]+\][\u200B\s]*/;
const LEGACY_FWD_PREFIX = /^\[Переслано от [^\]]+\]:\s*/;
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"']+[^\s<>"'.,;:!?)\]]/gi;

/** Message text as the user sees it (no forward markers). */
export function messageSearchText(m: Pick<Message, 'text'>): string {
  return (m.text || '').replace(FWD_PREFIX, '').replace(LEGACY_FWD_PREFIX, '');
}

/** Links in a message, in order, without duplicates. */
export function extractLinks(text: string): string[] {
  return [...new Set(text.match(URL_RE) ?? [])];
}

/** Host shown for a link row: «https://www.youtube.com/watch» → «youtube.com». */
export function linkHost(url: string): string {
  try {
    return new URL(/^https?:/i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Which category tabs a message belongs to (besides «Сообщения»). */
export function messageCategory(m: Pick<Message, 'file' | 'text'>): Exclude<SearchCategory, 'chats' | 'messages'> | null {
  const t = m.file?.type;
  if (t === 'image' || t === 'video' || t === 'video_note') return 'media';
  if (t === 'audio') return 'voice';
  if (t === 'file') return 'files';
  if (!t && extractLinks(messageSearchText(m)).length > 0) return 'links';
  return null;
}

export interface MessageHit {
  message: Message;
  /** One-line text for the row, already cut around the match. */
  snippet: string;
  ranges: MatchRange[];
}

export interface MessageSearchOptions {
  /** Restrict to a category tab; `'messages'` = any message with matching content. */
  category?: Exclude<SearchCategory, 'chats'>;
  /** In category tabs a message also matches by its chat or sender name. */
  roomName?: (roomId: string) => string;
  senderName?: (userId: string) => string;
  limit?: number;
}

/** What a message row shows when it has no text of its own. */
function fallbackLabel(m: Message): string {
  if (m.poll) return m.poll.question;
  if (m.file) {
    if (m.file.type === 'image') return 'Фотография';
    if (m.file.type === 'video') return 'Видео';
    if (m.file.type === 'video_note') return 'Видеосообщение';
    if (m.file.type === 'audio') return 'Голосовое сообщение';
    if (m.file.type === 'sticker') return 'Стикер';
    return m.file.name;
  }
  if (m.sticker) return 'Стикер';
  return '';
}

/**
 * Searches loaded messages, newest first. Content = text, poll question and
 * options, file name. In category tabs the chat / sender name counts too, so
 * «Аня» + «Медиа» lists every photo from the chat with Аня.
 *
 * Queries shorter than four letters only match at word starts, so «аня»
 * finds «Аня придёт» but not «занятия».
 */
export function searchMessages(messages: readonly Message[], query: string, opts: MessageSearchOptions = {}): MessageHit[] {
  const variants = searchVariants(query);
  if (variants.length === 0) return [];
  const { category = 'messages', roomName, senderName, limit = 300 } = opts;
  const minScore = variants[0].length < 4 ? 500 : 0;
  const content = (s: string | undefined) => {
    const hit = matchText(s, variants);
    return hit && hit.score >= minScore ? hit : null;
  };
  const hits: MessageHit[] = [];
  const sorted = [...messages].sort((a, b) => b.timestamp - a.timestamp);

  for (const m of sorted) {
    if (m.service || m.scheduledAt || (m.encrypted && !m.text)) continue;
    if (category !== 'messages' && messageCategory(m) !== category) continue;

    const text = messageSearchText(m);
    const shown = text || fallbackLabel(m);
    const textHit = content(text);
    // A hit in the line the row shows (text, file name, poll question) gets highlighted.
    // («Фотография» and other type labels are not content.)
    const shownHit = textHit ?? (!text && (m.file?.type === 'file' || m.poll) ? content(shown) : null);
    const contentHit =
      shownHit ??
      content(m.file?.type === 'file' ? m.file.name : undefined) ??
      content(m.poll?.question) ??
      (m.poll?.options?.some((o) => content(o.text)) ? { score: 100, ranges: [] } : null);

    const contextHit =
      !contentHit &&
      category !== 'messages' &&
      (!!matchText(roomName?.(m.roomId), variants) || !!matchText(senderName?.(m.sender), variants));
    if (!contentHit && !contextHit) continue;

    const snip = makeSnippet(shown, shownHit?.ranges ?? []);
    hits.push({ message: m, snippet: snip.text, ranges: snip.ranges });
    if (hits.length >= limit) break;
  }
  return hits;
}

// ── Presentation helpers ─────────────────────────────────────────────────────

/** Telegram list date: time today, weekday this week, short date otherwise. */
export function formatSearchDate(ts: number, now = Date.now()): string {
  const date = new Date(ts);
  const today = new Date(now);
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (ts > startOfToday - 6 * 86400000) {
    const day = date.toLocaleDateString('ru-RU', { weekday: 'short' });
    return day.charAt(0).toUpperCase() + day.slice(1);
  }
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    ...(date.getFullYear() === today.getFullYear() ? {} : { year: '2-digit' }),
  });
}

/** Most-recent-first list of ids without duplicates, capped at `max`. */
export function pushRecent(list: readonly string[], id: string, max = 12): string[] {
  return [id, ...list.filter((x) => x !== id)].slice(0, max);
}

/**
 * «Часто пишете»: rooms ranked by how many of the loaded messages the user
 * sent there recently (last 30 days), ties broken by the latest activity.
 */
export function topRooms(messages: readonly Message[], me: string, roomIds: ReadonlySet<string>, now = Date.now(), max = 8): string[] {
  const since = now - 30 * 86400000;
  const stats = new Map<string, { n: number; last: number }>();
  for (const m of messages) {
    if (m.sender !== me || m.timestamp < since || !roomIds.has(m.roomId) || m.service) continue;
    const s = stats.get(m.roomId) ?? { n: 0, last: 0 };
    s.n += 1;
    s.last = Math.max(s.last, m.timestamp);
    stats.set(m.roomId, s);
  }
  return [...stats.entries()]
    .sort((a, b) => b[1].n - a[1].n || b[1].last - a[1].last)
    .slice(0, max)
    .map(([id]) => id);
}
