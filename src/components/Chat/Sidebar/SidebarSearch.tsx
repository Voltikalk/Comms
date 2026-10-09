import React, { useDeferredValue, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  IconBookmark,
  IconChartBar,
  IconExternalLink,
  IconFileText,
  IconLink,
  IconLoader2,
  IconMicrophone,
  IconPhoto,
  IconPlayerPlayFilled,
  IconSearch,
  IconSpeakerphone,
  IconUsers,
  IconVideo,
  IconX,
} from '@tabler/icons-react';
import { useAuth, useRooms } from '../../../context/contexts';
import { usePeopleDirectory } from '../../../hooks/usePeopleDirectory';
import { formatAudioDuration } from '../../../lib/audio-waveform';
import { formatFileSize } from '../../../lib/image-compression';
import { pluralRu } from '../../../lib/roles';
import {
  SEARCH_CATEGORIES,
  extractLinks,
  formatSearchDate,
  linkHost,
  matchText,
  messageSearchText,
  pushRecent,
  searchMessages,
  searchVariants,
  topRooms,
  type MatchRange,
  type MessageHit,
  type SearchCategory,
} from '../../../lib/chat-search';
import type { Message, Room, UserSearchResult } from '../../../types';
import { PublicRoomResults } from './PublicRoomResults';
import { SearchHighlight as Hl } from '../Search/SearchHighlight';

const RECENT_KEY = 'tg_search_recent_rooms';
const isSavedRoom = (id: string) => id === 'saved-messages' || id === 'saved';

const loadRecent = (): string[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

export interface SidebarSearchHandle {
  /** Arrow keys / Enter from the search input; returns true when handled. */
  handleKey: (e: React.KeyboardEvent) => boolean;
}

export interface SidebarSearchProps {
  ref?: React.Ref<SidebarSearchHandle>;
  query: string;
  /** Every chat, regardless of the selected folder. */
  rooms: Room[];
  messages: Message[];
  getRoomDisplayName: (room: Room) => string;
  getRoomAvatar: (room: Room) => string | undefined;
  getRoomColor: (room: Room) => string;
  isRoomOnline: (room: Room) => boolean;
  unreadCount: (roomId: string) => number;
  isRoomMuted: (roomId: string) => boolean;
  /** Open a chat and leave the search. */
  onOpenRoom: (roomId: string) => void;
  /** Jump to a message; the results stay so the next hit is one click away. */
  onOpenMessage: (roomId: string, messageId: string) => void;
}

const SectionTitle: React.FC<{ children: React.ReactNode; action?: React.ReactNode }> = ({ children, action }) => (
  <div className="flex items-center justify-between px-3 pb-1 pt-3 text-[13px] font-semibold text-muted">
    <span>{children}</span>
    {action}
  </div>
);

const Empty: React.FC<{ icon: React.ReactNode; title: string; hint: string }> = ({ icon, title, hint }) => (
  <div className="flex flex-col items-center px-8 py-12 text-center">
    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-accent-muted text-accent">{icon}</div>
    <p className="m-0 text-[15px] font-semibold text-ink">{title}</p>
    <p className="m-0 mt-1 text-[13.5px] leading-snug text-muted">{hint}</p>
  </div>
);

/** «Нет …, подходящих под» for the empty state of a tab. */
const EMPTY_GENITIVE: Record<SearchCategory, string> = {
  chats: 'чатов',
  messages: 'сообщений',
  media: 'фото и видео',
  links: 'ссылок',
  files: 'файлов',
  voice: 'голосовых',
};

const MEDIA_LABEL_ICON: Partial<Record<string, typeof IconPhoto>> = {
  image: IconPhoto,
  video: IconVideo,
  video_note: IconVideo,
  audio: IconMicrophone,
  file: IconFileText,
};

/**
 * Telegram-style search panel that replaces the chat list while searching:
 * recent / frequent chats for an empty query, then chats, people, public
 * groups and messages, plus Media / Links / Files / Voice tabs. Matching is
 * forgiving (wrong keyboard layout, transliteration, words in any order).
 */
export const SidebarSearch: React.FC<SidebarSearchProps> = ({
  ref,
  query,
  rooms,
  messages,
  getRoomDisplayName,
  getRoomAvatar,
  getRoomColor,
  isRoomOnline,
  unreadCount,
  isRoomMuted,
  onOpenRoom,
  onOpenMessage,
}) => {
  const { currentUser } = useAuth();
  const { userProfiles, getUserDisplayName, createDirectChat } = useRooms();
  const me = currentUser ?? '';
  const q = useDeferredValue(query.trim());
  const variants = useMemo(() => searchVariants(q), [q]);
  const [category, setCategory] = useState<SearchCategory>('chats');
  const [recent, setRecent] = useState<string[]>(loadRecent);
  const [cursor, setCursor] = useState(0);
  const [openedMessage, setOpenedMessage] = useState<string | null>(null);
  const [openingPerson, setOpeningPerson] = useState<string | null>(null);
  const { people, searching: peopleLoading } = usePeopleDirectory(q);
  const listRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<(() => void)[]>([]);

  const roomById = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);
  const peerOf = (room: Room) => (room.type === 'direct' && !isSavedRoom(room.id) ? room.participants.find((p) => p !== me) : undefined);
  const roomName = (id: string) => {
    const room = roomById.get(id);
    return room ? getRoomDisplayName(room) : '';
  };

  const remember = (roomId: string) => {
    setRecent((prev) => {
      const next = pushRecent(prev, roomId);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };
  const forget = (roomId: string | null) => {
    setRecent((prev) => {
      const next = roomId ? prev.filter((id) => id !== roomId) : [];
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const openRoom = (roomId: string) => {
    remember(roomId);
    onOpenRoom(roomId);
  };
  const openMessage = (m: Message) => {
    setOpenedMessage(m.id);
    onOpenMessage(m.roomId, m.id);
  };
  const openPerson = async (user: UserSearchResult) => {
    const target = user.username || user.userId;
    setOpeningPerson(target);
    try {
      const room = await createDirectChat(target);
      if (room) openRoom(room.id);
    } finally {
      setOpeningPerson(null);
    }
  };

  // ── Results ────────────────────────────────────────────────────────────────
  const chatHits = useMemo(() => {
    if (variants.length === 0) return [];
    const handle = variants.map((v) => v.replace(/^@/, ''));
    return rooms
      .map((room, order) => {
        const name = isSavedRoom(room.id) ? 'Избранное' : getRoomDisplayName(room);
        const byName = matchText(name, variants);
        const peer = peerOf(room);
        const username = peer ? userProfiles[peer]?.username || peer : room.username;
        const byHandle = username ? matchText(username, handle) : null;
        const score = Math.max(byName?.score ?? 0, (byHandle?.score ?? 0) - 100);
        return score > 0 ? { room, name, ranges: byName?.ranges ?? [], handle: byHandle ? username : undefined, handleRanges: byHandle?.ranges ?? [], score, order } : null;
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
      .sort((a, b) => b.score - a.score || a.order - b.order);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- peerOf only reads `me`
  }, [rooms, variants, getRoomDisplayName, userProfiles, me]);

  // People you could message but have no 1:1 chat with yet.
  const newPeople = useMemo(() => {
    if (!q) return [];
    const withChat = new Set(chatHits.map((h) => peerOf(h.room)?.toLowerCase()).filter(Boolean));
    for (const r of rooms) {
      const p = peerOf(r);
      if (p) withChat.add(p.toLowerCase());
    }
    return people.filter((u) => !withChat.has(u.userId.toLowerCase()) && !withChat.has(u.username.toLowerCase())).slice(0, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- peerOf only reads `me`
  }, [people, chatHits, rooms, q, me]);

  const messageHits = useMemo<MessageHit[]>(() => {
    if (!q) return [];
    if (category === 'chats' || category === 'messages') return searchMessages(messages, q, { limit: 300 });
    return searchMessages(messages, q, {
      category,
      roomName,
      senderName: (id) => getUserDisplayName(id),
      limit: 300,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- roomName derives from roomById
  }, [messages, q, category, roomById, getRoomDisplayName, getUserDisplayName]);

  const frequent = useMemo(() => {
    const ids = new Set(rooms.filter((r) => !isSavedRoom(r.id)).map((r) => r.id));
    const top = topRooms(messages, me, ids);
    // Fresh accounts: fall back to the first chats of the list.
    for (const r of rooms) {
      if (top.length >= 8) break;
      if (ids.has(r.id) && !top.includes(r.id)) top.push(r.id);
    }
    return top.map((id) => roomById.get(id)).filter((r): r is Room => !!r);
  }, [messages, me, rooms, roomById]);
  const recentRooms = recent.map((id) => roomById.get(id)).filter((r): r is Room => !!r);

  // Keyboard cursor: reset when the result set changes.
  useEffect(() => setCursor(0), [q, category]);
  useEffect(() => {
    if (!q) setCategory('chats');
  }, [q]);

  // Each rendered row registers its action, giving arrow keys a flat order.
  const nav: (() => void)[] = [];
  const reg = (fn: () => void) => nav.push(fn) - 1;
  useLayoutEffect(() => {
    navRef.current = nav;
  });

  useImperativeHandle(ref, () => ({
    handleKey: (e) => {
      const n = navRef.current.length;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!n) return true;
        const next = e.key === 'ArrowDown' ? (cursor + 1) % n : (cursor - 1 + n) % n;
        setCursor(next);
        listRef.current?.querySelector(`[data-search-idx="${next}"]`)?.scrollIntoView({ block: 'nearest' });
        return true;
      }
      if (e.key === 'Enter') {
        navRef.current[cursor]?.();
        return true;
      }
      return false;
    },
  }));

  // ── Row renderers ──────────────────────────────────────────────────────────
  const rowClass = (idx: number, extra = '') =>
    `group relative flex w-full items-center gap-3 rounded-xl px-2.5 text-left transition-colors cursor-pointer ${
      idx === cursor ? 'bg-elevated' : 'hover:bg-elevated'
    } ${extra}`;

  const roomAvatar = (room: Room, size: number) => {
    const saved = isSavedRoom(room.id);
    const src = saved ? undefined : getRoomAvatar(room);
    const name = saved ? 'Избранное' : getRoomDisplayName(room);
    const icon = Math.round(size * 0.46);
    return (
      <span className="relative block shrink-0" style={{ width: size, height: size }}>
        <span
          className={`flex h-full w-full items-center justify-center overflow-hidden rounded-full font-semibold text-white ${
            src ? 'bg-elevated' : saved ? 'bg-accent' : getRoomColor(room)
          }`}
          style={{ fontSize: size * 0.38 }}
        >
          {src ? (
            <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />
          ) : saved ? (
            <IconBookmark size={icon} stroke={1.9} />
          ) : room.type === 'group' ? (
            <IconUsers size={icon} stroke={1.9} />
          ) : room.type === 'channel' ? (
            <IconSpeakerphone size={icon} stroke={1.9} />
          ) : (
            (name.trim().charAt(0) || '?').toUpperCase()
          )}
        </span>
        {room.type === 'direct' && !saved && isRoomOnline(room) && (
          <span className="absolute bottom-0 right-0 h-[13px] w-[13px] rounded-full border-[2.5px] border-surface bg-emerald-500" />
        )}
      </span>
    );
  };

  const roomSubtitle = (room: Room, handle?: string, handleRanges: readonly MatchRange[] = []) => {
    if (isSavedRoom(room.id)) return 'Сообщения для себя';
    if (handle) return <Hl text={`@${handle}`} ranges={handleRanges.map(([s, e]) => [s + 1, e + 1] as const)} />;
    if (room.type === 'direct') return isRoomOnline(room) ? <span className="text-accent">в сети</span> : 'был(а) недавно';
    const n = room.memberCount ?? room.participants.length;
    return room.type === 'channel'
      ? `${n} ${pluralRu(n, 'подписчик', 'подписчика', 'подписчиков')}`
      : `${n} ${pluralRu(n, 'участник', 'участника', 'участников')}`;
  };

  const roomRow = (room: Room, opts: { name?: string; ranges?: readonly MatchRange[]; handle?: string; handleRanges?: readonly MatchRange[]; onRemove?: () => void } = {}) => {
    const idx = reg(() => openRoom(room.id));
    const unread = unreadCount(room.id);
    const name = opts.name ?? (isSavedRoom(room.id) ? 'Избранное' : getRoomDisplayName(room));
    return (
      <div key={room.id} role="option" aria-selected={idx === cursor} data-search-idx={idx} className="relative">
        <button type="button" onClick={() => openRoom(room.id)} onMouseMove={() => idx !== cursor && setCursor(idx)} className={rowClass(idx, 'h-[62px]')}>
          {roomAvatar(room, 46)}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold leading-tight text-ink">
              <Hl text={name} ranges={opts.ranges ?? []} />
            </span>
            <span className="mt-0.5 block truncate text-[13.5px] leading-snug text-muted">{roomSubtitle(room, opts.handle, opts.handleRanges)}</span>
          </span>
          {unread > 0 && !opts.onRemove && (
            <span
              className={`flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-full px-1.5 text-[12.5px] font-semibold tabular-nums text-white ${
                isRoomMuted(room.id) ? 'bg-muted/70' : 'bg-accent'
              }`}
            >
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
        {opts.onRemove && (
          <button
            type="button"
            onClick={opts.onRemove}
            aria-label="Убрать из недавних"
            title="Убрать из недавних"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted opacity-0 transition-opacity hover:bg-ink/10 hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 [div:hover>&]:opacity-100 cursor-pointer"
          >
            <IconX size={16} />
          </button>
        )}
      </div>
    );
  };

  const personRow = (u: UserSearchResult) => {
    const idx = reg(() => void openPerson(u));
    const name = matchText(u.displayName, variants);
    const handle = matchText(u.username, variants.map((v) => v.replace(/^@/, '')));
    const busy = openingPerson === (u.username || u.userId);
    return (
      <div key={u.userId} role="option" aria-selected={idx === cursor} data-search-idx={idx}>
        <button type="button" onClick={() => void openPerson(u)} onMouseMove={() => idx !== cursor && setCursor(idx)} className={rowClass(idx, 'h-[62px]')}>
          <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-accent to-accent-strong text-[18px] font-semibold text-white">
            {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" draggable={false} /> : (u.displayName.trim().charAt(0) || '?').toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold leading-tight text-ink">
              <Hl text={u.displayName} ranges={name?.ranges ?? []} />
            </span>
            <span className="mt-0.5 block truncate text-[13.5px] text-muted">
              <Hl text={`@${u.username}`} ranges={(handle?.ranges ?? []).map(([s, e]) => [s + 1, e + 1] as const)} />
            </span>
          </span>
          {busy && <IconLoader2 size={18} className="shrink-0 animate-spin text-muted" />}
        </button>
      </div>
    );
  };

  const senderLabel = (m: Message, room: Room | undefined) => {
    if (m.sender === me) return 'Вы';
    if (room && room.type !== 'direct') return getUserDisplayName(m.sender).split(' ')[0];
    return null;
  };

  const messageRow = (hit: MessageHit) => {
    const m = hit.message;
    const room = roomById.get(m.roomId);
    const idx = reg(() => openMessage(m));
    const opened = openedMessage === m.id;
    const who = senderLabel(m, room);
    const MediaIcon = m.poll ? IconChartBar : m.file ? MEDIA_LABEL_ICON[m.file.type] : undefined;
    return (
      <div key={m.id} role="option" aria-selected={idx === cursor} data-search-idx={idx}>
        <button
          type="button"
          onClick={() => openMessage(m)}
          onMouseMove={() => idx !== cursor && setCursor(idx)}
          className={rowClass(idx, `h-[66px] ${opened ? 'bg-accent-muted!' : ''}`)}
        >
          {room ? roomAvatar(room, 46) : <span className="h-[46px] w-[46px] shrink-0 rounded-full bg-elevated" />}
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2">
              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-tight text-ink">{room ? roomName(room.id) || 'Избранное' : 'Чат'}</span>
              <span className="shrink-0 text-[12.5px] tabular-nums text-muted">{formatSearchDate(m.timestamp)}</span>
            </span>
            <span className="mt-0.5 block truncate text-[14px] leading-snug text-muted">
              {who && <span className="text-ink">{who}: </span>}
              {MediaIcon && <MediaIcon size={15} className="mr-0.5 inline-block -translate-y-px align-middle" />}
              <Hl text={hit.snippet} ranges={hit.ranges} />
            </span>
          </span>
        </button>
      </div>
    );
  };

  const metaLine = (m: Message) => {
    const room = roomById.get(m.roomId);
    const parts = [room ? roomName(room.id) || 'Избранное' : null, formatSearchDate(m.timestamp)];
    if (room && room.type !== 'direct') parts.unshift(m.sender === me ? 'Вы' : getUserDisplayName(m.sender));
    return parts.filter(Boolean).join(' · ');
  };

  const mediaTile = (hit: MessageHit) => {
    const m = hit.message;
    const f = m.file!;
    const idx = reg(() => openMessage(m));
    return (
      <button
        key={m.id}
        type="button"
        data-search-idx={idx}
        onClick={() => openMessage(m)}
        onMouseMove={() => idx !== cursor && setCursor(idx)}
        title={`${messageSearchText(m) || f.name} — ${metaLine(m)}`}
        className={`group relative aspect-square overflow-hidden bg-elevated cursor-pointer outline-none ${idx === cursor ? 'ring-2 ring-inset ring-accent' : ''}`}
      >
        {f.type === 'image' ? (
          <img src={f.data} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" draggable={false} />
        ) : (
          <video src={f.data} muted playsInline preload="metadata" className={`h-full w-full object-cover ${f.type === 'video_note' ? 'scale-[0.82] rounded-full' : ''}`} />
        )}
        {f.type !== 'image' && (
          <span className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded-full bg-black/55 px-1.5 py-px text-[11px] font-medium tabular-nums text-white">
            <IconPlayerPlayFilled size={10} />
            {f.duration ? formatAudioDuration(f.duration) : ''}
          </span>
        )}
      </button>
    );
  };

  const linkRow = (hit: MessageHit) => {
    const m = hit.message;
    const url = extractLinks(messageSearchText(m))[0] ?? '';
    const host = linkHost(url);
    const href = /^https?:/i.test(url) ? url : `https://${url}`;
    const idx = reg(() => openMessage(m));
    return (
      <div key={m.id} role="option" aria-selected={idx === cursor} data-search-idx={idx} className="relative">
        <button type="button" onClick={() => openMessage(m)} onMouseMove={() => idx !== cursor && setCursor(idx)} className={rowClass(idx, 'items-start py-2 pr-11')}>
          <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl bg-accent text-[19px] font-bold uppercase text-white">
            {host.charAt(0) || <IconLink size={20} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold leading-tight text-ink">{host}</span>
            <span className="mt-0.5 block truncate text-[13.5px] text-accent">{url}</span>
            <span className="mt-0.5 block truncate text-[13px] text-muted">
              <Hl text={hit.snippet} ranges={hit.ranges} />
            </span>
            <span className="mt-0.5 block truncate text-[12px] text-muted/80">{metaLine(m)}</span>
          </span>
        </button>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Открыть ссылку"
          title="Открыть ссылку"
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-ink/10 hover:text-accent"
        >
          <IconExternalLink size={17} />
        </a>
      </div>
    );
  };

  const fileRow = (hit: MessageHit) => {
    const m = hit.message;
    const f = m.file!;
    const ext = (f.name.split('.').pop() || '').slice(0, 4);
    const nameHit = matchText(f.name, variants);
    const idx = reg(() => openMessage(m));
    return (
      <div key={m.id} role="option" aria-selected={idx === cursor} data-search-idx={idx}>
        <button type="button" onClick={() => openMessage(m)} onMouseMove={() => idx !== cursor && setCursor(idx)} className={rowClass(idx, 'h-[64px]')}>
          <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl bg-accent-muted text-[12px] font-bold uppercase text-accent">
            {ext || <IconFileText size={20} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold leading-tight text-ink">
              <Hl text={f.name} ranges={nameHit?.ranges ?? []} />
            </span>
            <span className="mt-0.5 block truncate text-[13px] text-muted">
              {formatFileSize(f.size)} · {metaLine(m)}
            </span>
          </span>
        </button>
      </div>
    );
  };

  const voiceRow = (hit: MessageHit) => {
    const m = hit.message;
    const f = m.file!;
    const idx = reg(() => openMessage(m));
    const author = m.sender === me ? 'Вы' : getUserDisplayName(m.sender);
    const room = roomById.get(m.roomId);
    return (
      <div key={m.id} role="option" aria-selected={idx === cursor} data-search-idx={idx}>
        <button type="button" onClick={() => openMessage(m)} onMouseMove={() => idx !== cursor && setCursor(idx)} className={rowClass(idx, 'h-[62px]')}>
          <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-accent text-white">
            <IconMicrophone size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2">
              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-tight text-ink">{author}</span>
              <span className="shrink-0 text-[12.5px] tabular-nums text-muted">{formatSearchDate(m.timestamp)}</span>
            </span>
            <span className="mt-0.5 block truncate text-[13px] text-muted">
              {f.duration ? formatAudioDuration(f.duration) : 'Голосовое'}
              {room ? ` · ${roomName(room.id) || 'Избранное'}` : ''}
            </span>
          </span>
        </button>
      </div>
    );
  };

  // ── Body ───────────────────────────────────────────────────────────────────
  let body: React.ReactNode;

  if (!q) {
    body = (
      <>
        {frequent.length > 0 && (
          <>
            <SectionTitle>Часто пишете</SectionTitle>
            <div className="flex gap-1 overflow-x-auto px-1.5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {frequent.map((room) => {
                const idx = reg(() => openRoom(room.id));
                const unread = unreadCount(room.id);
                return (
                  <button
                    key={room.id}
                    type="button"
                    data-search-idx={idx}
                    onClick={() => openRoom(room.id)}
                    onMouseMove={() => idx !== cursor && setCursor(idx)}
                    className={`relative flex w-[70px] shrink-0 flex-col items-center gap-1 rounded-xl py-1.5 cursor-pointer transition-colors ${
                      idx === cursor ? 'bg-elevated' : 'hover:bg-elevated'
                    }`}
                  >
                    <span className="relative">
                      {roomAvatar(room, 52)}
                      {unread > 0 && (
                        <span className="absolute -right-1 -top-0.5 flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold tabular-nums text-white ring-2 ring-surface">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </span>
                    <span className="w-full truncate px-1 text-center text-[12px] leading-tight text-ink">{getRoomDisplayName(room).split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
        {recentRooms.length > 0 ? (
          <>
            <SectionTitle
              action={
                <button type="button" onClick={() => forget(null)} className="rounded-md px-1.5 py-0.5 text-[13px] font-medium text-accent hover:bg-accent-muted cursor-pointer">
                  Очистить
                </button>
              }
            >
              Недавние
            </SectionTitle>
            {recentRooms.map((room) => roomRow(room, { onRemove: () => forget(room.id) }))}
          </>
        ) : (
          <Empty
            icon={<IconSearch size={28} />}
            title="Поиск по Comms"
            hint="Чаты, люди, сообщения, ссылки и файлы. Можно писать в другой раскладке или транслитом — «ghbdtn», «anya»."
          />
        )}
      </>
    );
  } else if (category === 'chats') {
    const preview = messageHits.slice(0, 5);
    const nothing = chatHits.length === 0 && newPeople.length === 0 && messageHits.length === 0;
    body = (
      <>
        {chatHits.length > 0 && (
          <>
            <SectionTitle>Чаты и контакты</SectionTitle>
            {chatHits.slice(0, 30).map((h) => roomRow(h.room, { name: h.name, ranges: h.ranges, handle: h.handle, handleRanges: h.handleRanges }))}
          </>
        )}
        {newPeople.length > 0 && (
          <>
            <SectionTitle>Глобальный поиск</SectionTitle>
            {newPeople.map(personRow)}
          </>
        )}
        <PublicRoomResults query={q} />
        {preview.length > 0 && (
          <>
            <SectionTitle
              action={
                messageHits.length > preview.length && (
                  <button type="button" onClick={() => setCategory('messages')} className="rounded-md px-1.5 py-0.5 text-[13px] font-medium text-accent hover:bg-accent-muted cursor-pointer">
                    Показать все
                  </button>
                )
              }
            >
              Сообщения · {messageHits.length >= 300 ? '300+' : messageHits.length}
            </SectionTitle>
            {preview.map(messageRow)}
          </>
        )}
        {nothing &&
          (peopleLoading ? (
            <div className="flex justify-center py-10 text-muted">
              <IconLoader2 size={24} className="animate-spin" />
            </div>
          ) : (
            <Empty icon={<IconSearch size={28} />} title="Ничего не найдено" hint={`По запросу «${q}» нет чатов, людей и сообщений.`} />
          ))}
      </>
    );
  } else if (messageHits.length === 0) {
    const label = EMPTY_GENITIVE[category];
    body = (
      <Empty
        icon={
          category === 'media' ? <IconPhoto size={28} /> : category === 'links' ? <IconLink size={28} /> : category === 'files' ? <IconFileText size={28} /> : category === 'voice' ? <IconMicrophone size={28} /> : <IconSearch size={28} />
        }
        title="Ничего не найдено"
        hint={category === 'messages' ? `Среди загруженных сообщений нет «${q}».` : `Нет ${label}, подходящих под «${q}» — ни по тексту, ни по имени чата.`}
      />
    );
  } else if (category === 'media') {
    body = <div className="grid grid-cols-3 gap-0.5 overflow-hidden rounded-xl pt-1">{messageHits.map(mediaTile)}</div>;
  } else {
    const render = category === 'links' ? linkRow : category === 'files' ? fileRow : category === 'voice' ? voiceRow : messageRow;
    body = (
      <>
        <SectionTitle>
          {messageHits.length >= 300 ? 'Больше 300 результатов' : `${messageHits.length} ${pluralRu(messageHits.length, 'результат', 'результата', 'результатов')}`}
        </SectionTitle>
        {messageHits.map(render)}
      </>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {q && (
        <div className="relative shrink-0 select-none border-b border-line">
          <div role="tablist" aria-label="Что искать" className="flex overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SEARCH_CATEGORIES.map((c) => {
              const active = c.id === category;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={(e) => {
                    setCategory(c.id);
                    e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
                  }}
                  className={`relative shrink-0 whitespace-nowrap px-3 pb-2.5 pt-2 text-[14.5px] font-medium transition-colors cursor-pointer ${
                    active ? 'text-accent' : 'text-muted hover:text-ink'
                  }`}
                >
                  {c.label}
                  {active && (
                    <motion.span
                      layoutId="sidebar-search-underline"
                      transition={{ type: 'spring', stiffness: 520, damping: 40 }}
                      className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-accent"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div ref={listRef} role="listbox" aria-label="Результаты поиска" className="flex-1 overflow-y-auto overflow-x-hidden px-1.5 pb-28 pt-0.5 md:pb-2 tg-scrollbar">
        {body}
      </div>
    </div>
  );
};

export default SidebarSearch;
