import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { UserId } from '../types';
import type { Story } from '../types/story.types';
import { applyStoryReaction, orderStoryAuthors } from '../lib/story-utils';
import { useSocket } from './contexts';
import { StoriesContext, type CreateStoryPayload, type StoryUpdate, type StoryViewerTarget } from './stories-context';

const VIEWED_KEY = 'tg_viewed_stories';
const HIDDEN_KEY = 'tg_hidden_story_authors';
const PIN_LIFETIME_MS = 365 * 24 * 60 * 60 * 1000;

const readSet = (key: string): Set<string> => {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(key) || '[]'));
  } catch {
    return new Set<string>();
  }
};

const writeSet = (key: string, set: Set<string>) => {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    // storage full / disabled — the set still works for this session
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

const expiryOf = (s: Pick<Story, 'timestamp' | 'isPinned' | 'durationHours'>) =>
  s.isPinned ? s.timestamp + PIN_LIFETIME_MS : s.timestamp + (s.durationHours || 24) * 60 * 60 * 1000;

export const StoriesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { socket, currentUser } = useSocket();
  const myUser: string = currentUser ?? '';
  const [stories, setStories] = useState<Record<string, Story[]>>({});
  const [viewedSet, setViewedSet] = useState<Set<string>>(() => readSet(VIEWED_KEY));
  const [hiddenSet, setHiddenSet] = useState<Set<string>>(() => readSet(HIDDEN_KEY));
  const [closeFriends, setCloseFriends] = useState<string[] | null>(null);
  const [viewer, setViewer] = useState<StoryViewerTarget | null>(null);

  useEffect(() => {
    if (!socket) return;
    const onState = (state: Record<string, Story[]>) => setStories(pruneLocal(state));
    const loadCloseFriends = () =>
      socket.emit('get_close_friends', {}, (res?: { ok?: boolean; friends?: string[] | null }) => {
        if (res?.ok) setCloseFriends(res.friends ?? null);
      });
    socket.on('stories_state', onState);
    socket.on('connect', loadCloseFriends);
    if (socket.connected) loadCloseFriends();
    return () => {
      socket.off('stories_state', onState);
      socket.off('connect', loadCloseFriends);
    };
  }, [socket]);

  /** Patches one of `author`'s stories in place (optimistic updates). */
  const patchStory = useCallback((author: string, storyId: string, patch: (s: Story) => Story) => {
    setStories((prev) => {
      const list = prev[author];
      if (!list) return prev;
      return { ...prev, [author]: list.map((s) => (s.id === storyId ? patch(s) : s)) };
    });
  }, []);

  const removeOwn = useCallback(
    (storyId: string) =>
      setStories((prev) => {
        const list = (prev[myUser] || []).filter((s) => s.id !== storyId);
        const next = { ...prev };
        if (list.length === 0) delete next[myUser];
        else next[myUser] = list;
        return next;
      }),
    [myUser]
  );

  // Seen = opened on this device, or the server says I viewed it (another device / after clearing storage).
  const serverViewed = useMemo(() => {
    const ids = new Set<string>();
    for (const [uid, list] of Object.entries(stories)) {
      if (uid === myUser) continue;
      for (const s of list) if (s.views.includes(myUser as UserId)) ids.add(s.id);
    }
    return ids;
  }, [stories, myUser]);

  const isStoryViewed = useCallback((storyId: string) => viewedSet.has(storyId) || serverViewed.has(storyId), [viewedSet, serverViewed]);

  const markStoryViewedLocal = useCallback((storyId: string) => {
    setViewedSet((prev) => {
      if (prev.has(storyId)) return prev;
      const next = new Set(prev);
      next.add(storyId);
      writeSet(VIEWED_KEY, next);
      return next;
    });
  }, []);

  const sendStory = useCallback(
    (payload: CreateStoryPayload) => {
      if (!myUser || !payload.data) return;
      const id = `story-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const base = { timestamp: Date.now(), durationHours: payload.durationHours || 24, isPinned: Boolean(payload.isPinned) };
      const story: Story = {
        ...base,
        id,
        userId: myUser as UserId,
        authorName: payload.authorName || myUser,
        type: payload.type,
        data: payload.data,
        caption: payload.caption,
        background: payload.background,
        fontStyle: payload.fontStyle,
        textColor: payload.textColor,
        textBgStyle: payload.textBgStyle,
        views: [],
        viewTimes: {},
        reactions: {},
        privacy: payload.privacy || 'everyone',
        isCloseFriends: payload.privacy === 'close_friends',
        textOverlays: payload.textOverlays,
        stickerOverlays: payload.stickerOverlays,
        drawingData: payload.drawingData,
        expiresAt: expiryOf(base),
      };
      setStories((prev) => ({ ...prev, [myUser]: [...(prev[myUser] || []), story] }));
      socket?.emit('send_story', { ...payload, id });
    },
    [myUser, socket]
  );

  const updateStory = useCallback(
    (storyId: string, patch: StoryUpdate) => {
      if (!myUser) return;
      const current = stories[myUser]?.find((s) => s.id === storyId);
      if (!current) return;
      const next: Story = { ...current };
      if (patch.privacy) {
        next.privacy = patch.privacy;
        next.isCloseFriends = patch.privacy === 'close_friends';
      }
      if (patch.isPinned !== undefined) {
        next.isPinned = patch.isPinned;
        next.expiresAt = expiryOf(next);
      }
      if (next.expiresAt <= Date.now()) removeOwn(storyId);
      else patchStory(myUser, storyId, () => next);
      socket?.emit('update_story', { storyId, ...patch });
    },
    [myUser, stories, socket, patchStory, removeOwn]
  );

  const deleteStory = useCallback(
    (storyId: string) => {
      if (!myUser) return;
      removeOwn(storyId);
      socket?.emit('delete_story', { storyId });
    },
    [myUser, socket, removeOwn]
  );

  const viewStory = useCallback(
    (storyId: string, storyAuthor: UserId) => {
      if (!myUser) return;
      markStoryViewedLocal(storyId);
      patchStory(storyAuthor, storyId, (s) => (s.views.includes(myUser as UserId) ? s : { ...s, views: [...s.views, myUser as UserId] }));
      socket?.emit('view_story', { storyId, storyAuthor });
    },
    [myUser, socket, markStoryViewedLocal, patchStory]
  );

  const reactStory = useCallback(
    (storyId: string, storyAuthor: UserId, emoji: string) => {
      if (!myUser) return;
      markStoryViewedLocal(storyId);
      patchStory(storyAuthor, storyId, (s) => applyStoryReaction(s, myUser, emoji));
      socket?.emit('react_story', { storyId, storyAuthor, emoji });
    },
    [myUser, socket, markStoryViewedLocal, patchStory]
  );

  const isAuthorHidden = useCallback((userId: string) => hiddenSet.has(userId), [hiddenSet]);

  const toggleHiddenAuthor = useCallback((userId: string) => {
    setHiddenSet((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      writeSet(HIDDEN_KEY, next);
      return next;
    });
  }, []);

  const saveCloseFriends = useCallback(
    (friends: string[] | null) =>
      new Promise<boolean>((resolve) => {
        if (!socket?.connected) return resolve(false);
        const timer = window.setTimeout(() => resolve(false), 8000);
        socket.emit('set_close_friends', { friends }, (res?: { ok?: boolean; friends?: string[] | null }) => {
          window.clearTimeout(timer);
          if (res?.ok) setCloseFriends(res.friends ?? null);
          resolve(Boolean(res?.ok));
        });
      }),
    [socket]
  );

  const myStories = useMemo(() => stories[myUser] || [], [stories, myUser]);
  const isViewed = useCallback((s: Story) => isStoryViewed(s.id), [isStoryViewed]);
  const othersStories = useMemo(
    () => orderStoryAuthors(stories, isViewed, (uid) => uid !== myUser && !hiddenSet.has(uid)),
    [stories, isViewed, myUser, hiddenSet]
  );
  const hiddenStories = useMemo(
    () => orderStoryAuthors(stories, isViewed, (uid) => uid !== myUser && hiddenSet.has(uid)),
    [stories, isViewed, myUser, hiddenSet]
  );

  const storiesOf = useCallback((userId: string) => stories[userId === 'me' ? myUser : userId] || [], [stories, myUser]);

  const ringState = useCallback(
    (userId: string): 'none' | 'unseen' | 'seen' => {
      const list = storiesOf(userId);
      if (list.length === 0) return 'none';
      return list.some((s) => !isStoryViewed(s.id)) ? 'unseen' : 'seen';
    },
    [storiesOf, isStoryViewed]
  );

  const openStories = useCallback((userId: string, storyId?: string) => setViewer({ userId, storyId }), []);
  const closeStories = useCallback(() => setViewer(null), []);

  return (
    <StoriesContext.Provider
      value={{
        stories,
        myStories,
        othersStories,
        hiddenStories,
        sendStory,
        updateStory,
        deleteStory,
        viewStory,
        reactStory,
        isStoryViewed,
        markStoryViewedLocal,
        storiesOf,
        ringState,
        isAuthorHidden,
        toggleHiddenAuthor,
        closeFriends,
        saveCloseFriends,
        viewer,
        openStories,
        closeStories,
      }}
    >
      {children}
    </StoriesContext.Provider>
  );
};
