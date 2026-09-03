import React, { useState } from 'react';
import { usePlatform } from '../../context/PlatformContext';
import {
  IconDeviceDesktop,
  IconDeviceMobile,
  IconSearch,
  IconKeyboard,
  IconDownload,
  IconMaximize,
  IconMinimize,
  IconWifi,
  IconWifiOff,
  IconSparkles,
  IconRefresh
} from '@tabler/icons-react';

interface DesktopTitleBarProps {
  onOpenSearch?: () => void;
  onOpenThemeSettings?: () => void;
  activeRoomName?: string;
  activeRoomIsOnline?: boolean;
  onOpenCommandPalette?: () => void;
}

export const DesktopTitleBar: React.FC<DesktopTitleBarProps> = ({
  onOpenSearch,
  activeRoomName,
  activeRoomIsOnline,
  onOpenCommandPalette,
}) => {
  const {
    os,
    isOnline,
    pingMs,
    viewMode,
    setViewMode,
    isStandalone,
    promptInstall,
    setShowShortcutsModal,
    setShowInstallModal,
    triggerHaptic,
  } = usePlatform();

  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    triggerHaptic('selection');
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const getOsLabel = () => {
    switch (os) {
      case 'windows':
        return 'Windows';
      case 'macos':
        return 'macOS';
      case 'linux':
        return 'Linux';
      default:
        return 'Desktop';
    }
  };

  const handleSearchOrPalette = () => {
    triggerHaptic('selection');
    if (onOpenCommandPalette) {
      onOpenCommandPalette();
    } else if (onOpenSearch) {
      onOpenSearch();
    }
  };

  return (
    <header className="h-10 shrink-0 bg-white/90 dark:bg-[#17212b]/95 backdrop-blur-md border-b border-gray-200/80 dark:border-[#101921] px-3.5 flex items-center justify-between select-none z-40 transition-colors">
      {/* Left: Brand, OS Badge & Breadcrumbs */}
      <div className="flex items-center space-x-2.5 min-w-0">
        <div className="flex items-center space-x-2 shrink-0">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#3390ec] to-[#2563eb] flex items-center justify-center shadow-sm">
            <IconSparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-xs font-semibold tracking-tight text-gray-800 dark:text-gray-100 hidden sm:inline">
            Secure Comms
          </span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-700/40">
            {getOsLabel()}
          </span>
        </div>

        {/* Breadcrumb to active room */}
        {activeRoomName && (
          <div className="hidden lg:flex items-center space-x-1.5 text-xs text-gray-400 dark:text-gray-500 truncate min-w-0">
            <span>›</span>
            <span className="font-semibold text-gray-700 dark:text-gray-200 truncate max-w-[140px] xl:max-w-[200px]">
              {activeRoomName}
            </span>
            {activeRoomIsOnline && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 inline-block" title="В сети" />
            )}
          </div>
        )}

        {/* Network & Ping Indicator */}
        <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#202b36] border border-gray-200/60 dark:border-[#2b3947]/60 text-[11px] shrink-0">
          {isOnline ? (
            <>
              <IconWifi className="w-3 h-3 text-emerald-500" />
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                {pingMs !== null ? `${pingMs}ms` : 'Онлайн'}
              </span>
            </>
          ) : (
            <>
              <IconWifiOff className="w-3 h-3 text-rose-500 animate-pulse" />
              <span className="text-[10px] font-medium text-rose-500">Офлайн</span>
            </>
          )}
        </div>
      </div>

      {/* Center: Command Palette & Global Search Trigger */}
      <div className="hidden md:flex items-center">
        <button
          onClick={handleSearchOrPalette}
          className="flex items-center space-x-2 px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200/80 dark:bg-[#202b36] dark:hover:bg-[#283644] text-gray-500 dark:text-gray-400 text-xs transition-colors border border-transparent hover:border-gray-300/50 dark:hover:border-gray-600/40 cursor-pointer shadow-2xs"
          title="Быстрый поиск и палитра команд (Ctrl+K)"
        >
          <IconSearch className="w-3.5 h-3.5 text-[#3390ec]" />
          <span className="text-[11px]">Поиск и команды</span>
          <kbd className="text-[9px] font-mono bg-white dark:bg-[#17212b] px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-gray-400 shadow-2xs">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right: Hybrid Switcher, Shortcuts, Install & Fullscreen */}
      <div className="flex items-center space-x-1.5">
        {/* Hybrid Layout Mode Selector */}
        <div className="flex items-center bg-gray-100 dark:bg-[#202b36] p-0.5 rounded-lg border border-gray-200/60 dark:border-[#2b3947]/60">
          <button
            onClick={() => {
              triggerHaptic('selection');
              setViewMode('auto');
            }}
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-all ${
              viewMode === 'auto'
                ? 'bg-white dark:bg-[#2b5278] text-[#3390ec] dark:text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
            title="Автоматический адаптивный режим"
          >
            <IconRefresh className="w-3 h-3 inline mr-0.5" />
            Авто
          </button>
          <button
            onClick={() => {
              triggerHaptic('selection');
              setViewMode('desktop');
            }}
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-all ${
              viewMode === 'desktop'
                ? 'bg-white dark:bg-[#2b5278] text-[#3390ec] dark:text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
            title="Принудительный режим ПК (2 колонки)"
          >
            <IconDeviceDesktop className="w-3 h-3 inline mr-0.5" />
            ПК
          </button>
          <button
            onClick={() => {
              triggerHaptic('selection');
              setViewMode('mobile');
            }}
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-all ${
              viewMode === 'mobile'
                ? 'bg-white dark:bg-[#2b5278] text-[#3390ec] dark:text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
            title="Принудительный режим Телефона"
          >
            <IconDeviceMobile className="w-3 h-3 inline mr-0.5" />
            Тел.
          </button>
        </div>

        {/* Keyboard Shortcuts Button */}
        <button
          onClick={() => {
            triggerHaptic('selection');
            setShowShortcutsModal(true);
          }}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#202b36] text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          title="Горячие клавиши (Ctrl+/)"
        >
          <IconKeyboard className="w-4 h-4" />
        </button>

        {/* Install PWA Button if not standalone */}
        {!isStandalone && (
          <button
            onClick={() => {
              triggerHaptic('selection');
              promptInstall().catch(() => setShowInstallModal(true));
            }}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-[#3390ec]/10 hover:bg-[#3390ec]/20 text-[#3390ec] dark:text-[#5ac8fa] text-[11px] font-medium transition-colors border border-[#3390ec]/30"
            title="Установить приложение на устройство"
          >
            <IconDownload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Установить</span>
          </button>
        )}

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#202b36] text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          title={isFullscreen ? 'Выйти из полноэкранного режима' : 'Во весь экран (F11)'}
        >
          {isFullscreen ? <IconMinimize className="w-4 h-4" /> : <IconMaximize className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
