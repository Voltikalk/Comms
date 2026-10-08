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

/** Connects and records every event, so tests can wait for pushes. */
async function connectUser(token) {
  const socket = connect(server.base, { auth: { token }, transports: ['websocket'], reconnection: false, forceNew: true });
  sockets.push(socket);
  const events = [];
  socket.onAny((event, payload) => events.push({ event, payload }));
  await new Promise((resolve, reject) => {
    socket.once('rooms_list', resolve);
    socket.once('connect_error', reject);
  });
  return { socket, events };
}

const emit = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, resolve));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const last = (events, name) => events.filter((e) => e.event === name).at(-1)?.payload;

async function setup(n) {
  const users = [];
  for (let i = 0; i < n; i += 1) {
    const reg = await registerUser(server.base);
    users.push({ ...(await connectUser(reg.token)), id: reg.user.username.toLowerCase() });
  }
  return users;
}

describe('groups', () => {
  it('creates a group with the creator as owner and a primary invite link', async () => {
    const [owner, member] = await setup(2);
    const res = await emit(owner.socket, 'create_group_chat', { name: 'Команда', participantIds: [member.id] });
    expect(res.ok).toBe(true);
    expect(res.room.ownerId).toBe(owner.id);
    expect(res.room.participants).toEqual([owner.id, member.id]);
    expect(res.room.inviteLinks.some((l) => l.primary && l.active)).toBe(true);
    await sleep(80);
    const created = last(member.events, 'room_created');
    expect(created.id).toBe(res.room.id);
    // Members can share the primary link (addMembers is on by default) but never see the ban list.
    expect(created.banned).toBeUndefined();
    const service = member.events.find((e) => e.event === 'receive_message' && e.payload.service)?.payload;
    expect(service.service.type).toBe('created');
  });

  it('enforces rights for info, members and admins', async () => {
    const [owner, admin, member, outsider] = await setup(4);
    const { room } = await emit(owner.socket, 'create_group_chat', { name: 'G', participantIds: [admin.id, member.id] });

    expect((await emit(member.socket, 'update_room', { roomId: room.id, name: 'Взлом' })).ok).toBe(false);
    expect((await emit(member.socket, 'remove_member', { roomId: room.id, userId: admin.id })).ok).toBe(false);

    expect((await emit(owner.socket, 'set_admin', { roomId: room.id, userId: admin.id, rights: { banUsers: true, addAdmins: false }, title: 'Модер' })).ok).toBe(true);
    await sleep(60);
    expect(last(member.events, 'room_updated').admins[admin.id]).toMatchObject({ title: 'Модер', promotedBy: owner.id });

    // An admin cannot remove the owner, nor promote people without addAdmins.
    expect((await emit(admin.socket, 'remove_member', { roomId: room.id, userId: owner.id })).ok).toBe(false);
    expect((await emit(admin.socket, 'set_admin', { roomId: room.id, userId: member.id, rights: {} })).ok).toBe(false);

    // Ban → removed from the chat and cannot come back through the link.
    expect((await emit(admin.socket, 'remove_member', { roomId: room.id, userId: member.id, ban: true })).ok).toBe(true);
    await sleep(60);
    expect(last(member.events, 'room_removed')).toMatchObject({ roomId: room.id, reason: 'banned' });
    const code = room.inviteLinks.find((l) => l.primary).code;
    expect((await emit(member.socket, 'join_room', { code })).ok).toBe(false);
    expect((await emit(member.socket, 'send_message', { roomId: room.id, text: 'привет' })).ok).toBe(false);

    // Anybody else can join with the link.
    const preview = await emit(outsider.socket, 'get_invite_info', { code });
    expect(preview.room).toMatchObject({ name: 'G', memberCount: 2, isMember: false });
    expect((await emit(outsider.socket, 'join_room', { code })).ok).toBe(true);
    await sleep(60);
    expect(last(outsider.events, 'room_history').roomId).toBe(room.id);
  });

  it('applies member permissions and slow mode', async () => {
    const [owner, member] = await setup(2);
    const { room } = await emit(owner.socket, 'create_group_chat', { name: 'P', participantIds: [member.id] });

    await emit(owner.socket, 'update_room', { roomId: room.id, permissions: { sendMessages: false } });
    expect((await emit(member.socket, 'send_message', { roomId: room.id, text: 'a' })).ok).toBe(false);
    expect((await emit(owner.socket, 'send_message', { roomId: room.id, text: 'a' })).ok).toBe(true);

    await emit(owner.socket, 'update_room', { roomId: room.id, permissions: { sendMessages: true }, slowMode: 30 });
    expect((await emit(member.socket, 'send_message', { roomId: room.id, text: 'b' })).ok).toBe(true);
    const second = await emit(member.socket, 'send_message', { roomId: room.id, text: 'c' });
    expect(second.ok).toBe(false);
    expect(second.error).toMatch(/Медленный режим/);
  });

  it('lets admins delete other people’s messages and pin for everyone', async () => {
    const [owner, member] = await setup(2);
    const { room } = await emit(owner.socket, 'create_group_chat', { name: 'D', participantIds: [member.id] });
    const sent = await emit(member.socket, 'send_message', { roomId: room.id, text: 'спам' });

    expect((await emit(member.socket, 'pin_message', { roomId: room.id, messageId: sent.id })).ok).toBe(false);
    expect((await emit(owner.socket, 'pin_message', { roomId: room.id, messageId: sent.id })).ok).toBe(true);
    await sleep(60);
    expect(last(member.events, 'room_updated').pinnedIds).toEqual([sent.id]);

    owner.socket.emit('delete_message', { roomId: room.id, messageId: sent.id });
    await sleep(80);
    expect(member.events.some((e) => e.event === 'message_deleted' && e.payload.messageId === sent.id)).toBe(true);
  });

  it('passes ownership on when the owner leaves', async () => {
    const [owner, admin, member] = await setup(3);
    const { room } = await emit(owner.socket, 'create_group_chat', { name: 'L', participantIds: [member.id, admin.id] });
    await emit(owner.socket, 'set_admin', { roomId: room.id, userId: admin.id, rights: {} });
    expect((await emit(owner.socket, 'leave_room', { roomId: room.id })).ok).toBe(true);
    await sleep(60);
    const updated = last(member.events, 'room_updated');
    expect(updated.ownerId).toBe(admin.id);
    expect(updated.participants).not.toContain(owner.id);
    expect(last(owner.events, 'room_removed')).toMatchObject({ roomId: room.id, reason: 'left' });
  });
});

describe('channels', () => {
  it('only admins post; subscribers join by @username and see counts, not each other', async () => {
    const [owner, sub1, sub2] = await setup(3);
    const username = `ch_${owner.id.replace(/[^a-z0-9]/g, '').slice(-10)}`;
    const res = await emit(owner.socket, 'create_channel', { name: 'Новости', description: 'Тест', username });
    expect(res.ok).toBe(true);
    expect(res.room.type).toBe('channel');

    expect((await emit(sub1.socket, 'create_channel', { name: 'X', username })).error).toMatch(/занята/);

    const found = await emit(sub1.socket, 'search_users', { query: username });
    expect(found.rooms.map((r) => r.id)).toContain(res.room.id);

    expect((await emit(sub1.socket, 'join_room', { username })).ok).toBe(true);
    expect((await emit(sub2.socket, 'join_room', { username: `@${username}` })).ok).toBe(true);
    await sleep(60);
    const seen = last(sub2.events, 'room_updated') || last(sub2.events, 'room_created');
    expect(seen.memberCount).toBe(3);
    expect(seen.participants).not.toContain(sub1.id);

    expect((await emit(sub1.socket, 'send_message', { roomId: res.room.id, text: 'можно?' })).ok).toBe(false);

    await emit(owner.socket, 'update_room', { roomId: res.room.id, signMessages: true });
    const post = await emit(owner.socket, 'send_message', { roomId: res.room.id, text: 'Первый пост' });
    expect(post.ok).toBe(true);
    await sleep(60);
    const received = sub1.events.find((e) => e.event === 'receive_message' && e.payload.id === post.id).payload;
    expect(received.signature).toBeTruthy();

    sub1.socket.emit('mark_read', { roomId: res.room.id, messageIds: [post.id] });
    await sleep(80);
    const read = last(owner.events, 'messages_read');
    expect(read.updatedMessages[0]).toMatchObject({ messageId: post.id, views: 1, readBy: [] });
  });

  it('invite links respect usage limits and revocation', async () => {
    const [owner, a, b] = await setup(3);
    const { room } = await emit(owner.socket, 'create_channel', { name: 'Закрытый' });
    const { link } = await emit(owner.socket, 'create_invite_link', { roomId: room.id, usageLimit: 1, title: 'Один раз' });
    expect((await emit(a.socket, 'join_room', { code: link.code })).ok).toBe(true);
    expect((await emit(b.socket, 'join_room', { code: link.code })).ok).toBe(false);

    const primary = room.inviteLinks.find((l) => l.primary).code;
    expect((await emit(owner.socket, 'revoke_invite_link', { roomId: room.id, code: primary })).ok).toBe(true);
    expect((await emit(b.socket, 'join_room', { code: primary })).ok).toBe(false);

    expect((await emit(owner.socket, 'delete_room', { roomId: room.id })).ok).toBe(true);
    await sleep(60);
    expect(last(a.events, 'room_removed')).toMatchObject({ roomId: room.id, reason: 'deleted' });
  });
});
