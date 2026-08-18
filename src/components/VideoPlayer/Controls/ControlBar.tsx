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
    playbackRate,
    setPlaybackRate,
    formattedDuration,
    duration,
    props,
  } = useVideoPlayer();

  const isBottomBarVisible = isSettingsOpen || isFullscreen || (playing && isControlsVisible);

  return (
    <div className={`absolute inset-0 pointer-events-none flex flex-col justify-between z-20 ${className}`}>
      {/* 1. Top Header Gradient Bar (Shown ONLY in Fullscreen if title is provided) */}
      {isFullscreen && props.title ? (
        <div className={`p-2 sm:p-3 comms-video-top-gradient flex items-center justify-between pointer-events-auto transition-opacity duration-200 ${
          isControlsVisible || isSettingsOpen ? 'opacity-100' : 'opacity-0'
        }`}>
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

      {/* 2. Big Center Play Button (Clean, dead-center in video frame without scrubber line overlap) */}
      {!playing && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-30">
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

      {/* Telegram-style Duration Badge in top-left corner when video is paused */}
      {!playing && !isBottomBarVisible && duration > 0 && (
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-[11px] font-sans tabular-nums font-medium text-white pointer-events-none select-none z-20 shadow-xs">
          {formattedDuration}
        </div>
      )}

      {/* 3. Bottom Controls Bar (Smoothly appears during playback / interaction, strictly pinned to bottom) */}
      <div
        className={`mt-auto w-full px-2 sm:px-3 pb-1.5 pt-4 comms-video-bottom-gradient transition-opacity duration-200 ${
          isBottomBarVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Timeline Scrubber */}
        <ProgressBar />

        {/* Action Controls Row */}
        <div className="flex items-center justify-between gap-1 sm:gap-2">
          {/* Left Controls: Play, Volume, Time */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 min-w-0">
            <PlayPauseButton size={18} />
            <VolumeControl />
            <TimeDisplay className="pl-0.5 shrink-0" />
          </div>

          {/* Right Controls: Quick Speed (fullscreen only), Subtitles, Settings, Fullscreen */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 ml-auto">
            {isFullscreen && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const nextRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
                  setPlaybackRate(nextRate);
                }}
                title={`Скорость: ${playbackRate}x`}
                className="px-1.5 py-0.5 rounded-md text-[10.5px] font-bold font-sans text-white/90 hover:text-white bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
              >
                {playbackRate}x
              </button>
            )}
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
