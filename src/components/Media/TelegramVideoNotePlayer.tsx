import React, { useState, useRef, useEffect, useCallback } from 'react';
import { IconVolumeOff, IconPlayerPlayFilled, IconCheck, IconChecks } from '@tabler/icons-react';
import type { Message } from '../../types';

interface TelegramVideoNotePlayerProps {
  message: Message;
  isSelf: boolean;
  isPending?: boolean;
  deliveryStatus?: 'pending' | 'sent' | 'delivered' | 'read';
  formatTime: (timestamp: number) => string;
}

/**
 * Video note ("кружок") playback model, same as Telegram:
 *  - preview: muted, looping, plays only while on screen; no controls
 *  - playing: tap → restarts from 0 with sound, grows, progress ring, drag the ring to seek
 *  - paused:  tap while playing; tap again resumes
 * Ending, scrolling away, Escape or tapping elsewhere returns to preview. Only one note can
 * be active at a time (module-level bus), so starting another one stops the previous.
 */
type Mode = 'preview' | 'playing' | 'paused';

const bus = typeof window !== 'undefined' ? new EventTarget() : null;
const ACTIVE_EVENT = 'video-note-active';

const RING_R = 48;
const RING_C = 2 * Math.PI * RING_R;
const DRAG_THRESHOLD = 6;
const LONG_PRESS_MS = 420;

const formatClock = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const TelegramVideoNotePlayer: React.FC<TelegramVideoNotePlayerProps> = ({
  message,
  isSelf,
  isPending,
  deliveryStatus,
  formatTime
}) => {
  const [mode, setMode] = useState<Mode>('preview');
  const [currentTime, setCurrentTime] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ringRef = useRef<SVGCircleElement | null>(null);
  const modeRef = useRef<Mode>('preview');
  const inViewRef = useRef(false);
  const pointerRef = useRef<{ id: number; x: number; y: number; t: number; dragging: boolean } | null>(null);

  // MediaRecorder WebM files report `Infinity` until fully scanned, so the sender's
  // recorded duration is the reliable source; the element's value wins once it's real.
  const duration = mediaDuration > 0 ? mediaDuration : message.file?.duration || 0;
  const isActive = mode !== 'preview';
  const isUploading = !!message.file?.isUploading;

  const setModeBoth = useCallback((next: Mode) => {
    modeRef.current = next;
    setMode(next);
  }, []);

  const paintRing = useCallback((t: number) => {
    const ring = ringRef.current;
    if (!ring) return;
    const ratio = duration > 0 ? Math.min(1, Math.max(0, t / duration)) : 0;
    ring.style.strokeDashoffset = String(RING_C * (1 - ratio));
  }, [duration]);

  /** Back to the silent looping thumbnail. */
  const toPreview = useCallback(() => {
    const vid = videoRef.current;
    setModeBoth('preview');
    setIsScrubbing(false);
    setCurrentTime(0);
    if (!vid) return;
    vid.muted = true;
    vid.loop = true;
    try { vid.currentTime = 0; } catch { /* not seekable yet */ }
    if (inViewRef.current) vid.play().catch(() => {});
    else vid.pause();
  }, [setModeBoth]);

  const startPlayback = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    bus?.dispatchEvent(new CustomEvent(ACTIVE_EVENT, { detail: message.id }));
    vid.loop = false;
    vid.muted = false;
    try { vid.currentTime = 0; } catch { /* ignore */ }
    paintRing(0);
    setCurrentTime(0);
    setModeBoth('playing');
    vid.play().catch(() => {
      // Autoplay with sound was blocked — fall back to muted so the user still sees it.
      vid.muted = true;
      vid.play().catch(() => {});
    });
  }, [message.id, paintRing, setModeBoth]);

  const togglePause = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (modeRef.current === 'playing') {
      vid.pause();
      setModeBoth('paused');
    } else {
      vid.muted = false;
      vid.play().catch(() => {});
      setModeBoth('playing');
    }
  }, [setModeBoth]);

  // Another note became active → step back.
  useEffect(() => {
    if (!bus) return;
    const onActive = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== message.id && modeRef.current !== 'preview') toPreview();
    };
    bus.addEventListener(ACTIVE_EVENT, onActive);
    return () => bus.removeEventListener(ACTIVE_EVENT, onActive);
  }, [message.id, toPreview]);

  // Preview loops only while visible; an active note returns to preview when scrolled away.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      inViewRef.current = true;
      videoRef.current?.play().catch(() => {});
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting;
        const vid = videoRef.current;
        if (!vid) return;
        if (!entry.isIntersecting) {
          if (modeRef.current !== 'preview') toPreview();
          else vid.pause();
        } else if (modeRef.current === 'preview') {
          vid.muted = true;
          vid.play().catch(() => {});
        }
      },
      { threshold: 0.35 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [toPreview]);

  // Escape / tap outside collapses an active note.
  useEffect(() => {
    if (!isActive) return;
    const onPointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) toPreview();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') toPreview();
      if (e.key === ' ' && document.activeElement === containerRef.current) {
        e.preventDefault();
        togglePause();
      }
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [isActive, toPreview, togglePause]);

  // Smooth ring: rAF writes straight to the SVG while playing; React state only for the clock.
  useEffect(() => {
    if (mode !== 'playing') return;
    let raf = 0;
    const tick = () => {
      const vid = videoRef.current;
      if (vid && !pointerRef.current?.dragging) paintRing(vid.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode, paintRing]);

  // Pause decoding when the bubble unmounts (deleted, room switched).
  useEffect(() => () => videoRef.current?.pause(), []);

  const seekFromPoint = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current;
    const vid = videoRef.current;
    if (!el || !vid || duration <= 0) return;
    const rect = el.getBoundingClientRect();
    let angle = Math.atan2(clientY - (rect.top + rect.height / 2), clientX - (rect.left + rect.width / 2)) + Math.PI / 2;
    if (angle < 0) angle += Math.PI * 2;
    const target = (angle / (Math.PI * 2)) * duration;
    try { vid.currentTime = target; } catch { /* ignore */ }
    paintRing(target);
    setCurrentTime(target);
  }, [duration, paintRing]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    pointerRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), dragging: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = pointerRef.current;
    if (!p || p.id !== e.pointerId || modeRef.current === 'preview') return;
    if (!p.dragging) {
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < DRAG_THRESHOLD) return;
      p.dragging = true;
      setIsScrubbing(true);
      try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }
    seekFromPoint(e.clientX, e.clientY);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const p = pointerRef.current;
    pointerRef.current = null;
    if (!p || p.id !== e.pointerId) return;
    if (p.dragging) {
      setIsScrubbing(false);
      return;
    }
    // A scroll gesture or a long-press (opens the context menu) is not a tap.
    if (Math.hypot(e.clientX - p.x, e.clientY - p.y) >= DRAG_THRESHOLD) return;
    if (performance.now() - p.t > LONG_PRESS_MS) return;
    if (isUploading) return;
    e.stopPropagation();
    if (modeRef.current === 'preview') startPlayback();
    else togglePause();
  };

  if (!message.file) return null;

  const remaining = Math.max(0, duration - currentTime);
  const anchor = isSelf ? 'origin-right' : 'origin-left';

  return (
    <div className={`relative flex flex-col py-1 select-none ${isSelf ? 'items-end' : 'items-start'} ${isActive ? 'z-30' : 'z-10'}`}>
      <div
        ref={containerRef}
        role="button"
        tabIndex={0}
        aria-label={mode === 'playing' ? 'Пауза' : mode === 'paused' ? 'Продолжить' : 'Воспроизвести видеосообщение'}
        aria-pressed={mode === 'playing'}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { pointerRef.current = null; setIsScrubbing(false); }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !isActive) startPlayback();
        }}
        className={`group relative h-48 w-48 sm:h-52 sm:w-52 cursor-pointer rounded-full transform-gpu will-change-transform transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${anchor} ${
          isActive ? 'scale-[1.32] touch-none' : 'scale-100 active:scale-[0.98]'
        }`}
      >
        <div className="absolute inset-0 overflow-hidden rounded-full bg-zinc-900 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.55)] ring-1 ring-black/10 dark:ring-white/10">
          <video
            ref={videoRef}
            src={message.file.data}
            loop
            muted
            playsInline
            preload="metadata"
            disablePictureInPicture
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration;
              if (Number.isFinite(d) && d > 0) setMediaDuration(d);
              if (inViewRef.current && modeRef.current === 'preview') e.currentTarget.play().catch(() => {});
            }}
            onDurationChange={(e) => {
              const d = e.currentTarget.duration;
              if (Number.isFinite(d) && d > 0) setMediaDuration(d);
            }}
            onTimeUpdate={(e) => {
              if (modeRef.current !== 'preview' && !pointerRef.current?.dragging) setCurrentTime(e.currentTarget.currentTime);
            }}
            onEnded={() => {
              if (modeRef.current !== 'preview') toPreview();
            }}
            className="pointer-events-none h-full w-full scale-[1.02] object-cover"
          />

          {/* Paused veil */}
          <div
            className={`pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25 transition-opacity duration-200 ${
              mode === 'paused' && !isScrubbing ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md">
              <IconPlayerPlayFilled size={20} className="translate-x-[1px]" />
            </span>
          </div>

          {/* Preview chip: duration + muted */}
          <div
            className={`pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-medium tabular-nums text-white backdrop-blur-md transition-all duration-200 ${
              isActive ? 'translate-y-1 opacity-0' : 'opacity-100'
            }`}
          >
            {duration > 0 && <span>{formatClock(duration)}</span>}
            <IconVolumeOff size={12} stroke={2} className="opacity-80" />
          </div>
        </div>

        {/* Progress / upload ring — sits just outside the video so it never covers faces */}
        <svg
          className={`pointer-events-none absolute -inset-[5px] h-[calc(100%+10px)] w-[calc(100%+10px)] -rotate-90 transition-opacity duration-200 ${
            isActive || isUploading ? 'opacity-100' : 'opacity-0'
          }`}
          viewBox="0 0 100 100"
          aria-hidden
        >
          <circle cx="50" cy="50" r={RING_R} fill="none" stroke="currentColor" strokeWidth="1.6" className="text-ink/10" />
          {isUploading ? (
            <circle
              cx="50"
              cy="50"
              r={RING_R}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeDasharray={`${RING_C * 0.22} ${RING_C}`}
              className="origin-center animate-spin"
              style={{ animationDuration: '1.1s' }}
            />
          ) : (
            <circle
              ref={ringRef}
              cx="50"
              cy="50"
              r={RING_R}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={isScrubbing ? 2.6 : 1.8}
              strokeLinecap="round"
              strokeDasharray={RING_C}
              strokeDashoffset={RING_C}
              style={{ transition: 'stroke-width 150ms ease' }}
            />
          )}
        </svg>
      </div>

      {/* Meta pill: remaining time while active, then timestamp + ticks */}
      <div
        className={`mt-1.5 flex items-center gap-1.5 rounded-full bg-black/45 px-2 py-0.5 text-[10.5px] font-medium tabular-nums text-white backdrop-blur-md transition-transform duration-300 ${
          isActive ? 'translate-y-[30px]' : ''
        }`}
      >
        {isActive && duration > 0 && <span className="text-white/85">{formatClock(remaining)}</span>}
        <span className={isActive ? 'text-white/60' : ''}>{formatTime(message.timestamp)}</span>
        {isSelf && !isPending && (
          <span className="text-white/90">
            {deliveryStatus === 'read' ? <IconChecks size={13} stroke={2.2} /> : <IconCheck size={13} stroke={2.2} />}
          </span>
        )}
      </div>
    </div>
  );
};

export default TelegramVideoNotePlayer;
