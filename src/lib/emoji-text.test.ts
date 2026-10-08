import { describe, expect, it } from 'vitest';
import { jumboEmoji } from './emoji-text';

describe('jumboEmoji', () => {
  it('accepts 1–3 emoji, including ZWJ sequences, skin tones and flags', () => {
    expect(jumboEmoji('🔥')).toEqual(['🔥']);
    expect(jumboEmoji('❤️‍🔥 👍🏽')).toEqual(['❤️‍🔥', '👍🏽']);
    expect(jumboEmoji('🇷🇺😂❤️')).toEqual(['🇷🇺', '😂', '❤️']);
  });

  it('rejects text, digits and more than three emoji', () => {
    expect(jumboEmoji('ok 👍')).toBeNull();
    expect(jumboEmoji('1')).toBeNull();
    expect(jumboEmoji('😀😀😀😀')).toBeNull();
    expect(jumboEmoji('')).toBeNull();
    expect(jumboEmoji(undefined)).toBeNull();
  });
});
