import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import type {
  VideoPlayerProps,
  VideoPlayerState,
  VideoPlayerActions,
  VideoPlayerContextValue,
  PlaybackRate,
  VideoQuality,
} from '../../types/video-player.types';

const VideoPlayerContext = createContext<VideoPlayerContextValue | undefined>(undefined);

export const useVideoPlayerContext = (): VideoPlayerContextValue => {
  const context = useContext(VideoPlayerContext);
  if (!context) {
    throw new Error('useVideoPlayerContext must be used within a VideoPlayerProvider');
  }
  return context;
};

export const VideoPlayerProvider: React.FC<{
  props: VideoPlayerProps;
  children: React.ReactNode;
}> = ({ props, children }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controlsTimeoutRef = useRef<any>(null);

  const [state, setState] = useState<VideoPlayerState>({
    playing: false,
    duration: props.duration || 0,
    currentTime: 0,
    volume: props.muted ? 0 : 1,
    isFullscreen: false,
    isMuted: !!props.muted,
    playbackRate: 1,
    buffered: 0,
    isPictureInPicture: false,
    isTheatreMode: false,
    quality: 'auto',
    error: null,
    playbackState: 'idle',
    isLoading: true,
    isControlsVisible: true,
    isSettingsOpen: false,
    activeSubtitleId: null,
    isHoveringTimeline: false,
    hoverTime: null,
    hoverPosition: null,
  });

  const hideDelay = props.autoHideControlsDelay || 3500;

  // 1. Controls Visibility & Auto-hide Timer
  const setControlsVisible = useCallback((visible: boolean) => {
    setState((prev) => ({ ...prev, isControlsVisible: visible }));
  }, []);

  const resetControlsTimer = useCallback(() => {
    setState((prev) => ({ ...prev, isControlsVisible: true }));
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setState((prev) => {
        if (prev.playing && !prev.isSettingsOpen && !prev.isHoveringTimeline) {
          return { ...prev, isControlsVisible: false };
        }
        return prev;
      });
    }, hideDelay);
  }, [hideDelay]);

  // 2. Play / Pause Actions
  const play = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      await videoRef.current.play();
      setState((prev) => ({
        ...prev,
        playing: true,
        playbackState: 'playing',
        error: null,
      }));
      props.onPlay?.();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setState((prev) => ({
          ...prev,
          error: 'Не удалось воспроизвести видео',
          playbackState: 'error',
        }));
        props.onError?.('Не удалось воспроизвести видео');
      }
    }
  }, [props]);

  const pause = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setState((prev) => ({
      ...prev,
      playing: false,
      playbackState: 'paused',
    }));
    props.onPause?.();
  }, [props]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused || videoRef.current.ended) {
      play();
    } else {
      pause();
    }
  }, [play, pause]);

  // 3. Seeking & Timeline
  const seek = useCallback(
    (time: number) => {
      if (!videoRef.current) return;
      const targetTime = Math.max(0, Math.min(time, videoRef.current.duration || 0));
      videoRef.current.currentTime = targetTime;
      setState((prev) => ({ ...prev, currentTime: targetTime }));
      resetControlsTimer();
    },
    [resetControlsTimer]
  );

  const forward = useCallback(
    (seconds = 10) => {
      if (!videoRef.current) return;
      seek(videoRef.current.currentTime + seconds);
    },
    [seek]
  );

  const rewind = useCallback(
    (seconds = 10) => {
      if (!videoRef.current) return;
      seek(videoRef.current.currentTime - seconds);
    },
    [seek]
  );

  const restart = useCallback(() => {
    seek(0);
    play();
  }, [seek, play]);

  // 4. Volume & Mute
  const setVolume = useCallback(
    (newVolume: number) => {
      if (!videoRef.current) return;
      const clamped = Math.max(0, Math.min(1, newVolume));
      videoRef.current.volume = clamped;
      const isMuted = clamped === 0;
      videoRef.current.muted = isMuted;

      setState((prev) => ({
        ...prev,
        volume: clamped,
        isMuted,
      }));

      props.onVolumeChange?.(clamped, isMuted);
    },
    [props]
  );

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    const newMuted = !videoRef.current.muted;
    videoRef.current.muted = newMuted;

    setState((prev) => ({
      ...prev,
      isMuted: newMuted,
      volume: newMuted ? 0 : prev.volume || 1,
    }));

    props.onVolumeChange?.(newMuted ? 0 : state.volume || 1, newMuted);
  }, [props, state.volume]);

  // 5. Playback Speed Rate
  const setPlaybackRate = useCallback((rate: PlaybackRate) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setState((prev) => ({ ...prev, playbackRate: rate }));
  }, []);

  // 6. Quality Selection
  const setQuality = useCallback(
    (quality: VideoQuality) => {
      if (!videoRef.current) return;
      const prevTime = videoRef.current.currentTime;
      const wasPlaying = !videoRef.current.paused;

      const selectedLevel = props.qualityLevels?.find((l) => l.quality === quality);
      if (selectedLevel) {
        videoRef.current.src = selectedLevel.src;
        videoRef.current.currentTime = prevTime;
        if (wasPlaying) {
          videoRef.current.play().catch(() => {});
        }
      }

      setState((prev) => ({ ...prev, quality }));
      props.onQualityChange?.(quality);
    },
    [props]
  );

  // 7. Fullscreen Toggle
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        } else if ((containerRef.current as any).msRequestFullscreen) {
          await (containerRef.current as any).msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.error('[VideoPlayer] Fullscreen toggle error:', err);
    }
  }, []);

  // 8. Picture in Picture Toggle
  const togglePictureInPicture = useCallback(async () => {
    if (!videoRef.current) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled && videoRef.current !== document.pictureInPictureElement) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.error('[VideoPlayer] Picture in Picture error:', err);
    }
  }, []);

  // 9. Subtitles / Closed Captions
  const setSubtitle = useCallback(
    (id: string | null) => {
      if (!videoRef.current) return;
      const textTracks = videoRef.current.textTracks;

      for (let i = 0; i < textTracks.length; i++) {
        const track = textTracks[i];
        if (id && track.id === id) {
          track.mode = 'showing';
        } else {
          track.mode = 'disabled';
        }
      }

      setState((prev) => ({ ...prev, activeSubtitleId: id }));
    },
    []
  );

  // 10. Settings Menu
  const toggleSettings = useCallback(() => {
    setState((prev) => ({ ...prev, isSettingsOpen: !prev.isSettingsOpen }));
  }, []);

  // 11. Timeline Hover Tooltip
  const setHoverTime = useCallback((time: number | null, position: number | null) => {
    setState((prev) => ({
      ...prev,
      hoverTime: time,
      hoverPosition: position,
      isHoveringTimeline: time !== null,
    }));
  }, []);

  // Fullscreen Change Event Listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setState((prev) => ({ ...prev, isFullscreen: isFull }));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Picture in Picture Event Listener
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnterPiP = () => {
      setState((prev) => ({ ...prev, isPictureInPicture: true }));
    };
    const handleLeavePiP = () => {
      setState((prev) => ({ ...prev, isPictureInPicture: false }));
    };

    video.addEventListener('enterpictureinpicture', handleEnterPiP);
    video.addEventListener('leavepictureinpicture', handleLeavePiP);
    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPiP);
      video.removeEventListener('leavepictureinpicture', handleLeavePiP);
    };
  }, []);

  // 9. Theatre Mode Toggle
  const toggleTheatreMode = useCallback(() => {
    setState((prev) => {
      const next = !prev.isTheatreMode;
      props.onTheatreModeChange?.(next);
      return { ...prev, isTheatreMode: next };
    });
  }, [props]);

  // Global Keyboard Shortcuts when focusing player
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only process when container or child is focused or active
      if (!containerRef.current?.contains(document.activeElement)) return;

      const key = e.key.toLowerCase();

      // Number keys 0-9 for jumping to percentage of video
      if (/^[0-9]$/.test(key) && state.duration > 0) {
        e.preventDefault();
        const percent = parseInt(key, 10) / 10;
        seek(percent * state.duration);
        return;
      }

      switch (key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'j':
          e.preventDefault();
          rewind(10);
          break;
        case 'l':
          e.preventDefault();
          forward(10);
          break;
        case 'f':
          e.preventDefault();
          if (props.allowFullscreen !== false) toggleFullscreen();
          break;
        case 't':
          e.preventDefault();
          if (props.allowTheatreMode !== false) toggleTheatreMode();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'arrowleft':
          e.preventDefault();
          rewind(5);
          break;
        case 'arrowright':
          e.preventDefault();
          forward(5);
          break;
        case 'arrowup':
          e.preventDefault();
          setVolume(state.volume + 0.1);
          break;
        case 'arrowdown':
          e.preventDefault();
          setVolume(state.volume - 0.1);
          break;
        case 'p':
          e.preventDefault();
          if (props.allowPictureInPicture !== false) togglePictureInPicture();
          break;
        case 'escape':
          if (state.isSettingsOpen) {
            e.preventDefault();
            setState((prev) => ({ ...prev, isSettingsOpen: false }));
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    togglePlay,
    toggleFullscreen,
    toggleTheatreMode,
    toggleMute,
    rewind,
    forward,
    seek,
    setVolume,
    togglePictureInPicture,
    state.volume,
    state.duration,
    state.isSettingsOpen,
    props.allowFullscreen,
    props.allowPictureInPicture,
    props.allowTheatreMode,
  ]);

  const updateDuration = useCallback((duration: number) => {
    setState((prev) => ({ ...prev, duration, isLoading: false }));
  }, []);

  const updateCurrentTime = useCallback((currentTime: number) => {
    setState((prev) => ({ ...prev, currentTime }));
  }, []);

  const updateBuffered = useCallback((buffered: number) => {
    setState((prev) => ({ ...prev, buffered }));
  }, []);

  const updateDimensions = useCallback((width: number, height: number) => {
    if (!width || !height) return;
    const ratio = width / height;
    const orientation: 'vertical' | 'horizontal' | 'square' =
      ratio < 0.85 ? 'vertical' : ratio > 1.15 ? 'horizontal' : 'square';

    setState((prev) => ({
      ...prev,
      orientation,
      aspectRatio: ratio,
      videoDimensions: { width, height },
    }));

    props.onOrientationChange?.(orientation, ratio, { width, height });
    props.onAspectRatioChange?.(ratio, orientation);
  }, [props]);

  const setIsLoading = useCallback((isLoading: boolean) => {
    setState((prev) => ({ ...prev, isLoading }));
  }, []);

  const actions: VideoPlayerActions = {
    play,
    pause,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    setPlaybackRate,
    setQuality,
    toggleFullscreen,
    togglePictureInPicture,
    toggleTheatreMode,
    setSubtitle,
    toggleSettings,
    setControlsVisible,
    setHoverTime,
    updateDuration,
    updateCurrentTime,
    updateBuffered,
    updateDimensions,
    setIsLoading,
    restart,
    forward,
    rewind,
  };

  return (
    <VideoPlayerContext.Provider
      value={{
        state,
        actions,
        videoRef,
        containerRef,
        props,
      }}
    >
      <div
        ref={containerRef}
        tabIndex={0}
        onMouseMove={resetControlsTimer}
        onTouchStart={resetControlsTimer}
        onMouseLeave={() => {
          if (state.playing && !state.isSettingsOpen) {
            setState((prev) => ({ ...prev, isControlsVisible: false }));
          }
        }}
        className={`comms-video-player-container group focus:outline-none ${props.className || ''}`}
        style={{
          borderRadius: props.theme?.borderRadius || undefined,
        }}
      >
        {children}
      </div>
    </VideoPlayerContext.Provider>
  );
};

export default VideoPlayerContext;
