import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { UserId } from '../types';
import type {
  Story,
  StoryFontStyle,
  StoryPrivacy,
  StoryTextOverlay,
  StoryStickerOverlay
} from '../types/story.types';
import { useSocket } from './SocketContext';

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

interface StoriesContextType {
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

const StoriesContext = createContext<StoriesContextType | undefined>(undefined);

export const useStories = () => {
  const ctx = useContext(StoriesContext);
  if (!ctx) throw new Error('useStories must be used within StoriesProvider');
  return ctx;
};

const readLocalViewedStories = (): Set<string> => {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem('tg_viewed_stories') || '[]'));
  } catch {
    return new Set<string>();
  }
};

const pruneLocal = (state: Record<string, Story[]>): Record<string, Story[]> => {
  const now = Date.now();
  const next: Record<string, Story[]> = {};
  Object.entries(state).forEach(([uid, list]) => {
    const alive = list.filter((s) => s.expiresAt > now);
    if (alive.length > 0) next[uid] = alive;
  });
  return next;
};

export const StoriesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { socket, currentUser } = useSocket();
  const [stories, setStories] = useState<Record<string, Story[]>>({});
  const [viewedSet, setViewedSet] = useState<Set<string>>(() => readLocalViewedStories());

  useEffect(() => {
    if (!socket) return;

    const handleStoriesState = (state: Record<string, Story[]>) => {
      setStories(pruneLocal(state));
    };

    socket.on('stories_state', handleStoriesState);

    return () => {
      socket.off('stories_state', handleStoriesState);
    };
  }, [socket]);

  const myUser = (currentUser as string) || (typeof window !== 'undefined' ? localStorage.getItem('chat_user_v2') : null) || '';

  const markStoryViewedLocal = useCallback((storyId: string) => {
    setViewedSet((prev) => {
      if (prev.has(storyId)) return prev;
      const next = new Set(prev);
      next.add(storyId);
      try {
        localStorage.setItem('tg_viewed_stories', JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const isStoryViewed = useCallback((storyId: string): boolean => {
    return viewedSet.has(storyId);
  }, [viewedSet]);

  const sendStory = useCallback((payload: CreateStoryPayload) => {
    if (!myUser || !payload.data) return;

    const durationHours = payload.durationHours || 24;
    const lifetimeMs = durationHours * 60 * 60 * 1000;
    const tempId = 'story-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

    const newStory: Story = {
      id: tempId,
      userId: myUser as UserId,
      authorName: payload.authorName || myUser,
      type: payload.type,
      data: payload.data,
      caption: payload.caption,
      background: payload.background,
      fontStyle: payload.fontStyle,
      textColor: payload.textColor,
      textBgStyle: payload.textBgStyle,
      timestamp: Date.now(),
      views: [],
      reactions: {},
      durationHours,
      privacy: payload.privacy || 'everyone',
      isPinned: Boolean(payload.isPinned),
      isCloseFriends: Boolean(payload.isCloseFriends),
      textOverlays: payload.textOverlays,
      stickerOverlays: payload.stickerOverlays,
      drawingData: payload.drawingData,
      expiresAt: payload.isPinned ? Date.now() + 365 * 24 * 60 * 60 * 1000 : Date.now() + lifetimeMs
    };

    // Optimistic update
    setStories((prev) => {
      const userList = prev[myUser] ? [...prev[myUser], newStory] : [newStory];
      return { ...prev, [myUser]: userList };
    });

    socket?.emit('send_story', { ...payload, id: tempId });
  }, [myUser, socket]);

  const deleteStory = useCallback((storyId: string) => {
    if (!myUser) return;
    // Optimistic update
    setStories((prev) => {
      const userList = (prev[myUser] || []).filter((s) => s.id !== storyId);
      const next = { ...prev };
      if (userList.length === 0) {
        delete next[myUser];
      } else {
        next[myUser] = userList;
      }
      return next;
    });

    socket?.emit('delete_story', { storyId });
  }, [myUser, socket]);

  const viewStory = useCallback((storyId: string, storyAuthor: UserId) => {
    if (!myUser) return;
    markStoryViewedLocal(storyId);

    // Optimistic update
    setStories((prev) => {
      const list = prev[storyAuthor];
      if (!list) return prev;
      return {
        ...prev,
        [storyAuthor]: list.map((s) => {
          if (s.id === storyId && !s.views.includes(myUser as UserId)) {
            return { ...s, views: [...s.views, myUser as UserId] };
          }
          return s;
        })
      };
    });

    socket?.emit('view_story', { storyId, storyAuthor });
  }, [myUser, socket, markStoryViewedLocal]);

  const reactStory = useCallback((storyId: string, storyAuthor: UserId, emoji: string) => {
    if (!myUser) return;
    markStoryViewedLocal(storyId);

    // Optimistic update
    setStories((prev) => {
      const list = prev[storyAuthor];
      if (!list) return prev;
      return {
        ...prev,
        [storyAuthor]: list.map((s) => {
          if (s.id === storyId) {
            const rx = { ...(s.reactions || {}) };
            if (!rx[emoji]) rx[emoji] = [];
            if (!rx[emoji].includes(myUser as UserId)) {
              rx[emoji] = [...rx[emoji], myUser as UserId];
            }
            const views = s.views.includes(myUser as UserId) ? s.views : [...s.views, myUser as UserId];
            return { ...s, reactions: rx, views };
          }
          return s;
        })
      };
    });

    socket?.emit('react_story', { storyId, storyAuthor, emoji });
  }, [myUser, socket, markStoryViewedLocal]);

  const myStories = stories[myUser] || [];
  const othersStories = Object.entries(stories)
    .filter(([uid]) => uid !== myUser)
    .map(([userId, list]) => ({ userId: userId as UserId, stories: list }));

  return (
    <StoriesContext.Provider
      value={{
        stories,
        myStories,
        othersStories,
        sendStory,
        deleteStory,
        viewStory,
        reactStory,
        isStoryViewed,
        markStoryViewedLocal
      }}
    >
      {children}
    </StoriesContext.Provider>
  );
};
