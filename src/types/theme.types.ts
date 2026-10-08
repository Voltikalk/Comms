export type WallpaperCategory = 'pattern' | 'photo' | 'gradient' | 'minimal' | 'animated' | 'custom';

export interface ChatWallpaper {
  id: string;
  title: string;
  category: WallpaperCategory;
  previewColor: string;
  backgroundCssLight: string;
  backgroundCssDark: string;
  patternSvg?: string;
  patternOpacityLight?: number;
  patternOpacityDark?: number;
  imageUrl?: string;
  thumbnailUrl?: string;
  blur?: number;
  dimming?: number;
  animatedType?: 'squares' | 'aurora' | 'particles' | 'letter-glitch' | 'hyperspeed' | 'waves' | 'dither';
}

export interface ThemeAccentColor {
  id: string;
  title: string;
  hex: string;
  hoverHex: string;
  subtleHex: string;
  borderHex: string;
}

export interface CustomWallpaperSettings {
  imageUrl?: string;
  blur?: number; // 0 to 25 px
  dimming?: number; // 0 to 85 %
}

export type MessageFont = 'system' | 'app';

export interface ChatThemeConfig {
  wallpaperId: string;
  accentColorId: string;
  customWallpaper?: CustomWallpaperSettings;
  patternOpacity?: number;
  /** Message text size, px (12–20, default 15). */
  textSize?: number;
  /** Outer bubble corner radius, px (4–22, default 18). */
  bubbleRadius?: number;
  /** `system` = platform UI font like Telegram, `app` = Geist. */
  messageFont?: MessageFont;
}
