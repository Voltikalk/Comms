import React, { useEffect, useState } from 'react';
import { IconBellOff, IconCheck, IconChecks, IconClock, IconEye, IconFlame } from '@tabler/icons-react';
import type { Message } from '../../../types';
import { formatTtlRemaining } from '../../../lib/e2ee';

export type MetaDeliveryStatus = 'queued' | 'pending' | 'sent' | 'read';

export interface MessageMetaProps {
  message: Pick<Message, 'timestamp' | 'isEdited' | 'expiresAt' | 'silent' | 'queued' | 'scheduledAt' | 'views' | 'signature'>;
  isSelf: boolean;
  deliveryStatus: MetaDeliveryStatus;
  formatTime: (ts: number) => string;
  /** Colour for the check marks (inherits the container colour when omitted). */
  checkClassName?: string;
  timeClassName?: string;
}

/** Telegram-style compact counter: 999 · 1,2K · 15K · 1,3M. */
const formatViews = (n: number) => {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace('.', ',').replace(',0', '')}K`;
  return `${(n / 1_000_000).toFixed(1).replace('.', ',').replace(',0', '')}M`;
};

/** Re-renders every second while a self-destruct timer is running. */
const useCountdown = (expiresAt: number | undefined) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (typeof expiresAt !== 'number') return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [expiresAt]);
  return typeof expiresAt === 'number' ? formatTtlRemaining(expiresAt, now) : null;
};

/**
 * Bubble footer: self-destruct countdown · silent · edited · time · delivery.
 * Queued (offline outbox) messages show «ожидание 🕒» instead of check marks.
 */
export const MessageMeta: React.FC<MessageMetaProps> = ({
  message,
  isSelf,
  deliveryStatus,
  formatTime,
  checkClassName = '',
  timeClassName = 'font-sans tabular-nums',
}) => {
  const ttlLeft = useCountdown(message.expiresAt);
  // Pop the tick only when the status changes while on screen, not on every mount.
  const [initialStatus] = useState(deliveryStatus);
  const pop = deliveryStatus !== initialStatus ? ' tg-check-pop' : '';
  // Channel posts show views (and the author signature) instead of read receipts.
  const isPost = typeof message.views === 'number';
  return (
    <>
      {isPost && (
        <span className="mr-1 inline-flex items-center gap-0.5" title="Просмотры">
          <IconEye size={12} stroke={2} className="opacity-80" />
          <span className="tabular-nums">{formatViews(message.views || 0)}</span>
        </span>
      )}
      {message.signature && <span className="mr-1 max-w-[120px] truncate">{message.signature},</span>}
      {ttlLeft && (
        <span className="inline-flex items-center gap-px mr-1 text-[9.5px] font-semibold text-orange-500" title="Самоуничтожение">
          <IconFlame size={11} stroke={2.2} />
          {ttlLeft}
        </span>
      )}
      {message.silent && <IconBellOff size={11} className="mr-0.5 opacity-70" aria-label="Отправлено без звука" />}
      {message.isEdited && <span className="mr-1 opacity-80">изменено</span>}
      <span className={timeClassName}>{formatTime(message.timestamp)}</span>
      {isSelf && deliveryStatus === 'queued' && (
        <span className="ml-1 inline-flex items-center gap-0.5 text-[9.5px] font-medium text-amber-500" title="Будет отправлено при подключении">
          ожидание <IconClock size={11} stroke={2.2} />
        </span>
      )}
      {isSelf && deliveryStatus === 'pending' && (
        <span className={`ml-0.5 inline-flex items-center opacity-70 ${checkClassName}`} aria-label="Отправка">
          <IconClock size={12} stroke={2} />
        </span>
      )}
      {isSelf && !isPost && (deliveryStatus === 'sent' || deliveryStatus === 'read') && (
        <span
          key={deliveryStatus}
          className={`ml-0.5 inline-flex items-center${pop} ${checkClassName}`}
          aria-label={deliveryStatus === 'read' ? 'Прочитано' : 'Отправлено'}
        >
          {deliveryStatus === 'read' ? <IconChecks size={13} stroke={2} /> : <IconCheck size={13} stroke={2} />}
        </span>
      )}
    </>
  );
};

export default MessageMeta;
