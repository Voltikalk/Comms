/** Birthday stored as `MM-DD` or `YYYY-MM-DD` (the year is optional, like in Telegram). */
export interface Birthday {
  day: number;
  month: number;
  year: number | null;
}

export const MONTHS_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

export const MONTHS_NOMINATIVE = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

const pad = (n: number) => String(n).padStart(2, '0');

export function parseBirthday(value?: string | null): Birthday | null {
  const m = /^(?:(\d{4})-)?(\d{2})-(\d{2})$/.exec(value?.trim() || '');
  if (!m) return null;
  const birthday = { year: m[1] ? Number(m[1]) : null, month: Number(m[2]), day: Number(m[3]) };
  return birthday.day >= 1 && birthday.day <= daysInMonth(birthday.month, birthday.year) ? birthday : null;
}

export const serializeBirthday = ({ day, month, year }: Birthday) =>
  `${year ? `${year}-` : ''}${pad(month)}-${pad(day)}`;

/** Days in a month; without a year February has 29 days. */
export const daysInMonth = (month: number, year: number | null) =>
  new Date(Date.UTC(year ?? 2000, month, 0)).getUTCDate();

export function ageOn(b: Birthday, now = new Date()): number | null {
  if (!b.year) return null;
  const hadBirthday = now.getMonth() + 1 > b.month || (now.getMonth() + 1 === b.month && now.getDate() >= b.day);
  return now.getFullYear() - b.year - (hadBirthday ? 0 : 1);
}

const yearsWord = (n: number) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'год';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'года';
  return 'лет';
};

/** «14 марта 1995 (31 год)» / «14 марта». */
export function formatBirthday(b: Birthday, now = new Date()): string {
  const date = `${b.day} ${MONTHS_GENITIVE[b.month - 1]}${b.year ? ` ${b.year}` : ''}`;
  const age = ageOn(b, now);
  return age !== null && age >= 0 ? `${date} (${age} ${yearsWord(age)})` : date;
}

export const isBirthdayToday = (b: Birthday, now = new Date()) => b.day === now.getDate() && b.month === now.getMonth() + 1;
