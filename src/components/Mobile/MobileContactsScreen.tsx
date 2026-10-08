import React, { useState } from 'react';
import { IconLoader2, IconLock, IconSearch, IconSpeakerphone, IconUserPlus, IconUsersGroup, IconX } from '@tabler/icons-react';
import { useRooms } from '../../context/contexts';
import { usePeopleDirectory } from '../../hooks/usePeopleDirectory';
import type { UserSearchResult } from '../../types';
import type { NewChatMode } from '../Chat/NewChatModal';

interface MobileContactsScreenProps {
  onOpenRoom: (roomId: string) => void;
  onNewChat: (mode: NewChatMode) => void;
}

/** "Контакты" tab: people you chat with + directory search, tap opens the dialog (Telegram iOS). */
export const MobileContactsScreen: React.FC<MobileContactsScreenProps> = ({ onOpenRoom, onNewChat }) => {
  const { createDirectChat } = useRooms();
  const [query, setQuery] = useState('');
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { people: sorted, searching: loading } = usePeopleDirectory(query);

  const open = async (user: UserSearchResult) => {
    const target = user.username || user.userId;
    setOpening(target);
    setError(null);
    try {
      const room = await createDirectChat(target);
      if (room) onOpenRoom(room.id);
      else setError('Не удалось открыть диалог');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось открыть диалог');
    } finally {
      setOpening(null);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="px-4 pb-2 pt-3">
        <h1 className="m-0 text-[28px] font-bold leading-tight tracking-tight text-ink">Контакты</h1>
        <label className="relative mt-3 flex h-10 items-center rounded-full bg-elevated">
          <IconSearch size={18} className="pointer-events-none absolute left-3.5 text-muted" />
          <span className="sr-only">Поиск людей</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Имя или @username"
            className="h-full w-full min-w-0 rounded-full bg-transparent pl-10 pr-10 text-[15px] text-ink outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-1.5 flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-ink/10 cursor-pointer"
              aria-label="Очистить поиск"
            >
              <IconX size={16} />
            </button>
          )}
        </label>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-28 md:pb-2 tg-scrollbar">
        {!query && (
          <div className="mb-1">
            <ActionRow icon={<IconUsersGroup size={22} />} label="Создать группу" onClick={() => onNewChat('group')} />
            <ActionRow icon={<IconLock size={22} />} label="Секретный чат" onClick={() => onNewChat('secret')} />
            <ActionRow icon={<IconSpeakerphone size={22} />} label="Создать канал" onClick={() => onNewChat('channel')} />
            <ActionRow icon={<IconUserPlus size={22} />} label="Найти по имени пользователя" onClick={() => onNewChat('direct')} />
          </div>
        )}

        <p className="m-0 px-3 pb-1 pt-2 text-[13px] font-medium text-muted">
          {query ? 'Результаты поиска' : 'Люди'}
        </p>

        {error && <p className="m-0 px-3 py-2 text-[13.5px] text-danger">{error}</p>}

        {loading && sorted.length === 0 ? (
          <div className="flex justify-center py-8 text-muted">
            <IconLoader2 size={22} className="animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <p className="m-0 px-3 py-8 text-center text-[14px] text-muted">
            {query ? 'Никого не нашлось' : 'Здесь появятся люди, с которыми можно начать чат'}
          </p>
        ) : (
          <ul className="m-0 list-none p-0">
            {sorted.map((u) => {
              const target = u.username || u.userId;
              const name = u.displayName || u.username;
              return (
                <li key={u.userId || u.username}>
                  <button
                    type="button"
                    onClick={() => void open(u)}
                    disabled={opening !== null}
                    className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-elevated active:bg-elevated disabled:opacity-60 cursor-pointer"
                  >
                    <span className="relative shrink-0">
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-strong text-[17px] font-semibold text-white">
                          {name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      {u.isOnline && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-[var(--surface)]" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15.5px] font-medium text-ink">{name}</span>
                      <span className={`block truncate text-[13.5px] ${u.isOnline ? 'text-accent' : 'text-muted'}`}>
                        {u.isOnline ? 'в сети' : `@${u.username}`}
                      </span>
                    </span>
                    {opening === target && <IconLoader2 size={18} className="shrink-0 animate-spin text-muted" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

const ActionRow: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-accent transition-colors hover:bg-elevated active:bg-elevated cursor-pointer"
  >
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-muted">{icon}</span>
    <span className="text-[15.5px] font-medium">{label}</span>
  </button>
);
