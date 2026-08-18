import React, { useRef } from 'react';
import { useVideoPlayer, formatVideoTime } from '../../../hooks/useVideoPlayer';

export interface ProgressBarProps {
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ className = '' }) => {
  const {
    duration,
    currentTime,
    buffered,
    progressPercent,
    hoverTime,
    hoverPosition,
    seek,
    setHoverTime,
    props,
  } = useVideoPlayer();

  const trackRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);

  const calculateEventPosition = (
    e: React.MouseEvent | MouseEvent | React.TouchEvent | TouchEvent
  ) => {
    if (!trackRef.current || !duration) return null;
    const rect = trackRef.current.getBoundingClientRect();
    const touchList = (e as TouchEvent).touches || ((e as any).changedTouches);
    const clientX = touchList && touchList.length > 0 ? touchList[0].clientX : (e as MouseEvent).clientX;
    const offsetX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const positionPercent = (offsetX / rect.width) * 100;
    const targetTime = (offsetX / rect.width) * duration;
    return { targetTime, positionPercent };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const calc = calculateEventPosition(e);
    if (calc) {
      setHoverTime(calc.targetTime, calc.positionPercent);
    }
  };

  const handleMouseLeave = () => {
    if (!isDraggingRef.current) {
      setHoverTime(null, null);
    }
  };

  const handleStartDrag = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const evt = e.nativeEvent || e;
    const calc = calculateEventPosition(evt);
    if (!calc) return;
    isDraggingRef.current = true;
    seek(calc.targetTime);

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;
      const moveCalc = calculateEventPosition(moveEvent);
      if (moveCalc) {
        seek(moveCalc.targetTime);
        setHoverTime(moveCalc.targetTime, moveCalc.positionPercent);
      }
    };

    const handleEnd = () => {
      isDraggingRef.current = false;
      setHoverTime(null, null);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!duration) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      seek(currentTime + 5);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      seek(currentTime - 5);
    }
  };

  const primaryColor = props.theme?.primaryColor || '#3390ec';

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-label="Временная шкала видео"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(currentTime)}
      aria-valuetext={`${formatVideoTime(currentTime)} из ${formatVideoTime(duration)}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleStartDrag}
      onTouchStart={handleStartDrag}
      onKeyDown={handleKeyDown}
      className={`comms-video-timeline-container group/timeline focus-visible:ring-2 focus-visible:ring-[#3390ec] rounded-full outline-none select-none ${className}`}
    >
      {/* Hover Time Tooltip */}
      {hoverTime !== null && hoverPosition !== null && duration > 0 && (
        <div
          className="comms-video-tooltip"
          style={{ left: `${Math.max(8, Math.min(92, hoverPosition))}%` }}
        >
          {formatVideoTime(hoverTime)}
        </div>
      )}

      {/* Track Base */}
      <div className="comms-video-timeline-track">
        {/* Buffered Range Bar */}
        <div
          className="comms-video-buffered-bar"
          style={{ width: `${buffered}%` }}
        />

        {/* Played Progress Bar */}
        <div
          className="comms-video-progress-bar"
          style={{
            width: `${progressPercent}%`,
            backgroundColor: primaryColor,
          }}
        />

        {/* Scrubber Thumb */}
        <div
          className="comms-video-scrubber-thumb"
          style={{
            left: `${progressPercent}%`,
            boxShadow: `0 0 8px rgba(0,0,0,0.5), 0 0 0 2px ${primaryColor}`,
          }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
