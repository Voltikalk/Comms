import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { IconList, IconPinnedOff, IconX } from '@tabler/icons-react';
import type { Message } from '../../../types';
import type { PinnedMessagesState } from '../../../hooks/usePinnedMessages';

const SPRING = { type: 'spring', stiffness: 400, damping: 28 } as const;
const MAX_SEGMENTS = 4;

export interface PinnedBarProps {
  pinned: PinnedMessagesState;
  onJumpToMessage: (id: string) => void;
  getCleanMessageText: (msg: Message) => string;
  formatTime: (ts: number) => string;
}

/** Segmented left indicator: one segment per pin (windowed to 4), active = current. */
const PinSegments: React.FC<{ count: number; cursor: number }> = ({ count, cursor }) => {
  if (count <= 1) return <span className="w-[3px] self-stretch rounded-full bg-[#3390ec]" />;
  const visible = Math.min(count, MAX_SEGMENTS);
  const start = Math.min(Math.max(0, cursor - (visible - 1)), count - visible);
  return (
    <span className="w-[3px] self-stretch flex flex-col gap-[2px]" aria-hidden>
      {Array.from({ length: visible }, (_, i) => (
        <span
          key={i}
          className={`flex-1 rounded-full transition-colors ${start + i === cursor ? 'bg-[#3390ec]' : 'bg-[#3390ec]/30'}`}
        />
      ))}
    </span>
  );
};

/**
 * Multi-pin bar above the feed. Click → jump to the shown pin and step to the
 * previous one (Telegram behaviour). The list button opens a slide-out panel
 * with every pin of the chat.
 */
export const PinnedBar: React.FC<PinnedBarProps> = ({ pinned, onJumpToMessage, getCleanMessageText, formatTime }) => {
  const [panelOpen, setPanelOpen] = useState(false);
  const { current, pins, cursor } = pinned;

  return (
    <>
      <AnimatePresence initial={false}>
        {current && (
          <motion.div
            key="pin-bar"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={SPRING}
            onClick={() => {
              onJumpToMessage(current.id);
              pinned.advance();
            }}
            className="tg-glass-bar px-4 py-1.5 flex items-center gap-2 cursor-pointer z-20 select-none w-full min-w-0 border-b border-black/[0.06] dark:border-white/[0.06] hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors"
            role="button"
            aria-label={`${pinned.label}: перейти к сообщению`}
          >
            <div className="flex items-stretch gap-2.5 min-w-0 flex-1 py-0.5">
              <PinSegments count={pins.length} cursor={cursor} />
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={SPRING}
                  className="min-w-0"
                >
                  <span className="text-[11.5px] font-bold text-[#3390ec] block">{pinned.label}</span>
                  <span className="text-[12px] text-slate-700 dark:text-slate-300 truncate block">{getCleanMessageText(current)}</span>
                </motion.div>
              </AnimatePresence>
            </div>
            {pins.length > 1 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPanelOpen(true);
                }}
                className="p-1.5 rounded-full text-slate-400 hover:text-[#3390ec] hover:bg-[#3390ec]/10 cursor-pointer shrink-0 transition-colors"
                title="Все закреплённые сообщения"
                aria-label="Все закреплённые сообщения"
              >
                <IconList size={18} />
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  pinned.toggle(current.id);
                }}
                className="p-1.5 rounded-full text-slate-400 hover:text-rose-500 cursor-pointer shrink-0 transition-colors"
                title="Открепить"
                aria-label="Открепить"
              >
                <IconX size={16} />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {panelOpen && pins.length > 0 && (
          <>
            <motion.div
              key="pin-scrim"
              className="absolute inset-0 z-30 bg-black/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPanelOpen(false)}
            />
            <motion.aside
              key="pin-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={SPRING}
              className="tg-glass absolute top-0 right-0 bottom-0 z-40 w-full max-w-[340px] flex flex-col bg-white/92 dark:bg-[#17212b]/92 backdrop-blur-xl border-l border-slate-200/70 dark:border-white/10 shadow-2xl"
              aria-label="Закреплённые сообщения"
            >
              <header className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-white/5">
                <span className="flex-1 text-[14px] font-semibold text-slate-900 dark:text-white">
                  Закреплённые сообщения · {pins.length}
                </span>
                <button
                  type="button"
                  onClick={() => setPanelOpen(false)}
                  aria-label="Закрыть"
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                >
                  <IconX size={17} />
                </button>
              </header>
              <ul className="flex-1 overflow-y-auto tg-scrollbar p-2 space-y-1">
                {[...pins].reverse().map((m) => (
                  <motion.li key={m.id} layout transition={SPRING}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        pinned.select(m.id);
                        onJumpToMessage(m.id);
                        setPanelOpen(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          pinned.select(m.id);
                          onJumpToMessage(m.id);
                          setPanelOpen(false);
                        }
                      }}
                      className={`group flex items-start gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                        current?.id === m.id ? 'bg-[#3390ec]/10' : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[12.5px] text-slate-800 dark:text-slate-100 line-clamp-2 break-words">{getCleanMessageText(m)}</div>
                        <div className="text-[10.5px] text-slate-400 mt-0.5">{formatTime(m.timestamp)}</div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          pinned.toggle(m.id);
                        }}
                        className="p-1 rounded-full text-slate-400 opacity-60 group-hover:opacity-100 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition"
                        title="Открепить"
                        aria-label="Открепить"
                      >
                        <IconPinnedOff size={15} />
                      </button>
                    </div>
                  </motion.li>
                ))}
              </ul>
              <footer className="p-2 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    pinned.unpinAll();
                    setPanelOpen(false);
                  }}
                  className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                >
                  Открепить все сообщения
                </button>
              </footer>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default PinnedBar;
