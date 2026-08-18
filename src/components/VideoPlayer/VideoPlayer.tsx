import React from 'react';
import {
  VideoPlayerProvider,
  useVideoPlayerContext,
} from './VideoPlayerContext';
import { useVideoPlayer } from '../../hooks/useVideoPlayer';
import type { VideoPlayerProps } from '../../types/video-player.types';
import { ControlBar } from './Controls/ControlBar';
import {
  IconAlertCircle,
  IconReload,
} from '@tabler/icons-react';

/**
 * 1. HTML5 Video Element with complete event bindings & gesture support
 */
const VideoElement: React.FC = () => {
  const { videoRef, props } = useVideoPlayerContext();
  const {
    togglePlay,
    toggleFullscreen,
    updateDuration,
    updateCurrentTime,
    updateBuffered,
    updateDimensions,
    setIsLoading,
  } = useVideoPlayer();

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const duration = videoRef.current.duration || props.duration || 0;
    updateDuration(duration);

    if (videoRef.current.videoWidth && videoRef.current.videoHeight) {
      updateDimensions(videoRef.current.videoWidth, videoRef.current.videoHeight);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    updateCurrentTime(curr);
    props.onTimeUpdate?.(curr);
  };

  const handleProgress = () => {
    if (!videoRef.current || !videoRef.current.duration) return;
    const duration = videoRef.current.duration;
    const buffered = videoRef.current.buffered;

    if (buffered.length > 0) {
      const end = buffered.end(buffered.length - 1);
      const percent = Math.min(100, (end / duration) * 100);
      updateBuffered(percent);
    }
  };

  const handleWaiting = () => {
    setIsLoading(true);
  };

  const handlePlaying = () => {
    setIsLoading(false);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (props.allowFullscreen !== false) {
      toggleFullscreen();
    } else {
      togglePlay();
    }
  };

  return (
    <video
      ref={videoRef}
      src={props.src}
      poster={props.poster}
      preload={props.preload || 'metadata'}
      autoPlay={props.autoplay}
      muted={props.muted}
      loop={props.loop}
      playsInline
      controls={false}
      onLoadedMetadata={handleLoadedMetadata}
      onTimeUpdate={handleTimeUpdate}
      onProgress={handleProgress}
      onWaiting={handleWaiting}
      onPlaying={handlePlaying}
      onCanPlay={() => setIsLoading(false)}
      onPlay={() => props.onPlay?.()}
      onPause={() => props.onPause?.()}
      onEnded={() => props.onEnded?.()}
      onClick={togglePlay}
      onDoubleClick={handleDoubleClick}
      className="comms-video-element cursor-pointer"
    >
      {props.subtitles?.map((sub) => (
        <track
          key={sub.id}
          id={sub.id}
          label={sub.label}
          srcLang={sub.lang}
          src={sub.src}
          default={sub.isDefault}
        />
      ))}
    </video>
  );
};

/**
 * 2. Error & Loading Feedback Overlay
 */
const VideoFeedbackOverlay: React.FC = () => {
  const { error, isLoading, playing, restart } = useVideoPlayer();

  if (error) {
    return (
      <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center space-y-3 z-30 animate-fade-in">
        <IconAlertCircle size={40} className="text-rose-500 animate-bounce" />
        <div>
          <h5 className="text-sm font-semibold text-white">Ошибка воспроизведения</h5>
          <p className="text-xs text-slate-400 mt-1">{error}</p>
        </div>
        <button
          type="button"
          onClick={restart}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#3390ec] text-white text-xs font-semibold hover:bg-[#3390ec]/90 transition-colors cursor-pointer"
        >
          <IconReload size={14} />
          <span>Повторить</span>
        </button>
      </div>
    );
  }

  if (isLoading && playing) {
    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-25">
        <div className="comms-video-buffering-spinner" />
      </div>
    );
  }

  return null;
};

/**
 * Main Comms Custom Video Player Component
 */
export const VideoPlayer: React.FC<VideoPlayerProps> = (props) => {
  return (
    <VideoPlayerProvider props={props}>
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden comms-video-player-container">
        {/* HTML5 Video */}
        <VideoElement />

        {/* Master Modular Control Bar */}
        {props.controls !== false && <ControlBar />}

        {/* Loading / Error Feedback */}
        <VideoFeedbackOverlay />
      </div>
    </VideoPlayerProvider>
  );
};

export default VideoPlayer;
