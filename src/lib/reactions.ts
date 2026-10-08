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
