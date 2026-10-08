import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  IconAt,
  IconCake,
  IconCamera,
  IconCheck,
  IconChevronRight,
  IconCopy,
  IconLoader2,
  IconMoodSmile,
  IconPalette,
  IconPhone,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { useAuth, useRooms } from '../context/contexts';
import { uploadFile } from '../services/upload.service';
import { PROFILE_COLORS, profileGradient } from '../constants';
import { MONTHS_NOMINATIVE, daysInMonth, formatBirthday, parseBirthday, serializeBirthday, type Birthday } from '../lib/birthday';
import { AvatarCropEditor } from './AvatarCropEditor';

interface ProfileEditModalProps {
  onClose: () => void;
  onToast: (message: string) => void;
}

const BIO_MAX = 70;
const NAME_MAX = 64;
const PHONE_MAX = 20;
const MAX_AVATAR_BYTES = 15 * 1024 * 1024;

const STATUS_EMOJIS = [
  '⚡', '❤️', '🔥', '✨', '👑', '🚀', '💻', '☕', '🎮', '🎧', '📚', '🌸',
  '🐱', '💎', '🌙', '☀️', '🏖️', '✈️', '🏋️', '🎨', '🍕', '🎉', '💤', '🤒',
];

const charCount = (s: string) => [...s].length;

/** Grouped "inset" card, like Telegram settings sections. */
const Section: React.FC<{ children: React.ReactNode; hint?: React.ReactNode }> = ({ children, hint }) => (
  <section>
    <div className="overflow-hidden rounded-2xl bg-surface ring-1 ring-line">{children}</div>
    {hint && <p className="mt-1.5 px-4 text-[12.5px] leading-snug text-muted [text-wrap:pretty]">{hint}</p>}
  </section>
);

const Divider = () => <div className="ml-4 h-px bg-line" />;

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ onClose, onToast }) => {
  const { currentUserProfile, updateUserProfile } = useRooms();
  const { currentUser } = useAuth();

  // Snapshot on open: live profile pushes must not reset what the user is typing.
  const [initial] = useState(() => ({
    firstName: currentUserProfile?.firstName || '',
    lastName: currentUserProfile?.lastName || '',
    bio: currentUserProfile?.bio || '',
    phoneNumber: currentUserProfile?.phoneNumber || '',
    avatarUrl: currentUserProfile?.avatarUrl || '',
    statusEmoji: currentUserProfile?.statusEmoji || '',
    profileColor: currentUserProfile?.profileColor || '',
    birthday: currentUserProfile?.birthday || '',
  }));
  const username = currentUserProfile?.username || currentUser || '';

  const [form, setForm] = useState(initial);
  const [preview, setPreview] = useState<string | null>(null);
  const [upload, setUpload] = useState<{ progress: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [birthdayOpen, setBirthdayOpen] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const firstNameRef = useRef<HTMLInputElement | null>(null);
  const uploadSeq = useRef(0);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  };

  const changes = useMemo(() => {
    const out: Partial<typeof form> = {};
    const norm = { ...form, firstName: form.firstName.trim(), lastName: form.lastName.trim(), bio: form.bio.trim(), phoneNumber: form.phoneNumber.trim() };
    (Object.keys(norm) as (keyof typeof form)[]).forEach((k) => {
      if (norm[k] !== initial[k]) out[k] = norm[k];
    });
    return out;
  }, [form, initial]);

  const dirty = Object.keys(changes).length > 0;
  const nameMissing = !form.firstName.trim();
  const bioLeft = BIO_MAX - charCount(form.bio);
  const canSave = dirty && !nameMissing && bioLeft >= 0 && !upload && !saving;

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const requestClose = useCallback(() => {
    if (saving) return;
    if (dirty || upload) setConfirmDiscard(true);
    else onClose();
  }, [dirty, upload, saving, onClose]);

  const save = useCallback(async () => {
    if (!canSave) {
      if (nameMissing) firstNameRef.current?.focus();
      return;
    }
    setSaving(true);
    const res = await updateUserProfile(changes);
    setSaving(false);
    if (!res.ok) {
      setError(res.error || 'Не удалось сохранить профиль.');
      return;
    }
    onToast('Профиль сохранён');
    onClose();
  }, [canSave, nameMissing, updateUserProfile, changes, onToast, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (cropFile) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        if (confirmDiscard) setConfirmDiscard(false);
        else if (emojiOpen) setEmojiOpen(false);
        else requestClose();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cropFile, confirmDiscard, emojiOpen, requestClose, save]);

  const pickAvatar = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return onToast('Выберите изображение');
    if (file.size > MAX_AVATAR_BYTES) return onToast('Файл больше 15 МБ');
    setCropFile(file);
  };

  /** Uploads the square cut out in the crop editor. */
  const uploadAvatar = async (blob: Blob) => {
    setCropFile(null);
    const seq = ++uploadSeq.current;
    setError(null);
    try {
      setPreview(URL.createObjectURL(blob));
      setUpload({ progress: 0 });
      const url = await uploadFile({ name: 'avatar.jpg', type: 'image/jpeg', data: '', rawBlob: blob }, (progress) => {
        if (seq === uploadSeq.current) setUpload({ progress });
      });
      if (seq !== uploadSeq.current) return;
      set('avatarUrl', url);
    } catch {
      if (seq !== uploadSeq.current) return;
      setPreview(null);
      onToast('Не удалось загрузить фото');
    } finally {
      if (seq === uploadSeq.current) setUpload(null);
    }
  };

  const removeAvatar = () => {
    uploadSeq.current++;
    setUpload(null);
    setPreview(null);
    set('avatarUrl', '');
  };

  const copyUsername = async () => {
    try {
      await navigator.clipboard.writeText(`@${username}`);
      onToast('Имя пользователя скопировано');
    } catch {
      onToast('Не удалось скопировать');
    }
  };

  const birthday = parseBirthday(form.birthday);
  const setBirthday = (patch: Partial<Birthday>) => {
    const next = { day: 1, month: 1, year: null, ...birthday, ...patch };
    next.day = Math.min(next.day, daysInMonth(next.month, next.year));
    set('birthday', serializeBirthday(next));
  };
  const thisYear = new Date().getFullYear();
  const cover = profileGradient(form.profileColor);

  const shownAvatar = preview || form.avatarUrl;
  const initials = (form.firstName.trim().charAt(0) + form.lastName.trim().charAt(0)).toUpperCase() || username.charAt(0).toUpperCase();
  const fullName = `${form.firstName} ${form.lastName}`.trim() || 'Без имени';
  const ring = 2 * Math.PI * 58;

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 backdrop-blur-[2px] sm:items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onMouseDown={(e) => e.target === e.currentTarget && requestClose()}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-edit-title"
        initial={{ y: 28, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        className="relative flex max-h-[100dvh] w-full flex-col overflow-hidden bg-canvas text-ink shadow-2xl sm:max-h-[min(860px,calc(100dvh-2rem))] sm:max-w-[440px] sm:rounded-3xl sm:ring-1 sm:ring-line max-sm:h-[100dvh]"
      >
        {/* Header */}
        <header className="flex shrink-0 items-center gap-2 border-b border-line px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={requestClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-elevated hover:text-ink cursor-pointer"
            aria-label="Закрыть"
            title="Закрыть (Esc)"
          >
            <IconX size={21} />
          </button>
          <h2 id="profile-edit-title" className="m-0 flex-1 truncate text-[16px] font-semibold">
            Редактировать профиль
          </h2>
          <button
            type="button"
            onClick={() => void save()}
            disabled={!canSave}
            className="flex h-9 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold text-white transition-[background-color,opacity] bg-accent hover:bg-accent-strong disabled:cursor-default disabled:opacity-40 cursor-pointer"
            title="Сохранить (Ctrl+Enter)"
          >
            {saving ? <IconLoader2 size={16} className="animate-spin" /> : <IconCheck size={16} stroke={2.6} />}
            Готово
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 [scrollbar-width:thin]">
          {/* Avatar on the profile color cover */}
          <div
            className={`-mx-4 -mt-6 flex flex-col items-center px-4 pb-5 pt-6 transition-[background] duration-300 ${cover ? 'text-white' : ''}`}
            style={cover ? { background: cover } : undefined}
          >
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="group relative h-[124px] w-[124px] rounded-full outline-none cursor-pointer"
              aria-label="Выбрать фото профиля"
            >
              <span
                className={`absolute inset-[4px] flex items-center justify-center overflow-hidden rounded-full text-[40px] font-semibold text-white ${
                  cover ? 'ring-4 ring-white/30' : 'bg-gradient-to-br from-accent to-accent-strong'
                }`}
                style={cover ? { background: cover } : undefined}
              >
                {shownAvatar ? <img src={shownAvatar} alt="" className="h-full w-full object-cover" draggable={false} /> : initials}
              </span>
              <span
                className={`absolute inset-[4px] flex flex-col items-center justify-center rounded-full bg-black/45 text-white transition-opacity ${
                  upload ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
                }`}
              >
                {upload ? <IconLoader2 size={28} className="animate-spin" /> : <IconCamera size={30} stroke={1.8} />}
              </span>
              {upload && (
                <svg viewBox="0 0 124 124" className="pointer-events-none absolute inset-0 -rotate-90" aria-hidden>
                  <circle cx="62" cy="62" r="58" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={ring} strokeDashoffset={ring * (1 - upload.progress / 100)} className="transition-[stroke-dashoffset] duration-200" />
                </svg>
              )}
              {!shownAvatar && !upload && (
                <span className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white ring-4 ring-canvas">
                  <IconCamera size={18} />
                </span>
              )}
            </button>
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
            <p className="mt-3 flex items-center gap-1.5 text-[19px] font-semibold leading-tight">
              <span className="max-w-[300px] truncate">{fullName}</span>
              {form.statusEmoji && <span className="text-[18px]">{form.statusEmoji}</span>}
            </p>
            <div className="mt-2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={!!upload}
                className={`rounded-full px-3 py-1.5 text-[13.5px] font-medium transition-colors disabled:opacity-50 cursor-pointer ${
                  cover ? 'bg-white/15 text-white hover:bg-white/25' : 'text-accent hover:bg-accent-muted'
                }`}
              >
                {upload ? `Загрузка… ${upload.progress}%` : shownAvatar ? 'Изменить фото' : 'Выбрать фото'}
              </button>
              {(shownAvatar || upload) && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[13.5px] font-medium transition-colors cursor-pointer ${
                    cover ? 'text-white/90 hover:bg-white/15' : 'text-danger hover:bg-danger/10'
                  }`}
                >
                  <IconTrash size={15} />
                  {upload ? 'Отменить' : 'Удалить'}
                </button>
              )}
            </div>
          </div>

          {/* Name */}
          <Section hint="Укажите имя и, если хотите, фамилию — так вас увидят собеседники.">
            <label className="flex items-center px-4">
              <span className="sr-only">Имя</span>
              <input
                ref={firstNameRef}
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                maxLength={NAME_MAX}
                placeholder="Имя (обязательно)"
                autoComplete="given-name"
                className={`h-12 w-full bg-transparent text-[15px] outline-none placeholder:text-muted ${nameMissing ? 'placeholder:text-danger/80' : ''}`}
              />
            </label>
            <Divider />
            <label className="flex items-center px-4">
              <span className="sr-only">Фамилия</span>
              <input
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                maxLength={NAME_MAX}
                placeholder="Фамилия (необязательно)"
                autoComplete="family-name"
                className="h-12 w-full bg-transparent text-[15px] outline-none placeholder:text-muted"
              />
            </label>
          </Section>

          {/* Bio */}
          <Section hint="Пара слов о себе: например, город, работа или чем увлекаетесь. Видно всем, кто откроет ваш профиль.">
            <label className="relative block px-4 py-3">
              <span className="sr-only">О себе</span>
              <textarea
                value={form.bio}
                onChange={(e) => set('bio', e.target.value.replace(/\n/g, ''))}
                rows={2}
                placeholder="О себе"
                className="block w-full resize-none bg-transparent pr-8 text-[15px] leading-snug outline-none placeholder:text-muted"
              />
              <span className={`absolute bottom-3 right-4 text-[12px] tabular-nums ${bioLeft < 0 ? 'font-semibold text-danger' : bioLeft <= 10 ? 'text-accent' : 'text-muted'}`}>
                {bioLeft}
              </span>
            </label>
          </Section>

          {/* Profile color */}
          <Section hint="Цвет обложки профиля и аватарки, пока нет фото.">
            <div className="flex items-center gap-3.5 px-4 pt-3 text-[15px]">
              <IconPalette size={21} className="shrink-0 text-muted" />
              Цвет профиля
            </div>
            <div className="flex flex-wrap gap-2.5 px-4 pb-3.5 pt-3" role="radiogroup" aria-label="Цвет профиля">
              <button
                type="button"
                role="radio"
                aria-checked={!form.profileColor}
                onClick={() => set('profileColor', '')}
                className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-strong text-white ring-offset-2 ring-offset-surface transition-transform active:scale-90 cursor-pointer ${
                  !form.profileColor ? 'ring-2 ring-accent' : ''
                }`}
                title="Как в теме"
                aria-label="Как в теме"
              >
                {!form.profileColor && <IconCheck size={18} stroke={3} />}
              </button>
              {PROFILE_COLORS.map((c) => {
                const selected = form.profileColor === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => set('profileColor', c.id)}
                    style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})`, ['--tw-ring-color' as string]: c.to }}
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-white ring-offset-2 ring-offset-surface transition-transform active:scale-90 cursor-pointer ${
                      selected ? 'ring-2' : ''
                    }`}
                    title={c.label}
                    aria-label={c.label}
                  >
                    {selected && <IconCheck size={18} stroke={3} />}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Account */}
          <Section hint="Телефон и день рождения видят только ваши контакты. Имя пользователя — это ваш логин, его нельзя изменить.">
            <button
              type="button"
              onClick={() => setEmojiOpen((v) => !v)}
              className="flex h-12 w-full items-center gap-3.5 px-4 text-left transition-colors hover:bg-elevated cursor-pointer"
              aria-expanded={emojiOpen}
            >
              <IconMoodSmile size={21} className="shrink-0 text-muted" />
              <span className="flex-1 text-[15px]">Эмодзи-статус</span>
              <span className="text-[18px]">{form.statusEmoji || <span className="text-[14px] text-muted">Нет</span>}</span>
              <IconChevronRight size={17} className={`shrink-0 text-muted transition-transform ${emojiOpen ? 'rotate-90' : ''}`} />
            </button>
            <AnimatePresence initial={false}>
              {emojiOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-8 gap-1 px-3 pb-3">
                    {STATUS_EMOJIS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => set('statusEmoji', em)}
                        className={`flex aspect-square items-center justify-center rounded-xl text-[22px] transition-[background-color,transform] hover:bg-elevated active:scale-90 cursor-pointer ${
                          form.statusEmoji === em ? 'bg-accent-muted ring-2 ring-accent' : ''
                        }`}
                        aria-label={`Статус ${em}`}
                        aria-pressed={form.statusEmoji === em}
                      >
                        {em}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => set('statusEmoji', '')}
                      className="col-span-8 mt-1 rounded-xl py-2 text-[13.5px] font-medium text-muted transition-colors hover:bg-elevated hover:text-ink disabled:opacity-40 cursor-pointer"
                      disabled={!form.statusEmoji}
                    >
                      Убрать статус
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <Divider />
            <button
              type="button"
              onClick={() => setBirthdayOpen((v) => !v)}
              className="flex h-12 w-full items-center gap-3.5 px-4 text-left transition-colors hover:bg-elevated cursor-pointer"
              aria-expanded={birthdayOpen}
            >
              <IconCake size={21} className="shrink-0 text-muted" />
              <span className="flex-1 text-[15px]">День рождения</span>
              <span className={`truncate text-[14px] ${birthday ? 'text-ink' : 'text-muted'}`}>
                {birthday ? formatBirthday(birthday) : 'Не указан'}
              </span>
              <IconChevronRight size={17} className={`shrink-0 text-muted transition-transform ${birthdayOpen ? 'rotate-90' : ''}`} />
            </button>
            <AnimatePresence initial={false}>
              {birthdayOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-2 px-4 pb-2">
                    <select
                      value={birthday?.day ?? ''}
                      onChange={(e) => setBirthday({ day: Number(e.target.value) })}
                      aria-label="День"
                      className="h-10 w-[72px] rounded-xl bg-elevated px-2.5 text-[15px] text-ink outline-none cursor-pointer"
                    >
                      {!birthday && <option value="">День</option>}
                      {Array.from({ length: daysInMonth(birthday?.month ?? 1, birthday?.year ?? null) }, (_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1}</option>
                      ))}
                    </select>
                    <select
                      value={birthday?.month ?? ''}
                      onChange={(e) => setBirthday({ month: Number(e.target.value) })}
                      aria-label="Месяц"
                      className="h-10 min-w-0 flex-1 rounded-xl bg-elevated px-2.5 text-[15px] text-ink outline-none cursor-pointer"
                    >
                      {!birthday && <option value="">Месяц</option>}
                      {MONTHS_NOMINATIVE.map((m, i) => (
                        <option key={m} value={i + 1}>{m}</option>
                      ))}
                    </select>
                    <select
                      value={birthday?.year ?? ''}
                      onChange={(e) => setBirthday({ year: e.target.value ? Number(e.target.value) : null })}
                      aria-label="Год"
                      className="h-10 w-[96px] rounded-xl bg-elevated px-2.5 text-[15px] text-ink outline-none cursor-pointer"
                    >
                      <option value="">Год</option>
                      {Array.from({ length: thisYear - 1900 + 1 }, (_, i) => thisYear - i).map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => set('birthday', '')}
                    disabled={!birthday}
                    className="mx-3 mb-3 w-[calc(100%-1.5rem)] rounded-xl py-2 text-[13.5px] font-medium text-muted transition-colors hover:bg-elevated hover:text-ink disabled:opacity-40 cursor-pointer"
                  >
                    Убрать день рождения
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            <Divider />
            <label className="flex h-12 items-center gap-3.5 px-4">
              <IconPhone size={21} className="shrink-0 text-muted" />
              <span className="sr-only">Телефон</span>
              <input
                value={form.phoneNumber}
                onChange={(e) => set('phoneNumber', e.target.value.replace(/[^+\d\s()-]/g, ''))}
                maxLength={PHONE_MAX}
                inputMode="tel"
                autoComplete="tel"
                placeholder="Номер телефона"
                className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
              />
            </label>
            <Divider />
            <div className="flex h-12 items-center gap-3.5 px-4">
              <IconAt size={21} className="shrink-0 text-muted" />
              <span className="min-w-0 flex-1 truncate text-[15px]">
                {username}
                <span className="ml-2 text-[13px] text-muted">имя пользователя</span>
              </span>
              <button
                type="button"
                onClick={() => void copyUsername()}
                className="-mr-2 flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-elevated hover:text-accent cursor-pointer"
                aria-label="Скопировать имя пользователя"
                title="Скопировать"
              >
                <IconCopy size={18} />
              </button>
            </div>
          </Section>

          {error && (
            <p role="alert" className="rounded-xl bg-danger/10 px-4 py-2.5 text-[13.5px] text-danger">
              {error}
            </p>
          )}
        </div>

        {cropFile && <AvatarCropEditor file={cropFile} onCancel={() => setCropFile(null)} onDone={(blob) => void uploadAvatar(blob)} />}

        {/* Discard confirmation */}
        <AnimatePresence>
          {confirmDiscard && (
            <motion.div
              className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 p-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onMouseDown={(e) => e.target === e.currentTarget && setConfirmDiscard(false)}
            >
              <motion.div
                role="alertdialog"
                aria-labelledby="discard-title"
                initial={{ scale: 0.94, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.94, opacity: 0 }}
                className="w-full max-w-[300px] rounded-2xl bg-surface p-5 shadow-xl ring-1 ring-line"
              >
                <h3 id="discard-title" className="m-0 text-[16px] font-semibold">Отменить изменения?</h3>
                <p className="mt-1.5 text-[14px] text-muted">Несохранённые изменения профиля будут потеряны.</p>
                <div className="mt-4 flex justify-end gap-1">
                  <button
                    type="button"
                    autoFocus
                    onClick={() => setConfirmDiscard(false)}
                    className="rounded-lg px-3 py-2 text-[14px] font-semibold text-accent transition-colors hover:bg-accent-muted cursor-pointer"
                  >
                    Продолжить
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      uploadSeq.current++;
                      onClose();
                    }}
                    className="rounded-lg px-3 py-2 text-[14px] font-semibold text-danger transition-colors hover:bg-danger/10 cursor-pointer"
                  >
                    Отменить
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>,
    document.body,
  );
};

export default ProfileEditModal;
