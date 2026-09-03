import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Room, UserId } from '../../types';
import { usePlatform } from '../../context/PlatformContext';
import {
  IconSearch,
  IconX,
  IconMessageCircle,
  IconUsers,
  IconBookmark,
  IconSparkles,
  IconChartBar,
  IconPalette,
  IconUser,
  IconDeviceMobile,
  IconDownload,
  IconKeyboard,
  IconMoon,
  IconSun,
  IconBellOff,
  IconBell,
  IconMaximize,
  IconMinimize,
  IconWorld,
  IconChevronRight
} from '@tabler/icons-react';

export type CommandCategory = 'all' | 'chats' | 'actions' | 'settings';

export interface CommandItem {
  id: string;
  category: 'chats' | 'actions' | 'settings';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  badge?: string;
  shortcut?: string;
  onSelect: () => void;
  keywords?: string[];
  avatarUrl?: string;
  avatarColor?: string;
  isOnline?: boolean;
  unreadCount?: number;
  isGroup?: boolean;
  isSavedMessages?: boolean;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: Room[];
  activeRoomId: string;
  onSelectRoom: (roomId: string) => void;
  currentUser: UserId | null;
  getUserDisplayName: (userId: UserId) => string;
  getUserAvatar: (userId: UserId) => string | undefined;
  onlineStatus: Record<UserId, boolean>;
  unreadCount: (roomId: string) => number;
  darkMode: boolean;
  toggleDarkMode: () => void;
  onOpenThemeSettings: () => void;
  onOpenProfileModal: () => void;
  onOpenQrModal: () => void;
  onOpenPollCreate: () => void;
  onOpenStoryCreate: () => void;
  onOpenGlobalSearch: () => void;
  onOpenAdminArchive?: () => void;
  onToggleMuteActiveRoom?: () => void;
  isRoomMuted?: boolean;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  rooms,
  activeRoomId,
  onSelectRoom,
  currentUser,
  getUserDisplayName,
  getUserAvatar,
  onlineStatus,
  unreadCount,
  darkMode,
  toggleDarkMode,
  onOpenThemeSettings,
  onOpenProfileModal,
  onOpenQrModal,
  onOpenPollCreate,
  onOpenStoryCreate,
  onOpenGlobalSearch,
  onOpenAdminArchive,
  onToggleMuteActiveRoom,
  isRoomMuted = false,
}) => {
  const { triggerHaptic, setShowShortcutsModal, setShowInstallModal, promptInstall, isStandalone } = usePlatform();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CommandCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setActiveCategory('all');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build commands list
  const allCommands = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [];

    // 1. Chat Rooms
    rooms.forEach((room) => {
      const isDirect = room.type === 'direct';
      const isSaved = room.id === 'saved' || (isDirect && room.participants.length === 1 && room.participants[0] === currentUser);
      const peerId = isDirect ? room.participants.find((p) => p !== currentUser) as UserId | undefined : null;
      const title = isSaved ? 'Избранное (Saved Messages)' : isDirect && peerId ? getUserDisplayName(peerId) : room.name;
      const subtitle = isSaved
        ? 'Личное облако и заметки'
        : isDirect
        ? (peerId ? `@${peerId}` : 'Личный диалог')
        : `${room.participants.length} участников`;
      const avatarUrl = isDirect && peerId ? getUserAvatar(peerId) : undefined;
      const isOnline = isDirect && peerId ? Boolean(onlineStatus[peerId]) : false;
      const count = unreadCount(room.id);

      list.push({
        id: `room-${room.id}`,
        category: 'chats',
        title,
        subtitle,
        avatarUrl,
        isOnline,
        unreadCount: count,
        isGroup: room.type === 'group',
        isSavedMessages: isSaved,
        icon: isSaved ? (
          <IconBookmark size={18} className="text-[#3390ec]" />
        ) : room.type === 'group' ? (
          <IconUsers size={18} className="text-emerald-500" />
        ) : (
          <IconMessageCircle size={18} className="text-[#3390ec]" />
        ),
        shortcut: room.id === activeRoomId ? 'Активен' : undefined,
        keywords: [title, subtitle, room.id, isSaved ? 'saved' : '', isDirect ? 'direct dm' : 'group'],
        onSelect: () => {
          onSelectRoom(room.id);
          onClose();
        },
      });
    });

    // 2. Quick Actions
    list.push({
      id: 'action-new-poll',
      category: 'actions',
      title: 'Создать опрос или викторину',
      subtitle: 'Интерактивный опрос в текущем чате',
      icon: <IconChartBar size={18} className="text-amber-500" />,
      shortcut: 'Poll',
      keywords: ['опрос', 'викторина', 'poll', 'quiz', 'голосование', 'тест'],
      onSelect: () => {
        onClose();
        onOpenPollCreate();
      },
    });

    list.push({
      id: 'action-new-story',
      category: 'actions',
      title: 'Опубликовать историю',
      subtitle: 'Фото, видео или текст на градиенте (24ч)',
      icon: <IconSparkles size={18} className="text-[#ac8bdd]" />,
      shortcut: 'Story',
      keywords: ['история', 'story', 'stories', 'статус', 'фото', 'кружок'],
      onSelect: () => {
        onClose();
        onOpenStoryCreate();
      },
    });

    list.push({
      id: 'action-global-search',
      category: 'actions',
      title: 'Глобальный полнотекстовый поиск',
      subtitle: 'Поиск по сообщениям, файлам и опросам всех чатов',
      icon: <IconWorld size={18} className="text-[#3390ec]" />,
      shortcut: 'Ctrl+F',
      keywords: ['поиск', 'search', 'fts', 'сообщения', 'файлы', 'текст'],
      onSelect: () => {
        onClose();
        onOpenGlobalSearch();
      },
    });

    if (onToggleMuteActiveRoom) {
      list.push({
        id: 'action-toggle-mute',
        category: 'actions',
        title: isRoomMuted ? 'Включить уведомления чата' : 'Выключить уведомления чата',
        subtitle: isRoomMuted ? 'Включить звук для текущего чата' : 'Без звука для текущего диалога',
        icon: isRoomMuted ? <IconBell size={18} className="text-emerald-500" /> : <IconBellOff size={18} className="text-rose-500" />,
        shortcut: 'Mute',
        keywords: ['звук', 'mute', 'уведомления', 'тишина', 'bell', 'тихий'],
        onSelect: () => {
          onClose();
          onToggleMuteActiveRoom();
        },
      });
    }

    // 3. System & Settings Actions
    list.push({
      id: 'settings-theme',
      category: 'settings',
      title: 'Оформление, обои и размытие',
      subtitle: 'Темы чата, фон, React Bits и акцентные цвета',
      icon: <IconPalette size={18} className="text-pink-500" />,
      shortcut: 'Ctrl+,',
      keywords: ['тема', 'обои', 'фон', 'дизайн', 'цвета', 'theme', 'wallpaper', 'blur', 'react bits'],
      onSelect: () => {
        onClose();
        onOpenThemeSettings();
      },
    });

    list.push({
      id: 'settings-dark-mode',
      category: 'settings',
      title: darkMode ? 'Включить светлую тему' : 'Включить темную тему',
      subtitle: darkMode ? 'Переключить оформление на светлое' : 'Переключить оформление на темное',
      icon: darkMode ? <IconSun size={18} className="text-amber-400" /> : <IconMoon size={18} className="text-indigo-400" />,
      shortcut: 'Theme',
      keywords: ['темная', 'светлая', 'ночь', 'день', 'dark', 'light', 'mode'],
      onSelect: () => {
        toggleDarkMode();
      },
    });

    list.push({
      id: 'settings-profile',
      category: 'settings',
      title: 'Мой профиль и аватар',
      subtitle: 'Имя, username, статус-эмодзи и информация о себе',
      icon: <IconUser size={18} className="text-[#3390ec]" />,
      shortcut: 'Profile',
      keywords: ['профиль', 'аватар', 'фото', 'имя', 'username', 'био', 'статус'],
      onSelect: () => {
        onClose();
        onOpenProfileModal();
      },
    });

    list.push({
      id: 'settings-qr',
      category: 'settings',
      title: 'Открыть на телефоне по QR-коду',
      subtitle: 'Быстрый вход на мобильном устройстве',
      icon: <IconDeviceMobile size={18} className="text-teal-500" />,
      shortcut: 'QR',
      keywords: ['qr', 'телефон', 'мобильный', 'вход', 'login', 'phone'],
      onSelect: () => {
        onClose();
        onOpenQrModal();
      },
    });

    list.push({
      id: 'settings-shortcuts',
      category: 'settings',
      title: 'Шпаргалка горячих клавиш',
      subtitle: 'Все клавиатурные комбинации и хоткеи системы',
      icon: <IconKeyboard size={18} className="text-sky-500" />,
      shortcut: 'Ctrl+/',
      keywords: ['клавиши', 'хоткеи', 'shortcuts', 'keyboard', 'шпаргалка', 'быстрые клавиши'],
      onSelect: () => {
        onClose();
        setShowShortcutsModal(true);
      },
    });

    if (onOpenAdminArchive) {
      list.push({
        id: 'settings-archive',
        category: 'settings',
        title: 'Управление архивом сообщений (Admin)',
        subtitle: 'Мониторинг хранилища, политики архивации и поиск по архиву',
        icon: <IconBookmark size={18} className="text-cyan-400" />,
        shortcut: 'Archive',
        keywords: ['архив', 'archive', 'бд', 'хранилище', 'админ', 'admin', 'сообщения'],
        onSelect: () => {
          onClose();
          onOpenAdminArchive();
        },
      });
    }

    if (!isStandalone) {
      list.push({
        id: 'settings-install',
        category: 'settings',
        title: 'Установить приложение на устройство (PWA)',
        subtitle: 'Автономная работа, окно без рамок и мгновенный запуск',
        icon: <IconDownload size={18} className="text-indigo-500" />,
        shortcut: 'PWA',
        keywords: ['установить', 'pwa', 'install', 'приложение', 'скачать'],
        onSelect: () => {
          onClose();
          promptInstall().catch(() => setShowInstallModal(true));
        },
      });
    }

    list.push({
      id: 'settings-fullscreen',
      category: 'settings',
      title: document.fullscreenElement ? 'Выйти из полноэкранного режима' : 'Во весь экран',
      subtitle: 'Полноэкранный режим без отвлекающих панелей',
      icon: document.fullscreenElement ? <IconMinimize size={18} className="text-slate-400" /> : <IconMaximize size={18} className="text-slate-400" />,
      shortcut: 'F11',
      keywords: ['полноэкранный', 'fullscreen', 'экран', 'f11'],
      onSelect: () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen?.().catch(() => {});
        }
        onClose();
      },
    });

    return list;
  }, [
    rooms,
    currentUser,
    getUserDisplayName,
    getUserAvatar,
    onlineStatus,
    unreadCount,
    activeRoomId,
    darkMode,
    isRoomMuted,
    isStandalone,
    onSelectRoom,
    onClose,
    onOpenPollCreate,
    onOpenStoryCreate,
    onOpenGlobalSearch,
    onToggleMuteActiveRoom,
    onOpenThemeSettings,
    toggleDarkMode,
    onOpenProfileModal,
    onOpenQrModal,
    setShowShortcutsModal,
    promptInstall,
    setShowInstallModal,
    onOpenAdminArchive,
  ]);

  // Filter commands by active query and category
  const filteredCommands = useMemo(() => {
    let list = allCommands;

    if (activeCategory !== 'all') {
      list = list.filter((cmd) => cmd.category === activeCategory);
    }

    const q = query.trim().toLowerCase();
    if (!q) return list;

    return list.filter((cmd) => {
      const matchTitle = cmd.title.toLowerCase().includes(q);
      const matchSubtitle = cmd.subtitle?.toLowerCase().includes(q);
      const matchKeywords = cmd.keywords?.some((k) => k.toLowerCase().includes(q));
      return matchTitle || matchSubtitle || matchKeywords;
    });
  }, [allCommands, activeCategory, query]);

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands.length, query, activeCategory]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selectedEl = listRef.current.querySelector(`[data-command-index="${selectedIndex}"]`) as HTMLElement;
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      triggerHaptic('selection');
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      triggerHaptic('selection');
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredCommands[selectedIndex];
      if (selected) {
        triggerHaptic('light');
        selected.onSelect();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-3 bg-black/60 backdrop-blur-md animate-fade-in select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          triggerHaptic('light');
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-2xl bg-white/95 dark:bg-[#17212b]/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-gray-200/80 dark:border-white/10 overflow-hidden flex flex-col max-h-[82vh] transition-all transform animate-pop-in"
        onKeyDown={handleKeyDown}
      >
        {/* Header Search Box */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-gray-200/80 dark:border-white/10 bg-white/50 dark:bg-[#17212b]/50">
          <IconSearch className="w-5 h-5 text-[#3390ec] shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск чатов, контактов или действий (Ctrl+K)..."
            className="w-full bg-transparent text-sm sm:text-base font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <IconX size={16} />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-md">
              ESC
            </kbd>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-gray-100 dark:border-white/5 bg-gray-50/70 dark:bg-[#131b23]/70 overflow-x-auto scrollbar-none">
          {(
            [
              { id: 'all', label: 'Все', icon: <IconSparkles size={13} /> },
              { id: 'chats', label: 'Чаты', icon: <IconMessageCircle size={13} /> },
              { id: 'actions', label: 'Действия', icon: <IconChartBar size={13} /> },
              { id: 'settings', label: 'Настройки', icon: <IconPalette size={13} /> },
            ] as const
          ).map((tab) => {
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  triggerHaptic('selection');
                  setActiveCategory(tab.id);
                  inputRef.current?.focus();
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-[#3390ec] text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Command Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-transparent">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-gray-400 dark:text-gray-500">
              <IconSearch className="w-10 h-10 mx-auto mb-2 opacity-40 text-[#3390ec]" />
              <p className="text-sm font-medium">Ничего не найдено по запросу «{query}»</p>
              <p className="text-xs text-gray-400 mt-1">Попробуйте поискать другое имя, действие или тему</p>
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  data-command-index={idx}
                  onClick={() => {
                    triggerHaptic('light');
                    cmd.onSelect();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#3390ec] text-white shadow-sm scale-[1.005]'
                      : 'hover:bg-black/5 dark:hover:bg-white/5 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Icon or Avatar */}
                    {cmd.category === 'chats' ? (
                      <div className="relative shrink-0">
                        {cmd.isSavedMessages ? (
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3390ec] to-[#1c6ec4] flex items-center justify-center text-white shadow-xs">
                            <IconBookmark size={18} fill="currentColor" />
                          </div>
                        ) : cmd.avatarUrl ? (
                          <img
                            src={cmd.avatarUrl}
                            alt=""
                            className="w-9 h-9 rounded-full object-cover shadow-xs"
                          />
                        ) : (
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-xs ${
                              isSelected ? 'bg-white/20' : 'bg-[#3390ec]'
                            }`}
                          >
                            {cmd.isGroup ? <IconUsers size={16} /> : cmd.title.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {cmd.isOnline && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#17212b]" />
                        )}
                      </div>
                    ) : (
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs transition-colors ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {cmd.icon}
                      </div>
                    )}

                    {/* Title & Subtitle */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm truncate ${isSelected ? 'font-bold text-white' : 'font-semibold'}`}>
                          {cmd.title}
                        </span>
                        {cmd.unreadCount !== undefined && cmd.unreadCount > 0 && (
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                              isSelected
                                ? 'bg-white text-[#3390ec]'
                                : 'bg-[#3390ec] text-white'
                            }`}
                          >
                            {cmd.unreadCount}
                          </span>
                        )}
                      </div>
                      {cmd.subtitle && (
                        <p
                          className={`text-xs truncate mt-0.5 ${
                            isSelected ? 'text-white/80' : 'text-gray-400 dark:text-gray-400'
                          }`}
                        >
                          {cmd.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Shortcut / Arrow */}
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {cmd.shortcut && (
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                          isSelected
                            ? 'bg-white/20 border-white/30 text-white'
                            : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-400 dark:text-gray-400'
                        }`}
                      >
                        {cmd.shortcut}
                      </span>
                    )}
                    <IconChevronRight
                      size={16}
                      className={`transition-transform ${isSelected ? 'text-white translate-x-0.5' : 'text-gray-300 dark:text-gray-600'}`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hints */}
        <div className="px-4 py-2.5 bg-gray-50 dark:bg-[#131b23] border-t border-gray-200/60 dark:border-white/5 flex items-center justify-between text-[11px] text-gray-400 select-none">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded">↓</kbd>
              <span>навигация</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded">Enter</kbd>
              <span>выбрать</span>
            </span>
          </div>
          <div className="flex items-center gap-1 text-[#3390ec] font-medium">
            <span>Secure Comms Spotlight</span>
          </div>
        </div>
      </div>
    </div>
  );
};
