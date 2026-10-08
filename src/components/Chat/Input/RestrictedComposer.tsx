import React from 'react';
import { IconBell, IconBellOff, IconLock } from '@tabler/icons-react';

interface RestrictedComposerProps {
  /** Channel subscriber: Telegram shows a single mute / unmute action instead of the input. */
  channel: boolean;
  muted: boolean;
  onToggleMute: () => void;
  /** Group member whose messages are restricted by the admins. */
  reason?: string | null;
}

/** Replaces the composer where the viewer can't post. */
export const RestrictedComposer: React.FC<RestrictedComposerProps> = ({ channel, muted, onToggleMute, reason }) => (
  <footer
    className="relative z-10 w-full min-w-0 px-2 pt-2 sm:px-3"
    style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0.5rem))' }}
  >
    <div className="mx-auto w-full max-w-2xl">
      {channel ? (
        <button
          type="button"
          onClick={onToggleMute}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[22px] bg-surface text-[15px] font-semibold text-accent-soft shadow-sm ring-1 ring-line transition-colors hover:bg-elevated cursor-pointer"
        >
          {muted ? <IconBell size={20} /> : <IconBellOff size={20} />}
          {muted ? 'Включить уведомления' : 'Выключить уведомления'}
        </button>
      ) : (
        <div className="flex h-12 w-full items-center justify-center gap-2 rounded-[22px] bg-surface px-4 text-[14px] text-muted ring-1 ring-line">
          <IconLock size={17} className="shrink-0" />
          <span className="truncate">{reason || 'Отправка сообщений ограничена.'}</span>
        </div>
      )}
    </div>
  </footer>
);
