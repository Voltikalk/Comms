/**
 * Helpers for the "Активные сеансы" (active sessions) security screen.
 */
import type { AuthSessionInfo } from '../types';

/** "только что", "5 мин назад", "3 ч назад", "2 дн назад". */
export function formatLastActive(ts: number, now = Date.now()): string {
  const diff = Math.max(0, now - ts);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} мин назад`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ч назад`;
  return `${Math.floor(h / 24)} дн назад`;
}

/** Current session first, then most recently active. */
export function sortSessions(list: AuthSessionInfo[]): AuthSessionInfo[] {
  return [...list].sort((a, b) => Number(b.current) - Number(a.current) || b.lastActiveAt - a.lastActiveAt);
}

/** Emoji device glyph for the session row. */
export function sessionIcon(os: string): string {
  if (/iOS|iPadOS|Android/i.test(os)) return '📱';
  if (/mac/i.test(os)) return '💻';
  if (/Windows|Linux|ChromeOS/i.test(os)) return '🖥️';
  return '🌐';
}

/** Mirrors `server/services/cloud-password.js` limits for instant client feedback. */
export const CLOUD_PASSWORD_MIN = 4;
export const CLOUD_PASSWORD_MAX = 256;
export const CLOUD_HINT_MAX = 64;

/** Validates the "set / change cloud password" form; returns an error message or null. */
export function validateCloudPasswordForm(password: string, confirm: string, hint: string): string | null {
  if (password.length < CLOUD_PASSWORD_MIN) return `Облачный пароль должен содержать минимум ${CLOUD_PASSWORD_MIN} символа.`;
  if (password.length > CLOUD_PASSWORD_MAX) return 'Облачный пароль слишком длинный.';
  if (password !== confirm) return 'Пароли не совпадают.';
  if (hint.length > CLOUD_HINT_MAX) return 'Подсказка слишком длинная.';
  if (hint && hint.trim() === password) return 'Подсказка не должна совпадать с паролем.';
  return null;
}
