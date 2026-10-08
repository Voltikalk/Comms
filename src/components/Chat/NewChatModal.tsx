import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  IconArrowLeft,
  IconArrowRight,
  IconCamera,
  IconCheck,
  IconLoader2,
  IconLock,
  IconSearch,
  IconShieldLock,
  IconSpeakerphone,
  IconUsersGroup,
  IconWorld,
  IconX,
} from '@tabler/icons-react';
import { useRooms } from '../../context/contexts';
import { usePeopleDirectory } from '../../hooks/usePeopleDirectory';
import { uploadFile } from '../../services/upload.service';
import { AvatarCropEditor } from '../AvatarCropEditor';
import { USERNAME_RE } from '../../lib/roles';
import type { UserSearchResult } from '../../types';

export type NewChatMode = 'direct' | 'secret' | 'group' | 'channel';

export interface NewChatModalProps {
  isOpen: boolean;
  /** Screen to start on (e.g. "Создать группу" from the contacts screen). */
  initialMode?: NewChatMode;
  onClose: () => void;
  onRoomOpened?: (roomId: string) => void;
}

/**
 * root → (secret | members → info | channelInfo → channelType → channelMembers),
 * like Telegram's "Новое сообщение" flow.
 */
type Step = 'root' | 'secret' | 'members' | 'info' | 'channelInfo' | 'channelType' | 'channelMembers';

type UsernameState = 'idle' | 'checking' | 'free' | 'taken' | 'invalid';

const MAX_GROUP_MEMBERS = 200;
const MAX_AVATAR_BYTES = 15 * 1024 * 1024;

const idOf = (u: UserSearchResult) => u.username || u.userId;

const plural = (n: number, [one, few, many]: [string, string, string]) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};
const membersLabel = (n: number) => `${n} ${plural(n, ['участник', 'участника', 'участников'])}`;

export const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, ...props }) =>
  isOpen ? <NewChatSheet {...props} /> : null;

const NewChatSheet: React.FC<Omit<NewChatModalProps, 'isOpen'>> = ({ initialMode = 'direct', onClose, onRoomOpened }) => {
  const { createDirectChat, createSecretChat, createGroupChat, createChannel, getInvitePreview } = useRooms();

  const [step, setStep] = useState<Step>(
    initialMode === 'group' ? 'members' : initialMode === 'secret' ? 'secret' : initialMode === 'channel' ? 'channelInfo' : 'root',
  );
  const [dir, setDir] = useState(1);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<UserSearchResult[]>([]);
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [username, setUsername] = useState('');
  const [usernameState, setUsernameState] = useState<UsernameState>('idle');
  const [avatar, setAvatar] = useState<{ preview: string; url?: string } | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadSeq = useRef(0);

  const isFormStep = step === 'info' || step === 'channelInfo' || step === 'channelType';
  const isPicker = step === 'members' || step === 'channelMembers';
  const { people, searching, isQuery } = usePeopleDirectory(isFormStep ? '' : query);
  const selectedIds = new Set(selected.map(idOf));
  const uploading = !!avatar && !avatar.url;

  // Focus the main field of each screen once its slide-in starts.
  useEffect(() => {
    if (step === 'channelType') return;
    const t = window.setTimeout(() => (step === 'info' || step === 'channelInfo' ? nameRef.current : searchRef.current)?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [step]);

  // Public link availability, checked while typing (debounced).
  const cleanUsername = username.trim().replace(/^@/, '').toLowerCase();
  useEffect(() => {
    if (!isPublic || !cleanUsername) {
      setUsernameState('idle');
      return;
    }
    if (!USERNAME_RE.test(cleanUsername)) {
      setUsernameState('invalid');
      return;
    }
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
  }, [isPublic, cleanUsername, getInvitePreview]);

  const go = (next: Step, direction = 1) => {
    setDir(direction);
    setStep(next);
    setQuery('');
    setError(null);
  };

  const back = () => {
    if (step === 'info') go('members', -1);
    else if (step === 'channelMembers') go('channelType', -1);
    else if (step === 'channelType') go('channelInfo', -1);
    else if (step === 'root') onClose();
    else go('root', -1);
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

  const openChat = async (user: UserSearchResult, secret: boolean) => {
    if (busy) return;
    setBusy(idOf(user));
    setError(null);
    try {
      const room = await (secret ? createSecretChat : createDirectChat)(idOf(user));
      if (!room) throw new Error(secret ? 'Не удалось начать секретный чат' : 'Не удалось открыть диалог');
      onRoomOpened?.(room.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось открыть диалог');
      setBusy(null);
    }
  };

  const toggle = (user: UserSearchResult) => {
    const id = idOf(user);
    setError(null);
    if (selectedIds.has(id)) {
      setSelected((prev) => prev.filter((u) => idOf(u) !== id));
    } else if (step === 'members' && selected.length >= MAX_GROUP_MEMBERS) {
      setError(`В группе может быть не больше ${MAX_GROUP_MEMBERS} участников`);
    } else {
      setSelected((prev) => [...prev, user]);
      setQuery('');
    }
    searchRef.current?.focus();
  };

  const pickAvatar = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Выберите изображение');
    if (file.size > MAX_AVATAR_BYTES) return setError('Файл больше 15 МБ');
    setCropFile(file);
  };

  const uploadAvatar = async (blob: Blob) => {
    setCropFile(null);
    setError(null);
    const seq = ++uploadSeq.current;
    const preview = URL.createObjectURL(blob);
    setAvatar({ preview });
    try {
      const url = await uploadFile({ name: 'group-avatar.jpg', type: 'image/jpeg', data: '', rawBlob: blob });
      if (seq === uploadSeq.current) setAvatar({ preview, url });
    } catch {
      if (seq !== uploadSeq.current) return;
      setAvatar(null);
      setError('Не удалось загрузить фото');
    }
  };

  const createGroup = async () => {
    const name = groupName.trim();
    if (!name) {
      setError('Введите название группы');
      nameRef.current?.focus();
      return;
    }
    if (busy || uploading) return;
    setBusy('group');
    setError(null);
    try {
      const room = await createGroupChat(name, selected.map(idOf), avatar?.url);
      if (!room) throw new Error('Не удалось создать группу');
      onRoomOpened?.(room.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать группу');
      setBusy(null);
    }
  };

  const channelInfoNext = () => {
    if (!groupName.trim()) {
      setError('Введите название канала');
      nameRef.current?.focus();
      return;
    }
    if (uploading) return;
    go('channelType');
  };

  const channelTypeNext = () => {
    if (isPublic) {
      if (usernameState === 'invalid' || !cleanUsername) return setError('Ссылка: 5–32 символа, латиница, цифры и _, начинается с буквы.');
      if (usernameState === 'taken') return setError('Эта ссылка уже занята.');
      if (usernameState === 'checking') return;
    }
    go('channelMembers');
  };

  const createNewChannel = async () => {
    if (busy || uploading) return;
    setBusy('channel');
    setError(null);
    const res = await createChannel({
      name: groupName.trim(),
      description: description.trim() || undefined,
      avatarUrl: avatar?.url,
      username: isPublic ? cleanUsername : undefined,
      participantIds: selected.map(idOf),
    });
    if (res.ok && res.room) {
      onRoomOpened?.(res.room.id);
      onClose();
      return;
    }
    setBusy(null);
    // Name/link problems are fixed on the previous screens.
    if (res.error && /ссылк/i.test(res.error)) go('channelType', -1);
    setError(res.error || 'Не удалось создать канал');
  };

  const title =
    step === 'root'
      ? 'Новое сообщение'
      : step === 'secret'
        ? 'Секретный чат'
        : step === 'channelInfo'
          ? 'Новый канал'
          : step === 'channelType'
            ? 'Тип канала'
            : step === 'channelMembers'
              ? 'Подписчики'
              : 'Новая группа';
  const subtitle =
    step === 'members'
      ? selected.length
        ? `${membersLabel(selected.length)} из ${MAX_GROUP_MEMBERS}`
        : 'Добавьте участников'
      : step === 'channelMembers'
        ? selected.length
          ? `${selected.length} ${plural(selected.length, ['подписчик', 'подписчика', 'подписчиков'])}`
          : 'Можно пропустить и пригласить позже'
        : null;

  const fabAction =
    step === 'members'
      ? () => go('info')
      : step === 'info'
        ? () => void createGroup()
        : step === 'channelInfo'
          ? channelInfoNext
          : step === 'channelType'
            ? channelTypeNext
            : step === 'channelMembers'
              ? () => void createNewChannel()
              : null;
  const fabIsFinal = step === 'info' || step === 'channelMembers';
  const fabBusy = busy === 'group' || busy === 'channel' || ((step === 'info' || step === 'channelInfo') && uploading);
  const fabLabel = step === 'info' ? 'Создать группу' : step === 'channelMembers' ? 'Создать канал' : 'Далее';

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
        aria-labelledby="new-chat-title"
        initial={{ y: 28, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        className="relative flex h-[min(92dvh,720px)] w-full flex-col overflow-hidden rounded-t-[22px] bg-surface text-ink shadow-2xl sm:h-[min(640px,calc(100dvh-2rem))] sm:max-w-[420px] sm:rounded-3xl sm:ring-1 sm:ring-line"
      >
        {/* Header */}
        <header className="flex shrink-0 items-center gap-1.5 px-2 pb-1 pt-2">
          <button
            type="button"
            onClick={back}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-elevated hover:text-ink cursor-pointer"
            aria-label={step === 'root' ? 'Закрыть' : 'Назад'}
            title={step === 'root' ? 'Закрыть (Esc)' : 'Назад (Esc)'}
          >
            {step === 'root' ? <IconX size={21} /> : <IconArrowLeft size={21} />}
          </button>
          <div className="min-w-0 flex-1">
            <h2 id="new-chat-title" className="m-0 truncate text-[16.5px] font-semibold leading-tight">
              {title}
            </h2>
            {subtitle && <p className="m-0 mt-0.5 truncate text-[12.5px] text-muted">{subtitle}</p>}
          </div>
        </header>

        {/* Screens */}
        <div className="relative min-h-0 flex-1">
          <AnimatePresence initial={false} custom={dir}>
            <motion.div
              key={step}
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
              {step === 'channelType' ? (
                <ChannelTypeStep
                  isPublic={isPublic}
                  onPublic={(v) => {
                    setIsPublic(v);
                    setError(null);
                  }}
                  username={username}
                  onUsername={(v) => {
                    setUsername(v);
                    setError(null);
                  }}
                  state={usernameState}
                  onSubmit={channelTypeNext}
                  error={error}
                />
              ) : step === 'info' || step === 'channelInfo' ? (
                <GroupInfo
                  kind={step === 'channelInfo' ? 'channel' : 'group'}
                  description={description}
                  onDescription={setDescription}
                  nameRef={nameRef}
                  name={groupName}
                  onName={setGroupName}
                  onSubmit={step === 'channelInfo' ? channelInfoNext : () => void createGroup()}
                  avatar={avatar}
                  uploading={uploading}
                  onPickAvatar={() => fileRef.current?.click()}
                  onRemoveAvatar={() => {
                    uploadSeq.current++;
                    setAvatar(null);
                  }}
                  members={selected}
                  onRemoveMember={(u) => setSelected((prev) => prev.filter((p) => idOf(p) !== idOf(u)))}
                  error={error}
                />
              ) : (
                <>
                  {/* Search / member picker field */}
                  <div className="shrink-0 px-3 pb-2">
                    <div
                      className="flex max-h-[124px] min-h-10 flex-wrap items-center gap-1.5 overflow-y-auto rounded-[20px] bg-elevated px-3 py-1.5"
                      onMouseDown={(e) => {
                        if (e.target === e.currentTarget) {
                          e.preventDefault();
                          searchRef.current?.focus();
                        }
                      }}
                    >
                      {isPicker ? (
                        selected.map((u) => (
                          <MemberChip key={idOf(u)} user={u} onRemove={() => toggle(u)} />
                        ))
                      ) : (
                        <IconSearch size={17} className="shrink-0 text-muted" />
                      )}
                      <input
                        ref={searchRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !query && isPicker && selected.length) {
                            setSelected((prev) => prev.slice(0, -1));
                          }
                          if (e.key === 'Enter' && people[0]) {
                            e.preventDefault();
                            if (isPicker) toggle(people[0]);
                            else void openChat(people[0], step === 'secret');
                          }
                        }}
                        placeholder={isPicker ? (selected.length ? 'Добавить ещё…' : 'Кого пригласить?') : 'Имя или @username'}
                        aria-label="Поиск людей"
                        className="h-7 min-w-[120px] flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
                      />
                      {searching ? (
                        <IconLoader2 size={16} className="shrink-0 animate-spin text-muted" />
                      ) : (
                        query && (
                          <button
                            type="button"
                            onClick={() => {
                              setQuery('');
                              searchRef.current?.focus();
                            }}
                            className="-mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted hover:bg-ink/10 cursor-pointer"
                            aria-label="Очистить"
                          >
                            <IconX size={14} />
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-24 tg-scrollbar">
                    {step === 'root' && !isQuery && (
                      <div className="mb-1">
                        <ActionRow icon={<IconUsersGroup size={22} />} label="Создать группу" onClick={() => go('members')} />
                        <ActionRow icon={<IconLock size={22} />} label="Секретный чат" onClick={() => go('secret')} />
                        <ActionRow icon={<IconSpeakerphone size={22} />} label="Создать канал" onClick={() => go('channelInfo')} />
                      </div>
                    )}

                    {step === 'secret' && !isQuery && (
                      <div className="mx-1.5 mb-2 flex gap-3 rounded-2xl bg-accent-muted px-3.5 py-3 text-[13px] leading-snug text-ink">
                        <IconShieldLock size={20} className="mt-0.5 shrink-0 text-accent" />
                        <span>
                          Сквозное шифрование: сообщения видны только вам и собеседнику и хранятся только на этом устройстве.
                        </span>
                      </div>
                    )}

                    {error && <p className="m-0 px-3 pb-1 text-[13px] text-danger">{error}</p>}

                    {people.length > 0 && (
                      <p className="m-0 px-3 pb-1 pt-2 text-[13px] font-medium text-muted">
                        {isQuery ? 'Результаты поиска' : 'Контакты'}
                      </p>
                    )}

                    {people.length === 0 ? (
                      searching ? (
                        <div className="flex justify-center py-10 text-muted">
                          <IconLoader2 size={22} className="animate-spin" />
                        </div>
                      ) : (
                        <EmptyState query={isQuery ? query.trim() : ''} />
                      )
                    ) : (
                      <ul className="m-0 list-none p-0">
                        {people.map((u) => (
                          <li key={idOf(u)}>
                            <PersonRow
                              user={u}
                              checked={isPicker ? selectedIds.has(idOf(u)) : undefined}
                              loading={busy === idOf(u)}
                              disabled={!!busy && !isPicker}
                              onClick={() => (isPicker ? toggle(u) : void openChat(u, step === 'secret'))}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Next / create button (Telegram's floating arrow) */}
          <AnimatePresence>
            {fabAction && (
              <motion.button
                key="fab"
                type="button"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                onClick={fabAction}
                disabled={fabBusy || (step === 'channelType' && isPublic && usernameState === 'checking')}
                className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-black/25 transition-[background-color,opacity] hover:bg-accent-strong active:scale-95 disabled:opacity-60 cursor-pointer"
                aria-label={fabLabel}
                title={fabLabel}
              >
                {fabBusy ? (
                  <IconLoader2 size={24} className="animate-spin" />
                ) : fabIsFinal ? (
                  <IconCheck size={26} stroke={2.4} />
                ) : (
                  <IconArrowRight size={24} stroke={2.2} />
                )}
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
    </motion.div>,
    document.body,
  );
};

const Avatar: React.FC<{ user: UserSearchResult; size: number }> = ({ user, size }) => {
  const name = user.displayName || user.username;
  return user.avatarUrl ? (
    <img src={user.avatarUrl} alt="" className="rounded-full object-cover" style={{ width: size, height: size }} draggable={false} />
  ) : (
    <span
      className="flex items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-strong font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
};

const PersonRow: React.FC<{
  user: UserSearchResult;
  /** Defined in the member picker: shows the selection check. */
  checked?: boolean;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}> = ({ user, checked, loading, disabled, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    role={checked === undefined ? undefined : 'checkbox'}
    aria-checked={checked}
    className="flex w-full items-center gap-3 rounded-xl px-2.5 py-1.5 text-left transition-colors hover:bg-elevated active:bg-elevated disabled:opacity-60 cursor-pointer"
  >
    <span className="relative shrink-0">
      <Avatar user={user} size={44} />
      {checked !== undefined ? (
        <AnimatePresence>
          {checked && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 600, damping: 30 }}
              className="absolute -bottom-0.5 -right-0.5 flex h-[20px] w-[20px] items-center justify-center rounded-full bg-accent text-white ring-2 ring-[var(--surface)]"
            >
              <IconCheck size={13} stroke={3} />
            </motion.span>
          )}
        </AnimatePresence>
      ) : (
        user.isOnline && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-[var(--surface)]" />
      )}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[15.5px] font-medium text-ink">{user.displayName || user.username}</span>
      <span className={`block truncate text-[13.5px] ${user.isOnline ? 'text-accent' : 'text-muted'}`}>
        {user.isOnline ? 'в сети' : `@${user.username}`}
      </span>
    </span>
    {loading && <IconLoader2 size={18} className="shrink-0 animate-spin text-muted" />}
  </button>
);

const MemberChip: React.FC<{ user: UserSearchResult; onRemove: () => void }> = ({ user, onRemove }) => (
  <motion.button
    type="button"
    layout
    initial={{ scale: 0.7, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    onClick={onRemove}
    className="group flex h-7 max-w-[160px] items-center gap-1.5 rounded-full bg-accent-muted pl-0.5 pr-2.5 text-[13.5px] font-medium text-accent cursor-pointer"
    title="Убрать"
  >
    <span className="relative flex h-6 w-6 shrink-0 overflow-hidden rounded-full">
      <Avatar user={user} size={24} />
      <span className="absolute inset-0 flex items-center justify-center rounded-full bg-accent text-white opacity-0 transition-opacity group-hover:opacity-100">
        <IconX size={13} stroke={2.6} />
      </span>
    </span>
    <span className="truncate">{(user.displayName || user.username).split(' ')[0]}</span>
  </motion.button>
);

const ActionRow: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-3 rounded-xl px-2.5 py-1.5 text-left text-accent transition-colors hover:bg-elevated active:bg-elevated cursor-pointer"
  >
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-muted">{icon}</span>
    <span className="text-[15.5px] font-medium">{label}</span>
  </button>
);

const EmptyState: React.FC<{ query: string }> = ({ query }) => (
  <div className="flex flex-col items-center px-8 py-10 text-center">
    <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-elevated text-muted">
      <IconSearch size={26} />
    </span>
    {query ? (
      <>
        <p className="m-0 text-[15px] font-medium text-ink">Никого не нашлось</p>
        <p className="m-0 mt-1 text-[13.5px] text-muted">По запросу «{query}» нет пользователей. Проверьте имя или @username.</p>
      </>
    ) : (
      <>
        <p className="m-0 text-[15px] font-medium text-ink">Пока никого нет</p>
        <p className="m-0 mt-1 text-[13.5px] text-muted">Найдите человека по имени или @username — поиск работает по всем пользователям.</p>
      </>
    )}
  </div>
);

const GroupInfo: React.FC<{
  kind: 'group' | 'channel';
  description: string;
  onDescription: (v: string) => void;
  nameRef: React.RefObject<HTMLInputElement | null>;
  name: string;
  onName: (v: string) => void;
  onSubmit: () => void;
  avatar: { preview: string; url?: string } | null;
  uploading: boolean;
  onPickAvatar: () => void;
  onRemoveAvatar: () => void;
  members: UserSearchResult[];
  onRemoveMember: (u: UserSearchResult) => void;
  error: string | null;
}> = ({ kind, description, onDescription, nameRef, name, onName, onSubmit, avatar, uploading, onPickAvatar, onRemoveAvatar, members, onRemoveMember, error }) => (
  <div className="min-h-0 flex-1 overflow-y-auto pb-24 tg-scrollbar">
    <div className="flex items-center gap-4 px-4 pb-4 pt-3">
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={onPickAvatar}
          className="relative flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full bg-accent text-white transition-[filter] hover:brightness-110 cursor-pointer"
          aria-label={avatar ? 'Сменить фото' : 'Выбрать фото'}
        >
          {avatar ? <img src={avatar.preview} alt="" className="h-full w-full object-cover" /> : <IconCamera size={30} />}
          {uploading && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/45">
              <IconLoader2 size={24} className="animate-spin" />
            </span>
          )}
        </button>
        {avatar && !uploading && (
          <button
            type="button"
            onClick={onRemoveAvatar}
            className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-surface text-muted shadow-sm ring-1 ring-line hover:text-danger cursor-pointer"
            aria-label="Убрать фото"
          >
            <IconX size={13} stroke={2.4} />
          </button>
        )}
      </div>
      <label className="min-w-0 flex-1">
        <span className="sr-only">{kind === 'channel' ? 'Название канала' : 'Название группы'}</span>
        <input
          ref={nameRef}
          type="text"
          value={name}
          maxLength={128}
          onChange={(e) => onName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder={kind === 'channel' ? 'Название канала' : 'Название группы'}
          className="w-full border-b-2 border-line bg-transparent pb-1.5 text-[17px] text-ink outline-none transition-colors placeholder:text-muted focus:border-accent"
        />
      </label>
    </div>

    {error && <p className="m-0 px-4 pb-2 text-[13px] text-danger">{error}</p>}

    {kind === 'channel' ? (
      <div className="px-4">
        <label className="block">
          <span className="sr-only">Описание</span>
          <textarea
            value={description}
            maxLength={255}
            rows={3}
            onChange={(e) => onDescription(e.target.value)}
            placeholder="Описание (необязательно)"
            className="w-full resize-none rounded-2xl bg-elevated px-3.5 py-2.5 text-[15px] text-ink outline-none placeholder:text-muted"
          />
        </label>
        <p className="m-0 mt-1 px-1 text-[12.5px] leading-snug text-muted">
          Канал — инструмент для публикаций на неограниченную аудиторию. Писать в нём могут только администраторы.
        </p>
      </div>
    ) : (
      <>

    <p className="m-0 bg-elevated/60 px-4 py-1.5 text-[13px] font-medium text-muted">
      {members.length ? membersLabel(members.length) : 'Пока только вы — участников можно добавить позже'}
    </p>
    <ul className="m-0 list-none px-1.5 py-1">
      {members.map((u) => (
        <li key={idOf(u)} className="group flex items-center gap-3 rounded-xl px-2.5 py-1.5">
          <Avatar user={u} size={40} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-medium text-ink">{u.displayName || u.username}</span>
            <span className={`block truncate text-[13px] ${u.isOnline ? 'text-accent' : 'text-muted'}`}>
              {u.isOnline ? 'в сети' : `@${u.username}`}
            </span>
          </span>
          <button
            type="button"
            onClick={() => onRemoveMember(u)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-elevated hover:text-danger cursor-pointer"
            aria-label={`Убрать ${u.displayName || u.username}`}
          >
            <IconX size={16} />
          </button>
        </li>
      ))}
    </ul>
      </>
    )}
  </div>
);

const ChannelTypeStep: React.FC<{
  isPublic: boolean;
  onPublic: (v: boolean) => void;
  username: string;
  onUsername: (v: string) => void;
  state: UsernameState;
  onSubmit: () => void;
  error: string | null;
}> = ({ isPublic, onPublic, username, onUsername, state, onSubmit, error }) => {
  const hint =
    state === 'checking'
      ? { text: 'Проверяем…', cls: 'text-muted' }
      : state === 'free'
        ? { text: 'Ссылка свободна', cls: 'text-emerald-500' }
        : state === 'taken'
          ? { text: 'Эта ссылка уже занята', cls: 'text-danger' }
          : state === 'invalid'
            ? { text: '5–32 символа: латиница, цифры и _, начинается с буквы', cls: 'text-danger' }
            : null;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-24 pt-1 tg-scrollbar">
      <div className="overflow-hidden rounded-2xl bg-elevated" role="radiogroup" aria-label="Тип канала">
        {[
          { value: false, icon: <IconLock size={20} />, label: 'Частный канал', text: 'Вступить можно только по пригласительной ссылке.' },
          { value: true, icon: <IconWorld size={20} />, label: 'Публичный канал', text: 'Канал можно найти в поиске, подписаться может любой.' },
        ].map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={isPublic === o.value}
            onClick={() => onPublic(o.value)}
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
      </div>

      {isPublic ? (
        <div className="mt-4">
          <p className="m-0 px-1 pb-1.5 text-[13px] font-medium text-accent-soft">Публичная ссылка</p>
          <div className="flex h-11 items-center rounded-2xl bg-elevated px-3.5 text-[15px]">
            <span className="shrink-0 text-muted">@</span>
            <input
              autoFocus
              type="text"
              value={username}
              maxLength={33}
              onChange={(e) => onUsername(e.target.value.replace(/\s/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onSubmit();
                }
              }}
              placeholder="ссылка"
              aria-label="Публичная ссылка"
              className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-muted"
            />
            {state === 'checking' && <IconLoader2 size={16} className="shrink-0 animate-spin text-muted" />}
            {state === 'free' && <IconCheck size={17} className="shrink-0 text-emerald-500" />}
          </div>
          {hint && <p className={`m-0 mt-1.5 px-1 text-[12.5px] ${hint.cls}`}>{hint.text}</p>}
          <p className="m-0 mt-1.5 px-1 text-[12.5px] leading-snug text-muted">
            По этой ссылке канал можно будет найти в поиске и открыть приглашение.
          </p>
        </div>
      ) : (
        <p className="m-0 mt-3 px-1 text-[12.5px] leading-snug text-muted">
          Пригласительная ссылка появится после создания — её можно скопировать в информации о канале.
        </p>
      )}
      {error && <p className="m-0 mt-2 px-1 text-[13px] text-danger">{error}</p>}
    </div>
  );
};
