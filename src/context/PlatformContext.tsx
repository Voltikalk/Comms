import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type {
  OSPlatform,
  DeviceType,
  HybridViewMode,
  HapticFeedbackType,
  PlatformContextType
} from '../types/platform.types';

const PlatformContext = createContext<PlatformContextType | null>(null);

function detectOS(): OSPlatform {
  if (typeof window === 'undefined') return 'web';
  const ua = window.navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/win/.test(ua)) return 'windows';
  if (/mac/.test(ua)) return 'macos';
  if (/linux/.test(ua)) return 'linux';
  return 'web';
}

function detectDevice(): DeviceType {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth;
  const ua = window.navigator.userAgent.toLowerCase();
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  if (/ipad|tablet/.test(ua) || (isTouch && width >= 640 && width <= 1024)) {
    return 'tablet';
  }
  if (/mobi|android|iphone/.test(ua) || width < 768) {
    return 'mobile';
  }
  return 'desktop';
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PlatformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [os] = useState<OSPlatform>(detectOS);
  const [deviceType, setDeviceType] = useState<DeviceType>(detectDevice);
  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error - Safari iOS specific
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')
    );
  });

  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [pingMs, setPingMs] = useState<number | null>(null);

  const [viewMode, setViewModeState] = useState<HybridViewMode>(() => {
    try {
      const saved = localStorage.getItem('comms_view_mode') as HybridViewMode;
      if (saved === 'desktop' || saved === 'mobile' || saved === 'auto') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'auto';
  });

  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [showInstallModal, setShowInstallModal] = useState<boolean>(false);

  const setViewMode = useCallback((mode: HybridViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem('comms_view_mode', mode);
    } catch {
      // ignore
    }
  }, []);

  // Update device detection on resize
  useEffect(() => {
    const handleResize = () => {
      setDeviceType(detectDevice());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Capture PWA Install Prompt
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Monitor Online/Offline Status & Periodic Ping
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      setPingMs(null);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const measurePing = async () => {
      if (!navigator.onLine) {
        setPingMs(null);
        return;
      }
      const start = performance.now();
      try {
        // Lightweight ping check
        await fetch('/manifest.json?t=' + Date.now(), { method: 'HEAD', cache: 'no-cache' });
        const latency = Math.round(performance.now() - start);
        setPingMs(latency);
      } catch {
        setPingMs(null);
      }
    };

    measurePing();
    const interval = setInterval(measurePing, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (installPrompt) {
      try {
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setInstallPrompt(null);
          setIsStandalone(true);
          return true;
        }
      } catch (err) {
        console.warn('Install prompt failed:', err);
      }
      return false;
    }
    // If native prompt is not available (e.g. iOS or manual install), show the helper modal
    setShowInstallModal(true);
    return false;
  }, [installPrompt]);

  const triggerHaptic = useCallback((type: HapticFeedbackType = 'light') => {
    if (typeof window === 'undefined' || !('vibrate' in navigator)) return;
    try {
      switch (type) {
        case 'light':
          navigator.vibrate(10);
          break;
        case 'medium':
          navigator.vibrate(22);
          break;
        case 'heavy':
          navigator.vibrate(40);
          break;
        case 'success':
          navigator.vibrate([15, 30, 20]);
          break;
        case 'warning':
          navigator.vibrate([30, 50, 30]);
          break;
        case 'selection':
          navigator.vibrate(8);
          break;
      }
    } catch {
      // Haptics not allowed by browser policy or device
    }
  }, []);

  const isDesktopView = useMemo(() => {
    if (viewMode === 'desktop') return true;
    if (viewMode === 'mobile') return false;
    return deviceType === 'desktop';
  }, [viewMode, deviceType]);

  const isMobileView = useMemo(() => {
    return !isDesktopView;
  }, [isDesktopView]);

  const value = useMemo<PlatformContextType>(
    () => ({
      os,
      deviceType,
      isStandalone,
      isPwaInstallable: !!installPrompt || os === 'ios' || os === 'android',
      isOnline,
      pingMs,
      viewMode,
      setViewMode,
      isDesktopView,
      isMobileView,
      promptInstall,
      triggerHaptic,
      showShortcutsModal,
      setShowShortcutsModal,
      showInstallModal,
      setShowInstallModal,
    }),
    [
      os,
      deviceType,
      isStandalone,
      installPrompt,
      isOnline,
      pingMs,
      viewMode,
      setViewMode,
      isDesktopView,
      isMobileView,
      promptInstall,
      triggerHaptic,
      showShortcutsModal,
      showInstallModal,
    ]
  );

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
};

export const usePlatform = (): PlatformContextType => {
  const context = useContext(PlatformContext);
  if (!context) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  return context;
};
