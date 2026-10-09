import { describe, expect, it } from 'vitest';
import type { UserId } from '../types';
import type { Story } from '../types/story.types';
import {
  applyStoryReaction,
  orderStoryAuthors,
  plural,
  reactionOf,
  startStoryIndex,
  storyReactionCount,
  storyViewerEntries,
} from './story-utils';

const u = (id: string) => id as UserId;

const story = (overrides: Partial<Story> = {}): Story => ({
  id: 's1',
  userId: u('anya'),
  authorName: 'Аня',
  type: 'text',
  data: 'hi',
  timestamp: 1000,
  views: [],
  reactions: {},
  expiresAt: Number.MAX_SAFE_INTEGER,
  ...overrides,
});

describe('applyStoryReaction', () => {
  it('replaces the previous reaction and counts as a view', () => {
    const first = applyStoryReaction(story(), 'vlad', '🔥');
    expect(first.reactions).toEqual({ '🔥': ['vlad'] });
    expect(first.views).toEqual(['vlad']);

    const second = applyStoryReaction(first, 'vlad', '❤️');
    expect(second.reactions).toEqual({ '❤️': ['vlad'] });
    expect(reactionOf(second, 'vlad')).toBe('❤️');
    expect(second.views).toEqual(['vlad']);
  });

  it('removes the reaction when the same emoji is sent again', () => {
    const s = story({ reactions: { '❤️': [u('vlad'), u('mom')] }, views: [u('vlad'), u('mom')] });
    const next = applyStoryReaction(s, 'vlad', '❤️');
    expect(next.reactions).toEqual({ '❤️': ['mom'] });
    expect(reactionOf(next, 'vlad')).toBeUndefined();
    expect(storyReactionCount(next)).toBe(1);
  });
});

describe('storyViewerEntries', () => {
  it('lists reactions first, then the most recent views', () => {
    const s = story({
      views: [u('a'), u('b'), u('c'), u('d')],
      viewTimes: { a: 100, b: 300, c: 200 },
      reactions: { '🔥': [u('a')] },
    });
    expect(storyViewerEntries(s)).toEqual([
      { userId: 'a', emoji: '🔥', at: 100 },
      { userId: 'b', at: 300 },
      { userId: 'c', at: 200 },
      { userId: 'd' },
    ]);
  });
});

describe('orderStoryAuthors', () => {
  it('puts unseen authors first and skips excluded ones', () => {
    const all = {
      anya: [story({ id: 'a1', timestamp: 10 })],
      mom: [story({ id: 'm1', userId: u('mom'), timestamp: 30 })],
      dad: [story({ id: 'd1', userId: u('dad'), timestamp: 20 })],
      vlad: [story({ id: 'v1', userId: u('vlad'), timestamp: 40 })],
    };
    const seen = new Set(['m1']);
    const order = orderStoryAuthors(all, (s) => seen.has(s.id), (uid) => uid !== 'vlad');
    expect(order.map((o) => o.userId)).toEqual(['dad', 'anya', 'mom']);
  });
});

describe('startStoryIndex', () => {
  const list = [story({ id: 'x' }), story({ id: 'y' }), story({ id: 'z' })];
  it('prefers the requested story, then the first unseen one', () => {
    expect(startStoryIndex(list, () => false, 'z')).toBe(2);
    expect(startStoryIndex(list, (s) => s.id === 'x')).toBe(1);
    expect(startStoryIndex(list, () => true, 'missing')).toBe(0);
  });
});

describe('plural', () => {
  it('picks the Russian plural form', () => {
    expect([1, 2, 5, 11, 21, 22].map((n) => plural(n, 'просмотр', 'просмотра', 'просмотров'))).toEqual([
      'просмотр',
      'просмотра',
      'просмотров',
      'просмотров',
      'просмотр',
      'просмотра',
    ]);
  });
});
