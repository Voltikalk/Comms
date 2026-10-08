import { describe, expect, it } from 'vitest';
import { mergeReactions } from './reactions';

describe('mergeReactions', () => {
  it('unions reactors per emoji across album items, keeping first-seen order', () => {
    const entries = mergeReactions(
      [
        { id: 'a', reactions: { '🔥': ['u2'], '👍': ['u3'] } },
        { id: 'b', reactions: { '👍': ['u2', 'u3'] } },
      ],
      'me',
      'b',
    );
    expect(entries).toEqual([
      { emoji: '🔥', reactors: ['u2'], targetId: 'b' },
      { emoji: '👍', reactors: ['u3', 'u2'], targetId: 'b' },
    ]);
  });

  it('targets the item that carries my reaction so a click removes it', () => {
    const [entry] = mergeReactions([{ id: 'a', reactions: { '❤️': ['me'] } }, { id: 'b' }], 'me', 'b');
    expect(entry.targetId).toBe('a');
  });

  it('skips empty reactor lists', () => {
    expect(mergeReactions([{ id: 'a', reactions: { '❤️': [] } }], 'me', 'a')).toEqual([]);
  });
});
