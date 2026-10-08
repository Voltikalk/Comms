import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';

export interface ChatContextMenuItem {
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
  danger?: boolean;
}

interface ChatContextMenuProps {
  x: number;
  y: number;
  items: ChatContextMenuItem[];
  onClose: () => void;
}

const MARGIN = 8;

/** Telegram-style floating menu opened by right click / long press on a chat. */
export const ChatContextMenu: React.FC<ChatContextMenuProps> = ({ x, y, items, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y, originX: 0, originY: 0 });

  // Keep the menu inside the viewport, flipping like a native context menu.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const flipX = x + width + MARGIN > window.innerWidth;
    const flipY = y + height + MARGIN > window.innerHeight;
    setPos({
      left: Math.max(MARGIN, flipX ? x - width : x),
      top: Math.max(MARGIN, flipY ? y - height : y),
      originX: flipX ? 100 : 0,
      originY: flipY ? 100 : 0,
    });
  }, [x, y]);

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const buttons = [...(ref.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
        const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = e.key === 'ArrowDown' ? (i + 1) % buttons.length : (i - 1 + buttons.length) % buttons.length;
        buttons[next]?.focus();
      }
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onClose);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[70]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
      onWheel={onClose}
    >
      <motion.div
        ref={ref}
        role="menu"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.12, ease: [0.2, 0.9, 0.3, 1] }}
        style={{ left: pos.left, top: pos.top, transformOrigin: `${pos.originX}% ${pos.originY}%` }}
        className="absolute min-w-[220px] overflow-hidden rounded-xl bg-elevated/95 p-1 shadow-2xl ring-1 ring-line backdrop-blur-xl"
      >
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            onClick={() => {
              onClose();
              item.onSelect();
            }}
            className={`flex w-full items-center gap-3.5 rounded-lg px-3 py-2 text-left text-[14px] font-medium outline-none transition-colors cursor-pointer ${
              item.danger ? 'text-danger hover:bg-danger/10 focus-visible:bg-danger/10' : 'text-ink hover:bg-ink/[0.06] focus-visible:bg-ink/[0.06]'
            }`}
          >
            <span className={`shrink-0 ${item.danger ? '' : 'text-muted'}`}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </motion.div>
    </div>,
    document.body,
  );
};

export default ChatContextMenu;
