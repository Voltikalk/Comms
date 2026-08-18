import React from 'react';
import { useVideoPlayer } from '../../../hooks/useVideoPlayer';
import { IconPictureInPicture } from '@tabler/icons-react';

export interface PictureInPictureButtonProps {
  className?: string;
  size?: number;
}

export const PictureInPictureButton: React.FC<PictureInPictureButtonProps> = ({
  className = '',
  size = 19,
}) => {
  const { isPictureInPicture, togglePictureInPicture, props } = useVideoPlayer();

  if (props.allowPictureInPicture === false) return null;

  return (
    <button
      type="button"
      onClick={togglePictureInPicture}
      aria-label={isPictureInPicture ? 'Выйти из режима «Картинка в картинке» (P)' : 'Картинка в картинке (P)'}
      title={isPictureInPicture ? 'Выйти из режима «Картинка в картинке» (P)' : 'Картинка в картинке (P)'}
      className={`comms-video-control-btn focus-visible:ring-2 focus-visible:ring-[#3390ec] outline-none ${
        isPictureInPicture ? 'text-[#3390ec]' : ''
      } ${className}`}
    >
      <IconPictureInPicture size={size} className="transition-transform" />
    </button>
  );
};

export default PictureInPictureButton;
