import type { UserId } from '../types';

export type StoryPrivacy = 'everyone' | 'contacts' | 'close_friends' | 'only_me';

export type StoryFontStyle = 'classic' | 'neon' | 'bold' | 'serif' | 'mono' | 'script';

export interface StoryTextOverlay {
  id: string;
  text: string;
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  fontSize?: number; // px or scale
  fontStyle?: StoryFontStyle;
  color?: string;
  backgroundColor?: string;
  alignment?: 'left' | 'center' | 'right';
}

export interface StoryStickerOverlay {
  id: string;
  type: 'emoji' | 'sticker';
  content: string; // emoji char or sticker URL
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  scale?: number;
  rotation?: number;
}

export interface Story {
  id: string;
  userId: UserId;
  authorName: string;
  type: 'image' | 'text' | 'video';
  /** Image/video URL or text content */
  data: string;
  /** Optional caption on photo/video stories */
  caption?: string;
  /** Gradient background id for text stories */
  background?: string;
  /** Font style for text stories */
  fontStyle?: StoryFontStyle;
  /** Text color for text stories */
  textColor?: string;
  /** Background pill style for text stories */
  textBgStyle?: 'none' | 'fill' | 'glow';
  timestamp: number;
  views: UserId[];
  expiresAt: number;
  /** Story duration in hours: 6, 12, 24, 48 */
  durationHours?: number;
  /** Privacy access level */
  privacy?: StoryPrivacy;
  /** Whether story is saved permanently to profile */
  isPinned?: boolean;
  /** Whether this story is marked for close friends */
  isCloseFriends?: boolean;
  /** Overlays placed on top of image/video/text */
  textOverlays?: StoryTextOverlay[];
  stickerOverlays?: StoryStickerOverlay[];
  /** Drawing brush canvas data URL (optional doodle) */
  drawingData?: string;
  /** Story emoji reactions: emoji -> list of userIds */
  reactions?: Record<string, UserId[]>;
}

export const STORY_GRADIENTS: Record<string, string> = {
  telegram: 'linear-gradient(135deg, #3390ec, #1c6ec4)',
  sunset: 'linear-gradient(135deg, #f953c6, #b91d73)',
  ocean: 'linear-gradient(135deg, #2193b0, #6dd5ed)',
  night: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)',
  fire: 'linear-gradient(135deg, #f12711, #f5af19)',
  forest: 'linear-gradient(135deg, #134e5e, #71b280)',
  grape: 'linear-gradient(135deg, #654ea3, #eaafc8)',
  peach: 'linear-gradient(135deg, #ff7e5f, #feb47b)',
  aurora: 'linear-gradient(135deg, #00c6ff, #0072ff)',
  neon: 'linear-gradient(135deg, #8a2387, #e94057, #f27121)',
  emerald: 'linear-gradient(135deg, #0575e6, #00f260)',
  cosmic: 'linear-gradient(135deg, #3a1c71, #d76d77, #ffaf7b)'
};

export const STORY_FONT_FAMILIES: Record<StoryFontStyle, string> = {
  classic: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  neon: '"Montserrat", "Inter", sans-serif',
  bold: '"Impact", "Arial Black", sans-serif',
  serif: '"Georgia", "Times New Roman", serif',
  mono: '"JetBrains Mono", "Fira Code", monospace',
  script: '"Brush Script MT", "Caveat", cursive'
};

export const STORY_DURATIONS = [
  { hours: 6, label: '6 ч' },
  { hours: 12, label: '12 ч' },
  { hours: 24, label: '24 ч' },
  { hours: 48, label: '48 ч' }
] as const;

export const STORY_PRIVACY_OPTIONS = [
  { id: 'everyone', label: 'Все', icon: '🌐', desc: 'Видно всем пользователям' },
  { id: 'contacts', label: 'Контакты', icon: '👥', desc: 'Только ваши контакты' },
  { id: 'close_friends', label: 'Близкие друзья', icon: '⭐️', desc: 'Выделяется зеленым кольцом' },
  { id: 'only_me', label: 'Только я', icon: '🔒', desc: 'Черновик, виден только вам' }
] as const;

export const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;
