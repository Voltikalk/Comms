/**
 * Server-side crypto: JWT pair issue/verify, revocation list, the HttpOnly
 * refresh cookie, and structural validation of E2EE envelopes (the server
 * never sees plaintext of secret chats — it only checks the envelope shape).
 */
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import {
  ACCESS_TOKEN_EXPIRY,
  ACCESS_TOKEN_EXPIRY_SECONDS,
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  REFRESH_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY_SECONDS,
  TWO_FA_CHALLENGE_EXPIRY,
} from '../config.js';

// =============================================================================
// JWT
// =============================================================================

export const newSessionId = () => `sess_${crypto.randomUUID()}`;

export function generateTokenPair(user, sessionId) {
  const payload = {
    userId: user.userId,
    email: user.email,
    username: user.username,
    sessionId,
  };

  const accessToken = jwt.sign({ ...payload, type: 'access' }, JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  const refreshToken = jwt.sign({ ...payload, type: 'refresh', jti: crypto.randomUUID() }, JWT_REFRESH_SECRET, {
    algorithm: 'HS256',
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
    tokenType: 'Bearer',
  };
}

/** Token or session id -> expiry timestamp (ms). */
const revokedTokens = new Map();

export function isTokenRevoked(tokenOrSessionId) {
  if (!tokenOrSessionId) return false;
  const exp = revokedTokens.get(tokenOrSessionId);
  if (!exp) return false;
  if (Date.now() > exp) {
    revokedTokens.delete(tokenOrSessionId);
    return false;
  }
  return true;
}

export function revokeToken(tokenOrSessionId, expiresAt = Date.now() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000) {
  if (tokenOrSessionId) {
    revokedTokens.set(tokenOrSessionId, expiresAt);
  }
}

export function pruneRevokedTokens(now = Date.now()) {
  for (const [key, exp] of revokedTokens.entries()) {
    if (now > exp) revokedTokens.delete(key);
  }
}

function verifyWith(token, secret, expectedType) {
  if (!token || isTokenRevoked(token)) return null;
  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    if (decoded.type !== expectedType) return null;
    if (decoded.sessionId && isTokenRevoked(decoded.sessionId)) return null;
    return decoded;
  } catch {
    return null;
  }
}

export const verifyAccessToken = (token) => verifyWith(token, JWT_ACCESS_SECRET, 'access');
export const verifyRefreshToken = (token) => verifyWith(token, JWT_REFRESH_SECRET, 'refresh');

/** Decodes a token signed by us even if expired (used by logout to revoke it). */
export function decodeIgnoringExpiry(token, kind) {
  try {
    return jwt.verify(token, kind === 'refresh' ? JWT_REFRESH_SECRET : JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
      ignoreExpiration: true,
    });
  } catch {
    return null;
  }
}

/** Short-lived token proving the password step passed; exchanged at /api/auth/2fa/verify. */
export function signTwoFactorChallenge(userId) {
  return jwt.sign({ userId, type: '2fa' }, JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    expiresIn: TWO_FA_CHALLENGE_EXPIRY,
  });
}

export function verifyTwoFactorChallenge(token) {
  const decoded = verifyWith(token, JWT_ACCESS_SECRET, '2fa');
  return decoded && decoded.type === '2fa' ? decoded : null;
}

// =============================================================================
// HttpOnly refresh cookie
// =============================================================================

export const REFRESH_COOKIE_NAME = 'comms_rt';
export const REFRESH_COOKIE_PATH = '/api/auth';

export function serializeRefreshCookie(token, maxAgeSeconds = REFRESH_TOKEN_EXPIRY_SECONDS) {
  return [
    `${REFRESH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    `Path=${REFRESH_COOKIE_PATH}`,
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
  ].join('; ');
}

export const serializeClearedRefreshCookie = () =>
  `${serializeRefreshCookie('', 0)}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;

export function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of String(header).split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const raw = part.slice(idx + 1).trim();
    try {
      out[key] = decodeURIComponent(raw);
    } catch {
      out[key] = raw;
    }
  }
  return out;
}

// =============================================================================
// E2EE envelope validation (mirrors src/lib/e2ee.ts)
// =============================================================================

export const E2EE_ALG = 'ECDH-P256+AES-GCM-256';
export const SECRET_TTL_VALUES = Object.freeze([10, 60, 3600, 86400]);
const BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/;

export function isEncryptedEnvelope(v) {
  if (!v || typeof v !== 'object') return false;
  return (
    v.alg === E2EE_ALG &&
    typeof v.iv === 'string' &&
    typeof v.ct === 'string' &&
    typeof v.kid === 'string' &&
    v.iv.length > 0 &&
    v.iv.length <= 32 &&
    v.ct.length > 0 &&
    v.ct.length <= 64 * 1024 &&
    v.kid.length <= 64 &&
    BASE64_RE.test(v.iv) &&
    BASE64_RE.test(v.ct)
  );
}

/** Copies only the known envelope fields so clients cannot smuggle extra data. */
export const pickEnvelope = (v) => ({ alg: v.alg, iv: v.iv, ct: v.ct, kid: v.kid });

export const isValidTtl = (v) => SECRET_TTL_VALUES.includes(v);

/** Raw uncompressed P-256 point (65 bytes, 0x04 prefix), base64 encoded. */
export function isValidPublicKey(b64) {
  if (typeof b64 !== 'string' || b64.length > 128 || !BASE64_RE.test(b64)) return false;
  const raw = Buffer.from(b64, 'base64');
  return raw.length === 65 && raw[0] === 0x04;
}
