/**
 * Active login sessions ("Активные сеансы").
 *
 * One record per refresh-token family (sessionId embedded in both JWTs).
 * Terminating a session revokes its sessionId, which immediately invalidates
 * every access/refresh token of that session, and notifies listeners so the
 * socket layer can disconnect the affected devices.
 */
import { parseUserAgent } from './user-agent.js';
import { revokeToken } from './crypto.js';

/** Sessions idle longer than the refresh token lifetime are garbage. */
const SESSION_IDLE_MS = 7 * 24 * 60 * 60 * 1000;

export function createSessionStore({ revoke = revokeToken, now = () => Date.now() } = {}) {
  /** @type {Map<string, {id: string, userId: string, os: string, browser: string, ip: string, createdAt: number, lastActiveAt: number}>} */
  const sessions = new Map();
  const listeners = new Set();

  const normalizeUser = (userId) => String(userId || '').toLowerCase();

  function create(sessionId, { userId, userAgent, ip }) {
    const { os, browser } = parseUserAgent(userAgent);
    const t = now();
    const record = {
      id: sessionId,
      userId: normalizeUser(userId),
      os,
      browser,
      ip: String(ip || '').replace(/^::ffff:/, '') || 'неизвестно',
      createdAt: t,
      lastActiveAt: t,
    };
    sessions.set(sessionId, record);
    return record;
  }

  /** Marks activity; lazily re-creates the record after a server restart. */
  function touch(sessionId, info) {
    if (!sessionId) return null;
    const existing = sessions.get(sessionId);
    if (existing) {
      existing.lastActiveAt = now();
      if (info?.ip) existing.ip = String(info.ip).replace(/^::ffff:/, '');
      return existing;
    }
    return info?.userId ? create(sessionId, info) : null;
  }

  function list(userId, currentSessionId) {
    const uid = normalizeUser(userId);
    const cutoff = now() - SESSION_IDLE_MS;
    return [...sessions.values()]
      .filter((s) => s.userId === uid && s.lastActiveAt >= cutoff)
      .map((s) => ({ ...s, current: s.id === currentSessionId }))
      .sort((a, b) => Number(b.current) - Number(a.current) || b.lastActiveAt - a.lastActiveAt);
  }

  function emit(sessionIds, reason) {
    if (sessionIds.length === 0) return;
    for (const fn of listeners) {
      try {
        fn(sessionIds, reason);
      } catch (err) {
        console.warn('[Sessions] listener failed:', err);
      }
    }
  }

  /** Terminates one session of `userId`. Returns false if it does not belong to the user. */
  function terminate(userId, sessionId, reason = 'terminated') {
    const s = sessions.get(sessionId);
    if (s && s.userId !== normalizeUser(userId)) return false;
    sessions.delete(sessionId);
    revoke(sessionId);
    emit([sessionId], reason);
    return true;
  }

  /** Terminates every session of `userId` except `keepSessionId`. Returns the count. */
  function terminateOthers(userId, keepSessionId) {
    const uid = normalizeUser(userId);
    const ids = [];
    for (const s of sessions.values()) {
      if (s.userId === uid && s.id !== keepSessionId) ids.push(s.id);
    }
    for (const id of ids) {
      sessions.delete(id);
      revoke(id);
    }
    emit(ids, 'terminated_by_user');
    return ids.length;
  }

  function onTerminate(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function prune() {
    const cutoff = now() - SESSION_IDLE_MS;
    for (const [id, s] of sessions.entries()) {
      if (s.lastActiveAt < cutoff) sessions.delete(id);
    }
  }

  return { create, touch, list, get: (id) => sessions.get(id), terminate, terminateOthers, onTerminate, prune, size: () => sessions.size };
}

export const sessionStore = createSessionStore();
