/**
 * Stories (24h ephemeral, pinned up to a year): publish, delete, view, react.
 */
import { checkSocketRateLimit } from '../middleware/rateLimit.js';
import { getStoriesState, pruneExpiredStories, storiesStore } from '../services/store.js';

const MAX_STORIES_PER_USER = 50;

const findStory = (storyAuthor, storyId) =>
  typeof storyAuthor === 'string' ? storiesStore.get(storyAuthor)?.find((s) => s.id === storyId) : undefined;

export function registerStoryHandlers({ io, socket, user, on }) {
  const broadcast = () => io.emit('stories_state', getStoriesState());

  on('send_story', (payload) => {
    if (!payload.data) return;
    if (!checkSocketRateLimit(socket.id, 'send_story', 5, 30000)) {
      socket.emit('rate_limit', { error: 'Слишком частая публикация историй.' });
      return;
    }
    pruneExpiredStories();
    const {
      type = 'text',
      data,
      caption,
      background,
      fontStyle,
      textColor,
      textBgStyle,
      authorName,
      durationHours = 24,
      privacy = 'everyone',
      isPinned = false,
      isCloseFriends = false,
      textOverlays,
      stickerOverlays,
      drawingData,
    } = payload;

    const storyId =
      typeof payload.id === 'string' && payload.id.length <= 64
        ? payload.id
        : `story-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const userStories = storiesStore.get(user) || [];
    if (userStories.some((s) => s.id === storyId)) return;

    const hours = Math.min(48, Math.max(1, Number(durationHours) || 24));
    const now = Date.now();
    userStories.push({
      id: storyId,
      userId: user,
      authorName: typeof authorName === 'string' ? authorName.slice(0, 128) : user,
      type,
      data,
      caption: typeof caption === 'string' ? caption.slice(0, 1000) : undefined,
      background: background || undefined,
      fontStyle: fontStyle || undefined,
      textColor: textColor || undefined,
      textBgStyle: textBgStyle || undefined,
      timestamp: now,
      views: [],
      reactions: {},
      durationHours: hours,
      privacy,
      isPinned: Boolean(isPinned),
      isCloseFriends: Boolean(isCloseFriends),
      textOverlays: Array.isArray(textOverlays) ? textOverlays : undefined,
      stickerOverlays: Array.isArray(stickerOverlays) ? stickerOverlays : undefined,
      drawingData: drawingData || undefined,
      expiresAt: isPinned ? now + 365 * 24 * 60 * 60 * 1000 : now + hours * 60 * 60 * 1000,
    });
    if (userStories.length > MAX_STORIES_PER_USER) userStories.shift();
    storiesStore.set(user, userStories);
    broadcast();
  });

  on('delete_story', ({ storyId }) => {
    if (!storyId) return;
    const filtered = (storiesStore.get(user) || []).filter((s) => s.id !== storyId);
    if (filtered.length === 0) storiesStore.delete(user);
    else storiesStore.set(user, filtered);
    broadcast();
  });

  on('view_story', ({ storyId, storyAuthor }) => {
    const story = findStory(storyAuthor, storyId);
    if (!story || story.views.includes(user)) return;
    story.views.push(user);
    broadcast();
  });

  on('react_story', ({ storyId, storyAuthor, emoji }) => {
    if (typeof emoji !== 'string' || !emoji || emoji.length > 32) return;
    if (!checkSocketRateLimit(socket.id, 'react_story', 30, 10000)) return;
    const story = findStory(storyAuthor, storyId);
    if (!story) return;
    if (!story.reactions) story.reactions = {};
    if (!story.reactions[emoji]) story.reactions[emoji] = [];
    if (!story.reactions[emoji].includes(user)) story.reactions[emoji].push(user);
    if (!story.views.includes(user)) story.views.push(user);
    broadcast();
  });
}
