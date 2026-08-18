import React, { useState, useRef, useMemo } from 'react';
import {
  CHAT_WALLPAPERS,
  THEME_ACCENT_COLORS,
  DEFAULT_THEME_CONFIG,
  getWallpaperById,
  getAccentColorById
} from '../../constants/wallpapers';
import type { ChatThemeConfig, CustomWallpaperSettings, WallpaperCategory } from '../../types/theme.types';
import {
  IconX,
  IconCheck,
  IconPlus,
  IconTrash
} from '@tabler/icons-react';
import { compressImage } from '../../lib/image-compression';

interface ThemeSettingsModalProps {
  currentConfig: ChatThemeConfig;
  isDark: boolean;
  onSave: (config: ChatThemeConfig) => void;
  onClose: () => void;
}

export const ThemeSettingsModal: React.FC<ThemeSettingsModalProps> = ({
  currentConfig,
  isDark,
  onSave,
  onClose
}) => {
  const [selectedWallpaperId, setSelectedWallpaperId] = useState(currentConfig.wallpaperId);
  const [selectedAccentId, setSelectedAccentId] = useState(currentConfig.accentColorId);
  const [activeTab, setActiveTab] = useState<'all' | WallpaperCategory>('all');

  const [customWallpaper, setCustomWallpaper] = useState<CustomWallpaperSettings | undefined>(
    currentConfig.customWallpaper
  );

  const initialWallpaper = getWallpaperById(currentConfig.wallpaperId);
  const [blur, setBlur] = useState(
    currentConfig.customWallpaper?.blur ?? initialWallpaper.blur ?? 0
  );
  const [dimming, setDimming] = useState(
    currentConfig.customWallpaper?.dimming ?? initialWallpaper.dimming ?? 20
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeWallpaper = getWallpaperById(selectedWallpaperId);
  const activeAccent = getAccentColorById(selectedAccentId);

  // Filter wallpapers by category tab
  const filteredWallpapers = useMemo(() => {
    if (activeTab === 'all') return CHAT_WALLPAPERS;
    return CHAT_WALLPAPERS.filter((w) => w.category === activeTab);
  }, [activeTab]);

  const isPhoto = selectedWallpaperId === 'custom' || Boolean(activeWallpaper.imageUrl);

  const handleSelectWallpaper = (id: string) => {
    setSelectedWallpaperId(id);
    const wp = getWallpaperById(id);
    if (wp.imageUrl) {
      setDimming(wp.dimming ?? 20);
      setBlur(wp.blur ?? 0);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) return;

    try {
      // Compress uploaded wallpaper to max 1600x1200 JPEG to ensure ultra-fast rendering & zero quota crashes
      const compressedBlob = await compressImage(file, {
        maxWidth: 1600,
        maxHeight: 1200,
        quality: 0.8,
        mimeType: 'image/jpeg'
      });

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setCustomWallpaper({
          imageUrl: dataUrl,
          blur,
          dimming
        });
        setSelectedWallpaperId('custom');
      };
      reader.readAsDataURL(compressedBlob);
    } catch (err) {
      console.warn('Image compression fallback:', err);
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setCustomWallpaper({
          imageUrl: dataUrl,
          blur,
          dimming
        });
        setSelectedWallpaperId('custom');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveCustom = () => {
    setCustomWallpaper(undefined);
    if (selectedWallpaperId === 'custom') {
      setSelectedWallpaperId('classic_tg');
    }
  };

  const handleSave = () => {
    const newConfig: ChatThemeConfig = {
      wallpaperId: selectedWallpaperId,
      accentColorId: selectedAccentId,
      customWallpaper: selectedWallpaperId === 'custom' && customWallpaper
        ? {
            imageUrl: customWallpaper.imageUrl,
            blur,
            dimming
          }
        : customWallpaper
    };
    onSave(newConfig);
    onClose();
  };

  const handleReset = () => {
    setSelectedWallpaperId(DEFAULT_THEME_CONFIG.wallpaperId);
    setSelectedAccentId(DEFAULT_THEME_CONFIG.accentColorId);
    setCustomWallpaper(undefined);
    setBlur(0);
    setDimming(20);
  };

  // Compute live preview background style
  const getPreviewBackgroundStyle = (): React.CSSProperties => {
    if (selectedWallpaperId === 'custom' && customWallpaper?.imageUrl) {
      return {
        backgroundImage: `url(${customWallpaper.imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        filter: blur > 0 ? `blur(${blur}px)` : undefined,
        transform: blur > 0 ? 'scale(1.08)' : undefined
      };
    }

    if (activeWallpaper.imageUrl) {
      return {
        backgroundImage: `url(${activeWallpaper.imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        filter: blur > 0 ? `blur(${blur}px)` : undefined,
        transform: blur > 0 ? 'scale(1.08)' : undefined
      };
    }

    const bgCss = isDark ? activeWallpaper.backgroundCssDark : activeWallpaper.backgroundCssLight;
    const pattern = activeWallpaper.patternSvg;

    if (pattern) {
      return {
        backgroundImage: `${pattern}, ${bgCss}`,
        backgroundSize: '100px 100px, 100% 100%',
        backgroundRepeat: 'repeat, no-repeat'
      };
    }

    return {
      backgroundImage: bgCss,
      backgroundSize: '100% 100%'
    };
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none animate-backdrop"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[450px] bg-white dark:bg-[#17212b] rounded-2xl shadow-2xl border border-slate-200/80 dark:border-white/10 flex flex-col max-h-[90vh] overflow-hidden animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/5 shrink-0">
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">
            Обои для чата
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 tg-scrollbar">
          {/* 1. Compact Live Chat Preview (See real-time Blur & Dimming) */}
          <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-200/80 dark:border-white/10 shadow-inner flex flex-col justify-end p-2.5 select-none">
            {/* Background Canvas Layer */}
            <div
              className="absolute inset-0 transition-all duration-300 pointer-events-none"
              style={getPreviewBackgroundStyle()}
            />

            {/* Dimming overlay layer */}
            {isPhoto && (
              <div
                className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-200"
                style={{ opacity: dimming / 100 }}
              />
            )}

            {/* Live Message Bubbles */}
            <div className="relative z-10 space-y-1.5 w-full">
              {/* Incoming Bubble */}
              <div className="flex items-end gap-1.5">
                <div className="w-5 h-5 rounded-full bg-[#3390ec] text-white flex items-center justify-center text-[9px] font-bold shadow-xs">
                  В
                </div>
                <div className="px-2.5 py-1 rounded-xl rounded-bl-xs bg-white/95 dark:bg-[#182533]/95 text-slate-900 dark:text-white text-[11px] shadow-xs max-w-[80%] backdrop-blur-xs flex items-baseline gap-1.5">
                  <span>Привет! Как тебе фон? 🎨</span>
                  <span className="text-[8.5px] text-slate-400">12:30</span>
                </div>
              </div>

              {/* Outgoing Bubble with selected accent */}
              <div className="flex items-end justify-end">
                <div
                  className="px-2.5 py-1 rounded-xl rounded-br-xs text-white text-[11px] shadow-xs max-w-[80%] flex items-baseline gap-1.5 transition-colors duration-200"
                  style={{ backgroundColor: activeAccent.hex }}
                >
                  <span>Выглядит отлично! 🔥</span>
                  <span className="text-[8.5px] text-white/80 shrink-0">12:31 ✓✓</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Accent Color Dots Row */}
          <div className="flex items-center justify-between gap-1 px-0.5">
            {THEME_ACCENT_COLORS.map((accent) => {
              const isSelected = selectedAccentId === accent.id;
              return (
                <button
                  key={accent.id}
                  type="button"
                  onClick={() => setSelectedAccentId(accent.id)}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white cursor-pointer transition-all ${
                    isSelected
                      ? 'scale-110 ring-2 ring-offset-2 ring-[#3390ec] dark:ring-white dark:ring-offset-[#17212b] shadow-xs'
                      : 'hover:scale-105 opacity-90 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: accent.hex }}
                  title={accent.title}
                >
                  {isSelected && <IconCheck size={13} stroke={3} />}
                </button>
              );
            })}
          </div>

          {/* 3. Category Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'Все' },
              { id: 'photo', label: 'Фото' },
              { id: 'pattern', label: 'Узоры' },
              { id: 'gradient', label: 'Градиенты' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#3390ec] text-white shadow-xs'
                    : 'bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-black/10 dark:hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 4. Wallpaper Grid with Upload Tile */}
          <div className="grid grid-cols-3 gap-2 max-h-[220px] overflow-y-auto tg-scrollbar p-0.5">
            {/* Upload Custom Wallpaper Tile */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`relative h-20 rounded-xl border border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer transition-all group ${
                selectedWallpaperId === 'custom'
                  ? 'border-[#3390ec] bg-[#3390ec]/10 text-[#3390ec]'
                  : 'border-slate-300 dark:border-white/15 hover:border-[#3390ec] text-slate-500 dark:text-slate-400 hover:text-[#3390ec]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-6 h-6 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                <IconPlus size={15} />
              </div>
              <span className="text-[10px] font-medium">Своё фото</span>

              {selectedWallpaperId === 'custom' && customWallpaper && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveCustom();
                  }}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:text-rose-400 cursor-pointer"
                  title="Удалить"
                >
                  <IconTrash size={11} />
                </button>
              )}
            </button>

            {/* Built-in Wallpapers */}
            {filteredWallpapers.map((wallpaper) => {
              const isSelected = selectedWallpaperId === wallpaper.id;
              const bgCss = isDark ? wallpaper.backgroundCssDark : wallpaper.backgroundCssLight;

              return (
                <button
                  key={wallpaper.id}
                  type="button"
                  onClick={() => handleSelectWallpaper(wallpaper.id)}
                  className={`relative h-20 rounded-xl overflow-hidden border transition-all cursor-pointer group flex flex-col justify-end p-1.5 ${
                    isSelected
                      ? 'border-[#3390ec] dark:border-white ring-2 ring-[#3390ec] shadow-md scale-102 z-10'
                      : 'border-slate-200 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/30 opacity-90 hover:opacity-100'
                  }`}
                  title={wallpaper.title}
                >
                  {/* Background Image / Pattern */}
                  {wallpaper.imageUrl ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-110 pointer-events-none"
                      style={{ backgroundImage: `url(${wallpaper.thumbnailUrl || wallpaper.imageUrl})` }}
                    />
                  ) : (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundImage: wallpaper.patternSvg ? `${wallpaper.patternSvg}, ${bgCss}` : bgCss,
                        backgroundSize: wallpaper.patternSvg ? '60px 60px, 100% 100%' : '100% 100%',
                        backgroundRepeat: wallpaper.patternSvg ? 'repeat, no-repeat' : 'no-repeat'
                      }}
                    />
                  )}

                  {/* Dark gradient for text visibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent pointer-events-none" />

                  {/* Selected checkmark badge */}
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#3390ec] text-white flex items-center justify-center shadow-xs">
                      <IconCheck size={11} stroke={3} />
                    </div>
                  )}

                  <span className="relative z-10 text-white text-[9.5px] font-medium truncate text-left leading-tight">
                    {wallpaper.title}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 5. Photo Tuning Sliders (Live Blur & Dimming) */}
          {isPhoto && (
            <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-2 text-xs animate-pop-in">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                <span>Затемнение</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{dimming}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={80}
                step={5}
                value={dimming}
                onChange={(e) => setDimming(Number(e.target.value))}
                className="w-full accent-[#3390ec] cursor-pointer h-1.5 rounded-lg bg-slate-200 dark:bg-white/20"
              />

              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] pt-0.5">
                <span>Размытие (Blur)</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{blur}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                step={1}
                value={blur}
                onChange={(e) => setBlur(Number(e.target.value))}
                className="w-full accent-[#3390ec] cursor-pointer h-1.5 rounded-lg bg-slate-200 dark:bg-white/20"
              />
            </div>
          )}
        </div>

        {/* Minimal Footer */}
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-white/2">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer transition-colors"
          >
            Сбросить
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-[#3390ec] hover:bg-[#2678ca] text-white text-xs font-medium cursor-pointer shadow-xs transition-transform active:scale-95 flex items-center gap-1"
            >
              <IconCheck size={14} />
              <span>Применить</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
