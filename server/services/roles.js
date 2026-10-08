/**
 * Telegram-style roles for groups and channels: owner → admins (with a set of
 * rights and an optional custom title) → members/subscribers, plus the
 * default member permissions and slow mode of a group.
 *
 * Pure functions over the in-memory room object — shared by the socket
 * handlers and the message pipeline.
 */
import crypto from 'crypto';

export const MANAGED_TYPES = new Set(['group', 'channel']);
export const MAX_GROUP_MEMBERS = 1000;
export const MAX_INVITE_LINKS = 30;
export const SLOW_MODE_VALUES = [0, 10, 30, 60, 300, 900, 3600];
export const USERNAME_RE = /^[a-z][a-z0-9_]{4,31}$/;

/** Rights an admin can be granted. `postMessages` / `editMessages` only matter in channels. */
export const ADMIN_RIGHTS = [
  'changeInfo',
  'postMessages',
  'editMessages',
  'deleteMessages',
  'banUsers',
  'inviteUsers',
  'pinMessages',
  'addAdmins',
];

/** What regular group members may do (Telegram "Разрешения"). */
export const MEMBER_PERMISSIONS = ['sendMessages', 'sendMedia', 'sendPolls', 'addMembers', 'pinMessages', 'changeInfo'];

export const defaultPermissions = () => ({
  sendMessages: true,
  sendMedia: true,
  sendPolls: true,
  addMembers: true,
  pinMessages: false,
  changeInfo: false,
});

/** Full admin rights (what a new admin gets by default, minus `addAdmins`). */
export const defaultAdminRights = (type) =>
  Object.fromEntries(ADMIN_RIGHTS.map((r) => [r, r === 'addAdmins' ? false : type === 'channel' || !['postMessages', 'editMessages'].includes(r)]));

export const isManaged = (room) => Boolean(room && MANAGED_TYPES.has(room.type));

export const newInviteCode = () => crypto.randomBytes(9).toString('base64url');

/**
 * Brings rooms created before roles existed (seed data, Supabase rows) to the
 * current shape. The first participant becomes the owner.
 */
export function ensureManaged(room) {
  if (!isManaged(room)) return room;
  room.participants = [...new Set((room.participants || []).map((p) => String(p).toLowerCase()))];
  if (!room.ownerId || !room.participants.includes(room.ownerId)) room.ownerId = room.participants[0] || room.ownerId || null;
  if (!room.admins || typeof room.admins !== 'object') room.admins = {};
  if (!room.permissions) room.permissions = defaultPermissions();
  if (!Array.isArray(room.inviteLinks)) room.inviteLinks = [];
  if (!Array.isArray(room.banned)) room.banned = [];
  if (typeof room.slowMode !== 'number') room.slowMode = 0;
  if (!room.createdAt) room.createdAt = Date.now();
  if (!room.inviteLinks.some((l) => l.primary && !l.revoked) && room.ownerId) {
    room.inviteLinks.unshift({ code: newInviteCode(), primary: true, createdBy: room.ownerId, createdAt: Date.now(), uses: 0 });
  }
  return room;
}

export function roleOf(room, user) {
  if (!room || !user) return null;
  const u = String(user).toLowerCase();
  if (!isManaged(room)) return room.participants?.includes(u) ? 'member' : null;
  if (room.ownerId === u) return 'owner';
  if (!room.participants?.includes(u)) return null;
  return room.admins?.[u] ? 'admin' : 'member';
}

/** Admin right check: owners have everything, admins what they were granted. */
export function hasRight(room, user, right) {
  const role = roleOf(room, user);
  if (role === 'owner') return true;
  if (role === 'admin') return Boolean(room.admins[String(user).toLowerCase()]?.rights?.[right]);
  return false;
}

/** Right check that also honours what regular group members are allowed to do. */
export function can(room, user, action) {
  if (!isManaged(room)) return Boolean(roleOf(room, user));
  if (hasRight(room, user, action)) return true;
  if (room.type !== 'group' || roleOf(room, user) !== 'member') return false;
  const p = room.permissions || defaultPermissions();
  if (action === 'inviteUsers') return Boolean(p.addMembers);
  if (action === 'pinMessages') return Boolean(p.pinMessages);
  if (action === 'changeInfo') return Boolean(p.changeInfo);
  return false;
}

export const isAdminLike = (room, user) => ['owner', 'admin'].includes(roleOf(room, user));

/**
 * Whether `user` may post `kind` ('text' | 'media' | 'poll') in the room.
 * Returns an error string, or null when allowed.
 */
export function sendRestriction(room, user, kind = 'text') {
  if (!isManaged(room)) return null;
  const role = roleOf(room, user);
  if (!role) return 'Вы не участник этого чата.';
  if (room.type === 'channel') return hasRight(room, user, 'postMessages') ? null : 'Публиковать в канале могут только администраторы.';
  if (role !== 'member') return null;
  const p = room.permissions || defaultPermissions();
  if (!p.sendMessages) return 'Администраторы ограничили отправку сообщений.';
  if (kind === 'media' && !p.sendMedia) return 'Администраторы запретили отправку медиа.';
  if (kind === 'poll' && !p.sendPolls) return 'Администраторы запретили опросы.';
  return null;
}

/** Can `actor` act on `target` (remove, demote…)? Nobody touches the owner; admins only those they promoted. */
export function outranks(room, actor, target) {
  const a = roleOf(room, actor);
  const t = roleOf(room, target);
  if (a === 'owner') return t !== 'owner';
  if (a !== 'admin' || t === 'owner') return false;
  if (t === 'member' || !t) return true;
  return room.admins[target]?.promotedBy === actor;
}

const isLinkAlive = (link, now = Date.now()) =>
  !link.revoked && (!link.expiresAt || link.expiresAt > now) && (!link.usageLimit || link.uses < link.usageLimit);

export const findInviteLink = (room, code) => room.inviteLinks?.find((l) => l.code === code) || null;
export const isInviteUsable = (link, now) => Boolean(link) && isLinkAlive(link, now);

/**
 * What a given user may see of a managed room: invite links only for those
 * who can invite, the ban list only for those who can ban.
 */
export function roomForViewer(room, viewer) {
  if (!isManaged(room)) return room;
  const { dbId: _dbId, inviteLinks, banned, ...rest } = room;
  const out = { ...rest, memberCount: room.participants.length };
  const canInvite = hasRight(room, viewer, 'inviteUsers');
  if (canInvite) out.inviteLinks = inviteLinks.map((l) => ({ ...l, active: isLinkAlive(l) }));
  else if (room.type === 'group' && room.permissions?.addMembers && roleOf(room, viewer)) {
    // Members allowed to add people may share the primary link.
    const primary = inviteLinks.find((l) => l.primary && isLinkAlive(l));
    if (primary) out.inviteLinks = [{ ...primary, active: true }];
  }
  if (hasRight(room, viewer, 'banUsers')) out.banned = banned;
  // Channel subscriber lists are visible to admins only.
  if (room.type === 'channel' && !isAdminLike(room, viewer)) {
    out.participants = [...new Set([room.ownerId, ...Object.keys(room.admins), String(viewer).toLowerCase()])].filter(
      (p) => p && room.participants.includes(p),
    );
  }
  return out;
}

/** Small public card for join previews (invite links / public @username). */
export const roomPreview = (room, viewer) => ({
  id: room.id,
  name: room.name,
  type: room.type,
  avatarUrl: room.avatarUrl || '',
  description: room.description || '',
  username: room.username || undefined,
  memberCount: room.participants.length,
  isMember: Boolean(viewer && room.participants.includes(String(viewer).toLowerCase())),
});

export function sanitizeRights(input, type) {
  const base = defaultAdminRights(type);
  if (!input || typeof input !== 'object') return base;
  return Object.fromEntries(ADMIN_RIGHTS.map((r) => [r, typeof input[r] === 'boolean' ? input[r] : base[r]]));
}

export function sanitizePermissions(input, current = defaultPermissions()) {
  if (!input || typeof input !== 'object') return current;
  return Object.fromEntries(MEMBER_PERMISSIONS.map((p) => [p, typeof input[p] === 'boolean' ? input[p] : current[p]]));
}
