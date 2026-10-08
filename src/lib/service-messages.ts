import type { Message, UserId } from '../types';

/** Text of a group/channel service message, e.g. «Анна добавила Олега». */
export function serviceText(
  message: Message,
  nameOf: (id: UserId) => string,
  opts: { me?: string | null; isChannel?: boolean; pinnedPreview?: string } = {},
): string {
  const s = message.service;
  if (!s) return '';
  const actor = opts.me && message.sender === opts.me ? 'Вы' : nameOf(message.sender);
  const targets = (s.targets || []).map((t) => (opts.me && t === opts.me ? 'вас' : nameOf(t))).join(', ');
  switch (s.type) {
    case 'created':
      return opts.isChannel ? `Канал «${s.text || ''}» создан` : `${actor} создал(а) группу «${s.text || ''}»`;
    case 'added':
      return `${actor} добавил(а) ${targets}`;
    case 'removed':
      return `${actor} удалил(а) ${targets}`;
    case 'left':
      return `${actor} покинул(а) группу`;
    case 'joined':
      return `${actor} присоединился(-ась) к группе по ссылке`;
    case 'title':
      return opts.isChannel ? `Название канала изменено на «${s.text || ''}»` : `${actor} изменил(а) название на «${s.text || ''}»`;
    case 'photo':
      return opts.isChannel ? 'Фото канала обновлено' : `${actor} обновил(а) фото группы`;
    case 'photo_removed':
      return opts.isChannel ? 'Фото канала удалено' : `${actor} удалил(а) фото группы`;
    case 'pinned':
      return opts.pinnedPreview ? `${actor} закрепил(а) «${opts.pinnedPreview}»` : `${actor} закрепил(а) сообщение`;
    default:
      return '';
  }
}
