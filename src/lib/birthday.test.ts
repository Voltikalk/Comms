import { describe, expect, it } from 'vitest';
import { ageOn, daysInMonth, formatBirthday, isBirthdayToday, parseBirthday, serializeBirthday } from './birthday';

describe('birthday', () => {
  it('parses and serializes with an optional year', () => {
    expect(parseBirthday('1995-03-14')).toEqual({ year: 1995, month: 3, day: 14 });
    expect(parseBirthday('02-29')).toEqual({ year: null, month: 2, day: 29 });
    expect(parseBirthday('2001-02-29')).toBeNull();
    expect(parseBirthday('')).toBeNull();
    expect(parseBirthday('14.03.1995')).toBeNull();
    expect(serializeBirthday({ year: null, month: 7, day: 1 })).toBe('07-01');
    expect(serializeBirthday({ year: 1990, month: 12, day: 31 })).toBe('1990-12-31');
  });

  it('knows month lengths', () => {
    expect(daysInMonth(2, null)).toBe(29);
    expect(daysInMonth(2, 2023)).toBe(28);
    expect(daysInMonth(4, 2023)).toBe(30);
  });

  it('formats with the age in Russian', () => {
    const now = new Date(2026, 9, 7);
    expect(ageOn({ year: 1995, month: 10, day: 7 }, now)).toBe(31);
    expect(ageOn({ year: 1995, month: 10, day: 8 }, now)).toBe(30);
    expect(formatBirthday({ year: 1995, month: 3, day: 14 }, now)).toBe('14 марта 1995 (31 год)');
    expect(formatBirthday({ year: 2004, month: 1, day: 2 }, now)).toBe('2 января 2004 (22 года)');
    expect(formatBirthday({ year: 2011, month: 1, day: 2 }, now)).toBe('2 января 2011 (15 лет)');
    expect(formatBirthday({ year: null, month: 5, day: 9 }, now)).toBe('9 мая');
    expect(isBirthdayToday({ year: null, month: 10, day: 7 }, now)).toBe(true);
  });
});
