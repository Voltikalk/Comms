import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { io as connect } from 'socket.io-client';
import { registerUser, startTestServer } from '../test-utils.js';

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

/** Connects and resolves with the initial (per-user filtered) stories snapshot. */
function connectUser(token) {
  const socket = connect(server.base, { auth: { token }, transports: ['websocket'], reconnection: false, forceNew: true });
  sockets.push(socket);
  return new Promise((resolve, reject) => {
    socket.once('stories_state', (stories) => resolve({ socket, stories }));
    socket.once('connect_error', reject);
  });
}

const emit = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, resolve));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ids = (stories, author) => (stories[author] || []).map((s) => s.id).sort();

describe('stories privacy', () => {
  it('only delivers stories to their audience', async () => {
    const a = await registerUser(server.base);
    const contact = await registerUser(server.base);
    const stranger = await registerUser(server.base);
    const author = a.user.username;

    const { socket: sa } = await connectUser(a.token);
    await emit(sa, 'create_direct_chat', { targetUserId: contact.user.username });
    for (const privacy of ['everyone', 'contacts', 'close_friends', 'only_me']) {
      sa.emit('send_story', { id: `s-${privacy}`, type: 'text', data: privacy, privacy });
    }
    await sleep(150);

    expect(ids((await connectUser(a.token)).stories, author)).toEqual(['s-close_friends', 's-contacts', 's-everyone', 's-only_me']);
    expect(ids((await connectUser(contact.token)).stories, author)).toEqual(['s-close_friends', 's-contacts', 's-everyone']);
    expect(ids((await connectUser(stranger.token)).stories, author)).toEqual(['s-everyone']);
  });

  it('hides other viewers from non-authors and ignores views of hidden stories', async () => {
    const a = await registerUser(server.base);
    const b = await registerUser(server.base);
    const c = await registerUser(server.base);
    const author = a.user.username;

    const { socket: sa } = await connectUser(a.token);
    sa.emit('send_story', { id: 'pub', type: 'text', data: 'hi' });
    sa.emit('send_story', { id: 'secret', type: 'text', data: 'mine', privacy: 'only_me' });
    await sleep(100);

    const { socket: sb } = await connectUser(b.token);
    const { socket: sc } = await connectUser(c.token);
    sb.emit('view_story', { storyId: 'pub', storyAuthor: author });
    sc.emit('view_story', { storyId: 'pub', storyAuthor: author });
    sc.emit('view_story', { storyId: 'secret', storyAuthor: author });
    await sleep(150);

    const own = (await connectUser(a.token)).stories[author];
    expect(own.find((s) => s.id === 'pub').views.sort()).toEqual([b.user.username, c.user.username].sort());
    expect(own.find((s) => s.id === 'secret').views).toEqual([]);

    const seenByB = (await connectUser(b.token)).stories[author];
    expect(seenByB.find((s) => s.id === 'pub').views).toEqual([b.user.username]);
  });

  it('rejects media stories that point at local blob/data URLs', async () => {
    const a = await registerUser(server.base);
    const { socket } = await connectUser(a.token);
    socket.emit('send_story', { id: 'blob', type: 'image', data: 'blob:http://localhost/abc' });
    socket.emit('send_story', { id: 'data', type: 'image', data: 'data:image/png;base64,AAAA' });
    socket.emit('send_story', { id: 'ok', type: 'image', data: '/uploads/123-abc.jpg' });
    await sleep(100);
    expect(ids((await connectUser(a.token)).stories, a.user.username)).toEqual(['ok']);
  });
});
