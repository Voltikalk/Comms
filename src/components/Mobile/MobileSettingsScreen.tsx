import React from 'react';
import {
  IconArchive,
  IconBell,
  IconBookmark,
  IconChevronRight,
  IconDeviceMobile,
  IconDownload,
  IconLogout,
  IconMoon,
  IconPalette,
  IconPencil,
  IconSearch,
  IconShieldLock,
} from '@tabler/icons-react';
import type { UserProfile } from '../../types';
import { useMessages } from '../../context/contexts';
import { profileGradient } from '../../constants';

interface MobileSettingsScreenProps {
  profile: UserProfile | null;
  currentUserName: string | null;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  showInstall: boolean;
  onOpenSaved?: () => void;
  onOpenProfile: () => void;
  onOpenSearch: () => void;
  onOpenTheme: () => void;
  onOpenPrivacy: () => void;
  onOpenQr: () => void;
  onOpenInstall: () => void;
  onOpenArchive: () => void;
  onLogout: () => void;
}

/** "Настройки" tab on phones: profile card + grouped settings, like Telegram iOS. */
export const MobileSettingsScreen: React.FC<MobileSettingsScreenProps> = ({
  profile,
  currentUserName,
  darkMode,
  onToggleDarkMode,
  showInstall,
  onOpenSaved,
  onOpenProfile,
  onOpenSearch,
  onOpenTheme,
  onOpenPrivacy,
  onOpenQr,
  onOpenInstall,
  onOpenArchive,
  onLogout,
}) => {
  const { notificationsEnabled, setNotificationsEnabled } = useMessages();
  const displayName =
    [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim() || currentUserName || 'Профиль';
  const handle = profile?.username || currentUserName;
  const subtitle = [profile?.phoneNumber, handle ? `@${handle}` : ''].filter(Boolean).join(' · ');
  const cover = profileGradient(profile?.profileColor);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-canvas/40 pb-28 md:pb-2 tg-scrollbar">
      {/* Profile card */}
      <div className="relative flex flex-col items-center px-4 pb-5 pt-6 text-center">
        <button
          type="button"
          onClick={onOpenProfile}
          className="absolute right-3 top-3 flex h-9 items-center gap-1 rounded-full px-3 text-[14.5px] font-medium text-accent transition-colors hover:bg-accent-muted cursor-pointer"
        >
          <IconPencil size={17} />
          Изм.
        </button>
        <button type="button" onClick={onOpenProfile} className="relative rounded-full cursor-pointer" aria-label="Открыть профиль">
          {profile?.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" className="h-[92px] w-[92px] rounded-full object-cover" />
          ) : (
            <span
              className={`flex h-[92px] w-[92px] items-center justify-center rounded-full text-[36px] font-semibold text-white ${
                cover ? '' : 'bg-gradient-to-br from-accent to-accent-strong'
              }`}
              style={cover ? { background: cover } : undefined}
            >
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
          {profile?.statusEmoji && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-surface text-[17px] shadow-sm">
              {profile.statusEmoji}
            </span>
          )}
        </button>
        <h1 className="m-0 mt-3 max-w-full truncate text-[22px] font-semibold leading-tight text-ink">{displayName}</h1>
        {subtitle && <p className="m-0 mt-1 max-w-full truncate text-[14.5px] text-muted">{subtitle}</p>}
      </div>

      <Group>
        {onOpenSaved && <Row icon={<IconBookmark size={19} />} tint="bg-sky-500" label="Избранное" onClick={onOpenSaved} />}
        <Row icon={<IconSearch size={19} />} tint="bg-indigo-500" label="Поиск по сообщениям" onClick={onOpenSearch} />
        <Row icon={<IconArchive size={19} />} tint="bg-amber-500" label="Архив сообщений" onClick={onOpenArchive} />
      </Group>

      <Group>
        <Row
          icon={<IconBell size={19} />}
          tint="bg-rose-500"
          label="Уведомления"
          toggle={notificationsEnabled}
          onClick={() => setNotificationsEnabled(!notificationsEnabled)}
        />
        <Row icon={<IconShieldLock size={19} />} tint="bg-slate-500" label="Конфиденциальность" onClick={onOpenPrivacy} />
        <Row icon={<IconPalette size={19} />} tint="bg-cyan-500" label="Оформление" onClick={onOpenTheme} />
        <Row icon={<IconMoon size={19} />} tint="bg-violet-500" label="Ночной режим" toggle={darkMode} onClick={onToggleDarkMode} />
      </Group>

      <Group>
        <Row icon={<IconDeviceMobile size={19} />} tint="bg-emerald-500" label="Открыть на другом устройстве" onClick={onOpenQr} />
        {showInstall && <Row icon={<IconDownload size={19} />} tint="bg-orange-500" label="Установить приложение" onClick={onOpenInstall} />}
      </Group>

      <Group>
        <button
          type="button"
          onClick={onLogout}
          className="flex h-12 w-full items-center justify-center gap-2 text-[15.5px] font-medium text-danger transition-colors active:bg-elevated cursor-pointer"
        >
          <IconLogout size={19} />
          Выйти
        </button>
      </Group>
    </div>
  );
};

const Group: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mx-3 mb-4 overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow-sm)] ring-1 ring-[var(--line)] [&>*+*]:border-t [&>*+*]:border-[var(--line)]">
    {children}
  </div>
);

const Row: React.FC<{
  icon: React.ReactNode;
  tint: string;
  label: string;
  onClick: () => void;
  /** When set, the row is a switch instead of a link. */
  toggle?: boolean;
}> = ({ icon, tint, label, onClick, toggle }) => (
  <button
    type="button"
    onClick={onClick}
    role={toggle === undefined ? undefined : 'switch'}
    aria-checked={toggle}
    className="flex h-12 w-full items-center gap-3 pl-3 pr-3.5 text-left transition-colors active:bg-elevated cursor-pointer"
  >
    <span className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg text-white ${tint}`}>{icon}</span>
    <span className="min-w-0 flex-1 truncate text-[15.5px] text-ink">{label}</span>
    {toggle === undefined ? (
      <IconChevronRight size={18} className="shrink-0 text-muted" />
    ) : (
      <span aria-hidden className={`relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors duration-200 ${toggle ? 'bg-accent' : 'bg-ink/15'}`}>
        <span
          className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-sm transition-[left] duration-200 ${toggle ? 'left-[21px]' : 'left-[3px]'}`}
        />
      </span>
    )}
  </button>
);
