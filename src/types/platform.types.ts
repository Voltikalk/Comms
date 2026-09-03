export type OSPlatform = 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'web';
export type DeviceType = 'desktop' | 'mobile' | 'tablet';
export type HybridViewMode = 'auto' | 'desktop' | 'mobile';

export type HapticFeedbackType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'selection';

export interface PlatformContextType {
  os: OSPlatform;
  deviceType: DeviceType;
  isStandalone: boolean;
  isPwaInstallable: boolean;
  isOnline: boolean;
  pingMs: number | null;
  viewMode: HybridViewMode;
  setViewMode: (mode: HybridViewMode) => void;
  isDesktopView: boolean;
  isMobileView: boolean;
  promptInstall: () => Promise<boolean>;
  triggerHaptic: (type?: HapticFeedbackType) => void;
  showShortcutsModal: boolean;
  setShowShortcutsModal: (show: boolean) => void;
  showInstallModal: boolean;
  setShowInstallModal: (show: boolean) => void;
}
