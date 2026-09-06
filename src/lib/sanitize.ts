/**
 * Security Sanitization Utilities
 * Aligned with OWASP Top 10 (A03:2021 - Injection) & testing-for-xss-vulnerabilities
 */

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;'
};

/**
 * Escapes HTML characters to prevent XSS.
 */
export function escapeHtml(str?: string | null): string {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[&<>"'/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Sanitizes search snippet / headline HTML string (e.g. from PostgreSQL ts_headline or search highlight).
 * Preserves only safe <mark> tags (with safe class attribute), escaping all other HTML tags and payloads.
 *
 * Example:
 * Input:  "Hello <script>alert(1)</script> <mark class=\"highlight\">search</mark>"
 * Output: "Hello &lt;script&gt;alert(1)&lt;&#x2F;script&gt; <mark class=\"highlight\">search</mark>"
 */
export function sanitizeSearchHighlight(dirtyHtml?: string | null): string {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';

  // Sentinel markers using Unicode Private Use Area (E000-E00F)
  const START_TOKEN = '\uE001MARK_START_';
  const START_TOKEN_END = '\uE002';
  const END_TOKEN = '\uE003MARK_END\uE003';

  // 1. Temporarily protect legitimate <mark> or <b> highlight tags, stripping any other attributes
  let protectedStr = dirtyHtml
    .replace(/<mark\b([^>]*)>/gi, (_match, attrs) => {
      const classMatch = (attrs || '').match(/\bclass="([a-zA-Z0-9_\-\s]+)"/i);
      const safeClass = classMatch ? classMatch[1].replace(/[^a-zA-Z0-9_\-\s]/g, '') : '';
      return `${START_TOKEN}${safeClass}${START_TOKEN_END}`;
    })
    .replace(/<\/mark>/gi, END_TOKEN)
    .replace(/<b>/gi, `${START_TOKEN}${START_TOKEN_END}`)
    .replace(/<\/b>/gi, END_TOKEN);

  // 2. Escape all remaining HTML entities (including malicious <script>, <img onerror>, etc.)
  let escaped = escapeHtml(protectedStr);

  // 3. Restore only the safe highlight tags
  const startRegex = new RegExp(`${START_TOKEN}([a-zA-Z0-9_\\-\\s]*)${START_TOKEN_END}`, 'g');
  escaped = escaped.replace(startRegex, (_match, className) => {
    const cls = className ? ` class="${className.trim()}"` : '';
    return `<mark${cls}>`;
  });
  escaped = escaped.replaceAll(END_TOKEN, '</mark>');

  return escaped;
}

/**
 * Validates and sanitizes URLs to protect against javascript: / data: URI attacks.
 */
export function sanitizeUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();

  // Block dangerous schemes
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('data:text/html') ||
    lower.startsWith('data:text/javascript')
  ) {
    return 'about:blank';
  }

  // Allow safe http, https, mailto, tel, blob, or safe data image URIs
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('mailto:') ||
    lower.startsWith('tel:') ||
    lower.startsWith('blob:') ||
    lower.startsWith('data:image/') ||
    lower.startsWith('/') ||
    lower.startsWith('#')
  ) {
    return trimmed;
  }

  return 'about:blank';
}
