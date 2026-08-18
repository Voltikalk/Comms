/**
 * Comms Design System Color Palettes & Tokens
 * Inspired by Coolors.co, Adobe Color & Apple / Telegram Human Interface Guidelines
 */

export interface ColorToken {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
  DEFAULT: string;
}

export const BRAND_COLORS = {
  // Primary Telegram Sapphire Blue (Coolors #0066FF / Adobe Color Harmony)
  primary: {
    50: '#EBF3FF',
    100: '#D6E7FF',
    200: '#ADCFFF',
    300: '#70AFFF',
    400: '#3385FF',
    500: '#0066FF',
    600: '#0052CC',
    700: '#003D99',
    800: '#002966',
    900: '#001433',
    950: '#000A1A',
    DEFAULT: '#0066FF',
  } as ColorToken,

  // Secondary Electric Purple / Violet (Coolors #9933FF)
  secondary: {
    50: '#F5EBFF',
    100: '#EBD6FF',
    200: '#D6ADFF',
    300: '#B870FF',
    400: '#A347FF',
    500: '#9933FF',
    600: '#7A24D4',
    700: '#5C17A3',
    800: '#3D0A70',
    900: '#1F033D',
    950: '#0F011F',
    DEFAULT: '#9933FF',
  } as ColorToken,

  // Success Emerald Green (Coolors #00D084)
  success: {
    50: '#E6FAF2',
    100: '#CCF5E6',
    200: '#99EBCD',
    300: '#66E0B3',
    400: '#33D69A',
    500: '#00D084',
    600: '#00A66A',
    700: '#007D50',
    800: '#005335',
    900: '#002A1B',
    950: '#00150D',
    DEFAULT: '#00D084',
  } as ColorToken,

  // Error Ruby Crimson (Coolors #FF3333)
  error: {
    50: '#FFEBEB',
    100: '#FFD6D6',
    200: '#FFADAD',
    300: '#FF7070',
    400: '#FF4747',
    500: '#FF3333',
    600: '#CC2424',
    700: '#991717',
    800: '#660A0A',
    900: '#330303',
    950: '#1A0101',
    DEFAULT: '#FF3333',
  } as ColorToken,

  // Telegram Dark Mode Surface Palette
  darkSurfaces: {
    base: '#0E1621',
    card: '#17212B',
    cardElevated: '#242F3D',
    border: 'rgba(255, 255, 255, 0.12)',
    input: '#0E1621',
    textPrimary: '#FFFFFF',
    textSecondary: '#8E9BA8',
    textMuted: '#64748B',
  },

  // Telegram Light Mode Surface Palette
  lightSurfaces: {
    base: '#F5F7FF',
    card: 'rgba(255, 255, 255, 0.85)',
    cardElevated: '#FFFFFF',
    border: 'rgba(0, 102, 255, 0.15)',
    input: 'rgba(255, 255, 255, 0.9)',
    textPrimary: '#1A1A1A',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
  },

  // Gradients
  gradients: {
    primary: 'linear-gradient(135deg, #0066FF 0%, #9933FF 100%)',
    primaryHover: 'linear-gradient(135deg, #0052CC 0%, #7A24D4 100%)',
    success: 'linear-gradient(135deg, #00D084 0%, #0066FF 100%)',
    conicBorder: 'conic-gradient(from 0deg, #0066FF, #9933FF, #00D084, #0066FF)',
    glassCard: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.04) 100%)',
  },
};

/**
 * Helper to convert HEX to RGBA with custom opacity
 */
export function hexToRgba(hex: string, alpha = 1): string {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map((char) => char + char).join('');
  }
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default BRAND_COLORS;
