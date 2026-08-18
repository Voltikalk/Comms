export interface Sticker {
  id: string;
  packId: string;
  packTitle: string;
  emoji: string;
  title: string;
  tags?: string[];
  url: string;
  thumbnail?: string;
  animated?: boolean;
  width?: number;
  height?: number;
}

export interface StickerPack {
  id: string;
  title: string;
  icon: string;
  author: string;
  description?: string;
  isAnimated?: boolean;
  stickers: Sticker[];
}

export type MediaPickerTab = 'stickers' | 'emojis' | 'gifs';
