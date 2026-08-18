export type WallpaperCategory = 'pattern' | 'photo' | 'gradient' | 'minimal' | 'custom';

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
  imageUrl: string;
  blur: number; // 0 to 25 px
  dimming: number; // 0 to 85 %
}

export interface ChatThemeConfig {
  wallpaperId: string;
  accentColorId: string;
  customWallpaper?: CustomWallpaperSettings;
  patternOpacity?: number;
}
