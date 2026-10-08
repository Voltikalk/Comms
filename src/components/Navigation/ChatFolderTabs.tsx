import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { usePlatform } from '../../context/platform-context';

export type ChatFolderId = 'all' | 'direct' | 'groups' | 'channels' | 'unread' | 'saved';

export interface FolderCountInfo {
  total: number;
  unread: number;
}

interface ChatFolderTabsProps {
  activeFolder: ChatFolderId;
  onSelectFolder: (folder: ChatFolderId) => void;
  folderCounts: Record<ChatFolderId, FolderCountInfo>;
}

const FOLDER_TABS: { id: ChatFolderId; label: string; shortcut: string }[] = [
  { id: 'all', label: 'Все чаты', shortcut: 'Alt+1' },
  { id: 'direct', label: 'Личные', shortcut: 'Alt+2' },
  { id: 'groups', label: 'Группы', shortcut: 'Alt+3' },
  { id: 'channels', label: 'Каналы', shortcut: 'Alt+4' },
  { id: 'unread', label: 'Непрочитанные', shortcut: 'Alt+5' },
  { id: 'saved', label: 'Избранное', shortcut: 'Alt+6' },
];

/** Telegram folder strip: text tabs with unread counters and a sliding underline. */
export const ChatFolderTabs: React.FC<ChatFolderTabsProps> = ({ activeFolder, onSelectFolder, folderCounts }) => {
  const { triggerHaptic } = usePlatform();
  const trackRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const [fade, setFade] = useState({ left: false, right: false });

  const updateFade = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setFade({ left: el.scrollLeft > 4, right: el.scrollLeft < max - 4 });
  }, []);

  useEffect(() => {
    updateFade();
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateFade);
    ro.observe(el);
    el.addEventListener('scroll', updateFade, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', updateFade);
    };
  }, [updateFade]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
  }, [activeFolder]);

  // Vertical wheel scrolls the strip horizontally (desktop mice).
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    if (el && Math.abs(e.deltaY) > Math.abs(e.deltaX)) el.scrollLeft += e.deltaY;
  };

  const mask =
    fade.left || fade.right
      ? `linear-gradient(to right, ${fade.left ? 'transparent, #000 28px' : '#000'}, ${fade.right ? '#000 calc(100% - 28px), transparent' : '#000'})`
      : undefined;

  return (
    <div className="relative shrink-0 select-none border-b border-line">
      <div
        ref={trackRef}
        role="tablist"
        aria-label="Папки чатов"
        onWheel={onWheel}
        style={{ maskImage: mask, WebkitMaskImage: mask }}
        className="flex overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {FOLDER_TABS.map((tab) => {
          const active = activeFolder === tab.id;
          const unread = folderCounts[tab.id]?.unread ?? 0;
          return (
            <button
              key={tab.id}
              ref={active ? activeRef : null}
              type="button"
              role="tab"
              aria-selected={active}
              title={`${tab.label} (${tab.shortcut})`}
              onClick={() => {
                if (active) return;
                triggerHaptic('selection');
                onSelectFolder(tab.id);
              }}
              className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 pb-2.5 pt-2 text-[14.5px] font-medium transition-colors cursor-pointer ${
                active ? 'text-accent' : 'text-muted hover:text-ink'
              }`}
            >
              {tab.label}
              {unread > 0 && (
                <span
                  className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11.5px] font-semibold tabular-nums text-white ${
                    active ? 'bg-accent' : 'bg-muted/70'
                  }`}
                >
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
              {active && (
                <motion.span
                  layoutId="chat-folder-underline"
                  transition={{ type: 'spring', stiffness: 520, damping: 40 }}
                  className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-accent"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ChatFolderTabs;
