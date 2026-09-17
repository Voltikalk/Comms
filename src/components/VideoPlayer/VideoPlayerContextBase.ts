import { createContext } from 'react';
import type { VideoPlayerContextValue } from '../../types/video-player.types';

export const VideoPlayerContext = createContext<VideoPlayerContextValue | undefined>(undefined);
