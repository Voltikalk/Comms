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
  IconChevronDown,
  IconBookmark
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
  onSaveToFavorites?: (message: Message) => void;
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
  onSaveToFavorites,
  onToggleReaction
}) => {
  const [showFullEmojiPicker, setShowFullEmojiPicker] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ top: y, left: x });

  const hasText = !!message.text;
  const canCopy = !!message.text || !!message.poll || !!message.file;

  type MenuItem = { label: string; icon: typeof IconCopy; run: () => void; danger?: boolean; active?: boolean };
  const items: Array<MenuItem | 'separator'> = [
    { label: 'Ответить', icon: IconCornerUpLeft, run: () => onReply(message) },
    { label: isPinned ? 'Открепить' : 'Закрепить', icon: IconPin, run: () => onPin(message), active: isPinned },
    ...(canCopy
      ? [{
          label: message.poll ? 'Копировать опрос' : message.file && !message.text ? 'Копировать имя файла' : 'Копировать текст',
          icon: IconCopy,
          run: () => onCopy(message),
        }]
      : []),
    ...(isSelf && hasText && !message.poll ? [{ label: 'Редактировать', icon: IconEdit, run: () => onEdit(message) }] : []),
    { label: 'Переслать', icon: IconShare3, run: () => onForward(message) },
    ...(onSaveToFavorites ? [{ label: 'В Избранное', icon: IconBookmark, run: () => onSaveToFavorites(message) }] : []),
    { label: 'Выделить', icon: IconCircleCheck, run: () => onSelect(message) },
    ...(!isSelf ? [{ label: 'Отметить прочитанным', icon: IconEye, run: () => onMarkRead(message) }] : []),
    'separator',
    { label: 'Удалить', icon: IconTrash, run: () => onDelete(message), danger: true },
  ];

  // Calculate smart screen-boundary coordinates with dynamic width measurement
  useEffect(() => {
    const updatePosition = () => {
      const el = menuRef.current;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const padding = 16;
      const isMobile = viewportWidth < 640;

      // On mobile, position will be handled via flex-center
      if (isMobile && showFullEmojiPicker) {
        return;
      }

      // Get actual rendered dimensions or safe fallbacks
      const defaultWidth = showFullEmojiPicker ? 336 : (isSelf ? 280 : 250);
      const defaultHeight = showFullEmojiPicker ? 360 : 380;
      const menuWidth = el ? el.offsetWidth : defaultWidth;
      const menuHeight = el ? el.offsetHeight : defaultHeight;

      let finalLeft: number;
      if (isSelf || x > viewportWidth / 2) {
        // Outgoing message / right side: align right edge with touch point and safe padding
        finalLeft = Math.min(x - menuWidth + 40, viewportWidth - menuWidth - padding);
        finalLeft = Math.max(padding, finalLeft);
      } else {
        // Incoming message / left side: anchor with safe padding
        finalLeft = Math.max(padding, Math.min(x - 20, viewportWidth - menuWidth - padding));
      }

      // Vertical position with safe clearance for mobile notch/Dynamic Island
      const minTop = 56;
      let finalTop = y + 8;
      if (finalTop + menuHeight > viewportHeight - padding) {
        // Open upwards if overflowing bottom
        finalTop = Math.max(minTop, y - menuHeight - 8);
      } else {
        finalTop = Math.max(minTop, finalTop);
      }

      setPos({ top: finalTop, left: finalLeft });
    };

    updatePosition();
    const t = setTimeout(updatePosition, 30);
    return () => clearTimeout(t);
  }, [x, y, isSelf, showFullEmojiPicker]);

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
      <div className="absolute inset-0 bg-black/15 dark:bg-black/45 backdrop-blur-[3px]" />

      {showFullEmojiPicker ? (
        /* Full Emoji Reaction Picker: Centered on Mobile, Anchored at Message on Desktop */
        <div 
          className="fixed inset-0 z-50 flex sm:block items-center justify-center p-3 sm:p-0 pt-[max(1.5rem,calc(env(safe-area-inset-top,0px)+1rem))] pb-[max(1.5rem,calc(env(safe-area-inset-bottom,0px)+1rem))] animate-fade-in"
          onClick={onClose}
        >
          <div 
            style={{
              ...(window.innerWidth >= 640 ? {
                position: 'fixed',
                top: `${pos.top}px`,
                left: `${pos.left}px`,
              } : {})
            }}
            className="w-full max-w-[310px] sm:max-w-none sm:w-auto flex justify-center shadow-2xl animate-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <TelegramEmojiPickerModal
              onSelectEmoji={(emoji) => {
                try { navigator.vibrate?.(25); } catch {}
                onToggleReaction(message.id, emoji);
                onClose();
              }}
              onClose={onClose}
              isReactionMode
            />
          </div>
        </div>
      ) : (
        /* Floating Menu Card anchored at pos */
        <div 
          ref={menuRef}
          style={{ top: `${pos.top}px`, left: `${pos.left}px` }}
          className={`fixed z-50 flex flex-col gap-1.5 animate-pop-in max-w-[calc(100vw-24px)] ${
            isSelf || x > window.innerWidth / 2 ? 'items-end' : 'items-start'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1. Top Reaction Pill */}
          <div className="ui-sheet flex items-center gap-1 p-1 px-1.5 rounded-full select-none overflow-x-auto no-scrollbar max-w-[calc(100vw-24px)]">
            <div className="flex items-center gap-0.5 shrink-0">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    try { navigator.vibrate?.(25); } catch {}
                    onToggleReaction(message.id, emoji);
                    onClose();
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform cursor-pointer p-0.5 shrink-0"
                  title={emoji}
                >
                  <HoverAnimatedEmoji emoji={emoji} size={25} />
                </button>
              ))}
            </div>

            {/* Expand Full Emoji Picker */}
            <button
              type="button"
              onClick={() => setShowFullEmojiPicker(true)}
              className="w-7 h-7 rounded-full bg-ink/5 hover:bg-ink/10 flex items-center justify-center text-muted cursor-pointer transition-colors ml-0.5 shrink-0"
              title="Больше реакций"
            >
              <IconChevronDown size={16} />
            </button>
          </div>

          {/* 2. Vertical Context Menu Card */}
          <div role="menu" className="ui-sheet min-w-[224px] rounded-2xl p-1.5 flex flex-col">
            {items.map((item, i) =>
              item === 'separator' ? (
                <div key={`sep-${i}`} className="my-1 mx-2 h-px bg-line" />
              ) : (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  data-danger={item.danger ? 'true' : undefined}
                  onClick={() => { item.run(); onClose(); }}
                  className="ui-menu-item"
                >
                  <item.icon size={18} stroke={1.7} className={item.active ? '!text-accent' : undefined} />
                  <span className={`flex-1 ${item.active ? 'text-accent' : ''}`}>{item.label}</span>
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
