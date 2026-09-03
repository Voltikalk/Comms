import React from 'react';
import type { Room, UserProfile } from '../../../types';
import type { ChatFolderId, FolderCountInfo } from '../../Navigation/ChatFolderTabs';
import type { MobileTab } from '../../Mobile/MobileBottomNav';
import { StoriesBar } from '../../Stories/StoriesBar';
import { ChatFolderTabs } from '../../Navigation/ChatFolderTabs';
import { MobileBottomNav } from '../../Mobile/MobileBottomNav';
import {
  IconMenu2,
  IconSearch,
  IconUser,
  IconDeviceMobile,
  IconPalette,
  IconDownload,
  IconKeyboard,
  IconTrash,
  IconLogout,
  IconBookmark,
  IconEdit,
  IconChecks,
  IconUsers,
  IconPhoto,
  IconMicrophone,
  IconFileText,
  IconVideo,
  IconChartBar
} from '@tabler/icons-react';

export interface ChatSidebarProps {
  isDesktopView: boolean;
  mobileView: 'list' | 'chat';
  mobileTab: MobileTab;
  onSelectMobileTab: (tab: MobileTab) => void;
  activeFolder: ChatFolderId;
  onSelectFolder: (folder: ChatFolderId) => void;
  folderCounts: Record<ChatFolderId, FolderCountInfo>;
  sidebarWidth: number;
  isResizingSidebar: boolean;
  isCompactSidebar: boolean;
  showMenuDropdown: boolean;
  setShowMenuDropdown: (show: boolean) => void;
  currentUserName: string | null;
  currentUserProfile: UserProfile | null;
  rooms: Room[];
  activeRoomId: string;
  onSelectRoom: (roomId: string) => void;
  getRoomDisplayName: (room: Room) => string;
  getRoomAvatar: (room: Room) => string | undefined;
  getRoomColor: (room: Room) => string;
  isRoomOnline: (room: Room) => boolean;
  unreadCount: (roomId: string) => number;
  getLastMessagePreview: (roomId: string) => {
    text: string;
    time: string;
    sender: string;
    isMine: boolean;
    isPhoto: boolean;
    isVideo: boolean;
    isVoice: boolean;
    isFile: boolean;
    isSticker: boolean;
    isPoll: boolean;
  } | null;
  roomTypingUsers: (roomId: string) => string[];
  roomFilterQuery: string;
  setRoomFilterQuery: (q: string) => void;
  onOpenProfileModal: () => void;
  onOpenGlobalSearch: () => void;
  onOpenThemeModal: () => void;
  onOpenQrModal: () => void;
  onOpenInstallModal: () => void;
  onOpenShortcutsModal: () => void;
  onOpenArchiveModal: () => void;
  onOpenNewChatModal?: () => void;
  onClearHistory: () => void;
  onLogout: () => void;
  onOpenStoryCreate: () => void;
  onOpenStoryViewer: (userId: string | null) => void;
  startResizingSidebar: (e: React.MouseEvent | React.TouchEvent) => void;
  totalUnreadCount: number;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isDesktopView,
  mobileView,
  mobileTab,
  onSelectMobileTab,
  activeFolder,
  onSelectFolder,
  folderCounts,
  sidebarWidth,
  isResizingSidebar,
  isCompactSidebar,
  showMenuDropdown,
  setShowMenuDropdown,
  currentUserName,
  currentUserProfile,
  rooms,
  activeRoomId,
  onSelectRoom,
  getRoomDisplayName,
  getRoomAvatar,
  getRoomColor,
  isRoomOnline,
  unreadCount,
  getLastMessagePreview,
  roomTypingUsers,
  roomFilterQuery,
  setRoomFilterQuery,
  onOpenProfileModal,
  onOpenGlobalSearch,
  onOpenThemeModal,
  onOpenQrModal,
  onOpenInstallModal,
  onOpenShortcutsModal,
  onOpenArchiveModal,
  onOpenNewChatModal,
  onClearHistory,
  onLogout,
  onOpenStoryCreate,
  onOpenStoryViewer,
  startResizingSidebar,
  totalUnreadCount,
}) => {
  return (
    <>
      <aside
        style={{
          '--sidebar-width': `${sidebarWidth}px`,
        } as React.CSSProperties}
        className={`w-full md:w-[var(--sidebar-width)] tg-sidebar flex flex-col shrink-0 ${
          showMenuDropdown ? 'z-50' : 'z-20'
        } ${
          isResizingSidebar ? 'select-none transition-none' : 'transition-transform duration-150'
        } ${
          mobileView === 'list' || isDesktopView
            ? 'translate-x-0 flex'
            : '-translate-x-full md:translate-x-0 absolute md:relative z-20 h-full left-0 top-0 hidden md:flex'
        }`}
      >
        {/* Top Bar: Hamburger + Search Input */}
        <div className={`p-2.5 flex items-center gap-2 relative ${isCompactSidebar ? 'justify-center p-2' : ''}`}>
          <button
            type="button"
            onClick={() => setShowMenuDropdown(!showMenuDropdown)}
            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors shrink-0"
            title="Меню"
          >
            <IconMenu2 size={20} />
          </button>

          {/* Menu Dropdown */}
          {showMenuDropdown && (
            <>
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setShowMenuDropdown(false)}
              />
              <div className={`absolute top-12 ${isCompactSidebar ? 'left-2' : 'left-3'} z-50 w-64 tg-header rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 py-2 animate-pop-in select-none`}>
                {/* User Profile Card Header */}
                <div 
                  onClick={() => {
                    onOpenProfileModal();
                    setShowMenuDropdown(false);
                  }}
                  className="px-3.5 py-2.5 mx-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors flex items-center gap-3 border-b border-slate-100 dark:border-white/5 pb-3"
                >
                  <div className="relative shrink-0">
                    {currentUserProfile?.avatarUrl ? (
                      <img 
                        src={currentUserProfile.avatarUrl} 
                        alt="Avatar" 
                        className="w-10 h-10 rounded-full object-cover shadow-xs ring-2 ring-[#3390ec]/20" 
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#3390ec] text-white flex items-center justify-center text-sm font-bold shadow-xs">
                        {currentUserName?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {currentUserProfile?.statusEmoji && (
                      <span className="absolute -bottom-1 -right-1 text-xs">
                        {currentUserProfile.statusEmoji}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                        {currentUserName}
                      </span>
                      <IconEdit size={14} className="text-[#3390ec] shrink-0" />
                    </div>
                    <span className="text-[10.5px] text-slate-400 truncate block">
                      {currentUserProfile?.username ? `@${currentUserProfile.username}` : (currentUserProfile?.bio || 'Нажмите для настройки')}
                    </span>
                  </div>
                </div>

                {/* Menu Actions */}
                <div className="pt-1.5 space-y-0.5 px-1">
                  {/* Search Action */}
                  <button
                    type="button"
                    onClick={() => {
                      onOpenGlobalSearch();
                      setShowMenuDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconSearch size={18} className="text-[#3390ec]" />
                      <span>Поиск по сообщениям</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded-md">FTS</span>
                  </button>

                  {onOpenNewChatModal && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenNewChatModal();
                        setShowMenuDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <IconEdit size={18} className="text-[#3390ec]" />
                        <span>Новое сообщение</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded-md">New</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onOpenProfileModal();
                      setShowMenuDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconUser size={18} className="text-[#3390ec]" />
                      <span>Мой профиль</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenQrModal();
                      setShowMenuDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconDeviceMobile size={18} className="text-[#3390ec]" />
                      <span>Открыть на телефоне</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenThemeModal();
                      setShowMenuDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconPalette size={18} className="text-[#3390ec]" />
                      <span>Оформление и обои</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenArchiveModal();
                      setShowMenuDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconBookmark size={18} className="text-[#3390ec]" />
                      <span>Архив сообщений (Admin)</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded-md">DB</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenInstallModal();
                      setShowMenuDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconDownload size={18} className="text-[#3390ec]" />
                      <span>Установить приложение</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenShortcutsModal();
                      setShowMenuDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconKeyboard size={18} className="text-[#3390ec]" />
                      <span>Горячие клавиши</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded-md">?</span>
                  </button>

                  <div className="my-1 border-t border-slate-100 dark:border-white/5" />

                  <button
                    type="button"
                    onClick={() => {
                      onClearHistory();
                      setShowMenuDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-rose-500 hover:bg-rose-500/10 rounded-xl flex items-center gap-2.5 cursor-pointer transition-colors"
                  >
                    <IconTrash size={18} />
                    <span>Очистить историю</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onLogout();
                      setShowMenuDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-xl flex items-center gap-2.5 cursor-pointer transition-colors"
                  >
                    <IconLogout size={18} />
                    <span>Выйти</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Search Input for filtering rooms */}
          {!isCompactSidebar && (
            <div className="flex-1 relative">
              <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={roomFilterQuery}
                onChange={(e) => setRoomFilterQuery(e.target.value)}
                placeholder="Поиск..."
                className="w-full pl-9 pr-3 py-1.5 bg-black/5 dark:bg-white/5 text-slate-900 dark:text-white rounded-full text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#3390ec]"
              />
            </div>
          )}
        </div>

        {/* Stories Bar (Hidden in compact 72px mode) */}
        {!isCompactSidebar && (
          <StoriesBar
            onOpenCreate={onOpenStoryCreate}
            onOpenViewer={onOpenStoryViewer}
          />
        )}

        {/* Chat Folder Tabs (All, Direct, Groups, Unread, Saved) */}
        {!isCompactSidebar && (
          <ChatFolderTabs
            activeFolder={activeFolder}
            onSelectFolder={onSelectFolder}
            folderCounts={folderCounts}
          />
        )}

        {/* Chat List Stream */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-0.5 p-1.5 tg-scrollbar">
          {rooms.map((room) => {
            const isActive = room.id === activeRoomId;
            const count = unreadCount(room.id);
            const isOnline = isRoomOnline(room);
            const displayName = getRoomDisplayName(room);
            const customAvatar = getRoomAvatar(room);
            const preview = getLastMessagePreview(room.id);
            const typers = roomTypingUsers(room.id);

            return (
              <button
                key={room.id}
                type="button"
                onClick={() => onSelectRoom(room.id)}
                title={isCompactSidebar ? displayName : undefined}
                className={`w-full p-2.5 rounded-2xl flex items-center gap-3 transition-all cursor-pointer select-none text-left relative ${
                  isActive
                    ? 'tg-room-active'
                    : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
                } ${isCompactSidebar ? 'justify-center p-2' : ''}`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  {customAvatar ? (
                    <img 
                      src={customAvatar} 
                      alt={displayName} 
                      className="w-12 h-12 rounded-full object-cover shadow-xs" 
                    />
                  ) : (
                    <div className={`w-12 h-12 rounded-full ${getRoomColor(room)} text-white flex items-center justify-center font-bold text-lg shadow-xs`}>
                      {room.type === 'direct' ? displayName.charAt(0).toUpperCase() : <IconUsers size={22} />}
                    </div>
                  )}

                  {/* Online Badge */}
                  {room.type === 'direct' && isOnline && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-[#17212b] shadow-xs" />
                  )}

                  {/* Badge on avatar in compact mode */}
                  {isCompactSidebar && count > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-[#3390ec] text-white shadow-xs">
                      {count}
                    </span>
                  )}
                </div>

                {/* Info Text (Hidden in compact 72px mode) */}
                {!isCompactSidebar && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-semibold truncate block ${isActive ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                        {displayName}
                      </span>
                      {preview && (
                        <span className={`text-[11px] font-mono shrink-0 ml-1.5 ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                          {preview.time}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-1">
                      {typers.length > 0 ? (
                        <span className={`text-xs truncate italic flex items-center gap-1 font-medium ${isActive ? 'text-white' : 'text-[#3390ec]'}`}>
                          <span className="flex gap-0.5 items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
                          </span>
                          <span>{typers.join(', ')} печатает...</span>
                        </span>
                      ) : (
                        <div className={`text-xs truncate flex items-center gap-1 ${isActive ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'}`}>
                          {(() => {
                            if (!preview) {
                              return <span className="text-slate-400/80 italic">Нет сообщений</span>;
                            }

                            return (
                              <div className="flex items-center gap-1 min-w-0 truncate">
                                {preview.isMine && (
                                  <span className="text-current shrink-0 inline-flex items-center">
                                    <IconChecks size={14} className={isActive ? 'text-white' : 'text-[#3390ec]'} />
                                  </span>
                                )}
                                {preview.isPhoto && <IconPhoto size={13} className="shrink-0" />}
                                {preview.isVideo && <IconVideo size={13} className="shrink-0" />}
                                {preview.isVoice && <IconMicrophone size={13} className="shrink-0" />}
                                {preview.isFile && <IconFileText size={13} className="shrink-0" />}
                                {preview.isPoll && <IconChartBar size={13} className="shrink-0" />}
                                <span className="truncate">{preview.text}</span>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {count > 0 && (
                        <span className={`shrink-0 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold ${
                          isActive ? 'bg-white text-[#3390ec]' : 'bg-[#3390ec] text-white'
                        }`}>
                          {count}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </button>
            );
          })}

          {rooms.length <= 1 && rooms[0]?.id === 'saved-messages' && (
            <div className="py-8 px-4 text-center my-auto flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-[#3390ec]/10 text-[#3390ec] flex items-center justify-center mb-3">
                <IconEdit size={24} />
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-white mb-1">
                У вас пока нет чатов
              </p>
              <p className="text-[11px] text-slate-400 mb-3 max-w-[180px]">
                Нажмите кнопку ниже, чтобы найти контакт или создать группу
              </p>
              {onOpenNewChatModal && (
                <button
                  type="button"
                  onClick={onOpenNewChatModal}
                  className="px-3 py-1.5 bg-[#3390ec] hover:bg-[#2880d9] text-white rounded-xl text-xs font-semibold shadow-md shadow-[#3390ec]/20 transition-all cursor-pointer"
                >
                  Найти собеседника ✏️
                </button>
              )}
            </div>
          )}
        </div>

        {/* Floating Action Button (FAB) for New Chat (Telegram Style) */}
        {!isCompactSidebar && onOpenNewChatModal && (
          <div className="absolute right-4 bottom-16 md:bottom-5 z-20">
            <button
              type="button"
              onClick={onOpenNewChatModal}
              className="w-12 h-12 rounded-full bg-[#3390ec] hover:bg-[#2880d9] active:scale-95 text-white shadow-xl shadow-[#3390ec]/35 flex items-center justify-center transition-all duration-200 cursor-pointer"
              title="Новое сообщение"
            >
              <IconEdit size={22} className="stroke-[2.2]" />
            </button>
          </div>
        )}

        {/* Mobile Bottom Navigation Bar */}
        {!isDesktopView && mobileView === 'list' && (
          <MobileBottomNav
            activeTab={mobileTab}
            onSelectTab={onSelectMobileTab}
            unreadCount={totalUnreadCount}
          />
        )}
      </aside>

      {/* Draggable Divider Handle between Sidebar and Chat (Telegram Desktop behavior) */}
      <div
        onMouseDown={startResizingSidebar}
        onTouchStart={startResizingSidebar}
        className={`hidden md:flex relative w-1 hover:w-2 active:w-2 group cursor-col-resize z-10 transition-all items-center justify-center shrink-0 -ml-0.5 select-none ${
          isResizingSidebar ? 'w-2' : ''
        }`}
        title="Потяните, чтобы изменить ширину списка чатов"
      >
        <div
          className={`w-[1px] h-full transition-colors pointer-events-none ${
            isResizingSidebar
              ? 'bg-[#3390ec] w-[2px]'
              : 'bg-slate-200/80 dark:bg-white/10 group-hover:bg-[#3390ec] group-hover:w-[2px]'
          }`}
        />
      </div>
    </>
  );
};

export default ChatSidebar;
