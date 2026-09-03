import React from 'react';
import { usePlatform } from '../../context/PlatformContext';
import {
  IconX,
  IconDownload,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconShare,
  IconPlus,
  IconCheck,
  IconBolt,
  IconBell,
  IconWifiOff
} from '@tabler/icons-react';

export const AppInstallModal: React.FC = () => {
  const {
    os,
    deviceType,
    showInstallModal,
    setShowInstallModal,
    promptInstall,
    triggerHaptic,
  } = usePlatform();

  if (!showInstallModal) return null;

  const isIos = os === 'ios';
  const isAndroid = os === 'android';
  const isDesktop = deviceType === 'desktop' || os === 'windows' || os === 'macos' || os === 'linux';

  const handleInstallClick = () => {
    triggerHaptic('success');
    promptInstall().catch(() => {});
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-backdrop">
      <div
        className="w-full max-w-md bg-white dark:bg-[#17212b] rounded-3xl shadow-2xl border border-gray-200/80 dark:border-[#202b36] overflow-hidden flex flex-col animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with App Banner */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-[#3390ec]/15 via-transparent to-transparent flex items-start justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#3390ec] to-[#2563eb] flex items-center justify-center shadow-lg shadow-blue-500/25">
              {isDesktop ? (
                <IconDeviceDesktop className="w-6 h-6 text-white" />
              ) : (
                <IconDeviceMobile className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Установить Secure Comms
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isDesktop
                  ? 'Гибридное приложение для вашего ПК'
                  : 'Нативное веб-приложение для телефона'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic('selection');
              setShowInstallModal(false);
            }}
            className="p-1.5 rounded-full hover:bg-gray-200/80 dark:hover:bg-[#202b36] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Benefits list */}
        <div className="px-6 py-3 space-y-2.5">
          <div className="flex items-center space-x-2.5 text-xs text-gray-700 dark:text-gray-300">
            <div className="w-6 h-6 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <IconBolt className="w-3.5 h-3.5" />
            </div>
            <span>Мгновенный запуск и плавная работа 60 FPS</span>
          </div>
          <div className="flex items-center space-x-2.5 text-xs text-gray-700 dark:text-gray-300">
            <div className="w-6 h-6 rounded-full bg-blue-500/15 flex items-center justify-center text-[#3390ec] dark:text-[#5ac8fa] shrink-0">
              <IconBell className="w-3.5 h-3.5" />
            </div>
            <span>Фоновые звуковые и push-уведомления</span>
          </div>
          <div className="flex items-center space-x-2.5 text-xs text-gray-700 dark:text-gray-300">
            <div className="w-6 h-6 rounded-full bg-purple-500/15 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
              <IconWifiOff className="w-3.5 h-3.5" />
            </div>
            <span>Доступ к кэшированным историям и черновикам без интернета</span>
          </div>
        </div>

        {/* Platform Specific Instructions */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-[#101921]/60 border-t border-b border-gray-100 dark:border-[#202b36]">
          {isIos ? (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                Инструкция для iPhone & iPad (Safari):
              </span>
              <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1.5 list-decimal list-inside">
                <li>
                  Нажмите кнопку <strong className="text-[#3390ec]">«Поделиться»</strong> (
                  <IconShare className="w-3.5 h-3.5 inline mx-0.5" />) в нижней панели Safari.
                </li>
                <li>
                  Прокрутите меню и выберите <strong className="text-gray-900 dark:text-gray-100">«На экран "Домой"»</strong> (
                  <IconPlus className="w-3.5 h-3.5 inline mx-0.5" />).
                </li>
                <li>
                  Нажмите <strong className="text-[#3390ec]">«Добавить»</strong> в правом верхнем углу.
                </li>
              </ol>
            </div>
          ) : isAndroid ? (
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Нажмите кнопку ниже для быстрой установки на главный экран Android через Chrome / Samsung Internet.
            </div>
          ) : (
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Установите Secure Comms как отдельное окно с поддержкой закрепления в панели задач Windows / macOS Dock.
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 flex items-center justify-end space-x-3 bg-white dark:bg-[#17212b]">
          <button
            onClick={() => {
              triggerHaptic('selection');
              setShowInstallModal(false);
            }}
            className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#202b36] transition-colors"
          >
            Позже
          </button>
          {!isIos && (
            <button
              onClick={handleInstallClick}
              className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-[#3390ec] hover:bg-[#2678ca] text-white text-xs font-medium shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <IconDownload className="w-4 h-4" />
              <span>Установить сейчас</span>
            </button>
          )}
          {isIos && (
            <button
              onClick={() => {
                triggerHaptic('success');
                setShowInstallModal(false);
              }}
              className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-[#3390ec] hover:bg-[#2678ca] text-white text-xs font-medium transition-colors"
            >
              <IconCheck className="w-4 h-4" />
              <span>Понятно</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
