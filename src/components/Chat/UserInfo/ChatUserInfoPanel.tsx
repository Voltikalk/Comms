import React from 'react';
import type { Room, UserId, UserProfile, Message } from '../../../types';
import {
  IconChevronLeft,
  IconX,
  IconEdit,
  IconBellOff,
  IconPhoneCall,
  IconUserCheck,
  IconFileText,
  IconBell,
  IconUsers
} from '@tabler/icons-react';

export interface ChatUserInfoPanelProps {
  onClose: () => void;
  activeRoom: Room | null;
  activePeerId: UserId | null;
  activePeerProfile: UserProfile | null;
  activePeerAvatar: string | undefined;
  isPeerOnline: boolean;
  currentUser: UserId | null;
  getRoomDisplayName: (room: Room) => string;
  getRoomColor: (room: Room) => string;
  onOpenProfileModal: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  sharedMediaMessages: Message[];
  onOpenGalleryMedia: (msgId: string) => void;
}

export const ChatUserInfoPanel: React.FC<ChatUserInfoPanelProps> = ({
  onClose,
  activeRoom,
  activePeerId,
  activePeerProfile,
  activePeerAvatar,
  isPeerOnline,
  currentUser,
  getRoomDisplayName,
  getRoomColor,
  onOpenProfileModal,
  isMuted,
  onToggleMute,
  notificationsEnabled,
  setNotificationsEnabled,
  sharedMediaMessages,
  onOpenGalleryMedia,
}) => {
  return (
    <>
      {/* Mobile Dark Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden animate-fade-in"
        onClick={onClose}
      />

      <aside className="fixed inset-0 z-50 w-full h-full md:relative md:inset-auto md:w-80 md:z-20 tg-user-panel flex flex-col shrink-0 overflow-y-auto shadow-2xl md:shadow-none animate-slide-in-right md:animate-pop-in">
        {/* Header */}
        <div className="p-3.5 sm:p-4 flex items-center justify-between border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-[#17212b]/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] min-w-[40px] p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 cursor-pointer flex items-center justify-center transition-all touch-manipulation"
              title="Закрыть"
            >
              <IconChevronLeft size={22} className="md:hidden" />
              <IconX size={20} className="hidden md:block" />
            </button>
            <h3 className="text-base sm:text-sm font-bold text-slate-900 dark:text-white m-0">
              Информация
            </h3>
          </div>
        </div>

        {/* Profile Card */}
        <div className="p-6 sm:p-5 flex flex-col items-center text-center border-b border-slate-200 dark:border-white/5">
          <div className="relative mb-3.5 sm:mb-3">
            {activePeerAvatar ? (
              <img 
                src={activePeerAvatar} 
                alt="Avatar" 
                className="w-28 h-28 sm:w-24 sm:h-24 rounded-full object-cover shadow-lg ring-4 ring-[#3390ec]/20" 
              />
            ) : (
              <div className={`w-28 h-28 sm:w-24 sm:h-24 rounded-full ${activeRoom ? getRoomColor(activeRoom) : 'bg-[#3390ec]'} text-white flex items-center justify-center text-4xl sm:text-3xl font-bold shadow-lg ring-4 ring-[#3390ec]/20`}>
                {activeRoom ? (activeRoom.type === 'group' ? <IconUsers size={44} /> : getRoomDisplayName(activeRoom).charAt(0)) : '?'}
              </div>
            )}
            {activePeerProfile?.statusEmoji && (
              <span className="absolute -bottom-1 -right-1 w-8 h-8 sm:w-7 sm:h-7 rounded-full bg-white dark:bg-[#17212b] shadow-md flex items-center justify-center text-base sm:text-sm border-2 border-white dark:border-[#17212b]">
                {activePeerProfile.statusEmoji}
              </span>
            )}
          </div>

          <h2 className="text-lg sm:text-base font-bold text-slate-900 dark:text-white m-0 flex items-center gap-1.5 justify-center">
            <span>{activeRoom ? getRoomDisplayName(activeRoom) : ''}</span>
            {activePeerProfile?.statusEmoji && (
              <span className="text-base sm:text-sm">{activePeerProfile.statusEmoji}</span>
            )}
          </h2>
          <span className="text-xs sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-0.5">
            {activePeerId ? (isPeerOnline ? 'в сети' : 'был(а) недавно') : `${activeRoom?.participants.length || 0} участников`}
          </span>

          {/* Edit Profile button if viewing own profile */}
          {activePeerId === currentUser && (
            <button
              type="button"
              onClick={onOpenProfileModal}
              className="mt-3.5 sm:mt-3 px-5 sm:px-4 py-2 sm:py-1.5 rounded-full bg-[#3390ec]/10 text-[#3390ec] hover:bg-[#3390ec]/20 active:scale-95 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 touch-manipulation"
            >
              <IconEdit size={16} />
              <span>Изменить профиль</span>
            </button>
          )}
        </div>

        {/* Per-Chat Notifications (Mute) */}
        {activeRoom && (
          <div className="px-4 sm:px-3 py-2.5 border-b border-slate-200 dark:border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isMuted ? 'bg-rose-500/10' : 'bg-slate-100 dark:bg-white/5'}`}>
                  <IconBellOff size={18} className={isMuted ? 'text-rose-500' : 'text-[#3390ec]'} />
                </div>
                <span className="text-slate-900 dark:text-white font-medium text-sm">Без звука</span>
              </div>
              <input
                type="checkbox"
                checked={isMuted}
                onChange={onToggleMute}
                className="w-10 h-5 appearance-none rounded-full bg-slate-300 dark:bg-white/15 checked:bg-[#3390ec] relative cursor-pointer transition-colors before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:w-4 before:h-4 before:rounded-full before:bg-white before:shadow-xs before:transition-transform checked:before:translate-x-5"
              />
            </div>
          </div>
        )}

        {/* Details List */}
        <div className="p-5 sm:p-4 space-y-4 sm:space-y-4 text-sm sm:text-xs">
          {activePeerId && (
            <>
              {/* Phone */}
              <div className="flex items-center gap-3.5 sm:gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                  <IconPhoneCall size={18} className="text-[#3390ec]" />
                </div>
                <div>
                  <span className="text-slate-900 dark:text-white font-medium block text-sm sm:text-xs">
                    {activePeerProfile?.phoneNumber || '+7 (999) 000-00-00'}
                  </span>
                  <span className="text-[11px] sm:text-[10px] text-slate-400">Телефон</span>
                </div>
              </div>

              {/* Username */}
              <div className="flex items-center gap-3.5 sm:gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                  <IconUserCheck size={18} className="text-[#3390ec]" />
                </div>
                <div>
                  <span className="text-slate-900 dark:text-white font-medium block text-sm sm:text-xs">
                    @{activePeerProfile?.username || activePeerId}
                  </span>
                  <span className="text-[11px] sm:text-[10px] text-slate-400">Имя пользователя</span>
                </div>
              </div>

              {/* Bio */}
              {activePeerProfile?.bio && (
                <div className="flex items-center gap-3.5 sm:gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                    <IconFileText size={18} className="text-[#3390ec]" />
                  </div>
                  <div>
                    <span className="text-slate-900 dark:text-white font-medium block text-sm sm:text-xs">
                      {activePeerProfile.bio}
                    </span>
                    <span className="text-[11px] sm:text-[10px] text-slate-400">О себе</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Notifications Toggle */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-3.5 sm:gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                <IconBell size={18} className="text-[#3390ec]" />
              </div>
              <span className="text-slate-900 dark:text-white font-medium text-sm sm:text-xs">Уведомления</span>
            </div>
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={(e) => setNotificationsEnabled(e.target.checked)}
              className="w-5 h-5 sm:w-4 sm:h-4 text-[#3390ec] rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Shared Media Section */}
        <div className="flex-1 p-5 sm:p-4 border-t border-slate-100 dark:border-white/5 overflow-y-auto">
          <span className="text-xs sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
            Общие медиа
          </span>
          {sharedMediaMessages.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:gap-1.5">
              {sharedMediaMessages.slice(-9).map((m) => (
                <img
                  key={m.id}
                  src={m.file?.data}
                  alt="shared"
                  onClick={() => onOpenGalleryMedia(m.id)}
                  className="w-full aspect-square object-cover rounded-xl sm:rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                />
              ))}
            </div>
          ) : (
            <span className="text-xs text-slate-400 italic">Нет медиафайлов</span>
          )}
        </div>
      </aside>
    </>
  );
};

export default ChatUserInfoPanel;
