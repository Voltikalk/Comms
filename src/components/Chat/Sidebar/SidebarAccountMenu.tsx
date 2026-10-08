import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconBookmark,
  IconSearch,
  IconPalette,
  IconShieldLock,
  IconMoon,
  IconBell,
  IconDeviceMobile,
  IconDownload,
  IconKeyboard,
  IconArchive,
  IconLogout,
  IconChevronRight,
} from '@tabler/icons-react';
import type { UserProfile } from '../../../types';
import { useMessages } from '../../../context/contexts';

interface SidebarAccountMenuProps {
  open: boolean;
  onClose: () => void;
  /** Trigger button — focus returns there when the menu closes. */
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  compact: boolean;
  currentUserName: string | null;
  profile: UserProfile | null;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  showInstall: boolean;
  showShortcuts: boolean;
  onOpenSaved?: () => void;
  onOpenProfile: () => void;
  onOpenSearch: () => void;
  onOpenTheme: () => void;
  onOpenPrivacy: () => void;
  onOpenQr: () => void;
  onOpenInstall: () => void;
  onOpenShortcuts: () => void;
  onOpenArchive: () => void;
  onLogout: () => void;
}

const Divider = () => <div className="mx-2.5 my-1.5 h-px bg-line" role="separator" />;

const Toggle: React.FC<{ on: boolean }> = ({ on }) => (
  <span aria-hidden className={`relative h-[18px] w-[30px] shrink-0 rounded-full transition-colors duration-200 ${on ? 'bg-accent' : 'bg-ink/15'}`}>
    <span
      className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-[left] duration-200 ${on ? 'left-[14px]' : 'left-[2px]'}`}
    />
  </span>
);

/**
 * Account menu behind the sidebar hamburger. Grouped like a settings sheet:
 * identity → navigation → personalisation → device → sign out.
 * Arrow keys move between rows, Esc / outside click closes.
 */
export const SidebarAccountMenu: React.FC<SidebarAccountMenuProps> = ({
  open,
  onClose,
  anchorRef,
  compact,
  currentUserName,
  profile,
  darkMode,
  onToggleDarkMode,
  showInstall,
  showShortcuts,
  onOpenSaved,
  onOpenProfile,
  onOpenSearch,
  onOpenTheme,
  onOpenPrivacy,
  onOpenQr,
  onOpenInstall,
  onOpenShortcuts,
  onOpenArchive,
  onLogout,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const { notificationsEnabled, setNotificationsEnabled } = useMessages();

  useEffect(() => {
    if (!open) return;
    const items = () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? []);
    const raf = requestAnimationFrame(() => items()[0]?.focus({ preventScroll: true }));
    const anchor = anchorRef.current;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
      const list = items();
      if (list.length === 0) return;
      e.preventDefault();
      const i = list.indexOf(document.activeElement as HTMLElement);
      const next =
        e.key === 'Home' ? 0
          : e.key === 'End' ? list.length - 1
            : e.key === 'ArrowDown' ? (i + 1) % list.length
              : (i - 1 + list.length) % list.length;
      list[next].focus();
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey, true);
      anchor?.focus({ preventScroll: true });
    };
  }, [open, onClose, anchorRef]);

  const run = (action: () => void) => () => {
    onClose();
    action();
  };

  const displayName =
    [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim() || currentUserName || 'Профиль';
  const handle = profile?.username ? `@${profile.username}` : currentUserName ? `@${currentUserName}` : '';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="account-menu-scrim"
            className="fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            key="account-menu"
            ref={menuRef}
            role="menu"
            aria-label="Меню аккаунта"
            className={`ui-sheet absolute top-[52px] ${compact ? 'left-2' : 'left-3'} z-50 w-[272px] origin-top-left overflow-hidden rounded-2xl p-1.5 select-none`}
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 520, damping: 36, mass: 0.7 }}
          >
            {/* Identity */}
            <button
              type="button"
              role="menuitem"
              onClick={run(onOpenProfile)}
              className="group flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-ink/[0.05] focus-visible:bg-ink/[0.05] focus-visible:outline-none cursor-pointer"
            >
              <span className="relative shrink-0">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
                ) : (
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-[17px] font-semibold text-white">
                    {initial}
                  </span>
                )}
                {profile?.statusEmoji && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-surface text-[11px] ring-2 ring-surface">
                    {profile.statusEmoji}
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14.5px] font-semibold leading-tight text-ink">{displayName}</span>
                <span className="mt-0.5 block truncate text-[12.5px] text-muted">{handle || 'Открыть профиль'}</span>
              </span>
              <IconChevronRight
                size={16}
                stroke={2}
                className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
              />
            </button>

            <Divider />

            {onOpenSaved && (
              <button type="button" role="menuitem" className="ui-menu-item" onClick={run(onOpenSaved)}>
                <IconBookmark size={19} stroke={1.75} />
                <span className="flex-1">Избранное</span>
              </button>
            )}
            <button type="button" role="menuitem" className="ui-menu-item" onClick={run(onOpenSearch)}>
              <IconSearch size={19} stroke={1.75} />
              <span className="flex-1">Поиск по сообщениям</span>
            </button>

            <Divider />

            <button type="button" role="menuitem" className="ui-menu-item" onClick={run(onOpenTheme)}>
              <IconPalette size={19} stroke={1.75} />
              <span className="flex-1">Оформление</span>
            </button>
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={darkMode}
              className="ui-menu-item"
              onClick={onToggleDarkMode}
            >
              <IconMoon size={19} stroke={1.75} />
              <span className="flex-1">Ночной режим</span>
              <Toggle on={darkMode} />
            </button>
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={notificationsEnabled}
              className="ui-menu-item"
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            >
              <IconBell size={19} stroke={1.75} />
              <span className="flex-1">Уведомления</span>
              <Toggle on={notificationsEnabled} />
            </button>
            <button type="button" role="menuitem" className="ui-menu-item" onClick={run(onOpenPrivacy)}>
              <IconShieldLock size={19} stroke={1.75} />
              <span className="flex-1">Конфиденциальность</span>
            </button>

            <Divider />

            <button type="button" role="menuitem" className="ui-menu-item" onClick={run(onOpenQr)}>
              <IconDeviceMobile size={19} stroke={1.75} />
              <span className="flex-1">Открыть на телефоне</span>
            </button>
            {showInstall && (
              <button type="button" role="menuitem" className="ui-menu-item" onClick={run(onOpenInstall)}>
                <IconDownload size={19} stroke={1.75} />
                <span className="flex-1">Установить приложение</span>
              </button>
            )}
            {showShortcuts && (
              <button type="button" role="menuitem" className="ui-menu-item" onClick={run(onOpenShortcuts)}>
                <IconKeyboard size={19} stroke={1.75} />
                <span className="flex-1">Горячие клавиши</span>
                <kbd className="ui-kbd">Ctrl /</kbd>
              </button>
            )}
            <button type="button" role="menuitem" className="ui-menu-item" onClick={run(onOpenArchive)}>
              <IconArchive size={19} stroke={1.75} />
              <span className="flex-1">Архив сообщений</span>
            </button>

            <Divider />

            <button type="button" role="menuitem" className="ui-menu-item" data-danger="true" onClick={run(onLogout)}>
              <IconLogout size={19} stroke={1.75} />
              <span className="flex-1">Выйти</span>
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SidebarAccountMenu;
