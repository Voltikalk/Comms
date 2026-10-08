import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { IconLinkOff, IconLoader2, IconSpeakerphone, IconUsers, IconX } from '@tabler/icons-react';
import { useRooms, type JoinTarget } from '../../../context/contexts';
import { pluralRu } from '../../../lib/roles';
import type { RoomPreview } from '../../../types';

interface JoinRoomModalProps {
  target: JoinTarget | null;
  onClose: () => void;
  onOpened: (roomId: string) => void;
}

/** Telegram's invite card: preview of a group/channel with «Вступить» / «Подписаться». */
export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({ target, onClose, onOpened }) => {
  const { getInvitePreview, joinRoom } = useRooms();
  const [preview, setPreview] = useState<RoomPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!target) return;
    let alive = true;
    setPreview(null);
    setError(null);
    setLoading(true);
    void getInvitePreview(target).then((res) => {
      if (!alive) return;
      setLoading(false);
      if (res.ok && res.room) setPreview(res.room);
      else setError(res.error || 'Ссылка недействительна или устарела.');
    });
    return () => {
      alive = false;
    };
  }, [target, getInvitePreview]);

  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [target, onClose]);

  const join = async () => {
    if (!target || !preview || joining) return;
    if (preview.isMember) {
      onOpened(preview.id);
      return onClose();
    }
    setJoining(true);
    const res = await joinRoom(target);
    setJoining(false);
    if (!res.ok) return setError(res.error || 'Не удалось вступить.');
    onOpened(res.room?.id || preview.id);
    onClose();
  };

  const channel = preview?.type === 'channel';
  const count = preview?.memberCount ?? 0;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {target && (
        <motion.div key="join" className="fixed inset-0 z-[110] flex items-end sm:items-center sm:justify-center sm:p-6" role="presentation">
          <motion.div
            className="ui-scrim absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Приглашение"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: 'spring', stiffness: 460, damping: 36 }}
            className="ui-sheet relative w-full rounded-t-[22px] px-5 pb-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] pt-5 sm:max-w-[360px] sm:rounded-3xl"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-elevated hover:text-ink cursor-pointer"
              aria-label="Закрыть"
            >
              <IconX size={19} />
            </button>

            {loading ? (
              <div className="flex h-48 items-center justify-center text-muted">
                <IconLoader2 size={26} className="animate-spin" />
              </div>
            ) : preview ? (
              <div className="flex flex-col items-center text-center">
                <span className="flex h-[88px] w-[88px] items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-accent to-accent-strong text-white">
                  {preview.avatarUrl ? (
                    <img src={preview.avatarUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                  ) : channel ? (
                    <IconSpeakerphone size={38} stroke={1.8} />
                  ) : (
                    <IconUsers size={38} stroke={1.8} />
                  )}
                </span>
                <h2 className="m-0 mt-3 max-w-full truncate text-[19px] font-semibold text-ink">{preview.name}</h2>
                <p className="m-0 mt-0.5 text-[13.5px] text-muted">
                  {channel ? 'Канал' : 'Группа'} · {count}{' '}
                  {channel ? pluralRu(count, 'подписчик', 'подписчика', 'подписчиков') : pluralRu(count, 'участник', 'участника', 'участников')}
                </p>
                {preview.username && <p className="m-0 mt-0.5 text-[13.5px] text-accent-soft">@{preview.username}</p>}
                {preview.description && (
                  <p className="m-0 mt-3 max-h-28 overflow-y-auto whitespace-pre-wrap text-[14px] leading-snug text-ink/85">{preview.description}</p>
                )}
                {error && <p className="m-0 mt-3 text-[13px] text-danger">{error}</p>}
                <button
                  type="button"
                  onClick={() => void join()}
                  disabled={joining}
                  className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent text-[15px] font-semibold text-white transition-colors hover:bg-accent-strong disabled:opacity-70 cursor-pointer"
                >
                  {joining && <IconLoader2 size={18} className="animate-spin" />}
                  {preview.isMember
                    ? channel
                      ? 'Открыть канал'
                      : 'Открыть группу'
                    : channel
                      ? 'Подписаться'
                      : 'Вступить в группу'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center py-4 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-danger/10 text-danger">
                  <IconLinkOff size={30} />
                </span>
                <h2 className="m-0 mt-3 text-[17px] font-semibold text-ink">Ссылка недействительна</h2>
                <p className="m-0 mt-1 text-[13.5px] text-muted">{error || 'Возможно, её отозвали или истёк срок действия.'}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-5 h-11 w-full rounded-2xl bg-elevated text-[14.5px] font-semibold text-ink transition-colors hover:bg-ink/10 cursor-pointer"
                >
                  Понятно
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
