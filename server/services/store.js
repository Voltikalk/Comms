/**
 * Shared in-memory state (rooms, message cache, presence, stories, E2EE keys)
 * and its synchronisation with Supabase.
 */
import { supabase } from './supabase.js';
import { displayNameOf, getUser } from './users.js';

// =============================================================================
// Rooms
// =============================================================================

export const memoryRooms = new Map();

const DEFAULT_ROOMS = [
  { id: 'family', name: 'Семья', type: 'group', participants: ['vlad', 'mom', 'dad', 'sister'] },
  { id: 'girlfriend', name: 'Аня', type: 'direct', participants: ['vlad', 'anya'] },
  { id: 'mom-dm', name: 'Мама', type: 'direct', participants: ['vlad', 'mom'] },
  { id: 'dad-dm', name: 'Папа', type: 'direct', participants: ['vlad', 'dad'] },
  { id: 'sister-dm', name: 'Сестра', type: 'direct', participants: ['vlad', 'sister'] },
  { id: 'mom-dad-dm', name: 'Папа', type: 'direct', participants: ['mom', 'dad'] },
  { id: 'mom-sister-dm', name: 'Сестра', type: 'direct', participants: ['mom', 'sister'] },
  { id: 'dad-sister-dm', name: 'Сестра', type: 'direct', participants: ['dad', 'sister'] },
];
DEFAULT_ROOMS.forEach((r) => memoryRooms.set(r.id, r));

/** Room list for one user; direct chats are renamed after the other participant. */
export function getUserRooms(userId) {
  const cleanUser = (userId || '').toLowerCase();
  const rooms = [{ id: 'saved-messages', name: 'Избранное', type: 'direct', participants: [cleanUser] }];

  for (const r of memoryRooms.values()) {
    if (r.id === 'saved-messages') continue;
    const parts = (r.participants || []).map((p) => p.toLowerCase());
    if (!parts.includes(cleanUser)) continue;
    if (r.type === 'direct' && r.participants.length === 2) {
      const otherUser = r.participants.find((p) => p.toLowerCase() !== cleanUser) || cleanUser;
      const otherDoc = getUser(otherUser);
      rooms.push({
        ...r,
        name: displayNameOf(otherDoc, r.name || otherUser),
        avatarUrl: otherDoc?.avatarUrl || r.avatarUrl || '',
      });
    } else {
      rooms.push(r);
    }
  }
  return rooms;
}

export function isRoomAllowedForUser(roomId, targetUser) {
  if (!roomId || typeof roomId !== 'string') return false;
  if (roomId === 'saved-messages') return true;
  const cleanTarget = (targetUser || '').toLowerCase();
  const r = memoryRooms.get(roomId);
  if (r && r.participants && r.participants.map((p) => p.toLowerCase()).includes(cleanTarget)) {
    return true;
  }
  if (roomId.startsWith('dm-')) {
    return roomId.slice(3).split('-').includes(cleanTarget);
  }
  return false;
}

/**
 * «Избранное» uses one shared id (`saved-messages`) on every client, so its
 * messages must only ever reach their own sender — never the shared room.
 */
export const SAVED_MESSAGES_ID = 'saved-messages';

export const canSeeMessage = (msg, user) =>
  msg.roomId === SAVED_MESSAGES_ID ? msg.sender === user : isRoomAllowedForUser(msg.roomId, user);

/** Socket.io room that should receive events for `roomId` (personal room for «Избранное»). */
export const broadcastTarget = (roomId, owner) => (roomId === SAVED_MESSAGES_ID ? owner : roomId);

export const isSecretRoom = (roomId) => Boolean(memoryRooms.get(roomId)?.secret);

export async function loadRoomsFromSupabase() {
  try {
    const { data: dbRooms, error } = await supabase
      .from('rooms')
      .select('id, name, type, avatar_url, room_members(user_id, users(username))');

    if (!error && dbRooms) {
      for (const r of dbRooms) {
        if (r.name === 'Избранное') continue;
        const participants = (r.room_members || []).map((m) => m.users?.username || m.user_id).filter(Boolean);
        if (participants.length === 0) continue;
        let roomId = r.id;
        if (r.name === 'Семья') roomId = 'family';
        else if (r.name === 'Аня' && r.type === 'direct') roomId = 'girlfriend';
        else if (r.name === 'Мама' && r.type === 'direct') roomId = 'mom-dm';
        else if (r.name === 'Папа' && r.type === 'direct') roomId = 'dad-dm';
        else if (r.name === 'Сестра' && r.type === 'direct') roomId = 'sister-dm';

        memoryRooms.set(roomId, {
          id: roomId,
          dbId: r.id,
          name: r.name,
          type: r.type,
          participants,
          avatarUrl: r.avatar_url || '',
        });
      }
      console.log(`[Supabase Rooms] Loaded rooms into cache (Total rooms: ${memoryRooms.size}).`);
    }
  } catch (err) {
    console.warn('[Supabase Rooms Warning] Could not load rooms from Supabase:', err.message);
  }
}

// =============================================================================
// Presence
// =============================================================================

export const userSockets = new Map();
export const socketToUser = new Map();

export const isUserOnline = (userId) => (userSockets.get(userId)?.size || 0) > 0;

export function getOnlineStatus() {
  const status = {};
  for (const [u, sockets] of userSockets.entries()) {
    status[u] = (sockets?.size || 0) > 0;
  }
  return status;
}

// =============================================================================
// Messages
// =============================================================================

export const MESSAGE_CACHE_LIMIT = 1000;

/** Mutated in place so every module shares the same array reference. */
export const messageHistory = [];

export function pushMessage(message) {
  messageHistory.push(message);
  if (messageHistory.length > MESSAGE_CACHE_LIMIT) messageHistory.shift();
}

/** Removes self-destructing messages whose timer has elapsed. Returns the removed ones. */
export function takeExpiredMessages(now = Date.now()) {
  const expired = [];
  for (let i = messageHistory.length - 1; i >= 0; i -= 1) {
    const m = messageHistory[i];
    if (typeof m.expiresAt === 'number' && m.expiresAt <= now) {
      expired.push(m);
      messageHistory.splice(i, 1);
    }
  }
  return expired.reverse();
}

function detectFileType(att) {
  const mime = (att.file_type || '').toLowerCase();
  const fName = (att.file_name || '').toLowerCase();
  const fUrl = (att.file_url || '').toLowerCase();
  if (
    mime === 'sticker' ||
    fName.endsWith('.tgs') ||
    fUrl.endsWith('.tgs') ||
    fUrl.includes('sticker') ||
    fName.startsWith('sticker_') ||
    ['уточка', 'вишенка', 'stonks', 'бокс', 'пепе', 'колобок'].some((s) => fName.includes(s))
  ) {
    return 'sticker';
  }
  if (mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|heic)$/i.test(fName)) return 'image';
  if (mime.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|opus)$/i.test(fName) || fName.startsWith('голосовое сообщение')) {
    return 'audio';
  }
  if (mime.startsWith('video/') || mime === 'video_note' || /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(fName) || fName.includes('кружок')) {
    return fName.includes('кружок') || mime === 'video_note' ? 'video_note' : 'video';
  }
  return 'file';
}

export async function loadMessagesFromSupabase() {
  try {
    const { data: rawMessages, error: msgErr } = await supabase
      .from('messages')
      .select('*, rooms:room_id(name), users:sender_id(username)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(200);

    if (msgErr || !rawMessages) {
      console.warn('[Supabase Sync] Could not fetch remote messages, using memory cache:', msgErr?.message);
      return;
    }

    const msgIds = rawMessages.map((m) => m.id);
    const [attRes, reactRes] = await Promise.all([
      msgIds.length > 0 ? supabase.from('message_attachments').select('*').in('message_id', msgIds) : { data: [] },
      msgIds.length > 0 ? supabase.from('message_reactions').select('*').in('message_id', msgIds) : { data: [] },
    ]);
    const attachments = attRes.data || [];
    const reactions = reactRes.data || [];

    const loaded = rawMessages.reverse().map((m) => {
      const roomName = m.rooms?.name || 'family';
      let roomId = 'family';
      if (roomName === 'Аня') roomId = 'girlfriend';
      else if (roomName === 'Мама') roomId = 'mom-dm';
      else if (roomName === 'Папа') roomId = 'dad-dm';
      else if (roomName === 'Сестра') roomId = 'sister-dm';

      const att = attachments.find((a) => a.message_id === m.id);
      const msgReactions = {};
      reactions.filter((r) => r.message_id === m.id).forEach((r) => {
        if (!msgReactions[r.emoji]) msgReactions[r.emoji] = [];
        msgReactions[r.emoji].push(r.user_id);
      });

      let messageText = m.content || '';
      if (att && (messageText === `📎 ${att.file_name}` || messageText === `📎  ${att.file_name}` || messageText === att.file_name)) {
        messageText = '';
      }

      return {
        id: m.id,
        roomId,
        sender: m.users?.username || 'vlad',
        text: messageText,
        timestamp: new Date(m.created_at).getTime(),
        replyToId: m.reply_to_id || undefined,
        file: att ? { name: att.file_name, type: detectFileType(att), data: att.file_url, size: att.file_size || 0 } : undefined,
        reactions: Object.keys(msgReactions).length > 0 ? msgReactions : undefined,
        isEdited: !!m.edited_at,
        readBy: [],
      };
    });

    messageHistory.splice(0, messageHistory.length, ...loaded);
    console.log(`[Supabase Sync] Successfully loaded ${loaded.length} messages from PostgreSQL database.`);
  } catch (err) {
    console.error('[Supabase Sync Error]', err);
  }
}

// =============================================================================
// Scheduled messages ("Отправить позже")
// =============================================================================

export const MAX_SCHEDULE_AHEAD_MS = 365 * 24 * 60 * 60 * 1000;
export const MAX_SCHEDULED_PER_USER = 100;

/** messageId -> message (with `scheduledAt`) */
export const scheduledMessages = new Map();

export function takeDueScheduled(now = Date.now()) {
  const due = [];
  for (const [id, m] of scheduledMessages.entries()) {
    if (m.scheduledAt <= now) {
      due.push(m);
      scheduledMessages.delete(id);
    }
  }
  return due.sort((a, b) => a.scheduledAt - b.scheduledAt);
}

export const scheduledFor = (userId) => [...scheduledMessages.values()].filter((m) => m.sender === userId);

// =============================================================================
// Stories (24h lifetime)
// =============================================================================

export const storiesStore = new Map(); // userId -> Story[]

export function pruneExpiredStories(now = Date.now()) {
  for (const [userId, list] of storiesStore.entries()) {
    const alive = list.filter((s) => s.expiresAt > now);
    if (alive.length === 0) storiesStore.delete(userId);
    else if (alive.length !== list.length) storiesStore.set(userId, alive);
  }
}

export function getStoriesState() {
  pruneExpiredStories();
  const state = {};
  for (const [userId, list] of storiesStore.entries()) {
    state[userId] = list;
  }
  return state;
}

// =============================================================================
// E2EE public identity keys (public by definition — the server relays them)
// =============================================================================

/** userId -> { publicKey, updatedAt } */
export const e2eePublicKeys = new Map();
