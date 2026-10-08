import { describe, expect, it } from 'vitest';
import { ALL_EMOJIS, EMOJI_CATEGORIES, deleteBackward, insertAtSelection, pushRecent, searchEmojis } from './emoji-catalog';

describe('EMOJI_CATEGORIES', () => {
  it('lists every emoji once and has no empty categories', () => {
    const dupes = ALL_EMOJIS.filter((e, i) => ALL_EMOJIS.indexOf(e) !== i);
    expect(dupes).toEqual([]);
    expect(EMOJI_CATEGORIES.every((c) => c.emojis.length > 0)).toBe(true);
  });
});

describe('searchEmojis', () => {
  it('finds emoji by Russian and English keywords', () => {
    expect(searchEmojis('сердце')).toContain('❤️');
    expect(searchEmojis('огонь')[0]).toBe('🔥');
    expect(searchEmojis('lol')).toContain('😂');
  });

  it('matches whole categories by name for longer queries', () => {
    expect(searchEmojis('флаг', 500)).toContain('🇯🇵');
    expect(searchEmojis('фл')).not.toContain('🇯🇵');
  });

  it('returns nothing for a blank query', () => {
    expect(searchEmojis('  ')).toEqual([]);
  });
});

describe('pushRecent', () => {
  it('moves the emoji to the front without duplicates and caps the size', () => {
    expect(pushRecent(['a', 'b', 'c'], 'b')).toEqual(['b', 'a', 'c']);
    expect(pushRecent(['a', 'b', 'c'], 'd', 3)).toEqual(['d', 'a', 'b']);
  });
});

describe('composer editing', () => {
  it('inserts at the caret or over the selection', () => {
    expect(insertAtSelection('hello', 2, 2, '🔥')).toEqual({ text: 'he🔥llo', caret: 4 });
    expect(insertAtSelection('hello', 1, 4, '❤️')).toEqual({ text: 'h❤️o', caret: 3 });
  });

  it('deletes a whole grapheme before the caret', () => {
    const text = 'hi 🇷🇺';
    expect(deleteBackward(text, text.length, text.length)).toEqual({ text: 'hi ', caret: 3 });
    expect(deleteBackward('a👍🏽', 5, 5)).toEqual({ text: 'a', caret: 1 });
    expect(deleteBackward('abc', 0, 0)).toEqual({ text: 'abc', caret: 0 });
    expect(deleteBackward('abcd', 1, 3)).toEqual({ text: 'ad', caret: 1 });
  });
});
