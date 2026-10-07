import { createContext, useContext } from 'react';
import type { VideoPlayerContextValue } from '../../types/video-player.types';

export const VideoPlayerContext = createContext<VideoPlayerContextValue | undefined>(undefined);

export const useVideoPlayerContext = (): VideoPlayerContextValue => {
  const context = useContext(VideoPlayerContext);
  if (!context) {
    throw new Error('useVideoPlayerContext must be used within a VideoPlayerProvider');
  }
  return context;
};
