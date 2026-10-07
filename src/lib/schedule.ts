/**
 * «Отправить позже» helpers: quick presets, <input type=date/time> parsing and
 * validation mirroring `server/sockets/chat.js` (min 5s ahead, max 365 days).
 */

export const MIN_SCHEDULE_DELAY_MS = 60_000; // UI asks for ≥ 1 min (server floor is 5s)
export const MAX_SCHEDULE_AHEAD_MS = 365 * 24 * 60 * 60 * 1000;

export interface SchedulePreset {
  label: string;
  at: number;
}

const atTime = (base: Date, dayOffset: number, h: number, m = 0) => {
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d.getTime();
};

/** Telegram-like presets; "сегодня в 20:00" is hidden once it has passed. */
export function schedulePresets(now = Date.now()): SchedulePreset[] {
  const base = new Date(now);
  const presets: SchedulePreset[] = [{ label: 'Через 1 час', at: now + 60 * 60 * 1000 }];
  const tonight = atTime(base, 0, 20);
  if (tonight - now >= MIN_SCHEDULE_DELAY_MS) presets.push({ label: 'Сегодня в 20:00', at: tonight });
  presets.push({ label: 'Завтра в 9:00', at: atTime(base, 1, 9) });
  return presets;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Local `YYYY-MM-DD` / `HH:MM` values for the native date / time inputs. */
export function toDateInputValue(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toTimeInputValue(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parses local date + time input values; returns epoch ms or an error message. */
export function parseScheduleInput(date: string, time: string, now = Date.now()): { at: number } | { error: string } {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const tm = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dm || !tm) return { error: 'Укажите дату и время.' };
  const [y, mo, d] = [Number(dm[1]), Number(dm[2]) - 1, Number(dm[3])];
  const [h, mi] = [Number(tm[1]), Number(tm[2])];
  const at = new Date(y, mo, d, h, mi, 0, 0);
  if (at.getFullYear() !== y || at.getMonth() !== mo || at.getDate() !== d || h > 23 || mi > 59) {
    return { error: 'Некорректная дата.' };
  }
  const ts = at.getTime();
  if (ts - now < MIN_SCHEDULE_DELAY_MS) return { error: 'Время должно быть в будущем (минимум через минуту).' };
  if (ts - now > MAX_SCHEDULE_AHEAD_MS) return { error: 'Можно запланировать не более чем на год вперёд.' };
  return { at: ts };
}

/** "сегодня в 20:00", "завтра в 09:00", "12 окт. в 18:30". */
export function formatScheduledAt(ts: number, now = Date.now()): string {
  const d = new Date(ts);
  const time = toTimeInputValue(ts);
  const today = new Date(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return `сегодня в ${time}`;
  if (d.toDateString() === tomorrow.toDateString()) return `завтра в ${time}`;
  const date = d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
  });
  return `${date} в ${time}`;
}
