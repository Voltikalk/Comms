import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { IconCalendarTime, IconSend, IconTrash, IconX } from '@tabler/icons-react';
import { useMessages, useRooms } from '../../../context/contexts';
import { formatScheduledAt } from '../../../lib/schedule';

const SPRING = { type: 'spring', stiffness: 400, damping: 28 } as const;

/**
 * Input-bar shortcut shown when the active chat has «отложенные сообщения».
 * Opens a slide-up list: send now / cancel each pending scheduled message.
 */
export const ScheduledMessagesButton: React.FC = () => {
  const { activeRoomId } = useRooms();
  const { scheduledMessages, cancelScheduledMessage, sendScheduledNow } = useMessages();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const list = useMemo(
    () =>
      scheduledMessages
        .filter((m) => m.roomId === activeRoomId)
        .sort((a, b) => (a.scheduledAt ?? 0) - (b.scheduledAt ?? 0)),
    [scheduledMessages, activeRoomId],
  );

  if (!list.length) return null;

  const run = async (id: string, action: (id: string) => Promise<boolean>) => {
    setBusyId(id);
    try {
      await action(id);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 rounded-full flex items-center justify-center text-accent hover:bg-accent-muted cursor-pointer transition-colors"
        title="Отложенные сообщения"
        aria-label={`Отложенные сообщения: ${list.length}`}
        aria-expanded={open}
      >
        <IconCalendarTime size={21} />
        <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-accent text-white text-[9.5px] font-bold flex items-center justify-center">
          {list.length}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={SPRING}
              className="tg-glass absolute right-0 bottom-[50px] z-50 w-72 max-h-80 flex flex-col rounded-2xl bg-white/95 dark:bg-[#17212b]/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-2xl origin-bottom-right"
            >
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 dark:border-white/5">
                <span className="text-[13px] font-semibold text-slate-900 dark:text-white">Отложенные сообщения</span>
                <button type="button" onClick={() => setOpen(false)} aria-label="Закрыть" className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
                  <IconX size={15} />
                </button>
              </div>
              <ul className="flex-1 overflow-y-auto tg-scrollbar p-1.5 space-y-1">
                <AnimatePresence initial={false}>
                  {list.map((m) => (
                    <motion.li
                      key={m.id}
                      layout
                      exit={{ opacity: 0, x: 40 }}
                      transition={SPRING}
                      className="flex items-start gap-2 px-2.5 py-2 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[12.5px] text-slate-800 dark:text-slate-100 line-clamp-2 break-words">
                          {m.text || (m.file ? `📎 ${m.file.name}` : m.encrypted ? '🔒 Зашифрованное сообщение' : 'Сообщение')}
                        </div>
                        <div className="text-[11px] text-[#3390ec] mt-0.5">
                          {m.scheduledAt ? formatScheduledAt(m.scheduledAt) : ''}
                          {m.silent ? ' · без звука' : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={busyId === m.id}
                        onClick={() => void run(m.id, sendScheduledNow)}
                        title="Отправить сейчас"
                        aria-label="Отправить сейчас"
                        className="p-1.5 rounded-full text-accent hover:bg-accent-muted cursor-pointer disabled:opacity-50"
                      >
                        <IconSend size={15} />
                      </button>
                      <button
                        type="button"
                        disabled={busyId === m.id}
                        onClick={() => void run(m.id, cancelScheduledMessage)}
                        title="Отменить"
                        aria-label="Отменить отправку"
                        className="p-1.5 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer disabled:opacity-50"
                      >
                        <IconTrash size={15} />
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScheduledMessagesButton;
