import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  IconArrowLeft,
  IconBan,
  IconCamera,
  IconCheck,
  IconChevronRight,
  IconClockHour4,
  IconCopy,
  IconCrown,
  IconKey,
  IconLink,
  IconLoader2,
  IconLock,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconShieldCheck,
  IconSignature,
  IconTrash,
  IconUserMinus,
  IconUserPlus,
  IconUsers,
  IconUserX,
  IconWorld,
  IconX,
} from '@tabler/icons-react';
import { useAuth, useRooms, type RoomEvent } from '../../../context/contexts';
import { usePeopleDirectory } from '../../../hooks/usePeopleDirectory';
import { uploadFile } from '../../../services/upload.service';
import { AvatarCropEditor } from '../../AvatarCropEditor';
import { ConfirmDialog, type ConfirmRequest } from '../../ui/ConfirmDialog';
import {
  ADMIN_RIGHT_LABELS,
  DEFAULT_PERMISSIONS,
  MEMBER_PERMISSIONS,
  PERMISSION_LABELS,
  SLOW_MODE_OPTIONS,
  USERNAME_RE,
  can,
  defaultAdminRights,
  hasRight,
  inviteUrl,
  memberCountOf,
  outranks,
  pluralRu,
  rightsFor,
  roleBadge,
  roleOf,
} from '../../../lib/roles';
import type { AdminRight, AdminRights, GroupPermissions, InviteLink, Room, UserId, UserSearchResult } from '../../../types';

export type ManagePage =
  | 'main'
  | 'type'
  | 'links'
  | 'linkNew'
  | 'permissions'
  | 'admins'
  | 'adminPick'
  | 'adminEdit'
  | 'members'
  | 'add'
  | 'banned';

export interface RoomManageSheetProps {
  room: Room;
  initialPage?: ManagePage;
  /** For `adminEdit`: whose rights to open. */
  initialUserId?: UserId;
  onClose: () => void;
  onToast: (text: string) => void;
}

type UsernameState = 'idle' | 'checking' | 'free' | 'taken' | 'invalid';
type Entry = { page: ManagePage; userId?: UserId };

const MAX_AVATAR_BYTES = 15 * 1024 * 1024;
const MAX_ADMIN_TITLE = 16;
const norm = (u: string | null | undefined) => String(u || '').toLowerCase();

const USAGE_OPTIONS = [
  { value: 0, label: 'Без лимита' },
  { value: 1, label: '1' },
  { value: 10, label: '10' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
];
const EXPIRY_OPTIONS = [
  { value: 0, label: 'Бессрочно' },
  { value: 3600_000, label: '1 час' },
  { value: 86_400_000, label: '1 день' },
  { value: 7 * 86_400_000, label: '7 дней' },
  { value: 30 * 86_400_000, label: '30 дней' },
];

const formatDate = (ts: number) =>
  new Date(ts).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const linkTitle = (l: InviteLink) => l.title || `Ссылка …${l.code.slice(-6)}`;

function linkStatus(l: InviteLink) {
  const parts = [`${l.uses} ${pluralRu(l.uses, 'вступил', 'вступили', 'вступили')}`];
  if (l.revoked) parts.push('отозвана');
  else if (l.expiresAt && l.expiresAt <= Date.now()) parts.push('истекла');
  else {
    if (l.usageLimit) {
      const left = Math.max(0, l.usageLimit - l.uses);
      parts.push(left ? `осталось ${left}` : 'лимит исчерпан');
    }
    if (l.expiresAt) parts.push(`до ${formatDate(l.expiresAt)}`);
  }
  return parts.join(' · ');
}

const isLinkActive = (l: InviteLink) =>
  l.active ?? (!l.revoked && (!l.expiresAt || l.expiresAt > Date.now()) && (!l.usageLimit || l.uses < l.usageLimit));

/**
 * Telegram's "Управление группой/каналом": info, type, invite links,
 * permissions, administrators, members and the ban list on sliding pages.
 */
export const RoomManageSheet: React.FC<RoomManageSheetProps> = ({ room, initialPage = 'main', initialUserId, onClose, onToast }) => {
  const { currentUser } = useAuth();
  const { roomAction, getInvitePreview, getUserDisplayName, getUserAvatar, onlineStatus, userProfiles } = useRooms();
  const me = norm(currentUser);
  const channel = room.type === 'channel';
  const myRole = roleOf(room, me);
  const isOwner = myRole === 'owner';
  const canInfo = can(room, me, 'changeInfo');
  const canBan = hasRight(room, me, 'banUsers');
  const canAddAdmins = hasRight(room, me, 'addAdmins');
  const canLinks = hasRight(room, me, 'inviteUsers');
  const canInvite = can(room, me, 'inviteUsers');

  const [stack, setStack] = useState<Entry[]>(() =>
    initialPage === 'main' ? [{ page: 'main' }] : [{ page: 'main' }, { page: initialPage, userId: initialUserId }],
  );
  const [dir, setDir] = useState(1);
  const current = stack[stack.length - 1];
  const page = current.page;
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  // --- Drafts -----------------------------------------------------------------
  const [name, setName] = useState(room.name);
  const [description, setDescription] = useState(room.description || '');
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [isPublic, setIsPublic] = useState(Boolean(room.username));
  const [username, setUsername] = useState(room.username || '');
  const [usernameState, setUsernameState] = useState<UsernameState>('idle');

  const [linkName, setLinkName] = useState('');
  const [linkLimit, setLinkLimit] = useState(0);
  const [linkExpiry, setLinkExpiry] = useState(0);

  const [perms, setPerms] = useState<GroupPermissions>({ ...DEFAULT_PERMISSIONS, ...room.permissions });
  const [slowMode, setSlowMode] = useState(room.slowMode || 0);

  const adminDraftFor = (userId?: UserId) => {
    const existing = userId ? room.admins?.[norm(userId) as UserId] : undefined;
    return { rights: { ...defaultAdminRights(room.type), ...existing?.rights } as AdminRights, title: existing?.title || '' };
  };
  const [rights, setRights] = useState<AdminRights>(() => adminDraftFor(initialPage === 'adminEdit' ? initialUserId : undefined).rights);
  const [adminTitle, setAdminTitle] = useState(() => adminDraftFor(initialPage === 'adminEdit' ? initialUserId : undefined).title);

  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<UserId | null>(null);
  const [picked, setPicked] = useState<UserSearchResult[]>([]);
  const { people, searching } = usePeopleDirectory(page === 'add' ? query : '');

  const go = (next: ManagePage, userId?: UserId) => {
    setDir(1);
    setQuery('');
    setExpanded(null);
    if (next === 'type') {
      setIsPublic(Boolean(room.username));
      setUsername(room.username || '');
    } else if (next === 'linkNew') {
      setLinkName('');
      setLinkLimit(0);
      setLinkExpiry(0);
    } else if (next === 'permissions') {
      setPerms({ ...DEFAULT_PERMISSIONS, ...room.permissions });
      setSlowMode(room.slowMode || 0);
    } else if (next === 'adminEdit') {
      const d = adminDraftFor(userId);
      setRights(d.rights);
      setAdminTitle(d.title);
    } else if (next === 'add') {
      setPicked([]);
    }
    setStack((s) => [...s, { page: next, userId }]);
  };

  const back = () => {
    if (stack.length <= 1) return onClose();
    setDir(-1);
    setQuery('');
    setExpanded(null);
    setStack((s) => s.slice(0, -1));
  };

  const backRef = useRef(back);
  useEffect(() => {
    backRef.current = back;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || cropFile) return;
      e.preventDefault();
      backRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cropFile]);

  // Availability of a new public link (our own current one counts as free).
  const cleanUsername = username.trim().replace(/^@/, '').toLowerCase();
  useEffect(() => {
    if (page !== 'type' || !isPublic || !cleanUsername) return setUsernameState('idle');
    if (!USERNAME_RE.test(cleanUsername)) return setUsernameState('invalid');
    if (cleanUsername === room.username) return setUsernameState('free');
    setUsernameState('checking');
    let alive = true;
    const t = window.setTimeout(async () => {
      const res = await getInvitePreview({ username: cleanUsername });
      if (alive) setUsernameState(res.ok ? 'taken' : 'free');
    }, 450);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [page, isPublic, cleanUsername, room.username, getInvitePreview]);

  // --- Helpers ----------------------------------------------------------------
  const run = async (event: RoomEvent, payload: Record<string, unknown>, okText?: string) => {
    setBusy(true);
    try {
      const res = await roomAction<{ link?: InviteLink }>(event, { roomId: room.id, ...payload });
      if (!res.ok) {
        onToast(res.error || 'Не удалось выполнить действие');
        return null;
      }
      if (okText) onToast(okText);
      return res;
    } finally {
      setBusy(false);
    }
  };

  const copy = (text: string, done = 'Ссылка скопирована') =>
    navigator.clipboard?.writeText(text).then(
      () => onToast(done),
      () => onToast('Не удалось скопировать'),
    );

  const person = (id: UserId) => {
    const profile = userProfiles[id];
    return {
      id,
      name: getUserDisplayName(id),
      avatar: getUserAvatar(id),
      username: profile?.username || id,
      online: Boolean(onlineStatus[id]),
    };
  };

  const pickAvatar = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return onToast('Выберите изображение');
    if (file.size > MAX_AVATAR_BYTES) return onToast('Файл больше 15 МБ');
    setCropFile(file);
  };

  const uploadAvatar = async (blob: Blob) => {
    setCropFile(null);
    setUploading(true);
    try {
      const url = await uploadFile({ name: `${room.type}-avatar.jpg`, type: 'image/jpeg', data: '', rawBlob: blob });
      await run('update_room', { avatarUrl: url }, 'Фото обновлено');
    } catch {
      onToast('Не удалось загрузить фото');
    } finally {
      setUploading(false);
    }
  };

  // --- Derived lists ----------------------------------------------------------
  const ownerId = norm(room.ownerId || room.participants[0]);
  const admins = useMemo(
    () => [ownerId, ...Object.keys(room.admins || {}).filter((a) => a !== ownerId && room.participants.some((p) => norm(p) === a))] as UserId[],
    [room.admins, room.participants, ownerId],
  );

  const rank = (id: UserId) => {
    const r = roleOf(room, id);
    return r === 'owner' ? 0 : r === 'admin' ? 1 : 2;
  };
  const q = query.trim().toLowerCase().replace(/^@/, '');
  const filterPeople = (ids: UserId[]) =>
    ids
      .map(person)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.username.toLowerCase().includes(q))
      .sort((a, b) => rank(a.id) - rank(b.id) || Number(b.online) - Number(a.online) || a.name.localeCompare(b.name, 'ru'));

  const participantSet = useMemo(() => new Set(room.participants.map(norm)), [room.participants]);
  const addable = people.filter((u) => !participantSet.has(norm(u.username || u.userId)));
  const pickedIds = new Set(picked.map((u) => norm(u.username || u.userId)));

  const links = room.inviteLinks || [];
  const primary = links.find((l) => l.primary && !l.revoked);
  const extraActive = links.filter((l) => !l.primary && isLinkActive(l));
  const extraInactive = links.filter((l) => !l.primary && !isLinkActive(l));
  const canManageLink = (l: InviteLink) => canLinks && (isOwner || norm(l.createdBy) === me);

  const editingUser = page === 'adminEdit' ? current.userId : undefined;
  const editingIsAdmin = Boolean(editingUser && room.admins?.[norm(editingUser) as UserId]);
  const adminEditable = Boolean(editingUser && canAddAdmins && (!editingIsAdmin || outranks(room, me, editingUser)));

  const permsDirty =
    MEMBER_PERMISSIONS.some((p) => perms[p] !== { ...DEFAULT_PERMISSIONS, ...room.permissions }[p]) || slowMode !== (room.slowMode || 0);
  const infoDirty = name.trim() !== room.name || description.trim() !== (room.description || '');
  const typeDirty = isPublic ? cleanUsername !== (room.username || '') : Boolean(room.username);

  // --- Actions ----------------------------------------------------------------
  const saveInfo = async () => {
    if (!name.trim()) return onToast(channel ? 'Введите название канала' : 'Введите название группы');
    const res = await run('update_room', { name: name.trim(), description: description.trim() }, 'Сохранено');
    if (res) {
      setName(res.room?.name ?? name.trim());
      setDescription(res.room?.description ?? description.trim());
    }
  };

  const saveType = async () => {
    if (isPublic) {
      if (usernameState === 'invalid' || !cleanUsername) return onToast('Ссылка: 5–32 символа, латиница, цифры и _, начинается с буквы.');
      if (usernameState === 'taken') return onToast('Эта ссылка уже занята.');
      if (usernameState === 'checking') return;
    }
    if (await run('update_room', { username: isPublic ? cleanUsername : null }, 'Тип изменён')) back();
  };

  const createLink = async () => {
    const res = await run('create_invite_link', {
      title: linkName.trim() || undefined,
      usageLimit: linkLimit || undefined,
      expiresAt: linkExpiry ? Date.now() + linkExpiry : undefined,
    });
    if (!res) return;
    if (res.link) void copy(inviteUrl(res.link.code), 'Ссылка создана и скопирована');
    back();
  };

  const revokeLink = (l: InviteLink) =>
    setConfirm({
      title: l.primary ? 'Сбросить ссылку?' : 'Отозвать ссылку?',
      description: l.primary
        ? 'Текущая ссылка перестанет работать, вместо неё появится новая.'
        : 'По этой ссылке больше нельзя будет вступить.',
      confirmLabel: l.primary ? 'Сбросить' : 'Отозвать',
      danger: true,
      icon: <IconRefresh size={19} />,
      onConfirm: () => run('revoke_invite_link', { code: l.code }, l.primary ? 'Ссылка сброшена' : 'Ссылка отозвана'),
    });

  const savePermissions = async () => {
    if (await run('update_room', { permissions: perms, slowMode }, 'Разрешения сохранены')) back();
  };

  const saveAdmin = async () => {
    if (!editingUser) return;
    const allowed = rightsFor(room.type);
    const payloadRights = Object.fromEntries(allowed.map((r) => [r, Boolean(rights[r])]));
    if (await run('set_admin', { userId: editingUser, rights: payloadRights, title: adminTitle.trim() }, 'Права сохранены')) {
      // From the member picker we jump straight back to the admin list.
      setDir(-1);
      setStack((s) => {
        const trimmed = s.slice(0, -1);
        return trimmed[trimmed.length - 1]?.page === 'adminPick' ? trimmed.slice(0, -1) : trimmed;
      });
    }
  };

  const demote = (userId: UserId) =>
    setConfirm({
      title: 'Разжаловать администратора?',
      description: `${getUserDisplayName(userId)} останется ${channel ? 'подписчиком' : 'участником'}, но потеряет все права.`,
      confirmLabel: 'Разжаловать',
      danger: true,
      icon: <IconShieldCheck size={19} />,
      onConfirm: async () => {
        if (await run('set_admin', { userId, rights: null }, 'Администратор разжалован')) back();
      },
    });

  const transfer = (userId: UserId) =>
    setConfirm({
      title: `Передать права на ${channel ? 'канал' : 'группу'}?`,
      description: `${getUserDisplayName(userId)} станет владельцем. Вы останетесь администратором со всеми правами — вернуть владение сможет только новый владелец.`,
      confirmLabel: 'Передать',
      danger: true,
      icon: <IconCrown size={19} />,
      onConfirm: async () => {
        if (await run('transfer_ownership', { userId }, 'Права владельца переданы')) back();
      },
    });

  const removeMember = (userId: UserId, ban: boolean) =>
    setConfirm({
      title: ban ? 'Заблокировать?' : `Удалить из ${channel ? 'канала' : 'группы'}?`,
      description: ban
        ? `${getUserDisplayName(userId)} будет удалён и не сможет вернуться по ссылке, пока вы не разблокируете.`
        : `${getUserDisplayName(userId)} сможет вернуться по пригласительной ссылке.`,
      confirmLabel: ban ? 'Заблокировать' : 'Удалить',
      danger: true,
      icon: ban ? <IconBan size={19} /> : <IconUserMinus size={19} />,
      onConfirm: async () => {
        if (await run('remove_member', { userId, ban }, ban ? 'Пользователь заблокирован' : 'Пользователь удалён')) setExpanded(null);
      },
    });

  const addMembers = async () => {
    if (!picked.length) return;
    const res = await run('add_members', { userIds: picked.map((u) => u.username || u.userId) });
    if (!res) return;
    const added = (res as { added?: string[] }).added?.length ?? 0;
    const skipped = (res as { skipped?: string[] }).skipped?.length ?? 0;
    onToast(
      added
        ? `Добавлено: ${added}${skipped ? `, пропущено (в чёрном списке): ${skipped}` : ''}`
        : skipped
          ? 'Эти пользователи в чёрном списке'
          : 'Все уже в чате',
    );
    back();
  };

  const deleteRoom = () =>
    setConfirm({
      title: channel ? 'Удалить канал?' : 'Удалить группу?',
      description: channel
        ? 'Канал и все публикации будут удалены для всех подписчиков. Это действие нельзя отменить.'
        : 'Группа и вся переписка будут удалены для всех участников. Это действие нельзя отменить.',
      confirmLabel: 'Удалить',
      danger: true,
      icon: <IconTrash size={19} />,
      onConfirm: async () => {
        if (await run('delete_room', {}, channel ? 'Канал удалён' : 'Группа удалена')) onClose();
      },
    });

  // --- Floating save button ---------------------------------------------------
  const fab: { action: () => void; label: string; disabled?: boolean } | null =
    page === 'main' && canInfo && infoDirty
      ? { action: () => void saveInfo(), label: 'Сохранить' }
      : page === 'type' && typeDirty
        ? { action: () => void saveType(), label: 'Сохранить', disabled: isPublic && usernameState !== 'free' }
        : page === 'linkNew'
          ? { action: () => void createLink(), label: 'Создать ссылку' }
          : page === 'permissions' && permsDirty
            ? { action: () => void savePermissions(), label: 'Сохранить' }
            : page === 'adminEdit' && adminEditable
              ? { action: () => void saveAdmin(), label: 'Сохранить' }
              : page === 'add' && picked.length
                ? { action: () => void addMembers(), label: 'Добавить' }
                : null;

  const titles: Record<ManagePage, string> = {
    main: channel ? 'Управление каналом' : 'Управление группой',
    type: channel ? 'Тип канала' : 'Тип группы',
    links: 'Пригласительные ссылки',
    linkNew: 'Новая ссылка',
    permissions: 'Разрешения',
    admins: 'Администраторы',
    adminPick: 'Новый администратор',
    adminEdit: editingIsAdmin ? 'Права администратора' : 'Новый администратор',
    members: channel ? 'Подписчики' : 'Участники',
    add: channel ? 'Добавить подписчиков' : 'Добавить участников',
    banned: 'Чёрный список',
  };
  const subtitle =
    page === 'members'
      ? `${memberCountOf(room)} ${channel ? pluralRu(memberCountOf(room), 'подписчик', 'подписчика', 'подписчиков') : pluralRu(memberCountOf(room), 'участник', 'участника', 'участников')}`
      : page === 'add' && picked.length
        ? `Выбрано: ${picked.length}`
        : room.name;

  // --- Pages ------------------------------------------------------------------
  const renderMain = () => (
    <Scroll>
      <div className="flex flex-col items-center px-4 pb-3 pt-2">
        <button
          type="button"
          onClick={() => canInfo && fileRef.current?.click()}
          disabled={!canInfo || uploading}
          className={`group relative flex h-[88px] w-[88px] items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-accent to-accent-strong text-[34px] font-semibold text-white ${
            canInfo ? 'cursor-pointer' : 'cursor-default'
          }`}
          aria-label={canInfo ? 'Сменить фото' : undefined}
        >
          {room.avatarUrl ? <img src={room.avatarUrl} alt="" className="h-full w-full object-cover" draggable={false} /> : room.name.charAt(0).toUpperCase()}
          {canInfo && (
            <span
              className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${
                uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
            >
              {uploading ? <IconLoader2 size={26} className="animate-spin" /> : <IconCamera size={28} />}
            </span>
          )}
        </button>
        {canInfo && room.avatarUrl && !uploading && (
          <button
            type="button"
            onClick={() => void run('update_room', { avatarUrl: '' }, 'Фото удалено')}
            className="mt-1.5 rounded-full px-2.5 py-0.5 text-[12.5px] font-medium text-danger transition-colors hover:bg-danger/10 cursor-pointer"
          >
            Удалить фото
          </button>
        )}
      </div>

      {canInfo ? (
        <div className="space-y-2 px-3">
          <label className="block rounded-2xl bg-elevated px-3.5 pb-2 pt-1.5">
            <span className="block text-[12px] font-medium text-accent-soft">Название</span>
            <input
              value={name}
              maxLength={128}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent text-[15.5px] text-ink outline-none"
            />
          </label>
          <label className="block rounded-2xl bg-elevated px-3.5 pb-2 pt-1.5">
            <span className="block text-[12px] font-medium text-accent-soft">Описание</span>
            <textarea
              value={description}
              maxLength={255}
              rows={2}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Необязательно"
              className="w-full resize-none bg-transparent text-[15px] leading-snug text-ink outline-none placeholder:text-muted"
            />
          </label>
        </div>
      ) : (
        <div className="px-4 text-center">
          <p className="m-0 text-[18px] font-semibold text-ink">{room.name}</p>
          {room.description && <p className="m-0 mt-1 whitespace-pre-wrap text-[14px] text-muted">{room.description}</p>}
        </div>
      )}

      <Card className="mt-4">
        {isOwner && (
          <Row
            icon={room.username ? <IconWorld size={20} /> : <IconLock size={20} />}
            label={channel ? 'Тип канала' : 'Тип группы'}
            value={room.username ? 'Публичный' : 'Частный'}
            onClick={() => go('type')}
          />
        )}
        {(canLinks || (canInvite && primary)) && (
          <Row icon={<IconLink size={20} />} label="Пригласительные ссылки" value={canLinks ? String(links.filter(isLinkActive).length) : undefined} onClick={() => go('links')} />
        )}
        {channel && canInfo && (
          <SwitchRow
            icon={<IconSignature size={20} />}
            label="Подписывать сообщения"
            checked={Boolean(room.signMessages)}
            disabled={busy}
            onChange={(v) => void run('update_room', { signMessages: v })}
          />
        )}
        {!channel && canBan && (
          <Row
            icon={<IconKey size={20} />}
            label="Разрешения"
            value={`${MEMBER_PERMISSIONS.filter((p) => ({ ...DEFAULT_PERMISSIONS, ...room.permissions })[p]).length}/${MEMBER_PERMISSIONS.length}`}
            onClick={() => go('permissions')}
          />
        )}
      </Card>
      {channel && canInfo && (
        <Note>Если включено, к публикациям добавляется имя администратора, который их отправил.</Note>
      )}

      <Card className="mt-3">
        <Row icon={<IconShieldCheck size={20} />} label="Администраторы" value={String(admins.length)} onClick={() => go('admins')} />
        <Row icon={<IconUsers size={20} />} label={channel ? 'Подписчики' : 'Участники'} value={String(memberCountOf(room))} onClick={() => go('members')} />
        {canBan && <Row icon={<IconUserX size={20} />} label="Чёрный список" value={String(room.banned?.length || 0)} onClick={() => go('banned')} />}
      </Card>

      {isOwner && (
        <Card className="mt-3">
          <Row icon={<IconTrash size={20} />} label={channel ? 'Удалить канал' : 'Удалить группу'} danger onClick={deleteRoom} />
        </Card>
      )}
    </Scroll>
  );

  const renderType = () => {
    const hint =
      usernameState === 'checking'
        ? { text: 'Проверяем…', cls: 'text-muted' }
        : usernameState === 'free'
          ? { text: cleanUsername === room.username ? 'Текущая ссылка' : 'Ссылка свободна', cls: 'text-emerald-500' }
          : usernameState === 'taken'
            ? { text: 'Эта ссылка уже занята', cls: 'text-danger' }
            : usernameState === 'invalid'
              ? { text: '5–32 символа: латиница, цифры и _, начинается с буквы', cls: 'text-danger' }
              : null;
    return (
      <Scroll>
        <Card role="radiogroup" aria-label={titles.type}>
          {[
            {
              value: false,
              icon: <IconLock size={18} />,
              label: channel ? 'Частный канал' : 'Частная группа',
              text: 'Вступить можно только по пригласительной ссылке.',
            },
            {
              value: true,
              icon: <IconWorld size={18} />,
              label: channel ? 'Публичный канал' : 'Публичная группа',
              text: `${channel ? 'Канал' : 'Группу'} можно найти в поиске, вступить может любой.`,
            },
          ].map((o) => (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={isPublic === o.value}
              onClick={() => setIsPublic(o.value)}
              className="flex w-full items-start gap-3 px-3.5 py-3 text-left transition-colors hover:bg-ink/5 cursor-pointer"
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  isPublic === o.value ? 'border-accent bg-accent' : 'border-muted'
                }`}
              >
                {isPublic === o.value && <span className="h-2 w-2 rounded-full bg-white" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[15px] font-medium text-ink">
                  <span className="text-muted">{o.icon}</span>
                  {o.label}
                </span>
                <span className="mt-0.5 block text-[13px] leading-snug text-muted">{o.text}</span>
              </span>
            </button>
          ))}
        </Card>

        {isPublic ? (
          <>
            <Caption>Публичная ссылка</Caption>
            <div className="mx-3 flex h-11 items-center rounded-2xl bg-elevated px-3.5 text-[15px]">
              <span className="shrink-0 text-muted">@</span>
              <input
                autoFocus
                value={username}
                maxLength={33}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && fab?.action()}
                placeholder="ссылка"
                aria-label="Публичная ссылка"
                className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-muted"
              />
              {usernameState === 'checking' && <IconLoader2 size={16} className="shrink-0 animate-spin text-muted" />}
              {usernameState === 'free' && <IconCheck size={17} className="shrink-0 text-emerald-500" />}
            </div>
            {hint && <p className={`m-0 mt-1.5 px-4 text-[12.5px] ${hint.cls}`}>{hint.text}</p>}
            <Note>По этой ссылке {channel ? 'канал' : 'группу'} можно найти в поиске и открыть приглашение.</Note>
          </>
        ) : (
          primary && (
            <>
              <Caption>Пригласительная ссылка</Caption>
              <LinkBox url={inviteUrl(primary.code)} onCopy={() => void copy(inviteUrl(primary.code))} />
              <Note>Любой, у кого есть эта ссылка, сможет вступить. Управлять ссылками можно в разделе «Пригласительные ссылки».</Note>
            </>
          )
        )}
      </Scroll>
    );
  };

  const renderLinkRow = (l: InviteLink) => {
    const active = isLinkActive(l);
    return (
      <div key={l.code} className="flex items-center gap-3 px-3.5 py-2.5">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            active ? 'bg-accent-muted text-accent' : 'bg-ink/5 text-muted'
          }`}
        >
          <IconLink size={19} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium text-ink">{linkTitle(l)}</span>
          <span className="block truncate text-[12.5px] text-muted">{linkStatus(l)}</span>
        </span>
        {active && (
          <IconButton label="Копировать" onClick={() => void copy(inviteUrl(l.code))}>
            <IconCopy size={17} />
          </IconButton>
        )}
        {canManageLink(l) &&
          (l.revoked ? (
            <IconButton label="Удалить" danger onClick={() => void run('revoke_invite_link', { code: l.code, delete: true }, 'Ссылка удалена')}>
              <IconTrash size={17} />
            </IconButton>
          ) : (
            <IconButton label="Отозвать" danger onClick={() => revokeLink(l)}>
              <IconBan size={17} />
            </IconButton>
          ))}
      </div>
    );
  };

  const renderLinks = () => (
    <Scroll>
      {room.username && (
        <>
          <Caption>Публичная ссылка</Caption>
          <LinkBox url={inviteUrl(room.username, true)} onCopy={() => void copy(inviteUrl(room.username!, true))} />
        </>
      )}
      {primary && (
        <>
          <Caption>{room.username ? 'Основная пригласительная ссылка' : 'Пригласительная ссылка'}</Caption>
          <LinkBox
            url={inviteUrl(primary.code)}
            meta={`${primary.uses} ${pluralRu(primary.uses, 'вступил', 'вступили', 'вступили')}`}
            onCopy={() => void copy(inviteUrl(primary.code))}
            onReset={canManageLink(primary) ? () => revokeLink(primary) : undefined}
          />
        </>
      )}
      {canLinks && (
        <>
          <Caption>Дополнительные ссылки</Caption>
          <Card>
            <ActionRow icon={<IconPlus size={20} />} label="Создать ссылку" onClick={() => go('linkNew')} />
            {extraActive.map(renderLinkRow)}
          </Card>
          <Note>Можно создать отдельные ссылки с лимитом вступлений или сроком действия — и видеть, сколько человек пришло по каждой.</Note>
          {extraInactive.length > 0 && (
            <>
              <Caption>Неактивные ссылки</Caption>
              <Card>{extraInactive.map(renderLinkRow)}</Card>
            </>
          )}
        </>
      )}
    </Scroll>
  );

  const renderLinkNew = () => (
    <Scroll>
      <Caption>Название</Caption>
      <div className="mx-3 rounded-2xl bg-elevated px-3.5">
        <input
          autoFocus
          value={linkName}
          maxLength={32}
          onChange={(e) => setLinkName(e.target.value)}
          placeholder="Например, «Для друзей» (необязательно)"
          className="h-11 w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
        />
      </div>
      <Note>Название видно только администраторам.</Note>

      <Caption>Ограничить срок действия</Caption>
      <Chips options={EXPIRY_OPTIONS} value={linkExpiry} onChange={setLinkExpiry} />

      <Caption>Ограничить количество вступлений</Caption>
      <Chips options={USAGE_OPTIONS} value={linkLimit} onChange={setLinkLimit} />
      <Note>После достижения лимита или окончания срока ссылка перестанет работать.</Note>
    </Scroll>
  );

  const renderPermissions = () => (
    <Scroll>
      <Caption>Что могут участники группы?</Caption>
      <Card>
        {MEMBER_PERMISSIONS.map((p) => (
          <SwitchRow key={p} label={PERMISSION_LABELS[p]} checked={perms[p]} onChange={(v) => setPerms((prev) => ({ ...prev, [p]: v }))} />
        ))}
      </Card>
      <Note>Администраторы не ограничены этими настройками.</Note>

      <Caption>
        <span className="flex items-center gap-1.5">
          <IconClockHour4 size={15} /> Медленный режим
        </span>
      </Caption>
      <Chips options={SLOW_MODE_OPTIONS} value={slowMode} onChange={setSlowMode} />
      <Note>Участники смогут отправлять не больше одного сообщения за выбранный интервал.</Note>
    </Scroll>
  );

  const renderPersonRow = (
    id: UserId,
    opts: { onClick?: () => void; right?: React.ReactNode; menu?: React.ReactNode; subtitle?: string } = {},
  ) => {
    const p = person(id);
    const badge = roleBadge(room, id);
    const isMe = norm(id) === me;
    return (
      <div key={id}>
        <button
          type="button"
          onClick={opts.onClick}
          disabled={!opts.onClick}
          className="flex w-full items-center gap-3 px-3.5 py-2 text-left transition-colors enabled:hover:bg-ink/5 enabled:cursor-pointer"
        >
          <span className="relative shrink-0">
            <Avatar name={p.name} url={p.avatar} size={42} />
            {p.online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-[var(--elevated)]" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-medium text-ink">
              {p.name}
              {isMe && <span className="font-normal text-muted"> (вы)</span>}
            </span>
            <span className={`block truncate text-[13px] ${p.online && !opts.subtitle ? 'text-accent-soft' : 'text-muted'}`}>
              {opts.subtitle ?? (p.online ? 'в сети' : `@${p.username}`)}
            </span>
          </span>
          {opts.right ?? (badge && <span className="shrink-0 text-[12.5px] font-medium text-accent-soft">{badge}</span>)}
        </button>
        <AnimatePresence initial={false}>
          {opts.menu && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-1.5 px-3.5 pb-2.5 pl-[68px]">{opts.menu}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const SearchField = (
    <div className="mx-3 mb-2 flex h-10 items-center gap-2 rounded-full bg-elevated px-3.5">
      <IconSearch size={17} className="shrink-0 text-muted" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск"
        aria-label="Поиск"
        className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
      />
      {query && (
        <button type="button" onClick={() => setQuery('')} className="text-muted hover:text-ink cursor-pointer" aria-label="Очистить">
          <IconX size={16} />
        </button>
      )}
    </div>
  );

  const renderAdmins = () => (
    <Scroll>
      <Card>
        {canAddAdmins && <ActionRow icon={<IconUserPlus size={20} />} label="Добавить администратора" onClick={() => go('adminPick')} />}
        {filterPeople(admins).map((p) =>
          renderPersonRow(p.id, {
            subtitle: roleOf(room, p.id) === 'owner' ? 'владелец' : `назначил ${getUserDisplayName(room.admins?.[p.id]?.promotedBy || ownerId)}`,
            onClick: canAddAdmins && roleOf(room, p.id) === 'admin' && outranks(room, me, p.id) ? () => go('adminEdit', p.id) : undefined,
          }),
        )}
      </Card>
      <Note>
        Администраторы помогают управлять {channel ? 'каналом' : 'группой'}. Права каждого можно настроить отдельно — снять их может владелец или тот, кто
        назначил.
      </Note>
    </Scroll>
  );

  const renderAdminPick = () => {
    const candidates = filterPeople(room.participants.filter((id) => roleOf(room, id) === 'member'));
    return (
      <Scroll>
        {SearchField}
        <Card>
          {candidates.length ? (
            candidates.map((p) => renderPersonRow(p.id, { onClick: () => go('adminEdit', p.id) }))
          ) : (
            <p className="m-0 px-4 py-6 text-center text-[13.5px] text-muted">
              {q ? 'Никого не нашлось' : `Все ${channel ? 'подписчики' : 'участники'} уже администраторы`}
            </p>
          )}
        </Card>
      </Scroll>
    );
  };

  const renderAdminEdit = () => {
    if (!editingUser) return null;
    const p = person(editingUser);
    return (
      <Scroll>
        <div className="flex items-center gap-3 px-4 pb-3 pt-1">
          <Avatar name={p.name} url={p.avatar} size={56} />
          <div className="min-w-0">
            <p className="m-0 truncate text-[16.5px] font-semibold text-ink">{p.name}</p>
            <p className={`m-0 truncate text-[13.5px] ${p.online ? 'text-accent-soft' : 'text-muted'}`}>{p.online ? 'в сети' : `@${p.username}`}</p>
          </div>
        </div>

        <Caption>Что может этот администратор?</Caption>
        <Card>
          {rightsFor(room.type).map((r: AdminRight) => (
            <SwitchRow
              key={r}
              label={ADMIN_RIGHT_LABELS[r]}
              checked={Boolean(rights[r])}
              disabled={!adminEditable || (!isOwner && !hasRight(room, me, r))}
              onChange={(v) => setRights((prev) => ({ ...prev, [r]: v }))}
            />
          ))}
        </Card>
        {!adminEditable && <Note>Права этого администратора может изменить только владелец или тот, кто его назначил.</Note>}

        <Caption>Должность</Caption>
        <div className="mx-3 flex items-center rounded-2xl bg-elevated px-3.5">
          <input
            value={adminTitle}
            maxLength={MAX_ADMIN_TITLE}
            disabled={!adminEditable}
            onChange={(e) => setAdminTitle(e.target.value)}
            placeholder="админ"
            className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted disabled:opacity-60"
          />
          <span className="shrink-0 text-[12px] tabular-nums text-muted">{MAX_ADMIN_TITLE - adminTitle.length}</span>
        </div>
        <Note>Отображается вместо «админ» рядом с именем в {channel ? 'канале' : 'группе'}.</Note>

        {(isOwner || (editingIsAdmin && adminEditable)) && (
          <Card className="mt-3">
            {isOwner && <Row icon={<IconCrown size={20} />} label={`Передать права на ${channel ? 'канал' : 'группу'}`} onClick={() => transfer(editingUser)} />}
            {editingIsAdmin && adminEditable && (
              <Row icon={<IconShieldCheck size={20} />} label="Разжаловать администратора" danger onClick={() => demote(editingUser)} />
            )}
          </Card>
        )}
      </Scroll>
    );
  };

  const renderMembers = () => {
    const list = filterPeople(room.participants);
    return (
      <Scroll>
        {SearchField}
        <Card>
          {canInvite && !q && (
            <ActionRow icon={<IconUserPlus size={20} />} label={channel ? 'Добавить подписчиков' : 'Добавить участников'} onClick={() => go('add')} />
          )}
          {canLinks && !q && <ActionRow icon={<IconLink size={20} />} label="Пригласить по ссылке" onClick={() => go('links')} />}
          {list.map((p) => {
            const role = roleOf(room, p.id);
            const isMe = norm(p.id) === me;
            const actions: React.ReactNode[] = [];
            if (!isMe && canAddAdmins && role === 'member') {
              actions.push(
                <MenuChip key="promote" icon={<IconShieldCheck size={15} />} onClick={() => go('adminEdit', p.id)}>
                  Назначить администратором
                </MenuChip>,
              );
            }
            if (!isMe && canAddAdmins && role === 'admin' && outranks(room, me, p.id)) {
              actions.push(
                <MenuChip key="rights" icon={<IconShieldCheck size={15} />} onClick={() => go('adminEdit', p.id)}>
                  Изменить права
                </MenuChip>,
              );
            }
            if (!isMe && canBan && outranks(room, me, p.id)) {
              actions.push(
                <MenuChip key="remove" icon={<IconUserMinus size={15} />} danger onClick={() => removeMember(p.id, false)}>
                  Удалить
                </MenuChip>,
                <MenuChip key="ban" icon={<IconBan size={15} />} danger onClick={() => removeMember(p.id, true)}>
                  Заблокировать
                </MenuChip>,
              );
            }
            return renderPersonRow(p.id, {
              onClick: actions.length ? () => setExpanded((e) => (e === p.id ? null : p.id)) : undefined,
              menu: expanded === p.id && actions.length ? actions : undefined,
            });
          })}
          {!list.length && <p className="m-0 px-4 py-6 text-center text-[13.5px] text-muted">Никого не нашлось</p>}
        </Card>
        {channel && <Note>Подписчики не видят друг друга — список доступен только администраторам.</Note>}
      </Scroll>
    );
  };

  const renderAdd = () => (
    <Scroll>
      {picked.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2">
          {picked.map((u) => (
            <button
              key={u.username || u.userId}
              type="button"
              onClick={() => setPicked((prev) => prev.filter((x) => x !== u))}
              className="flex h-7 max-w-[160px] items-center gap-1.5 rounded-full bg-accent-muted pl-0.5 pr-2.5 text-[13.5px] font-medium text-accent cursor-pointer"
              title="Убрать"
            >
              <Avatar name={u.displayName || u.username} url={u.avatarUrl} size={24} />
              <span className="truncate">{(u.displayName || u.username).split(' ')[0]}</span>
              <IconX size={13} stroke={2.4} />
            </button>
          ))}
        </div>
      )}
      {SearchField}
      <Card>
        {addable.map((u) => {
          const id = norm(u.username || u.userId);
          const checked = pickedIds.has(id);
          const banned = room.banned?.some((b) => norm(b) === id);
          return (
            <button
              key={id}
              type="button"
              role="checkbox"
              aria-checked={checked}
              onClick={() => {
                setPicked((prev) => (checked ? prev.filter((x) => norm(x.username || x.userId) !== id) : [...prev, u]));
                setQuery('');
              }}
              className="flex w-full items-center gap-3 px-3.5 py-2 text-left transition-colors hover:bg-ink/5 cursor-pointer"
            >
              <span className="relative shrink-0">
                <Avatar name={u.displayName || u.username} url={u.avatarUrl} size={42} />
                {checked && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white ring-2 ring-[var(--elevated)]">
                    <IconCheck size={13} stroke={3} />
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium text-ink">{u.displayName || u.username}</span>
                <span className={`block truncate text-[13px] ${banned ? 'text-danger' : u.isOnline ? 'text-accent-soft' : 'text-muted'}`}>
                  {banned ? 'в чёрном списке' : u.isOnline ? 'в сети' : `@${u.username}`}
                </span>
              </span>
            </button>
          );
        })}
        {searching && !addable.length && (
          <div className="flex justify-center py-6 text-muted">
            <IconLoader2 size={20} className="animate-spin" />
          </div>
        )}
        {!searching && !addable.length && (
          <p className="m-0 px-4 py-6 text-center text-[13.5px] text-muted">
            {q ? 'Никого не нашлось' : 'Найдите человека по имени или @username'}
          </p>
        )}
      </Card>
    </Scroll>
  );

  const renderBanned = () => {
    const list = filterPeople(room.banned || []);
    return (
      <Scroll>
        {(room.banned?.length ?? 0) > 3 && SearchField}
        <Card>
          {list.map((p) =>
            renderPersonRow(p.id, {
              subtitle: `@${p.username}`,
              right: (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    void run('unban_member', { userId: p.id }, 'Пользователь разблокирован');
                  }}
                  className="shrink-0 rounded-full bg-accent-muted px-3 py-1 text-[13px] font-medium text-accent transition-colors hover:brightness-110 cursor-pointer"
                >
                  Разблокировать
                </span>
              ),
            }),
          )}
          {!list.length && <p className="m-0 px-4 py-6 text-center text-[13.5px] text-muted">{q ? 'Никого не нашлось' : 'Чёрный список пуст'}</p>}
        </Card>
        <Note>
          Заблокированные пользователи удалены из {channel ? 'канала' : 'группы'} и не могут вернуться по пригласительным ссылкам. Заблокировать можно в
          списке {channel ? 'подписчиков' : 'участников'}.
        </Note>
      </Scroll>
    );
  };

  const pages: Record<ManagePage, () => React.ReactNode> = {
    main: renderMain,
    type: renderType,
    links: renderLinks,
    linkNew: renderLinkNew,
    permissions: renderPermissions,
    admins: renderAdmins,
    adminPick: renderAdminPick,
    adminEdit: renderAdminEdit,
    members: renderMembers,
    add: renderAdd,
    banned: renderBanned,
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 backdrop-blur-[2px] sm:items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="room-manage-title"
        initial={{ y: 28, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        className="relative flex h-[min(92dvh,720px)] w-full flex-col overflow-hidden rounded-t-[22px] bg-surface text-ink shadow-2xl sm:h-[min(680px,calc(100dvh-2rem))] sm:max-w-[440px] sm:rounded-3xl sm:ring-1 sm:ring-line"
      >
        <header className="flex shrink-0 items-center gap-1.5 px-2 pb-1 pt-2">
          <button
            type="button"
            onClick={back}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-elevated hover:text-ink cursor-pointer"
            aria-label={stack.length <= 1 ? 'Закрыть' : 'Назад'}
            title={stack.length <= 1 ? 'Закрыть (Esc)' : 'Назад (Esc)'}
          >
            {stack.length <= 1 ? <IconX size={21} /> : <IconArrowLeft size={21} />}
          </button>
          <div className="min-w-0 flex-1">
            <h2 id="room-manage-title" className="m-0 truncate text-[16.5px] font-semibold leading-tight">
              {titles[page]}
            </h2>
            <p className="m-0 mt-0.5 truncate text-[12.5px] text-muted">{subtitle}</p>
          </div>
          {busy && <IconLoader2 size={18} className="mr-3 shrink-0 animate-spin text-muted" />}
        </header>

        <div className="relative min-h-0 flex-1">
          <AnimatePresence initial={false} custom={dir}>
            <motion.div
              key={`${page}:${current.userId || ''}:${stack.length}`}
              custom={dir}
              variants={{
                enter: (d: number) => ({ x: d > 0 ? '28%' : '-28%', opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (d: number) => ({ x: d > 0 ? '-18%' : '18%', opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 520, damping: 44 }}
              className="absolute inset-0 flex flex-col"
            >
              {pages[page]()}
            </motion.div>
          </AnimatePresence>

          <AnimatePresence>
            {fab && (
              <motion.button
                key="fab"
                type="button"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                onClick={fab.action}
                disabled={busy || uploading || fab.disabled}
                className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-black/25 transition-[background-color,opacity] hover:bg-accent-strong active:scale-95 disabled:opacity-60 cursor-pointer"
                aria-label={fab.label}
                title={fab.label}
              >
                {busy ? <IconLoader2 size={24} className="animate-spin" /> : <IconCheck size={26} stroke={2.4} />}
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            pickAvatar(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {cropFile && <AvatarCropEditor file={cropFile} onCancel={() => setCropFile(null)} onDone={(blob) => void uploadAvatar(blob)} />}
      </motion.div>
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </motion.div>,
    document.body,
  );
};

// --- Building blocks ------------------------------------------------------------

const Scroll: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-0 flex-1 overflow-y-auto pb-24 pt-1 tg-scrollbar">{children}</div>
);

const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', ...rest }) => (
  <div className={`mx-3 overflow-hidden rounded-2xl bg-elevated ${className}`} {...rest} />
);

const Caption: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="m-0 px-4 pb-1.5 pt-4 text-[13px] font-medium text-accent-soft">{children}</p>
);

const Note: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="m-0 px-4 pt-1.5 text-[12.5px] leading-snug text-muted">{children}</p>
);

const Avatar: React.FC<{ name: string; url?: string; size: number }> = ({ name, url, size }) =>
  url ? (
    <img src={url} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} draggable={false} />
  ) : (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-strong font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {(name || '?').charAt(0).toUpperCase()}
    </span>
  );

const Row: React.FC<{ icon: React.ReactNode; label: string; value?: string; danger?: boolean; onClick: () => void }> = ({
  icon,
  label,
  value,
  danger,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center gap-3.5 px-3.5 py-3 text-left transition-colors hover:bg-ink/5 cursor-pointer ${
      danger ? 'text-danger' : 'text-ink'
    }`}
  >
    <span className={`shrink-0 ${danger ? 'text-danger' : 'text-muted'}`}>{icon}</span>
    <span className="min-w-0 flex-1 truncate text-[15px]">{label}</span>
    {value !== undefined && <span className="shrink-0 text-[14px] text-muted">{value}</span>}
    {!danger && <IconChevronRight size={17} className="shrink-0 text-muted/70" />}
  </button>
);

const ActionRow: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-3 px-3.5 py-2 text-left text-accent transition-colors hover:bg-ink/5 cursor-pointer"
  >
    <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-accent-muted">{icon}</span>
    <span className="text-[15px] font-medium">{label}</span>
  </button>
);

const Switch: React.FC<{ checked: boolean }> = ({ checked }) => (
  <span
    className={`relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-line-strong'}`}
    aria-hidden
  >
    <span className={`absolute h-[18px] w-[18px] rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
  </span>
);

const SwitchRow: React.FC<{ icon?: React.ReactNode; label: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }> = ({
  icon,
  label,
  checked,
  disabled,
  onChange,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className="flex w-full items-center gap-3.5 px-3.5 py-3 text-left transition-colors enabled:hover:bg-ink/5 enabled:cursor-pointer disabled:opacity-50"
  >
    {icon && <span className="shrink-0 text-muted">{icon}</span>}
    <span className="min-w-0 flex-1 text-[15px] text-ink">{label}</span>
    <Switch checked={checked} />
  </button>
);

const Chips: React.FC<{ options: { value: number; label: string }[]; value: number; onChange: (v: number) => void }> = ({ options, value, onChange }) => (
  <div className="flex flex-wrap gap-1.5 px-3" role="radiogroup">
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        role="radio"
        aria-checked={value === o.value}
        onClick={() => onChange(o.value)}
        className={`h-8 rounded-full px-3.5 text-[13.5px] font-medium transition-colors cursor-pointer ${
          value === o.value ? 'bg-accent text-white' : 'bg-elevated text-ink hover:bg-ink/10'
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const IconButton: React.FC<{ label: string; danger?: boolean; onClick: () => void; children: React.ReactNode }> = ({ label, danger, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    aria-label={label}
    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors cursor-pointer ${
      danger ? 'hover:bg-danger/10 hover:text-danger' : 'hover:bg-ink/10 hover:text-ink'
    }`}
  >
    {children}
  </button>
);

const MenuChip: React.FC<{ icon: React.ReactNode; danger?: boolean; onClick: () => void; children: React.ReactNode }> = ({ icon, danger, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors cursor-pointer ${
      danger ? 'bg-danger/10 text-danger hover:bg-danger/15' : 'bg-accent-muted text-accent hover:brightness-110'
    }`}
  >
    {icon}
    {children}
  </button>
);

const LinkBox: React.FC<{ url: string; meta?: string; onCopy: () => void; onReset?: () => void }> = ({ url, meta, onCopy, onReset }) => (
  <div className="mx-3 rounded-2xl bg-elevated p-3">
    <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5">
      <IconLink size={17} className="shrink-0 text-muted" />
      <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-ink" title={url}>
        {url.replace(/^https?:\/\//, '')}
      </span>
    </div>
    <div className="mt-2.5 flex gap-2">
      <button
        type="button"
        onClick={onCopy}
        className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-accent text-[14px] font-semibold text-white transition-colors hover:bg-accent-strong cursor-pointer"
      >
        <IconCopy size={17} /> Копировать
      </button>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-surface px-3.5 text-[14px] font-semibold text-danger transition-colors hover:bg-danger/10 cursor-pointer"
        >
          <IconRefresh size={17} /> Сбросить
        </button>
      )}
    </div>
    {meta && <p className="m-0 mt-2 text-center text-[12.5px] text-muted">{meta}</p>}
  </div>
);
