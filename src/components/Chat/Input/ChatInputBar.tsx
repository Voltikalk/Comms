import React from 'react';
import type { Message, UserId } from '../../../types';
import type { ActiveToken, MentionCandidate } from '../../../lib/mentions';
import { FormattingToolbar } from '../FormattingToolbar';
import { VoiceRecorderHUD } from '../../Audio/VoiceRecorderHUD';
import { VoicePreviewPlayer } from '../../Audio/VoicePreviewPlayer';
import { TelegramEmojiPickerModal } from '../../TelegramEmojiPickerModal';
import { TgsStickerPlayer } from '../../Stickers/TgsStickerPlayer';
import { USER_NAMES } from '../../../constants';
import {
  IconX,
  IconEdit,
  IconPaperclip,
  IconMoodSmile,
  IconCamera,
  IconChartBar,
  IconMicrophone,
  IconSend,
  IconCheck
} from '@tabler/icons-react';

const ROOM_AVATAR_COLORS: Record<string, string> = {
  vlad: 'bg-gradient-to-tr from-blue-500 to-indigo-600',
  anya: 'bg-gradient-to-tr from-rose-400 to-pink-500',
  sergey: 'bg-gradient-to-tr from-amber-500 to-orange-600',
  elena: 'bg-gradient-to-tr from-emerald-500 to-teal-600',
  alex: 'bg-gradient-to-tr from-purple-500 to-violet-600',
  family: 'bg-gradient-to-tr from-sky-400 to-blue-600',
  general: 'bg-gradient-to-tr from-violet-500 to-purple-600',
};

export interface ChatInputBarProps {
  selectedFile: any;
  onClearSelectedFile: () => void;
  editingMessage: Message | null;
  onCancelEditing: () => void;
  replyingToMessage: Message | null;
  onCancelReply: () => void;
  currentUser: UserId | null;
  getCleanMessageText: (msg: Message) => string;
  mentionState: ActiveToken | null;
  filteredMentions: MentionCandidate[];
  mentionCursor: number;
  setMentionCursor: (idx: number) => void;
  applyMention: (candidate: MentionCandidate) => void;
  quickStickerSuggestions: Array<{ id: string; title: string; url: string; emoji: string }>;
  onSendSticker: (sticker: any) => void;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (show: boolean) => void;
  onInsertEmoji: (emoji: string) => void;
  recordedVoicePreview: { url: string; duration: number; waveform: number[]; blob: Blob } | null;
  onCancelRecordedVoicePreview: () => void;
  onSendRecordedVoicePreview: () => void;
  isRecording: boolean;
  isVoiceLocked: boolean;
  isVoicePaused: boolean;
  recordTime: number;
  liveVolumeLevels: number[];
  voiceDragOffset: { x: number; y: number };
  onStopRecording: (action: 'send' | 'cancel' | 'preview') => void;
  onToggleVoicePause: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  inputText: string;
  onInputChange: (val: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onTextSelection: () => void;
  formattingToolbar: { isVisible: boolean; position: { top: number; left: number } } | null;
  applyFormatting: (tagOpen: string, tagClose: string) => void;
  onCloseFormattingToolbar: () => void;
  onStartVideoRecording: () => void;
  onOpenPollModal: () => void;
  inputActionMode: 'voice' | 'video';
  setInputActionMode: (mode: 'voice' | 'video') => void;
  onVoicePointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onVoicePointerMove: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onVoicePointerUp: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onSend: (e?: React.FormEvent) => void;
  showToast: (msg: string) => void;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  selectedFile,
  onClearSelectedFile,
  editingMessage,
  onCancelEditing,
  replyingToMessage,
  onCancelReply,
  currentUser,
  getCleanMessageText,
  mentionState,
  filteredMentions,
  mentionCursor,
  setMentionCursor,
  applyMention,
  quickStickerSuggestions,
  onSendSticker,
  showEmojiPicker,
  setShowEmojiPicker,
  onInsertEmoji,
  recordedVoicePreview,
  onCancelRecordedVoicePreview,
  onSendRecordedVoicePreview,
  isRecording,
  isVoiceLocked,
  isVoicePaused,
  recordTime,
  liveVolumeLevels,
  voiceDragOffset,
  onStopRecording,
  onToggleVoicePause,
  fileInputRef,
  onFileSelect,
  textareaRef,
  inputText,
  onInputChange,
  onKeyDown,
  onTextSelection,
  formattingToolbar,
  applyFormatting,
  onCloseFormattingToolbar,
  onStartVideoRecording,
  onOpenPollModal,
  inputActionMode,
  setInputActionMode,
  onVoicePointerDown,
  onVoicePointerMove,
  onVoicePointerUp,
  onSend,
  showToast,
}) => {
  return (
    <footer className="p-2 sm:p-3 relative z-10 w-full min-w-0 max-w-full">
      <div className="max-w-2xl mx-auto w-full min-w-0 max-w-full flex flex-col gap-1.5 relative">
        {/* 1. Selected File Preview Bar */}
        {selectedFile && (
          <div className="w-full bg-white/95 dark:bg-[#17212b]/95 backdrop-blur-md rounded-2xl p-2 sm:p-2.5 flex items-center justify-between shadow-xl border border-slate-200/80 dark:border-white/10 animate-pop-in">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              {selectedFile.type === 'image' ? (
                <img src={selectedFile.data} className="w-11 h-11 rounded-xl object-cover shadow-xs border border-slate-200/50 dark:border-white/10 shrink-0" alt="preview" />
              ) : selectedFile.type === 'video' ? (
                <div className="w-11 h-11 rounded-xl bg-black relative overflow-hidden flex items-center justify-center shrink-0 shadow-xs border border-slate-200/50 dark:border-white/10">
                  <video src={selectedFile.data} className="w-full h-full object-cover" muted playsInline />
                  <span className="absolute bottom-0.5 right-0.5 text-[8px] bg-black/80 text-white px-1 rounded-xs font-mono font-bold">
                    {selectedFile.orientation === 'vertical' ? '9:16' : '16:9'}
                  </span>
                </div>
              ) : selectedFile.type === 'audio' ? (
                <div className="w-11 h-11 rounded-xl bg-[#3390ec] flex items-center justify-center text-white text-lg shadow-xs shrink-0">
                  🎤
                </div>
              ) : (
                <div className="w-11 h-11 rounded-xl bg-slate-200 dark:bg-white/10 text-[#3390ec] flex items-center justify-center text-lg shadow-xs shrink-0">
                  📄
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white truncate block">{selectedFile.name}</span>
                  {selectedFile.type === 'video' && selectedFile.orientation === 'vertical' && (
                    <span className="text-[9px] bg-[#3390ec]/20 text-[#3390ec] font-medium px-1 rounded-xs shrink-0">📱 Вертикальное</span>
                  )}
                </div>
                <span className="text-[10.5px] text-slate-400 dark:text-slate-500 font-mono block">
                  {selectedFile.size > 1024 * 1024 
                    ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} МБ` 
                    : `${(selectedFile.size / 1024).toFixed(1)} КБ`}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClearSelectedFile}
              className="p-1.5 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors shrink-0"
              title="Удалить прикрепленный файл"
            >
              <IconX size={18} />
            </button>
          </div>
        )}

        {/* 2. Editing Message Bar */}
        {editingMessage && (
          <div className="w-full bg-white/95 dark:bg-[#17212b]/95 backdrop-blur-xl rounded-2xl p-2 sm:p-2.5 flex items-center justify-between shadow-xl border-l-[3.5px] border-[#3390ec] border border-slate-200/80 dark:border-white/10 animate-pop-in">
            <div className="min-w-0 pl-1 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#3390ec]/15 flex items-center justify-center text-[#3390ec] shrink-0">
                <IconEdit size={16} stroke={2.4} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-bold text-[#3390ec] block leading-tight">
                    Редактирование
                  </span>
                </div>
                <span className="text-xs text-slate-700 dark:text-slate-300 truncate block mt-0.5 max-w-[280px] sm:max-w-md">
                  {editingMessage.text}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancelEditing}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors shrink-0"
              title="Отменить редактирование (Esc)"
            >
              <IconX size={16} />
            </button>
          </div>
        )}

        {/* 3. Reply Quote Bar */}
        {replyingToMessage && (
          <div className="w-full bg-white/95 dark:bg-[#17212b]/95 backdrop-blur-md rounded-2xl p-2 sm:p-2.5 flex items-center justify-between shadow-xl border-l-[4px] border-[#3390ec] border-slate-200/80 dark:border-white/10 animate-pop-in">
            <div className="min-w-0 pl-1">
              <span className="text-[11px] font-bold text-[#3390ec] block">
                Ответ для: {replyingToMessage.sender === currentUser ? 'Вы' : (USER_NAMES[replyingToMessage.sender] || replyingToMessage.sender)}
              </span>
              <span className="text-xs text-slate-700 dark:text-slate-300 truncate block mt-0.5">
                {getCleanMessageText(replyingToMessage)}
              </span>
            </div>
            <button
              type="button"
              onClick={onCancelReply}
              className="p-1.5 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
              title="Отменить ответ"
            >
              <IconX size={16} />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2 relative w-full">
          {/* @Mention Autocomplete Popup */}
          {mentionState && mentionState.type === 'mention' && filteredMentions.length > 0 && !showEmojiPicker && (
            <div className="absolute bottom-full left-0 right-0 mb-2 z-40 animate-pop-in">
              <div
                className="p-1.5 bg-white/95 dark:bg-[#17212b]/95 rounded-2xl shadow-xl border border-slate-200 dark:border-white/10 backdrop-blur-md select-none"
                onMouseDown={(e) => e.preventDefault()}
              >
                {filteredMentions.map((candidate, index) => (
                  <button
                    key={`mention-${candidate.userId}`}
                    type="button"
                    onClick={() => applyMention(candidate)}
                    onMouseEnter={() => setMentionCursor(index)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer transition-colors text-left ${
                      index === mentionCursor
                        ? 'bg-[#3390ec]/10 dark:bg-[#3390ec]/20'
                        : 'hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${ROOM_AVATAR_COLORS[candidate.userId] || 'bg-slate-500'}`}>
                      {(candidate.profile?.avatarUrl)
                        ? <img src={candidate.profile.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                        : candidate.displayName.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold text-slate-900 dark:text-white truncate leading-tight">
                        {candidate.displayName}
                      </span>
                      <span className="block text-[12px] text-[#3390ec] truncate leading-tight">
                        @{candidate.profile?.username || candidate.userId}
                      </span>
                    </span>
                    {index === mentionCursor && (
                      <span className="text-[10px] font-bold text-slate-400 shrink-0 hidden sm:block">Tab ⏎</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Emoji-to-Sticker Floating Bar */}
          {quickStickerSuggestions.length > 0 && !showEmojiPicker && (
            <div className="absolute bottom-full left-0 right-0 mb-2 z-30 animate-pop-in">
              <div className="p-2 bg-white/95 dark:bg-[#17212b]/95 rounded-2xl shadow-xl border border-slate-200 dark:border-white/10 flex items-center gap-2 overflow-x-auto tg-scrollbar select-none backdrop-blur-md">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1.5 shrink-0 flex items-center gap-1">
                  <span>✨</span>
                  <span>Стикеры:</span>
                </span>
                {quickStickerSuggestions.slice(0, 12).map((sticker) => (
                  <button
                    key={`quick-${sticker.id}`}
                    type="button"
                    onClick={() => onSendSticker(sticker)}
                    className="w-11 h-11 p-1 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 shrink-0 cursor-pointer transition-transform hover:scale-115 active:scale-95 flex items-center justify-center"
                    title={`${sticker.title} (${sticker.emoji})`}
                  >
                    <TgsStickerPlayer
                      src={sticker.url}
                      alt={sticker.title}
                      className="w-full h-full"
                      loop={true}
                      autoplay={true}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Emoji Popup Anchored Right Above Input Bar */}
          {showEmojiPicker && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowEmojiPicker(false)} 
              />
              <div 
                className="absolute bottom-full right-0 sm:right-12 mb-2.5 z-50 animate-pop-in max-w-[calc(100vw-24px)]"
                onClick={(e) => e.stopPropagation()}
              >
                <TelegramEmojiPickerModal
                  onSelectEmoji={(emoji) => onInsertEmoji(emoji)}
                  onSelectSticker={(sticker) => onSendSticker(sticker)}
                  onClose={() => setShowEmojiPicker(false)}
                />
              </div>
            </>
          )}

          {/* Input Capsule or Active Voice Recorder / Preview HUD */}
          {recordedVoicePreview ? (
            <VoicePreviewPlayer
              audioUrl={recordedVoicePreview.url}
              duration={recordedVoicePreview.duration}
              waveform={recordedVoicePreview.waveform}
              onCancel={onCancelRecordedVoicePreview}
              onSend={onSendRecordedVoicePreview}
            />
          ) : isRecording ? (
            <VoiceRecorderHUD
              isRecording={isRecording}
              isLocked={isVoiceLocked}
              isPaused={isVoicePaused}
              recordTime={recordTime}
              liveVolumeLevels={liveVolumeLevels}
              dragOffset={voiceDragOffset}
              onCancel={() => onStopRecording('cancel')}
              onTogglePause={onToggleVoicePause}
              onStopAndPreview={() => onStopRecording('preview')}
              onSend={() => onStopRecording('send')}
            />
          ) : (
            <form onSubmit={onSend} className="flex-1 min-w-0 flex items-center min-h-[44px] sm:min-h-[46px] px-1.5 py-1 rounded-[22px] tg-input-capsule">
              <input
                type="file"
                ref={fileInputRef as any}
                onChange={onFileSelect}
                className="hidden"
              />

              {/* Clip */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-[#3390ec] cursor-pointer shrink-0 transition-colors rounded-full"
                title="Прикрепить"
              >
                <IconPaperclip size={20} />
              </button>

              <textarea
                ref={textareaRef as any}
                rows={1}
                value={inputText}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={onKeyDown}
                onSelect={onTextSelection}
                onMouseUp={onTextSelection}
                onKeyUp={onTextSelection}
                placeholder="Сообщение..."
                className="flex-1 py-0.5 px-2 bg-transparent border-none text-slate-900 dark:text-white text-[15px] focus:outline-none focus:ring-0 placeholder-slate-400 resize-none max-h-[160px] leading-[22px] tg-scrollbar self-center"
                style={{ minHeight: '22px', height: '22px' }}
              />

              {/* Floating Text Formatting Toolbar */}
              {formattingToolbar && (
                <FormattingToolbar
                  isVisible={formattingToolbar.isVisible}
                  position={formattingToolbar.position}
                  onApplyFormat={applyFormatting}
                  onClose={onCloseFormattingToolbar}
                />
              )}

              {/* Emoji */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-[#3390ec] cursor-pointer shrink-0 transition-colors rounded-full"
                title="Эмодзи"
              >
                <IconMoodSmile size={20} />
              </button>

              {/* Video Note Circle Direct Trigger */}
              <button
                type="button"
                onClick={onStartVideoRecording}
                className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-[#3390ec] cursor-pointer shrink-0 transition-colors rounded-full"
                title="Видео-кружок"
              >
                <IconCamera size={20} />
              </button>

              {/* Poll */}
              <button
                type="button"
                onClick={onOpenPollModal}
                className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-[#3390ec] cursor-pointer shrink-0 transition-colors rounded-full"
                title="Создать опрос"
              >
                <IconChartBar size={20} />
              </button>
            </form>
          )}

          {/* Blue Circle Action Button (Mic / Video / Send / Checkmark) */}
          {!inputText.trim() && !selectedFile && !isRecording && !recordedVoicePreview ? (
            inputActionMode === 'voice' ? (
              <button
                type="button"
                onPointerDown={onVoicePointerDown}
                onPointerMove={onVoicePointerMove}
                onPointerUp={onVoicePointerUp}
                onPointerCancel={onVoicePointerUp}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setInputActionMode('video');
                  showToast('Режим переключен на Видео-кружок');
                }}
                style={{ touchAction: 'none' }}
                className="w-[44px] h-[44px] sm:w-[46px] sm:h-[46px] rounded-full tg-btn-primary flex items-center justify-center shrink-0 shadow-md cursor-pointer transition-transform active:scale-95 relative group select-none"
                title="Удерживайте для записи голоса (свайп вверх — замочек, влево — отмена, правый клик — кружок)"
              >
                <IconMicrophone size={20} />
              </button>
            ) : (
              <button
                type="button"
                onClick={onStartVideoRecording}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setInputActionMode('voice');
                  showToast('Режим переключен на Голосовое');
                }}
                className="w-[44px] h-[44px] sm:w-[46px] sm:h-[46px] rounded-full tg-btn-primary flex items-center justify-center shrink-0 shadow-md cursor-pointer transition-transform active:scale-95 relative group"
                title="Записать видео-кружок (правый клик: голосовое)"
              >
                <IconCamera size={20} />
              </button>
            )
          ) : isRecording && !isVoiceLocked ? (
            <button
              type="button"
              onPointerMove={onVoicePointerMove}
              onPointerUp={onVoicePointerUp}
              onPointerCancel={onVoicePointerUp}
              onClick={() => onStopRecording('send')}
              style={{ touchAction: 'none' }}
              className="w-[44px] h-[44px] sm:w-[46px] sm:h-[46px] rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-md cursor-pointer transition-transform active:scale-95"
              title="Отпустить для отправки"
            >
              <IconSend size={20} />
            </button>
          ) : !isRecording && !recordedVoicePreview ? (
            <button
              type="button"
              onClick={() => onSend()}
              className="w-[44px] h-[44px] sm:w-[46px] sm:h-[46px] rounded-full tg-btn-primary flex items-center justify-center shrink-0 shadow-md cursor-pointer transition-transform active:scale-95"
              title={editingMessage ? 'Сохранить изменения (Enter)' : 'Отправить'}
            >
              {editingMessage ? (
                <IconCheck size={22} stroke={2.6} />
              ) : (
                <IconSend size={20} />
              )}
            </button>
          ) : null}
        </div>
      </div>
    </footer>
  );
};

export default ChatInputBar;
