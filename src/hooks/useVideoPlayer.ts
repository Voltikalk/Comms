import { useMemo } from 'react';
import { useVideoPlayerContext } from '../components/VideoPlayer/VideoPlayerContext';

/**
 * Format raw seconds into mm:ss or hh:mm:ss string
 */
export function formatVideoTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0 || !isFinite(seconds)) return '0:00';

  const totalSec = Math.floor(seconds);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  const paddedSecs = secs < 10 ? `0${secs}` : `${secs}`;

  if (hrs > 0) {
    const paddedMins = mins < 10 ? `0${mins}` : `${mins}`;
    return `${hrs}:${paddedMins}:${paddedSecs}`;
  }

  return `${mins}:${paddedSecs}`;
}

/**
 * Custom hook to interact with Comms Video Player state & actions
 */
export function useVideoPlayer() {
  const context = useVideoPlayerContext();
  const { state, actions, videoRef, containerRef, props } = context;

  const formattedCurrentTime = useMemo(
    () => formatVideoTime(state.currentTime),
    [state.currentTime]
  );

  const formattedDuration = useMemo(
    () => formatVideoTime(state.duration),
    [state.duration]
  );

  const formattedRemainingTime = useMemo(
    () => formatVideoTime(Math.max(0, state.duration - state.currentTime)),
    [state.duration, state.currentTime]
  );

  const progressPercent = useMemo(() => {
    if (!state.duration || state.duration <= 0) return 0;
    return Math.min(100, Math.max(0, (state.currentTime / state.duration) * 100));
  }, [state.currentTime, state.duration]);

  return {
    ...state,
    ...actions,
    videoRef,
    containerRef,
    props,
    formattedCurrentTime,
    formattedDuration,
    formattedRemainingTime,
    progressPercent,
    formatVideoTime,
  };
}

export default useVideoPlayer;
