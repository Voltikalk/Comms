/**
 * Stories (24h ephemeral, pinned up to a year): publish, edit, delete, view,
 * react, plus the author's close-friends list. Every client gets its own
 * `stories_state` filtered by story audience.
 */
import { checkSocketRateLimit } from '../middleware/rateLimit.js';
import {
  closeFriendsStore,
  getStoriesState,
  persistCloseFriends,
  persistStory,
  pruneExpiredStories,
  storiesStore,
  unpersistStories,
  userSockets,
} from '../services/store.js';
import { getUser } from '../services/users.js';

const MAX_STORIES_PER_USER = 50;
const MAX_STICKERS = 30;
const MAX_DRAWING_CHARS = 1_500_000;
const MAX_CLOSE_FRIENDS = 500;
const PIN_LIFETIME_MS = 365 * 24 * 60 * 60 * 1000;

const STORY_TYPES = new Set(['text', 'image', 'video']);
const PRIVACY = new Set(['everyone', 'contacts', 'close_friends', 'only_me']);
const FONT_STYLES = new Set(['classic', 'neon', 'bold', 'serif', 'mono', 'script']);
const TEXT_BG_STYLES = new Set(['none', 'fill', 'glow']);

const findStory = (storyAuthor, storyId) =>
  typeof storyAuthor === 'string' ? storiesStore.get(storyAuthor)?.find((s) => s.id === storyId) : undefined;

const clamp = (n, min, max, fallback) => (Number.isFinite(Number(n)) ? Math.min(max, Math.max(min, Number(n))) : fallback);

/** Media must already be uploaded: a server path or an http(s) URL, never a local blob:/data: URL. */
const isMediaUrl = (v) => typeof v === 'string' && v.length <= 2048 && (/^\/uploads\/[\w.-]+$/.test(v) || /^https?:\/\//.test(v));

/** A pinned story stays for a year; otherwise it lives for its chosen duration. */
const expiryOf = (story) =>
  story.isPinned ? story.timestamp + PIN_LIFETIME_MS : story.timestamp + (story.durationHours || 24) * 60 * 60 * 1000;

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

  /** Removes the caller's stories matching `predicate` from memory and the database. */
  const removeOwnStories = (predicate) => {
    const list = storiesStore.get(user) || [];
    const removed = list.filter(predicate);
    if (removed.length === 0) return false;
    const kept = list.filter((s) => !predicate(s));
    if (kept.length === 0) storiesStore.delete(user);
    else storiesStore.set(user, kept);
    unpersistStories(removed.map((s) => s.id));
    return true;
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

    const story = {
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
      timestamp: Date.now(),
      views: [],
      viewTimes: {},
      reactions: {},
      durationHours: clamp(durationHours, 1, 48, 24),
      privacy,
      isPinned: Boolean(isPinned),
      isCloseFriends: privacy === 'close_friends',
      stickerOverlays: sanitizeStickers(payload.stickerOverlays),
      drawingData:
        typeof drawingData === 'string' && drawingData.startsWith('data:image/png;base64,') && drawingData.length <= MAX_DRAWING_CHARS
          ? drawingData
          : undefined,
    };
    story.expiresAt = expiryOf(story);
    userStories.push(story);
    if (userStories.length > MAX_STORIES_PER_USER) unpersistStories([userStories.shift().id]);
    storiesStore.set(user, userStories);
    persistStory(story);
    broadcast();
  });

  /** Owner-only edits after publishing: audience and «Оставить в профиле». */
  on('update_story', ({ storyId, privacy, isPinned }) => {
    const story = findStory(user, storyId);
    if (!story) return;
    if (PRIVACY.has(privacy)) {
      story.privacy = privacy;
      story.isCloseFriends = privacy === 'close_friends';
    }
    if (typeof isPinned === 'boolean' && isPinned !== Boolean(story.isPinned)) {
      story.isPinned = isPinned;
      story.expiresAt = expiryOf(story);
      // Unpinning a story that has already outlived its duration removes it.
      if (story.expiresAt <= Date.now()) {
        removeOwnStories((s) => s.id === story.id);
        broadcast();
        return;
      }
    }
    persistStory(story);
    broadcast();
  });

  on('delete_story', ({ storyId }) => {
    if (!storyId) return;
    if (removeOwnStories((s) => s.id === storyId)) broadcast();
  });

  /** Only stories the caller is allowed to see can be viewed or reacted to. */
  const visibleStory = (storyAuthor, storyId) =>
    typeof storyAuthor === 'string' && storyAuthor !== user && getStoriesState(user)[storyAuthor]?.some((s) => s.id === storyId)
      ? findStory(storyAuthor, storyId)
      : undefined;

  const markViewed = (story) => {
    if (story.views.includes(user)) return false;
    story.views.push(user);
    story.viewTimes = { ...story.viewTimes, [user]: Date.now() };
    return true;
  };

  on('view_story', ({ storyId, storyAuthor }) => {
    const story = visibleStory(storyAuthor, storyId);
    if (!story || !markViewed(story)) return;
    persistStory(story);
    broadcast();
  });

  /** One reaction per viewer: a new emoji replaces the previous one, the same emoji removes it. */
  on('react_story', ({ storyId, storyAuthor, emoji }) => {
    if (typeof emoji !== 'string' || !emoji || emoji.length > 32) return;
    if (!checkSocketRateLimit(socket.id, 'react_story', 30, 10000)) return;
    const story = visibleStory(storyAuthor, storyId);
    if (!story) return;
    const reactions = { ...story.reactions };
    const hadSame = reactions[emoji]?.includes(user);
    for (const key of Object.keys(reactions)) {
      reactions[key] = reactions[key].filter((u) => u !== user);
      if (reactions[key].length === 0) delete reactions[key];
    }
    if (!hadSame) reactions[emoji] = [...(reactions[emoji] || []), user];
    story.reactions = reactions;
    markViewed(story);
    persistStory(story);
    broadcast();
  });

  on('get_close_friends', (_payload, ack) => {
    const list = closeFriendsStore.get(user.toLowerCase());
    ack?.({ ok: true, friends: list ? [...list] : null });
  });

  /** Replaces the caller's close-friends list; `null` resets it to «все контакты». */
  on('set_close_friends', ({ friends }, ack) => {
    if (!checkSocketRateLimit(socket.id, 'set_close_friends', 10, 10000)) {
      ack?.({ ok: false, error: 'Слишком много запросов.' });
      return;
    }
    if (friends !== null && !Array.isArray(friends)) {
      ack?.({ ok: false, error: 'Некорректный список.' });
      return;
    }
    const me = user.toLowerCase();
    if (friends === null) {
      closeFriendsStore.delete(me);
    } else {
      const clean = friends
        .filter((f) => typeof f === 'string' && f.length <= 64)
        .map((f) => String(getUser(f)?.userId || '').toLowerCase())
        .filter((f) => f && f !== me);
      closeFriendsStore.set(me, new Set(clean.slice(0, MAX_CLOSE_FRIENDS)));
    }
    persistCloseFriends(me);
    const saved = closeFriendsStore.get(me);
    ack?.({ ok: true, friends: saved ? [...saved] : null });
    broadcast();
  });
}
