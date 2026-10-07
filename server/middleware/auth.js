/**
 * Authentication middleware for HTTP routes and the Socket.io handshake.
 */
import { isOriginAllowed } from '../config.js';
import { verifyAccessToken } from '../services/crypto.js';
import { sessionStore } from '../services/session-store.js';
import { AUTH_KEYS } from '../services/users.js';

const legacyKeysEnabled = () =>
  process.env.NODE_ENV !== 'production' || process.env.ALLOW_LEGACY_SOCKET_KEYS === '1';

export function bearerToken(req) {
  const header = req.headers.authorization;
  return header && header.startsWith('Bearer ') ? header.slice(7) : null;
}

export const clientIp = (req) => req.ip || req.socket?.remoteAddress || '';

/** Requires a valid, non-revoked access token. Sets `req.auth` and touches the session. */
export function requireAuth(req, res, next) {
  const token = bearerToken(req);
  if (!token) return res.status(401).json({ error: 'Требуется авторизация.' });
  const decoded = verifyAccessToken(token);
  if (!decoded || !decoded.userId) {
    return res.status(401).json({ error: 'Недействительный или отозванный токен доступа.' });
  }
  req.auth = decoded;
  sessionStore.touch(decoded.sessionId, {
    userId: decoded.userId,
    userAgent: req.headers['user-agent'],
    ip: clientIp(req),
  });
  next();
}

/** Rejects cross-site browser requests to cookie-authenticated endpoints (defence in depth on top of SameSite=Strict). */
export function requireTrustedOrigin(req, res, next) {
  const origin = req.headers.origin;
  if (origin && !isOriginAllowed(origin, req.headers.host)) {
    return res.status(403).json({ error: 'Недопустимый источник запроса.' });
  }
  next();
}

/** Socket.io handshake: origin check (CSWSH), then JWT, then preset dev keys. */
export function socketAuth(socket, next) {
  const origin = socket.handshake.headers.origin;
  const host = socket.handshake.headers.host;
  if (origin && !isOriginAllowed(origin, host)) {
    console.warn(`[Security Block] CSWSH attempt blocked from unauthorized origin: ${origin} (Host: ${host})`);
    return next(new Error('CORS: Unauthorized WebSocket Origin'));
  }

  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) return next(new Error('Authentication required: Token missing'));

  const decoded = verifyAccessToken(token);
  if (decoded && decoded.userId) {
    socket.data.user = String(decoded.userId).toLowerCase();
    socket.data.sessionId = decoded.sessionId || null;
    sessionStore.touch(decoded.sessionId, {
      userId: decoded.userId,
      userAgent: socket.handshake.headers['user-agent'],
      ip: socket.handshake.address,
    });
    return next();
  }

  // Dev fallback for preset testing accounts (disabled in production unless explicitly allowed)
  const cleanKey = String(token).toLowerCase().trim();
  const presetUser = legacyKeysEnabled() && Object.hasOwn(AUTH_KEYS, cleanKey) ? AUTH_KEYS[cleanKey] : null;
  if (presetUser) {
    socket.data.user = presetUser;
    socket.data.sessionId = `preset_${presetUser}`;
    return next();
  }

  return next(new Error('Authentication failed: Invalid or revoked token'));
}
