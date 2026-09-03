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
import { AdminArchive } from '../../../pages/AdminArchive';
import { NewChatModal } from '../NewChatModal';
import {
  IconX,
  IconCopy,
  IconShare3,
  IconTrash,
  IconCheck,
  IconPhone,
  IconPhoneOff,
  IconVideo,
  IconMicrophone,
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
  onDeleteMessageAnimated: (id: string) => void;
  onToggleReaction: (msgId: string, emoji: string) => void;
  forwardMessage: (targetRoomId: string, msg: Message) => void;
  // Toast
  toast: { text: string; actionLabel?: string; onAction?: () => void } | null;
  setToast: (toast: any) => void;
  showToast: (msg: string) => void;
  // WebRTC Calling
  callSession: any;
  remoteAudioRef: React.RefObject<HTMLAudioElement | null>;
  localAudioRef: React.RefObject<HTMLAudioElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  isMuted: boolean;
  toggleCamera: () => void;
  isCameraOff: boolean;
  // Video Note Circle Record
  isRecordingVideo: boolean;
  videoPreviewRef: React.RefObject<HTMLVideoElement | null>;
  videoRecordTime: number;
  formatRecordTime: (s: number) => string;
  stopVideoRecording: (send: boolean) => void;
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
  onDeleteMessageAnimated,
  onToggleReaction,
  forwardMessage,
  toast,
  setToast,
  showToast,
  callSession,
  remoteAudioRef,
  localAudioRef,
  remoteVideoRef,
  localVideoRef,
  acceptCall,
  rejectCall,
  endCall,
  toggleMute,
  isMuted,
  toggleCamera,
  isCameraOff,
  isRecordingVideo,
  videoPreviewRef,
  videoRecordTime,
  formatRecordTime,
  stopVideoRecording,
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
          <div className="w-full h-full md:h-[80vh] md:max-w-xl bg-white dark:bg-[#17212b] md:rounded-3xl md:border md:border-slate-200 dark:md:border-white/10 md:shadow-2xl flex flex-col overflow-hidden">
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
            onDeleteMessageAnimated(msg.id);
            showToast('Сообщение удалено');
            setContextMenuTarget(null);
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
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-backdrop select-none"
          onClick={() => setForwardingMessage(null)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-[#17212b] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 p-4 flex flex-col gap-3 animate-pop-in text-slate-900 dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
              <span className="font-bold text-sm">Переслать сообщение</span>
              <button
                type="button"
                onClick={() => setForwardingMessage(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <IconX size={18} />
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border-l-2 border-[#3390ec] text-xs text-slate-600 dark:text-slate-300 truncate">
              {forwardingMessage.text || (forwardingMessage.poll ? `📊 Опрос: ${forwardingMessage.poll.question}` : '📎 Вложение')}
            </div>

            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
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
                      <span className="font-semibold text-xs text-slate-900 dark:text-white truncate block">{name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{room.type === 'direct' ? 'Личный чат' : 'Группа'}</span>
                    </div>
                    <IconShare3 size={16} className="text-slate-400 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 13. WebRTC Calling Overlay */}
      {callSession && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center text-white select-none animate-pop-in">
          {callSession.status === 'active' && callSession.type === 'audio' && (
            <div style={{ position: 'absolute', width: 0, height: 0, opacity: 0, overflow: 'hidden' }}>
              <audio ref={remoteAudioRef as any} autoPlay playsInline />
              <audio ref={localAudioRef as any} autoPlay muted playsInline />
            </div>
          )}

          <div className="w-full max-w-sm p-6 flex flex-col items-center justify-center gap-5">
            <div className="flex flex-col items-center gap-2.5">
              <div className="w-20 h-20 rounded-full bg-[#3390ec] flex items-center justify-center text-3xl font-bold select-none uppercase shadow-lg">
                {activeRoom ? getRoomDisplayName(activeRoom).charAt(0) : '?'}
              </div>
              <h2 className="text-xl font-bold text-white mt-1">
                {activeRoom ? getRoomDisplayName(activeRoom) : 'Собеседник'}
              </h2>
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                {callSession.status === 'calling' && 'Исходящий вызов...'}
                {callSession.status === 'incoming' && `Входящий ${callSession.type === 'video' ? 'видеовызов' : 'аудиовызов'}...`}
                {callSession.status === 'active' && `Разговор (${callSession.type === 'video' ? 'Видео' : 'Аудио'})`}
              </span>
            </div>

            {callSession.status === 'active' && callSession.type === 'video' && (
              <div className="w-full aspect-video rounded-2xl overflow-hidden relative bg-black shadow-xl border border-white/10">
                <video
                  ref={remoteVideoRef as any}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 right-2 w-1/3 aspect-video rounded-xl overflow-hidden bg-black shadow-md border border-white/20">
                  <video
                    ref={localVideoRef as any}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center gap-4 mt-4">
              {callSession.status === 'incoming' ? (
                <>
                  <button
                    type="button"
                    onClick={rejectCall}
                    className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg cursor-pointer"
                  >
                    <IconPhoneOff size={22} />
                  </button>
                  <button
                    type="button"
                    onClick={acceptCall}
                    className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg cursor-pointer"
                  >
                    <IconPhone size={22} />
                  </button>
                </>
              ) : (
                <>
                  {callSession.status === 'active' && (
                    <button
                      type="button"
                      onClick={toggleMute}
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer ${
                        isMuted ? 'bg-rose-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      <IconMicrophone size={20} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={endCall}
                    className="w-14 h-14 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg cursor-pointer"
                  >
                    <IconPhoneOff size={22} />
                  </button>

                  {callSession.status === 'active' && callSession.type === 'video' && (
                    <button
                      type="button"
                      onClick={toggleCamera}
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer ${
                        isCameraOff ? 'bg-rose-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      <IconVideo size={20} />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 14. Video Circle Record Modal */}
      {isRecordingVideo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center select-none animate-pop-in p-4">
          <div className="p-6 tg-header rounded-3xl flex flex-col items-center gap-4 max-w-[320px] shadow-2xl border border-slate-200 dark:border-white/10">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Видео-кружок
            </span>

            <div className="w-48 h-48 rounded-full overflow-hidden bg-black shadow-2xl relative flex items-center justify-center">
              <video
                ref={videoPreviewRef as any}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover scale-x-[-1]"
              />

              <svg className="absolute inset-0 w-full h-full pointer-events-none -rotate-90 p-[2px] z-10" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="47"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.22)"
                  strokeWidth="3"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="47"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.88)"
                  strokeWidth="3"
                  strokeDasharray={2 * Math.PI * 47}
                  strokeDashoffset={2 * Math.PI * 47 * (1 - Math.min(1, videoRecordTime / 60))}
                  strokeLinecap="round"
                  className="transition-all duration-300 ease-linear"
                />
              </svg>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                {formatRecordTime(videoRecordTime)} / 1:00
              </span>
            </div>

            <div className="flex items-center gap-2 w-full mt-1">
              <button
                type="button"
                onClick={() => stopVideoRecording(false)}
                className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => stopVideoRecording(true)}
                className="flex-1 py-2.5 text-xs font-bold rounded-xl tg-btn-primary cursor-pointer shadow-xs text-white"
              >
                Отправить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 15. QR Code Modal */}
      {showQrModal && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 select-none animate-pop-in"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="w-full max-w-[360px] tg-header rounded-3xl p-6 flex flex-col items-center text-center shadow-2xl border border-slate-200 dark:border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className="flex items-center gap-2">
                <IconQrcode size={20} className="text-[#3390ec]" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white m-0">
                  Открыть на телефоне
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <IconX size={20} />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Отсканируйте QR-код камерой телефона или откройте ссылку в браузере:
            </p>

            <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-100 mb-3 flex items-center justify-center">
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
                <div className="w-full flex items-center gap-2 p-2 rounded-xl bg-slate-100 dark:bg-[#242f3d] mb-2">
                  <span className="text-[11px] font-mono text-slate-800 dark:text-slate-200 truncate flex-1 text-left px-1 select-all">
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
              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Пароли для входа:
              </span>
              <div className="grid grid-cols-2 gap-1 text-slate-600 dark:text-slate-400 font-mono">
                <div>Влад: <b className="text-[#3390ec]">vladpass</b></div>
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
        <div className="fixed bottom-3 inset-x-3 sm:inset-x-6 z-40 max-w-2xl mx-auto bg-white/98 dark:bg-[#17212b]/98 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 px-4 py-2.5 flex items-center justify-between animate-pop-in select-none backdrop-blur-md">
          <button
            type="button"
            onClick={handleDeleteSelectedAnimated}
            disabled={selectedMessageIds.size === 0}
            className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-500/10 disabled:opacity-30 cursor-pointer transition-colors"
            title="Удалить"
          >
            <IconTrash size={20} />
          </button>

          <span className="text-[13.5px] font-medium text-slate-800 dark:text-slate-200">
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
              className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer transition-colors"
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
              className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer transition-colors"
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
              className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors ml-1"
              title="Закрыть"
            >
              <IconX size={18} />
            </button>
          </div>
        </div>
      )}

      {/* 17. Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#17212b]/95 dark:bg-[#242f3d]/95 text-white px-4 py-2.5 rounded-full shadow-2xl text-xs font-medium backdrop-blur-md border border-white/10 animate-pop-in select-none flex items-center gap-3">
          <span>{toast.text}</span>
          {toast.actionLabel && toast.onAction && (
            <button
              type="button"
              onClick={() => {
                toast.onAction?.();
                setToast(null);
              }}
              className="text-[#3390ec] dark:text-[#70b1ff] font-bold hover:underline cursor-pointer pl-1 shrink-0"
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
