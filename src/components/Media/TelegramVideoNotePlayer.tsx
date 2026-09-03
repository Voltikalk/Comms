import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  IconVolume,
  IconVolumeOff,
  IconCheck,
  IconChecks
} from '@tabler/icons-react';
import type { Message } from '../../types';

interface TelegramVideoNotePlayerProps {
  message: Message;
  isSelf: boolean;
  isPending?: boolean;
  deliveryStatus?: 'pending' | 'sent' | 'delivered' | 'read';
  formatTime: (timestamp: number) => string;
}

export const TelegramVideoNotePlayer: React.FC<TelegramVideoNotePlayerProps> = ({
  message,
  isSelf,
  isPending,
  deliveryStatus,
  formatTime
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(message.file?.duration || 0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isInView, setIsInView] = useState(true);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isScrubbingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);

  const effectiveDuration = useMemo(() => {
    if (Number.isFinite(duration) && duration > 0 && duration !== Infinity) return duration;
    if (message.file?.duration && message.file.duration > 0) return message.file.duration;
    return 0;
  }, [duration, message.file?.duration]);

  // 1. Intersection Observer: automatically pause video & stop RAF when scrolled out of view
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setIsInView(visible);
        if (!visible && videoRef.current) {
          videoRef.current.pause();
          videoRef.current.muted = true;
          setIsPlaying(false);
          setIsExpanded(false);
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 2. Close and collapse expanded video note on background click or Escape key
  useEffect(() => {
    if (!isExpanded) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (containerRef.current && target && !containerRef.current.contains(target)) {
        const vid = videoRef.current;
        if (vid) {
          vid.pause();
          vid.muted = true;
        }
        setIsPlaying(false);
        setIsExpanded(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const vid = videoRef.current;
        if (vid) {
          vid.pause();
          vid.muted = true;
        }
        setIsPlaying(false);
        setIsExpanded(false);
      }
    };

    const timer = setTimeout(() => {
      window.addEventListener('mousedown', handleOutsideClick);
      window.addEventListener('touchstart', handleOutsideClick, { passive: true });
      window.addEventListener('keydown', handleKeyDown);
    }, 50);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('touchstart', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExpanded]);

  // 2. High-performance RAF loop (runs ONLY when video is actively playing and visible)
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !isPlaying || !isInView) return;

    let animId: number;
    const tick = () => {
      if (vid && !vid.paused && !isScrubbingRef.current) {
        setCurrentTime(vid.currentTime);
      }
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, isInView]);

  // 3. Circular Scrubbing / Seeking calculation
  const handleCircularScrub = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current;
    const vid = videoRef.current;
    if (!container || !vid) return;

    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;

    // Angle starting from 12 o'clock (-PI / 2) going clockwise
    let angle = Math.atan2(deltaY, deltaX) + Math.PI / 2;
    if (angle < 0) {
      angle += 2 * Math.PI;
    }

    const fraction = Math.min(1, Math.max(0, angle / (2 * Math.PI)));
    const dur = effectiveDuration > 0 ? effectiveDuration : (vid.duration || 60);

    const seekTarget = fraction * dur;
    vid.currentTime = seekTarget;
    setCurrentTime(seekTarget);
  }, [effectiveDuration]);

  // 4. Global window listeners for drag scrubbing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!startPointRef.current) return;
      const dist = Math.hypot(e.clientX - startPointRef.current.x, e.clientY - startPointRef.current.y);
      if (dist > 7) {
        hasDraggedRef.current = true;
        isScrubbingRef.current = true;
        setIsScrubbing(true);
        handleCircularScrub(e.clientX, e.clientY);
      }
    };

    const handleMouseUp = () => {
      startPointRef.current = null;
      isScrubbingRef.current = false;
      setIsScrubbing(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!startPointRef.current || !e.touches[0]) return;
      const touch = e.touches[0];
      const dist = Math.hypot(touch.clientX - startPointRef.current.x, touch.clientY - startPointRef.current.y);
      if (dist > 7) {
        hasDraggedRef.current = true;
        isScrubbingRef.current = true;
        setIsScrubbing(true);
        handleCircularScrub(touch.clientX, touch.clientY);
      }
    };

    const handleTouchEnd = () => {
      startPointRef.current = null;
      isScrubbingRef.current = false;
      setIsScrubbing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleCircularScrub]);

  // 5. Toggle Video Note Play / Pause
  const handleTogglePlay = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();

    // If user dragged around the circle to seek, don't toggle play/pause state
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }

    const vid = videoRef.current;
    if (!vid) return;

    if (vid.paused) {
      vid.muted = false;
      vid.play().catch(() => {});
      setIsPlaying(true);
      setIsExpanded(true);
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;

    if (vid.muted) {
      vid.muted = false;
      if (vid.paused) vid.play().catch(() => {});
      setIsPlaying(true);
      setIsExpanded(true);
    } else {
      vid.muted = true;
      setIsPlaying(false);
      setIsExpanded(false);
    }
  };

  const formatAudioTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds === Infinity) return '0:00';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const progressRatio = effectiveDuration > 0
    ? Math.min(1, Math.max(0, currentTime / effectiveDuration))
    : 0;

  if (!message.file) return null;

  return (
    <div className={`relative flex flex-col items-center py-1 select-none transition-transform duration-200 z-10 ${isExpanded ? 'z-30' : 'z-10'}`}>
      {/* Circular Frame Container with GPU-accelerated smooth scale */}
      <div
        ref={containerRef}
        onClick={handleTogglePlay}
        onMouseDown={(e) => {
          hasDraggedRef.current = false;
          startPointRef.current = { x: e.clientX, y: e.clientY };
        }}
        onTouchStart={(e) => {
          hasDraggedRef.current = false;
          if (e.touches[0]) {
            startPointRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          }
        }}
        className={`relative w-48 h-48 sm:w-52 sm:h-52 rounded-full overflow-hidden bg-black flex items-center justify-center shadow-xl transition-transform duration-250 ease-out cursor-pointer touch-none select-none group transform-gpu will-change-transform ${
          isExpanded ? 'scale-[1.28] shadow-2xl' : 'scale-100 hover:scale-[1.02]'
        }`}
      >
        <video
          ref={videoRef}
          src={message.file.data}
          loop
          playsInline
          autoPlay
          muted={!isPlaying}
          preload="auto"
          onTimeUpdate={(e) => {
            if (!isScrubbingRef.current) {
              setCurrentTime(e.currentTarget.currentTime);
            }
            const dur = e.currentTarget.duration;
            if (Number.isFinite(dur) && dur > 0 && dur !== Infinity && dur !== duration) {
              setDuration(dur);
            }
          }}
          onLoadedMetadata={(e) => {
            const dur = e.currentTarget.duration;
            const resolved = (Number.isFinite(dur) && dur > 0 && dur !== Infinity)
              ? dur
              : (message.file?.duration || 0);
            setDuration(resolved);
          }}
          className="w-full h-full object-cover pointer-events-none transform-gpu"
        />

        {/* Circular SVG Progress Ring (Appears ONLY during active watching / playback or when expanded) */}
        {effectiveDuration > 0 && !message.file.isUploading && (
          <svg
            className={`absolute inset-0 w-full h-full pointer-events-none -rotate-90 z-10 p-[1.5px] transition-opacity duration-200 ${
              isExpanded || isPlaying || isScrubbing ? 'opacity-100' : 'opacity-0'
            }`}
            viewBox="0 0 100 100"
          >
            {/* Subtle background track */}
            <circle
              cx="50"
              cy="50"
              r="47.5"
              fill="none"
              stroke="rgba(255, 255, 255, 0.22)"
              strokeWidth="2.2"
            />
            {/* Active progress arc: authentic translucent white */}
            <circle
              cx="50"
              cy="50"
              r="47.5"
              fill="none"
              stroke="rgba(255, 255, 255, 0.88)"
              strokeWidth="2.2"
              strokeDasharray={2 * Math.PI * 47.5}
              strokeDashoffset={2 * Math.PI * 47.5 * (1 - progressRatio)}
              strokeLinecap="round"
            />
          </svg>
        )}


        {/* Volume / Play Indicator */}
        {!message.file.isUploading && (
          <button
            type="button"
            onClick={handleToggleMute}
            className={`absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/50 text-white backdrop-blur-xs transition-all duration-200 z-20 shadow-md hover:bg-black/70 cursor-pointer ${
              isPlaying ? 'opacity-90 scale-100' : 'opacity-70 scale-95'
            }`}
            title={isPlaying ? 'Выключить звук' : 'Включить звук'}
          >
            {isPlaying ? (
              <IconVolume size={14} className="text-white" />
            ) : (
              <IconVolumeOff size={14} className="text-white/80" />
            )}
          </button>
        )}
      </div>

      {/* Floating Timestamp pill */}
      <div className={`mt-1 px-2.5 py-0.5 rounded-full bg-black/50 text-white backdrop-blur-xs text-[10px] font-mono flex items-center gap-1.5 select-none ${
        isSelf ? 'self-end' : 'self-start'
      }`}>
        <span>{formatTime(message.timestamp)}</span>
        {effectiveDuration > 0 && (
          <span className="opacity-75 font-sans">
            {isExpanded && isPlaying
              ? formatAudioTime(effectiveDuration - currentTime)
              : formatAudioTime(effectiveDuration)}
          </span>
        )}
        {isSelf && !isPending && (
          <span className="text-[#4fae4e] dark:text-[#82b1ff]">
            {deliveryStatus === 'read' ? <IconChecks size={14} stroke={2} /> : <IconCheck size={14} stroke={2} />}
          </span>
        )}
      </div>
    </div>
  );
};

export default TelegramVideoNotePlayer;
