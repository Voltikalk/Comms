import React from 'react';
import { useVideoPlayer } from '../../../hooks/useVideoPlayer';
import { PlayPauseButton } from './PlayPauseButton';
import { ProgressBar } from './ProgressBar';
import { TimeDisplay } from './TimeDisplay';
import { VolumeControl } from './VolumeControl';
import { FullscreenButton } from './FullscreenButton';
import { SettingsMenu } from './SettingsMenu';
import { PictureInPictureButton } from './PictureInPictureButton';
import { SubtitlesButton } from './SubtitlesButton';
import { IconPlayerPlayFilled } from '@tabler/icons-react';

export interface ControlBarProps {
  className?: string;
}

export const ControlBar: React.FC<ControlBarProps> = ({ className = '' }) => {
  const {
    playing,
    play,
    isControlsVisible,
    isSettingsOpen,
    isFullscreen,
    props,
  } = useVideoPlayer();

  const isVisible = isControlsVisible || !playing || isSettingsOpen;

  return (
    <div
      className={`absolute inset-0 pointer-events-none flex flex-col justify-between transition-opacity duration-200 z-20 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } ${className}`}
    >
      {/* 1. Top Header Gradient Bar (Shown ONLY in Fullscreen if title is provided) */}
      {isFullscreen && props.title ? (
        <div className="p-2 sm:p-3 comms-video-top-gradient flex items-center justify-between pointer-events-auto">
          <div className="min-w-0 pr-2">
            <h4 className="text-xs sm:text-sm font-medium text-white drop-shadow truncate m-0 opacity-90">
              {props.title || ''}
            </h4>
          </div>

          {/* Top Right Quick PiP Action */}
          <div className="flex items-center gap-1 shrink-0">
            <PictureInPictureButton size={17} />
          </div>
        </div>
      ) : (
        <div className="h-0 shrink-0 pointer-events-none" />
      )}

      {/* 2. Big Center Play Button (Optically centered above bottom controls) */}
      {!playing && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-30 ${
            isFullscreen ? 'top-1/2' : 'top-[42%] sm:top-[44%]'
          }`}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              play();
            }}
            aria-label="Воспроизвести видео"
            className="comms-video-center-button animate-pop-in"
            title="Воспроизвести"
          >
            <IconPlayerPlayFilled size={24} className="translate-x-[1px]" />
          </button>
        </div>
      )}

      {/* 3. Bottom Controls Bar (Strictly anchored to the bottom edge) */}
      <div className="mt-auto w-full px-2 sm:px-3 pb-1.5 pt-4 comms-video-bottom-gradient pointer-events-auto space-y-1">
        {/* Timeline Scrubber */}
        <ProgressBar />

        {/* Action Controls Row */}
        <div className="flex items-center justify-between gap-1 sm:gap-2">
          {/* Left Controls: Play, Volume, Time */}
          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
            <PlayPauseButton size={19} />
            <VolumeControl />
            <TimeDisplay className="pl-0.5 shrink-0 text-[11px] sm:text-xs" />
          </div>

          {/* Right Controls: Subtitles (if available), Settings, Fullscreen */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <SubtitlesButton />
            <SettingsMenu />
            <FullscreenButton size={18} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlBar;
