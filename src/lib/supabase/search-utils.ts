/**
 * Full-Text Search Utilities: Sanitization, Highlighting, and Rate Limiting
 */

// 1. Rate Limiter (Max 10 requests / sec per user)
const userSearchRateMap = new Map<string, { count: number; resetAt: number }>();

export function checkSearchRateLimit(userId: string, maxPerSec = 10): boolean {
  const now = Date.now();
  const entry = userSearchRateMap.get(userId);

  if (!entry || now > entry.resetAt) {
    userSearchRateMap.set(userId, { count: 1, resetAt: now + 1000 });
    return true;
  }

  if (entry.count >= maxPerSec) {
    return false;
  }

  entry.count += 1;
  return true;
}

// 2. Escape SQL & Full-Text Search Special Operators
export function sanitizeSearchQuery(query: string): string {
  return query
    .trim()
    .replace(/['"\\:;()&|!*<>~@]/g, ' ') // Strip SQL/FTS operator characters
    .replace(/\s+/g, ' ')
    .trim();
}

// 3. Extract Context Snippet (+/- 50 characters around match)
export function extractContextSnippet(text: string, query: string, contextLength = 50): string {
  if (!text) return '';
  if (!query) return text.slice(0, 100) + (text.length > 100 ? '...' : '');

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();
  const matchIndex = lowerText.indexOf(lowerQuery);

  if (matchIndex === -1) {
    return text.length > 100 ? text.slice(0, 100) + '...' : text;
  }

  const start = Math.max(0, matchIndex - contextLength);
  const end = Math.min(text.length, matchIndex + lowerQuery.length + contextLength);

  let snippet = text.slice(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';

  return snippet;
}

// 4. Highlight matched keywords in text
export function highlightTerms(text: string, query: string): string {
  if (!text || !query.trim()) return text;

  const terms = sanitizeSearchQuery(query).split(' ').filter(Boolean);
  if (terms.length === 0) return text;

  const pattern = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return text.replace(pattern, '<mark class="bg-cyan-400/30 text-cyan-200 rounded px-0.5 font-medium">$1</mark>');
}
