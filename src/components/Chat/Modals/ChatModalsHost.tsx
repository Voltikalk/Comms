import React from 'react';
import type { Message, UserId, Room, UserProfile, Poll } from '../../../types';
import type { ChatThemeConfig } from '../../../types/theme.types';
import type { FilterOptions } from '../../../lib/filter-utils';
import { ProfileEditModal } from '../../ProfileEditModal';
import { PollCreateModal } from '../../Poll/PollCreateModal';
import { SearchPage } from '../../../pages/SearchPage';
import { AdvancedSearchModal } from '../../Search/AdvancedSearchModal';
import { ThemeSettingsModal } from '../../Theme/ThemeSettingsModal';
import { StoryViewer } from '../../Stories/StoryViewer';
import { StoryCreateModal } from '../../Stories/StoryCreateModal';
import { MediaGalleryModal } from '../../Media/MediaGalleryModal';
import { CommandPaletteModal } from '../../Navigation/CommandPaletteModal';
import { TelegramContextMenuModal } from '../../TelegramContextMenuModal';
import { CallOverlay } from '../../Call/CallOverlay';
import { AdminArchive } from '../../../pages/AdminArchive';
import { NewChatModal } from '../NewChatModal';
import {
  IconX,
  IconCopy,
  IconShare3,
  IconTrash,
  IconCheck,
  IconQrcode
} from '@tabler/icons-react';

export interface ChatModalsHostProps {
  currentUser: UserId | null;
  rooms: Room[];
  activeRoomId: string;
  activeRoom: Room | null;
  userProfiles: Record<UserId, UserProfile>;
  getUserDisplayName: (userId: UserId) => string;
  getUserAvatar: (userId: UserId) => string | undefined;
  getRoomDisplayName: (room: Room) => string;
  getRoomColor: (room: Room) => string;
  onlineStatus: Record<UserId, boolean>;
  unreadCount: (roomId: string) => number;
  darkMode: boolean;
  toggleDarkMode: () => void;
  // Selection
  isSelectMode: boolean;
  setIsSelectMode: (val: boolean) => void;
  selectedMessageIds: Set<string>;
  setSelectedMessageIds: (set: Set<string>) => void;
  activeMessages: Message[];
  handleDeleteSelectedAnimated: () => void;
  getSelectedText: (count: number) => string;
  // Profile
  showProfileModal: boolean;
  setShowProfileModal: (show: boolean) => void;
  // Poll
  showPollModal: boolean;
  setShowPollModal: (show: boolean) => void;
  handleCreatePoll: (pollData: Omit<Poll, 'id' | 'authorId' | 'totalVotes' | 'isClosed' | 'createdAt'>) => void;
  // Global Search
  showGlobalSearchModal: boolean;
  setShowGlobalSearchModal: (show: boolean) => void;
  globalSearchSeed?: string;
  setGlobalSearchSeed: (seed?: string) => void;
  onNavigateFromGlobalSearch: (item: any) => void;
  allMessages: Message[];
  // Advanced Filter
  showAdvancedSearchModal: boolean;
  setShowAdvancedSearchModal: (show: boolean) => void;
  chatFilters: FilterOptions;
  setChatFilters: React.Dispatch<React.SetStateAction<FilterOptions>>;
  // Theme
  showThemeModal: boolean;
  setShowThemeModal: (show: boolean) => void;
  themeConfig: ChatThemeConfig;
  setThemeConfig: (config: ChatThemeConfig) => void;
  // Stories
  activeStoryViewerUser: UserId | null;
  setActiveStoryViewerUser: (user: UserId | null) => void;
  isStoryCreateOpen: boolean;
  setIsStoryCreateOpen: (open: boolean) => void;
  onSendStoryDirectMessage: (peerUserId: string, text: string) => void;
  // Gallery
  activeGalleryMediaId: string | null;
  setActiveGalleryMediaId: (id: string | null) => void;
  roomMediaMessages: Message[];
  onHashtagClick: (tag: string) => void;
  // Command Palette
  showCommandPalette: boolean;
  setShowCommandPalette: (show: boolean) => void;
  onSelectRoomFromPalette: (roomId: string) => void;
  onToggleMuteActiveRoom?: () => void;
  isRoomMuted: boolean;
  // Admin Archive
  showArchiveModal: boolean;
  setShowArchiveModal: (show: boolean) => void;
  // Forward
  forwardingMessage: Message | null;
  setForwardingMessage: (msg: Message | null) => void;
  handleForwardToRoom: (roomId: string) => void;
  // Context Menu
  contextMenuTarget: { message: Message; x: number; y: number; isSelf: boolean } | null;
  setContextMenuTarget: (target: any) => void;
  onReplyMessage: (msg: Message) => void;
  onEditMessage: (msg: Message) => void;
  onPinMessage: (id: string) => void;
  isMessagePinned: (id: string) => boolean;
  onDeleteMessageAnimated: (id: string) => void;
  onToggleReaction: (msgId: string, emoji: string) => void;
  forwardMessage: (targetRoomId: string, msg: Message) => void;
  // Toast
  toast: { text: string; actionLabel?: string; onAction?: () => void } | null;
  setToast: (toast: any) => void;
  showToast: (msg: string) => void;
  // WebRTC Calling
  // Video Note Circle Record
  // QR Modal
  showQrModal: boolean;
  setShowQrModal: (show: boolean) => void;
  // New Chat Modal
  showNewChatModal?: boolean;
  setShowNewChatModal?: (show: boolean) => void;
}

export const ChatModalsHost: React.FC<ChatModalsHostProps> = ({
  currentUser,
  rooms,
  activeRoomId,
  activeRoom,
  userProfiles,
  getUserDisplayName,
  getUserAvatar,
  getRoomDisplayName,
  getRoomColor,
  onlineStatus,
  unreadCount,
  darkMode,
  toggleDarkMode,
  isSelectMode,
  setIsSelectMode,
  selectedMessageIds,
  setSelectedMessageIds,
  activeMessages,
  handleDeleteSelectedAnimated,
  getSelectedText,
  showProfileModal,
  setShowProfileModal,
  showPollModal,
  setShowPollModal,
  handleCreatePoll,
  showGlobalSearchModal,
  setShowGlobalSearchModal,
  globalSearchSeed,
  setGlobalSearchSeed,
  onNavigateFromGlobalSearch,
  allMessages,
  showAdvancedSearchModal,
  setShowAdvancedSearchModal,
  chatFilters,
  setChatFilters,
  showThemeModal,
  setShowThemeModal,
  themeConfig,
  setThemeConfig,
  activeStoryViewerUser,
  setActiveStoryViewerUser,
  isStoryCreateOpen,
  setIsStoryCreateOpen,
  onSendStoryDirectMessage,
  activeGalleryMediaId,
  setActiveGalleryMediaId,
  roomMediaMessages,
  onHashtagClick,
  showCommandPalette,
  setShowCommandPalette,
  onSelectRoomFromPalette,
  onToggleMuteActiveRoom,
  isRoomMuted,
  showArchiveModal,
  setShowArchiveModal,
  forwardingMessage,
  setForwardingMessage,
  handleForwardToRoom,
  contextMenuTarget,
  setContextMenuTarget,
  onReplyMessage,
  onEditMessage,
  onPinMessage,
  isMessagePinned,
  onDeleteMessageAnimated,
  onToggleReaction,
  forwardMessage,
  toast,
  setToast,
  showToast,
  showQrModal,
  setShowQrModal,
  showNewChatModal,
  setShowNewChatModal,
}) => {
  const [isUrlCopied, setIsUrlCopied] = React.useState(false);

  return (
    <>
      {/* 0. New Chat Modal (Telegram Style) */}
      {showNewChatModal && setShowNewChatModal && (
        <NewChatModal
          isOpen={showNewChatModal}
          onClose={() => setShowNewChatModal(false)}
        />
      )}

      {/* 1. Profile Edit Modal */}
      {showProfileModal && (
        <ProfileEditModal
          onClose={() => setShowProfileModal(false)}
          onToast={showToast}
        />
      )}

      {/* 2. Poll Create Modal */}
      <PollCreateModal
        isOpen={showPollModal}
        onClose={() => setShowPollModal(false)}
        onCreate={handleCreatePoll}
      />

      {/* 3. Global Message Search Suite Modal */}
      {showGlobalSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full h-full md:h-[80vh] md:max-w-xl bg-white dark:bg-surface md:rounded-3xl md:border md:border-zinc-200 dark:md:border-white/10 md:shadow-2xl flex flex-col overflow-hidden">
            <SearchPage
              roomId={activeRoomId || undefined}
              userId={currentUser || 'vlad'}
              allMessages={allMessages}
              rooms={rooms}
              userProfiles={userProfiles}
              initialQuery={globalSearchSeed}
              onNavigateToMessage={onNavigateFromGlobalSearch}
              onClose={() => {
                setShowGlobalSearchModal(false);
                setGlobalSearchSeed(undefined);
              }}
            />
          </div>
        </div>
      )}

      {/* 4. Advanced Filter Modal */}
      {showAdvancedSearchModal && (
        <AdvancedSearchModal
          isOpen={showAdvancedSearchModal}
          filters={{
            startDate: chatFilters.dateRange?.startDate || undefined,
            endDate: chatFilters.dateRange?.endDate || undefined,
            senderId: chatFilters.senders?.[0] || undefined,
            contentType: chatFilters.attachmentTypes?.[0] || undefined,
            hasAttachments: chatFilters.hasAttachments || false,
          }}
          onClose={() => setShowAdvancedSearchModal(false)}
          onApplyFilters={(applied) => {
            setChatFilters((prev) => ({
              ...prev,
              dateRange: applied.startDate || applied.endDate ? { startDate: applied.startDate, endDate: applied.endDate } : undefined,
              senders: applied.senderId ? [applied.senderId] : undefined,
              attachmentTypes: applied.contentType ? [applied.contentType as any] : undefined,
              hasAttachments: applied.hasAttachments || undefined,
            }));
          }}
        />
      )}

      {/* 5. Theme Settings Modal */}
      {showThemeModal && (
        <ThemeSettingsModal
          currentConfig={themeConfig}
          isDark={darkMode}
          onSave={(newConfig) => {
            setThemeConfig(newConfig);
            showToast('Тема и обои успешно обновлены');
          }}
          onClose={() => setShowThemeModal(false)}
        />
      )}

      {/* 6. Story Viewer Modal */}
      {activeStoryViewerUser && (
        <StoryViewer
          targetUser={activeStoryViewerUser}
          onClose={() => setActiveStoryViewerUser(null)}
          onOpenCreate={() => {
            setActiveStoryViewerUser(null);
            setIsStoryCreateOpen(true);
          }}
          onSendDirectMessage={onSendStoryDirectMessage}
        />
      )}

      {/* 7. Story Create Modal */}
      <StoryCreateModal
        isOpen={isStoryCreateOpen}
        onClose={() => setIsStoryCreateOpen(false)}
      />

      {/* 8. Media Gallery Modal */}
      <MediaGalleryModal
        isOpen={Boolean(activeGalleryMediaId)}
        activeMessageId={activeGalleryMediaId}
        mediaMessages={roomMediaMessages}
        onClose={() => setActiveGalleryMediaId(null)}
        onSelectMessageId={(id) => setActiveGalleryMediaId(id)}
        onHashtagClick={onHashtagClick}
        showToast={showToast}
      />

      {/* 9. Spotlight Command Palette (Ctrl+K) */}
      <CommandPaletteModal
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        rooms={rooms}
        activeRoomId={activeRoomId}
        onSelectRoom={onSelectRoomFromPalette}
        currentUser={currentUser}
        getUserDisplayName={getUserDisplayName}
        getUserAvatar={getUserAvatar}
        onlineStatus={onlineStatus}
        unreadCount={unreadCount}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        onOpenThemeSettings={() => setShowThemeModal(true)}
        onOpenProfileModal={() => setShowProfileModal(true)}
        onOpenQrModal={() => setShowQrModal(true)}
        onOpenPollCreate={() => setShowPollModal(true)}
        onOpenStoryCreate={() => setIsStoryCreateOpen(true)}
        onOpenGlobalSearch={() => setShowGlobalSearchModal(true)}
        onOpenAdminArchive={() => setShowArchiveModal(true)}
        onToggleMuteActiveRoom={onToggleMuteActiveRoom}
        isRoomMuted={isRoomMuted}
      />

      {/* 10. Admin Message Archive Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md animate-fade-in">
          <AdminArchive onClose={() => setShowArchiveModal(false)} />
        </div>
      )}

      {/* 11. Telegram Context Menu Modal */}
      {contextMenuTarget && (
        <TelegramContextMenuModal
          message={contextMenuTarget.message}
          x={contextMenuTarget.x}
          y={contextMenuTarget.y}
          isSelf={contextMenuTarget.isSelf}
          isPinned={isMessagePinned(contextMenuTarget.message.id)}
          currentUser={currentUser}
          onClose={() => setContextMenuTarget(null)}
          onReply={(msg: Message) => {
            onReplyMessage(msg);
            setContextMenuTarget(null);
          }}
          onEdit={(msg: Message) => {
            onEditMessage(msg);
            setContextMenuTarget(null);
          }}
          onCopy={(msg: Message) => {
            if (msg.text) {
              navigator.clipboard.writeText(msg.text);
              showToast('Скопировано в буфер');
            }
            setContextMenuTarget(null);
          }}
          onForward={(msg: Message) => {
            setForwardingMessage(msg);
            setContextMenuTarget(null);
          }}
          onPin={(msg: Message) => {
            onPinMessage(msg.id);
            setContextMenuTarget(null);
          }}
          onSaveToFavorites={(msg: Message) => {
            if (activeRoom?.id === 'saved-messages') {
              showToast('Сообщение уже в Избранном');
            } else {
              forwardMessage('saved-messages', msg);
              showToast('Сохранено в Избранное');
            }
            setContextMenuTarget(null);
          }}
          onDelete={(msg: Message) => {
            setContextMenuTarget(null);
            onDeleteMessageAnimated(msg.id);
          }}
          onSelect={(msg: Message) => {
            setIsSelectMode(true);
            setSelectedMessageIds(new Set([msg.id]));
            showToast('Режим выделения активен');
            setContextMenuTarget(null);
          }}
          onMarkRead={(_msg: Message) => {
            showToast('Сообщение прочитано');
            setContextMenuTarget(null);
          }}
          onToggleReaction={(msgId, emoji) => {
            onToggleReaction(msgId, emoji);
            setContextMenuTarget(null);
          }}
        />
      )}

      {/* 12. Telegram Forward Message Modal */}
      {forwardingMessage && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 pt-[max(1.5rem,calc(env(safe-area-inset-top,0px)+1rem))] pb-[max(1.5rem,calc(env(safe-area-inset-bottom,0px)+1rem))] animate-backdrop select-none"
          onClick={() => setForwardingMessage(null)}
        >
          <div
            className="w-full max-w-sm max-h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-3rem)] bg-white dark:bg-surface rounded-3xl shadow-2xl border border-zinc-200 dark:border-white/10 p-4 flex flex-col gap-3 animate-pop-in text-zinc-900 dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-white/10">
              <span className="font-bold text-sm">Переслать сообщение</span>
              <button
                type="button"
                onClick={() => setForwardingMessage(null)}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                <IconX size={18} />
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border-l-2 border-accent text-xs text-zinc-600 dark:text-zinc-300 truncate">
              {forwardingMessage.text || (forwardingMessage.poll ? `📊 Опрос: ${forwardingMessage.poll.question}` : '📎 Вложение')}
            </div>

            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-1">
              Выберите чат:
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1 pr-1 tg-scrollbar">
              {rooms.map((room) => {
                const name = getRoomDisplayName(room);
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => handleForwardToRoom(room.id)}
                    className="w-full p-2 rounded-2xl flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors text-left"
                  >
                    <div className={`w-9 h-9 rounded-full ${getRoomColor(room)} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                      {name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-xs text-zinc-900 dark:text-white truncate block">{name}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">{room.type === 'direct' ? 'Личный чат' : 'Группа'}</span>
                    </div>
                    <IconShare3 size={16} className="text-zinc-400 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 13. WebRTC call overlay (full-screen ↔ floating PiP, screen share) */}
      <CallOverlay peerName={activeRoom ? getRoomDisplayName(activeRoom) : 'Собеседник'} />

      {/* 15. QR Code Modal */}
      {showQrModal && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 pt-[max(1.5rem,calc(env(safe-area-inset-top,0px)+1rem))] pb-[max(1.5rem,calc(env(safe-area-inset-bottom,0px)+1rem))] select-none animate-pop-in"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="w-full max-w-[360px] max-h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-3rem)] overflow-y-auto tg-header rounded-3xl p-6 flex flex-col items-center text-center shadow-2xl border border-zinc-200 dark:border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className="flex items-center gap-2">
                <IconQrcode size={20} className="text-accent" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-white m-0">
                  Открыть на телефоне
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <IconX size={20} />
              </button>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
              Отсканируйте QR-код камерой телефона или откройте ссылку в браузере:
            </p>

            <div className="p-3 bg-white rounded-2xl shadow-md border border-zinc-100 mb-3 flex items-center justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                  typeof window !== 'undefined'
                    ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                        ? `https://192.168.0.9:${window.location.port || '5173'}`
                        : window.location.origin)
                    : 'https://192.168.0.9:5173'
                )}`}
                alt="QR Code to open chat"
                className="w-44 h-44 rounded-lg block"
              />
            </div>

            {(() => {
              const currentUrl = typeof window !== 'undefined'
                ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                    ? `https://192.168.0.9:${window.location.port || '5173'}`
                    : window.location.origin)
                : 'https://192.168.0.9:5173';
              return (
                <div className="w-full flex items-center gap-2 p-2 rounded-xl bg-zinc-100 dark:bg-elevated mb-2">
                  <span className="text-[11px] font-mono text-zinc-800 dark:text-zinc-200 truncate flex-1 text-left px-1 select-all">
                    {currentUrl}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(currentUrl);
                      setIsUrlCopied(true);
                      setTimeout(() => setIsUrlCopied(false), 2000);
                    }}
                    className="p-1.5 rounded-lg tg-btn-primary cursor-pointer shrink-0 transition-all flex items-center gap-1 text-[11px] font-semibold text-white"
                    title="Скопировать ссылку"
                  >
                    {isUrlCopied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                    <span>{isUrlCopied ? 'Скопировано' : 'Копия'}</span>
                  </button>
                </div>
              );
            })()}

            <div className="w-full text-left text-[11px] text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 mb-3 leading-relaxed">
              ⚠️ <b>При открытии на телефоне:</b> телефон и ПК должны быть в одном Wi-Fi. Если браузер пишет <i>«Не защищено»</i>, нажмите <b>«Подробнее» (Advanced) ➔ «Перейти на сайт» (Proceed)</b>.
            </div>

            <div className="w-full text-left bg-black/5 dark:bg-white/5 rounded-xl p-3 text-[11px] space-y-1">
              <span className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                Пароли для входа:
              </span>
              <div className="grid grid-cols-2 gap-1 text-zinc-600 dark:text-zinc-400 font-mono">
                <div>Влад: <b className="text-accent">vladpass</b></div>
                <div>Аня: <b className="text-pink-500">anyapass</b></div>
                <div>Мама: <b className="text-amber-500">mompass</b></div>
                <div>Папа: <b className="text-sky-500">dadpass</b></div>
                <div>Сестра: <b className="text-emerald-500">sispass</b></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 16. Selection Mode Bottom Action Bar */}
      {isSelectMode && (
        <div className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] inset-x-3 sm:inset-x-6 z-40 max-w-2xl mx-auto bg-white/98 dark:bg-surface/98 rounded-2xl shadow-2xl border border-zinc-200 dark:border-white/10 px-4 py-2.5 flex items-center justify-between animate-pop-in select-none backdrop-blur-md">
          <button
            type="button"
            onClick={handleDeleteSelectedAnimated}
            disabled={selectedMessageIds.size === 0}
            className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-500/10 disabled:opacity-30 cursor-pointer transition-colors"
            title="Удалить"
          >
            <IconTrash size={20} />
          </button>

          <span className="text-[13.5px] font-medium text-zinc-800 dark:text-zinc-200">
            {getSelectedText(selectedMessageIds.size)}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const texts = activeMessages
                  .filter(m => selectedMessageIds.has(m.id))
                  .map(m => m.text || (m.poll ? `📊 Опрос: ${m.poll.question}\n` + m.poll.options.map((o, i) => `${i + 1}. ${o.text}`).join('\n') : (m.file ? `📎 ${m.file.name}` : '')))
                  .filter(Boolean)
                  .join('\n\n');
                if (texts) {
                  navigator.clipboard.writeText(texts);
                  showToast('Скопировано в буфер');
                }
              }}
              disabled={selectedMessageIds.size === 0}
              className="p-1.5 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer transition-colors"
              title="Копировать"
            >
              <IconCopy size={20} />
            </button>
            <button
              type="button"
              onClick={() => {
                const firstSelected = activeMessages.find(m => selectedMessageIds.has(m.id));
                if (firstSelected) {
                  setForwardingMessage(firstSelected);
                }
              }}
              disabled={selectedMessageIds.size === 0}
              className="p-1.5 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer transition-colors"
              title="Переслать"
            >
              <IconShare3 size={20} />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSelectMode(false);
                setSelectedMessageIds(new Set());
              }}
              className="p-1 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer transition-colors ml-1"
              title="Закрыть"
            >
              <IconX size={18} />
            </button>
          </div>
        </div>
      )}

      {/* 17. Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-50 bg-surface/95 dark:bg-elevated/95 text-white px-4 py-2.5 rounded-full shadow-2xl text-xs font-medium backdrop-blur-md border border-white/10 animate-pop-in select-none flex items-center gap-3">
          <span>{toast.text}</span>
          {toast.actionLabel && toast.onAction && (
            <button
              type="button"
              onClick={() => {
                toast.onAction?.();
                setToast(null);
              }}
              className="text-accent dark:text-accent-soft font-bold hover:underline cursor-pointer pl-1 shrink-0"
            >
              {toast.actionLabel}
            </button>
          )}
        </div>
      )}
    </>
  );
};

export default ChatModalsHost;
