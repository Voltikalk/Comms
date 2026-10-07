import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api, makeCredentials, refreshCookieFrom, registerUser, startTestServer } from '../test-utils.js';

let server;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.close();
});

describe('auth: cookie-based refresh', () => {
  it('register sets an HttpOnly refresh cookie and never returns the refresh token in JSON', async () => {
    const { res, token, user } = await registerUser(server.base);
    const raw = res.headers.getSetCookie().find((c) => c.startsWith('comms_rt='));
    expect(raw).toMatch(/HttpOnly/);
    expect(raw).toMatch(/Secure/);
    expect(raw).toMatch(/SameSite=Strict/);
    expect(raw).toMatch(/Path=\/api\/auth/);
    expect(token).toBeTruthy();
    expect(user.hasCloudPassword).toBe(false);
    expect(user.passwordHash).toBeUndefined();
  });

  it('refresh rotates the cookie and the old one stops working', async () => {
    const { cookie } = await registerUser(server.base);
    const first = await api(server.base, '/api/auth/refresh', { method: 'POST', cookie });
    expect(first.status).toBe(200);
    expect(first.json.tokens.accessToken).toBeTruthy();
    expect(JSON.stringify(first.json)).not.toContain('refreshToken');
    const rotated = refreshCookieFrom(first.res);
    expect(rotated).toBeTruthy();
    expect(rotated).not.toBe(cookie);

    const replay = await api(server.base, '/api/auth/refresh', { method: 'POST', cookie });
    expect(replay.status).toBe(401);
    const again = await api(server.base, '/api/auth/refresh', { method: 'POST', cookie: rotated });
    expect(again.status).toBe(200);
  });

  it('refresh rejects missing cookies and foreign origins', async () => {
    expect((await api(server.base, '/api/auth/refresh', { method: 'POST' })).status).toBe(401);
    const { cookie } = await registerUser(server.base);
    const evil = await api(server.base, '/api/auth/refresh', { method: 'POST', cookie, headers: { Origin: 'https://evil.example' } });
    expect(evil.status).toBe(403);
  });

  it('logout revokes both tokens and clears the cookie', async () => {
    const { token, cookie } = await registerUser(server.base);
    const out = await api(server.base, '/api/auth/logout', { method: 'POST', token, cookie });
    expect(out.status).toBe(200);
    expect(out.res.headers.getSetCookie().join()).toMatch(/comms_rt=;.*Max-Age=0/);
    expect((await api(server.base, '/api/auth/me', { token })).status).toBe(401);
    expect((await api(server.base, '/api/auth/refresh', { method: 'POST', cookie })).status).toBe(401);
  });

  it('rejects wrong passwords with a generic message', async () => {
    const { creds } = await registerUser(server.base);
    const bad = await api(server.base, '/api/auth/login', { method: 'POST', body: { email: creds.email, password: 'definitely-wrong' } });
    expect(bad.status).toBe(401);
    const ok = await api(server.base, '/api/auth/login', { method: 'POST', body: { email: `@${creds.username}`, password: creds.password } });
    expect(ok.status).toBe(200);
    expect(ok.json.user.username).toBe(creds.username);
  });
});

describe('auth: active sessions', () => {
  it('lists sessions and terminates the others', async () => {
    const { creds, token: first } = await registerUser(server.base);
    const login = (ua) =>
      api(server.base, '/api/auth/login', {
        method: 'POST',
        body: { email: creds.email, password: creds.password },
        headers: { 'User-Agent': ua },
      });
    const second = await login('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile Safari/604.1');
    const third = await login('Mozilla/5.0 (X11; Linux x86_64) Gecko/20100101 Firefox/131.0');

    const list = await api(server.base, '/api/auth/sessions', { token: first });
    expect(list.json.sessions).toHaveLength(3);
    expect(list.json.sessions[0].current).toBe(true);
    expect(list.json.sessions.map((s) => s.os)).toEqual(expect.arrayContaining([expect.stringMatching(/iOS/), expect.stringMatching(/Linux/)]));

    const done = await api(server.base, '/api/auth/sessions/terminate-others', { method: 'POST', token: first });
    expect(done.json.terminated).toBe(2);
    expect((await api(server.base, '/api/auth/me', { token: second.json.tokens.accessToken })).status).toBe(401);
    expect((await api(server.base, '/api/auth/refresh', { method: 'POST', cookie: refreshCookieFrom(third.res) })).status).toBe(401);
    expect((await api(server.base, '/api/auth/me', { token: first })).status).toBe(200);
  });

  it('cannot terminate the current session or a session of another user', async () => {
    const a = await registerUser(server.base);
    const b = await registerUser(server.base);
    const [current] = (await api(server.base, '/api/auth/sessions', { token: a.token })).json.sessions;
    const [foreign] = (await api(server.base, '/api/auth/sessions', { token: b.token })).json.sessions;
    expect((await api(server.base, `/api/auth/sessions/${current.id}/terminate`, { method: 'POST', token: a.token })).status).toBe(400);
    expect((await api(server.base, `/api/auth/sessions/${foreign.id}/terminate`, { method: 'POST', token: a.token })).status).toBe(404);
    expect((await api(server.base, '/api/auth/me', { token: b.token })).status).toBe(200);
  });
});

describe('auth: two-step verification (cloud password)', () => {
  it('set → login challenge → verify → disable', { timeout: 30_000 }, async () => {
    const { creds, token } = await registerUser(server.base);
    const cloud = makeCredentials().password;

    const set = await api(server.base, '/api/auth/2fa/password', { method: 'POST', token, body: { newPassword: cloud, hint: 'любимый кот' } });
    expect(set.status).toBe(200);
    expect((await api(server.base, '/api/auth/2fa', { token })).json).toEqual({ enabled: true, hint: 'любимый кот' });

    const step1 = await api(server.base, '/api/auth/login', { method: 'POST', body: { email: creds.email, password: creds.password } });
    expect(step1.json).toMatchObject({ requires2fa: true, hint: 'любимый кот' });
    expect(step1.json.tokens).toBeUndefined();
    expect(refreshCookieFrom(step1.res)).toBeUndefined();
    // The challenge is not an access token
    expect((await api(server.base, '/api/auth/me', { token: step1.json.challenge })).status).toBe(401);

    const wrong = await api(server.base, '/api/auth/2fa/verify', { method: 'POST', body: { challenge: step1.json.challenge, password: 'nope' } });
    expect(wrong.status).toBe(401);
    expect(wrong.json.remaining).toBe(4);

    const step2 = await api(server.base, '/api/auth/2fa/verify', { method: 'POST', body: { challenge: step1.json.challenge, password: cloud } });
    expect(step2.status).toBe(200);
    expect(step2.json.tokens.accessToken).toBeTruthy();
    expect(refreshCookieFrom(step2.res)).toBeTruthy();

    // Challenges are single-use
    const replay = await api(server.base, '/api/auth/2fa/verify', { method: 'POST', body: { challenge: step1.json.challenge, password: cloud } });
    expect(replay.status).toBe(401);

    const off = await api(server.base, '/api/auth/2fa/disable', { method: 'POST', token, body: { currentPassword: cloud } });
    expect(off.status).toBe(200);
    const plain = await api(server.base, '/api/auth/login', { method: 'POST', body: { email: creds.email, password: creds.password } });
    expect(plain.json.tokens.accessToken).toBeTruthy();
  });

  it('locks the account after five wrong cloud passwords', { timeout: 30_000 }, async () => {
    const { creds, token } = await registerUser(server.base);
    const cloud = makeCredentials().password;
    await api(server.base, '/api/auth/2fa/password', { method: 'POST', token, body: { newPassword: cloud, hint: '' } });
    const { json } = await api(server.base, '/api/auth/login', { method: 'POST', body: { email: creds.email, password: creds.password } });

    const statuses = [];
    for (let i = 0; i < 5; i++) {
      statuses.push((await api(server.base, '/api/auth/2fa/verify', { method: 'POST', body: { challenge: json.challenge, password: `bad-${i}` } })).status);
    }
    expect(statuses).toEqual([401, 401, 401, 401, 429]);
    const locked = await api(server.base, '/api/auth/2fa/verify', { method: 'POST', body: { challenge: json.challenge, password: cloud } });
    expect(locked.status).toBe(429);
  });

  it('changing the cloud password requires the current one', async () => {
    const { token } = await registerUser(server.base);
    const cloud = makeCredentials().password;
    await api(server.base, '/api/auth/2fa/password', { method: 'POST', token, body: { newPassword: cloud } });
    const hijack = await api(server.base, '/api/auth/2fa/password', { method: 'POST', token, body: { newPassword: 'attacker-chosen' } });
    expect(hijack.status).toBe(401);
  });
});

describe('protected endpoints', () => {
  it('user search and upload require a bearer token', async () => {
    expect((await api(server.base, '/api/users/search?q=a')).status).toBe(401);
    expect((await api(server.base, '/api/upload', { method: 'POST', body: { name: 'a.txt', data: 'aGk=' } })).status).toBe(401);
    const { token, creds } = await registerUser(server.base);
    const found = await api(server.base, `/api/users/search?q=${creds.username.slice(0, 6)}`, { token });
    expect(found.status).toBe(200);
  });

  it('upload rejects a script disguised as an image (magic bytes)', async () => {
    const { token } = await registerUser(server.base);
    const fake = Buffer.from('<html><script>alert(document.cookie)</script></html>').toString('base64');
    const r = await api(server.base, '/api/upload', { method: 'POST', token, body: { name: 'cat.jpg', type: 'image/jpeg', data: fake } });
    expect(r.status).toBe(415);
  });

  it('rejects non-object JSON bodies', async () => {
    const r = await api(server.base, '/api/auth/login', { method: 'POST', body: ['x'] });
    expect(r.status).toBe(400);
  });
});
