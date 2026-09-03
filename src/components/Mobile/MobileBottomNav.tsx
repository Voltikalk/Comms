import React from 'react';
import { usePlatform } from '../../context/PlatformContext';
import {
  IconMessageCircle2,
  IconSparkles,
  IconSearch,
  IconUsers,
  IconSettings
} from '@tabler/icons-react';

export type MobileTab = 'chats' | 'stories' | 'search' | 'rooms' | 'settings';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onSelectTab: (tab: MobileTab) => void;
  unreadCount?: number;
  hasUnreadStories?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  unreadCount = 0,
  hasUnreadStories = false,
}) => {
  const { triggerHaptic } = usePlatform();

  const handleTabClick = (tab: MobileTab) => {
    triggerHaptic('selection');
    onSelectTab(tab);
  };

  const navItems: { id: MobileTab; label: string; icon: React.ReactNode; badge?: React.ReactNode }[] = [
    {
      id: 'chats',
      label: 'Чаты',
      icon: <IconMessageCircle2 className="w-5 h-5" />,
      badge: unreadCount > 0 ? (
        <span className="absolute -top-1.5 -right-2 px-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[#3390ec] text-white text-[10px] font-bold border-2 border-white dark:border-[#17212b] shadow-xs animate-pop-in">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      ) : null,
    },
    {
      id: 'stories',
      label: 'Истории',
      icon: <IconSparkles className="w-5 h-5" />,
      badge: hasUnreadStories ? (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-[#3390ec] via-[#ac8bdd] to-[#e6604c] border-2 border-white dark:border-[#17212b] animate-pulse" />
      ) : null,
    },
    {
      id: 'search',
      label: 'Поиск',
      icon: <IconSearch className="w-5 h-5" />,
    },
    {
      id: 'rooms',
      label: 'Группы',
      icon: <IconUsers className="w-5 h-5" />,
    },
    {
      id: 'settings',
      label: 'Настройки',
      icon: <IconSettings className="w-5 h-5" />,
    },
  ];

  return (
    <nav
      role="navigation"
      aria-label="Мобильная навигация"
      className="md:hidden shrink-0 w-full bg-white/95 dark:bg-[#17212b]/95 backdrop-blur-2xl border-t border-gray-200/80 dark:border-white/10 px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around z-40 select-none transition-colors shadow-lg"
    >
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => handleTabClick(item.id)}
            className={`relative flex flex-col items-center justify-center flex-1 min-w-0 py-1 px-1 rounded-xl transition-all cursor-pointer ${
              isActive
                ? 'text-[#3390ec] dark:text-[#5ac8fa] font-bold scale-[1.04]'
                : 'text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {/* Active glow capsule behind icon */}
            {isActive && (
              <span className="absolute inset-x-1 inset-y-0.5 bg-[#3390ec]/10 dark:bg-[#3390ec]/20 rounded-xl -z-10 animate-fade-in" />
            )}
            <div className="relative flex items-center justify-center">
              {item.icon}
              {item.badge}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight font-medium truncate max-w-full">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

