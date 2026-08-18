import type { ChatWallpaper, ThemeAccentColor, ChatThemeConfig } from '../types/theme.types';

// Preset Accent Color Schemes
export const THEME_ACCENT_COLORS: ThemeAccentColor[] = [
  {
    id: 'blue',
    title: 'Telegram Blue',
    hex: '#3390ec',
    hoverHex: '#2678ca',
    subtleHex: 'rgba(51, 144, 236, 0.12)',
    borderHex: 'rgba(51, 144, 236, 0.35)'
  },
  {
    id: 'emerald',
    title: 'Изумрудный',
    hex: '#10b981',
    hoverHex: '#059669',
    subtleHex: 'rgba(16, 185, 129, 0.12)',
    borderHex: 'rgba(16, 185, 129, 0.35)'
  },
  {
    id: 'purple',
    title: 'Неоновый Фиолетовый',
    hex: '#8b5cf6',
    hoverHex: '#7c3aed',
    subtleHex: 'rgba(139, 92, 246, 0.12)',
    borderHex: 'rgba(139, 92, 246, 0.35)'
  },
  {
    id: 'rose',
    title: 'Рубиновый Коралл',
    hex: '#f43f5e',
    hoverHex: '#e11d48',
    subtleHex: 'rgba(244, 63, 94, 0.12)',
    borderHex: 'rgba(244, 63, 94, 0.35)'
  },
  {
    id: 'amber',
    title: 'Янтарный Мед',
    hex: '#f59e0b',
    hoverHex: '#d97706',
    subtleHex: 'rgba(245, 158, 11, 0.12)',
    borderHex: 'rgba(245, 158, 11, 0.35)'
  },
  {
    id: 'cyan',
    title: 'Морской Циан',
    hex: '#06b6d4',
    hoverHex: '#0891b2',
    subtleHex: 'rgba(6, 182, 212, 0.12)',
    borderHex: 'rgba(6, 182, 212, 0.35)'
  },
  {
    id: 'sunset',
    title: 'Закатный Оранж',
    hex: '#ff6b4a',
    hoverHex: '#e85837',
    subtleHex: 'rgba(255, 107, 74, 0.12)',
    borderHex: 'rgba(255, 107, 74, 0.35)'
  },
  {
    id: 'pink',
    title: 'Сакура Розовый',
    hex: '#ec4899',
    hoverHex: '#db2777',
    subtleHex: 'rgba(236, 72, 153, 0.12)',
    borderHex: 'rgba(236, 72, 153, 0.35)'
  }
];

// Helper to generate SVG Telegram Chat Doodle pattern
const createTelegramDoodlePatternSvg = (color: string = 'rgba(255,255,255,0.08)'): string => {
  const rawSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M15 25 L35 15 L28 35 L22 28 L18 31 Z"/>
    <path d="M35 15 L22 28"/>
    <path d="M90 20 C85 15, 75 18, 75 25 C75 32, 90 40, 90 40 C90 40, 105 32, 105 25 C105 18, 95 15, 90 20 Z"/>
    <polygon points="140,15 143,24 152,24 145,29 148,38 140,32 132,38 135,29 128,24 137,24"/>
    <path d="M20 75 H36 V85 C36 89 32 93 28 93 C24 93 20 89 20 85 Z"/>
    <path d="M36 78 H40 C42 78 43 80 43 82 C43 84 42 86 40 86 H36"/>
    <path d="M23 70 Q25 65 24 62 M28 70 Q30 65 29 62 M33 70 Q35 65 34 62"/>
    <path d="M80 75 C72 75 66 80 66 86 C66 89 68 92 71 94 L70 99 L76 96 C77 97 79 97 80 97 C88 97 94 92 94 86 C94 80 88 75 80 75 Z"/>
    <path d="M130 85 C130 76 137 70 145 70 C153 70 160 76 160 85"/>
    <rect x="127" y="83" width="6" height="12" rx="3"/>
    <rect x="147" y="83" width="6" height="12" rx="3"/>
    <circle cx="30" cy="135" r="12"/>
    <polygon points="21,127 24,121 28,124"/>
    <polygon points="32,124 36,121 39,127"/>
    <circle cx="26" cy="133" r="1.5" fill="${color}"/>
    <circle cx="34" cy="133" r="1.5" fill="${color}"/>
    <path d="M28 139 Q30 141 32 139"/>
    <polygon points="90,125 102,125 107,132 90,148 73,132 78,125"/>
    <line x1="78" y1="125" x2="90" y2="148"/>
    <line x1="102" y1="125" x2="90" y2="148"/>
    <line x1="73" y1="132" x2="107" y2="132"/>
    <path d="M140 120 C145 125 145 135 140 140 L135 135 C135 135 132 138 130 142 L128 140 L132 136 C128 134 125 131 125 131 L130 126 C135 121 140 120 140 120 Z"/>
    <circle cx="137" cy="128" r="2"/>
  </svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(rawSvg)}")`;
};

export const DEFAULT_TG_PATTERN_DARK = createTelegramDoodlePatternSvg('rgba(255,255,255,0.06)');
export const DEFAULT_TG_PATTERN_LIGHT = createTelegramDoodlePatternSvg('rgba(0,0,0,0.07)');

// Master Catalog of Telegram Wallpapers
export const CHAT_WALLPAPERS: ChatWallpaper[] = [
  // ==========================================
  // 1. TELEGRAM OFFICIAL DOODLE PATTERNS
  // ==========================================
  {
    id: 'classic_tg',
    title: 'Классический Telegram',
    category: 'pattern',
    previewColor: '#0e1621',
    backgroundCssLight: 'linear-gradient(135deg, #a4c9a8 0%, #8bb18f 100%)',
    backgroundCssDark: 'linear-gradient(180deg, #0e1621 0%, #080d14 100%)',
    patternSvg: DEFAULT_TG_PATTERN_DARK,
    patternOpacityLight: 0.85,
    patternOpacityDark: 0.6
  },
  {
    id: 'tg_midnight',
    title: 'Полночный Сапфир',
    category: 'pattern',
    previewColor: '#0f172a',
    backgroundCssLight: 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)',
    backgroundCssDark: 'linear-gradient(180deg, #0f172a 0%, #0a0f1d 100%)',
    patternSvg: DEFAULT_TG_PATTERN_DARK,
    patternOpacityLight: 0.8,
    patternOpacityDark: 0.65
  },
  {
    id: 'tg_space_dusk',
    title: 'Космический Неон',
    category: 'pattern',
    previewColor: '#180e29',
    backgroundCssLight: 'linear-gradient(135deg, #e9d5ff 0%, #c084fc 100%)',
    backgroundCssDark: 'linear-gradient(180deg, #180e29 0%, #0d0617 100%)',
    patternSvg: createTelegramDoodlePatternSvg('rgba(192, 132, 252, 0.1)'),
    patternOpacityLight: 0.7,
    patternOpacityDark: 0.8
  },
  {
    id: 'tg_emerald',
    title: 'Изумрудный Лес',
    category: 'pattern',
    previewColor: '#06231e',
    backgroundCssLight: 'linear-gradient(135deg, #a7f3d0 0%, #34d399 100%)',
    backgroundCssDark: 'linear-gradient(180deg, #06231e 0%, #031411 100%)',
    patternSvg: createTelegramDoodlePatternSvg('rgba(52, 211, 153, 0.1)'),
    patternOpacityLight: 0.7,
    patternOpacityDark: 0.75
  },
  {
    id: 'tg_sunset_coral',
    title: 'Закатный Коралл',
    category: 'pattern',
    previewColor: '#2a1420',
    backgroundCssLight: 'linear-gradient(135deg, #fecdd3 0%, #fda4af 100%)',
    backgroundCssDark: 'linear-gradient(180deg, #2a1420 0%, #150910 100%)',
    patternSvg: createTelegramDoodlePatternSvg('rgba(251, 113, 133, 0.1)'),
    patternOpacityLight: 0.7,
    patternOpacityDark: 0.75
  },
  {
    id: 'tg_cyber_grid',
    title: 'Киберпанк Grid',
    category: 'pattern',
    previewColor: '#050e1d',
    backgroundCssLight: 'linear-gradient(135deg, #bae6fd 0%, #38bdf8 100%)',
    backgroundCssDark: 'linear-gradient(180deg, #050e1d 0%, #02070e 100%)',
    patternSvg: createTelegramDoodlePatternSvg('rgba(56, 189, 248, 0.12)'),
    patternOpacityLight: 0.6,
    patternOpacityDark: 0.85
  },
  {
    id: 'tg_warm_mocha',
    title: 'Теплый Мокко',
    category: 'pattern',
    previewColor: '#1c1410',
    backgroundCssLight: 'linear-gradient(135deg, #fde68a 0%, #d97706 100%)',
    backgroundCssDark: 'linear-gradient(180deg, #1c1410 0%, #0f0a08 100%)',
    patternSvg: createTelegramDoodlePatternSvg('rgba(245, 158, 11, 0.1)'),
    patternOpacityLight: 0.7,
    patternOpacityDark: 0.7
  },

  // ==========================================
  // 2. HD PHOTO & ART WALLPAPERS (КАК В TELEGRAM)
  // ==========================================
  {
    id: 'photo_mountains',
    title: 'Альпийские Вершины',
    category: 'photo',
    previewColor: '#1e293b',
    backgroundCssLight: '#1e293b',
    backgroundCssDark: '#0f172a',
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=320&q=70',
    dimming: 25,
    blur: 0
  },
  {
    id: 'photo_space_nebula',
    title: 'Глубокий Космос & Небула',
    category: 'photo',
    previewColor: '#130e26',
    backgroundCssLight: '#130e26',
    backgroundCssDark: '#0b0817',
    imageUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=320&q=70',
    dimming: 15,
    blur: 0
  },
  {
    id: 'photo_cyberpunk_tokyo',
    title: 'Неоновый Токио Ночью',
    category: 'photo',
    previewColor: '#0a0d1a',
    backgroundCssLight: '#0a0d1a',
    backgroundCssDark: '#05070e',
    imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1920&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=320&q=70',
    dimming: 20,
    blur: 0
  },
  {
    id: 'photo_pine_forest',
    title: 'Туманный Хвойный Лес',
    category: 'photo',
    previewColor: '#0b1d17',
    backgroundCssLight: '#0b1d17',
    backgroundCssDark: '#050f0c',
    imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1920&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=320&q=70',
    dimming: 25,
    blur: 0
  },
  {
    id: 'photo_sunset_beach',
    title: 'Закатный Океан и Пальмы',
    category: 'photo',
    previewColor: '#2b1319',
    backgroundCssLight: '#2b1319',
    backgroundCssDark: '#16090d',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=320&q=70',
    dimming: 25,
    blur: 0
  },
  {
    id: 'photo_rainy_city',
    title: 'Дождливый Вечерний Город',
    category: 'photo',
    previewColor: '#121824',
    backgroundCssLight: '#121824',
    backgroundCssDark: '#090d14',
    imageUrl: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=1920&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=320&q=70',
    dimming: 20,
    blur: 0
  },
  {
    id: 'photo_sakura_sunset',
    title: 'Сакура на Закате',
    category: 'photo',
    previewColor: '#261220',
    backgroundCssLight: '#261220',
    backgroundCssDark: '#130810',
    imageUrl: 'https://images.unsplash.com/photo-1528164344705-475426879c0d?auto=format&fit=crop&w=1920&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1528164344705-475426879c0d?auto=format&fit=crop&w=320&q=70',
    dimming: 20,
    blur: 0
  },
  {
    id: 'photo_synthwave_horizon',
    title: 'Ретровейв Неон',
    category: 'photo',
    previewColor: '#18072b',
    backgroundCssLight: '#18072b',
    backgroundCssDark: '#0c0317',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=320&q=70',
    dimming: 15,
    blur: 0
  },
  {
    id: 'photo_desert_dunes',
    title: 'Шелковые Песчаные Дюны',
    category: 'photo',
    previewColor: '#2d1e12',
    backgroundCssLight: '#2d1e12',
    backgroundCssDark: '#160e08',
    imageUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1920&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=320&q=70',
    dimming: 25,
    blur: 0
  },
  {
    id: 'photo_dark_silk',
    title: 'Темный Шелк & Волны',
    category: 'photo',
    previewColor: '#0a0a0f',
    backgroundCssLight: '#0a0a0f',
    backgroundCssDark: '#040406',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=320&q=70',
    dimming: 15,
    blur: 0
  },
  {
    id: 'photo_winter_pine',
    title: 'Зимняя Сказка в Тайге',
    category: 'photo',
    previewColor: '#0e1824',
    backgroundCssLight: '#0e1824',
    backgroundCssDark: '#070c12',
    imageUrl: 'https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?auto=format&fit=crop&w=1920&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?auto=format&fit=crop&w=320&q=70',
    dimming: 25,
    blur: 0
  },
  {
    id: 'photo_architectural_light',
    title: 'Неоклассика & Свет',
    category: 'photo',
    previewColor: '#1a1f2c',
    backgroundCssLight: '#1a1f2c',
    backgroundCssDark: '#0d1017',
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1920&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=320&q=70',
    dimming: 30,
    blur: 0
  },

  // ==========================================
  // 3. GRADIENTS & ART
  // ==========================================
  {
    id: 'gradient_aurora',
    title: 'Северное Сияние',
    category: 'gradient',
    previewColor: '#064e3b',
    backgroundCssLight: 'linear-gradient(135deg, #6ee7b7 0%, #3b82f6 100%)',
    backgroundCssDark: 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #0f172a 100%)'
  },
  {
    id: 'gradient_sunset',
    title: 'Закатный Персик',
    category: 'gradient',
    previewColor: '#7c2d12',
    backgroundCssLight: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    backgroundCssDark: 'linear-gradient(135deg, #431407 0%, #2e1065 100%)'
  },
  {
    id: 'gradient_midnight',
    title: 'Глубокая Полночь',
    category: 'gradient',
    previewColor: '#020617',
    backgroundCssLight: 'linear-gradient(180deg, #e2e8f0 0%, #cbd5e1 100%)',
    backgroundCssDark: 'linear-gradient(180deg, #020617 0%, #0f172a 100%)'
  },
  {
    id: 'gradient_cyber_neon',
    title: 'Кибер Неон',
    category: 'gradient',
    previewColor: '#3b0764',
    backgroundCssLight: 'linear-gradient(135deg, #c084fc 0%, #60a5fa 100%)',
    backgroundCssDark: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 50%, #030712 100%)'
  },
  {
    id: 'gradient_lavender',
    title: 'Лавандовая Пастель',
    category: 'gradient',
    previewColor: '#4c1d95',
    backgroundCssLight: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
    backgroundCssDark: 'linear-gradient(135deg, #2e1065 0%, #170d2e 100%)'
  },

  // ==========================================
  // 4. MINIMALIST SOLID
  // ==========================================
  {
    id: 'pure_minimal',
    title: 'Чистый Минимализм',
    category: 'minimal',
    previewColor: '#0e1621',
    backgroundCssLight: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
    backgroundCssDark: 'linear-gradient(180deg, #0e1621 0%, #0b121b 100%)'
  },
  {
    id: 'pure_oled',
    title: 'OLED Истинный Черный',
    category: 'minimal',
    previewColor: '#000000',
    backgroundCssLight: '#ffffff',
    backgroundCssDark: '#000000'
  }
];

export const DEFAULT_THEME_CONFIG: ChatThemeConfig = {
  wallpaperId: 'classic_tg',
  accentColorId: 'blue',
  patternOpacity: 1
};

export function getWallpaperById(id: string): ChatWallpaper {
  if (id === 'custom') {
    return {
      id: 'custom',
      title: 'Своё фото',
      category: 'custom',
      previewColor: '#17212b',
      backgroundCssLight: '#0e1621',
      backgroundCssDark: '#0e1621',
      dimming: 20,
      blur: 0
    };
  }
  return CHAT_WALLPAPERS.find(w => w.id === id) || CHAT_WALLPAPERS[0];
}

export function getAccentColorById(id: string): ThemeAccentColor {
  return THEME_ACCENT_COLORS.find(a => a.id === id) || THEME_ACCENT_COLORS[0];
}
