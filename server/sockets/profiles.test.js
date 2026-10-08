import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { io as connect } from 'socket.io-client';
import { registerUser, startTestServer } from '../test-utils.js';
import { validateProfileUpdate } from './profiles.js';

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

/** Connects and resolves with the initial profiles snapshot. */
function connectUser(token) {
  const socket = connect(server.base, { auth: { token }, transports: ['websocket'], reconnection: false, forceNew: true });
  sockets.push(socket);
  return new Promise((resolve, reject) => {
    socket.once('profiles_state', (profiles) => resolve({ socket, profiles }));
    socket.once('connect_error', reject);
  });
}

const emit = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, resolve));
const next = (socket, event) => new Promise((resolve) => socket.once(event, resolve));

describe('profile validation', () => {
  it('rejects invalid fields and keeps only known ones', () => {
    expect(validateProfileUpdate({ firstName: '   ' }).error).toBeTruthy();
    expect(validateProfileUpdate({ bio: 'x'.repeat(71) }).error).toBeTruthy();
    expect(validateProfileUpdate({ phoneNumber: 'call me' }).error).toBeTruthy();
    expect(validateProfileUpdate({ avatarUrl: 'data:image/png;base64,AAAA' }).error).toBeTruthy();
    expect(validateProfileUpdate({ avatarUrl: 'javascript:alert(1)' }).error).toBeTruthy();
    expect(validateProfileUpdate({ username: 'hijack' }).error).toBeTruthy();
    expect(validateProfileUpdate({ firstName: ' Ann ', username: 'hijack', avatarUrl: '/uploads/a.jpg' }).changes).toEqual({
      firstName: 'Ann',
      avatarUrl: '/uploads/a.jpg',
    });
  });

  it('validates profile color and birthday', () => {
    expect(validateProfileUpdate({ profileColor: 'violet' }).changes).toEqual({ profileColor: 'violet' });
    expect(validateProfileUpdate({ profileColor: '' }).changes).toEqual({ profileColor: '' });
    expect(validateProfileUpdate({ profileColor: '#ff0000' }).error).toBeTruthy();
    expect(validateProfileUpdate({ birthday: '03-14' }).changes).toEqual({ birthday: '03-14' });
    expect(validateProfileUpdate({ birthday: '02-29' }).changes).toEqual({ birthday: '02-29' });
    expect(validateProfileUpdate({ birthday: '1995-07-01' }).changes).toEqual({ birthday: '1995-07-01' });
    expect(validateProfileUpdate({ birthday: '' }).changes).toEqual({ birthday: '' });
    expect(validateProfileUpdate({ birthday: '2001-02-29' }).error).toBeTruthy();
    expect(validateProfileUpdate({ birthday: '13-01' }).error).toBeTruthy();
    expect(validateProfileUpdate({ birthday: '1800-01-01' }).error).toBeTruthy();
    expect(validateProfileUpdate({ birthday: `${new Date().getFullYear() + 1}-01-01` }).error).toBeTruthy();
    expect(validateProfileUpdate({ birthday: 'вчера' }).error).toBeTruthy();
  });
});

describe('profile sync', () => {
  it('delivers updates to contacts and hides the phone from strangers', async () => {
    const a = await registerUser(server.base);
    const contact = await registerUser(server.base);
    const stranger = await registerUser(server.base);
    const id = a.user.username;

    const { socket: sa, profiles: own } = await connectUser(a.token);
    expect(own[id]).toMatchObject({ userId: id, username: id });
    await emit(sa, 'create_direct_chat', { targetUserId: contact.user.username });

    const { socket: sc } = await connectUser(contact.token);
    const pushed = next(sc, 'profile_updated');
    const res = await emit(sa, 'update_profile', { firstName: 'Анна', bio: 'Привет', phoneNumber: '+7 900 000-00-00', username: 'nope' });
    expect(res).toMatchObject({ ok: true, profile: { firstName: 'Анна', bio: 'Привет', username: id, phoneNumber: '+7 900 000-00-00' } });
    expect(await pushed).toMatchObject({ userId: id, firstName: 'Анна', phoneNumber: '+7 900 000-00-00' });

    const { profiles: contactView } = await connectUser(contact.token);
    expect(contactView[id]).toMatchObject({ firstName: 'Анна', bio: 'Привет' });

    const { socket: ss, profiles: strangerView } = await connectUser(stranger.token);
    expect(strangerView[id]).toBeUndefined();
    const { profiles } = await emit(ss, 'get_profiles', { userIds: [id] });
    expect(profiles[id]).toMatchObject({ firstName: 'Анна', bio: 'Привет' });
    expect(profiles[id].phoneNumber).toBeUndefined();

    await emit(sa, 'update_profile', { birthday: '1990-05-20', profileColor: 'green' });
    const { profiles: later } = await emit(ss, 'get_profiles', { userIds: [id] });
    expect(later[id]).toMatchObject({ profileColor: 'green' });
    expect(later[id].birthday).toBeUndefined();
    const { profiles: friendly } = await emit(sc, 'get_profiles', { userIds: [id] });
    expect(friendly[id]).toMatchObject({ birthday: '1990-05-20', profileColor: 'green' });
  });

  it('rejects invalid updates without changing the profile', async () => {
    const a = await registerUser(server.base);
    const { socket } = await connectUser(a.token);
    const res = await emit(socket, 'update_profile', { firstName: '' });
    expect(res.ok).toBe(false);
    const { profiles } = await emit(socket, 'get_profiles', { userIds: [a.user.username] });
    expect(profiles[a.user.username].firstName).toBe(a.user.username);
  });
});
