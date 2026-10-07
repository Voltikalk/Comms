/**
 * /api/auth — login (+ cloud password 2FA), register, cookie-based refresh,
 * logout, profile, active sessions and cloud password management.
 *
 * Refresh tokens live exclusively in an HttpOnly; Secure; SameSite=Strict
 * cookie scoped to /api/auth. Access tokens (15 min) are returned in the body
 * and kept in memory by the client only.
 */
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import express from 'express';
import { bearerToken, clientIp, requireAuth, requireTrustedOrigin } from '../middleware/auth.js';
import { requireJsonBody, validateRegistration } from '../middleware/validate.js';
import {
  REFRESH_COOKIE_NAME,
  decodeIgnoringExpiry,
  generateTokenPair,
  newSessionId,
  parseCookies,
  revokeToken,
  serializeClearedRefreshCookie,
  serializeRefreshCookie,
  signTwoFactorChallenge,
  verifyRefreshToken,
  verifyTwoFactorChallenge,
} from '../services/crypto.js';
import {
  hasCloudPassword,
  removeCloudPassword,
  setCloudPassword,
  validateNewCloudPassword,
  verifyCloudPassword,
} from '../services/cloud-password.js';
import { sessionStore } from '../services/session-store.js';
import { supabase } from '../services/supabase.js';
import { cacheUser, findUserForLogin, getUser, initUsers, sanitizeUser } from '../services/users.js';

const publicTokens = ({ accessToken, expiresIn, tokenType }) => ({ accessToken, expiresIn, tokenType });

const sessionInfo = (req, userId) => ({ userId, userAgent: req.headers['user-agent'], ip: clientIp(req) });

/** Creates a session record, sets the refresh cookie and returns the access token. */
function issueSession(req, res, user, status = 200) {
  const sessionId = newSessionId();
  sessionStore.create(sessionId, sessionInfo(req, user.userId));
  const tokens = generateTokenPair(user, sessionId);
  user.lastLogin = new Date();
  res.setHeader('Set-Cookie', serializeRefreshCookie(tokens.refreshToken));
  return res.status(status).json({ user: sanitizeUser(user), tokens: publicTokens(tokens) });
}

const lockedMessage = (retryAfterMs) =>
  `Слишком много неверных попыток. Повторите через ${Math.max(1, Math.ceil(retryAfterMs / 60000))} мин.`;

async function checkAccountPassword(user, cleanInput, password) {
  if (user.passwordHash) {
    try {
      if (await bcrypt.compare(password, user.passwordHash)) return true;
    } catch {
      // fall through to Supabase Auth
    }
  }
  try {
    const emailToTry = cleanInput.includes('@') ? cleanInput : `${cleanInput}@telegram.org`;
    const { data: sbAuth, error: sbErr } = await supabase.auth.signInWithPassword({ email: emailToTry, password });
    if (!sbErr && sbAuth?.user) {
      try {
        user.passwordHash = await bcrypt.hash(password, 10);
        await supabase.from('users').update({ password_hash: user.passwordHash }).eq('id', user.id);
      } catch {}
      return true;
    }
  } catch {}
  return false;
}

export function createAuthRouter({ limiters }) {
  const router = express.Router();
  router.use(requireJsonBody);

  // POST /api/auth/login
  router.post('/login', limiters.login, async (req, res) => {
    try {
      await initUsers();
      const { email, password } = req.body || {};
      if (!email || !password || typeof password !== 'string') {
        return res.status(400).json({ error: 'Укажите email/логин и пароль.' });
      }
      let rawInput = String(email).trim();
      if (rawInput.startsWith('@')) rawInput = rawInput.slice(1).trim();
      const cleanInput = rawInput.toLowerCase();

      const user = await findUserForLogin(cleanInput);
      if (!user || user.isActive === false || !(await checkAccountPassword(user, cleanInput, password))) {
        return res.status(401).json({ error: 'Неверный email/логин или пароль.' });
      }

      // Every password login opens a new session → the cloud password is required.
      if (hasCloudPassword(user)) {
        return res.json({
          requires2fa: true,
          challenge: signTwoFactorChallenge(user.userId),
          hint: user.cloudPasswordHint || '',
        });
      }
      return issueSession(req, res, user);
    } catch (err) {
      console.error('[Login Error]', err);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
    }
  });

  // POST /api/auth/2fa/verify — second step of the login
  router.post('/2fa/verify', limiters.twoFactor, async (req, res) => {
    try {
      const { challenge, password } = req.body || {};
      const decoded = verifyTwoFactorChallenge(challenge);
      if (!decoded) return res.status(401).json({ error: 'Сессия входа истекла. Войдите заново.' });
      const user = getUser(decoded.userId);
      if (!user || user.isActive === false) return res.status(401).json({ error: 'Пользователь не найден.' });

      const result = await verifyCloudPassword(user, password);
      if (!result.ok) {
        if (result.locked) return res.status(429).json({ error: lockedMessage(result.retryAfterMs) });
        return res.status(401).json({ error: 'Неверный облачный пароль.', remaining: result.remaining });
      }
      // Single-use challenge
      revokeToken(challenge, (decoded.exp || 0) * 1000);
      return issueSession(req, res, user);
    } catch (err) {
      console.error('[2FA Verify Error]', err);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
    }
  });

  // POST /api/auth/register
  router.post('/register', limiters.register, async (req, res) => {
    try {
      await initUsers();
      const { email, username, password, firstName, lastName, avatarUrl, bio } = req.body || {};
      const invalid = validateRegistration({ email, username, password });
      if (invalid) return res.status(400).json({ error: invalid });

      const cleanEmail = String(email).toLowerCase().trim();
      const cleanUsername = String(username).toLowerCase().trim();
      if (getUser(cleanEmail) || getUser(cleanUsername)) {
        return res.status(409).json({ error: 'Пользователь с таким email или username уже существует.' });
      }

      const passwordHash = await bcrypt.hash(String(password), 12);
      const newUuid = crypto.randomUUID();
      const displayName = `${firstName || cleanUsername} ${lastName || ''}`.trim();

      try {
        const { error } = await supabase.from('users').insert({
          id: newUuid,
          email: cleanEmail,
          username: cleanUsername,
          password_hash: passwordHash,
          display_name: displayName,
          avatar_url: avatarUrl || '',
          bio: bio || '',
          is_active: true,
        });
        if (error) console.warn('[Supabase Register Warning]', error.message);
      } catch (sbErr) {
        console.warn('[Supabase Register Warning] Could not persist user to DB:', sbErr.message);
      }

      const newUser = cacheUser({
        id: newUuid,
        userId: cleanUsername,
        email: cleanEmail,
        username: cleanUsername,
        passwordHash,
        cloudPasswordHash: '',
        cloudPasswordHint: '',
        isActive: true,
        firstName: firstName || cleanUsername,
        lastName: lastName || '',
        avatarUrl: avatarUrl || '',
        bio: bio || '',
        statusEmoji: '✨',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return issueSession(req, res, newUser, 201);
    } catch (err) {
      console.error('[Register Error]', err);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
    }
  });

  // POST /api/auth/refresh — rotates the HttpOnly refresh cookie
  router.post('/refresh', requireTrustedOrigin, async (req, res) => {
    try {
      await initUsers();
      const refreshToken = parseCookies(req.headers.cookie)[REFRESH_COOKIE_NAME];
      if (!refreshToken) return res.status(401).json({ error: 'Сессия не найдена.' });

      const decoded = verifyRefreshToken(refreshToken);
      if (!decoded || !decoded.userId) {
        return res.status(401).json({ error: 'Недействительный или отозванный refresh token.' });
      }
      const user = getUser(decoded.userId);
      if (!user || user.isActive === false) {
        return res.status(401).json({ error: 'Пользователь не найден или заблокирован.' });
      }

      revokeToken(refreshToken, decoded.exp ? decoded.exp * 1000 : undefined);
      const sessionId = decoded.sessionId || newSessionId();
      sessionStore.touch(sessionId, sessionInfo(req, user.userId));
      const tokens = generateTokenPair(user, sessionId);
      res.setHeader('Set-Cookie', serializeRefreshCookie(tokens.refreshToken));
      return res.json({ user: sanitizeUser(user), tokens: publicTokens(tokens) });
    } catch (err) {
      console.error('[Refresh Error]', err);
      return res.status(500).json({ error: 'Ошибка обновления токенов.' });
    }
  });

  // POST /api/auth/logout — revokes the session and clears the cookie
  router.post('/logout', requireTrustedOrigin, (req, res) => {
    try {
      const access = bearerToken(req);
      const refresh = parseCookies(req.headers.cookie)[REFRESH_COOKIE_NAME];
      const sessionIds = new Set();

      for (const [token, kind] of [[access, 'access'], [refresh, 'refresh']]) {
        if (!token) continue;
        const decoded = decodeIgnoringExpiry(token, kind);
        if (!decoded) continue;
        revokeToken(token, decoded.exp ? decoded.exp * 1000 : undefined);
        if (decoded.sessionId) sessionIds.add(`${decoded.userId}\u0000${decoded.sessionId}`);
      }
      for (const key of sessionIds) {
        const [userId, sessionId] = key.split('\u0000');
        sessionStore.terminate(userId, sessionId, 'logout');
      }
      res.setHeader('Set-Cookie', serializeClearedRefreshCookie());
      return res.json({ message: 'Сессия успешно завершена.' });
    } catch (err) {
      console.error('[Logout Error]', err);
      return res.status(500).json({ error: 'Ошибка завершения сессии.' });
    }
  });

  // GET /api/auth/me
  router.get('/me', requireAuth, (req, res) => {
    const user = getUser(req.auth.userId);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден.' });
    return res.json({ user: sanitizeUser(user) });
  });

  // GET /api/auth/sessions — "Активные сеансы"
  router.get('/sessions', requireAuth, (req, res) => {
    const sessions = sessionStore.list(req.auth.userId, req.auth.sessionId).map((s) => ({
      id: s.id,
      os: s.os,
      browser: s.browser,
      ip: s.ip,
      createdAt: s.createdAt,
      lastActiveAt: s.lastActiveAt,
      current: s.current,
    }));
    return res.json({ sessions });
  });

  // POST /api/auth/sessions/terminate-others — "Завершить все другие сеансы"
  router.post('/sessions/terminate-others', requireAuth, (req, res) => {
    const terminated = sessionStore.terminateOthers(req.auth.userId, req.auth.sessionId);
    return res.json({ terminated });
  });

  // POST /api/auth/sessions/:id/terminate — end one specific session
  router.post('/sessions/:id/terminate', requireAuth, (req, res) => {
    const { id } = req.params;
    if (id === req.auth.sessionId) {
      return res.status(400).json({ error: 'Для текущего сеанса используйте выход из аккаунта.' });
    }
    const target = sessionStore.get(id);
    if (!target || !sessionStore.terminate(req.auth.userId, id)) {
      return res.status(404).json({ error: 'Сеанс не найден.' });
    }
    return res.json({ terminated: 1 });
  });

  // GET /api/auth/2fa — cloud password status
  router.get('/2fa', requireAuth, (req, res) => {
    const user = getUser(req.auth.userId);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден.' });
    return res.json({ enabled: hasCloudPassword(user), hint: user.cloudPasswordHint || '' });
  });

  // POST /api/auth/2fa/password — set or change the cloud password
  router.post('/2fa/password', requireAuth, limiters.twoFactor, async (req, res) => {
    try {
      const user = getUser(req.auth.userId);
      if (!user) return res.status(404).json({ error: 'Пользователь не найден.' });
      const { currentPassword, newPassword, hint } = req.body || {};
      if (hasCloudPassword(user)) {
        const check = await verifyCloudPassword(user, currentPassword);
        if (!check.ok) {
          if (check.locked) return res.status(429).json({ error: lockedMessage(check.retryAfterMs) });
          return res.status(401).json({ error: 'Неверный текущий облачный пароль.', remaining: check.remaining });
        }
      }
      const invalid = validateNewCloudPassword(newPassword, hint);
      if (invalid) return res.status(400).json({ error: invalid });
      await setCloudPassword(user, newPassword, hint);
      return res.json({ enabled: true, hint: user.cloudPasswordHint });
    } catch (err) {
      console.error('[2FA Set Error]', err);
      return res.status(500).json({ error: 'Не удалось сохранить облачный пароль.' });
    }
  });

  // POST /api/auth/2fa/disable — remove the cloud password
  router.post('/2fa/disable', requireAuth, limiters.twoFactor, async (req, res) => {
    try {
      const user = getUser(req.auth.userId);
      if (!user) return res.status(404).json({ error: 'Пользователь не найден.' });
      if (!hasCloudPassword(user)) return res.json({ enabled: false });
      const check = await verifyCloudPassword(user, req.body?.currentPassword);
      if (!check.ok) {
        if (check.locked) return res.status(429).json({ error: lockedMessage(check.retryAfterMs) });
        return res.status(401).json({ error: 'Неверный облачный пароль.', remaining: check.remaining });
      }
      await removeCloudPassword(user);
      return res.json({ enabled: false });
    } catch (err) {
      console.error('[2FA Disable Error]', err);
      return res.status(500).json({ error: 'Не удалось отключить облачный пароль.' });
    }
  });

  return router;
}
