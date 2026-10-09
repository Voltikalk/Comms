import React, { useState } from 'react';
import type { Room } from '../../../types';
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
  IconUsers,
  IconBell,
  IconBellOff,
  IconPalette,
  IconUser,
  IconLock,
  IconSpeakerphone,
  IconSettings,
  IconLogout,
} from '@tabler/icons-react';
import { SecretChatMenu } from './SecretChatMenu';
import { membersLabel } from '../../../lib/roles';
import { useAuth } from '../../../context/contexts';
import { StoryAvatarRing } from '../../Stories/StoryRing';

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
  /** In-chat search bar; when set it replaces the title row (`InChatSearch`). */
  searchBar?: React.ReactNode;
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
  /** Group members currently online (shown as «N в сети»). */
  onlineCount?: number;
  /** Group/channel management (admins only). */
  onOpenManage?: () => void;
  /** Leave the group / unsubscribe from the channel. */
  onLeaveRoom?: () => void;
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
  searchBar,
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
  onlineCount = 0,
  onOpenManage,
  onLeaveRoom,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const me = useAuth().currentUser;

  if (!activeRoom) return null;
  // Direct chats ring the avatar with the peer's stories (saved messages have no peer).
  const storyPeer = activeRoom.type === 'direct' ? activeRoom.participants.find((p) => p !== me) : undefined;

  return (
    <>
      <header className="px-3 sm:px-4 py-2 tg-header relative flex items-center justify-between z-30 select-none shadow-xs min-h-[56px] w-full min-w-0 max-w-full border-b border-black/[0.06] dark:border-white/[0.06]">
        {isSelectMode ? (
          <div className="w-full min-w-0 flex items-center justify-between animate-pop-in">
            {/* Left: Cancel Cross Button & Counter */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onCancelSelectMode}
                className="p-1.5 rounded-full text-zinc-500 hover:text-zinc-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                title="Отменить (Esc)"
              >
                <IconX size={22} />
              </button>

              <span className="text-[15px] font-bold text-zinc-900 dark:text-white">
                Выбрано: {selectedMessageIds.size}
              </span>
            </div>

            {/* Right: Group Action Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onPinSelected}
                disabled={selectedMessageIds.size === 0}
                className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer transition-colors"
                title="Закрепить"
              >
                <IconPin size={20} />
              </button>

              <button
                type="button"
                onClick={onCopySelected}
                disabled={selectedMessageIds.size === 0}
                className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer transition-colors"
                title="Копировать"
              >
                <IconCopy size={20} />
              </button>

              <button
                type="button"
                onClick={onForwardSelected}
                disabled={selectedMessageIds.size === 0}
                className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer transition-colors"
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
        ) : searchBar ? (
          searchBar
        ) : (
          /* Normal Chat Header View */
          <>
            {/* Left Info: Back on Mobile + Avatar + Title + Subtitle */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <button
                type="button"
                onClick={onBackToRooms}
                className="md:hidden p-1.5 -ml-1.5 rounded-full text-zinc-500 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors shrink-0"
                title="Назад"
              >
                <IconChevronLeft size={22} />
              </button>

              <div className="relative shrink-0 cursor-pointer hover:opacity-90 transition-opacity">
                <StoryAvatarRing userId={storyPeer} onClick={onOpenUserInfo}>
                {getRoomAvatar(activeRoom) ? (
                  <img 
                    src={getRoomAvatar(activeRoom)} 
                    alt={activeRoomDisplayName} 
                    className="w-10 h-10 rounded-full object-cover shadow-xs" 
                  />
                ) : (
                  <div className={`w-10 h-10 rounded-full ${getRoomColor(activeRoom)} text-white flex items-center justify-center font-bold text-base shadow-xs`}>
                    {activeRoom.type === 'direct' ? (
                      activeRoomDisplayName.charAt(0).toUpperCase()
                    ) : activeRoom.type === 'channel' ? (
                      <IconSpeakerphone size={20} />
                    ) : (
                      <IconUsers size={20} />
                    )}
                  </div>
                )}
                </StoryAvatarRing>
                {activeRoom.type === 'direct' && isPeerOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-surface shadow-xs" />
                )}
              </div>

              <div 
                onClick={onOpenUserInfo}
                className="min-w-0 flex-1 cursor-pointer select-none"
              >
                <div className="flex items-center gap-1.5">
                  {activeRoom.secret && (
                    <IconLock size={14} className="text-emerald-500 shrink-0" aria-label="Секретный чат" />
                  )}
                  <h2 className={`text-sm font-bold truncate ${activeRoom.secret ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-white'}`}>
                    {activeRoomDisplayName}
                  </h2>
                  {isRoomMuted && (
                    <IconBellOff size={13} className="text-zinc-400 shrink-0" title="Без звука" />
                  )}
                </div>

                <div className="text-xs truncate text-zinc-400 flex items-center gap-1">
                  {activeRoomTypingUsers.length > 0 ? (
                    <span className="text-accent font-medium flex items-center gap-1">
                      <span className="flex gap-0.5 items-center">
                        <span className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                      <span>{activeRoomTypingUsers.join(', ')} печатает...</span>
                    </span>
                  ) : activeRoom.type === 'direct' ? (
                    <>
                      {isPeerOnline ? (
                        <span className="text-emerald-500 font-medium">в сети</span>
                      ) : (
                        <span>был(а) недавно</span>
                      )}
                      {activeRoom.secret && <span className="text-emerald-500/80">· секретный чат</span>}
                    </>
                  ) : (
                    <span>
                      {membersLabel(activeRoom)}
                      {activeRoom.type === 'group' && onlineCount > 1 && `, ${onlineCount} в сети`}
                    </span>
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
                    className="p-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-accent hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                    title="Аудиозвонок"
                  >
                    <IconPhone size={20} />
                  </button>

                  <button
                    type="button"
                    onClick={onStartVideoCall}
                    className="p-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-accent hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                    title="Видеозвонок"
                  >
                    <IconVideo size={20} />
                  </button>
                </>
              )}

              {activeRoom.secret && <SecretChatMenu roomId={activeRoom.id} />}

              <button
                type="button"
                onClick={onStartSearching}
                className="p-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-accent hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                title="Поиск сообщений"
              >
                <IconSearch size={20} />
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="p-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                  title="Опции"
                >
                  <IconDotsVertical size={20} />
                </button>

                {showDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                    <div className="absolute right-0 top-11 z-50 w-56 bg-white dark:bg-surface rounded-2xl shadow-2xl border border-zinc-200 dark:border-white/10 py-1.5 animate-pop-in select-none">
                      <button
                        type="button"
                        onClick={() => {
                          onToggleMute();
                          setShowDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2.5 cursor-pointer transition-colors"
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
                        className="w-full px-3 py-2 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2.5 cursor-pointer transition-colors"
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
                        className="w-full px-3 py-2 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2.5 cursor-pointer transition-colors"
                      >
                        <IconUser size={17} />
                        <span>Информация</span>
                      </button>

                      {onOpenManage && (
                        <button
                          type="button"
                          onClick={() => {
                            onOpenManage();
                            setShowDropdown(false);
                          }}
                          className="w-full px-3 py-2 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2.5 cursor-pointer transition-colors"
                        >
                          <IconSettings size={17} />
                          <span>{activeRoom.type === 'channel' ? 'Управление каналом' : 'Управление группой'}</span>
                        </button>
                      )}

                      <div className="my-1 border-t border-zinc-100 dark:border-white/5" />

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

                      {onLeaveRoom && (
                        <button
                          type="button"
                          onClick={() => {
                            onLeaveRoom();
                            setShowDropdown(false);
                          }}
                          className="w-full px-3 py-2 text-left text-xs text-rose-500 hover:bg-rose-500/10 flex items-center gap-2.5 cursor-pointer transition-colors"
                        >
                          <IconLogout size={17} />
                          <span>{activeRoom.type === 'channel' ? 'Покинуть канал' : 'Покинуть группу'}</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </header>
    </>
  );
};

export default ChatHeader;
