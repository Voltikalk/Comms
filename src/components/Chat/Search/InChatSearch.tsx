import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  IconArrowLeft,
  IconChartBar,
  IconChevronDown,
  IconChevronUp,
  IconFileText,
  IconList,
  IconMicrophone,
  IconPhoto,
  IconSearch,
  IconUser,
  IconVideo,
  IconX,
} from '@tabler/icons-react';
import { useAuth, useRooms } from '../../../context/contexts';
import { ROOM_AVATAR_COLORS } from '../../../constants';
import {
  IN_CHAT_SEARCH_INPUT_ID,
  formatSearchDate,
  matchText,
  searchMessages,
  searchVariants,
  type MessageHit,
} from '../../../lib/chat-search';
import { pluralRu } from '../../../lib/roles';
import type { Message, Room } from '../../../types';
import { SearchHighlight } from './SearchHighlight';

const MEDIA_ICON: Partial<Record<string, typeof IconPhoto>> = {
  image: IconPhoto,
  video: IconVideo,
  video_note: IconVideo,
  audio: IconMicrophone,
  file: IconFileText,
};

export interface InChatSearchProps {
  room: Room;
  /** Messages of the open chat (any order). */
  messages: Message[];
  query: string;
  onQueryChange: (q: string) => void;
  /** Scroll the feed to a message and flash it. */
  onJump: (messageId: string) => void;
  onClose: () => void;
}

/**
 * Telegram-style search inside the open chat, shown in place of the chat
 * header. Results are listed newest first under the header; picking one jumps
 * to it and leaves the «N из M» counter, whose arrows step to older (↑) and
 * newer (↓) matches without filtering the feed. Groups can narrow the search
 * to one member («от: …»), which also works without any text.
 */
export const InChatSearch: React.FC<InChatSearchProps> = ({ room, messages, query, onQueryChange, onJump, onClose }) => {
  const me = useAuth().currentUser;
  const { getUserDisplayName, getUserAvatar } = useRooms();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [sender, setSender] = useState<string | null>(null);
  // «от:» picker: the field filters members instead of messages.
  const [picking, setPicking] = useState(false);
  const [memberQuery, setMemberQuery] = useState('');
  const [listOpen, setListOpen] = useState(true);
  // The match the feed was last scrolled to; tracked by id so new messages don't shift it.
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [cursor, setCursor] = useState(0);

  const deferredQuery = useDeferredValue(query);
  const active = deferredQuery.trim() !== '' || sender !== null;
  const hits = useMemo<MessageHit[]>(
    () => (active ? searchMessages(messages, deferredQuery, { sender: sender ?? undefined, limit: 500 }) : []),
    [active, messages, deferredQuery, sender]
  );
  const current = currentId ? hits.findIndex((h) => h.message.id === currentId) : -1;

  // A new search reopens the list and forgets the position in the old one.
  useEffect(() => {
    setListOpen(true);
    setCurrentId(null);
    setCursor(0);
  }, [deferredQuery, sender]);

  const canFilterBySender = room.type === 'group';
  const members = useMemo(() => {
    if (!picking) return [];
    const variants = searchVariants(memberQuery);
    return room.participants
      .map((id) => ({ id, name: id === me ? 'Вы' : getUserDisplayName(id) }))
      .filter((m) => variants.length === 0 || matchText(m.name, variants) || matchText(m.id, variants))
      .sort((a, b) => (a.id === me ? -1 : b.id === me ? 1 : a.name.localeCompare(b.name, 'ru')));
  }, [picking, memberQuery, room.participants, me, getUserDisplayName]);

  const showList = picking || (listOpen && active);
  const rowCount = picking ? members.length : hits.length;

  // Clicking the feed closes the dropdown but keeps the search.
  useEffect(() => {
    if (!showList) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setPicking(false);
      setListOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [showList]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-row="${cursor}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const goTo = (index: number) => {
    const hit = hits[index];
    if (!hit) return;
    setCurrentId(hit.message.id);
    setCursor(index);
    setListOpen(false);
    onJump(hit.message.id);
  };
  // Index 0 is the newest match, so «up» (older) moves forward through the list.
  const older = () => goTo(current < 0 ? 0 : current + 1);
  const newer = () => current > 0 && goTo(current - 1);

  const pickSender = (id: string) => {
    setSender(id);
    setPicking(false);
    setMemberQuery('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    const key = e.key;
    if (key === 'Escape') {
      // Innermost first: picker → list → search itself. Keep the chat's own Esc handlers out of it.
      e.preventDefault();
      e.stopPropagation();
      if (picking) setPicking(false);
      else if (showList && hits.length > 0) setListOpen(false);
      else onClose();
      return;
    }
    if (key === 'Backspace' && sender && !picking && e.currentTarget.selectionStart === 0 && e.currentTarget.selectionEnd === 0) {
      setSender(null);
      return;
    }
    if (showList && rowCount > 0 && (key === 'ArrowDown' || key === 'ArrowUp')) {
      e.preventDefault();
      setCursor((c) => (key === 'ArrowDown' ? Math.min(rowCount - 1, c + 1) : Math.max(0, c - 1)));
      return;
    }
    if (key === 'Enter') {
      e.preventDefault();
      if (picking) {
        if (members[cursor]) pickSender(members[cursor].id);
      } else if (showList) {
        goTo(Math.min(cursor, hits.length - 1));
      } else if (e.shiftKey) {
        newer();
      } else {
        older();
      }
      return;
    }
    if (!showList && hits.length > 0 && (key === 'ArrowUp' || key === 'ArrowDown')) {
      e.preventDefault();
      if (key === 'ArrowUp') older();
      else newer();
    }
  };

  const avatar = (userId: string, size: number) => {
    const src = getUserAvatar(userId);
    const name = getUserDisplayName(userId);
    return (
      <span
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white ${src ? 'bg-elevated' : ROOM_AVATAR_COLORS[userId] || 'bg-accent'}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {src ? <img src={src} alt="" className="h-full w-full object-cover" draggable={false} /> : (name.trim().charAt(0) || '?').toUpperCase()}
      </span>
    );
  };

  const hitRow = (hit: MessageHit, i: number) => {
    const m = hit.message;
    const MediaIcon = m.poll ? IconChartBar : m.file ? MEDIA_ICON[m.file.type] : undefined;
    return (
      <button
        key={m.id}
        type="button"
        role="option"
        aria-selected={i === cursor}
        data-row={i}
        onClick={() => goTo(i)}
        onMouseMove={() => i !== cursor && setCursor(i)}
        className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors cursor-pointer ${
          i === cursor ? 'bg-elevated' : ''
        } ${i === current ? 'bg-accent-muted!' : ''}`}
      >
        {avatar(m.sender, 40)}
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate text-[14.5px] font-semibold leading-tight text-ink">
              {m.sender === me ? 'Вы' : getUserDisplayName(m.sender)}
            </span>
            <span className="shrink-0 text-[12.5px] tabular-nums text-muted">{formatSearchDate(m.timestamp)}</span>
          </span>
          <span className="mt-0.5 block truncate text-[14px] leading-snug text-muted">
            {MediaIcon && <MediaIcon size={15} className="mr-0.5 inline-block -translate-y-px align-middle" />}
            <SearchHighlight text={hit.snippet} ranges={hit.ranges} />
          </span>
        </span>
      </button>
    );
  };

  const senderName = sender ? (sender === me ? 'Вы' : getUserDisplayName(sender)) : '';
  const countLabel = `${hits.length >= 500 ? 'Больше 500' : hits.length} ${pluralRu(hits.length, 'сообщение', 'сообщения', 'сообщений')}`;

  let dropdown: React.ReactNode = null;
  if (picking) {
    dropdown =
      members.length === 0 ? (
        <p className="m-0 px-4 py-6 text-center text-[14px] text-muted">Нет участников «{memberQuery.trim()}»</p>
      ) : (
        <>
          <div className="px-4 pb-1 pt-2.5 text-[13px] font-semibold text-muted">Сообщения от</div>
          {members.map((u, i) => (
            <button
              key={u.id}
              type="button"
              role="option"
              aria-selected={i === cursor}
              data-row={i}
              onClick={() => pickSender(u.id)}
              onMouseMove={() => i !== cursor && setCursor(i)}
              className={`flex w-full items-center gap-3 px-3 py-1.5 text-left transition-colors cursor-pointer ${i === cursor ? 'bg-elevated' : ''}`}
            >
              {avatar(u.id, 36)}
              <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium text-ink">{u.name}</span>
            </button>
          ))}
        </>
      );
  } else if (showList) {
    dropdown =
      hits.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-8 text-center">
          <div className="mb-2.5 flex h-12 w-12 items-center justify-center rounded-full bg-accent-muted text-accent">
            <IconSearch size={22} />
          </div>
          <p className="m-0 text-[14.5px] font-semibold text-ink">Ничего не найдено</p>
          <p className="m-0 mt-0.5 text-[13px] text-muted">
            {deferredQuery.trim()
              ? `В этом чате нет «${deferredQuery.trim()}»${sender ? ` от ${senderName}` : ''}.`
              : `${senderName} ещё ничего не писал(а) в этом чате.`}
          </p>
        </div>
      ) : (
        <>
          <div className="px-4 pb-1 pt-2.5 text-[13px] font-semibold text-muted">
            {sender && !deferredQuery.trim() ? `Сообщения от ${senderName} · ${hits.length}` : `Найдено: ${countLabel}`}
          </div>
          {hits.map(hitRow)}
        </>
      );
  }

  return (
    <div ref={rootRef} className="flex w-full min-w-0 items-center gap-1">
      <button
        type="button"
        onClick={onClose}
        className="-ml-1.5 shrink-0 rounded-full p-1.5 text-muted transition-colors hover:bg-elevated hover:text-ink cursor-pointer"
        title="Закрыть поиск (Esc)"
        aria-label="Закрыть поиск"
      >
        <IconArrowLeft size={22} />
      </button>

      <label className="flex h-9 min-w-0 flex-1 items-center gap-1.5 rounded-full bg-elevated pl-3 pr-1 focus-within:ring-1 focus-within:ring-accent/40">
        <IconSearch size={16} className="shrink-0 text-muted" />
        {sender && !picking && (
          <span className="flex max-w-[45%] shrink-0 items-center gap-0.5 rounded-full bg-accent-muted py-0.5 pl-2 pr-0.5 text-[13px] font-medium text-accent">
            <span className="truncate">от: {senderName}</span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setSender(null);
                inputRef.current?.focus();
              }}
              className="rounded-full p-0.5 hover:bg-accent/15 cursor-pointer"
              aria-label="Убрать фильтр по отправителю"
            >
              <IconX size={12} stroke={2.4} />
            </button>
          </span>
        )}
        <input
          ref={inputRef}
          id={IN_CHAT_SEARCH_INPUT_ID}
          type="text"
          value={picking ? memberQuery : query}
          onChange={(e) => {
            if (picking) {
              setMemberQuery(e.target.value);
              setCursor(0);
            } else {
              onQueryChange(e.target.value);
            }
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => active && current < 0 && setListOpen(true)}
          placeholder={picking ? 'Имя участника' : sender ? 'Текст сообщения' : 'Поиск в чате'}
          autoFocus
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          role="combobox"
          aria-expanded={showList}
          aria-autocomplete="list"
          aria-label="Поиск в этом чате"
          className="min-w-0 flex-1 bg-transparent text-[14.5px] text-ink placeholder:text-muted focus:outline-none"
        />
        {(picking ? memberQuery : query) && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              if (picking) setMemberQuery('');
              else onQueryChange('');
              inputRef.current?.focus();
            }}
            className="shrink-0 rounded-full p-1 text-muted hover:text-ink cursor-pointer"
            aria-label="Очистить"
          >
            <IconX size={15} />
          </button>
        )}
      </label>

      {canFilterBySender && !sender && (
        <button
          type="button"
          onClick={() => {
            setPicking((p) => !p);
            setMemberQuery('');
            setCursor(0);
            inputRef.current?.focus();
          }}
          className={`shrink-0 rounded-full p-2 transition-colors cursor-pointer ${picking ? 'bg-accent-muted text-accent' : 'text-muted hover:bg-elevated hover:text-ink'}`}
          title="Искать сообщения участника"
          aria-label="Искать сообщения участника"
          aria-pressed={picking}
        >
          <IconUser size={19} />
        </button>
      )}

      {active && !picking && (
        <div className="flex shrink-0 items-center">
          {hits.length > 0 ? (
            <>
              {!showList && (
                <button
                  type="button"
                  onClick={() => {
                    setListOpen(true);
                    setCursor(Math.max(0, current));
                    inputRef.current?.focus();
                  }}
                  className="rounded-full p-2 text-muted transition-colors hover:bg-elevated hover:text-ink cursor-pointer"
                  title="Показать результаты списком"
                  aria-label="Показать результаты списком"
                >
                  <IconList size={19} />
                </button>
              )}
              <span className="hidden px-1 text-[13px] tabular-nums text-muted sm:inline" aria-live="polite">
                {current >= 0 ? `${current + 1} из ${hits.length}` : hits.length}
              </span>
              <button
                type="button"
                onClick={older}
                disabled={current >= hits.length - 1}
                className="rounded-full p-1.5 text-muted transition-colors hover:bg-elevated hover:text-ink disabled:opacity-35 disabled:hover:bg-transparent cursor-pointer disabled:cursor-default"
                title="Предыдущее (более старое) совпадение"
                aria-label="Более старое совпадение"
              >
                <IconChevronUp size={20} />
              </button>
              <button
                type="button"
                onClick={newer}
                disabled={current <= 0}
                className="rounded-full p-1.5 text-muted transition-colors hover:bg-elevated hover:text-ink disabled:opacity-35 disabled:hover:bg-transparent cursor-pointer disabled:cursor-default"
                title="Следующее (более новое) совпадение"
                aria-label="Более новое совпадение"
              >
                <IconChevronDown size={20} />
              </button>
            </>
          ) : (
            <span className="px-2 text-[13px] text-muted">Не найдено</span>
          )}
        </div>
      )}

      {dropdown && (
        <div
          ref={listRef}
          role="listbox"
          aria-label={picking ? 'Участники' : 'Результаты поиска'}
          className="absolute inset-x-0 top-full z-40 max-h-[min(60vh,440px)] overflow-y-auto border-b border-line bg-surface pb-1.5 shadow-lg shadow-black/10 tg-scrollbar animate-pop-in"
        >
          {dropdown}
        </div>
      )}
    </div>
  );
};

export default InChatSearch;
