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

  it('keeps one reaction per viewer and toggles it off', async () => {
    const a = await registerUser(server.base);
    const b = await registerUser(server.base);
    const author = a.user.username;

    const { socket: sa } = await connectUser(a.token);
    sa.emit('send_story', { id: 'r1', type: 'text', data: 'react' });
    await sleep(100);

    const { socket: sb } = await connectUser(b.token);
    sb.emit('react_story', { storyId: 'r1', storyAuthor: author, emoji: '🔥' });
    sb.emit('react_story', { storyId: 'r1', storyAuthor: author, emoji: '❤️' });
    await sleep(150);
    let own = (await connectUser(a.token)).stories[author].find((s) => s.id === 'r1');
    expect(own.reactions).toEqual({ '❤️': [b.user.username] });
    expect(own.views).toEqual([b.user.username]);

    sb.emit('react_story', { storyId: 'r1', storyAuthor: author, emoji: '❤️' });
    await sleep(150);
    own = (await connectUser(a.token)).stories[author].find((s) => s.id === 'r1');
    expect(own.reactions).toEqual({});
  });

  it('records view times for the author only', async () => {
    const a = await registerUser(server.base);
    const b = await registerUser(server.base);
    const author = a.user.username;

    const { socket: sa } = await connectUser(a.token);
    sa.emit('send_story', { id: 'vt', type: 'text', data: 'time' });
    await sleep(100);
    const before = Date.now();
    const { socket: sb } = await connectUser(b.token);
    sb.emit('view_story', { storyId: 'vt', storyAuthor: author });
    sa.emit('view_story', { storyId: 'vt', storyAuthor: author });
    await sleep(150);

    const own = (await connectUser(a.token)).stories[author].find((s) => s.id === 'vt');
    expect(own.views).toEqual([b.user.username]);
    expect(own.viewTimes[b.user.username]).toBeGreaterThanOrEqual(before);
    const seen = (await connectUser(b.token)).stories[author].find((s) => s.id === 'vt');
    expect(seen.viewTimes).toBeUndefined();
  });

  it('lets only the author change privacy and pin state after publishing', async () => {
    const a = await registerUser(server.base);
    const b = await registerUser(server.base);
    const author = a.user.username;

    const { socket: sa } = await connectUser(a.token);
    sa.emit('send_story', { id: 'up', type: 'text', data: 'edit me' });
    await sleep(100);
    const { socket: sb } = await connectUser(b.token);
    sb.emit('update_story', { storyId: 'up', privacy: 'only_me' });
    await sleep(100);
    expect(ids((await connectUser(b.token)).stories, author)).toEqual(['up']);

    sa.emit('update_story', { storyId: 'up', isPinned: true });
    await sleep(100);
    const pinned = (await connectUser(a.token)).stories[author][0];
    expect(pinned.isPinned).toBe(true);
    expect(pinned.expiresAt - pinned.timestamp).toBeGreaterThan(300 * 24 * 60 * 60 * 1000);

    sa.emit('update_story', { storyId: 'up', privacy: 'only_me', isPinned: false });
    await sleep(100);
    expect(ids((await connectUser(b.token)).stories, author)).toEqual([]);
    const own = (await connectUser(a.token)).stories[author][0];
    expect(own.privacy).toBe('only_me');
    expect(own.expiresAt - own.timestamp).toBe(24 * 60 * 60 * 1000);
  });

  it('limits close-friends stories to the explicit list once it is set', async () => {
    const a = await registerUser(server.base);
    const friend = await registerUser(server.base);
    const contact = await registerUser(server.base);
    const author = a.user.username;

    const { socket: sa } = await connectUser(a.token);
    await emit(sa, 'create_direct_chat', { targetUserId: contact.user.username });
    sa.emit('send_story', { id: 'cf', type: 'text', data: 'friends', privacy: 'close_friends' });
    await sleep(100);
    expect(ids((await connectUser(contact.token)).stories, author)).toEqual(['cf']);
    expect(ids((await connectUser(friend.token)).stories, author)).toEqual([]);

    const saved = await emit(sa, 'set_close_friends', { friends: [friend.user.username, 'no_such_user', author] });
    expect(saved).toEqual({ ok: true, friends: [friend.user.username.toLowerCase()] });
    expect(await emit(sa, 'get_close_friends', {})).toEqual(saved);
    expect(ids((await connectUser(contact.token)).stories, author)).toEqual([]);
    expect(ids((await connectUser(friend.token)).stories, author)).toEqual(['cf']);

    expect(await emit(sa, 'set_close_friends', { friends: null })).toEqual({ ok: true, friends: null });
    expect(ids((await connectUser(contact.token)).stories, author)).toEqual(['cf']);
  });

  it('derives the story card of a story reply on the server', async () => {
    const a = await registerUser(server.base);
    const b = await registerUser(server.base);
    const author = a.user.username;

    const { socket: sa } = await connectUser(a.token);
    sa.emit('send_story', { id: 'rep', type: 'text', data: 'reply to me', background: 'sunset' });
    sa.emit('send_story', { id: 'hidden', type: 'text', data: 'nope', privacy: 'only_me' });
    await sleep(100);

    const { socket: sb } = await connectUser(b.token);
    const { room } = await emit(sb, 'create_direct_chat', { targetUserId: author });
    const forged = { authorId: author, storyId: 'rep', type: 'image', preview: 'https://evil.example/x.png' };
    expect((await emit(sb, 'send_message', { roomId: room.id, text: '🔥', storyReply: forged })).ok).toBe(true);
    expect((await emit(sb, 'send_message', { roomId: room.id, text: 'secret', storyReply: { authorId: author, storyId: 'hidden' } })).ok).toBe(true);

    const msgs = await new Promise((resolve) => {
      const s = connect(server.base, { auth: { token: a.token }, transports: ['websocket'], reconnection: false, forceNew: true });
      sockets.push(s);
      s.once('history', resolve);
    });
    const replies = msgs.filter((m) => m.roomId === room.id);
    expect(replies.find((m) => m.text === '🔥').storyReply).toEqual({
      authorId: author,
      storyId: 'rep',
      type: 'text',
      preview: 'reply to me',
      background: 'sunset',
    });
    expect(replies.find((m) => m.text === 'secret').storyReply).toBeUndefined();
  });
});
