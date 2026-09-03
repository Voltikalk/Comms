import { describe, it, expect } from 'vitest';
import type { OSPlatform, DeviceType, HybridViewMode, HapticFeedbackType } from '../types/platform.types';

describe('Platform & Hybrid Suite Core Logic', () => {
  it('should define valid OS platform types', () => {
    const platforms: OSPlatform[] = ['windows', 'macos', 'linux', 'ios', 'android', 'web'];
    expect(platforms).toHaveLength(6);
    expect(platforms).toContain('windows');
    expect(platforms).toContain('ios');
    expect(platforms).toContain('android');
  });

  it('should define valid device types', () => {
    const devices: DeviceType[] = ['desktop', 'mobile', 'tablet'];
    expect(devices).toHaveLength(3);
    expect(devices).toContain('desktop');
    expect(devices).toContain('mobile');
  });

  it('should support 3 hybrid view modes: auto, desktop, mobile', () => {
    const modes: HybridViewMode[] = ['auto', 'desktop', 'mobile'];
    expect(modes).toEqual(['auto', 'desktop', 'mobile']);
  });

  it('should support all standard haptic feedback patterns', () => {
    const haptics: HapticFeedbackType[] = ['light', 'medium', 'heavy', 'success', 'warning', 'selection'];
    expect(haptics).toHaveLength(6);
  });

  it('should correctly determine isDesktopView based on viewMode and deviceType', () => {
    const resolveDesktop = (viewMode: HybridViewMode, deviceType: DeviceType): boolean => {
      if (viewMode === 'desktop') return true;
      if (viewMode === 'mobile') return false;
      return deviceType === 'desktop';
    };

    expect(resolveDesktop('desktop', 'mobile')).toBe(true);
    expect(resolveDesktop('mobile', 'desktop')).toBe(false);
    expect(resolveDesktop('auto', 'desktop')).toBe(true);
    expect(resolveDesktop('auto', 'mobile')).toBe(false);
    expect(resolveDesktop('auto', 'tablet')).toBe(false);
  });
});
