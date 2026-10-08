/**
 * Chat appearance settings (Telegram «Настройки чатов»): accent colour, message
 * text size, bubble corner radius and message font. Applied as CSS variables on
 * <html>, read by `index.css` (`[data-accent]`, `.tg-msg-text`) and the bubble
 * radius helper in `message-grouping.ts`.
 */
import { DEFAULT_THEME_CONFIG, getAccentColorById } from '../constants/wallpapers';
import type { ChatThemeConfig, MessageFont } from '../types/theme.types';

export const TEXT_SIZE = { min: 12, max: 20, default: 15 } as const;
export const BUBBLE_RADIUS_RANGE = { min: 4, max: 22, default: 18 } as const;
export const DEFAULT_MESSAGE_FONT: MessageFont = 'system';

/** Telegram renders messages in the platform UI font (SF / Segoe UI / Roboto). */
const FONT_STACKS: Record<MessageFont, string> = {
  system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
  app: 'var(--font-sans)',
};

const clamp = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback;

export interface AppearanceVars {
  /** Hex of a non-default accent (sets `data-accent`), `null` keeps the design accent. */
  accent: string | null;
  vars: Record<string, string>;
}

export function appearanceVars(config: Partial<ChatThemeConfig>): AppearanceVars {
  const accentId = config.accentColorId || DEFAULT_THEME_CONFIG.accentColorId;
  const textSize = clamp(config.textSize, TEXT_SIZE.min, TEXT_SIZE.max, TEXT_SIZE.default);
  const radius = clamp(config.bubbleRadius, BUBBLE_RADIUS_RANGE.min, BUBBLE_RADIUS_RANGE.max, BUBBLE_RADIUS_RANGE.default);
  const font = config.messageFont && config.messageFont in FONT_STACKS ? config.messageFont : DEFAULT_MESSAGE_FONT;
  return {
    accent: accentId === DEFAULT_THEME_CONFIG.accentColorId ? null : getAccentColorById(accentId).hex,
    vars: {
      '--msg-font-size': `${textSize}px`,
      '--msg-font': FONT_STACKS[font],
      '--tg-bubble-radius': `${radius}px`,
      // Inner corners of a cluster scale with the outer ones (18 → 4, like Telegram).
      '--tg-bubble-radius-grouped': `${Math.max(2, Math.round(radius / 4.5))}px`,
    },
  };
}

export function applyAppearance(config: Partial<ChatThemeConfig>, root: HTMLElement = document.documentElement): void {
  const { accent, vars } = appearanceVars(config);
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  if (accent) {
    root.style.setProperty('--user-accent', accent);
    root.dataset.accent = config.accentColorId;
  } else {
    root.style.removeProperty('--user-accent');
    delete root.dataset.accent;
  }
}
