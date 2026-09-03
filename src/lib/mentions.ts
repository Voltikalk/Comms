import type { UserProfile, UserId } from '../types';

export interface MentionToken {
  type: 'text' | 'mention' | 'hashtag';
  value: string;
}

export interface ActiveToken {
  type: 'mention' | 'hashtag';
  query: string;
  startIndex: number;
  endIndex: number;
}

const TOKEN_CAPTURE = /(@[a-zA-Zа-яА-Я0-9_]{2,32}|#[a-zA-Zа-яА-Я0-9_]{2,32})/g;

export const MENTION_TRIGGER = '@';
export const HASHTAG_TRIGGER = '#';

export function parseMessageTokens(text: string): MentionToken[] {
  if (!text) return [];
  const tokens: MentionToken[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(TOKEN_CAPTURE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, index) });
    }
    tokens.push({
      type: match[0].startsWith(MENTION_TRIGGER) ? 'mention' : 'hashtag',
      value: match[0]
    });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return tokens;
}

export function getActiveToken(text: string, caretIndex: number): ActiveToken | null {
  if (!text) return null;
  const upToCaret = text.slice(0, caretIndex);
  const boundary = Math.max(
    upToCaret.lastIndexOf(' '),
    upToCaret.lastIndexOf('\n'),
    upToCaret.lastIndexOf('\t')
  );
  const tokenStart = boundary + 1;
  const token = upToCaret.slice(tokenStart);
  const trigger = token[0];
  if (trigger !== MENTION_TRIGGER && trigger !== HASHTAG_TRIGGER) return null;
  const body = token.slice(1);
  if (!body || /[\s]/.test(body) || body.length > 32) {
    if (trigger === MENTION_TRIGGER && body.length === 0) {
      return { type: 'mention', query: '', startIndex: tokenStart, endIndex: caretIndex };
    }
    return null;
  }
  if (!/^[a-zA-Zа-яА-Я0-9_]+$/.test(body)) return null;
  return {
    type: trigger === MENTION_TRIGGER ? 'mention' : 'hashtag',
    query: body.toLowerCase(),
    startIndex: tokenStart,
    endIndex: caretIndex
  };
}

export interface MentionCandidate {
  userId: UserId;
  displayName: string;
  username: string;
  profile?: UserProfile;
}

export function buildMentionCandidates(
  participantIds: UserId[],
  profiles: Record<string, UserProfile>
): MentionCandidate[] {
  return participantIds
    .map((userId) => {
      const profile = profiles[userId];
      const displayName = profile
        ? [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim() || userId
        : userId;
      return {
        userId,
        displayName,
        username: (profile?.username || userId).toLowerCase(),
        profile
      };
    })
    .filter((c) => Boolean(c.displayName));
}

export function filterMentionCandidates(
  candidates: MentionCandidate[],
  query: string,
  limit = 7
): MentionCandidate[] {
  const q = query.trim().toLowerCase();
  const matched = q
    ? candidates.filter(
        (c) => c.username.includes(q) || c.displayName.toLowerCase().includes(q)
      )
    : candidates;
  return matched.slice(0, limit);
}

export function extractMentionedUserIds(text: string): string[] {
  const ids: string[] = [];
  for (const token of parseMessageTokens(text)) {
    if (token.type !== 'mention') continue;
    ids.push(token.value.slice(1).toLowerCase());
  }
  return ids;
}

export function isUserMentionedInText(
  text: string,
  user: { id?: UserId; username?: string; firstName?: string } | null | undefined
): boolean {
  if (!user || !text) return false;
  const needles = [user.username, user.firstName, user.id]
    .filter((v): v is string => Boolean(v))
    .map((v) => v.toLowerCase());
  if (needles.length === 0) return false;
  for (const token of parseMessageTokens(text)) {
    if (token.type !== 'mention') continue;
    const value = token.value.slice(1).toLowerCase();
    if (needles.some((n) => n === value)) return true;
  }
  return false;
}

export function extractHashtags(text: string): string[] {
  const tags: string[] = [];
  for (const token of parseMessageTokens(text)) {
    if (token.type === 'hashtag') tags.push(token.value.slice(1).toLowerCase());
  }
  return [...new Set(tags)];
}
