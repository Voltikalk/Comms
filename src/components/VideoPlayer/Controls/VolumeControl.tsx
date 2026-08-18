import React, { useRef } from 'react';
import { useVideoPlayer } from '../../../hooks/useVideoPlayer';
import {
  IconVolume,
  IconVolume2,
  IconVolume3,
  IconVolumeOff,
} from '@tabler/icons-react';

export interface VolumeControlProps {
  className?: string;
}

export const VolumeControl: React.FC<VolumeControlProps> = ({ className = '' }) => {
  const { volume, isMuted, setVolume, toggleMute } = useVideoPlayer();
  const lastVolumeRef = useRef(volume || 1);

  if (volume > 0 && !isMuted) {
    lastVolumeRef.current = volume;
  }

  const renderSpeakerIcon = () => {
    if (isMuted || volume === 0) {
      return <IconVolumeOff size={18} className="text-slate-400 hover:text-rose-400 transition-colors" />;
    }
    if (volume < 0.35) {
      return <IconVolume size={18} className="text-white" />;
    }
    if (volume < 0.75) {
      return <IconVolume2 size={18} className="text-white" />;
    }
    return <IconVolume3 size={18} className="text-white" />;
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setVolume(volume + 0.1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setVolume(volume - 0.1);
    }
  };

  return (
    <div className={`comms-video-volume-group ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleMute();
        }}
        aria-label={isMuted ? 'Включить звук (M)' : 'Выключить звук (M)'}
        title={isMuted ? 'Включить звук (M)' : 'Выключить звук (M)'}
        className="comms-video-control-btn focus-visible:ring-2 focus-visible:ring-[#3390ec] outline-none"
      >
        {renderSpeakerIcon()}
      </button>

      <input
        type="range"
        min={0}
        max={1}
        step={0.02}
        value={isMuted ? 0 : volume}
        onChange={handleSliderChange}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        aria-label="Уровень громкости"
        aria-valuenow={Math.round((isMuted ? 0 : volume) * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${Math.round((isMuted ? 0 : volume) * 100)}%`}
        title={`Громкость: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
        className="comms-video-volume-slider focus-visible:ring-2 focus-visible:ring-[#3390ec] outline-none hidden sm:block"
      />
    </div>
  );
};

export default VolumeControl;
