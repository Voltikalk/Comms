import { describe, it, expect } from 'vitest';
import { applyFilters, sortMessages, validateFilters } from './filter-utils';
import type { Message } from '../types';

const HOUR = 60 * 60 * 1000;
const base = new Date('2026-08-20T12:00:00').getTime();

const messages: Message[] = [
  {
    id: 'm1',
    roomId: 'family',
    sender: 'vlad',
    text: 'Привет всем',
    timestamp: base - 3 * HOUR
  },
  {
    id: 'm2',
    roomId: 'family',
    sender: 'anya',
    text: 'Фото с дачи',
    timestamp: base - 2 * HOUR,
    file: { name: 'dacha.jpg', type: 'image', data: '/uploads/dacha.jpg', size: 1024 }
  },
  {
    id: 'm3',
    roomId: 'girlfriend',
    sender: 'vlad',
    text: 'Документ готов',
    timestamp: base - 1 * HOUR,
    isEdited: true,
    ...( { edited_at: new Date(base - 30 * 60 * 1000).toISOString() } ),
    file: { name: 'report.pdf', type: 'file', data: '/uploads/report.pdf', size: 2048 }
  },
  {
    id: 'm4',
    roomId: 'family',
    sender: 'mom',
    text: 'Голосовое сообщение',
    timestamp: base,
    reactions: { '❤️': ['vlad', 'anya'] },
    file: { name: 'voice.webm', type: 'audio', data: '/uploads/voice.webm', size: 4096 }
  }
];

describe('applyFilters', () => {
  it('returns empty array for empty input', () => {
    expect(applyFilters([], {})).toEqual([]);
  });

  it('returns all messages sorted by date desc by default', () => {
    const result = applyFilters(messages, {});
    expect(result.map((m) => m.id)).toEqual(['m4', 'm3', 'm2', 'm1']);
  });

  it('sorts by date asc', () => {
    const result = applyFilters(messages, {}, 'date_asc');
    expect(result.map((m) => m.id)).toEqual(['m1', 'm2', 'm3', 'm4']);
  });

  it('filters by sender', () => {
    const result = applyFilters(messages, { senders: ['vlad'] });
    expect(result.map((m) => m.id)).toEqual(['m3', 'm1']);
  });

  it('filters by room ids', () => {
    const result = applyFilters(messages, { roomIds: ['girlfriend'] });
    expect(result.map((m) => m.id)).toEqual(['m3']);
  });

  it('filters messages with attachments only', () => {
    const result = applyFilters(messages, { hasAttachments: true });
    expect(result.map((m) => m.id)).toEqual(['m4', 'm3', 'm2']);
  });

  it('filters messages without attachments', () => {
    const result = applyFilters(messages, { hasAttachments: false });
    expect(result.map((m) => m.id)).toEqual(['m1']);
  });

  it('filters by attachment type image', () => {
    const result = applyFilters(messages, { attachmentTypes: ['image'] });
    expect(result.map((m) => m.id)).toEqual(['m2']);
  });

  it('filters by attachment type audio', () => {
    const result = applyFilters(messages, { attachmentTypes: ['audio'] });
    expect(result.map((m) => m.id)).toEqual(['m4']);
  });

  it('filters by hasReactions', () => {
    const result = applyFilters(messages, { hasReactions: true });
    expect(result.map((m) => m.id)).toEqual(['m4']);
  });

  it('filters by isEdited', () => {
    const result = applyFilters(messages, { isEdited: true });
    expect(result.map((m) => m.id)).toEqual(['m3']);
  });

  it('filters by text-only message type', () => {
    const result = applyFilters(messages, { messageType: 'text' });
    expect(result.map((m) => m.id)).toEqual(['m1']);
  });

  it('filters by search query case-insensitively', () => {
    const result = applyFilters(messages, { searchQuery: 'ПРИВЕТ' });
    expect(result.map((m) => m.id)).toEqual(['m1']);
  });

  it('filters by date range covering only today', () => {
    const dayStart = new Date('2026-08-20T00:00:00').toISOString();
    const dayEnd = new Date('2026-08-20T00:00:00').toISOString();
    const result = applyFilters(messages, { dateRange: { startDate: dayStart, endDate: dayEnd } });
    // All test messages are within Aug 20 (end at midnight extends to 23:59:59.999)
    expect(result).toHaveLength(4);
  });

  it('excludes messages outside the date range', () => {
    const start = new Date(base - 30 * 60 * 1000).toISOString();
    const end = new Date(base + 30 * 60 * 1000).toISOString();
    const result = applyFilters(messages, { dateRange: { startDate: start, endDate: end } });
    expect(result.map((m) => m.id)).toEqual(['m4']);
  });

  it('combines multiple filters', () => {
    const result = applyFilters(messages, { senders: ['vlad'], hasAttachments: true });
    expect(result.map((m) => m.id)).toEqual(['m3']);
  });
});

describe('validateFilters', () => {
  it('accepts valid filters', () => {
    const result = validateFilters({
      dateRange: {
        startDate: '2026-08-01T00:00:00Z',
        endDate: '2026-08-20T00:00:00Z'
      },
      senders: ['vlad'],
      roomIds: ['family'],
      minReactions: 2
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects inverted date range', () => {
    const result = validateFilters({
      dateRange: {
        startDate: '2026-08-20T00:00:00Z',
        endDate: '2026-08-01T00:00:00Z'
      }
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('позже'))).toBe(true);
  });

  it('rejects invalid date strings', () => {
    const result = validateFilters({
      dateRange: { startDate: 'не-дата', endDate: '2026-08-01' }
    });
    expect(result.isValid).toBe(false);
  });

  it('rejects negative minReactions', () => {
    const result = validateFilters({ minReactions: -1 });
    expect(result.isValid).toBe(false);
  });
});

describe('sortMessages', () => {
  it('does not mutate the original array', () => {
    const original = [...messages];
    sortMessages(messages, 'date_asc');
    expect(messages.map((m) => m.id)).toEqual(original.map((m) => m.id));
  });

  it('sorts by reactions desc', () => {
    const result = sortMessages(messages, 'reactions_desc');
    expect(result[0].id).toBe('m4');
  });

  it('sorts by edited desc', () => {
    const result = sortMessages(messages, 'edited_desc');
    expect(result[0].id).toBe('m3');
  });
});
