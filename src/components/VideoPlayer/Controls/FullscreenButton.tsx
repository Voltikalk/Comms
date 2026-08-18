import React from 'react';
import { useVideoPlayer } from '../../../hooks/useVideoPlayer';
import { IconMaximize, IconMinimize } from '@tabler/icons-react';

export interface FullscreenButtonProps {
  className?: string;
  size?: number;
}

export const FullscreenButton: React.FC<FullscreenButtonProps> = ({
  className = '',
  size = 20,
}) => {
  const { isFullscreen, toggleFullscreen, props } = useVideoPlayer();

  if (props.allowFullscreen === false) return null;

  return (
    <button
      type="button"
      onClick={toggleFullscreen}
      aria-label={isFullscreen ? 'Выйти из полноэкранного режима (F)' : 'Во весь экран (F)'}
      title={isFullscreen ? 'Выйти из полноэкранного режима (F)' : 'Во весь экран (F)'}
      className={`comms-video-control-btn focus-visible:ring-2 focus-visible:ring-[#3390ec] outline-none ${className}`}
    >
      {isFullscreen ? (
        <IconMinimize size={size} className="transition-transform" />
      ) : (
        <IconMaximize size={size} className="transition-transform" />
      )}
    </button>
  );
};

export default FullscreenButton;
