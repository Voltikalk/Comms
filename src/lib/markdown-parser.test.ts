import { describe, it, expect } from 'vitest';
import { tokenizeMarkdown } from './markdown-parser';

describe('Markdown Parser & Tokenizer Suite', () => {
  it('should parse plain text without tokens', () => {
    const text = 'Hello world, this is a plain message.';
    const tokens = tokenizeMarkdown(text);
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toEqual({
      type: 'text',
      raw: text,
      content: text,
    });
  });

  it('should parse Telegram spoilers (||text||)', () => {
    const text = 'This is a ||secret spoiler|| in the chat.';
    const tokens = tokenizeMarkdown(text);
    expect(tokens).toHaveLength(3);
    expect(tokens[0].type).toBe('text');
    expect(tokens[1].type).toBe('spoiler');
    expect(tokens[1].content).toBe('secret spoiler');
    expect(tokens[2].type).toBe('text');
  });

  it('should parse code blocks with and without language tags', () => {
    const code = '```typescript\nconst greeting: string = "Hello";\nconsole.log(greeting);\n```';
    const tokens = tokenizeMarkdown(code);
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe('code_block');
    expect(tokens[0].language).toBe('typescript');
    expect(tokens[0].content).toBe('const greeting: string = "Hello";\nconsole.log(greeting);\n');
  });

  it('should parse inline code (`code`)', () => {
    const text = 'Use `npm test` to run test suites.';
    const tokens = tokenizeMarkdown(text);
    expect(tokens).toHaveLength(3);
    expect(tokens[1].type).toBe('inline_code');
    expect(tokens[1].content).toBe('npm test');
  });

  it('should parse bold, italic, underline, and strikethrough', () => {
    const text = '**bold** and *italic* and __underline__ and ~~strike~~';
    const tokens = tokenizeMarkdown(text);
    expect(tokens.map((t) => t.type)).toEqual([
      'bold',
      'text',
      'italic',
      'text',
      'underline',
      'text',
      'strikethrough',
    ]);
  });

  it('should parse mentions (@user) and hashtags (#tag)', () => {
    const text = 'Hey @vlad, check out this #awesome feature!';
    const tokens = tokenizeMarkdown(text);
    const types = tokens.map((t) => t.type);
    expect(types).toContain('mention');
    expect(types).toContain('hashtag');

    const mention = tokens.find((t) => t.type === 'mention');
    expect(mention?.content).toBe('@vlad');

    const hashtag = tokens.find((t) => t.type === 'hashtag');
    expect(hashtag?.content).toBe('#awesome');
  });

  it('should parse URLs automatically', () => {
    const text = 'Visit https://telegram.org for more info.';
    const tokens = tokenizeMarkdown(text);
    const link = tokens.find((t) => t.type === 'link');
    expect(link).toBeDefined();
    expect(link?.url).toBe('https://telegram.org');
  });

  it('should handle nested formatting inside spoilers and bold', () => {
    const text = '||**bold inside spoiler**||';
    const tokens = tokenizeMarkdown(text);
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe('spoiler');
    expect(tokens[0].children).toHaveLength(1);
    expect(tokens[0].children?.[0].type).toBe('bold');
    expect(tokens[0].children?.[0].content).toBe('bold inside spoiler');
  });
});
