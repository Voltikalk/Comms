/**
 * Telegram renders messages made of 1–3 emoji without a bubble, enlarged.
 * Returns the emoji graphemes for such a text, otherwise `null`.
 */
const EMOJI_GRAPHEME = /^(?:\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic}[\uFE0F\p{Emoji_Modifier}]*(?:\u200D\p{Extended_Pictographic}[\uFE0F\p{Emoji_Modifier}]*)*)$/u;

export const JUMBO_EMOJI_MAX = 3;

function graphemes(text: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(seg.segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

export function jumboEmoji(text: string | null | undefined): string[] | null {
  const compact = (text || '').replace(/\s+/g, '');
  if (!compact || compact.length > 64) return null;
  const parts = graphemes(compact);
  if (parts.length === 0 || parts.length > JUMBO_EMOJI_MAX) return null;
  return parts.every((g) => EMOJI_GRAPHEME.test(g)) ? parts : null;
}
