import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { IconMessageCircle, IconMessageCircleFilled, IconUserCircle } from '@tabler/icons-react';
import { usePlatform } from '../../context/platform-context';

export type MobileTab = 'contacts' | 'chats' | 'settings';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onSelectTab: (tab: MobileTab) => void;
  unreadCount?: number;
  /** Shown on the "Настройки" tab instead of an icon, like Telegram. */
  avatarUrl?: string;
  displayName?: string;
  /** Desktop: sits at the bottom of the sidebar instead of floating over the screen (Telegram macOS). */
  docked?: boolean;
  /** Floating bar only: slides away while a chat is pushed over the list. */
  hidden?: boolean;
}

/** Height of the floating tab bar without the safe-area inset (px). */
export const MOBILE_NAV_HEIGHT = 64;

/**
 * Telegram-style floating tab bar for phones: a frosted capsule with a sliding
 * highlight, unread badge on "Чаты" and the user's avatar on "Настройки".
 */
export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  unreadCount = 0,
  avatarUrl,
  displayName = '',
  docked = false,
  hidden = false,
}) => {
  const { triggerHaptic } = usePlatform();

  if (typeof document === 'undefined') return null;

  const initial = displayName.trim().charAt(0).toUpperCase() || '?';
  const badge = unreadCount > 99 ? '99+' : String(unreadCount);

  const tabs: { id: MobileTab; label: string; icon: (active: boolean) => React.ReactNode }[] = [
    {
      id: 'contacts',
      label: 'Контакты',
      icon: (active) => <IconUserCircle size={26} stroke={active ? 2.2 : 1.8} />,
    },
    {
      id: 'chats',
      label: 'Чаты',
      icon: (active) => (
        <span className="relative flex">
          {active ? <IconMessageCircleFilled size={26} /> : <IconMessageCircle size={26} stroke={1.8} />}
          {unreadCount > 0 && (
            <span className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[11px] font-semibold leading-none text-white ring-2 ring-[var(--surface)]">
              {badge}
            </span>
          )}
        </span>
      ),
    },
    {
      id: 'settings',
      label: 'Настройки',
      icon: (active) => (
        <span
          className={`flex h-[26px] w-[26px] items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-accent to-accent-strong text-[12px] font-semibold text-white transition-shadow ${
            active ? 'ring-2 ring-accent ring-offset-2 ring-offset-[var(--surface)]' : ''
          }`}
        >
          {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" draggable={false} /> : initial}
        </span>
      ),
    },
  ];

  const bar = (
      <div className="tg-tabbar flex items-stretch rounded-full p-1" style={{ height: docked ? 56 : MOBILE_NAV_HEIGHT }}>
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                onSelectTab(tab.id);
              }}
              aria-current={active ? 'page' : undefined}
              aria-label={tab.id === 'chats' && unreadCount > 0 ? `Чаты, непрочитанных: ${badge}` : tab.label}
              className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full transition-colors active:scale-95 cursor-pointer [-webkit-tap-highlight-color:transparent] ${
                active ? 'text-accent' : 'text-muted'
              }`}
            >
              {active && (
                <motion.span
                  layoutId={docked ? 'docked-tab-highlight' : 'mobile-tab-highlight'}
                  className="absolute inset-0 -z-0 rounded-full bg-accent-muted"
                  transition={{ type: 'spring', stiffness: 520, damping: 40 }}
                />
              )}
              <span className="relative flex h-7 items-center justify-center">{tab.icon(active)}</span>
              <span className={`relative max-w-full truncate px-1 text-[11px] leading-tight ${active ? 'font-semibold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
  );

  if (docked) {
    return (
      <nav aria-label="Разделы" className="hidden shrink-0 select-none px-3 pb-3 pt-2 md:block">
        {bar}
      </nav>
    );
  }

  return createPortal(
    <nav
      aria-label="Мобильная навигация"
      inert={hidden}
      aria-hidden={hidden || undefined}
      className={`md:hidden fixed inset-x-3 z-50 select-none transition-[transform,opacity] duration-300 ease-[var(--ease-out)] ${
        hidden ? 'pointer-events-none translate-y-[160%] opacity-0' : ''
      }`}
      style={{ bottom: 'max(0.625rem, env(safe-area-inset-bottom, 0px))' }}
    >
      {bar}
    </nav>,
    document.body,
  );
};
