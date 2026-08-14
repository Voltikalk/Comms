import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { QUICK_REACTIONS } from '../constants';
import type { Message, UserId } from '../types';
import { TelegramEmojiPickerModal, HoverAnimatedEmoji } from './TelegramEmojiPickerModal';
import { 
  IconCornerUpLeft, 
  IconEdit, 
  IconTrash, 
  IconCopy, 
  IconPin, 
  IconShare3, 
  IconCircleCheck, 
  IconEye, 
  IconChevronDown 
} from '@tabler/icons-react';

interface TelegramContextMenuModalProps {
  message: Message;
  x: number;
  y: number;
  isSelf: boolean;
  isPinned?: boolean;
  currentUser: UserId | null;
  onClose: () => void;
  onReply: (message: Message) => void;
  onPin: (message: Message) => void;
  onCopy: (message: Message) => void;
  onEdit: (message: Message) => void;
  onForward: (message: Message) => void;
  onDelete: (message: Message) => void;
  onSelect: (message: Message) => void;
  onMarkRead: (message: Message) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
}

export const TelegramContextMenuModal: React.FC<TelegramContextMenuModalProps> = ({
  message,
  x,
  y,
  isSelf,
  isPinned = false,
  onClose,
  onReply,
  onPin,
  onCopy,
  onEdit,
  onForward,
  onDelete,
  onSelect,
  onMarkRead,
  onToggleReaction
}) => {
  const [showFullEmojiPicker, setShowFullEmojiPicker] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ top: y, left: x });

  const hasText = !!message.text;

  // Calculate smart screen-boundary coordinates
  useEffect(() => {
    const menuWidth = 240;
    const menuHeight = 360;
    let finalX = x;
    let finalY = y;

    // Shift left if too close to right edge
    if (finalX + menuWidth > window.innerWidth - 16) {
      finalX = Math.max(16, window.innerWidth - menuWidth - 16);
    }
    // Shift up if too close to bottom edge
    if (finalY + menuHeight > window.innerHeight - 16) {
      finalY = Math.max(16, window.innerHeight - menuHeight - 16);
    }

    setPos({ top: finalY, left: finalX });
  }, [x, y]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div 
      className="fixed inset-0 z-50 select-none animate-backdrop" 
      onClick={onClose}
      onContextMenu={(e) => { e.preventDefault(); onClose(); }}
    >
      {/* Global Backdrop */}
      <div className="absolute inset-0 bg-black/15 dark:bg-black/35 backdrop-blur-[2px]" />

      {/* Floating Menu Card anchored at pos */}
      <div 
        ref={menuRef}
        style={{ top: `${pos.top}px`, left: `${pos.left}px` }}
        className="fixed z-50 flex flex-col gap-1.5 animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        {showFullEmojiPicker ? (
          <TelegramEmojiPickerModal
            onSelectEmoji={(emoji) => {
              onToggleReaction(message.id, emoji);
              onClose();
            }}
            onClose={onClose}
            isReactionMode
          />
        ) : (
          <>
            {/* 1. Top Reaction Pill */}
            <div className="flex items-center gap-1.5 p-1.5 px-2.5 rounded-full bg-white dark:bg-[#1c2733] shadow-2xl border border-slate-200 dark:border-white/10 select-none">
              <div className="flex items-center gap-0.5">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onToggleReaction(message.id, emoji);
                      onClose();
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform cursor-pointer p-0.5"
                    title={emoji}
                  >
                    <HoverAnimatedEmoji emoji={emoji} size={26} />
                  </button>
                ))}
              </div>

              {/* Expand Full Emoji Picker */}
              <button
                type="button"
                onClick={() => setShowFullEmojiPicker(true)}
                className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 flex items-center justify-center text-slate-500 dark:text-slate-300 cursor-pointer transition-colors ml-0.5 shrink-0"
                title="Больше реакций"
              >
                <IconChevronDown size={16} />
              </button>
            </div>

            {/* 2. Vertical Context Menu Card */}
            <div className="min-w-[220px] bg-white dark:bg-[#17212b] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-1.5 flex flex-col gap-0.5">
              {/* Ответить */}
              <button
                type="button"
                onClick={() => { onReply(message); onClose(); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] font-medium text-slate-800 dark:text-slate-100 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors text-left"
              >
                <IconCornerUpLeft size={19} className="text-slate-400 dark:text-slate-400 shrink-0" />
                <span>Ответить</span>
              </button>

              {/* Закрепить / Открепить */}
              <button
                type="button"
                onClick={() => { onPin(message); onClose(); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] font-medium text-slate-800 dark:text-slate-100 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors text-left"
              >
                <IconPin size={19} className={`shrink-0 ${isPinned ? 'text-[#3390ec]' : 'text-slate-400 dark:text-slate-400'}`} />
                <span className={isPinned ? 'text-[#3390ec]' : ''}>{isPinned ? 'Открепить' : 'Закрепить'}</span>
              </button>

              {/* Копировать текст */}
              {hasText && (
                <button
                  type="button"
                  onClick={() => { onCopy(message); onClose(); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] font-medium text-slate-800 dark:text-slate-100 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors text-left"
                >
                  <IconCopy size={19} className="text-slate-400 dark:text-slate-400 shrink-0" />
                  <span>Копировать текст</span>
                </button>
              )}

              {/* Редактировать */}
              {isSelf && hasText && (
                <button
                  type="button"
                  onClick={() => { onEdit(message); onClose(); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] font-medium text-slate-800 dark:text-slate-100 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors text-left"
                >
                  <IconEdit size={19} className="text-slate-400 dark:text-slate-400 shrink-0" />
                  <span>Редактировать</span>
                </button>
              )}

              {/* Переслать */}
              <button
                type="button"
                onClick={() => { onForward(message); onClose(); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] font-medium text-slate-800 dark:text-slate-100 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors text-left"
              >
                <IconShare3 size={19} className="text-slate-400 dark:text-slate-400 shrink-0" />
                <span>Переслать</span>
              </button>

              {/* Удалить */}
              {isSelf && (
                <button
                  type="button"
                  onClick={() => { onDelete(message); onClose(); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] font-medium text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors text-left"
                >
                  <IconTrash size={19} className="text-rose-500 shrink-0" />
                  <span>Удалить</span>
                </button>
              )}

              {/* Выделить */}
              <button
                type="button"
                onClick={() => { onSelect(message); onClose(); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] font-medium text-slate-800 dark:text-slate-100 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors text-left"
              >
                <IconCircleCheck size={19} className="text-slate-400 dark:text-slate-400 shrink-0" />
                <span>Выделить</span>
              </button>

              {/* Прочитать */}
              <button
                type="button"
                onClick={() => { onMarkRead(message); onClose(); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] font-medium text-slate-800 dark:text-slate-100 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors text-left"
              >
                <IconEye size={19} className="text-slate-400 dark:text-slate-400 shrink-0" />
                <span>Прочитать</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};
