import React, { useState } from 'react';
import type { Room } from '../../../types';
import type { FilterOptions } from '../../../lib/filter-utils';
import {
  IconChevronLeft,
  IconSearch,
  IconPhone,
  IconVideo,
  IconDotsVertical,
  IconX,
  IconPin,
  IconCopy,
  IconShare3,
  IconTrash,
  IconChevronUp,
  IconChevronDown,
  IconWorld,
  IconUsers,
  IconBell,
  IconBellOff,
  IconPalette,
  IconUser
} from '@tabler/icons-react';

export interface ChatHeaderProps {
  activeRoom: Room | null;
  activeRoomDisplayName: string;
  isPeerOnline: boolean;
  activeRoomTypingUsers: string[];
  getRoomAvatar: (room: Room) => string | undefined;
  getRoomColor: (room: Room) => string;
  onBackToRooms: () => void;
  // Selection Mode Props
  isSelectMode: boolean;
  selectedMessageIds: Set<string>;
  onCancelSelectMode: () => void;
  onPinSelected: () => void;
  onCopySelected: () => void;
  onForwardSelected: () => void;
  onDeleteSelected: () => void;
  // Search Mode Props
  isSearching: boolean;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  totalSearchMatches: number;
  currentMatchIndex: number;
  onPrevMatch: () => void;
  onNextMatch: () => void;
  onCloseSearch: () => void;
  onOpenGlobalSearch: () => void;
  chatFilters: FilterOptions;
  setChatFilters: React.Dispatch<React.SetStateAction<FilterOptions>>;
  handleDatePreset: (preset: 'today') => void;
  // Calling & Actions
  onStartAudioCall: () => void;
  onStartVideoCall: () => void;
  onStartSearching: () => void;
  // Menu Actions
  isRoomMuted: boolean;
  onToggleMute: () => void;
  onOpenThemeModal: () => void;
  onOpenUserInfo: () => void;
  onClearHistory: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  activeRoom,
  activeRoomDisplayName,
  isPeerOnline,
  activeRoomTypingUsers,
  getRoomAvatar,
  getRoomColor,
  onBackToRooms,
  // Selection
  isSelectMode,
  selectedMessageIds,
  onCancelSelectMode,
  onPinSelected,
  onCopySelected,
  onForwardSelected,
  onDeleteSelected,
  // Search
  isSearching,
  searchQuery,
  onSearchQueryChange,
  totalSearchMatches,
  currentMatchIndex,
  onPrevMatch,
  onNextMatch,
  onCloseSearch,
  onOpenGlobalSearch,
  chatFilters,
  setChatFilters,
  handleDatePreset,
  // Calls & Actions
  onStartAudioCall,
  onStartVideoCall,
  onStartSearching,
  // Menu
  isRoomMuted,
  onToggleMute,
  onOpenThemeModal,
  onOpenUserInfo,
  onClearHistory,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  if (!activeRoom) return null;

  return (
    <>
      <header className="px-3 sm:px-4 py-2 tg-header flex items-center justify-between z-10 select-none shadow-xs min-h-[56px] w-full min-w-0 max-w-full">
        {isSelectMode ? (
          <div className="w-full min-w-0 flex items-center justify-between animate-pop-in">
            {/* Left: Cancel Cross Button & Counter */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onCancelSelectMode}
                className="p-1.5 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                title="Отменить (Esc)"
              >
                <IconX size={22} />
              </button>

              <span className="text-[15px] font-bold text-slate-900 dark:text-white">
                Выбрано: {selectedMessageIds.size}
              </span>
            </div>

            {/* Right: Group Action Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onPinSelected}
                disabled={selectedMessageIds.size === 0}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer transition-colors"
                title="Закрепить"
              >
                <IconPin size={20} />
              </button>

              <button
                type="button"
                onClick={onCopySelected}
                disabled={selectedMessageIds.size === 0}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer transition-colors"
                title="Копировать"
              >
                <IconCopy size={20} />
              </button>

              <button
                type="button"
                onClick={onForwardSelected}
                disabled={selectedMessageIds.size === 0}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer transition-colors"
                title="Переслать"
              >
                <IconShare3 size={20} />
              </button>

              <button
                type="button"
                onClick={onDeleteSelected}
                disabled={selectedMessageIds.size === 0}
                className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 disabled:opacity-30 cursor-pointer transition-colors"
                title="Удалить"
              >
                <IconTrash size={20} />
              </button>
            </div>
          </div>
        ) : isSearching ? (
          /* Ultra-clean Telegram / iOS Minimalist Search Bar */
          <div className="w-full min-w-0 flex items-center gap-2">
            <div className="flex-1 min-w-0 flex items-center h-9 px-3 bg-black/5 dark:bg-white/5 rounded-full border border-slate-200/60 dark:border-white/10 focus-within:border-[#3390ec] transition-colors">
              <IconSearch size={16} className="text-slate-400 shrink-0 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="Поиск по чату..."
                autoFocus
                className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchQueryChange('')}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <IconX size={14} />
                </button>
              )}
            </div>

            {/* Navigation Arrows & Counter */}
            {totalSearchMatches > 0 ? (
              <div className="flex items-center gap-1 shrink-0 bg-black/5 dark:bg-white/5 px-2 py-1 rounded-full text-xs font-mono text-slate-600 dark:text-slate-300">
                <span>{currentMatchIndex + 1} из {totalSearchMatches}</span>
                <button
                  type="button"
                  onClick={onPrevMatch}
                  className="p-0.5 hover:text-[#3390ec] cursor-pointer"
                  title="Предыдущее совпадение"
                >
                  <IconChevronUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={onNextMatch}
                  className="p-0.5 hover:text-[#3390ec] cursor-pointer"
                  title="Следующее совпадение"
                >
                  <IconChevronDown size={14} />
                </button>
              </div>
            ) : searchQuery.trim() ? (
              <span className="text-xs text-slate-400 shrink-0 px-2 font-mono">0 найдено</span>
            ) : null}

            {/* Close Search */}
            <button
              type="button"
              onClick={onCloseSearch}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer shrink-0 transition-colors"
              title="Закрыть поиск (Esc)"
            >
              <IconX size={18} />
            </button>
          </div>
        ) : (
          /* Normal Chat Header View */
          <>
            {/* Left Info: Back on Mobile + Avatar + Title + Subtitle */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <button
                type="button"
                onClick={onBackToRooms}
                className="md:hidden p-1.5 -ml-1.5 rounded-full text-slate-500 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors shrink-0"
                title="Назад"
              >
                <IconChevronLeft size={22} />
              </button>

              <div 
                onClick={onOpenUserInfo}
                className="relative shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
              >
                {getRoomAvatar(activeRoom) ? (
                  <img 
                    src={getRoomAvatar(activeRoom)} 
                    alt={activeRoomDisplayName} 
                    className="w-10 h-10 rounded-full object-cover shadow-xs" 
                  />
                ) : (
                  <div className={`w-10 h-10 rounded-full ${getRoomColor(activeRoom)} text-white flex items-center justify-center font-bold text-base shadow-xs`}>
                    {activeRoom.type === 'direct' ? activeRoomDisplayName.charAt(0).toUpperCase() : <IconUsers size={20} />}
                  </div>
                )}
                {activeRoom.type === 'direct' && isPeerOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-[#17212b] shadow-xs" />
                )}
              </div>

              <div 
                onClick={onOpenUserInfo}
                className="min-w-0 flex-1 cursor-pointer select-none"
              >
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {activeRoomDisplayName}
                  </h2>
                  {isRoomMuted && (
                    <IconBellOff size={13} className="text-slate-400 shrink-0" title="Без звука" />
                  )}
                </div>

                <div className="text-xs truncate text-slate-400 flex items-center gap-1">
                  {activeRoomTypingUsers.length > 0 ? (
                    <span className="text-[#3390ec] font-medium flex items-center gap-1">
                      <span className="flex gap-0.5 items-center">
                        <span className="w-1 h-1 rounded-full bg-[#3390ec] animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1 h-1 rounded-full bg-[#3390ec] animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1 h-1 rounded-full bg-[#3390ec] animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                      <span>{activeRoomTypingUsers.join(', ')} печатает...</span>
                    </span>
                  ) : activeRoom.type === 'direct' ? (
                    isPeerOnline ? (
                      <span className="text-emerald-500 font-medium">в сети</span>
                    ) : (
                      <span>был(а) недавно</span>
                    )
                  ) : (
                    <span>{activeRoom.participants?.length || 0} участников</span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Buttons: Call, Video Call, Search, Dots Menu */}
            <div className="flex items-center gap-1 shrink-0">
              {activeRoom.type === 'direct' && (
                <>
                  <button
                    type="button"
                    onClick={onStartAudioCall}
                    className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:text-[#3390ec] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                    title="Аудиозвонок"
                  >
                    <IconPhone size={20} />
                  </button>

                  <button
                    type="button"
                    onClick={onStartVideoCall}
                    className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:text-[#3390ec] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                    title="Видеозвонок"
                  >
                    <IconVideo size={20} />
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={onStartSearching}
                className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:text-[#3390ec] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                title="Поиск сообщений"
              >
                <IconSearch size={20} />
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                  title="Опции"
                >
                  <IconDotsVertical size={20} />
                </button>

                {showDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                    <div className="absolute right-0 top-11 z-50 w-56 bg-white dark:bg-[#17212b] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 py-1.5 animate-pop-in select-none">
                      <button
                        type="button"
                        onClick={() => {
                          onToggleMute();
                          setShowDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2.5 cursor-pointer transition-colors"
                      >
                        {isRoomMuted ? <IconBell size={17} /> : <IconBellOff size={17} />}
                        <span>{isRoomMuted ? 'Включить звук' : 'Отключить звук'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onOpenThemeModal();
                          setShowDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2.5 cursor-pointer transition-colors"
                      >
                        <IconPalette size={17} />
                        <span>Оформление чата</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onOpenUserInfo();
                          setShowDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2.5 cursor-pointer transition-colors"
                      >
                        <IconUser size={17} />
                        <span>Информация</span>
                      </button>

                      <div className="my-1 border-t border-slate-100 dark:border-white/5" />

                      <button
                        type="button"
                        onClick={() => {
                          onClearHistory();
                          setShowDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left text-xs text-rose-500 hover:bg-rose-500/10 flex items-center gap-2.5 cursor-pointer transition-colors"
                      >
                        <IconTrash size={17} />
                        <span>Очистить историю</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </header>

      {/* Filter Chips Bar during in-chat search */}
      {isSearching && !isSelectMode && (
        <div className="px-3 sm:px-4 py-1.5 bg-white/95 dark:bg-[#17212b]/95 border-b border-slate-200 dark:border-white/10 flex items-center gap-1.5 overflow-x-auto select-none z-10 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setChatFilters({})}
            className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer ${
              !chatFilters.attachmentTypes && !chatFilters.dateRange
                ? 'bg-[#3390ec] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            Все
          </button>

          <button
            type="button"
            onClick={() => {
              const isMedia = chatFilters.attachmentTypes?.includes('image') || chatFilters.attachmentTypes?.includes('video');
              setChatFilters(prev => ({
                ...prev,
                attachmentTypes: isMedia ? undefined : ['image', 'video'],
                hasAttachments: isMedia ? undefined : true,
              }));
            }}
            className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer ${
              chatFilters.attachmentTypes?.includes('image') || chatFilters.attachmentTypes?.includes('video')
                ? 'bg-[#3390ec] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            Медиа
          </button>

          <button
            type="button"
            onClick={() => {
              const isDoc = chatFilters.attachmentTypes?.includes('document');
              setChatFilters(prev => ({
                ...prev,
                attachmentTypes: isDoc ? undefined : ['document'],
                hasAttachments: isDoc ? undefined : true,
              }));
            }}
            className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer ${
              chatFilters.attachmentTypes?.includes('document')
                ? 'bg-[#3390ec] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            Файлы
          </button>

          <button
            type="button"
            onClick={() => {
              const isAudio = chatFilters.attachmentTypes?.includes('audio');
              setChatFilters(prev => ({
                ...prev,
                attachmentTypes: isAudio ? undefined : ['audio'],
                hasAttachments: isAudio ? undefined : true,
              }));
            }}
            className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer ${
              chatFilters.attachmentTypes?.includes('audio')
                ? 'bg-[#3390ec] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            Голосовые
          </button>

          <button
            type="button"
            onClick={() => handleDatePreset('today')}
            className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer ${
              chatFilters.dateRange?.startDate
                ? 'bg-[#3390ec] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            Сегодня
          </button>

          <button
            type="button"
            onClick={onOpenGlobalSearch}
            className="ml-auto px-2.5 py-1 rounded-full text-xs text-slate-500 dark:text-slate-400 hover:text-[#3390ec] dark:hover:text-[#3390ec] shrink-0 transition-colors flex items-center gap-1 cursor-pointer font-medium"
          >
            <IconWorld size={14} />
            <span className="hidden sm:inline">Во всех чатах</span>
            <span className="sm:hidden">Везде</span>
          </button>
        </div>
      )}
    </>
  );
};

export default ChatHeader;
