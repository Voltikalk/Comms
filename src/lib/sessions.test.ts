import { describe, it, expect } from 'vitest';
import type { AuthSessionInfo } from '../types';
import { formatLastActive, sessionIcon, sortSessions, validateCloudPasswordForm } from './sessions';

describe('active sessions helpers', () => {
  it('formats last activity', () => {
    const now = 10 * 86400_000;
    expect(formatLastActive(now - 10_000, now)).toBe('только что');
    expect(formatLastActive(now - 5 * 60_000, now)).toBe('5 мин назад');
    expect(formatLastActive(now - 3 * 3600_000, now)).toBe('3 ч назад');
    expect(formatLastActive(now - 2 * 86400_000, now)).toBe('2 дн назад');
  });

  it('sorts current session first then by recency', () => {
    const s = (id: string, lastActiveAt: number, current = false): AuthSessionInfo => ({
      id,
      os: 'x',
      browser: 'y',
      ip: '::1',
      createdAt: 0,
      lastActiveAt,
      current,
    });
    expect(sortSessions([s('a', 1), s('b', 5), s('c', 2, true)]).map((x) => x.id)).toEqual(['c', 'b', 'a']);
  });

  it('picks a device icon', () => {
    expect(sessionIcon('iOS 18.1')).toBe('📱');
    expect(sessionIcon('Windows 10/11')).toBe('🖥️');
    expect(sessionIcon('macOS 14.0')).toBe('💻');
    expect(sessionIcon('?')).toBe('🌐');
  });
});

describe('cloud password form validation', () => {
  it('accepts a valid password with an optional hint', () => {
    expect(validateCloudPasswordForm('s3cret', 's3cret', '')).toBeNull();
    expect(validateCloudPasswordForm('s3cret', 's3cret', 'кот')).toBeNull();
  });

  it('rejects short, mismatched or oversized input', () => {
    expect(validateCloudPasswordForm('abc', 'abc', '')).toMatch(/минимум 4/);
    expect(validateCloudPasswordForm('abcd', 'abce', '')).toBe('Пароли не совпадают.');
    expect(validateCloudPasswordForm('x'.repeat(257), 'x'.repeat(257), '')).toMatch(/длинный/);
    expect(validateCloudPasswordForm('abcd', 'abcd', 'h'.repeat(65))).toMatch(/Подсказка слишком/);
  });

  it('forbids a hint equal to the password', () => {
    expect(validateCloudPasswordForm('abcd', 'abcd', ' abcd ')).toMatch(/не должна совпадать/);
  });
});
