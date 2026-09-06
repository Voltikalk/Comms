import { describe, it, expect } from 'vitest';
import { escapeHtml, sanitizeSearchHighlight, sanitizeUrl } from './sanitize';

describe('Sanitize Security Utilities', () => {
  describe('escapeHtml', () => {
    it('escapes dangerous HTML characters', () => {
      const payload = '<script>alert("XSS & attack")</script>';
      const escaped = escapeHtml(payload);
      expect(escaped).not.toContain('<script>');
      expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS &amp; attack&quot;)&lt;&#x2F;script&gt;');
    });

    it('handles empty and null inputs safely', () => {
      expect(escapeHtml('')).toBe('');

      expect(escapeHtml(null)).toBe('');
    });
  });

  describe('sanitizeSearchHighlight', () => {
    it('preserves valid <mark> highlight tags', () => {
      const input = 'This is a <mark class="bg-amber-400">test</mark> message';
      const output = sanitizeSearchHighlight(input);
      expect(output).toBe('This is a <mark class="bg-amber-400">test</mark> message');
    });

    it('preserves unstyled <mark> and converts <b> highlights to <mark>', () => {
      const input = 'Result: <b>matched</b> and <mark>highlight</mark>';
      const output = sanitizeSearchHighlight(input);
      expect(output).toBe('Result: <mark>matched</mark> and <mark>highlight</mark>');
    });

    it('neutralizes script tags and event handler injections', () => {
      const payload = '<mark><script>alert("pwned")</script></mark><img src=x onerror=alert(1)>';
      const output = sanitizeSearchHighlight(payload);
      expect(output).not.toContain('<script>');
      expect(output).not.toContain('<img');
      expect(output).toContain('&lt;script&gt;');
      expect(output).toContain('&lt;img src=x onerror=alert(1)&gt;');
    });

    it('neutralizes dangerous attributes inside mark tags', () => {
      const payload = '<mark onclick="alert(1)" class="evil">word</mark>';
      const output = sanitizeSearchHighlight(payload);
      expect(output).not.toContain('onclick');
      expect(output).toBe('<mark class="evil">word</mark>');
    });
  });

  describe('sanitizeUrl', () => {
    it('blocks javascript: and vbscript: URIs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('about:blank');
      expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBe('about:blank');
      expect(sanitizeUrl('vbscript:msgbox("xss")')).toBe('about:blank');
    });

    it('allows valid HTTPS and HTTP URLs', () => {
      expect(sanitizeUrl('https://example.com/image.png')).toBe('https://example.com/image.png');
      expect(sanitizeUrl('/uploads/photo.jpg')).toBe('/uploads/photo.jpg');
    });

    it('allows safe data:image URIs and blocks data:text/html', () => {
      expect(sanitizeUrl('data:image/png;base64,iVBORw0KGgo=')).toBe('data:image/png;base64,iVBORw0KGgo=');
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('about:blank');
    });
  });
});
