/**
 * Client mirror of `server/services/roles.js`: who may do what in a group or
 * channel. The server is authoritative — this only decides what the UI offers.
 */
import type { AdminRight, AdminRights, GroupPermissions, MemberPermission, Room, UserId } from '../types';

export type RoomRole = 'owner' | 'admin' | 'member';

export const ADMIN_RIGHTS: AdminRight[] = [
  'changeInfo',
  'postMessages',
  'editMessages',
  'deleteMessages',
  'banUsers',
  'inviteUsers',
  'pinMessages',
  'addAdmins',
];

/** Rights that exist in each chat type, in Telegram's order. */
export const rightsFor = (type: Room['type']): AdminRight[] =>
  type === 'channel'
    ? ['changeInfo', 'postMessages', 'editMessages', 'deleteMessages', 'inviteUsers', 'addAdmins']
    : ['changeInfo', 'deleteMessages', 'banUsers', 'inviteUsers', 'pinMessages', 'addAdmins'];

export const ADMIN_RIGHT_LABELS: Record<AdminRight, string> = {
  changeInfo: 'Изменение профиля',
  postMessages: 'Публикация сообщений',
  editMessages: 'Редактирование чужих публикаций',
  deleteMessages: 'Удаление сообщений',
  banUsers: 'Блокировка пользователей',
  inviteUsers: 'Пригласительные ссылки',
  pinMessages: 'Закрепление сообщений',
  addAdmins: 'Назначение администраторов',
};

export const MEMBER_PERMISSIONS: MemberPermission[] = ['sendMessages', 'sendMedia', 'sendPolls', 'addMembers', 'pinMessages', 'changeInfo'];

export const PERMISSION_LABELS: Record<MemberPermission, string> = {
  sendMessages: 'Отправка сообщений',
  sendMedia: 'Отправка медиа',
  sendPolls: 'Опросы',
  addMembers: 'Добавление участников',
  pinMessages: 'Закрепление сообщений',
  changeInfo: 'Изменение профиля группы',
};

export const SLOW_MODE_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Выкл.' },
  { value: 10, label: '10с' },
  { value: 30, label: '30с' },
  { value: 60, label: '1м' },
  { value: 300, label: '5м' },
  { value: 900, label: '15м' },
  { value: 3600, label: '1ч' },
];

export const DEFAULT_PERMISSIONS: GroupPermissions = {
  sendMessages: true,
  sendMedia: true,
  sendPolls: true,
  addMembers: true,
  pinMessages: false,
  changeInfo: false,
};

export const defaultAdminRights = (type: Room['type']): AdminRights =>
  Object.fromEntries(
    ADMIN_RIGHTS.map((r) => [r, r === 'addAdmins' ? false : type === 'channel' || !['postMessages', 'editMessages'].includes(r)]),
  ) as AdminRights;

export const isManagedRoom = (room: Room | null | undefined): room is Room =>
  Boolean(room && (room.type === 'group' || room.type === 'channel'));

export const isChannel = (room: Room | null | undefined) => room?.type === 'channel';

const norm = (u: UserId | string | null | undefined) => String(u || '').toLowerCase();

export function roleOf(room: Room | null | undefined, user: UserId | string | null | undefined): RoomRole | null {
  if (!room || !user) return null;
  const u = norm(user);
  const isMember = room.participants.some((p) => norm(p) === u);
  if (!isManagedRoom(room)) return isMember ? 'member' : null;
  // Legacy groups without an owner: the first participant (same rule as the server).
  const owner = norm(room.ownerId || room.participants[0]);
  if (owner === u) return 'owner';
  if (!isMember) return null;
  return room.admins?.[u as UserId] ? 'admin' : 'member';
}

export function hasRight(room: Room | null | undefined, user: UserId | string | null | undefined, right: AdminRight): boolean {
  const role = roleOf(room, user);
  if (role === 'owner') return true;
  if (role === 'admin') return Boolean(room?.admins?.[norm(user) as UserId]?.rights?.[right]);
  return false;
}

/** Admin right, or the matching member permission in groups. */
export function can(room: Room | null | undefined, user: UserId | string | null | undefined, action: AdminRight): boolean {
  if (!room) return false;
  if (!isManagedRoom(room)) return Boolean(roleOf(room, user));
  if (hasRight(room, user, action)) return true;
  if (room.type !== 'group' || roleOf(room, user) !== 'member') return false;
  const p = room.permissions || DEFAULT_PERMISSIONS;
  if (action === 'inviteUsers') return p.addMembers;
  if (action === 'pinMessages') return p.pinMessages;
  if (action === 'changeInfo') return p.changeInfo;
  return false;
}

export const isAdminLike = (room: Room | null | undefined, user: UserId | string | null | undefined) => {
  const role = roleOf(room, user);
  return role === 'owner' || role === 'admin';
};

export type SendKind = 'text' | 'media' | 'poll';

/** Reason the user can't post `kind` here, or `null` when allowed. */
export function sendRestriction(room: Room | null | undefined, user: UserId | string | null | undefined, kind: SendKind = 'text'): string | null {
  if (!isManagedRoom(room)) return null;
  const role = roleOf(room, user);
  if (!role) return 'Вы не участник этого чата.';
  if (room.type === 'channel') return hasRight(room, user, 'postMessages') ? null : 'Публиковать могут только администраторы.';
  if (role !== 'member') return null;
  const p = room.permissions || DEFAULT_PERMISSIONS;
  if (!p.sendMessages) return 'Администраторы ограничили отправку сообщений.';
  if (kind === 'media' && !p.sendMedia) return 'Администраторы запретили отправку медиа.';
  if (kind === 'poll' && !p.sendPolls) return 'Администраторы запретили опросы.';
  return null;
}

/** Can `actor` remove / demote `target`? Nobody touches the owner; admins only those they promoted. */
export function outranks(room: Room | null | undefined, actor: UserId | string | null | undefined, target: UserId | string): boolean {
  const a = roleOf(room, actor);
  const t = roleOf(room, target);
  if (a === 'owner') return t !== 'owner';
  if (a !== 'admin' || t === 'owner') return false;
  if (t === 'member' || !t) return true;
  return norm(room?.admins?.[norm(target) as UserId]?.promotedBy) === norm(actor);
}

/** Members/subscribers count (channels only send the full list to admins). */
export const memberCountOf = (room: Room) => room.memberCount ?? room.participants.length;

/** Badge next to a member: custom title, «владелец» or «админ». */
export function roleBadge(room: Room, user: UserId | string): string | null {
  const role = roleOf(room, user);
  if (role === 'owner') return 'владелец';
  if (role === 'admin') return room.admins?.[norm(user) as UserId]?.title || 'админ';
  return null;
}

/** `t.me`-style link for a public username or an invite code. */
export const inviteUrl = (codeOrUsername: string, isUsername = false) =>
  `${window.location.origin}${window.location.pathname}#/join/${isUsername ? '@' : ''}${encodeURIComponent(codeOrUsername)}`;

export const USERNAME_RE = /^[a-z][a-z0-9_]{4,31}$/;

export function pluralRu(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export const membersLabel = (room: Room) => {
  const n = memberCountOf(room);
  return room.type === 'channel'
    ? `${n} ${pluralRu(n, 'подписчик', 'подписчика', 'подписчиков')}`
    : `${n} ${pluralRu(n, 'участник', 'участника', 'участников')}`;
};

/** `#/join/<code>` or `#/join/@username` → join target. */
export function parseJoinHash(hash: string): { code: string } | { username: string } | null {
  const m = hash.match(/^#\/join\/(.+)$/);
  if (!m) return null;
  let value: string;
  try {
    value = decodeURIComponent(m[1]).trim();
  } catch {
    return null;
  }
  if (!value) return null;
  return value.startsWith('@') ? { username: value.slice(1).toLowerCase() } : { code: value };
}
