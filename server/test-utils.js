/**
 * Shared helpers for the server integration tests: an app instance on an
 * ephemeral port and freshly generated (never seeded) test accounts.
 */
import crypto from 'crypto';
import { createServerApp } from './app.js';

export async function startTestServer() {
  const server = createServerApp({ rateLimit: false, background: false });
  await server.ready;
  await new Promise((resolve) => server.httpServer.listen(0, '127.0.0.1', resolve));
  const { port } = server.httpServer.address();
  return { ...server, base: `http://127.0.0.1:${port}` };
}

/** Random throwaway credentials for a brand-new account. */
export function makeCredentials(prefix = 't') {
  const id = crypto.randomBytes(5).toString('hex');
  return {
    username: `${prefix}_${id}`,
    email: `${prefix}_${id}@example.test`,
    password: crypto.randomBytes(12).toString('base64url'),
  };
}

export const refreshCookieFrom = (res) =>
  res.headers
    .getSetCookie()
    .find((c) => c.startsWith('comms_rt='))
    ?.split(';')[0];

export async function api(base, path, { method = 'GET', body, token, cookie, headers = {} } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { res, status: res.status, json };
}

export async function registerUser(base, creds = makeCredentials()) {
  const r = await api(base, '/api/auth/register', { method: 'POST', body: creds });
  if (r.status !== 201) throw new Error(`register failed: ${r.status} ${JSON.stringify(r.json)}`);
  return { creds, token: r.json.tokens.accessToken, cookie: refreshCookieFrom(r.res), user: r.json.user, res: r.res };
}
