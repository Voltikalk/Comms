/**
 * Stories (24h ephemeral, pinned up to a year): publish, delete, view, react.
 * Every client gets its own `stories_state` filtered by story audience.
 */
import { checkSocketRateLimit } from '../middleware/rateLimit.js';
import { getStoriesState, pruneExpiredStories, storiesStore, userSockets } from '../services/store.js';

const MAX_STORIES_PER_USER = 50;
const MAX_STICKERS = 30;
const MAX_DRAWING_CHARS = 1_500_000;

const STORY_TYPES = new Set(['text', 'image', 'video']);
const PRIVACY = new Set(['everyone', 'contacts', 'close_friends', 'only_me']);
const FONT_STYLES = new Set(['classic', 'neon', 'bold', 'serif', 'mono', 'script']);
const TEXT_BG_STYLES = new Set(['none', 'fill', 'glow']);

const findStory = (storyAuthor, storyId) =>
  typeof storyAuthor === 'string' ? storiesStore.get(storyAuthor)?.find((s) => s.id === storyId) : undefined;

const clamp = (n, min, max, fallback) => (Number.isFinite(Number(n)) ? Math.min(max, Math.max(min, Number(n))) : fallback);

/** Media must already be uploaded: a server path or an http(s) URL, never a local blob:/data: URL. */
const isMediaUrl = (v) => typeof v === 'string' && v.length <= 2048 && (/^\/uploads\/[\w.-]+$/.test(v) || /^https?:\/\//.test(v));

function sanitizeStickers(list) {
  if (!Array.isArray(list)) return undefined;
  const clean = list
    .slice(0, MAX_STICKERS)
    .filter((s) => s && s.type === 'emoji' && typeof s.content === 'string' && s.content.length <= 16)
    .map((s, i) => ({
      id: typeof s.id === 'string' ? s.id.slice(0, 64) : `stk-${i}`,
      type: 'emoji',
      content: s.content,
      x: clamp(s.x, 0, 100, 50),
      y: clamp(s.y, 0, 100, 50),
      scale: clamp(s.scale, 0.4, 4, 1),
      rotation: clamp(s.rotation, -180, 180, 0),
    }));
  return clean.length > 0 ? clean : undefined;
}

export function registerStoryHandlers({ io, socket, user, on }) {
  const broadcast = () => {
    for (const viewer of userSockets.keys()) io.to(viewer).emit('stories_state', getStoriesState(viewer));
  };

  on('send_story', (payload) => {
    if (!payload || typeof payload.data !== 'string' || !payload.data) return;
    if (!checkSocketRateLimit(socket.id, 'send_story', 5, 30000)) {
      socket.emit('rate_limit', { error: 'Слишком частая публикация историй.' });
      return;
    }
    const type = STORY_TYPES.has(payload.type) ? payload.type : 'text';
    if (type === 'text' ? payload.data.length > 1024 : !isMediaUrl(payload.data)) return;

    pruneExpiredStories();
    const { caption, background, fontStyle, textColor, textBgStyle, authorName, durationHours = 24, isPinned = false, drawingData } = payload;
    const privacy = PRIVACY.has(payload.privacy) ? payload.privacy : 'everyone';

    const storyId =
      typeof payload.id === 'string' && payload.id.length <= 64
        ? payload.id
        : `story-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const userStories = storiesStore.get(user) || [];
    if (userStories.some((s) => s.id === storyId)) return;

    const hours = clamp(durationHours, 1, 48, 24);
    const now = Date.now();
    userStories.push({
      id: storyId,
      userId: user,
      authorName: typeof authorName === 'string' ? authorName.slice(0, 128) : user,
      type,
      data: payload.data,
      caption: typeof caption === 'string' && caption.trim() ? caption.slice(0, 1000) : undefined,
      background: typeof background === 'string' && /^[a-z]{1,32}$/.test(background) ? background : undefined,
      fontStyle: FONT_STYLES.has(fontStyle) ? fontStyle : undefined,
      textColor: typeof textColor === 'string' && /^#[0-9a-f]{3,8}$/i.test(textColor) ? textColor : undefined,
      textBgStyle: TEXT_BG_STYLES.has(textBgStyle) ? textBgStyle : undefined,
      timestamp: now,
      views: [],
      reactions: {},
      durationHours: hours,
      privacy,
      isPinned: Boolean(isPinned),
      isCloseFriends: privacy === 'close_friends',
      stickerOverlays: sanitizeStickers(payload.stickerOverlays),
      drawingData:
        typeof drawingData === 'string' && drawingData.startsWith('data:image/png;base64,') && drawingData.length <= MAX_DRAWING_CHARS
          ? drawingData
          : undefined,
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

  /** Only stories the caller is allowed to see can be viewed or reacted to. */
  const visibleStory = (storyAuthor, storyId) =>
    typeof storyAuthor === 'string' && getStoriesState(user)[storyAuthor]?.some((s) => s.id === storyId)
      ? findStory(storyAuthor, storyId)
      : undefined;

  on('view_story', ({ storyId, storyAuthor }) => {
    const story = visibleStory(storyAuthor, storyId);
    if (!story || story.views.includes(user)) return;
    story.views.push(user);
    broadcast();
  });

  on('react_story', ({ storyId, storyAuthor, emoji }) => {
    if (typeof emoji !== 'string' || !emoji || emoji.length > 32) return;
    if (!checkSocketRateLimit(socket.id, 'react_story', 30, 10000)) return;
    const story = visibleStory(storyAuthor, storyId);
    if (!story) return;
    if (!story.reactions) story.reactions = {};
    if (!story.reactions[emoji]) story.reactions[emoji] = [];
    if (!story.reactions[emoji].includes(user)) story.reactions[emoji].push(user);
    if (!story.views.includes(user)) story.views.push(user);
    broadcast();
  });
}
