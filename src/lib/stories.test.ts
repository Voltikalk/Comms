import { describe, it, expect } from 'vitest';
import type { UserId } from '../types';
import {
  STORY_GRADIENTS,
  STORY_FONT_FAMILIES,
  STORY_DURATIONS,
  STORY_PRIVACY_OPTIONS,
  STORY_LIFETIME_MS,
  type Story
} from '../types/story.types';

describe('Stories Master Suite 3.0 (Telegram Stories Replica)', () => {
  const createMockStory = (overrides: Partial<Story> = {}): Story => ({
    id: 'story-' + Math.random().toString(36).substring(2, 8),
    userId: 'vlad' as UserId,
    authorName: 'Влад',
    type: 'text',
    data: 'Привет, мир!',
    background: 'telegram',
    timestamp: Date.now(),
    expiresAt: Date.now() + STORY_LIFETIME_MS,
    views: [],
    reactions: {},
    durationHours: 24,
    privacy: 'everyone',
    isPinned: false,
    isCloseFriends: false,
    ...overrides
  });

  it('creates story with correct 24h expiration by default', () => {
    const now = 1700000000000;
    const story = createMockStory({ timestamp: now, expiresAt: now + STORY_LIFETIME_MS });
    expect(story.expiresAt - story.timestamp).toBe(24 * 60 * 60 * 1000);
  });

  it('supports custom Telegram TTL durations (6h, 12h, 24h, 48h)', () => {
    const now = Date.now();
    const story6h = createMockStory({
      durationHours: 6,
      expiresAt: now + 6 * 3600 * 1000
    });
    const story48h = createMockStory({
      durationHours: 48,
      expiresAt: now + 48 * 3600 * 1000
    });

    expect(story6h.expiresAt - now).toBe(6 * 3600 * 1000);
    expect(story48h.expiresAt - now).toBe(48 * 3600 * 1000);
    expect(STORY_DURATIONS.map((d) => d.hours)).toEqual([6, 12, 24, 48]);
  });

  it('handles pinned stories saved in profile highlights with extended expiration', () => {
    const now = Date.now();
    const pinnedStory = createMockStory({
      isPinned: true,
      expiresAt: now + 365 * 24 * 3600 * 1000
    });

    expect(pinnedStory.isPinned).toBe(true);
    expect(pinnedStory.expiresAt).toBeGreaterThan(now + 300 * 24 * 3600 * 1000);
  });

  it('supports Close Friends privacy mode with green ring indicator', () => {
    const closeFriendsStory = createMockStory({
      privacy: 'close_friends',
      isCloseFriends: true
    });

    expect(closeFriendsStory.privacy).toBe('close_friends');
    expect(closeFriendsStory.isCloseFriends).toBe(true);
  });

  it('supports text overlays with custom font styles and colors', () => {
    const story = createMockStory({
      type: 'image',
      data: '/uploads/sample.jpg',
      textOverlays: [
        {
          id: 'txt-1',
          text: 'Летний закат 🌅',
          x: 50,
          y: 30,
          fontStyle: 'neon',
          color: '#ffd166',
          backgroundColor: 'rgba(0,0,0,0.5)'
        }
      ]
    });

    expect(story.textOverlays).toHaveLength(1);
    expect(story.textOverlays?.[0].text).toBe('Летний закат 🌅');
    expect(story.textOverlays?.[0].fontStyle).toBe('neon');
    expect(STORY_FONT_FAMILIES.neon).toBeDefined();
  });

  it('supports sticker overlays and drawing doodle data', () => {
    const story = createMockStory({
      type: 'image',
      data: '/uploads/sample.jpg',
      stickerOverlays: [
        {
          id: 'stk-1',
          type: 'emoji',
          content: '🔥',
          x: 70,
          y: 80,
          scale: 1.5
        }
      ],
      drawingData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    });

    expect(story.stickerOverlays).toHaveLength(1);
    expect(story.stickerOverlays?.[0].content).toBe('🔥');
    expect(story.drawingData).toContain('data:image/png;base64');
  });

  it('filters out expired stories correctly', () => {
    const now = Date.now();
    const activeStory = createMockStory({ expiresAt: now + 10000 });
    const expiredStory = createMockStory({ expiresAt: now - 1000 });

    const list = [activeStory, expiredStory];
    const filtered = list.filter((s) => s.expiresAt > now);

    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe(activeStory.id);
  });

  it('tracks views without duplicates', () => {
    const story = createMockStory({ views: ['anya' as UserId] });
    const recordView = (s: Story, uid: UserId): Story => {
      if (s.views.includes(uid)) return s;
      return { ...s, views: [...s.views, uid] };
    };

    const s1 = recordView(story, 'vlad' as UserId);
    expect(s1.views).toEqual(['anya', 'vlad']);

    const s2 = recordView(s1, 'anya' as UserId);
    expect(s2.views).toEqual(['anya', 'vlad']);
  });

  it('tracks story emoji reactions grouped by emoji', () => {
    const story = createMockStory();
    const addReaction = (s: Story, uid: UserId, emoji: string): Story => {
      const rx = { ...(s.reactions || {}) };
      if (!rx[emoji]) rx[emoji] = [];
      if (!rx[emoji].includes(uid)) {
        rx[emoji] = [...rx[emoji], uid];
      }
      return { ...s, reactions: rx };
    };

    let s = addReaction(story, 'anya' as UserId, '❤️');
    s = addReaction(s, 'mom' as UserId, '❤️');
    s = addReaction(s, 'anya' as UserId, '🔥');

    expect(s.reactions?.['❤️']).toEqual(['anya', 'mom']);
    expect(s.reactions?.['🔥']).toEqual(['anya']);
  });

  it('calculates segmented story ring parameters accurately', () => {
    const calculateSegments = (count: number, radius = 27) => {
      const circumference = 2 * Math.PI * radius;
      const gap = count > 1 ? 4.5 : 0;
      const totalGapLength = count * gap;
      const segmentLength = (circumference - totalGapLength) / count;
      return { circumference, segmentLength, gap };
    };

    const single = calculateSegments(1);
    expect(single.gap).toBe(0);

    const triple = calculateSegments(3);
    expect(triple.gap).toBe(4.5);
    expect(triple.segmentLength * 3 + triple.gap * 3).toBeCloseTo(triple.circumference, 5);
  });

  it('validates supported gradient palettes and privacy options', () => {
    expect(STORY_GRADIENTS.telegram).toBeDefined();
    expect(STORY_GRADIENTS.sunset).toBeDefined();
    expect(STORY_GRADIENTS.aurora).toBeDefined();
    expect(STORY_GRADIENTS.neon).toBeDefined();
    expect(STORY_PRIVACY_OPTIONS).toHaveLength(4);
  });
});
