import React from 'react';
import { TelegramSpoiler } from '../components/Markdown/TelegramSpoiler';
import { CodeBlock } from '../components/Markdown/CodeBlock';

// ==========================================
// 1. Types & Interfaces
// ==========================================

export type MarkdownTokenType =
  | 'text'
  | 'mention'
  | 'hashtag'
  | 'link'
  | 'spoiler'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'inline_code'
  | 'code_block';

export interface MarkdownToken {
  type: MarkdownTokenType;
  raw: string;
  content: string;
  language?: string;
  url?: string;
  children?: MarkdownToken[];
}

export type { TelegramSpoilerProps } from '../components/Markdown/TelegramSpoiler';
export type { CodeBlockProps } from '../components/Markdown/CodeBlock';

// ==========================================
// 2. Tokenizer and Parser Engine
// ==========================================

/**
 * Parses markdown, spoilers, links, mentions, hashtags and inline codes.
 */
export function tokenizeMarkdown(text: string): MarkdownToken[] {
  if (!text) return [];

  const tokens: MarkdownToken[] = [];
  let remaining = text;

  // Regex patterns (ordered by precedence)
  // 1. Code blocks: ```[lang]?\n?[code]```
  const codeBlockRegex = /^```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/;
  // 2. Spoilers: ||text||
  const spoilerRegex = /^\|\|([\s\S]+?)\|\|/;
  // 3. Inline code: `code`
  const inlineCodeRegex = /^`([^`\n]+)`/;
  // 4. Bold: **text** or <b>text</b>
  const boldRegex = /^(\*\*|<b>)([\s\S]+?)(\*\*|<\/b>)/;
  // 5. Italic: *text* (excluding **) or _text_ (excluding __) or <i>text</i>
  const italicRegex = /^(\*(?!\*)|_(?!_)|<i>)([\s\S]+?)(\*(?!\*)|_(?!_)|<\/i>)/;
  // 6. Underline: __text__ or <u>text</u>
  const underlineRegex = /^(__|<u>)([\s\S]+?)(__|<\/u>)/;
  // 7. Strikethrough: ~~text~~ or <s>text</s>
  const strikeRegex = /^(~~|<s>)([\s\S]+?)(~~|<\/s>)/;
  // 8. Mentions and hashtags: @username or #hashtag
  const mentionHashRegex = /^(@[a-zA-Zа-яА-Я0-9_]{2,32}|#[a-zA-Zа-яА-Я0-9_]{2,32})/;
  // 9. URLs
  const urlRegex = /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/i;

  while (remaining.length > 0) {
    // 1. Code Block
    const codeBlockMatch = remaining.match(codeBlockRegex);
    if (codeBlockMatch) {
      tokens.push({
        type: 'code_block',
        raw: codeBlockMatch[0],
        content: codeBlockMatch[2],
        language: codeBlockMatch[1]?.trim() || undefined,
      });
      remaining = remaining.slice(codeBlockMatch[0].length);
      continue;
    }

    // 2. Spoiler
    const spoilerMatch = remaining.match(spoilerRegex);
    if (spoilerMatch) {
      tokens.push({
        type: 'spoiler',
        raw: spoilerMatch[0],
        content: spoilerMatch[1],
        children: tokenizeMarkdown(spoilerMatch[1]),
      });
      remaining = remaining.slice(spoilerMatch[0].length);
      continue;
    }

    // 3. Inline code
    const inlineCodeMatch = remaining.match(inlineCodeRegex);
    if (inlineCodeMatch) {
      tokens.push({
        type: 'inline_code',
        raw: inlineCodeMatch[0],
        content: inlineCodeMatch[1],
      });
      remaining = remaining.slice(inlineCodeMatch[0].length);
      continue;
    }

    // 4. Underline (check before bold since __ is underline in Telegram markdown)
    const underlineMatch = remaining.match(underlineRegex);
    if (underlineMatch) {
      tokens.push({
        type: 'underline',
        raw: underlineMatch[0],
        content: underlineMatch[2],
        children: tokenizeMarkdown(underlineMatch[2]),
      });
      remaining = remaining.slice(underlineMatch[0].length);
      continue;
    }

    // 5. Bold
    const boldMatch = remaining.match(boldRegex);
    if (boldMatch) {
      tokens.push({
        type: 'bold',
        raw: boldMatch[0],
        content: boldMatch[2],
        children: tokenizeMarkdown(boldMatch[2]),
      });
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // 6. Italic
    const italicMatch = remaining.match(italicRegex);
    if (italicMatch) {
      tokens.push({
        type: 'italic',
        raw: italicMatch[0],
        content: italicMatch[2],
        children: tokenizeMarkdown(italicMatch[2]),
      });
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // 7. Strikethrough
    const strikeMatch = remaining.match(strikeRegex);
    if (strikeMatch) {
      tokens.push({
        type: 'strikethrough',
        raw: strikeMatch[0],
        content: strikeMatch[2],
        children: tokenizeMarkdown(strikeMatch[2]),
      });
      remaining = remaining.slice(strikeMatch[0].length);
      continue;
    }

    // 8. Mentions & Hashtags
    const mentionHashMatch = remaining.match(mentionHashRegex);
    if (mentionHashMatch) {
      const val = mentionHashMatch[1];
      tokens.push({
        type: val.startsWith('@') ? 'mention' : 'hashtag',
        raw: val,
        content: val,
      });
      remaining = remaining.slice(val.length);
      continue;
    }

    // 9. URLs
    const urlMatch = remaining.match(urlRegex);
    if (urlMatch) {
      const url = urlMatch[1];
      tokens.push({
        type: 'link',
        raw: url,
        content: url,
        url,
      });
      remaining = remaining.slice(url.length);
      continue;
    }

    // Plain text chunk (advance until next special token candidate)
    let nextSpecialIndex = remaining.search(/[`*~_|<@#]|https?:\/\//);
    if (nextSpecialIndex === -1) {
      tokens.push({
        type: 'text',
        raw: remaining,
        content: remaining,
      });
      break;
    } else if (nextSpecialIndex === 0) {
      // If at index 0 but didn't match any token above, consume 1 character as plain text
      const char = remaining.charAt(0);
      tokens.push({
        type: 'text',
        raw: char,
        content: char,
      });
      remaining = remaining.slice(1);
    } else {
      const textChunk = remaining.slice(0, nextSpecialIndex);
      tokens.push({
        type: 'text',
        raw: textChunk,
        content: textChunk,
      });
      remaining = remaining.slice(nextSpecialIndex);
    }
  }

  // Merge consecutive 'text' tokens
  const merged: MarkdownToken[] = [];
  for (const token of tokens) {
    const prev = merged[merged.length - 1];
    if (prev && prev.type === 'text' && token.type === 'text') {
      prev.raw += token.raw;
      prev.content += token.content;
    } else {
      merged.push(token);
    }
  }

  return merged;
}

// ==========================================
// 5. Render Pipeline with Search Highlighting
// ==========================================

export function renderHighlightedText(text: string, query?: string): React.ReactNode {
  if (!query || !query.trim()) {
    return text;
  }
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.trim().toLowerCase() ? (
      <mark key={i} className="bg-amber-400/40 text-inherit rounded px-0.5 font-bold">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export interface RenderMarkdownOptions {
  searchQuery?: string;
  onHashtagClick?: (tag: string) => void;
  onMentionClick?: (username: string) => void;
}

export function renderMarkdownTokens(
  tokens: MarkdownToken[],
  options: RenderMarkdownOptions = {}
): React.ReactNode[] {
  const { searchQuery, onHashtagClick, onMentionClick } = options;

  return tokens.map((token, index) => {
    const key = `${token.type}-${index}-${token.raw.slice(0, 10)}`;

    switch (token.type) {
      case 'text':
        return <React.Fragment key={key}>{renderHighlightedText(token.content, searchQuery)}</React.Fragment>;

      case 'bold':
        return (
          <strong key={key} className="font-bold">
            {token.children ? renderMarkdownTokens(token.children, options) : renderHighlightedText(token.content, searchQuery)}
          </strong>
        );

      case 'italic':
        return (
          <em key={key} className="italic">
            {token.children ? renderMarkdownTokens(token.children, options) : renderHighlightedText(token.content, searchQuery)}
          </em>
        );

      case 'underline':
        return (
          <ins key={key} className="underline underline-offset-2">
            {token.children ? renderMarkdownTokens(token.children, options) : renderHighlightedText(token.content, searchQuery)}
          </ins>
        );

      case 'strikethrough':
        return (
          <del key={key} className="line-through opacity-85">
            {token.children ? renderMarkdownTokens(token.children, options) : renderHighlightedText(token.content, searchQuery)}
          </del>
        );

      case 'inline_code':
        return (
          <code
            key={key}
            className="px-1.5 py-0.5 mx-0.5 rounded-[4px] bg-black/10 dark:bg-white/10 font-mono text-[13px] text-[#d63384] dark:text-[#ff7eb6] border border-black/5 dark:border-white/10 select-text"
          >
            {renderHighlightedText(token.content, searchQuery)}
          </code>
        );

      case 'code_block':
        return <CodeBlock key={key} code={token.content} language={token.language} />;

      case 'spoiler':
        return (
          <TelegramSpoiler key={key}>
            {token.children ? renderMarkdownTokens(token.children, options) : renderHighlightedText(token.content, searchQuery)}
          </TelegramSpoiler>
        );

      case 'mention':
        return (
          <span
            key={key}
            onClick={(e) => {
              e.stopPropagation();
              onMentionClick?.(token.content.slice(1));
            }}
            title={token.content.slice(1)}
            className="font-semibold text-[#3390ec] dark:text-[#6ab3f3] hover:underline decoration-[#3390ec]/50 cursor-pointer"
          >
            {renderHighlightedText(token.content, searchQuery)}
          </span>
        );

      case 'hashtag':
        return (
          <span
            key={key}
            onClick={(e) => {
              e.stopPropagation();
              onHashtagClick?.(token.content.slice(1));
            }}
            title="Искать по хештегу"
            className="font-semibold text-[#3390ec] dark:text-[#6ab3f3] hover:underline decoration-[#3390ec]/50 cursor-pointer"
          >
            {renderHighlightedText(token.content, searchQuery)}
          </span>
        );

      case 'link':
        return (
          <a
            key={key}
            href={token.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[#3390ec] dark:text-[#6ab3f3] underline decoration-[#3390ec]/40 hover:decoration-[#3390ec] transition-colors break-all"
          >
            {renderHighlightedText(token.content, searchQuery)}
          </a>
        );

      default:
        return <React.Fragment key={key}>{token.content}</React.Fragment>;
    }
  });
}

/**
 * Main helper: takes raw text and renders full rich markdown with all interactive components.
 */
export function parseAndRenderRichText(
  text: string,
  searchQuery?: string,
  onHashtagClick?: (tag: string) => void,
  onMentionClick?: (username: string) => void
): React.ReactNode {
  if (!text) return '';
  const tokens = tokenizeMarkdown(text);
  return renderMarkdownTokens(tokens, { searchQuery, onHashtagClick, onMentionClick });
}
