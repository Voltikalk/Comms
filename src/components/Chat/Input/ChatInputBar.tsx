import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Message, UserId } from '../../../types';
import type { ActiveToken, MentionCandidate } from '../../../lib/mentions';
import { FormattingToolbar } from '../FormattingToolbar';
import { VoiceRecorderHUD } from '../../Audio/VoiceRecorderHUD';
import { VoicePreviewPlayer } from '../../Audio/VoicePreviewPlayer';
import { TelegramEmojiPickerModal } from '../../TelegramEmojiPickerModal';
import { TgsStickerPlayer } from '../../Stickers/TgsStickerPlayer';
import { ROOM_AVATAR_COLORS } from '../../../constants';
import { useRooms, type OutgoingFile, type SendOptions } from '../../../context/contexts';
import { describeAttachments } from '../../../lib/outgoing-batch';
import { SendButton } from './SendButton';
import { ScheduledMessagesButton } from './ScheduledMessagesButton';
import {
  IconArrowBackUp,
  IconCamera,
  IconChartBar,
  IconFile,
  IconMicrophone,
  IconMoodSmile,
  IconPaperclip,
  IconPencil,
  IconPhoto,
  IconPlus,
  IconPlayerPlayFilled,
  IconSend,
  IconX,
} from '@tabler/icons-react';

const formatBytes = (bytes: number) =>
  bytes > 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} МБ` : `${Math.max(1, Math.round(bytes / 1024))} КБ`;

export interface ChatInputBarProps {
  /** Pending attachments; photos / videos are sent as one album. */
  selectedFiles: OutgoingFile[];
  onRemoveSelectedFile: (data: string) => void;
  onClearSelectedFiles: () => void;
  /** Files pasted into the text field (clipboard screenshots, copied files). */
  onAddFiles: (files: File[]) => void;
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
  onEmojiBackspace: () => void;
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
  onOpenPollModal: () => void;
  inputActionMode: 'voice' | 'video';
  setInputActionMode: (mode: 'voice' | 'video') => void;
  onVoicePointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onVoicePointerMove: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onVoicePointerUp: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onSend: (e?: React.FormEvent, options?: SendOptions) => void;
  /** Group permissions: why media / polls can't be sent here (hidden from the attach menu). */
  mediaRestriction?: string | null;
  pollRestriction?: string | null;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  selectedFiles,
  onRemoveSelectedFile,
  onClearSelectedFiles,
  onAddFiles,
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
  onEmojiBackspace,
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
  onOpenPollModal,
  inputActionMode,
  setInputActionMode,
  onVoicePointerDown,
  onVoicePointerMove,
  onVoicePointerUp,
  onSend,
  mediaRestriction,
  pollRestriction,
}) => {
  const { getUserDisplayName } = useRooms();
  const [attachOpen, setAttachOpen] = useState(false);
  const attachRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!attachOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!attachRef.current?.contains(e.target as Node)) setAttachOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setAttachOpen(false);
      }
    };
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [attachOpen]);

  const pickFile = (accept: string) => {
    setAttachOpen(false);
    const input = fileInputRef.current;
    if (!input) return;
    if (accept) input.setAttribute('accept', accept);
    else input.removeAttribute('accept');
    input.click();
  };

  const attachItems = [
    ...(mediaRestriction
      ? []
      : [
          { key: 'media', label: 'Фото или видео', icon: <IconPhoto size={20} />, onSelect: () => pickFile('image/*,video/*') },
          { key: 'file', label: 'Файл', icon: <IconFile size={20} />, onSelect: () => pickFile('') },
        ]),
    ...(pollRestriction
      ? []
      : [{ key: 'poll', label: 'Опрос', icon: <IconChartBar size={20} />, onSelect: () => { setAttachOpen(false); onOpenPollModal(); } }]),
  ];

  // Context strip above the text: editing wins over reply, file preview is shown separately.
  const context = editingMessage
    ? {
        key: `edit-${editingMessage.id}`,
        icon: <IconPencil size={20} />,
        title: 'Редактирование',
        text: getCleanMessageText(editingMessage) || editingMessage.text,
        onClose: onCancelEditing,
        closeLabel: 'Отменить редактирование',
      }
    : replyingToMessage
      ? {
          key: `reply-${replyingToMessage.id}`,
          icon: <IconArrowBackUp size={20} />,
          title: `В ответ ${replyingToMessage.sender === currentUser ? 'себе' : getUserDisplayName(replyingToMessage.sender)}`,
          text: getCleanMessageText(replyingToMessage),
          onClose: onCancelReply,
          closeLabel: 'Отменить ответ',
        }
      : null;

  const showActionSlot = !isRecording && !recordedVoicePreview;
  const hasPayload = Boolean(inputText.trim() || selectedFiles.length > 0);
  const singleFile = selectedFiles.length === 1 ? selectedFiles[0] : null;
  const mediaCount = selectedFiles.filter((f) => f.type === 'image' || f.type === 'video').length;
  const actionClass =
    'flex h-12 w-12 shrink-0 select-none items-center justify-center rounded-full shadow-md transition-transform active:scale-95 cursor-pointer';

  return (
    <footer
      className="relative z-10 w-full min-w-0 max-w-full px-2 pt-2 sm:px-3"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0.5rem))' }}
    >
      <div className="relative mx-auto flex w-full min-w-0 max-w-2xl items-end gap-2">
        {/* @mention autocomplete */}
        {mentionState && mentionState.type === 'mention' && filteredMentions.length > 0 && !showEmojiPicker && (
          <div className="absolute inset-x-0 bottom-full z-40 mb-2 animate-pop-in">
            <div
              className="max-h-64 select-none overflow-y-auto rounded-2xl bg-elevated/95 p-1.5 shadow-xl ring-1 ring-line backdrop-blur-xl tg-scrollbar"
              onMouseDown={(e) => e.preventDefault()}
            >
              {filteredMentions.map((candidate, index) => (
                <button
                  key={`mention-${candidate.userId}`}
                  type="button"
                  onClick={() => applyMention(candidate)}
                  onMouseEnter={() => setMentionCursor(index)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors cursor-pointer ${
                    index === mentionCursor ? 'bg-accent-muted' : 'hover:bg-ink/[0.05]'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold text-white ${
                      ROOM_AVATAR_COLORS[candidate.userId] || 'bg-zinc-500'
                    }`}
                  >
                    {candidate.profile?.avatarUrl ? (
                      <img src={candidate.profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      candidate.displayName.slice(0, 1).toUpperCase()
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold leading-tight text-ink">{candidate.displayName}</span>
                    <span className="block truncate text-[12px] leading-tight text-muted">
                      @{candidate.profile?.username || candidate.userId}
                    </span>
                  </span>
                  {index === mentionCursor && (
                    <span className="hidden shrink-0 text-[10px] font-bold text-muted sm:block">Tab ⏎</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Emoji → sticker suggestions */}
        {quickStickerSuggestions.length > 0 && !showEmojiPicker && (
          <div className="absolute inset-x-0 bottom-full z-30 mb-2 animate-pop-in">
            <div className="flex select-none items-center gap-1 overflow-x-auto rounded-2xl bg-elevated/95 p-1.5 shadow-xl ring-1 ring-line backdrop-blur-xl [scrollbar-width:none]">
              {quickStickerSuggestions.slice(0, 12).map((sticker) => (
                <button
                  key={`quick-${sticker.id}`}
                  type="button"
                  onClick={() => onSendSticker(sticker)}
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl p-1 transition-transform hover:scale-110 hover:bg-ink/[0.05] active:scale-95 cursor-pointer"
                  title={`${sticker.title} (${sticker.emoji})`}
                >
                  <TgsStickerPlayer src={sticker.url} alt={sticker.title} className="h-full w-full" loop autoplay />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Emoji & sticker picker */}
        {showEmojiPicker && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
            <div
              className="absolute bottom-full left-0 z-50 mb-2.5 max-w-[calc(100vw-16px)] animate-pop-in"
              onClick={(e) => e.stopPropagation()}
            >
              <TelegramEmojiPickerModal
                onSelectEmoji={(emoji) => onInsertEmoji(emoji)}
                onBackspace={onEmojiBackspace}
                onSelectSticker={(sticker) => onSendSticker(sticker)}
                onClose={() => setShowEmojiPicker(false)}
              />
            </div>
          </>
        )}

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
          <form onSubmit={onSend} className="tg-input-capsule relative flex min-w-0 flex-1 flex-col !rounded-[24px]">
            <input type="file" multiple ref={fileInputRef} onChange={onFileSelect} className="hidden" />

            {/* Reply / edit strip */}
            <AnimatePresence initial={false}>
              {context && (
                <motion.div
                  key={context.key}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.16, ease: [0.2, 0.9, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 pl-3 pr-1.5 pt-1.5">
                    <span className="shrink-0 text-accent">{context.icon}</span>
                    <div className="min-w-0 flex-1 border-l-2 border-accent pl-2">
                      <div className="truncate text-[13px] font-semibold leading-tight text-accent">{context.title}</div>
                      <div className="truncate text-[13px] leading-snug text-muted">{context.text || 'Сообщение'}</div>
                    </div>
                    <button
                      type="button"
                      onClick={context.onClose}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink cursor-pointer"
                      aria-label={context.closeLabel}
                      title={context.closeLabel}
                    >
                      <IconX size={18} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Attached file */}
            {singleFile && (
              <div className="flex items-center gap-2.5 pl-2 pr-1.5 pt-1.5 animate-pop-in">
                <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent-muted text-accent">
                  <AttachmentThumb file={singleFile} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold leading-tight text-ink">{singleFile.name}</div>
                  <div className="text-[12px] leading-snug text-muted">
                    {singleFile.type === 'image' ? 'Фото' : singleFile.type === 'video' ? 'Видео' : 'Файл'}
                    {typeof singleFile.size === 'number' && ` · ${formatBytes(singleFile.size)}`}
                  </div>
                </div>
                {!mediaRestriction && (
                  <button
                    type="button"
                    onClick={() => pickFile('')}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink cursor-pointer"
                    aria-label="Добавить ещё файлы"
                    title="Добавить ещё"
                  >
                    <IconPlus size={18} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClearSelectedFiles}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink cursor-pointer"
                  aria-label="Убрать вложение"
                  title="Убрать вложение"
                >
                  <IconX size={18} />
                </button>
              </div>
            )}

            {/* Several attachments: thumbnail strip, photos / videos go out as one album */}
            {selectedFiles.length > 1 && (
              <div className="pt-1.5 animate-pop-in">
                <div className="flex items-center gap-2 pl-3 pr-1.5">
                  <div className="min-w-0 flex-1 truncate text-[13px] leading-tight">
                    <span className="font-semibold text-accent">{describeAttachments(selectedFiles)}</span>
                    {mediaCount > 1 && <span className="text-muted"> · альбомом</span>}
                  </div>
                  <button
                    type="button"
                    onClick={onClearSelectedFiles}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink cursor-pointer"
                    aria-label="Убрать все вложения"
                    title="Убрать все"
                  >
                    <IconX size={18} />
                  </button>
                </div>
                <ul className="no-scrollbar flex gap-1.5 overflow-x-auto px-2 pb-0.5 pt-1" aria-label="Вложения">
                  {selectedFiles.map((file) => (
                    <li key={file.data} className="group relative h-16 w-16 shrink-0 animate-pop-in">
                      <span
                        className="flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-xl bg-accent-muted text-accent"
                        title={`${file.name} · ${formatBytes(file.size)}`}
                      >
                        <AttachmentThumb file={file} showExtension />
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemoveSelectedFile(file.data)}
                        className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-transform hover:scale-110 cursor-pointer"
                        aria-label={`Убрать ${file.name}`}
                        title="Убрать"
                      >
                        <IconX size={12} stroke={2.6} />
                      </button>
                    </li>
                  ))}
                  {!mediaRestriction && (
                    <li className="h-16 w-16 shrink-0">
                      <button
                        type="button"
                        onClick={() => pickFile('')}
                        className="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-line text-muted transition-colors hover:border-accent hover:text-accent cursor-pointer"
                        aria-label="Добавить ещё файлы"
                        title="Добавить ещё"
                      >
                        <IconPlus size={22} />
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Emoji · text · scheduled · attach */}
            <div className="flex items-end px-1">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`flex h-[46px] w-10 shrink-0 items-center justify-center rounded-full transition-colors cursor-pointer ${
                  showEmojiPicker ? 'text-accent' : 'text-muted hover:text-ink'
                }`}
                title="Эмодзи и стикеры"
                aria-label="Эмодзи и стикеры"
                aria-expanded={showEmojiPicker}
              >
                <IconMoodSmile size={24} stroke={1.8} />
              </button>

              <textarea
                ref={textareaRef}
                rows={1}
                value={inputText}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={onKeyDown}
                onPaste={(e) => {
                  const files = Array.from(e.clipboardData?.files ?? []);
                  if (files.length === 0) return;
                  e.preventDefault();
                  onAddFiles(files);
                }}
                onSelect={onTextSelection}
                onMouseUp={onTextSelection}
                onKeyUp={onTextSelection}
                placeholder="Сообщение"
                aria-label="Сообщение"
                className="my-[11px] max-h-[160px] min-w-0 flex-1 resize-none border-none bg-transparent px-1.5 py-0 text-[16px] leading-[24px] text-ink placeholder:text-muted focus:outline-none tg-scrollbar"
                style={{ minHeight: '24px', height: '24px' }}
              />

              {formattingToolbar && (
                <FormattingToolbar
                  isVisible={formattingToolbar.isVisible}
                  position={formattingToolbar.position}
                  onApplyFormat={applyFormatting}
                  onClose={onCloseFormattingToolbar}
                />
              )}

              <div className="flex h-[46px] shrink-0 items-center">
                <ScheduledMessagesButton />
              </div>

              {attachItems.length > 0 && (
              <div ref={attachRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setAttachOpen((v) => !v)}
                  className={`flex h-[46px] w-10 items-center justify-center rounded-full transition-colors cursor-pointer ${
                    attachOpen ? 'text-accent' : 'text-muted hover:text-ink'
                  }`}
                  title="Прикрепить"
                  aria-label="Прикрепить"
                  aria-haspopup="menu"
                  aria-expanded={attachOpen}
                >
                  <IconPaperclip size={23} stroke={1.8} className={`transition-transform ${attachOpen ? 'rotate-45' : ''}`} />
                </button>
                <AnimatePresence>
                  {attachOpen && (
                    <motion.div
                      role="menu"
                      initial={{ opacity: 0, scale: 0.9, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 8 }}
                      transition={{ duration: 0.14, ease: [0.2, 0.9, 0.3, 1] }}
                      className="absolute bottom-[54px] right-0 z-50 min-w-[210px] origin-bottom-right rounded-xl bg-elevated/95 p-1 shadow-2xl ring-1 ring-line backdrop-blur-xl"
                    >
                      {attachItems.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          role="menuitem"
                          onClick={item.onSelect}
                          className="flex w-full items-center gap-3.5 rounded-lg px-3 py-2.5 text-left text-[14.5px] font-medium text-ink transition-colors hover:bg-ink/[0.06] cursor-pointer"
                        >
                          <span className="text-muted">{item.icon}</span>
                          {item.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              )}
            </div>
          </form>
        )}

        {/* Mic / video note / send */}
        {showActionSlot && !hasPayload && !mediaRestriction ? (
          // Like Telegram: a tap switches voice <-> video note, press-and-hold records.
          <button
            type="button"
            onPointerDown={onVoicePointerDown}
            onPointerMove={onVoicePointerMove}
            onPointerUp={onVoicePointerUp}
            onPointerCancel={onVoicePointerUp}
            onClick={(e) => {
              // Keyboard activation (Enter / Space) has no pointer sequence.
              if (e.detail === 0) setInputActionMode(inputActionMode === 'voice' ? 'video' : 'voice');
            }}
            onContextMenu={(e) => e.preventDefault()}
            style={{ touchAction: 'none' }}
            className={`${actionClass} tg-btn-primary relative overflow-hidden`}
            title={
              inputActionMode === 'voice'
                ? 'Удерживайте для записи голосового (вверх — без рук, влево — отмена). Нажмите — видеосообщение'
                : 'Удерживайте для записи видеосообщения (вверх — без рук, влево — отмена). Нажмите — голосовое'
            }
            aria-label={inputActionMode === 'voice' ? 'Голосовое сообщение' : 'Видеосообщение'}
          >
            <span className="tg-icon-swap flex items-center justify-center">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                key={inputActionMode}
                initial={{ scale: 0.4, opacity: 0, rotate: -45 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.4, opacity: 0, rotate: 45 }}
                transition={{ duration: 0.16 }}
                className="flex items-center justify-center"
              >
                {inputActionMode === 'voice' ? <IconMicrophone size={24} stroke={1.9} /> : <IconCamera size={24} stroke={1.9} />}
              </motion.span>
            </AnimatePresence>
            </span>
          </button>
        ) : isRecording && !isVoiceLocked ? (
          <button
            type="button"
            onPointerMove={onVoicePointerMove}
            onPointerUp={onVoicePointerUp}
            onPointerCancel={onVoicePointerUp}
            onClick={() => onStopRecording('send')}
            style={{ touchAction: 'none' }}
            className={`${actionClass} bg-accent text-white hover:bg-accent-strong`}
            title="Отпустите, чтобы отправить"
            aria-label="Отправить голосовое"
          >
            <IconSend size={22} />
          </button>
        ) : showActionSlot ? (
          <SendButton isEditing={!!editingMessage} onSend={(options) => onSend(undefined, options)} />
        ) : null}
      </div>
    </footer>
  );
};

export default ChatInputBar;

/** Preview inside an attachment tile: photo / video frame, otherwise a kind icon (+ extension). */
const AttachmentThumb: React.FC<{ file: OutgoingFile; showExtension?: boolean }> = ({ file, showExtension }) => {
  if (file.type === 'image') return <img src={file.data} className="h-full w-full object-cover" alt="" draggable={false} />;
  if (file.type === 'video') {
    return (
      <>
        <video src={file.data} className="h-full w-full object-cover" muted playsInline preload="metadata" />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/45 text-white">
            <IconPlayerPlayFilled size={12} />
          </span>
        </span>
      </>
    );
  }
  const ext = file.name.includes('.') ? file.name.split('.').pop()!.slice(0, 4).toUpperCase() : '';
  return (
    <>
      {file.type === 'audio' ? <IconMicrophone size={20} /> : <IconFile size={20} />}
      {showExtension && ext && <span className="mt-0.5 text-[10px] font-bold leading-none">{ext}</span>}
    </>
  );
};
