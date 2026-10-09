import { describe, expect, it } from 'vitest';
import type { Message } from '../types';
import {
  extractLinks,
  formatSearchDate,
  linkHost,
  makeSnippet,
  matchText,
  messageCategory,
  normalizeSearch,
  pushRecent,
  searchMessages,
  searchVariants,
  splitHighlight,
  swapKeyboardLayout,
  topRooms,
  transliterate,
} from './chat-search';

const msg = (over: Partial<Message> & { id: string }): Message => ({
  roomId: 'r1',
  sender: 'anya',
  text: '',
  timestamp: 1_000,
  ...over,
});

describe('normalizeSearch', () => {
  it('lowercases, folds ё and Latin diacritics but keeps й', () => {
    expect(normalizeSearch('Ёлка Café')).toBe('елка cafe');
    expect(normalizeSearch('Йогурт')).toBe('йогурт');
    expect(normalizeSearch('Ёлка Café')).toHaveLength('Ёлка Café'.length);
  });
});

describe('keyboard layout and transliteration', () => {
  it('swaps between layouts in both directions', () => {
    expect(swapKeyboardLayout('ghbdtn')).toBe('привет');
    expect(swapKeyboardLayout('руддщ')).toBe('hello');
  });
  it('returns empty for mixed or non-letter input', () => {
    expect(swapKeyboardLayout('abc где')).toBe('');
    expect(swapKeyboardLayout('123')).toBe('');
  });
  it('transliterates Cyrillic', () => {
    expect(transliterate('аня')).toBe('anya');
    expect(transliterate('щука')).toBe('schuka');
  });
  it('builds query variants', () => {
    expect(searchVariants('  Ghbdtn  ')).toEqual(['ghbdtn', 'привет']);
    expect(searchVariants('   ')).toEqual([]);
  });
});

describe('matchText', () => {
  const v = (q: string) => searchVariants(q);

  it('ranks exact > prefix > word start > substring', () => {
    const exact = matchText('Аня', v('аня'))!;
    const prefix = matchText('Аня Смирнова', v('аня'))!;
    const word = matchText('Мама и Аня', v('аня'))!;
    const sub = matchText('Таняша', v('аня'))!;
    expect(exact.score).toBeGreaterThan(prefix.score);
    expect(prefix.score).toBeGreaterThan(word.score);
    expect(word.score).toBeGreaterThan(sub.score);
    expect(word.ranges).toEqual([[7, 10]]);
    expect(sub.ranges).toEqual([[1, 4]]);
  });

  it('matches words in any order', () => {
    const m = matchText('Влад Петров', v('петров влад'))!;
    expect(m).not.toBeNull();
    expect(m.ranges).toEqual([
      [0, 4],
      [5, 11],
    ]);
  });

  it('finds text typed in the wrong layout, ranked a bit lower', () => {
    const m = matchText('Привет всем', v('ghbdtn'))!;
    expect(m.ranges).toEqual([[0, 6]]);
    expect(m.score).toBeLessThan(matchText('Привет всем', v('привет'))!.score);
  });

  it('falls back to transliteration without ranges', () => {
    const m = matchText('Аня', v('anya'))!;
    expect(m.ranges).toEqual([]);
    expect(m.score).toBeGreaterThan(0);
  });

  it('returns null when nothing matches', () => {
    expect(matchText('Мама', v('папа'))).toBeNull();
    expect(matchText(undefined, v('a'))).toBeNull();
  });
});

describe('splitHighlight and makeSnippet', () => {
  it('splits text into hit and plain parts', () => {
    expect(splitHighlight('Привет мир', [[7, 10]])).toEqual([
      { text: 'Привет ', hit: false },
      { text: 'мир', hit: true },
    ]);
    expect(splitHighlight('abc', [])).toEqual([{ text: 'abc', hit: false }]);
  });

  it('cuts long text so the match stays near the start', () => {
    const text = 'Сегодня мы долго обсуждали планы на выходные и решили поехать на дачу к бабушке';
    const at = text.indexOf('дачу');
    const s = makeSnippet(text, [[at, at + 4]], 12);
    expect(s.text.startsWith('…')).toBe(true);
    const [start, end] = s.ranges[0];
    expect(s.text.slice(start, end)).toBe('дачу');
  });

  it('keeps short text untouched', () => {
    expect(makeSnippet('Привет', [[0, 3]])).toEqual({ text: 'Привет', ranges: [[0, 3]] });
  });
});

describe('links and categories', () => {
  it('extracts links and hosts', () => {
    expect(extractLinks('см. https://www.youtube.com/watch?v=1, и www.ya.ru.')).toEqual([
      'https://www.youtube.com/watch?v=1',
      'www.ya.ru',
    ]);
    expect(linkHost('https://www.youtube.com/watch?v=1')).toBe('youtube.com');
    expect(linkHost('www.ya.ru')).toBe('ya.ru');
  });

  it('classifies messages', () => {
    const file = (type: NonNullable<Message['file']>['type']) => ({ name: 'x', type, data: '', size: 1 });
    expect(messageCategory({ text: '', file: file('image') })).toBe('media');
    expect(messageCategory({ text: '', file: file('video_note') })).toBe('media');
    expect(messageCategory({ text: '', file: file('audio') })).toBe('voice');
    expect(messageCategory({ text: '', file: file('file') })).toBe('files');
    expect(messageCategory({ text: 'https://a.io' })).toBe('links');
    expect(messageCategory({ text: 'просто текст' })).toBeNull();
  });
});

describe('searchMessages', () => {
  const messages = [
    msg({ id: 'm1', text: 'Купи молоко', timestamp: 1 }),
    msg({ id: 'm2', text: 'Молоко уже купила', timestamp: 3 }),
    msg({ id: 'm3', text: 'Фото с дачи', file: { name: 'IMG_1.jpg', type: 'image', data: '', size: 1 }, timestamp: 2 }),
    msg({ id: 'm4', roomId: 'r2', sender: 'mom', text: '', file: { name: 'Договор.pdf', type: 'file', data: '', size: 1 }, timestamp: 4 }),
    msg({ id: 'm5', text: 'молоко', service: { type: 'created', actor: 'anya' } as Message['service'], timestamp: 5 }),
    msg({ id: 'm6', text: '\u200B\u200B[fwd:{"s":"dad"}]\u200B\u200Bмолоко от папы', timestamp: 6 }),
  ];

  it('finds text matches newest first and skips service messages', () => {
    const hits = searchMessages(messages, 'молоко');
    expect(hits.map((h) => h.message.id)).toEqual(['m6', 'm2', 'm1']);
    expect(hits[0].snippet).toBe('молоко от папы');
    expect(hits[0].ranges).toEqual([[0, 6]]);
  });

  it('matches file names and highlights them', () => {
    const hits = searchMessages(messages, 'договор');
    expect(hits.map((h) => h.message.id)).toEqual(['m4']);
    expect(hits[0].snippet).toBe('Договор.pdf');
    expect(hits[0].ranges).toEqual([[0, 7]]);
  });

  it('matches short queries only at word starts', () => {
    const list = [
      msg({ id: 'a', text: 'Настроить занятия', timestamp: 1 }),
      msg({ id: 'b', text: 'Аня придёт', timestamp: 2 }),
      msg({ id: 'c', text: 'Фото', file: { name: 'x.jpg', type: 'image', data: '', size: 1 }, timestamp: 3 }),
    ];
    expect(searchMessages(list, 'аня').map((h) => h.message.id)).toEqual(['b']);
    expect(searchMessages(list, 'стро').map((h) => h.message.id)).toEqual(['a']);
    expect(searchMessages([msg({ id: 'p', file: { name: 'x.jpg', type: 'image', data: '', size: 1 } })], 'фотография')).toEqual([]);
  });

  it('filters by category and matches the chat name there', () => {
    const roomName = (id: string) => (id === 'r1' ? 'Аня' : 'Мама');
    expect(searchMessages(messages, 'аня', { category: 'media', roomName }).map((h) => h.message.id)).toEqual(['m3']);
    expect(searchMessages(messages, 'аня', { roomName })).toEqual([]);
    expect(searchMessages(messages, 'мама', { category: 'files', roomName }).map((h) => h.message.id)).toEqual(['m4']);
  });

  it('respects the limit and empty queries', () => {
    expect(searchMessages(messages, 'молоко', { limit: 1 })).toHaveLength(1);
    expect(searchMessages(messages, ' ')).toEqual([]);
  });
});

describe('recent and top rooms', () => {
  it('keeps recents unique and capped', () => {
    expect(pushRecent(['a', 'b', 'c'], 'b')).toEqual(['b', 'a', 'c']);
    expect(pushRecent(['a', 'b'], 'c', 2)).toEqual(['c', 'a']);
  });

  it('ranks rooms by my recent messages', () => {
    const now = 100 * 86400000;
    const list = [
      msg({ id: '1', roomId: 'a', sender: 'me', timestamp: now - 1000 }),
      msg({ id: '2', roomId: 'b', sender: 'me', timestamp: now - 2000 }),
      msg({ id: '3', roomId: 'b', sender: 'me', timestamp: now - 3000 }),
      msg({ id: '4', roomId: 'c', sender: 'other', timestamp: now - 1000 }),
      msg({ id: '5', roomId: 'd', sender: 'me', timestamp: now - 40 * 86400000 }),
      msg({ id: '6', roomId: 'x', sender: 'me', timestamp: now - 1000 }),
    ];
    expect(topRooms(list, 'me', new Set(['a', 'b', 'c', 'd']), now)).toEqual(['b', 'a']);
  });
});

describe('formatSearchDate', () => {
  it('shows time today and a short date long ago', () => {
    const now = new Date(2026, 9, 10, 18, 0).getTime();
    expect(formatSearchDate(new Date(2026, 9, 10, 9, 5).getTime(), now)).toBe('09:05');
    expect(formatSearchDate(new Date(2026, 0, 3).getTime(), now)).toBe('03.01');
    expect(formatSearchDate(new Date(2025, 0, 3).getTime(), now)).toBe('03.01.25');
  });
});
