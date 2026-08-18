import React, { useState } from 'react';
import { useVideoPlayer } from '../../../hooks/useVideoPlayer';
import { IconPlayerPlayFilled, IconPlayerPauseFilled } from '@tabler/icons-react';

export interface PlayPauseButtonProps {
  size?: number;
  className?: string;
}

export const PlayPauseButton: React.FC<PlayPauseButtonProps> = ({
  size = 22,
  className = '',
}) => {
  const { playing, togglePlay } = useVideoPlayer();
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsClicked(true);
    togglePlay();
    setTimeout(() => setIsClicked(false), 200);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={playing ? 'Пауза (Пробел / K)' : 'Воспроизведение (Пробел / K)'}
      title={playing ? 'Пауза (Пробел / K)' : 'Воспроизведение (Пробел / K)'}
      className={`comms-video-control-btn relative focus-visible:ring-2 focus-visible:ring-[#3390ec] outline-none ${
        isClicked ? 'scale-90' : 'scale-100'
      } ${className}`}
    >
      {playing ? (
        <IconPlayerPauseFilled size={size} className="transition-transform" />
      ) : (
        <IconPlayerPlayFilled size={size} className="transition-transform" />
      )}
    </button>
  );
};

export default PlayPauseButton;
