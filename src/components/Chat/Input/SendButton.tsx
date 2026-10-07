import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { IconBellOff, IconCalendarTime, IconCheck, IconSend } from '@tabler/icons-react';
import type { SendOptions } from '../../../context/contexts';
import { usePlatform } from '../../../context/platform-context';
import {
  formatScheduledAt,
  parseScheduleInput,
  schedulePresets,
  toDateInputValue,
  toTimeInputValue,
} from '../../../lib/schedule';

const SPRING = { type: 'spring', stiffness: 400, damping: 28 } as const;
const LONG_PRESS_MS = 420;

export interface SendButtonProps {
  isEditing: boolean;
  onSend: (options?: SendOptions) => void;
}

/**
 * Telegram send button: tap = send, long-press / right-click = menu with
 * «Отправить без звука» and «Отправить позже» (presets + date/time picker).
 */
export const SendButton: React.FC<SendButtonProps> = ({ isEditing, onSend }) => {
  const { triggerHaptic } = usePlatform();
  const [menu, setMenu] = useState<'closed' | 'menu' | 'schedule'>('closed');
  const pressTimer = useRef<number | null>(null);
  const suppressClick = useRef(false);

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const clearPress = () => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };
  useEffect(() => clearPress, []);

  const openMenu = () => {
    if (isEditing) return;
    suppressClick.current = true;
    triggerHaptic('medium');
    setMenu('menu');
  };

  const openSchedule = () => {
    const def = Date.now() + 60 * 60 * 1000;
    setDate(toDateInputValue(def));
    setTime(toTimeInputValue(def));
    setScheduleError(null);
    setMenu('schedule');
  };

  const sendWith = (options?: SendOptions) => {
    setMenu('closed');
    onSend(options);
  };

  const submitSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    const res = parseScheduleInput(date, time);
    if ('error' in res) return setScheduleError(res.error);
    sendWith({ scheduledAt: res.at });
  };

  const parsed = menu === 'schedule' ? parseScheduleInput(date, time) : null;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onPointerDown={() => {
          suppressClick.current = false;
          clearPress();
          pressTimer.current = window.setTimeout(openMenu, LONG_PRESS_MS);
        }}
        onPointerUp={clearPress}
        onPointerLeave={clearPress}
        onPointerCancel={clearPress}
        onContextMenu={(e) => {
          e.preventDefault();
          clearPress();
          openMenu();
        }}
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          onSend();
        }}
        style={{ touchAction: 'manipulation' }}
        className="w-[44px] h-[44px] sm:w-[46px] sm:h-[46px] rounded-full tg-btn-primary flex items-center justify-center shadow-md cursor-pointer transition-transform active:scale-95 select-none"
        title={isEditing ? 'Сохранить изменения (Enter)' : 'Отправить (удерживайте — дополнительные параметры)'}
        aria-haspopup={isEditing ? undefined : 'menu'}
      >
        {isEditing ? <IconCheck size={22} stroke={2.6} /> : <IconSend size={20} />}
      </button>

      <AnimatePresence>
        {menu !== 'closed' && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenu('closed')} />
            <motion.div
              key={menu}
              initial={{ opacity: 0, y: 10, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.94 }}
              transition={SPRING}
              role="menu"
              className="tg-glass absolute right-0 bottom-[54px] z-50 rounded-2xl bg-white/95 dark:bg-[#17212b]/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-2xl p-1.5 origin-bottom-right select-none"
            >
              {menu === 'menu' ? (
                <div className="w-56">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => sendWith({ silent: true })}
                    className="w-full px-3 py-2.5 text-left text-[13px] text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                  >
                    <IconBellOff size={19} className="text-slate-500" />
                    Отправить без звука
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={openSchedule}
                    className="w-full px-3 py-2.5 text-left text-[13px] text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                  >
                    <IconCalendarTime size={19} className="text-slate-500" />
                    Отправить позже
                  </button>
                </div>
              ) : (
                <form onSubmit={submitSchedule} className="w-64 p-1.5 space-y-2">
                  <div className="text-[13px] font-semibold text-slate-900 dark:text-white px-0.5">Отправить позже</div>
                  <div className="flex flex-wrap gap-1.5">
                    {schedulePresets().map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => sendWith({ scheduledAt: p.at })}
                        className="px-2.5 py-1 rounded-full text-[11.5px] font-medium bg-[#3390ec]/10 text-[#3390ec] hover:bg-[#3390ec]/20 cursor-pointer transition-colors"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="date"
                      value={date}
                      min={toDateInputValue(Date.now())}
                      onChange={(e) => {
                        setDate(e.target.value);
                        setScheduleError(null);
                      }}
                      aria-label="Дата отправки"
                      className="flex-1 min-w-0 px-2 py-1.5 rounded-lg text-[12.5px] bg-slate-100 dark:bg-[#0E1621] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-hidden focus:border-[#3390ec]"
                    />
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => {
                        setTime(e.target.value);
                        setScheduleError(null);
                      }}
                      aria-label="Время отправки"
                      className="w-[88px] px-2 py-1.5 rounded-lg text-[12.5px] bg-slate-100 dark:bg-[#0E1621] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-hidden focus:border-[#3390ec]"
                    />
                  </div>
                  {scheduleError && <p role="alert" className="text-[11.5px] text-rose-500">{scheduleError}</p>}
                  <button
                    type="submit"
                    className="w-full py-2 rounded-full text-[12.5px] font-semibold text-white bg-[#3390ec] hover:bg-[#2b7fd4] cursor-pointer transition-colors"
                  >
                    {parsed && 'at' in parsed ? `Отправить ${formatScheduledAt(parsed.at)}` : 'Запланировать'}
                  </button>
                </form>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SendButton;
