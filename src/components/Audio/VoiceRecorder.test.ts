import { describe, it, expect } from 'vitest';
import { normalizeWaveform } from '../../lib/audio-waveform';

describe('Voice Recorder UX Suite', () => {
  it('should format recording timer properly', () => {
    const formatTime = (seconds: number) => {
      const min = Math.floor(seconds / 60);
      const sec = Math.floor(seconds % 60);
      return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    };

    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(9)).toBe('0:09');
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(600)).toBe('10:00');
  });

  it('should calculate slide-to-cancel threshold correctly', () => {
    const isSlideToCancel = (deltaX: number) => deltaX < -70;

    expect(isSlideToCancel(0)).toBe(false);
    expect(isSlideToCancel(-30)).toBe(false);
    expect(isSlideToCancel(-69)).toBe(false);
    expect(isSlideToCancel(-71)).toBe(true);
    expect(isSlideToCancel(-120)).toBe(true);
  });

  it('should calculate swipe-up lock threshold correctly', () => {
    const isSwipeUpLock = (deltaY: number) => deltaY < -50;

    expect(isSwipeUpLock(0)).toBe(false);
    expect(isSwipeUpLock(-20)).toBe(false);
    expect(isSwipeUpLock(-55)).toBe(true);
    expect(isSwipeUpLock(-90)).toBe(true);
  });

  it('should generate 30-bar waveform for voice preview', () => {
    const rawVolumes = [10, 20, 50, 80, 90, 40, 20, 10];
    const waveform = normalizeWaveform(rawVolumes, 30, 8, 100);

    expect(waveform).toHaveLength(30);
    expect(Math.max(...waveform)).toBeLessThanOrEqual(100);
    expect(Math.min(...waveform)).toBeGreaterThanOrEqual(8);
  });
});
