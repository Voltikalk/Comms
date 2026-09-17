import { useContext } from 'react';
import { VideoPlayerContext } from '../components/VideoPlayer/VideoPlayerContextBase';
import type { VideoPlayerContextValue } from '../types/video-player.types';

export const useVideoPlayerContext = (): VideoPlayerContextValue => {
  const context = useContext(VideoPlayerContext);
  if (!context) {
    throw new Error('useVideoPlayerContext must be used within a VideoPlayerProvider');
  }
  return context;
};

export default useVideoPlayerContext;
