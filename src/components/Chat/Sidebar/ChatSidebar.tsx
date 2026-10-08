import React from 'react';
import type { Room, UserProfile } from '../../../types';
import type { ChatFolderId, FolderCountInfo } from '../../Navigation/ChatFolderTabs';
import type { MobileTab } from '../../Mobile/MobileBottomNav';
import { StoriesBar } from '../../Stories/StoriesBar';
import { ChatFolderTabs } from '../../Navigation/ChatFolderTabs';
import { MobileBottomNav } from '../../Mobile/MobileBottomNav';
import { MobileContactsScreen } from '../../Mobile/MobileContactsScreen';
import { MobileSettingsScreen } from '../../Mobile/MobileSettingsScreen';
import type { NewChatMode } from '../NewChatModal';
import { SecuritySettingsModal } from '../../Settings/SecuritySettingsModal';
import { SidebarAccountMenu } from './SidebarAccountMenu';
import { ChatListItem, type ChatPreview } from './ChatListItem';
import { ChatContextMenu, type ChatContextMenuItem } from './ChatContextMenu';
import { PublicRoomResults } from './PublicRoomResults';
import { usePlatform } from '../../../context/platform-context';
import { useAuth, useRooms } from '../../../context/contexts';
import {
  IconBell,
  IconBellOff,
  IconLogout,
  IconMenu2,
  IconMessageCircleCheck,
  IconPencil,
  IconPin,
  IconPinnedOff,
  IconSearch,
  IconX,
} from '@tabler/icons-react';

const isSavedRoom = (id: string) => id === 'saved-messages' || id === 'saved';

export interface ChatSidebarProps {
  isDesktopView: boolean;
  /** Phone layout: list and chat are stacked screens with push/pop navigation. */
  stackedNav: boolean;
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
  isRoomMuted: (roomId: string) => boolean;
  isRoomPinned: (roomId: string) => boolean;
  onToggleRoomMute: (roomId: string) => void;
  onToggleRoomPin: (roomId: string) => void;
  onMarkRoomRead: (roomId: string) => void;
  /** Groups & channels: «Покинуть» from the chat list. */
  onLeaveRoom?: (roomId: string) => void;
  getLastMessagePreview: (roomId: string) => ChatPreview | null;
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
  onOpenNewChatModal?: (mode?: NewChatMode) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
  onOpenStoryCreate: () => void;
  onOpenStoryViewer: (userId: string | null) => void;
  startResizingSidebar: (e: React.MouseEvent | React.TouchEvent) => void;
  totalUnreadCount: number;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isDesktopView,
  stackedNav,
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
  isRoomMuted,
  isRoomPinned,
  onToggleRoomMute,
  onToggleRoomPin,
  onMarkRoomRead,
  onLeaveRoom,
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
  darkMode,
  onToggleDarkMode,
  onLogout,
  onOpenStoryCreate,
  onOpenStoryViewer,
  startResizingSidebar,
  totalUnreadCount,
}) => {
  const [showSecurityModal, setShowSecurityModal] = React.useState(false);
  const [menu, setMenu] = React.useState<{ roomId: string; x: number; y: number } | null>(null);
  const menuButtonRef = React.useRef<HTMLButtonElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const closeMenu = React.useCallback(() => setShowMenuDropdown(false), [setShowMenuDropdown]);
  // Tab bar (floating on phones, docked at the bottom on desktop): Контакты / Чаты / Настройки are separate screens.
  // The icon-only compact sidebar has no room for them, so it always shows the chat list.
  const listRef = React.useRef<HTMLDivElement>(null);
  const showChatList = isCompactSidebar || mobileTab === 'chats';
  const tabBarName =
    [currentUserProfile?.firstName, currentUserProfile?.lastName].filter(Boolean).join(' ') || currentUserName || '';
  const handleMobileTab = (tab: MobileTab) => {
    closeMenu();
    // Like Telegram: tapping the active "Чаты" tab scrolls the list back to the top.
    if (tab === 'chats' && mobileTab === 'chats') listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    onSelectMobileTab(tab);
  };
  const closeContextMenu = React.useCallback(() => setMenu(null), []);
  const { isStandalone } = usePlatform();
  const { currentUser } = useAuth();
  const { userProfiles } = useRooms();
  const savedRoom = React.useMemo(
    () => rooms.find((r) => isSavedRoom(r.id)),
    [rooms]
  );

  const contextItems = (roomId: string): ChatContextMenuItem[] => {
    const pinned = isRoomPinned(roomId);
    const muted = isRoomMuted(roomId);
    const items: ChatContextMenuItem[] = [
      {
        label: pinned ? 'Открепить' : 'Закрепить',
        icon: pinned ? <IconPinnedOff size={19} /> : <IconPin size={19} />,
        onSelect: () => onToggleRoomPin(roomId),
      },
    ];
    if (!isSavedRoom(roomId)) {
      items.push({
        label: muted ? 'Включить уведомления' : 'Отключить уведомления',
        icon: muted ? <IconBell size={19} /> : <IconBellOff size={19} />,
        onSelect: () => onToggleRoomMute(roomId),
      });
    }
    if (unreadCount(roomId) > 0) {
      items.push({
        label: 'Пометить как прочитанное',
        icon: <IconMessageCircleCheck size={19} />,
        onSelect: () => onMarkRoomRead(roomId),
      });
    }
    const room = rooms.find((r) => r.id === roomId);
    if (onLeaveRoom && (room?.type === 'group' || room?.type === 'channel')) {
      items.push({
        label: room.type === 'channel' ? 'Покинуть канал' : 'Покинуть группу',
        icon: <IconLogout size={19} />,
        onSelect: () => onLeaveRoom(roomId),
        danger: true,
      });
    }
    return items;
  };

  const emptyText = roomFilterQuery.trim()
    ? 'Ничего не найдено'
    : activeFolder === 'unread'
      ? 'Все сообщения прочитаны'
      : activeFolder === 'groups'
        ? 'Здесь появятся ваши группы'
        : activeFolder === 'channels'
          ? 'Здесь появятся каналы, на которые вы подписаны'
          : activeFolder === 'direct'
          ? 'Здесь появятся личные чаты'
          : 'У вас пока нет чатов';

  return (
    <>
      {showSecurityModal && <SecuritySettingsModal onClose={() => setShowSecurityModal(false)} />}
      {menu && <ChatContextMenu x={menu.x} y={menu.y} items={contextItems(menu.roomId)} onClose={closeContextMenu} />}
      <aside
        style={{
          '--sidebar-width': `${sidebarWidth}px`,
        } as React.CSSProperties}
        data-nav-pane="list"
        inert={stackedNav && mobileView !== 'list'}
        className={`w-full md:w-[var(--sidebar-width)] tg-sidebar flex flex-col shrink-0 h-full ${
          showMenuDropdown ? 'z-50' : 'z-20'
        } ${
          stackedNav
            ? `tg-nav-pane absolute inset-0 ${mobileView === 'list' ? '' : 'tg-nav-under'}`
            : `relative ${isResizingSidebar ? 'select-none' : ''}`
        }`}
      >
        {showChatList ? (
          <>
          {/* Top bar: menu + search */}
          <div className={`relative flex items-center gap-2 px-2.5 pb-2 pt-2 ${isCompactSidebar ? 'justify-center' : ''}`}>
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setShowMenuDropdown(!showMenuDropdown)}
              aria-haspopup="menu"
              aria-expanded={showMenuDropdown}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors cursor-pointer ${
                showMenuDropdown ? 'bg-elevated text-ink' : 'text-muted hover:bg-elevated hover:text-ink'
              }`}
              title="Меню"
              aria-label="Меню"
            >
              <IconMenu2 size={22} />
            </button>

            <SidebarAccountMenu
              open={showMenuDropdown}
              onClose={closeMenu}
              anchorRef={menuButtonRef}
              compact={isCompactSidebar}
              currentUserName={currentUserName}
              profile={currentUserProfile}
              darkMode={darkMode}
              onToggleDarkMode={onToggleDarkMode}
              showInstall={!isStandalone}
              showShortcuts={isDesktopView}
              onOpenSaved={savedRoom ? () => onSelectRoom(savedRoom.id) : undefined}
              onOpenProfile={onOpenProfileModal}
              onOpenSearch={onOpenGlobalSearch}
              onOpenTheme={onOpenThemeModal}
              onOpenPrivacy={() => setShowSecurityModal(true)}
              onOpenQr={onOpenQrModal}
              onOpenInstall={onOpenInstallModal}
              onOpenShortcuts={onOpenShortcutsModal}
              onOpenArchive={onOpenArchiveModal}
              onLogout={onLogout}
            />

            {!isCompactSidebar && (
              <label className="group relative flex h-10 min-w-0 flex-1 items-center rounded-full bg-elevated ring-1 ring-transparent transition-[box-shadow,background-color] focus-within:bg-surface">
                <IconSearch size={18} className="pointer-events-none absolute left-3.5 text-muted transition-colors group-focus-within:text-accent" />
                <span className="sr-only">Поиск чатов</span>
                <input
                  ref={searchRef}
                  type="search"
                  value={roomFilterQuery}
                  onChange={(e) => setRoomFilterQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape' && roomFilterQuery) {
                      e.stopPropagation();
                      setRoomFilterQuery('');
                    } else if (e.key === 'Enter' && rooms[0]) {
                      onSelectRoom(rooms[0].id);
                    }
                  }}
                  placeholder="Поиск"
                  className="h-full w-full min-w-0 rounded-full bg-transparent pl-10 pr-10 text-[15px] text-ink outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
                />
                {roomFilterQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setRoomFilterQuery('');
                      searchRef.current?.focus();
                    }}
                    className="absolute right-1.5 flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-ink/10 hover:text-ink cursor-pointer"
                    aria-label="Очистить поиск"
                  >
                    <IconX size={16} />
                  </button>
                )}
              </label>
            )}
          </div>

          {/* Stories (hidden while searching and in compact mode) */}
          {!isCompactSidebar && !roomFilterQuery && (
            <StoriesBar
              onOpenCreate={onOpenStoryCreate}
              onOpenViewer={onOpenStoryViewer}
            />
          )}

          {/* Folder tabs */}
          {!isCompactSidebar && (
            <ChatFolderTabs
              activeFolder={activeFolder}
              onSelectFolder={onSelectFolder}
              folderCounts={folderCounts}
            />
          )}

          {/* Chat list */}
          <div
            ref={listRef}
            role="list"
            aria-label="Чаты"
            className={`flex-1 overflow-y-auto overflow-x-hidden px-1.5 py-1 pb-28 md:pb-2 tg-scrollbar ${isCompactSidebar ? 'space-y-1' : ''}`}
          >
            {rooms.map((room) => {
              const saved = isSavedRoom(room.id);
              const peerId = room.type === 'direct' && !saved ? room.participants.find((p) => p !== currentUser) : undefined;
              return (
                <div role="listitem" key={room.id}>
                  <ChatListItem
                    name={getRoomDisplayName(room)}
                    avatarUrl={saved ? undefined : getRoomAvatar(room)}
                    avatarColor={getRoomColor(room)}
                    kind={saved ? 'saved' : room.type}
                    statusEmoji={peerId ? userProfiles[peerId]?.statusEmoji : undefined}
                    isSecret={!!room.secret}
                    online={!saved && isRoomOnline(room)}
                    active={isDesktopView && room.id === activeRoomId}
                    compact={isCompactSidebar}
                    muted={isRoomMuted(room.id)}
                    pinned={isRoomPinned(room.id)}
                    unread={unreadCount(room.id)}
                    preview={getLastMessagePreview(room.id)}
                    typers={roomTypingUsers(room.id)}
                    onClick={() => onSelectRoom(room.id)}
                    onContextMenu={(x, y) => setMenu({ roomId: room.id, x, y })}
                  />
                </div>
              );
            })}

            {roomFilterQuery.trim() && <PublicRoomResults query={roomFilterQuery} compact={isCompactSidebar} />}

            {!isCompactSidebar && rooms.every((r) => isSavedRoom(r.id)) && (
              <div className="flex flex-col items-center px-6 py-10 text-center">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-accent-muted text-accent">
                  {roomFilterQuery.trim() ? <IconSearch size={28} /> : <IconPencil size={28} />}
                </div>
                <p className="m-0 text-[15px] font-semibold text-ink">{emptyText}</p>
                {roomFilterQuery.trim() ? (
                  <button
                    type="button"
                    onClick={onOpenGlobalSearch}
                    className="mt-3 rounded-full px-4 py-2 text-[14px] font-medium text-accent transition-colors hover:bg-accent-muted cursor-pointer"
                  >
                    Искать везде
                  </button>
                ) : (
                  onOpenNewChatModal && activeFolder !== 'unread' && (
                    <button
                      type="button"
                      onClick={() => onOpenNewChatModal()}
                      className="mt-3 rounded-full bg-accent px-4 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-accent-strong cursor-pointer"
                    >
                      Начать общение
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* New message FAB */}
          {!isCompactSidebar && onOpenNewChatModal && (
            <div
              className="fixed right-4 z-30 md:absolute md:bottom-5 md:right-4"
              style={{
                bottom: 'calc(max(0.625rem, env(safe-area-inset-bottom, 0px)) + 78px)',
              }}
            >
              <button
                type="button"
                onClick={() => onOpenNewChatModal()}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-black/25 transition-[background-color,transform] duration-150 hover:bg-accent-strong active:scale-95 cursor-pointer"
                title="Новое сообщение"
                aria-label="Новое сообщение"
              >
                <IconPencil size={24} stroke={2} />
              </button>
            </div>
          )}
          </>
        ) : mobileTab === 'contacts' ? (
          <MobileContactsScreen onOpenRoom={onSelectRoom} onNewChat={(mode) => onOpenNewChatModal?.(mode)} />
        ) : (
          <MobileSettingsScreen
            profile={currentUserProfile}
            currentUserName={currentUserName}
            darkMode={darkMode}
            onToggleDarkMode={onToggleDarkMode}
            showInstall={!isStandalone}
            onOpenSaved={savedRoom ? () => onSelectRoom(savedRoom.id) : undefined}
            onOpenProfile={onOpenProfileModal}
            onOpenSearch={onOpenGlobalSearch}
            onOpenTheme={onOpenThemeModal}
            onOpenPrivacy={() => setShowSecurityModal(true)}
            onOpenQr={onOpenQrModal}
            onOpenInstall={onOpenInstallModal}
            onOpenArchive={onOpenArchiveModal}
            onLogout={onLogout}
          />
        )}

        {/* Tab bar: docked at the sidebar bottom on wide screens… */}
        {!isCompactSidebar && (
          <MobileBottomNav
            docked
            activeTab={mobileTab}
            onSelectTab={handleMobileTab}
            unreadCount={totalUnreadCount}
            avatarUrl={currentUserProfile?.avatarUrl}
            displayName={tabBarName}
          />
        )}

        {/* …and floating over the list on phones */}
        {!isDesktopView && (
          <MobileBottomNav
            hidden={mobileView !== 'list'}
            activeTab={mobileTab}
            onSelectTab={handleMobileTab}
            unreadCount={totalUnreadCount}
            avatarUrl={currentUserProfile?.avatarUrl}
            displayName={tabBarName}
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
              ? 'bg-accent w-[2px]'
              : 'bg-zinc-200/80 dark:bg-white/10 group-hover:bg-accent group-hover:w-[2px]'
          }`}
        />
      </div>
    </>
  );
};

export default ChatSidebar;
