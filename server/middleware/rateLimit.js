/**
 * HTTP rate limiters (express-rate-limit) and the per-socket event limiter.
 */
import rateLimit from 'express-rate-limit';

const passThrough = (_req, _res, next) => next();

const limiter = (windowMs, max, error) =>
  rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false, message: { error } });

/** @param {{ enabled?: boolean }} [opts] Disabled in integration tests. */
export function createLimiters({ enabled = true } = {}) {
  if (!enabled) {
    return { global: passThrough, login: passThrough, register: passThrough, upload: passThrough, twoFactor: passThrough };
  }
  return {
    global: limiter(60 * 1000, 100, 'Слишком много запросов. Попробуйте через минуту.'),
    login: limiter(15 * 60 * 1000, 5, 'Превышен лимит попыток входа. Попробуйте через 15 минут.'),
    register: limiter(60 * 60 * 1000, 3, 'Превышен лимит регистраций. Попробуйте через час.'),
    upload: limiter(5 * 60 * 1000, 10, 'Слишком много загрузок. Попробуйте через 5 минут.'),
    twoFactor: limiter(15 * 60 * 1000, 10, 'Слишком много попыток ввода облачного пароля. Попробуйте позже.'),
  };
}

/** socketId -> { [event]: { count, resetTime } } */
const socketRateLimits = new Map();

export function checkSocketRateLimit(socketId, eventName, maxAllowed, windowMs) {
  let bucket = socketRateLimits.get(socketId);
  if (!bucket) {
    bucket = {};
    socketRateLimits.set(socketId, bucket);
  }
  const now = Date.now();
  const rec = bucket[eventName];
  if (!rec || now > rec.resetTime) {
    bucket[eventName] = { count: 1, resetTime: now + windowMs };
    return true;
  }
  if (rec.count >= maxAllowed) return false;
  rec.count += 1;
  return true;
}

export const clearSocketRateLimit = (socketId) => socketRateLimits.delete(socketId);
