import { describe, expect, it, vi } from 'vitest';
import { AuthClient, AuthError, LEGACY_TOKEN_KEYS } from './auth.service';

type Handler = (url: string, init: RequestInit) => { status?: number; body?: unknown };

const user = { userId: 'u1', username: 'u1', email: 'u1@example.test' };
const session = (token: string, expiresIn = 900) => ({ user, tokens: { accessToken: token, expiresIn, tokenType: 'Bearer' } });

function setup(handler: Handler) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const timers: Array<{ fn: () => void; ms: number }> = [];
  const removed: string[] = [];
  const posted: unknown[] = [];
  const channel = { postMessage: (m: unknown) => posted.push(m), onmessage: null as ((ev: { data: unknown }) => void) | null, close() {} };
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    const { status = 200, body = {} } = handler(url, init);
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  });
  const client = new AuthClient({
    baseUrl: 'https://chat.example.test',
    fetch: fetchMock as unknown as typeof fetch,
    setTimer: (fn, ms) => {
      timers.push({ fn, ms });
      return timers.length;
    },
    clearTimer: () => {},
    storage: { removeItem: (k: string) => removed.push(k) },
    channel,
  });
  return { client, calls, timers, removed, posted, channel };
}

const authHeader = (init: RequestInit) => new Headers(init.headers).get('Authorization');

describe('AuthClient', () => {
  it('purges tokens left in localStorage by older builds', () => {
    const { removed } = setup(() => ({}));
    expect(removed).toEqual([...LEGACY_TOKEN_KEYS]);
  });

  it('keeps the access token in memory and schedules rotation before expiry', async () => {
    const { client, calls, timers } = setup(() => ({ body: session('A1') }));
    const result = await client.login({ email: 'u1', password: 'pw' });
    expect(result.kind).toBe('session');
    expect(client.getAccessToken()).toBe('A1');
    expect(calls[0].init.credentials).toBe('include');
    expect(timers.at(-1)?.ms).toBe(900_000 - 60_000);
  });

  it('returns a cloud-password challenge instead of a session', async () => {
    const { client } = setup((url) =>
      url.endsWith('/login') ? { body: { requires2fa: true, challenge: 'ch', hint: 'кот' } } : { body: session('A2') },
    );
    expect(await client.login({ email: 'u1', password: 'pw' })).toEqual({ kind: '2fa', challenge: 'ch', hint: 'кот' });
    expect(client.getAccessToken()).toBeNull();
    await client.verifyTwoFactor('ch', 'cloud');
    expect(client.getAccessToken()).toBe('A2');
  });

  it('surfaces remaining attempts on a wrong cloud password', async () => {
    const { client } = setup(() => ({ status: 401, body: { error: 'Неверный облачный пароль.', remaining: 3 } }));
    const err = await client.verifyTwoFactor('ch', 'bad').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AuthError);
    expect(err).toMatchObject({ status: 401, remaining: 3 });
  });

  it('refreshes through the cookie (no token in the body) and dedupes concurrent calls', async () => {
    let n = 0;
    const { client, calls } = setup(() => ({ body: session(`R${++n}`) }));
    const [a, b] = await Promise.all([client.refresh(), client.refresh()]);
    expect(a).toBe(b);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://chat.example.test/api/auth/refresh');
    expect(calls[0].init.body).toBeUndefined();
    expect(client.getAccessToken()).toBe('R1');
  });

  it('a rejected refresh ends the session and notifies subscribers', async () => {
    const { client } = setup((url) => (url.endsWith('/refresh') ? { status: 401 } : { body: session('A') }));
    await client.login({ email: 'u1', password: 'pw' });
    const seen = vi.fn();
    client.subscribe(seen);
    expect(await client.refresh()).toBeNull();
    expect(client.getAccessToken()).toBeNull();
    expect(seen).toHaveBeenCalledWith({ user: null, accessToken: null });
  });

  it('a 5xx refresh keeps the current token', async () => {
    const { client } = setup((url) => (url.endsWith('/refresh') ? { status: 503 } : { body: session('KEEP') }));
    await client.login({ email: 'u1', password: 'pw' });
    expect(await client.refresh()).toBeNull();
    expect(client.getAccessToken()).toBe('KEEP');
  });

  it('authFetch sends the bearer token and retries once after a 401', async () => {
    let meCalls = 0;
    const { client, calls } = setup((url) => {
      if (url.endsWith('/me')) return ++meCalls === 1 ? { status: 401 } : { body: { user } };
      if (url.endsWith('/refresh')) return { body: session('NEW') };
      return { body: session('OLD') };
    });
    await client.login({ email: 'u1', password: 'pw' });
    expect(await client.getMe()).toEqual(user);
    const me = calls.filter((c) => c.url.endsWith('/me'));
    expect(me.map((c) => authHeader(c.init))).toEqual(['Bearer OLD', 'Bearer NEW']);
  });

  it('logout clears memory and tells the other tabs', async () => {
    const { client, posted, calls } = setup(() => ({ body: session('T') }));
    await client.login({ email: 'u1', password: 'pw' });
    await client.logout();
    expect(authHeader(calls.at(-1)!.init)).toBe('Bearer T');
    expect(client.getAccessToken()).toBeNull();
    expect(posted).toEqual([{ type: 'logout' }]);
  });

  it('drops the local session when another tab logs out', async () => {
    const { client, channel } = setup(() => ({ body: session('T') }));
    await client.login({ email: 'u1', password: 'pw' });
    channel.onmessage?.({ data: { type: 'logout' } });
    expect(client.getAccessToken()).toBeNull();
  });

  it('session management endpoints use the bearer token', async () => {
    const { client, calls } = setup((url) => {
      if (url.endsWith('/sessions')) return { body: { sessions: [{ id: 's1', current: true }] } };
      if (url.endsWith('/terminate-others')) return { body: { terminated: 2 } };
      return { body: session('S') };
    });
    await client.login({ email: 'u1', password: 'pw' });
    expect(await client.listSessions()).toHaveLength(1);
    expect(await client.terminateOtherSessions()).toBe(2);
    expect(calls.slice(1).every((c) => authHeader(c.init) === 'Bearer S')).toBe(true);
    expect(calls.at(-1)!.init.method).toBe('POST');
  });
});
