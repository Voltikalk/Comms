/**
 * Socket.io wiring: handshake auth, presence, rooms (incl. E2EE secret chats)
 * and registration of the chat / call / stories handler groups.
 */
import { checkSocketRateLimit, clearSocketRateLimit } from '../middleware/rateLimit.js';
import { socketAuth } from '../middleware/auth.js';
import { sessionStore } from '../services/session-store.js';
import { resolveUserUuid, supabase } from '../services/supabase.js';
import {
  SAVED_MESSAGES_ID,
  canSeeMessage,
  getOnlineStatus,
  getStoriesState,
  getUserRooms,
  isRoomAllowedForUser,
  isUserOnline,
  memoryRooms,
  messageHistory,
  socketToUser,
  userSockets,
} from '../services/store.js';
import { displayNameOf, getUser, searchUsers } from '../services/users.js';
import { registerCallHandlers } from './call.js';
import { registerChatHandlers } from './chat.js';
import { registerGroupHandlers, searchPublicRooms } from './groups.js';
import { profilesStateFor, registerProfileHandlers } from './profiles.js';
import { registerStoryHandlers } from './stories.js';

/**
 * Registers a handler that never throws into the event loop and always gets
 * an object payload. The optional trailing ack callback is passed through.
 */
export function bindSafe(socket) {
  return (event, handler) => {
    socket.on(event, async (...args) => {
      const ack = typeof args[args.length - 1] === 'function' ? args.pop() : undefined;
      const payload = args[0] && typeof args[0] === 'object' && !Array.isArray(args[0]) ? args[0] : {};
      try {
        await handler(payload, ack);
      } catch (err) {
        console.error(`[Socket] ${event} handler failed:`, err);
        if (ack) ack({ ok: false, error: 'Внутренняя ошибка сервера.' });
      }
    });
  };
}

/** Joins every online socket of `userId` to `roomId`. */
export function joinUserSockets(io, userId, roomId) {
  for (const sId of userSockets.get(userId) || []) io.sockets.sockets.get(sId)?.join(roomId);
}

const findDirectRoom = (a, b, secret) => {
  for (const r of memoryRooms.values()) {
    if (r.type !== 'direct' || Boolean(r.secret) !== secret || r.participants?.length !== 2) continue;
    const [p1, p2] = r.participants.map((p) => p.toLowerCase());
    if ((p1 === a && p2 === b) || (p1 === b && p2 === a)) return r;
  }
  return null;
};

const roomFor = (room, otherUserId) => {
  const doc = getUser(otherUserId);
  return { ...room, name: displayNameOf(doc, room.name || otherUserId), avatarUrl: doc?.avatarUrl || room.avatarUrl || '' };
};

function registerRoomHandlers({ io, socket, user, on }) {
  on('get_user_rooms', (_payload, ack) => {
    const rooms = getUserRooms(user);
    if (ack) ack(rooms);
    else socket.emit('rooms_list', rooms);
  });

  on('search_users', async ({ query }, ack) => {
    if (!checkSocketRateLimit(socket.id, 'search_users', 20, 10000)) return ack?.({ users: [] });
    const q = String(query || '').slice(0, 64);
    const users = await searchUsers(q, user, isUserOnline);
    if (ack) ack({ users, rooms: searchPublicRooms(q, user) });
    else socket.emit('search_users_result', { users });
  });

  /** Opens (or creates) a 1:1 chat. `secret: true` → E2EE secret chat, never persisted. */
  const openDirect = async ({ targetUserId }, ack, secret) => {
    const cleanTarget = typeof targetUserId === 'string' ? targetUserId.toLowerCase().trim() : '';
    if (!cleanTarget || cleanTarget === user || cleanTarget.length > 64) return ack?.({ error: 'Неверный адресат' });
    if (secret && !getUser(cleanTarget)) return ack?.({ error: 'Пользователь не найден' });

    const existing = findDirectRoom(user, cleanTarget, secret);
    if (existing) {
      socket.join(existing.id);
      const returnRoom = roomFor(existing, cleanTarget);
      ack?.({ room: returnRoom });
      socket.emit('room_created', returnRoom);
      return;
    }

    const sorted = [user, cleanTarget].sort();
    const roomId = `${secret ? 'secret' : 'dm'}-${sorted[0]}-${sorted[1]}`;
    const newRoom = {
      id: roomId,
      name: displayNameOf(getUser(cleanTarget), cleanTarget),
      type: 'direct',
      participants: [user, cleanTarget],
      avatarUrl: getUser(cleanTarget)?.avatarUrl || '',
      ...(secret ? { secret: true } : {}),
    };
    memoryRooms.set(roomId, newRoom);
    joinUserSockets(io, user, roomId);
    joinUserSockets(io, cleanTarget, roomId);

    if (!secret) {
      void (async () => {
        try {
          const u1Uuid = await resolveUserUuid(user);
          const u2Uuid = await resolveUserUuid(cleanTarget);
          if (!u1Uuid || !u2Uuid) return;
          const { data: dbRoom } = await supabase
            .from('rooms')
            .insert({ name: `${user} & ${cleanTarget}`, type: 'direct', created_by: u1Uuid })
            .select()
            .single();
          if (dbRoom) {
            newRoom.dbId = dbRoom.id;
            await supabase.from('room_members').insert([
              { room_id: dbRoom.id, user_id: u1Uuid, role: 'admin' },
              { room_id: dbRoom.id, user_id: u2Uuid, role: 'member' },
            ]);
          }
        } catch (err) {
          console.warn('[Supabase Direct Room Error]', err.message);
        }
      })();
    }

    ack?.({ room: newRoom });
    socket.emit('room_created', newRoom);
    io.to(cleanTarget).emit('room_created', roomFor(newRoom, user));
  };

  on('create_direct_chat', (payload, ack) => openDirect(payload, ack, false));
  on('create_secret_chat', (payload, ack) => openDirect(payload, ack, true));

  on('typing', ({ roomId, isTyping }) => {
    if (!checkSocketRateLimit(socket.id, 'typing', 25, 5000)) return;
    if (!isRoomAllowedForUser(roomId, user)) return;
    socket.to(roomId).emit('typing_update', { roomId, username: user, isTyping: Boolean(isTyping) });
  });

  on('get_status', () => {
    socket.emit('status_update', getOnlineStatus());
  });
}

/** Disconnects every socket that belongs to a terminated session. */
export function disconnectSessions(io, sessionIds, reason) {
  const ids = new Set(sessionIds);
  for (const s of io.sockets.sockets.values()) {
    if (s.data?.sessionId && ids.has(s.data.sessionId)) {
      s.emit('auth_error', {
        message: reason === 'logout' ? 'Вы вышли из аккаунта.' : 'Сеанс завершён с другого устройства.',
        reason,
      });
      s.disconnect(true);
    }
  }
}

export function attachSockets(io) {
  io.use(socketAuth);
  const unsubscribe = sessionStore.onTerminate((ids, reason) => disconnectSessions(io, ids, reason));

  io.on('connection', (socket) => {
    const user = socket.data.user;
    if (!user) {
      socket.emit('auth_error', { message: 'Сессия недействительна. Пожалуйста, выполните вход.' });
      socket.disconnect(true);
      return;
    }

    if (!userSockets.has(user)) userSockets.set(user, new Set());
    socketToUser.set(socket.id, user);
    userSockets.get(user).add(socket.id);
    socket.join(user); // personal room for direct notifications

    const userRooms = getUserRooms(user);
    for (const r of userRooms) if (r.id !== SAVED_MESSAGES_ID) socket.join(r.id);
    socket.emit('rooms_list', userRooms);
    socket.emit('profiles_state', profilesStateFor(user));
    io.emit('status_update', getOnlineStatus());

    const ctx = { io, socket, user, on: bindSafe(socket) };
    registerRoomHandlers(ctx);
    registerChatHandlers(ctx);
    registerGroupHandlers(ctx);
    registerStoryHandlers(ctx);
    registerProfileHandlers(ctx);
    registerCallHandlers(ctx);

    socket.emit('history', messageHistory.filter((msg) => canSeeMessage(msg, user)));
    socket.emit('stories_state', getStoriesState(user));

    socket.on('disconnect', () => {
      clearSocketRateLimit(socket.id);
      const disconnectedUser = socketToUser.get(socket.id);
      if (!disconnectedUser) return;
      socketToUser.delete(socket.id);
      userSockets.get(disconnectedUser)?.delete(socket.id);
      io.emit('status_update', getOnlineStatus());
    });
  });

  return unsubscribe;
}
