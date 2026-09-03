import { describe, it, expect } from 'vitest';
import {
  normalizeWaveform,
  generateFallbackWaveform,
  formatAudioDuration,
  DEFAULT_WAVEFORM_BARS
} from './audio-waveform';

describe('Audio Waveform Utilities', () => {
  describe('normalizeWaveform', () => {
    it('returns default count of bars when empty array provided', () => {
      const result = normalizeWaveform([]);
      expect(result).toHaveLength(DEFAULT_WAVEFORM_BARS);
      result.forEach((val) => {
        expect(val).toBeGreaterThanOrEqual(8);
        expect(val).toBeLessThanOrEqual(100);
      });
    });

    it('interpolates and upsamples an array with fewer points', () => {
      const raw = [10, 50, 100];
      const result = normalizeWaveform(raw, 30, 10, 100);
      expect(result).toHaveLength(30);
      expect(Math.max(...result)).toBe(100);
      expect(result[0]).toBeLessThan(result[result.length - 1]);
    });

    it('downsamples an array with more points than target bar count', () => {
      const raw = Array.from({ length: 300 }, (_, i) => Math.sin(i / 10) * 50 + 50);
      const result = normalizeWaveform(raw, 30, 5, 100);
      expect(result).toHaveLength(30);
      result.forEach((val) => {
        expect(val).toBeGreaterThanOrEqual(5);
        expect(val).toBeLessThanOrEqual(100);
      });
    });

    it('preserves exact length when target matches input length', () => {
      const raw = [10, 20, 30, 40, 50];
      const result = normalizeWaveform(raw, 5, 0, 100);
      expect(result).toHaveLength(5);
      expect(result[4]).toBe(100);
    });
  });

  describe('generateFallbackWaveform', () => {
    it('generates consistent deterministic waveforms for the same seed', () => {
      const wave1 = generateFallbackWaveform('msg-123', 25);
      const wave2 = generateFallbackWaveform('msg-123', 25);
      expect(wave1).toEqual(wave2);
      expect(wave1).toHaveLength(25);
    });

    it('generates different waveforms for different seeds', () => {
      const waveA = generateFallbackWaveform('user-a', 20);
      const waveB = generateFallbackWaveform('user-z', 20);
      expect(waveA).not.toEqual(waveB);
    });
  });

  describe('formatAudioDuration', () => {
    it('formats seconds correctly into MM:SS', () => {
      expect(formatAudioDuration(0)).toBe('0:00');
      expect(formatAudioDuration(5)).toBe('0:05');
      expect(formatAudioDuration(59)).toBe('0:59');
      expect(formatAudioDuration(60)).toBe('1:00');
      expect(formatAudioDuration(75)).toBe('1:15');
      expect(formatAudioDuration(600)).toBe('10:00');
      expect(formatAudioDuration(3665)).toBe('61:05');
    });

    it('handles negative or invalid values gracefully', () => {
      expect(formatAudioDuration(-10)).toBe('0:00');
      expect(formatAudioDuration(NaN)).toBe('0:00');
      expect(formatAudioDuration(Infinity)).toBe('0:00');
    });
  });
});
