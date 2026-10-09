/**
 * Pure helpers for stories: reactions (one per viewer, toggled), the author's
 * viewers list and the order in which authors are shown in the bar/viewer.
 * Mirrors the server rules in `server/sockets/stories.js`.
 */
import type { UserId } from '../types';
import type { Story } from '../types/story.types';

/** The emoji `user` reacted with, if any. */
export function reactionOf(story: Story, user: string): string | undefined {
  return Object.entries(story.reactions ?? {}).find(([, users]) => users.includes(user as UserId))?.[0];
}

/**
 * One reaction per viewer: a new emoji replaces the previous one and the same
 * emoji removes it. Reacting also counts as a view.
 */
export function applyStoryReaction(story: Story, user: string, emoji: string): Story {
  const me = user as UserId;
  const hadSame = story.reactions?.[emoji]?.includes(me) ?? false;
  const reactions: Record<string, UserId[]> = {};
  for (const [key, users] of Object.entries(story.reactions ?? {})) {
    const rest = users.filter((u) => u !== me);
    if (rest.length > 0) reactions[key] = rest;
  }
  if (!hadSame) reactions[emoji] = [...(reactions[emoji] ?? []), me];
  const views = story.views.includes(me) ? story.views : [...story.views, me];
  return { ...story, reactions, views };
}

export interface StoryViewerEntry {
  userId: UserId;
  emoji?: string;
  /** When the story was opened (ms epoch), if the server recorded it. */
  at?: number;
}

/** Author's viewers list: people who reacted first, then everyone by most recent view. */
export function storyViewerEntries(story: Story): StoryViewerEntry[] {
  const emojiBy = new Map<string, string>();
  for (const [emoji, users] of Object.entries(story.reactions ?? {})) users.forEach((u) => emojiBy.set(u, emoji));
  // `views` is in viewing order, so the index breaks ties for views without a recorded time.
  return story.views
    .map((userId, i) => ({ userId, emoji: emojiBy.get(userId), at: story.viewTimes?.[userId], i }))
    .sort((a, b) => Number(!!b.emoji) - Number(!!a.emoji) || (b.at ?? 0) - (a.at ?? 0) || b.i - a.i)
    .map(({ userId, emoji, at }) => (at === undefined ? { userId, emoji } : { userId, emoji, at }));
}

export const storyReactionCount = (story: Story) =>
  Object.values(story.reactions ?? {}).reduce((sum, users) => sum + users.length, 0);

export interface StoryAuthorEntry {
  userId: UserId;
  stories: Story[];
}

/** Authors with unseen stories first, then by their latest story. */
export function orderStoryAuthors(
  stories: Record<string, Story[]>,
  isViewed: (story: Story) => boolean,
  include: (userId: string) => boolean,
): StoryAuthorEntry[] {
  return Object.entries(stories)
    .filter(([uid, list]) => list.length > 0 && include(uid))
    .map(([uid, list]) => ({
      userId: uid as UserId,
      stories: list,
      unseen: list.some((s) => !isViewed(s)),
      latest: Math.max(...list.map((s) => s.timestamp)),
    }))
    .sort((a, b) => Number(b.unseen) - Number(a.unseen) || b.latest - a.latest)
    .map(({ userId, stories: list }) => ({ userId, stories: list }));
}

/** Index of the first story to show for an author: a requested one, else the first unseen. */
export function startStoryIndex(list: Story[], isViewed: (story: Story) => boolean, storyId?: string): number {
  if (storyId) {
    const i = list.findIndex((s) => s.id === storyId);
    if (i !== -1) return i;
  }
  const i = list.findIndex((s) => !isViewed(s));
  return i === -1 ? 0 : i;
}

export const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};
