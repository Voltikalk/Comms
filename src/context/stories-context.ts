import { createContext, useContext } from 'react';
import type { UserId } from '../types';
import type {
  Story,
  StoryFontStyle,
  StoryPrivacy,
  StoryTextOverlay,
  StoryStickerOverlay,
} from '../types/story.types';

export interface CreateStoryPayload {
  type: 'image' | 'text' | 'video';
  data: string;
  caption?: string;
  background?: string;
  fontStyle?: StoryFontStyle;
  textColor?: string;
  textBgStyle?: 'none' | 'fill' | 'glow';
  authorName?: string;
  durationHours?: number;
  privacy?: StoryPrivacy;
  isPinned?: boolean;
  isCloseFriends?: boolean;
  textOverlays?: StoryTextOverlay[];
  stickerOverlays?: StoryStickerOverlay[];
  drawingData?: string;
}

export interface StoriesContextType {
  stories: Record<string, Story[]>;
  myStories: Story[];
  othersStories: { userId: UserId; stories: Story[] }[];
  sendStory: (payload: CreateStoryPayload) => void;
  deleteStory: (storyId: string) => void;
  viewStory: (storyId: string, storyAuthor: UserId) => void;
  reactStory: (storyId: string, storyAuthor: UserId, emoji: string) => void;
  isStoryViewed: (storyId: string) => boolean;
  markStoryViewedLocal: (storyId: string) => void;
}

export const StoriesContext = createContext<StoriesContextType | undefined>(undefined);

export const useStories = () => {
  const ctx = useContext(StoriesContext);
  if (!ctx) throw new Error('useStories must be used within StoriesProvider');
  return ctx;
};
