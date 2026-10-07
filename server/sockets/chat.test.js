import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { io as connect } from 'socket.io-client';
import { registerUser, startTestServer } from '../test-utils.js';
import { runChatSweep } from './chat.js';

let server;
const sockets = [];

beforeAll(async () => {
  server = await startTestServer();
});
afterEach(() => {
  while (sockets.length) sockets.pop().disconnect();
});
afterAll(async () => {
  await server.close();
});

function open(token) {
  const socket = connect(server.base, { auth: { token }, transports: ['websocket'], reconnection: false, forceNew: true });
  sockets.push(socket);
  return socket;
}

/** Connects and resolves once the initial `history` snapshot has arrived. */
function connectUser(token) {
  const socket = open(token);
  return new Promise((resolve, reject) => {
    socket.once('history', (history) => resolve({ socket, history }));
    socket.once('connect_error', reject);
  });
}

const emit = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, resolve));
const nextEvent = (socket, event, ms = 1500) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), ms);
    socket.once(event, (data) => {
      clearTimeout(t);
      resolve(data);
    });
  });
const collect = (socket, event) => {
  const seen = [];
  socket.on(event, (d) => seen.push(d));
  return seen;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const envelope = (ct = 'Y2lwaGVydGV4dA==') => ({ alg: 'ECDH-P256+AES-GCM-256', iv: 'AAAAAAAAAAAAAAAA', ct, kid: 'k1' });

describe('socket handshake', () => {
  it('rejects a bare username or garbage as the token', async () => {
    const { user } = await registerUser(server.base);
    for (const token of [user.username, 'not-a-jwt', '']) {
      const socket = open(token);
      const err = await nextEvent(socket, 'connect_error');
      expect(err.message).toMatch(/Authentication|Token missing/);
    }
  });

  it('rejects revoked (logged out) access tokens', async () => {
    const { token, cookie } = await registerUser(server.base);
    await fetch(`${server.base}/api/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, Cookie: cookie } });
    const err = await nextEvent(open(token), 'connect_error');
    expect(err.message).toMatch(/revoked/);
  });

  it('disconnects other devices on "terminate other sessions"', async () => {
    const a = await registerUser(server.base);
    const login = await fetch(`${server.base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: a.creds.email, password: a.creds.password }),
    }).then((r) => r.json());
    const { socket: other } = await connectUser(login.tokens.accessToken);
    const kicked = nextEvent(other, 'auth_error');
    await fetch(`${server.base}/api/auth/sessions/terminate-others`, { method: 'POST', headers: { Authorization: `Bearer ${a.token}` } });
    expect((await kicked).reason).toBe('terminated_by_user');
  });
});

describe('send_message', () => {
  it('dedupes offline-queue retries by clientId', async () => {
    const a = await registerUser(server.base);
    const { socket } = await connectUser(a.token);
    const received = collect(socket, 'receive_message');
    const payload = { roomId: 'saved-messages', text: 'из офлайн-очереди', clientId: 'c-retry-1' };
    const first = await emit(socket, 'send_message', payload);
    const second = await emit(socket, 'send_message', payload);
    expect(first).toMatchObject({ ok: true, clientId: 'c-retry-1' });
    expect(second).toMatchObject({ ok: true, id: first.id, duplicate: true });
    await sleep(50);
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ id: first.id, clientId: 'c-retry-1', sender: a.user.username });
  });

  it('refuses rooms the user does not belong to and spoofed senders', async () => {
    const a = await registerUser(server.base);
    const { socket } = await connectUser(a.token);
    expect(await emit(socket, 'send_message', { roomId: 'dm-alice-bob', text: 'hi' })).toMatchObject({ ok: false });
    expect(await emit(socket, 'send_message', { roomId: 'saved-messages', text: 'hi', sender: 'someone' })).toMatchObject({ ok: false });
    expect(await emit(socket, 'send_message', { roomId: 'saved-messages', text: 'x', ttl: 10 })).toMatchObject({ ok: false });
  });

  it('keeps «Избранное» private to its owner', async () => {
    const a = await registerUser(server.base);
    const b = await registerUser(server.base);
    const { socket: sa } = await connectUser(a.token);
    const { socket: sb } = await connectUser(b.token);
    const leaked = collect(sb, 'receive_message');
    const ack = await emit(sa, 'send_message', { roomId: 'saved-messages', text: 'личная заметка' });
    expect(ack.ok).toBe(true);
    await sleep(50);
    expect(leaked).toHaveLength(0);

    // Nor via history, reactions or deletes
    const { history } = await connectUser(b.token);
    expect(history.some((m) => m.id === ack.id)).toBe(false);
    const reacted = collect(sa, 'reactions_updated');
    sb.emit('toggle_reaction', { messageId: ack.id, roomId: 'saved-messages', reaction: '👍' });
    sb.emit('delete_message', { messageId: ack.id, roomId: 'saved-messages' });
    await sleep(50);
    expect(reacted).toHaveLength(0);
    expect((await connectUser(a.token)).history.some((m) => m.id === ack.id)).toBe(true);
  });

  it('schedules messages and delivers them from the sweeper', async () => {
    const a = await registerUser(server.base);
    const { socket } = await connectUser(a.token);
    const tooSoon = await emit(socket, 'send_message', { roomId: 'saved-messages', text: 'x', scheduledAt: Date.now() + 1000 });
    expect(tooSoon.ok).toBe(false);

    const at = Date.now() + 60_000;
    const ack = await emit(socket, 'send_message', { roomId: 'saved-messages', text: 'позже', scheduledAt: at, silent: true });
    expect(ack).toMatchObject({ ok: true, scheduled: true, scheduledAt: at });
    expect((await emit(socket, 'get_scheduled_messages', {})).messages.map((m) => m.id)).toEqual([ack.id]);

    const delivered = nextEvent(socket, 'receive_message');
    runChatSweep(server.io, at + 1);
    const msg = await delivered;
    expect(msg).toMatchObject({ id: ack.id, text: 'позже', silent: true });
    expect(msg.scheduledAt).toBeUndefined();
    expect((await emit(socket, 'get_scheduled_messages', {})).messages).toHaveLength(0);
  });

  it('cancels a scheduled message', async () => {
    const a = await registerUser(server.base);
    const { socket } = await connectUser(a.token);
    const ack = await emit(socket, 'send_message', { roomId: 'saved-messages', text: 'отмена', scheduledAt: Date.now() + 60_000 });
    expect(await emit(socket, 'cancel_scheduled_message', { messageId: ack.id })).toEqual({ ok: true });
    expect((await emit(socket, 'get_scheduled_messages', {})).messages).toHaveLength(0);
  });
});

describe('secret chats (E2EE)', () => {
  it('only relays ciphertext and self-destructs on TTL', async () => {
    const a = await registerUser(server.base);
    const b = await registerUser(server.base);
    const { socket: sa } = await connectUser(a.token);
    const { socket: sb } = await connectUser(b.token);

    const { room } = await emit(sa, 'create_secret_chat', { targetUserId: b.user.username });
    expect(room).toMatchObject({ secret: true, type: 'direct' });
    expect(room.id.startsWith('secret-')).toBe(true);

    expect(await emit(sa, 'send_message', { roomId: room.id, text: 'открытый текст' })).toMatchObject({ ok: false });
    expect(await emit(sa, 'send_message', { roomId: room.id, encrypted: { ...envelope(), alg: 'none' } })).toMatchObject({ ok: false });
    expect(await emit(sa, 'send_message', { roomId: room.id, encrypted: envelope(), ttl: 7 })).toMatchObject({ ok: false });

    const incoming = nextEvent(sb, 'receive_message');
    const ack = await emit(sa, 'send_message', { roomId: room.id, text: 'утечка?', encrypted: { ...envelope(), extra: 'x' }, ttl: 10 });
    expect(ack.ok).toBe(true);
    const msg = await incoming;
    expect(msg.text).toBe('');
    expect(msg.encrypted).toEqual(envelope());
    expect(msg.ttl).toBe(10);
    expect(msg.expiresAt - msg.timestamp).toBe(10_000);

    const gone = nextEvent(sb, 'message_deleted');
    runChatSweep(server.io, msg.expiresAt + 1);
    expect(await gone).toEqual({ messageId: ack.id, roomId: room.id, reason: 'expired' });
  });

  it('relays public identity keys only when valid', async () => {
    const a = await registerUser(server.base);
    const b = await registerUser(server.base);
    const { socket: sa } = await connectUser(a.token);
    const { socket: sb } = await connectUser(b.token);
    const raw = Buffer.alloc(65, 9);
    raw[0] = 0x04;
    const publicKey = raw.toString('base64');
    expect(await emit(sa, 'e2ee_publish_key', { publicKey: 'bogus' })).toMatchObject({ ok: false });
    expect(await emit(sa, 'e2ee_publish_key', { publicKey })).toEqual({ ok: true });
    expect((await emit(sb, 'e2ee_get_key', { userId: a.user.username })).publicKey).toBe(publicKey);
  });

  it('cannot open a secret chat with a non-existent user', async () => {
    const a = await registerUser(server.base);
    const { socket } = await connectUser(a.token);
    expect(await emit(socket, 'create_secret_chat', { targetUserId: 'ghost_user_404' })).toMatchObject({ error: expect.any(String) });
  });
});
