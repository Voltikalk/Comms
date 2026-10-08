/**
 * Groups and channels, Telegram-style: creation, info editing, public
 * @usernames and invite links, members (add / remove / ban), admins with
 * granular rights and custom titles, ownership transfer, member permissions,
 * slow mode, shared pins, leaving and deleting.
 *
 * Every change is broadcast as a per-member `room_updated` (each viewer only
 * sees what their role allows); people who lose access get `room_removed`.
 * Visible changes also post a service message into the chat.
 */
import crypto from 'crypto';
import { checkSocketRateLimit } from '../middleware/rateLimit.js';
import {
  ADMIN_RIGHTS,
  MAX_GROUP_MEMBERS,
  MAX_INVITE_LINKS,
  SLOW_MODE_VALUES,
  USERNAME_RE,
  can,
  defaultPermissions,
  ensureManaged,
  findInviteLink,
  hasRight,
  isInviteUsable,
  isManaged,
  newInviteCode,
  outranks,
  roleOf,
  roomForViewer,
  roomPreview,
  sanitizePermissions,
  sanitizeRights,
} from '../services/roles.js';
import { resolveUserUuid, supabase } from '../services/supabase.js';
import { canSeeMessage, memoryRooms, messageHistory, persistRoomSettings } from '../services/store.js';
import { getUser } from '../services/users.js';
import { deliverMessage } from './chat.js';

const MAX_TITLE = 128;
const MAX_DESCRIPTION = 255;
const MAX_ADMIN_TITLE = 16;
const MAX_LINK_TITLE = 32;
const MAX_PINS = 50;
const USER_ID_RE = /^[\w.-]{1,64}$/;

const cleanId = (v) => (typeof v === 'string' && USER_ID_RE.test(v.trim()) ? v.trim().toLowerCase() : '');
const cleanText = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
/** Same rule as profile photos: already uploaded to the server (or https), or empty to remove. */
const isAvatarUrl = (v) => v === '' || (typeof v === 'string' && v.length <= 2048 && (/^\/uploads\/[\w.-]+$/.test(v) || /^https:\/\//.test(v)));

/** A @username is unique across users, groups and channels. */
export function isUsernameTaken(username, exceptRoomId) {
  const u = username.toLowerCase();
  if (getUser(u)) return true;
  for (const r of memoryRooms.values()) if (r.id !== exceptRoomId && r.username === u) return true;
  return false;
}

export const findRoomByUsername = (username) => {
  const u = String(username || '').replace(/^@/, '').toLowerCase();
  if (!u) return null;
  for (const r of memoryRooms.values()) if (isManaged(r) && r.username === u) return r;
  return null;
};

/** Public groups / channels for the global search (by @username or title). */
export function searchPublicRooms(query, viewer, limit = 10) {
  const q = String(query || '').trim().replace(/^@/, '').toLowerCase();
  if (q.length < 2) return [];
  const out = [];
  for (const r of memoryRooms.values()) {
    if (!isManaged(r) || !r.username || r.banned?.includes(viewer)) continue;
    if (r.username.includes(q) || r.name.toLowerCase().includes(q)) out.push(roomPreview(ensureManaged(r), viewer));
    if (out.length >= limit) break;
  }
  return out;
}

/** Sends every member (and optionally extra people) their own view of the room. */
export function syncRoom(io, room) {
  for (const p of room.participants) io.to(p).emit('room_updated', roomForViewer(room, p));
  persistRoomSettings(room);
}

/** Takes `userId` out of the room's socket.io channel and their chat list. */
function detachUser(io, room, userId, reason) {
  io.in(userId).socketsLeave(room.id);
  io.to(userId).emit('room_removed', { roomId: room.id, reason });
}

/** New members get the room, its history and are subscribed to it. */
function attachUser(io, room, userId) {
  io.in(userId).socketsJoin(room.id);
  io.to(userId).emit('room_created', roomForViewer(room, userId));
  io.to(userId).emit('room_history', {
    roomId: room.id,
    messages: messageHistory.filter((m) => m.roomId === room.id && canSeeMessage(m, userId)),
  });
}

/** Posts a service message ("X добавил Y", "Название изменено…"). */
export function postService(io, room, actor, service) {
  deliverMessage(io, {
    id: crypto.randomUUID(),
    roomId: room.id,
    sender: actor,
    text: '',
    timestamp: Date.now(),
    service,
    silent: true,
    readBy: [],
  });
}

function removeRoomEverywhere(io, room, reason) {
  memoryRooms.delete(room.id);
  for (const p of room.participants) detachUser(io, room, p, reason);
  for (let i = messageHistory.length - 1; i >= 0; i -= 1) if (messageHistory[i].roomId === room.id) messageHistory.splice(i, 1);
  if (room.dbId) {
    void supabase
      .from('rooms')
      .update({ is_active: false })
      .eq('id', room.dbId)
      .then(({ error }) => error && console.warn('[Supabase Room Delete]', error.message), () => {});
  }
}

/** Mirrors membership into Supabase (best effort — the in-memory room is the source of truth). */
async function persistNewRoom(room, creator) {
  try {
    const creatorUuid = await resolveUserUuid(creator);
    if (!creatorUuid) return;
    const { data: dbRoom } = await supabase
      .from('rooms')
      .insert({ name: room.name, type: room.type, created_by: creatorUuid, avatar_url: room.avatarUrl, description: room.description || null })
      .select()
      .single();
    if (!dbRoom) return;
    room.dbId = dbRoom.id;
    persistRoomSettings(room);
    const inserts = [];
    for (const m of room.participants) {
      const uuid = await resolveUserUuid(m);
      if (uuid) inserts.push({ room_id: dbRoom.id, user_id: uuid, role: roleOf(room, m) === 'member' ? 'member' : 'admin' });
    }
    if (inserts.length > 0) await supabase.from('room_members').insert(inserts);
  } catch (err) {
    console.warn('[Supabase Room Save Warning]', err.message);
  }
}

function persistMembership(room, userId, joined) {
  if (!room.dbId) return;
  void (async () => {
    try {
      const uuid = await resolveUserUuid(userId);
      if (!uuid) return;
      if (joined) {
        await supabase.from('room_members').upsert({ room_id: room.dbId, user_id: uuid, role: 'member', left_at: null }, { onConflict: 'room_id,user_id' });
      } else {
        await supabase.from('room_members').update({ left_at: new Date().toISOString() }).eq('room_id', room.dbId).eq('user_id', uuid);
      }
    } catch (err) {
      console.warn('[Supabase Membership Warning]', err.message);
    }
  })();
}

/** Owner leaves: the longest-serving admin (else the first member) takes over. */
function pickNextOwner(room, leaving) {
  const admins = Object.keys(room.admins).filter((a) => a !== leaving && room.participants.includes(a));
  return admins[0] || room.participants.find((p) => p !== leaving) || null;
}

export function registerGroupHandlers({ io, socket, user, on }) {
  const fail = (ack, error) => {
    ack?.({ ok: false, error });
    return undefined;
  };
  const limited = (key, n = 30, ms = 60000) => !checkSocketRateLimit(socket.id, key, n, ms);

  /** Loads a managed room the current user belongs to. */
  const getRoom = (roomId) => {
    const room = typeof roomId === 'string' ? memoryRooms.get(roomId) : undefined;
    if (!isManaged(room)) return null;
    ensureManaged(room);
    return roleOf(room, user) ? room : null;
  };

  const createRoom = (type, payload, ack) => {
    const title = cleanText(payload.name, MAX_TITLE);
    if (!title) return fail(ack, type === 'channel' ? 'Укажите название канала' : 'Укажите название группы');
    if (limited('create_room', 5, 60000)) return fail(ack, 'Слишком часто. Попробуйте через минуту.');
    const avatarUrl = typeof payload.avatarUrl === 'string' && isAvatarUrl(payload.avatarUrl) ? payload.avatarUrl : '';

    let username;
    if (payload.username) {
      username = String(payload.username).replace(/^@/, '').toLowerCase();
      if (!USERNAME_RE.test(username)) return fail(ack, 'Ссылка: 5–32 символа, латиница, цифры и _, начинается с буквы.');
      if (isUsernameTaken(username)) return fail(ack, 'Эта ссылка уже занята.');
    }

    const ids = Array.isArray(payload.participantIds) ? payload.participantIds.map(cleanId).filter(Boolean) : [];
    const members = [...new Set([user, ...ids])].slice(0, MAX_GROUP_MEMBERS);
    const room = ensureManaged({
      id: `${type === 'channel' ? 'channel' : 'group'}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      name: title,
      type,
      participants: members,
      avatarUrl,
      description: cleanText(payload.description, MAX_DESCRIPTION),
      ownerId: user,
      admins: {},
      permissions: defaultPermissions(),
      slowMode: 0,
      ...(username ? { username } : {}),
      ...(type === 'channel' ? { signMessages: false } : {}),
      createdAt: Date.now(),
    });
    memoryRooms.set(room.id, room);
    for (const m of members) {
      io.in(m).socketsJoin(room.id);
      io.to(m).emit('room_created', roomForViewer(room, m));
    }
    postService(io, room, user, { type: 'created', text: title });
    void persistNewRoom(room, user);
    ack?.({ ok: true, room: roomForViewer(room, user) });
  };

  on('create_group_chat', (payload, ack) => createRoom('group', payload, ack));
  on('create_channel', (payload, ack) => createRoom('channel', payload, ack));

  on('update_room', (payload, ack) => {
    if (limited('room_admin')) return fail(ack, 'Слишком часто.');
    const room = getRoom(payload.roomId);
    if (!room) return fail(ack, 'Чат не найден.');
    const services = [];

    const touchesInfo = ['name', 'description', 'avatarUrl', 'signMessages'].some((k) => payload[k] !== undefined);
    if (touchesInfo && !can(room, user, 'changeInfo')) return fail(ack, 'Недостаточно прав для изменения информации.');
    if (payload.username !== undefined && roleOf(room, user) !== 'owner') return fail(ack, 'Тип может менять только владелец.');
    if ((payload.permissions !== undefined || payload.slowMode !== undefined) && !hasRight(room, user, 'banUsers')) {
      return fail(ack, 'Недостаточно прав для изменения разрешений.');
    }

    if (payload.name !== undefined) {
      const title = cleanText(payload.name, MAX_TITLE);
      if (!title) return fail(ack, 'Название не может быть пустым.');
      if (title !== room.name) {
        room.name = title;
        services.push({ type: 'title', text: title });
      }
    }
    if (payload.description !== undefined) room.description = cleanText(payload.description, MAX_DESCRIPTION);
    if (payload.avatarUrl !== undefined) {
      if (!isAvatarUrl(payload.avatarUrl)) return fail(ack, 'Некорректное изображение.');
      if (payload.avatarUrl !== room.avatarUrl) {
        room.avatarUrl = payload.avatarUrl;
        services.push({ type: payload.avatarUrl ? 'photo' : 'photo_removed' });
      }
    }
    if (payload.username !== undefined) {
      if (payload.username === null || payload.username === '') delete room.username;
      else {
        const username = String(payload.username).replace(/^@/, '').toLowerCase();
        if (!USERNAME_RE.test(username)) return fail(ack, 'Ссылка: 5–32 символа, латиница, цифры и _, начинается с буквы.');
        if (isUsernameTaken(username, room.id)) return fail(ack, 'Эта ссылка уже занята.');
        room.username = username;
      }
    }
    if (payload.signMessages !== undefined && room.type === 'channel') room.signMessages = Boolean(payload.signMessages);
    if (payload.permissions !== undefined && room.type === 'group') room.permissions = sanitizePermissions(payload.permissions, room.permissions);
    if (payload.slowMode !== undefined && room.type === 'group') {
      const v = Number(payload.slowMode);
      if (!SLOW_MODE_VALUES.includes(v)) return fail(ack, 'Некорректный медленный режим.');
      room.slowMode = v;
    }

    syncRoom(io, room);
    for (const s of services) postService(io, room, user, s);
    if (room.dbId && (payload.name !== undefined || payload.avatarUrl !== undefined || payload.description !== undefined)) {
      void supabase
        .from('rooms')
        .update({ name: room.name, avatar_url: room.avatarUrl, description: room.description || null })
        .eq('id', room.dbId)
        .then(({ error }) => error && console.warn('[Supabase Room Update]', error.message), () => {});
    }
    ack?.({ ok: true, room: roomForViewer(room, user) });
  });

  on('add_members', (payload, ack) => {
    if (limited('room_admin')) return fail(ack, 'Слишком часто.');
    const room = getRoom(payload.roomId);
    if (!room) return fail(ack, 'Чат не найден.');
    if (!can(room, user, 'inviteUsers')) return fail(ack, 'Недостаточно прав для добавления участников.');
    const canUnban = hasRight(room, user, 'banUsers');
    const ids = (Array.isArray(payload.userIds) ? payload.userIds : []).map(cleanId).filter(Boolean).slice(0, 200);
    const added = [];
    const skipped = [];
    for (const id of ids) {
      if (room.participants.includes(id)) continue;
      if (room.banned.includes(id)) {
        if (!canUnban) {
          skipped.push(id);
          continue;
        }
        room.banned = room.banned.filter((b) => b !== id);
      }
      if (room.participants.length >= MAX_GROUP_MEMBERS) break;
      room.participants.push(id);
      added.push(id);
    }
    if (added.length === 0) return ack?.({ ok: true, added, skipped });
    syncRoom(io, room);
    for (const id of added) {
      attachUser(io, room, id);
      persistMembership(room, id, true);
    }
    if (room.type === 'group') postService(io, room, user, { type: 'added', targets: added });
    ack?.({ ok: true, added, skipped, room: roomForViewer(room, user) });
  });

  on('remove_member', (payload, ack) => {
    if (limited('room_admin')) return fail(ack, 'Слишком часто.');
    const room = getRoom(payload.roomId);
    const target = cleanId(payload.userId);
    if (!room) return fail(ack, 'Чат не найден.');
    if (!target || target === user) return fail(ack, 'Неверный участник.');
    if (!hasRight(room, user, 'banUsers') || !outranks(room, user, target)) return fail(ack, 'Недостаточно прав.');
    const wasMember = room.participants.includes(target);
    room.participants = room.participants.filter((p) => p !== target);
    delete room.admins[target];
    if (payload.ban && !room.banned.includes(target)) room.banned.push(target);
    syncRoom(io, room);
    if (wasMember) {
      detachUser(io, room, target, payload.ban ? 'banned' : 'removed');
      persistMembership(room, target, false);
      if (room.type === 'group') postService(io, room, user, { type: 'removed', targets: [target] });
    }
    ack?.({ ok: true, room: roomForViewer(room, user) });
  });

  on('unban_member', (payload, ack) => {
    const room = getRoom(payload.roomId);
    const target = cleanId(payload.userId);
    if (!room) return fail(ack, 'Чат не найден.');
    if (!hasRight(room, user, 'banUsers')) return fail(ack, 'Недостаточно прав.');
    room.banned = room.banned.filter((b) => b !== target);
    syncRoom(io, room);
    ack?.({ ok: true, room: roomForViewer(room, user) });
  });

  on('set_admin', (payload, ack) => {
    if (limited('room_admin')) return fail(ack, 'Слишком часто.');
    const room = getRoom(payload.roomId);
    const target = cleanId(payload.userId);
    if (!room) return fail(ack, 'Чат не найден.');
    if (!target || !room.participants.includes(target)) return fail(ack, 'Пользователь не в этом чате.');
    if (target === room.ownerId) return fail(ack, 'Права владельца изменить нельзя.');
    const actorRole = roleOf(room, user);
    if (!hasRight(room, user, 'addAdmins')) return fail(ack, 'Недостаточно прав для назначения администраторов.');
    if (room.admins[target] && !outranks(room, user, target)) return fail(ack, 'Этого администратора назначил другой пользователь.');

    if (payload.rights === null) {
      delete room.admins[target];
    } else {
      let rights = sanitizeRights(payload.rights, room.type);
      // Admins can only hand out rights they hold themselves.
      if (actorRole !== 'owner') rights = Object.fromEntries(Object.entries(rights).map(([k, v]) => [k, v && hasRight(room, user, k)]));
      room.admins[target] = {
        rights,
        title: cleanText(payload.title, MAX_ADMIN_TITLE) || undefined,
        promotedBy: room.admins[target]?.promotedBy || user,
        since: room.admins[target]?.since || Date.now(),
      };
    }
    syncRoom(io, room);
    ack?.({ ok: true, room: roomForViewer(room, user) });
  });

  on('transfer_ownership', (payload, ack) => {
    const room = getRoom(payload.roomId);
    const target = cleanId(payload.userId);
    if (!room) return fail(ack, 'Чат не найден.');
    if (roleOf(room, user) !== 'owner') return fail(ack, 'Передать права может только владелец.');
    if (!target || target === user || !room.participants.includes(target)) return fail(ack, 'Пользователь не в этом чате.');
    delete room.admins[target];
    room.ownerId = target;
    // The previous owner stays on as a full admin.
    room.admins[user] = { rights: Object.fromEntries(ADMIN_RIGHTS.map((r) => [r, true])), promotedBy: target, since: Date.now() };
    syncRoom(io, room);
    ack?.({ ok: true, room: roomForViewer(room, user) });
  });

  on('leave_room', (payload, ack) => {
    const room = getRoom(payload.roomId);
    if (!room) return fail(ack, 'Чат не найден.');
    room.participants = room.participants.filter((p) => p !== user);
    delete room.admins[user];
    if (room.participants.length === 0) {
      removeRoomEverywhere(io, { ...room, participants: [user] }, 'deleted');
      return ack?.({ ok: true });
    }
    if (room.ownerId === user) {
      room.ownerId = pickNextOwner(room, user);
      if (room.ownerId) delete room.admins[room.ownerId];
    }
    detachUser(io, room, user, 'left');
    persistMembership(room, user, false);
    syncRoom(io, room);
    if (room.type === 'group') postService(io, room, user, { type: 'left' });
    ack?.({ ok: true });
  });

  on('delete_room', (payload, ack) => {
    const room = getRoom(payload.roomId);
    if (!room) return fail(ack, 'Чат не найден.');
    if (roleOf(room, user) !== 'owner') return fail(ack, 'Удалить может только владелец.');
    removeRoomEverywhere(io, room, 'deleted');
    ack?.({ ok: true });
  });

  // --- Invite links -----------------------------------------------------------

  on('create_invite_link', (payload, ack) => {
    if (limited('room_admin')) return fail(ack, 'Слишком часто.');
    const room = getRoom(payload.roomId);
    if (!room) return fail(ack, 'Чат не найден.');
    if (!hasRight(room, user, 'inviteUsers')) return fail(ack, 'Недостаточно прав.');
    if (room.inviteLinks.filter((l) => !l.revoked).length >= MAX_INVITE_LINKS) return fail(ack, 'Слишком много ссылок.');
    const expiresAt = Number(payload.expiresAt) || undefined;
    const usageLimit = Math.floor(Number(payload.usageLimit)) || undefined;
    if (expiresAt && expiresAt <= Date.now()) return fail(ack, 'Срок действия уже истёк.');
    if (usageLimit && (usageLimit < 1 || usageLimit > 99999)) return fail(ack, 'Некорректный лимит.');
    const link = {
      code: newInviteCode(),
      title: cleanText(payload.title, MAX_LINK_TITLE) || undefined,
      createdBy: user,
      createdAt: Date.now(),
      expiresAt,
      usageLimit,
      uses: 0,
    };
    room.inviteLinks.push(link);
    syncRoom(io, room);
    ack?.({ ok: true, link, room: roomForViewer(room, user) });
  });

  on('revoke_invite_link', (payload, ack) => {
    const room = getRoom(payload.roomId);
    if (!room) return fail(ack, 'Чат не найден.');
    const link = findInviteLink(room, payload.code);
    if (!link) return fail(ack, 'Ссылка не найдена.');
    if (!hasRight(room, user, 'inviteUsers') || (link.createdBy !== user && roleOf(room, user) !== 'owner')) return fail(ack, 'Недостаточно прав.');
    if (payload.delete) {
      if (!link.revoked) return fail(ack, 'Сначала отзовите ссылку.');
      room.inviteLinks = room.inviteLinks.filter((l) => l !== link);
    } else {
      link.revoked = true;
      // Revoking the main link immediately issues a new one (Telegram "Сбросить ссылку").
      if (link.primary) {
        link.primary = false;
        room.inviteLinks.unshift({ code: newInviteCode(), primary: true, createdBy: user, createdAt: Date.now(), uses: 0 });
      }
    }
    syncRoom(io, room);
    ack?.({ ok: true, room: roomForViewer(room, user) });
  });

  /** Join preview for an invite code or a public @username. */
  const resolveJoinTarget = ({ code, username }) => {
    if (typeof username === 'string' && username) {
      const room = findRoomByUsername(username);
      return room ? { room: ensureManaged(room) } : { error: 'Канал или группа не найдены.' };
    }
    if (typeof code !== 'string' || !/^[\w-]{6,32}$/.test(code)) return { error: 'Некорректная ссылка.' };
    for (const r of memoryRooms.values()) {
      if (!isManaged(r)) continue;
      ensureManaged(r);
      const link = findInviteLink(r, code);
      if (link) return isInviteUsable(link) ? { room: r, link } : { error: 'Ссылка-приглашение недействительна или истекла.' };
    }
    return { error: 'Ссылка-приглашение не найдена.' };
  };

  on('get_invite_info', (payload, ack) => {
    if (limited('invite_lookup', 30, 60000)) return fail(ack, 'Слишком часто.');
    const { room, error } = resolveJoinTarget(payload);
    if (!room) return fail(ack, error);
    ack?.({ ok: true, room: roomPreview(room, user) });
  });

  on('join_room', (payload, ack) => {
    if (limited('invite_lookup', 30, 60000)) return fail(ack, 'Слишком часто.');
    const { room, link, error } = resolveJoinTarget(payload);
    if (!room) return fail(ack, error);
    if (room.participants.includes(user)) return ack?.({ ok: true, room: roomForViewer(room, user), already: true });
    if (room.banned.includes(user)) return fail(ack, 'Вы были заблокированы администраторами.');
    if (room.participants.length >= MAX_GROUP_MEMBERS) return fail(ack, 'Достигнут лимит участников.');
    room.participants.push(user);
    if (link) link.uses = (link.uses || 0) + 1;
    syncRoom(io, room);
    attachUser(io, room, user);
    persistMembership(room, user, true);
    if (room.type === 'group') postService(io, room, user, { type: 'joined' });
    ack?.({ ok: true, room: roomForViewer(room, user) });
  });

  // --- Shared pins ------------------------------------------------------------

  on('pin_message', (payload, ack) => {
    const room = getRoom(payload.roomId);
    if (!room) return fail(ack, 'Чат не найден.');
    if (!can(room, user, 'pinMessages')) return fail(ack, 'Недостаточно прав для закрепления.');
    const messageId = typeof payload.messageId === 'string' ? payload.messageId : '';
    const pins = Array.isArray(room.pinnedIds) ? room.pinnedIds : [];
    if (payload.unpin) {
      room.pinnedIds = messageId ? pins.filter((id) => id !== messageId) : [];
    } else {
      if (!messageHistory.some((m) => m.id === messageId && m.roomId === room.id)) return fail(ack, 'Сообщение не найдено.');
      // Oldest → newest, like the client-side pin list.
      room.pinnedIds = [...pins.filter((id) => id !== messageId), messageId].slice(-MAX_PINS);
      if (!payload.silent) postService(io, room, user, { type: 'pinned', messageId });
    }
    syncRoom(io, room);
    ack?.({ ok: true, room: roomForViewer(room, user) });
  });
}
