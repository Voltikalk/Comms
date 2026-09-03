import React, { useRef, useState, useEffect, useCallback } from 'react';
import { usePlatform } from '../../context/PlatformContext';
import {
  IconMessageCircle,
  IconUser,
  IconUsers,
  IconBell,
  IconBookmark,
  IconChevronLeft,
  IconChevronRight
} from '@tabler/icons-react';

export type ChatFolderId = 'all' | 'direct' | 'groups' | 'unread' | 'saved';

export interface FolderCountInfo {
  total: number;
  unread: number;
}

interface ChatFolderTabsProps {
  activeFolder: ChatFolderId;
  onSelectFolder: (folder: ChatFolderId) => void;
  folderCounts: Record<ChatFolderId, FolderCountInfo>;
}

const FOLDER_TABS: { id: ChatFolderId; label: string; icon: React.ReactNode; shortcut: string }[] = [
  {
    id: 'all',
    label: 'Все',
    icon: <IconMessageCircle size={14} />,
    shortcut: 'Alt+1',
  },
  {
    id: 'direct',
    label: 'Личные',
    icon: <IconUser size={14} />,
    shortcut: 'Alt+2',
  },
  {
    id: 'groups',
    label: 'Группы',
    icon: <IconUsers size={14} />,
    shortcut: 'Alt+3',
  },
  {
    id: 'unread',
    label: 'Непрочитанные',
    icon: <IconBell size={14} />,
    shortcut: 'Alt+4',
  },
  {
    id: 'saved',
    label: 'Избранное',
    icon: <IconBookmark size={14} />,
    shortcut: 'Alt+5',
  },
];

export const ChatFolderTabs: React.FC<ChatFolderTabsProps> = ({
  activeFolder,
  onSelectFolder,
  folderCounts,
}) => {
  const { triggerHaptic } = usePlatform();
  const containerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement | null>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasMovedRef = useRef(false);

  const tabs = FOLDER_TABS;

  const checkScrollability = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(maxScroll > 6 && el.scrollLeft < maxScroll - 6);
  }, []);

  useEffect(() => {
    checkScrollability();
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener('scroll', checkScrollability, { passive: true });
    window.addEventListener('resize', checkScrollability);

    return () => {
      el.removeEventListener('scroll', checkScrollability);
      window.removeEventListener('resize', checkScrollability);
    };
  }, [checkScrollability]);

  // Auto-scroll active tab into view
  useEffect(() => {
    if (activeTabRef.current && containerRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
    // Recheck scroll indicators after DOM updates
    setTimeout(checkScrollability, 150);
  }, [activeFolder, checkScrollability]);

  // Wheel scroll converter: vertical wheel scrolls horizontal tab bar
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (containerRef.current) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.deltaY !== 0) {
        containerRef.current.scrollLeft += e.deltaY * 0.8;
      }
    }
  };

  // Mouse Drag / Pan to scroll
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    startXRef.current = e.pageX - containerRef.current.offsetLeft;
    scrollLeftRef.current = containerRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.3;
    if (Math.abs(walk) > 4) {
      hasMovedRef.current = true;
      if (!isDragging) setIsDragging(true);
    }
    containerRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
    setTimeout(() => {
      setIsDragging(false);
      hasMovedRef.current = false;
    }, 50);
  };

  const handleSelect = (id: ChatFolderId) => {
    if (hasMovedRef.current) return; // Ignore click if user was dragging
    triggerHaptic('selection');
    onSelectFolder(id);
  };

  const scrollByAmount = (offset: number) => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative group/tabs shrink-0 w-full overflow-hidden border-b border-gray-100 dark:border-white/5 bg-white/40 dark:bg-black/10 select-none transition-colors">
      {/* Left Scroll Button / Gradient Mask */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center pr-4 pl-1 bg-gradient-to-r from-white via-white/80 dark:from-[#17212b] dark:via-[#17212b]/80 to-transparent pointer-events-auto">
          <button
            type="button"
            onClick={() => scrollByAmount(-120)}
            className="w-5 h-5 rounded-full bg-white dark:bg-[#242f3d] shadow-md border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-[#3390ec] dark:hover:text-[#5ac8fa] hover:scale-110 active:scale-95 transition-all cursor-pointer"
            title="Прокрутить влево"
          >
            <IconChevronLeft size={13} stroke={2.5} />
          </button>
        </div>
      )}

      {/* Right Scroll Button / Gradient Mask */}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center pl-4 pr-1 bg-gradient-to-l from-white via-white/80 dark:from-[#17212b] dark:via-[#17212b]/80 to-transparent pointer-events-auto">
          <button
            type="button"
            onClick={() => scrollByAmount(120)}
            className="w-5 h-5 rounded-full bg-white dark:bg-[#242f3d] shadow-md border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-[#3390ec] dark:hover:text-[#5ac8fa] hover:scale-110 active:scale-95 transition-all cursor-pointer"
            title="Прокрутить вправо"
          >
            <IconChevronRight size={13} stroke={2.5} />
          </button>
        </div>
      )}

      {/* Scrollable Tabs Track */}
      <div
        ref={containerRef}
        role="tablist"
        aria-label="Папки чатов"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        className={`px-2 pt-1.5 pb-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none touch-pan-x transition-colors ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {tabs.map((tab) => {
          const isActive = activeFolder === tab.id;
          const countInfo = folderCounts[tab.id] || { total: 0, unread: 0 };
          const hasUnread = countInfo.unread > 0;

          return (
            <button
              key={tab.id}
              ref={isActive ? activeTabRef : null}
              role="tab"
              aria-selected={isActive}
              title={`${tab.label} (${tab.shortcut})`}
              onClick={() => handleSelect(tab.id)}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-[#3390ec] text-white shadow-xs font-bold scale-[1.02]'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <span className={isActive ? 'text-white' : 'text-gray-400 dark:text-gray-500'}>
                {tab.icon}
              </span>
              <span className="whitespace-nowrap">{tab.label}</span>

              {/* Badge */}
              {hasUnread ? (
                <span
                  className={`px-1.5 py-0.2 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[10px] font-bold ${
                    isActive
                      ? 'bg-white text-[#3390ec]'
                      : 'bg-[#3390ec] text-white animate-pulse'
                  }`}
                >
                  {countInfo.unread > 99 ? '99+' : countInfo.unread}
                </span>
              ) : countInfo.total > 0 && tab.id !== 'all' ? (
                <span
                  className={`text-[10px] font-medium px-1 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {countInfo.total}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};
