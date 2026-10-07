import { describe, it, expect } from 'vitest';
import {
  MAX_SCHEDULE_AHEAD_MS,
  formatScheduledAt,
  parseScheduleInput,
  schedulePresets,
  toDateInputValue,
  toTimeInputValue,
} from './schedule';

// 2026-03-10 14:30 local time
const NOW = new Date(2026, 2, 10, 14, 30, 0, 0).getTime();

describe('send later (scheduled messages)', () => {
  it('offers presets and hides "tonight" after 20:00', () => {
    expect(schedulePresets(NOW).map((p) => p.label)).toEqual(['Через 1 час', 'Сегодня в 20:00', 'Завтра в 9:00']);
    const late = new Date(2026, 2, 10, 21, 0).getTime();
    expect(schedulePresets(late).map((p) => p.label)).toEqual(['Через 1 час', 'Завтра в 9:00']);
    expect(schedulePresets(NOW)[2].at).toBe(new Date(2026, 2, 11, 9, 0).getTime());
  });

  it('round-trips native input values', () => {
    expect(toDateInputValue(NOW)).toBe('2026-03-10');
    expect(toTimeInputValue(NOW)).toBe('14:30');
    expect(parseScheduleInput('2026-03-10', '18:05', NOW)).toEqual({ at: new Date(2026, 2, 10, 18, 5).getTime() });
  });

  it('rejects past, too-soon, too-far and malformed values', () => {
    expect(parseScheduleInput('2026-03-10', '14:00', NOW)).toHaveProperty('error');
    expect(parseScheduleInput('2026-03-10', '14:30', NOW)).toHaveProperty('error');
    expect(parseScheduleInput(toDateInputValue(NOW + MAX_SCHEDULE_AHEAD_MS + 86_400_000), '12:00', NOW)).toHaveProperty('error');
    expect(parseScheduleInput('2026-02-31', '12:00', NOW)).toEqual({ error: 'Некорректная дата.' });
    expect(parseScheduleInput('', '12:00', NOW)).toEqual({ error: 'Укажите дату и время.' });
  });

  it('formats relative labels', () => {
    expect(formatScheduledAt(new Date(2026, 2, 10, 20, 0).getTime(), NOW)).toBe('сегодня в 20:00');
    expect(formatScheduledAt(new Date(2026, 2, 11, 9, 0).getTime(), NOW)).toBe('завтра в 09:00');
    expect(formatScheduledAt(new Date(2026, 9, 12, 18, 30).getTime(), NOW)).toMatch(/12 .* в 18:30/);
  });
});
