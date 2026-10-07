import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { IconTrash, IconCheck } from '@tabler/icons-react';

export interface DeleteRequest {
  /** Message ids to remove. Empty + `clearHistory` means "everything in the room". */
  ids: string[];
  /** True when every target was sent by the current user, so it can be revoked for everyone. */
  canRevoke: boolean;
  /** Display name of the peer / room, used in the "also delete for …" checkbox. */
  peerLabel: string | null;
  clearHistory?: boolean;
}

interface DeleteMessagesDialogProps {
  request: DeleteRequest | null;
  isDesktop: boolean;
  onCancel: () => void;
  onConfirm: (forEveryone: boolean) => void;
}

const pluralMessages = (n: number) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'сообщение';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'сообщения';
  return 'сообщений';
};

/**
 * Telegram-style delete confirmation: bottom sheet on mobile, compact card on desktop.
 * Own messages can be revoked for everyone (default on); anything else is hidden locally.
 */
export const DeleteMessagesDialog: React.FC<DeleteMessagesDialogProps> = ({ request, isDesktop, onCancel, onConfirm }) => {
  const [forEveryone, setForEveryone] = useState(true);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!request) return;
    setForEveryone(true);
    const t = window.setTimeout(() => confirmRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [request, onCancel]);

  const count = request?.ids.length ?? 0;
  const title = request?.clearHistory
    ? 'Очистить историю?'
    : count > 1
      ? `Удалить ${count} ${pluralMessages(count)}?`
      : 'Удалить сообщение?';

  const description = request?.clearHistory
    ? 'Все сообщения в этом чате будут удалены. Это действие нельзя отменить.'
    : request?.canRevoke
      ? 'Это действие нельзя отменить.'
      : 'Сообщения исчезнут только у вас — собеседник их по-прежнему увидит.';

  const sheetMotion = isDesktop
    ? {
        initial: { opacity: 0, scale: 0.96, y: 6 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.97, y: 4 },
        transition: { type: 'spring' as const, stiffness: 520, damping: 34, mass: 0.7 },
      }
    : {
        initial: { y: '100%' },
        animate: { y: 0 },
        exit: { y: '100%' },
        transition: { type: 'spring' as const, stiffness: 420, damping: 38 },
      };

  return createPortal(
    <AnimatePresence>
      {request && (
        <motion.div
          key="delete-dialog"
          className={`fixed inset-0 z-[120] flex ${isDesktop ? 'items-center justify-center p-6' : 'items-end'}`}
          initial={{ opacity: 1 }}
          exit={{ opacity: 1 }}
          role="presentation"
        >
          <motion.div
            className="ui-scrim absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onCancel}
          />

          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            className={`ui-sheet relative w-full select-none ${
              isDesktop
                ? 'max-w-[360px] rounded-2xl p-5'
                : 'rounded-t-[22px] px-5 pt-3 pb-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))]'
            }`}
            {...sheetMotion}
            drag={isDesktop ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80 || info.velocity.y > 500) onCancel();
            }}
          >
            {!isDesktop && <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-line-strong" />}

            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
                <IconTrash size={19} stroke={1.8} />
              </div>
              <div className="min-w-0 pt-0.5">
                <h3 id="delete-dialog-title" className="m-0 text-[15px] font-semibold tracking-[-0.015em] text-ink">
                  {title}
                </h3>
                <p className="m-0 mt-1 text-[13px] leading-snug text-muted">{description}</p>
              </div>
            </div>

            {request.canRevoke && request.peerLabel && (
              <button
                type="button"
                onClick={() => setForEveryone((v) => !v)}
                className="mt-4 flex w-full cursor-pointer items-center gap-3 rounded-xl border border-line bg-elevated px-3 py-2.5 text-left transition-colors hover:border-line-strong"
                aria-pressed={forEveryone}
              >
                <span
                  className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border transition-all duration-150 ${
                    forEveryone ? 'border-danger bg-danger text-white' : 'border-line-strong bg-surface text-transparent'
                  }`}
                >
                  <IconCheck size={13} stroke={3} />
                </span>
                <span className="min-w-0 truncate text-[13px] font-medium text-ink">
                  Также удалить для <span className="font-semibold">{request.peerLabel}</span>
                </span>
              </button>
            )}

            <div className={`mt-5 flex gap-2 ${isDesktop ? 'justify-end' : 'flex-col-reverse'}`}>
              <button
                type="button"
                onClick={onCancel}
                className={`cursor-pointer rounded-xl text-[13.5px] font-semibold text-ink transition-colors hover:bg-ink/[0.06] ${
                  isDesktop ? 'px-4 py-2' : 'w-full bg-elevated py-3'
                }`}
              >
                Отмена
              </button>
              <button
                ref={confirmRef}
                type="button"
                onClick={() => onConfirm(request.canRevoke && forEveryone)}
                className={`cursor-pointer rounded-xl bg-danger text-[13.5px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-[filter,transform] hover:brightness-110 active:scale-[0.98] ${
                  isDesktop ? 'px-4 py-2' : 'w-full py-3'
                }`}
              >
                {request.clearHistory ? 'Очистить' : 'Удалить'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
