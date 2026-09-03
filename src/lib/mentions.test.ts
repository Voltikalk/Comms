import { describe, it, expect } from 'vitest';
import {
  parseMessageTokens,
  getActiveToken,
  buildMentionCandidates,
  filterMentionCandidates,
  isUserMentionedInText,
  extractHashtags,
  extractMentionedUserIds
} from './mentions';
import type { UserProfile } from '../types';

const profiles: Record<string, UserProfile> = {
  vlad: { userId: 'vlad', firstName: 'Влад', lastName: '', username: 'vlad' },
  anya: { userId: 'anya', firstName: 'Аня', lastName: '❤️', username: 'anyuta' },
  mom: { userId: 'mom', firstName: 'Мама', username: 'mama' }
};

describe('parseMessageTokens', () => {
  it('returns empty array for empty text', () => {
    expect(parseMessageTokens('')).toEqual([]);
  });

  it('returns a single text token when no mentions or hashtags', () => {
    const tokens = parseMessageTokens('привет мир');
    expect(tokens).toEqual([{ type: 'text', value: 'привет мир' }]);
  });

  it('splits mentions and hashtags from text', () => {
    const tokens = parseMessageTokens('привет @anya, смотри #новости!');
    expect(tokens).toEqual([
      { type: 'text', value: 'привет ' },
      { type: 'mention', value: '@anya' },
      { type: 'text', value: ', смотри ' },
      { type: 'hashtag', value: '#новости' },
      { type: 'text', value: '!' }
    ]);
  });

  it('supports cyrillic and underscore mentions', () => {
    const tokens = parseMessageTokens('@мама_1 привет');
    expect(tokens[0]).toEqual({ type: 'mention', value: '@мама_1' });
  });

  it('handles adjacent tokens without text between', () => {
    const tokens = parseMessageTokens('@vlad#tag');
    expect(tokens).toEqual([
      { type: 'mention', value: '@vlad' },
      { type: 'hashtag', value: '#tag' }
    ]);
  });
});

describe('getActiveToken', () => {
  it('detects mention trigger at caret', () => {
    const token = getActiveToken('привет @', 8);
    expect(token).toEqual({ type: 'mention', query: '', startIndex: 7, endIndex: 8 });
  });

  it('detects partial mention query', () => {
    const token = getActiveToken('привет @any', 11);
    expect(token).toEqual({ type: 'mention', query: 'any', startIndex: 7, endIndex: 11 });
  });

  it('detects hashtag query', () => {
    const token = getActiveToken('чекни #нов', 10);
    expect(token).toEqual({ type: 'hashtag', query: 'нов', startIndex: 6, endIndex: 10 });
  });

  it('returns null when caret is outside a token', () => {
    expect(getActiveToken('привет @anya, пока', 16)).toBeNull();
  });

  it('returns null for plain word without trigger', () => {
    expect(getActiveToken('привет', 6)).toBeNull();
  });

  it('returns null when token contains spaces', () => {
    expect(getActiveToken('@anyuta привет', 14)).toBeNull();
  });

  it('rejects tokens longer than 32 chars', () => {
    const long = 'a'.repeat(33);
    expect(getActiveToken(`@${long}`, 34)).toBeNull();
  });
});

describe('buildMentionCandidates', () => {
  it('builds candidates from participant ids and profiles', () => {
    const candidates = buildMentionCandidates(['vlad', 'anya'], profiles);
    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({ userId: 'vlad', displayName: 'Влад', username: 'vlad' });
    expect(candidates[1]).toMatchObject({ userId: 'anya', displayName: 'Аня ❤️', username: 'anyuta' });
  });

  it('falls back to userId as displayName when profile is missing', () => {
    const candidates = buildMentionCandidates(['ghost'], {});
    expect(candidates[0].displayName).toBe('ghost');
    expect(candidates[0].username).toBe('ghost');
  });
});

describe('filterMentionCandidates', () => {
  const candidates = buildMentionCandidates(['vlad', 'anya', 'mom'], profiles);

  it('returns all candidates (limited) for empty query', () => {
    expect(filterMentionCandidates(candidates, '')).toHaveLength(3);
  });

  it('matches by username', () => {
    const result = filterMentionCandidates(candidates, 'anyu');
    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe('anya');
  });

  it('matches by display name case-insensitively', () => {
    const result = filterMentionCandidates(candidates, 'МАМА');
    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe('mom');
  });

  it('respects the limit', () => {
    expect(filterMentionCandidates(candidates, '', 2)).toHaveLength(2);
  });

  it('returns empty array when nothing matches', () => {
    expect(filterMentionCandidates(candidates, 'xyz')).toHaveLength(0);
  });
});

describe('isUserMentionedInText', () => {
  it('detects mention by username', () => {
    expect(isUserMentionedInText('зови @anyuta', { id: 'anya', username: 'anyuta', firstName: 'Аня' })).toBe(true);
  });

  it('detects mention by first name', () => {
    expect(isUserMentionedInText('а вот @Аня пришла', { id: 'anya', username: 'anyuta', firstName: 'Аня' })).toBe(true);
  });

  it('does not match other users', () => {
    expect(isUserMentionedInText('зови @vlad', { id: 'anya', username: 'anyuta', firstName: 'Аня' })).toBe(false);
  });

  it('returns false for empty text or missing user', () => {
    expect(isUserMentionedInText('', { id: 'anya' })).toBe(false);
    expect(isUserMentionedInText('текст', null)).toBe(false);
  });

  it('ignores hashtags as mentions', () => {
    expect(isUserMentionedInText('#anya тег', { id: 'anya', username: 'anya' })).toBe(false);
  });
});

describe('extractHashtags / extractMentionedUserIds', () => {
  it('extracts unique lowercase hashtags', () => {
    expect(extractHashtags('#Новости и #новости и #Кино')).toEqual(['новости', 'кино']);
  });

  it('extracts mentioned user ids without the @', () => {
    expect(extractMentionedUserIds('позвать @vlad и @mom')).toEqual(['vlad', 'mom']);
  });
});
