/**
 * TypeScript Interfaces & Types for Comms Custom Video Player
 */

export type VideoQuality = '360p' | '480p' | '720p' | '1080p' | 'auto';

export type PlaybackRate = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2;

export type PlaybackState =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'ended'
  | 'error';

export interface QualityLevel {
  quality: VideoQuality;
  label: string;
  src: string;
  width?: number;
  height?: number;
  bitrate?: number;
}

export interface Subtitle {
  id: string;
  label: string;
  lang: string;
  src: string;
  isDefault?: boolean;
}

export type VideoOrientation = 'vertical' | 'horizontal' | 'square';

export interface PlayerTheme {
  primaryColor?: string; // default: #3390ec (Telegram Blue)
  accentColor?: string;
  backgroundOverlay?: string;
  textColor?: string;
  iconColor?: string;
  borderRadius?: string;
}

export interface VideoPlayerState {
  playing: boolean;
  duration: number; // in seconds
  currentTime: number; // in seconds
  volume: number; // 0 to 1
  isFullscreen: boolean;
  isMuted: boolean;
  playbackRate: PlaybackRate;
  buffered: number; // 0 to 100 percentage
  isPictureInPicture: boolean;
  isTheatreMode: boolean;
  quality: VideoQuality;
  error: string | null;
  playbackState: PlaybackState;
  isLoading: boolean;
  isControlsVisible: boolean;
  isSettingsOpen: boolean;
  activeSubtitleId: string | null;
  isHoveringTimeline: boolean;
  hoverTime: number | null;
  hoverPosition: number | null; // 0 to 100 percentage of width
  orientation?: VideoOrientation;
  aspectRatio?: number;
  videoDimensions?: { width: number; height: number };
}

export interface VideoPlayerActions {
  play: () => Promise<void>;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setPlaybackRate: (rate: PlaybackRate) => void;
  setQuality: (quality: VideoQuality) => void;
  toggleFullscreen: () => Promise<void>;
  togglePictureInPicture: () => Promise<void>;
  toggleTheatreMode: () => void;
  setSubtitle: (id: string | null) => void;
  toggleSettings: () => void;
  setControlsVisible: (visible: boolean) => void;
  setHoverTime: (time: number | null, position: number | null) => void;
  updateDuration: (duration: number) => void;
  updateCurrentTime: (time: number) => void;
  updateBuffered: (buffered: number) => void;
  updateDimensions: (width: number, height: number) => void;
  setIsLoading: (loading: boolean) => void;
  restart: () => void;
  forward: (seconds?: number) => void;
  rewind: (seconds?: number) => void;
}

export interface VideoPlayerContextValue {
  state: VideoPlayerState;
  actions: VideoPlayerActions;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  props: VideoPlayerProps;
}

export interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  duration?: number;
  autoplay?: boolean;
  controls?: boolean;
  muted?: boolean;
  loop?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
  qualityLevels?: QualityLevel[];
  subtitles?: Subtitle[];
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  onVolumeChange?: (volume: number, isMuted: boolean) => void;
  onQualityChange?: (quality: VideoQuality) => void;
  onTheatreModeChange?: (isTheatre: boolean) => void;
  onError?: (error: string) => void;
  onOrientationChange?: (orientation: VideoOrientation, ratio: number, dimensions: { width: number; height: number }) => void;
  onAspectRatioChange?: (ratio: number, orientation: VideoOrientation) => void;
  allowFullscreen?: boolean;
  allowPictureInPicture?: boolean;
  allowTheatreMode?: boolean;
  theme?: PlayerTheme;
  className?: string;
  autoHideControlsDelay?: number;
  aspectRatio?: '16/9' | '4/3' | '1/1' | '9/16' | 'auto';
}
