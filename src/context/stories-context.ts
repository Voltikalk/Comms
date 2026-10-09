import { createContext, useContext } from 'react';
import type { UserId } from '../types';
import type {
  Story,
  StoryFontStyle,
  StoryPrivacy,
  StoryTextOverlay,
  StoryStickerOverlay,
} from '../types/story.types';
import type { StoryAuthorEntry } from '../lib/story-utils';

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

/** Owner edits after publishing. */
export interface StoryUpdate {
  privacy?: StoryPrivacy;
  isPinned?: boolean;
}

/** Which stories the full-screen viewer shows: 'me' or an author, optionally from a given story. */
export interface StoryViewerTarget {
  userId: string;
  storyId?: string;
}

export interface StoriesContextType {
  stories: Record<string, Story[]>;
  myStories: Story[];
  /** Authors whose stories are shown in the bar (hidden authors excluded). */
  othersStories: StoryAuthorEntry[];
  /** Authors the user chose to hide («Скрыть истории»). */
  hiddenStories: StoryAuthorEntry[];
  sendStory: (payload: CreateStoryPayload) => void;
  updateStory: (storyId: string, patch: StoryUpdate) => void;
  deleteStory: (storyId: string) => void;
  viewStory: (storyId: string, storyAuthor: UserId) => void;
  /** One reaction per story: a different emoji replaces it, the same one removes it. */
  reactStory: (storyId: string, storyAuthor: UserId, emoji: string) => void;
  isStoryViewed: (storyId: string) => boolean;
  markStoryViewedLocal: (storyId: string) => void;
  /** Stories of `userId` visible to me (`'me'` / own id → my stories). */
  storiesOf: (userId: string) => Story[];
  /** Ring state for an avatar: none, has unseen stories, or all seen. */
  ringState: (userId: string) => 'none' | 'unseen' | 'seen';

  isAuthorHidden: (userId: string) => boolean;
  toggleHiddenAuthor: (userId: string) => void;

  /** My explicit close-friends list; `null` = all contacts. */
  closeFriends: string[] | null;
  saveCloseFriends: (friends: string[] | null) => Promise<boolean>;

  viewer: StoryViewerTarget | null;
  openStories: (userId: string, storyId?: string) => void;
  closeStories: () => void;
}

export const StoriesContext = createContext<StoriesContextType | undefined>(undefined);

export const useStories = () => {
  const ctx = useContext(StoriesContext);
  if (!ctx) throw new Error('useStories must be used within StoriesProvider');
  return ctx;
};
