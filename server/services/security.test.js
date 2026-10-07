import { describe, expect, it, vi } from 'vitest';
import {
  generateTokenPair,
  isEncryptedEnvelope,
  isValidPublicKey,
  isValidTtl,
  parseCookies,
  pickEnvelope,
  serializeClearedRefreshCookie,
  serializeRefreshCookie,
  signTwoFactorChallenge,
  verifyAccessToken,
  verifyRefreshToken,
  verifyTwoFactorChallenge,
} from './crypto.js';
import { createAttemptLimiter, validateNewCloudPassword, verifyCloudPassword } from './cloud-password.js';
import { createSessionStore } from './session-store.js';
import bcrypt from 'bcryptjs';

const CHROME_WIN =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const SAFARI_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

describe('refresh cookie', () => {
  it('is HttpOnly, Secure, SameSite=Strict and scoped to /api/auth', () => {
    const c = serializeRefreshCookie('abc.def', 60);
    expect(c).toMatch(/^comms_rt=abc\.def; /);
    expect(c).toContain('Path=/api/auth');
    expect(c).toContain('HttpOnly');
    expect(c).toContain('Secure');
    expect(c).toContain('SameSite=Strict');
    expect(c).toContain('Max-Age=60');
  });

  it('clears with Max-Age=0 and a past Expires', () => {
    const c = serializeClearedRefreshCookie();
    expect(c).toContain('comms_rt=;');
    expect(c).toContain('Max-Age=0');
    expect(c).toContain('Expires=Thu, 01 Jan 1970');
  });

  it('parses cookie headers', () => {
    expect(parseCookies('a=1; comms_rt=x%3Dy; broken; b=')).toEqual({ a: '1', comms_rt: 'x=y', b: '' });
    expect(parseCookies(undefined)).toEqual({});
  });
});

describe('JWT types', () => {
  const user = { userId: 'tester', email: 't@example.test', username: 'tester' };

  it('access, refresh and 2fa tokens are not interchangeable', () => {
    const { accessToken, refreshToken } = generateTokenPair(user, 'sess_1');
    const challenge = signTwoFactorChallenge('tester');
    expect(verifyAccessToken(accessToken)?.sessionId).toBe('sess_1');
    expect(verifyRefreshToken(refreshToken)?.userId).toBe('tester');
    expect(verifyAccessToken(refreshToken)).toBeNull();
    expect(verifyRefreshToken(accessToken)).toBeNull();
    expect(verifyAccessToken(challenge)).toBeNull();
    expect(verifyTwoFactorChallenge(accessToken)).toBeNull();
    expect(verifyTwoFactorChallenge(challenge)?.userId).toBe('tester');
  });
});

describe('E2EE envelope validation', () => {
  const env = { alg: 'ECDH-P256+AES-GCM-256', iv: 'AAAAAAAAAAAAAAAA', ct: 'Zm9vYmFy', kid: 'abcd1234' };

  it('accepts a well-formed envelope and strips unknown fields', () => {
    expect(isEncryptedEnvelope(env)).toBe(true);
    expect(pickEnvelope({ ...env, text: 'leak' })).toEqual(env);
  });

  it('rejects wrong algorithms, oversize or non-base64 data', () => {
    expect(isEncryptedEnvelope({ ...env, alg: 'none' })).toBe(false);
    expect(isEncryptedEnvelope({ ...env, ct: '<script>' })).toBe(false);
    expect(isEncryptedEnvelope({ ...env, iv: 'A'.repeat(33) })).toBe(false);
    expect(isEncryptedEnvelope({ ...env, ct: 'A'.repeat(64 * 1024 + 4) })).toBe(false);
    expect(isEncryptedEnvelope(null)).toBe(false);
  });

  it('validates TTL options and P-256 public keys', () => {
    expect([10, 60, 3600, 86400].every(isValidTtl)).toBe(true);
    expect(isValidTtl(5)).toBe(false);
    const raw = Buffer.alloc(65, 7);
    raw[0] = 0x04;
    expect(isValidPublicKey(raw.toString('base64'))).toBe(true);
    raw[0] = 0x02;
    expect(isValidPublicKey(raw.toString('base64'))).toBe(false);
    expect(isValidPublicKey('short')).toBe(false);
  });
});

describe('cloud password', () => {
  it('validates new passwords and hints', () => {
    expect(validateNewCloudPassword('abc', '')).toMatch(/минимум/);
    expect(validateNewCloudPassword('correct horse', 'correct horse')).toMatch(/подсказка/i);
    expect(validateNewCloudPassword('correct horse', 'h'.repeat(65))).toMatch(/длинная/);
    expect(validateNewCloudPassword('correct horse', 'my hint')).toBeNull();
  });

  it('locks after the maximum number of failures and unlocks after the window', () => {
    let t = 0;
    const limiter = createAttemptLimiter({ max: 3, windowMs: 1000, now: () => t });
    expect(limiter.fail('u')).toBe(2);
    expect(limiter.fail('u')).toBe(1);
    expect(limiter.fail('u')).toBe(0);
    expect(limiter.check('u')).toMatchObject({ allowed: false, retryAfterMs: 1000 });
    t = 1000;
    expect(limiter.check('u').allowed).toBe(true);
  });

  it('verifyCloudPassword throttles brute force with bcrypt', async () => {
    const limiter = createAttemptLimiter({ max: 2, windowMs: 60_000 });
    const user = { userId: 'bf', cloudPasswordHash: await bcrypt.hash('right-one', 4) };
    expect(await verifyCloudPassword(user, 'nope', limiter)).toMatchObject({ ok: false, remaining: 1 });
    expect(await verifyCloudPassword(user, 'nope', limiter)).toMatchObject({ ok: false, locked: true });
    // Even the right password is refused while locked
    expect(await verifyCloudPassword(user, 'right-one', limiter)).toMatchObject({ ok: false, locked: true });
  });

  it('a correct password resets the counter', async () => {
    const limiter = createAttemptLimiter({ max: 3, windowMs: 60_000 });
    const user = { userId: 'ok', cloudPasswordHash: await bcrypt.hash('right-one', 4) };
    await verifyCloudPassword(user, 'nope', limiter);
    expect(await verifyCloudPassword(user, 'right-one', limiter)).toEqual({ ok: true });
    expect(limiter.check('ok').remaining).toBe(3);
  });
});

describe('session store', () => {
  const make = () => {
    let t = 1_000;
    const revoke = vi.fn();
    const store = createSessionStore({ revoke, now: () => t });
    return { store, revoke, advance: (ms) => (t += ms) };
  };

  it('records OS, browser and IP and lists the current session first', () => {
    const { store, advance } = make();
    store.create('s1', { userId: 'Alice', userAgent: CHROME_WIN, ip: '::ffff:10.0.0.5' });
    advance(10);
    store.create('s2', { userId: 'alice', userAgent: SAFARI_IOS, ip: '10.0.0.6' });
    const list = store.list('alice', 's1');
    expect(list.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(list[0]).toMatchObject({ os: expect.stringMatching(/^Windows/), browser: expect.stringMatching(/^Chrome/), ip: '10.0.0.5', current: true });
    expect(list[1]).toMatchObject({ os: expect.stringMatching(/^iOS/), browser: expect.stringMatching(/^Safari/), current: false });
  });

  it('terminateOthers revokes every other session and notifies listeners', () => {
    const { store, revoke } = make();
    const seen = [];
    store.onTerminate((ids, reason) => seen.push({ ids, reason }));
    for (const id of ['a', 'b', 'c']) store.create(id, { userId: 'bob', userAgent: CHROME_WIN });
    store.create('x', { userId: 'eve', userAgent: CHROME_WIN });
    expect(store.terminateOthers('bob', 'a')).toBe(2);
    expect(revoke).toHaveBeenCalledTimes(2);
    expect(seen).toEqual([{ ids: ['b', 'c'], reason: 'terminated_by_user' }]);
    expect(store.list('bob', 'a').map((s) => s.id)).toEqual(['a']);
    expect(store.get('x')).toBeDefined();
  });

  it('refuses to terminate a session that belongs to someone else', () => {
    const { store, revoke } = make();
    store.create('victim', { userId: 'carol', userAgent: CHROME_WIN });
    expect(store.terminate('mallory', 'victim')).toBe(false);
    expect(revoke).not.toHaveBeenCalled();
    expect(store.get('victim')).toBeDefined();
  });

  it('touch re-creates sessions lost on restart; prune drops idle ones', () => {
    const { store, advance } = make();
    expect(store.touch('restored', { userId: 'dan', userAgent: SAFARI_IOS })).toMatchObject({ id: 'restored' });
    expect(store.touch('unknown')).toBeNull();
    advance(8 * 24 * 60 * 60 * 1000);
    store.prune();
    expect(store.size()).toBe(0);
  });
});
