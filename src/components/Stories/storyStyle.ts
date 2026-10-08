import type React from 'react';
import { IconLock, IconStar, IconUsers, IconWorld, type Icon } from '@tabler/icons-react';
import { STORY_FONT_FAMILIES, STORY_GRADIENTS, type StoryFontStyle, type StoryPrivacy } from '../../types/story.types';

/*
 * Shared story rendering. The editor and the viewer both draw onto a 9:16
 * `@container` canvas and size everything in `cqw`, so a story looks the same
 * in the composer, in a 360px sidebar preview and in a full-screen viewer.
 */

export const STORY_TEXT_MAX = 512;
export const STORY_CAPTION_MAX = 200;

export const FONT_LABELS: Record<StoryFontStyle, string> = {
  classic: 'Классика',
  neon: 'Неон',
  bold: 'Жирный',
  serif: 'Сериф',
  mono: 'Моно',
  script: 'Курсив',
};

export const PRIVACY_META: Record<StoryPrivacy, { label: string; hint: string; icon: Icon }> = {
  everyone: { label: 'Все', hint: 'Любой пользователь мессенджера', icon: IconWorld },
  contacts: { label: 'Контакты', hint: 'Те, с кем у вас есть чат', icon: IconUsers },
  close_friends: { label: 'Близкие друзья', hint: 'Контакты, зелёное кольцо', icon: IconStar },
  only_me: { label: 'Только я', hint: 'Черновик, никто больше не увидит', icon: IconLock },
};

/** Long texts shrink so a story never needs scrolling. Value is in cqw. */
export const storyTextSize = (text: string) => {
  const n = text.length;
  if (n <= 24) return 9;
  if (n <= 60) return 7.4;
  if (n <= 140) return 6.2;
  if (n <= 260) return 5.2;
  return 4.4;
};

export const storyGradient = (id?: string) => STORY_GRADIENTS[id || 'telegram'] || STORY_GRADIENTS.telegram;

export interface StoryTextStyle {
  fontStyle?: StoryFontStyle;
  textColor?: string;
  textBgStyle?: 'none' | 'fill' | 'glow';
  align?: 'left' | 'center' | 'right';
}

/** Inline style + class for the text block of a text story. */
export function storyTextProps(text: string, { fontStyle = 'classic', textColor = '#ffffff', textBgStyle = 'none', align = 'center' }: StoryTextStyle) {
  const glow = textBgStyle === 'glow' ? `0 0 2.4cqw ${textColor}, 0 0 6cqw ${textColor}99` : '0 0.4cqw 2cqw rgba(0,0,0,0.25)';
  return {
    style: {
      fontFamily: STORY_FONT_FAMILIES[fontStyle] || STORY_FONT_FAMILIES.classic,
      fontSize: `${storyTextSize(text)}cqw`,
      color: textColor,
      textAlign: align,
      textShadow: textBgStyle === 'fill' ? 'none' : glow,
      fontWeight: fontStyle === 'bold' ? 900 : fontStyle === 'script' ? 500 : 700,
      letterSpacing: fontStyle === 'neon' ? '0.04em' : fontStyle === 'bold' ? '0.01em' : '-0.01em',
      textTransform: fontStyle === 'neon' ? ('uppercase' as const) : undefined,
    } satisfies React.CSSProperties,
    className: `inline-block max-w-full whitespace-pre-wrap break-words leading-[1.18] ${
      textBgStyle === 'fill' ? 'rounded-[3cqw] bg-black/45 px-[4cqw] py-[2.4cqw] backdrop-blur-sm' : ''
    }`,
  };
}

export const formatStoryAge = (ts: number) => {
  const mins = Math.floor(Math.max(0, Date.now() - ts) / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'вчера' : `${days} дн назад`;
};
