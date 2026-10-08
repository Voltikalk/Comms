import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { IconCheck, IconLoader2 } from '@tabler/icons-react';

export interface ConfirmRequest {
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  /** Red confirm button (leave, delete, ban…). */
  danger?: boolean;
  icon?: React.ReactNode;
  /** Optional extra choice, e.g. «Заблокировать пользователя». */
  checkbox?: { label: string; defaultChecked?: boolean };
  /** May be async — the dialog shows a spinner and stays open until it settles. */
  onConfirm: (checked: boolean) => void | Promise<unknown>;
}

interface ConfirmDialogProps {
  request: ConfirmRequest | null;
  onClose: () => void;
}

/** Generic Telegram-style confirmation: bottom sheet on phones, compact card on desktop. */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ request, onClose }) => {
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!request) return;
    setChecked(Boolean(request.checkbox?.defaultChecked));
    setBusy(false);
    const t = window.setTimeout(() => confirmRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Don't let the sheet underneath treat the same Escape as "back".
      e.preventDefault();
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [request, onClose]);

  const confirm = async () => {
    if (!request || busy) return;
    setBusy(true);
    try {
      await request.onConfirm(checked);
    } finally {
      setBusy(false);
      onClose();
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {request && (
        <motion.div
          key="confirm-dialog"
          className="fixed inset-0 z-[130] flex items-end sm:items-center sm:justify-center sm:p-6"
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
            onClick={() => !busy && onClose()}
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: 'spring', stiffness: 480, damping: 36 }}
            className="ui-sheet relative w-full select-none rounded-t-[22px] px-5 pb-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] pt-4 sm:max-w-[360px] sm:rounded-2xl sm:p-5"
          >
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-line-strong sm:hidden" />
            <div className="flex items-start gap-3.5">
              {request.icon && (
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    request.danger ? 'bg-danger/10 text-danger' : 'bg-accent-muted text-accent'
                  }`}
                >
                  {request.icon}
                </div>
              )}
              <div className="min-w-0 pt-0.5">
                <h3 id="confirm-dialog-title" className="m-0 text-[15px] font-semibold tracking-[-0.015em] text-ink">
                  {request.title}
                </h3>
                {request.description && <div className="m-0 mt-1 text-[13px] leading-snug text-muted">{request.description}</div>}
              </div>
            </div>

            {request.checkbox && (
              <button
                type="button"
                onClick={() => setChecked((v) => !v)}
                className="mt-4 flex w-full cursor-pointer items-center gap-3 rounded-xl border border-line bg-elevated px-3 py-2.5 text-left transition-colors hover:border-line-strong"
                aria-pressed={checked}
              >
                <span
                  className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border transition-all duration-150 ${
                    checked
                      ? request.danger
                        ? 'border-danger bg-danger text-white'
                        : 'border-accent bg-accent text-white'
                      : 'border-line-strong bg-surface text-transparent'
                  }`}
                >
                  <IconCheck size={13} stroke={3} />
                </span>
                <span className="min-w-0 truncate text-[13px] font-medium text-ink">{request.checkbox.label}</span>
              </button>
            )}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="w-full cursor-pointer rounded-xl bg-elevated py-3 text-[13.5px] font-semibold text-ink transition-colors hover:bg-ink/[0.06] disabled:opacity-60 sm:w-auto sm:bg-transparent sm:px-4 sm:py-2"
              >
                Отмена
              </button>
              <button
                ref={confirmRef}
                type="button"
                onClick={() => void confirm()}
                disabled={busy}
                className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-[13.5px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-[filter,transform] hover:brightness-110 active:scale-[0.98] disabled:opacity-70 sm:w-auto sm:px-4 sm:py-2 ${
                  request.danger ? 'bg-danger' : 'bg-accent'
                }`}
              >
                {busy && <IconLoader2 size={15} className="animate-spin" />}
                {request.confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
