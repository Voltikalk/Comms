/**
 * Two-step verification ("Облачный пароль", Telegram-style 2FA).
 *
 * The cloud password is a second bcrypt-hashed secret checked after the
 * account password on every login that creates a new session. Wrong guesses
 * are throttled per user independently of the IP-based login limiter.
 */
import bcrypt from 'bcryptjs';
import { supabase, isUuid } from './supabase.js';

export const CLOUD_PASSWORD_MIN = 4;
export const CLOUD_PASSWORD_MAX = 256;
export const CLOUD_HINT_MAX = 64;
const BCRYPT_ROUNDS = 12;

/**
 * Sliding failure counter: `max` failures within `windowMs` lock the key
 * until the window started by the first failure expires.
 */
export function createAttemptLimiter({ max = 5, windowMs = 15 * 60 * 1000, now = () => Date.now() } = {}) {
  const buckets = new Map();

  function state(key) {
    const b = buckets.get(key);
    if (b && now() >= b.resetAt) {
      buckets.delete(key);
      return null;
    }
    return b || null;
  }

  return {
    /** `{ allowed, retryAfterMs, remaining }` without consuming an attempt. */
    check(key) {
      const b = state(key);
      if (!b) return { allowed: true, retryAfterMs: 0, remaining: max };
      const remaining = Math.max(0, max - b.failures);
      return { allowed: remaining > 0, retryAfterMs: remaining > 0 ? 0 : b.resetAt - now(), remaining };
    },
    fail(key) {
      const b = state(key) || { failures: 0, resetAt: now() + windowMs };
      b.failures += 1;
      buckets.set(key, b);
      return Math.max(0, max - b.failures);
    },
    reset(key) {
      buckets.delete(key);
    },
    /** Drops expired buckets (periodic maintenance). */
    prune() {
      for (const key of [...buckets.keys()]) state(key);
    },
  };
}

export const cloudPasswordAttempts = createAttemptLimiter();

export const hasCloudPassword = (user) => Boolean(user?.cloudPasswordHash);

export function validateNewCloudPassword(password, hint) {
  if (typeof password !== 'string' || password.length < CLOUD_PASSWORD_MIN) {
    return `Облачный пароль должен содержать минимум ${CLOUD_PASSWORD_MIN} символа.`;
  }
  if (password.length > CLOUD_PASSWORD_MAX) return 'Облачный пароль слишком длинный.';
  if (hint !== undefined && hint !== null && hint !== '') {
    if (typeof hint !== 'string' || hint.length > CLOUD_HINT_MAX) return 'Подсказка слишком длинная.';
    if (hint.trim() === password) return 'Подсказка не должна совпадать с паролем.';
  }
  return null;
}

/**
 * Checks a cloud password with throttling.
 * @returns {Promise<{ ok: boolean, locked?: boolean, retryAfterMs?: number, remaining?: number }>}
 */
export async function verifyCloudPassword(user, password, limiter = cloudPasswordAttempts) {
  if (!hasCloudPassword(user)) return { ok: true };
  const key = String(user.userId).toLowerCase();
  const gate = limiter.check(key);
  if (!gate.allowed) return { ok: false, locked: true, retryAfterMs: gate.retryAfterMs, remaining: 0 };

  let match = false;
  try {
    match = typeof password === 'string' && password.length <= CLOUD_PASSWORD_MAX
      ? await bcrypt.compare(password, user.cloudPasswordHash)
      : false;
  } catch {
    match = false;
  }
  if (match) {
    limiter.reset(key);
    return { ok: true };
  }
  const remaining = limiter.fail(key);
  return { ok: false, locked: remaining === 0, remaining, retryAfterMs: remaining === 0 ? limiter.check(key).retryAfterMs : 0 };
}

async function persist(user) {
  if (!isUuid(user.id)) return;
  try {
    const { error } = await supabase
      .from('users')
      .update({ cloud_password_hash: user.cloudPasswordHash || null, cloud_password_hint: user.cloudPasswordHint || null })
      .eq('id', user.id);
    if (error) console.warn('[Cloud Password] Supabase persist warning:', error.message);
  } catch (err) {
    console.warn('[Cloud Password] Supabase persist error:', err.message);
  }
}

export async function setCloudPassword(user, newPassword, hint = '') {
  user.cloudPasswordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  user.cloudPasswordHint = typeof hint === 'string' ? hint.trim().slice(0, CLOUD_HINT_MAX) : '';
  user.updatedAt = new Date();
  await persist(user);
}

export async function removeCloudPassword(user) {
  user.cloudPasswordHash = '';
  user.cloudPasswordHint = '';
  user.updatedAt = new Date();
  await persist(user);
}
