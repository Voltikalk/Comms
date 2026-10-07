import React, { useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { IconX, IconArrowUp, IconCameraRotate } from '@tabler/icons-react';
import type { VideoNoteRecorder } from '../../hooks/useVideoNoteRecorder';

interface VideoNoteRecorderOverlayProps {
  recorder: VideoNoteRecorder;
}

const R = 49;
const C = 2 * Math.PI * R;

const clock = (s: number) => {
  const total = Math.floor(s);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/**
 * Full-screen capture surface for video notes: live circular preview with a 60 s progress
 * ring, cancel / send / flip controls. Esc cancels, Enter sends.
 */
export const VideoNoteRecorderOverlay: React.FC<VideoNoteRecorderOverlayProps> = ({ recorder }) => {
  const { isActive, phase, elapsed, maxSeconds, previewStream, facing, canFlip, stop, flip } = recorder;

  // Callback ref: attaches the stream the moment the <video> mounts (no setTimeout race),
  // and re-attaches when the camera is flipped.
  const attachPreview = useCallback(
    (el: HTMLVideoElement | null) => {
      if (!el) return;
      if (el.srcObject !== previewStream) el.srcObject = previewStream;
      if (previewStream) el.play().catch(() => {});
    },
    [previewStream]
  );

  useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        stop(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        stop(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isActive, stop]);

  const progress = Math.min(1, elapsed / maxSeconds);
  const nearLimit = maxSeconds - elapsed <= 10;
  const isRecording = phase === 'recording';

  return createPortal(
    <AnimatePresence>
      {isActive && (
        <motion.div
          key="video-note-recorder"
          className="fixed inset-0 z-[130] flex flex-col items-center justify-center select-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label="Запись видеосообщения"
        >
          <div className="absolute inset-0 bg-black/75 backdrop-blur-xl" />

          {/* Timer */}
          <motion.div
            className="relative mb-7 flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-medium tabular-nums text-white ring-1 ring-white/10"
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05 }}
          >
            <span className={`h-2 w-2 rounded-full ${isRecording ? 'animate-pulse bg-danger' : 'bg-white/40'}`} />
            <span>{clock(elapsed)}</span>
            <span className={nearLimit ? 'text-danger' : 'text-white/45'}>/ {clock(maxSeconds)}</span>
          </motion.div>

          {/* Live circle */}
          <motion.div
            className="relative aspect-square w-[min(78vw,340px)]"
            initial={{ scale: 0.72, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            <div className="absolute inset-[6px] overflow-hidden rounded-full bg-zinc-900 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]">
              <video
                ref={attachPreview}
                autoPlay
                muted
                playsInline
                className={`h-full w-full object-cover transition-opacity duration-300 ${previewStream ? 'opacity-100' : 'opacity-0'} ${
                  facing === 'user' ? '-scale-x-100' : ''
                }`}
              />
              {!previewStream && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-white/80" />
                </div>
              )}
            </div>

            <svg className="pointer-events-none absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
              <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" />
              <circle
                cx="50"
                cy="50"
                r={R}
                fill="none"
                stroke={nearLimit ? 'var(--danger)' : 'var(--accent)'}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - progress)}
                style={{ transition: 'stroke-dashoffset 120ms linear, stroke 300ms ease' }}
              />
            </svg>
          </motion.div>

          {/* Controls */}
          <motion.div
            className="relative mt-10 flex items-center gap-6"
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.08 }}
          >
            <button
              type="button"
              onClick={() => stop(false)}
              className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/10 transition-colors hover:bg-white/15 active:scale-95"
              aria-label="Отменить"
              title="Отменить (Esc)"
            >
              <IconX size={20} stroke={2} />
            </button>

            <button
              type="button"
              onClick={() => stop(true)}
              disabled={!isRecording}
              className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-accent text-white shadow-[0_10px_30px_-8px_var(--accent),inset_0_1px_0_rgba(255,255,255,0.25)] transition-[transform,opacity] active:scale-95 disabled:opacity-40"
              aria-label="Отправить"
              title="Отправить (Enter)"
            >
              <IconArrowUp size={26} stroke={2.4} />
            </button>

            <button
              type="button"
              onClick={() => flip()}
              disabled={!canFlip || !isRecording}
              className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/10 transition-[background-color,opacity] hover:bg-white/15 active:scale-95 disabled:cursor-default disabled:opacity-0"
              aria-label="Сменить камеру"
            >
              <IconCameraRotate size={20} stroke={1.8} />
            </button>
          </motion.div>

          <p className="relative mt-5 text-[12px] text-white/40">
            <span className="hidden sm:inline">Enter — отправить · Esc — отменить</span>
            <span className="sm:hidden">До {maxSeconds} секунд</span>
          </p>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
