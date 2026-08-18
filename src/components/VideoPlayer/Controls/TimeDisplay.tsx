import React, { useState } from 'react';
import { useVideoPlayer } from '../../../hooks/useVideoPlayer';

export interface TimeDisplayProps {
  className?: string;
  showRemainingToggle?: boolean;
}

export const TimeDisplay: React.FC<TimeDisplayProps> = ({
  className = '',
  showRemainingToggle = true,
}) => {
  const { formattedCurrentTime, formattedDuration, formattedRemainingTime } = useVideoPlayer();
  const [showRemaining, setShowRemaining] = useState(false);

  return (
    <div
      onClick={() => showRemainingToggle && setShowRemaining(!showRemaining)}
      className={`text-[11px] sm:text-xs font-sans tabular-nums font-medium tracking-tight text-slate-300 select-none flex items-center gap-1 shrink-0 whitespace-nowrap cursor-pointer hover:text-white transition-colors ${className}`}
      title={showRemainingToggle ? 'Нажмите для переключения оставшегося времени' : undefined}
      aria-label="Время воспроизведения"
    >
      <span className="font-semibold text-white">{formattedCurrentTime}</span>
      <span className="text-slate-400 font-normal">/</span>
      <span className="text-slate-300">
        {showRemaining ? `-${formattedRemainingTime}` : formattedDuration}
      </span>
    </div>
  );
};

export default TimeDisplay;
