import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  IconArrowUpRight,
  IconAt,
  IconBell,
  IconBellOff,
  IconBookmark,
  IconCake,
  IconCamera,
  IconChevronLeft,
  IconFile,
  IconInfoCircle,
  IconLink,
  IconLock,
  IconLogout,
  IconMicrophone,
  IconPencil,
  IconPhone,
  IconPhoneCall,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconSearch,
  IconSettings,
  IconSpeakerphone,
  IconUserPlus,
  IconUsers,
  IconVideo,
  IconWorld,
  IconX,
} from '@tabler/icons-react';
import type { Message, Room, UserId, UserProfile } from '../../../types';
import { useRooms } from '../../../context/contexts';
import { ROOM_AVATAR_COLORS, profileGradient } from '../../../constants';
import { formatBirthday, isBirthdayToday, parseBirthday } from '../../../lib/birthday';
import { can, inviteUrl, isAdminLike, membersLabel, roleBadge } from '../../../lib/roles';
import type { ManagePage } from '../Manage/RoomManageSheet';
import { useStories } from '../../../context/stories-context';
import { StoryThumb } from '../../Stories/StoryThumb';
import { formatStoryAge } from '../../Stories/storyStyle';

export interface ChatUserInfoPanelProps {
  onClose: () => void;
  activeRoom: Room | null;
  activePeerId: UserId | null;
  activePeerProfile: UserProfile | null;
  activePeerAvatar: string | undefined;
  isPeerOnline: boolean;
  currentUser: UserId | null;
  getRoomDisplayName: (room: Room) => string;
  getRoomColor: (room: Room) => string;
  onOpenProfileModal: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  /** All messages of the active chat; media, files, links and voice are derived from them. */
  messages: Message[];
  onOpenGalleryMedia: (msgId: string) => void;
  onJumpToMessage?: (msgId: string) => void;
  onStartAudioCall?: () => void;
  onStartVideoCall?: () => void;
  onStartSearch?: () => void;
  onToast?: (message: string) => void;
  /** Groups & channels: open «Управление» (optionally on a page). */
  onOpenManage?: (page?: ManagePage, userId?: UserId) => void;
  onLeaveRoom?: () => void;
}

type TabId = 'members' | 'media' | 'files' | 'links' | 'voice';

const URL_RE = /\bhttps?:\/\/[^\s<>"'`]+[^\s<>"'`.,;:!?)\]}]/gi;
const SAVED_IDS = new Set(['saved-messages', 'saved']);

const formatSize = (bytes: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} МБ`;
};

const formatDuration = (sec?: number) => {
  if (!sec || !Number.isFinite(sec)) return '';
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const formatDate = (ts: number) => {
  const d = new Date(ts);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
};

const isMobile = () => window.matchMedia('(max-width: 767px)').matches;

const Avatar: React.FC<{
  src?: string;
  name: string;
  size: number;
  color?: string;
  /** Profile color gradient, used instead of `color` when there is no photo. */
  background?: string;
  online?: boolean;
  icon?: React.ReactNode;
}> = ({ src, name, size, color = 'bg-accent', background, online, icon }) => (
  <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
    <span
      className={`flex h-full w-full items-center justify-center overflow-hidden rounded-full font-semibold text-white ${
        src ? 'bg-elevated' : background ? 'ring-4 ring-white/30' : color
      }`}
      style={{ fontSize: size * 0.38, background: src ? undefined : background }}
    >
      {src ? <img src={src} alt="" className="h-full w-full object-cover" draggable={false} /> : icon || (name.trim().charAt(0) || '?').toUpperCase()}
    </span>
    {online && (
      <span
        className="absolute rounded-full bg-emerald-500 ring-surface"
        style={{ width: size * 0.26, height: size * 0.26, right: size * 0.02, bottom: size * 0.02, boxShadow: '0 0 0 2.5px var(--surface)' }}
      />
    )}
  </span>
);

const ActionButton: React.FC<{ icon: React.ReactNode; label: string; onClick?: () => void; active?: boolean }> = ({ icon, label, onClick, active }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2.5 text-[12px] font-medium transition-colors active:scale-[0.97] cursor-pointer ${
      active ? 'bg-accent-muted text-accent' : 'bg-elevated text-accent hover:bg-accent-muted'
    }`}
  >
    {icon}
    <span className="w-full truncate text-center">{label}</span>
  </button>
);

const InfoRow: React.FC<{
  icon: React.ReactNode;
  value: React.ReactNode;
  caption: string;
  onClick?: () => void;
  title?: string;
}> = ({ icon, value, caption, onClick, title }) => {
  const body = (
    <>
      <span className="mt-0.5 shrink-0 text-muted">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block break-words text-[14.5px] leading-snug text-ink">{value}</span>
        <span className="mt-0.5 block text-[12.5px] text-muted">{caption}</span>
      </span>
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} title={title} className="flex w-full items-start gap-4 px-4 py-2.5 text-left transition-colors hover:bg-elevated cursor-pointer">
      {body}
    </button>
  ) : (
    <div className="flex w-full items-start gap-4 px-4 py-2.5">{body}</div>
  );
};

const Switch: React.FC<{ on: boolean }> = ({ on }) => (
  <span aria-hidden className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-200 ${on ? 'bg-accent' : 'bg-ink/15'}`}>
    <span className={`absolute top-[3px] h-4 w-4 rounded-full bg-white shadow-sm transition-[left] duration-200 ${on ? 'left-[19px]' : 'left-[3px]'}`} />
  </span>
);

const EmptyTab: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
  <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-muted">
    <span className="opacity-60">{icon}</span>
    <span className="text-[13px]">{text}</span>
  </div>
);

export const ChatUserInfoPanel: React.FC<ChatUserInfoPanelProps> = ({
  onClose,
  activeRoom,
  activePeerId,
  activePeerProfile,
  activePeerAvatar,
  isPeerOnline,
  currentUser,
  getRoomDisplayName,
  getRoomColor,
  onOpenProfileModal,
  isMuted,
  onToggleMute,
  messages,
  onOpenGalleryMedia,
  onJumpToMessage,
  onStartAudioCall,
  onStartVideoCall,
  onStartSearch,
  onToast,
  onOpenManage,
  onLeaveRoom,
}) => {
  const { getUserDisplayName, getUserAvatar, onlineStatus, userProfiles, createDirectChat } = useRooms();

  const isChannelRoom = activeRoom?.type === 'channel';
  /** Groups and channels (anything with members instead of a single peer). */
  const isGroup = activeRoom?.type === 'group' || isChannelRoom;
  const amAdmin = isGroup && isAdminLike(activeRoom, currentUser);
  const canInvite = isGroup && can(activeRoom, currentUser, 'inviteUsers');
  const isSaved = !!activeRoom && SAVED_IDS.has(activeRoom.id);
  const isSelf = !isGroup && !isSaved && !!activePeerId && activePeerId === currentUser;
  const { storiesOf, openStories } = useStories();
  // Stories the peer pinned to their profile, newest first.
  const pinnedStories = !isGroup && !isSaved && activePeerId
    ? storiesOf(activePeerId).filter((s) => s.isPinned).sort((a, b) => b.timestamp - a.timestamp)
    : [];
  const isSecret = !!activeRoom?.secret;

  // ===== Derived shared content =====
  const shared = useMemo(() => {
    const media: Message[] = [];
    const files: Message[] = [];
    const voice: Message[] = [];
    const links: { msg: Message; url: string }[] = [];
    for (const m of messages) {
      const f = m.file;
      if (f?.data && !f.isUploading) {
        if (f.type === 'image' || f.type === 'video') media.push(m);
        else if (f.type === 'video_note' || f.type === 'audio') voice.push(m);
        else if (f.type === 'file') files.push(m);
      }
      if (m.text) {
        for (const url of new Set(m.text.match(URL_RE) || [])) links.push({ msg: m, url });
      }
    }
    // Newest first, like Telegram's shared media.
    return { media: media.reverse(), files: files.reverse(), voice: voice.reverse(), links: links.reverse() };
  }, [messages]);

  const members = useMemo(() => {
    if (!isGroup || !activeRoom) return [];
    return [...new Set(activeRoom.participants)].sort((a, b) => {
      if (a === currentUser) return -1;
      if (b === currentUser) return 1;
      const online = Number(!!onlineStatus[b]) - Number(!!onlineStatus[a]);
      return online || getUserDisplayName(a).localeCompare(getUserDisplayName(b), 'ru');
    });
  }, [isGroup, activeRoom, currentUser, onlineStatus, getUserDisplayName]);
  const onlineMembers = members.filter((m) => m === currentUser || onlineStatus[m]).length;

  const tabs = useMemo(() => {
    const list: { id: TabId; label: string; count: number }[] = [];
    // Channel subscriber lists are only visible to admins (Telegram does the same).
    if (isGroup && (!isChannelRoom || amAdmin)) list.push({ id: 'members', label: isChannelRoom ? 'Подписчики' : 'Участники', count: members.length });
    if (shared.media.length) list.push({ id: 'media', label: 'Медиа', count: shared.media.length });
    if (shared.files.length) list.push({ id: 'files', label: 'Файлы', count: shared.files.length });
    if (shared.links.length) list.push({ id: 'links', label: 'Ссылки', count: shared.links.length });
    if (shared.voice.length) list.push({ id: 'voice', label: 'Голосовые', count: shared.voice.length });
    return list;
  }, [isGroup, isChannelRoom, amAdmin, members.length, shared]);

  const [tab, setTab] = useState<TabId | null>(null);
  const activeTab = tabs.find((t) => t.id === tab)?.id ?? tabs[0]?.id ?? null;

  // ===== Voice playback (one at a time) =====
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  useEffect(() => () => audioRef.current?.pause(), []);
  useEffect(() => {
    audioRef.current?.pause();
    setPlayingId(null);
  }, [activeRoom?.id]);

  const togglePlay = (m: Message) => {
    if (!m.file?.data) return;
    if (playingId === m.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(m.file.data);
    audio.onended = () => setPlayingId((id) => (id === m.id ? null : id));
    audio.onerror = () => {
      setPlayingId((id) => (id === m.id ? null : id));
      onToast?.('Не удалось воспроизвести');
    };
    audioRef.current = audio;
    setPlayingId(m.id);
    void audio.play().catch(() => setPlayingId(null));
  };

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onToast?.(`${what} скопирован${what.endsWith('я') ? 'о' : ''}`);
    } catch {
      onToast?.('Не удалось скопировать');
    }
  };

  const jump = (id: string) => {
    if (!onJumpToMessage) return;
    onJumpToMessage(id);
    if (isMobile()) onClose();
  };

  const openMember = (id: UserId) => {
    if (id === currentUser) return onOpenProfileModal();
    void createDirectChat(id);
  };

  if (!activeRoom) return null;

  // ===== Header data =====
  const title = isSaved ? 'Избранное' : getRoomDisplayName(activeRoom);
  const statusEmoji = !isGroup && !isSaved ? activePeerProfile?.statusEmoji : undefined;
  const subtitle = isSaved
    ? 'сообщения для себя'
    : isGroup
      ? `${membersLabel(activeRoom)}${!isChannelRoom && onlineMembers > 1 ? `, ${onlineMembers} в сети` : ''}`
      : isSelf || isPeerOnline
        ? 'в сети'
        : 'был(а) недавно';
  const subtitleOnline = !isGroup && !isSaved && (isSelf || isPeerOnline);
  const heading = isSaved ? 'Избранное' : isChannelRoom ? 'Информация о канале' : isGroup ? 'Информация о группе' : 'Информация';
  const primaryLink = isGroup ? activeRoom.inviteLinks?.find((l) => l.primary && l.active !== false && !l.revoked) : undefined;
  const roomLink = activeRoom.username ? inviteUrl(activeRoom.username, true) : primaryLink ? inviteUrl(primaryLink.code) : '';

  const phone = !isGroup && !isSaved ? activePeerProfile?.phoneNumber?.trim() : '';
  const username = !isGroup && !isSaved ? activePeerProfile?.username || activePeerId || '' : '';
  const bio = !isGroup && !isSaved ? activePeerProfile?.bio?.trim() : '';
  const birthday = !isGroup && !isSaved ? parseBirthday(activePeerProfile?.birthday) : null;
  const cover = !isGroup && !isSaved ? profileGradient(activePeerProfile?.profileColor) : undefined;
  const description = isGroup ? activeRoom.description?.trim() : '';

  return (
    <>
      {/* Mobile backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 md:hidden animate-fade-in" onClick={onClose} aria-hidden />

      <motion.aside
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 460, damping: 38 }}
        className="tg-user-panel fixed inset-0 z-50 flex h-full w-full shrink-0 flex-col overflow-hidden md:relative md:inset-auto md:z-20 md:w-[340px]"
        aria-label={heading}
      >
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center gap-1 border-b border-line px-2 pt-[env(safe-area-inset-top)] md:pt-0 max-md:h-[calc(3.5rem+env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-elevated hover:text-ink cursor-pointer"
            aria-label="Закрыть"
            title="Закрыть (Esc)"
          >
            <IconChevronLeft size={22} className="md:hidden" />
            <IconX size={20} className="hidden md:block" />
          </button>
          <h3 className="m-0 flex-1 truncate pl-1 text-[15.5px] font-semibold text-ink">{heading}</h3>
          {isSelf && (
            <button
              type="button"
              onClick={onOpenProfileModal}
              className="flex h-10 w-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-elevated hover:text-accent cursor-pointer"
              aria-label="Редактировать профиль"
              title="Редактировать профиль"
            >
              <IconPencil size={19} />
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)] [scrollbar-width:thin]">
          {/* Hero */}
          <div
            className={`flex flex-col items-center px-5 pb-4 pt-6 text-center ${cover ? 'mb-4 text-white' : ''}`}
            style={cover ? { background: cover } : undefined}
          >
            {isSaved ? (
              <Avatar name={title} size={96} icon={<IconBookmark size={42} stroke={1.8} />} />
            ) : isSelf ? (
              <button
                type="button"
                onClick={onOpenProfileModal}
                className="group relative rounded-full cursor-pointer"
                aria-label="Изменить фото профиля"
                title="Изменить фото профиля"
              >
                <Avatar src={activePeerAvatar} name={title} size={96} color={getRoomColor(activeRoom)} background={cover} />
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <IconCamera size={30} />
                </span>
              </button>
            ) : (
              <Avatar
                src={isGroup ? activeRoom.avatarUrl : activePeerAvatar}
                name={title}
                size={96}
                color={getRoomColor(activeRoom)}
                background={cover}
                icon={
                  isGroup && !activeRoom.avatarUrl ? (
                    isChannelRoom ? <IconSpeakerphone size={40} stroke={1.8} /> : <IconUsers size={40} stroke={1.8} />
                  ) : undefined
                }
              />
            )}
            <h2 className={`m-0 mt-3 flex max-w-full items-center justify-center gap-1.5 text-[19px] font-semibold leading-tight ${cover ? 'text-white' : 'text-ink'}`}>
              {isSecret && <IconLock size={17} className={`shrink-0 ${cover ? 'text-white' : 'text-emerald-500'}`} aria-label="Секретный чат" />}
              <span className="truncate">{title}</span>
              {statusEmoji && <span className="shrink-0 text-[17px]">{statusEmoji}</span>}
            </h2>
            <p className={`m-0 mt-1 text-[13.5px] ${cover ? 'text-white/85' : subtitleOnline ? 'text-accent' : 'text-muted'}`}>{subtitle}</p>
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 px-4 pb-4">
            {!isGroup && !isSaved && !isSelf && onStartAudioCall && (
              <ActionButton icon={<IconPhoneCall size={21} />} label="Звонок" onClick={onStartAudioCall} />
            )}
            {!isGroup && !isSaved && !isSelf && onStartVideoCall && (
              <ActionButton icon={<IconVideo size={21} />} label="Видео" onClick={onStartVideoCall} />
            )}
            {isGroup && canInvite && onOpenManage && (
              <ActionButton icon={<IconUserPlus size={21} />} label="Добавить" onClick={() => onOpenManage('add')} />
            )}
            {isGroup && (amAdmin || can(activeRoom, currentUser, 'changeInfo')) && onOpenManage && (
              <ActionButton icon={<IconSettings size={21} />} label="Управление" onClick={() => onOpenManage()} />
            )}
            {onStartSearch && (
              <ActionButton
                icon={<IconSearch size={21} />}
                label="Поиск"
                onClick={() => {
                  onStartSearch();
                  if (isMobile()) onClose();
                }}
              />
            )}
          </div>

          {/* Info card */}
          {(phone || username || bio || birthday || description || isSecret || !isSaved) && (
            <div className="border-y border-line py-1.5">
              {phone && (
                <InfoRow icon={<IconPhone size={21} />} value={phone} caption="Телефон" onClick={() => void copy(phone, 'Номер')} title="Скопировать" />
              )}
              {username && (
                <InfoRow
                  icon={<IconAt size={21} />}
                  value={`@${username}`}
                  caption="Имя пользователя"
                  onClick={() => void copy(`@${username}`, 'Имя пользователя')}
                  title="Скопировать"
                />
              )}
              {bio && <InfoRow icon={<IconInfoCircle size={21} />} value={bio} caption="О себе" />}
              {birthday && (
                <InfoRow
                  icon={<IconCake size={21} />}
                  value={`${formatBirthday(birthday)}${isBirthdayToday(birthday) ? ' 🎂' : ''}`}
                  caption={isBirthdayToday(birthday) ? 'Сегодня день рождения!' : 'День рождения'}
                />
              )}
              {description && <InfoRow icon={<IconInfoCircle size={21} />} value={description} caption="Описание" />}
              {roomLink && (
                <InfoRow
                  icon={activeRoom.username ? <IconWorld size={21} /> : <IconLink size={21} />}
                  value={activeRoom.username ? `@${activeRoom.username}` : roomLink.replace(/^https?:\/\//, '')}
                  caption={activeRoom.username ? 'Публичная ссылка' : 'Пригласительная ссылка'}
                  onClick={() => void copy(roomLink, 'Адрес')}
                  title="Скопировать ссылку"
                />
              )}
              {isSecret && (
                <InfoRow icon={<IconLock size={21} />} value="Сквозное шифрование" caption="Сообщения видны только участникам этого чата" />
              )}
              {!isSaved && (
                <button
                  type="button"
                  role="switch"
                  aria-checked={!isMuted}
                  onClick={onToggleMute}
                  className="flex w-full items-center gap-4 px-4 py-2.5 text-left transition-colors hover:bg-elevated cursor-pointer"
                >
                  <span className="shrink-0 text-muted">{isMuted ? <IconBellOff size={21} /> : <IconBell size={21} />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] text-ink">Уведомления</span>
                    <span className="mt-0.5 block text-[12.5px] text-muted">{isMuted ? 'Выключены' : 'Включены'}</span>
                  </span>
                  <Switch on={!isMuted} />
                </button>
              )}
            </div>
          )}

          {/* Pinned stories */}
          {pinnedStories.length > 0 && activePeerId && (
            <section className="border-b border-line py-3" aria-label="Истории в профиле">
              <h3 className="px-4 pb-2 text-[13px] font-semibold text-accent">Истории · {pinnedStories.length}</h3>
              <div className="flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]">
                {pinnedStories.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => openStories(isSelf ? 'me' : activePeerId, s.id)}
                    className="shrink-0 cursor-pointer overflow-hidden rounded-lg transition-transform hover:brightness-110 active:scale-[0.97]"
                    title="Открыть историю"
                  >
                    <StoryThumb story={s} className="w-[86px]">
                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4 text-left text-[10.5px] font-medium text-white">
                        {formatStoryAge(s.timestamp)}
                      </span>
                    </StoryThumb>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Shared content */}
          {tabs.length === 0 ? (
            <EmptyTab icon={<IconFile size={34} stroke={1.5} />} text="Здесь появятся фото, видео, файлы и ссылки из этого чата" />
          ) : (
            <div className="mt-2">
              <div
                role="tablist"
                className="sticky top-0 z-10 flex gap-1 overflow-x-auto border-b border-line bg-surface px-2 [scrollbar-width:none]"
              >
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === t.id}
                    onClick={() => setTab(t.id)}
                    className={`relative shrink-0 px-3 py-3 text-[13.5px] font-medium transition-colors cursor-pointer ${
                      activeTab === t.id ? 'text-accent' : 'text-muted hover:text-ink'
                    }`}
                  >
                    {t.label}
                    {activeTab === t.id && (
                      <motion.span layoutId="info-tab-underline" className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-accent" />
                    )}
                  </button>
                ))}
              </div>

              <div role="tabpanel" className="pb-4">
                {activeTab === 'members' && (
                  <ul className="m-0 list-none p-0 py-1">
                    {canInvite && onOpenManage && (
                      <li>
                        <button
                          type="button"
                          onClick={() => onOpenManage('add')}
                          className="flex w-full items-center gap-3 px-4 py-2 text-left text-accent transition-colors hover:bg-elevated cursor-pointer"
                        >
                          <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-accent-muted">
                            <IconUserPlus size={20} />
                          </span>
                          <span className="text-[14.5px] font-medium">{isChannelRoom ? 'Добавить подписчиков' : 'Добавить участников'}</span>
                        </button>
                      </li>
                    )}
                    {members.map((id) => {
                      const me = id === currentUser;
                      const online = me || !!onlineStatus[id];
                      const emoji = userProfiles[id]?.statusEmoji;
                      const badge = roleBadge(activeRoom, id);
                      return (
                        <li key={id}>
                          <button
                            type="button"
                            onClick={() => openMember(id)}
                            className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-elevated cursor-pointer"
                            title={me ? 'Мой профиль' : 'Написать сообщение'}
                          >
                            <Avatar src={getUserAvatar(id)} name={getUserDisplayName(id)} size={42} color={ROOM_AVATAR_COLORS[id]} online={!me && online} />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1 text-[14.5px] font-medium text-ink">
                                <span className="truncate">{getUserDisplayName(id)}</span>
                                {emoji && <span className="shrink-0 text-[13px]">{emoji}</span>}
                              </span>
                              <span className={`block text-[12.5px] ${online ? 'text-accent' : 'text-muted'}`}>
                                {online ? 'в сети' : 'был(а) недавно'}
                              </span>
                            </span>
                            {(badge || me) && (
                              <span className={`shrink-0 text-[12px] ${badge ? 'font-medium text-accent-soft' : 'text-muted'}`}>{badge || 'вы'}</span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {activeTab === 'media' && (
                  <div className="grid grid-cols-3 gap-0.5 p-0.5">
                    {shared.media.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onOpenGalleryMedia(m.id)}
                        className="group relative aspect-square overflow-hidden bg-elevated cursor-pointer"
                        aria-label={m.file?.type === 'video' ? 'Видео' : 'Фото'}
                      >
                        {m.file?.type === 'video' ? (
                          <>
                            <video src={`${m.file.data}#t=0.1`} preload="metadata" muted playsInline className="h-full w-full object-cover" />
                            <span className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded-md bg-black/55 px-1 py-px text-[11px] font-medium text-white">
                              <IconPlayerPlayFilled size={9} />
                              {formatDuration(m.file.duration) || 'видео'}
                            </span>
                          </>
                        ) : (
                          <img src={m.file?.data} alt="" loading="lazy" className="h-full w-full object-cover" draggable={false} />
                        )}
                        <span className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === 'files' && (
                  <ul className="m-0 list-none p-0 py-1">
                    {shared.files.map((m) => {
                      const f = m.file!;
                      const ext = (f.name.split('.').pop() || 'file').slice(0, 4).toUpperCase();
                      return (
                        <li key={m.id} className="group flex items-center gap-3 px-4 py-2 transition-colors hover:bg-elevated">
                          <a href={f.data} download={f.name} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-center gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-[11px] font-bold text-white">{ext}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[14px] font-medium text-ink">{f.name}</span>
                              <span className="block text-[12.5px] text-muted">
                                {[formatSize(f.size), formatDate(m.timestamp)].filter(Boolean).join(' · ')}
                              </span>
                            </span>
                          </a>
                          {onJumpToMessage && (
                            <button
                              type="button"
                              onClick={() => jump(m.id)}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted opacity-0 transition-opacity hover:text-accent group-hover:opacity-100 focus-visible:opacity-100 max-md:opacity-100 cursor-pointer"
                              aria-label="Показать в чате"
                              title="Показать в чате"
                            >
                              <IconArrowUpRight size={17} />
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {activeTab === 'links' && (
                  <ul className="m-0 list-none p-0 py-1">
                    {shared.links.map(({ msg, url }, i) => {
                      let host = url;
                      try {
                        host = new URL(url).hostname.replace(/^www\./, '');
                      } catch {
                        // keep raw url
                      }
                      return (
                        <li key={`${msg.id}-${i}`} className="group flex items-center gap-3 px-4 py-2 transition-colors hover:bg-elevated">
                          <a href={url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-center gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-muted text-[17px] font-semibold uppercase text-accent">
                              {host.charAt(0) || <IconLink size={18} />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[14px] font-medium text-ink">{host}</span>
                              <span className="block truncate text-[12.5px] text-accent">{url}</span>
                            </span>
                          </a>
                          {onJumpToMessage && (
                            <button
                              type="button"
                              onClick={() => jump(msg.id)}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted opacity-0 transition-opacity hover:text-accent group-hover:opacity-100 focus-visible:opacity-100 max-md:opacity-100 cursor-pointer"
                              aria-label="Показать в чате"
                              title="Показать в чате"
                            >
                              <IconArrowUpRight size={17} />
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {activeTab === 'voice' && (
                  <ul className="m-0 list-none p-0 py-1">
                    {shared.voice.map((m) => {
                      const f = m.file!;
                      const round = f.type === 'video_note';
                      const playing = playingId === m.id;
                      return (
                        <li key={m.id}>
                          <button
                            type="button"
                            onClick={() => (round ? jump(m.id) : togglePlay(m))}
                            className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-elevated cursor-pointer"
                          >
                            {round ? (
                              <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-elevated">
                                <video src={`${f.data}#t=0.1`} preload="metadata" muted playsInline className="h-full w-full object-cover" />
                                <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white">
                                  <IconPlayerPlayFilled size={14} />
                                </span>
                              </span>
                            ) : (
                              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                                {playing ? <IconPlayerPauseFilled size={18} /> : <IconPlayerPlayFilled size={18} />}
                              </span>
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[14px] font-medium text-ink">
                                {m.sender === currentUser ? 'Вы' : getUserDisplayName(m.sender)}
                              </span>
                              <span className="flex items-center gap-1 text-[12.5px] text-muted">
                                {round ? <IconVideo size={13} /> : <IconMicrophone size={13} />}
                                {[formatDuration(f.duration), formatDate(m.timestamp)].filter(Boolean).join(' · ')}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}

          {isGroup && onLeaveRoom && (
            <div className="border-t border-line py-1.5">
              <button
                type="button"
                onClick={onLeaveRoom}
                className="flex w-full items-center gap-4 px-4 py-3 text-left text-danger transition-colors hover:bg-danger/10 cursor-pointer"
              >
                <IconLogout size={21} className="shrink-0" />
                <span className="text-[14.5px] font-medium">{isChannelRoom ? 'Покинуть канал' : 'Покинуть группу'}</span>
              </button>
            </div>
          )}
        </div>
      </motion.aside>
    </>
  );
};

export default ChatUserInfoPanel;
