/**
 * Reaction lists for the message context menu (Telegram model): a short strip
 * of quick reactions with the recently used ones first, and the full set in
 * the expanded panel.
 */
import { ANIMATED_EMOJIS, QUICK_REACTIONS } from '../constants';

const RECENT_KEY = 'tg_recent_reactions';
const RECENT_LIMIT = 16;

/** Telegram's default reaction set (order as in the official apps). */
export const ALL_REACTIONS: readonly string[] = [
  '👍', '👎', '❤️', '🔥', '🥰', '👏', '😁', '🤔', '🤯', '😱', '🤬', '😢', '🎉', '🤩', '🤮', '💩',
  '🙏', '👌', '🕊', '🤡', '🥱', '🥴', '😍', '🐳', '❤️‍🔥', '🌚', '🌭', '💯', '🤣', '⚡', '🍌', '🏆',
  '💔', '🤨', '😐', '🍓', '🍾', '💋', '😈', '😴', '😭', '🤓', '👻', '👀', '🎃', '🙈', '😇', '😨',
  '🤝', '✍️', '🤗', '🫡', '🎅', '🎄', '☃️', '💅', '🤪', '🗿', '🆒', '💘', '🙉', '🦄', '😘', '💊',
  '🙊', '😎', '👾', '🤷', '😡',
];

const uniq = (list: readonly string[]) => Array.from(new Set(list));

export function readRecentReactions(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((e): e is string => typeof e === 'string') : [];
  } catch {
    return [];
  }
}

export function rememberReaction(emoji: string): void {
  try {
    const next = [emoji, ...readRecentReactions().filter((e) => e !== emoji)].slice(0, RECENT_LIMIT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — recents are a nicety */
  }
}

/** Strip above the menu: recent reactions first, then the configured quick set. */
export function quickReactionStrip(limit = 8): string[] {
  return uniq([...readRecentReactions().slice(0, 3), ...QUICK_REACTIONS]).slice(0, limit);
}

/** Expanded panel: Telegram's set plus every animated emoji the app ships. */
export function fullReactionList(): string[] {
  return uniq([...QUICK_REACTIONS, ...ALL_REACTIONS, ...Object.keys(ANIMATED_EMOJIS)]);
}

export interface ReactionEntry {
  emoji: string;
  reactors: string[];
  /** Message a click toggles: the one carrying my reaction, else the fallback. */
  targetId: string;
}

/**
 * Reactions of one or more messages (an album is several messages) merged into
 * one row of chips, in order of first appearance. Clicking a chip I already
 * reacted with removes it from the message it lives on; any other chip adds
 * the reaction to `fallbackId` — the message the context menu targets.
 */
export function mergeReactions(
  messages: ReadonlyArray<{ id: string; reactions?: Record<string, string[]> }>,
  currentUser: string | null,
  fallbackId: string,
): ReactionEntry[] {
  const byEmoji = new Map<string, ReactionEntry>();
  for (const m of messages) {
    for (const [emoji, reactors] of Object.entries(m.reactions || {})) {
      if (!reactors?.length) continue;
      const entry = byEmoji.get(emoji) ?? { emoji, reactors: [], targetId: fallbackId };
      for (const id of reactors) if (!entry.reactors.includes(id)) entry.reactors.push(id);
      if (currentUser && reactors.includes(currentUser)) entry.targetId = m.id;
      byEmoji.set(emoji, entry);
    }
  }
  return Array.from(byEmoji.values());
}
