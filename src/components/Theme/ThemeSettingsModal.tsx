import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CHAT_WALLPAPERS, THEME_ACCENT_COLORS, DEFAULT_THEME_CONFIG, getWallpaperById } from '../../constants/wallpapers';
import type { ChatThemeConfig, MessageFont, WallpaperCategory } from '../../types/theme.types';
import { IconX, IconCheck, IconChecks, IconPlus, IconTrash, IconSun, IconMoon } from '@tabler/icons-react';
import { compressImage } from '../../lib/image-compression';
import { BUBBLE_RADIUS_RANGE, DEFAULT_MESSAGE_FONT, TEXT_SIZE } from '../../lib/appearance';
import { bubbleRadiusCss, getBubbleCorners } from '../../lib/message-grouping';
import { Squares, Aurora, Particles, LetterGlitch, Hyperspeed, Waves, Dither } from '../Backgrounds';

interface ThemeSettingsModalProps {
  currentConfig: ChatThemeConfig;
  isDark: boolean;
  /** Switches the app between light and dark (applied immediately). */
  onToggleDark?: () => void;
  /** Called with every draft change so the whole app previews it live. */
  onPreview?: (config: ChatThemeConfig) => void;
  onSave: (config: ChatThemeConfig) => void;
  onClose: () => void;
}

const CATEGORIES: Array<{ id: 'all' | WallpaperCategory; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'pattern', label: 'Узоры' },
  { id: 'photo', label: 'Фото' },
  { id: 'gradient', label: 'Градиенты' },
  { id: 'minimal', label: 'Минимал' },
  { id: 'animated', label: 'Анимация' },
];

const FONTS: Array<{ id: MessageFont; label: string; hint: string }> = [
  { id: 'system', label: 'Системный', hint: 'как в Telegram' },
  { id: 'app', label: 'Geist', hint: 'шрифт приложения' },
];

const Section: React.FC<{ title: string; aside?: React.ReactNode; children: React.ReactNode }> = ({ title, aside, children }) => (
  <section className="space-y-2.5">
    <div className="flex items-center justify-between px-0.5">
      <h3 className="text-[13px] font-semibold text-accent">{title}</h3>
      {aside}
    </div>
    {children}
  </section>
);

const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  left?: React.ReactNode;
  right?: React.ReactNode;
}> = ({ label, value, min, max, step = 1, unit = '', onChange, left, right }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between text-[13.5px]">
      <span className="text-ink">{label}</span>
      <span className="tabular-nums text-muted">
        {value}
        {unit}
      </span>
    </div>
    <div className="flex items-center gap-3">
      {left}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="ui-range flex-1"
        style={{ '--range-fill': `${((value - min) / (max - min)) * 100}%` } as React.CSSProperties}
      />
      {right}
    </div>
  </div>
);

/** Mini light/dark mockup for the theme cards. */
const ThemeCard: React.FC<{ dark: boolean; active: boolean; onClick: () => void }> = ({ dark, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`group flex flex-1 flex-col items-center gap-2 rounded-2xl p-2 transition-colors cursor-pointer ${
      active ? 'bg-accent-muted' : 'hover:bg-elevated'
    }`}
  >
    <span
      className={`relative flex h-[78px] w-full flex-col justify-center gap-1.5 overflow-hidden rounded-xl border px-2.5 transition-shadow ${
        active ? 'border-accent shadow-[0_0_0_1.5px_var(--accent)]' : 'border-line'
      }`}
      style={{ background: dark ? '#08080a' : '#eeeeea' }}
    >
      <span className="h-3.5 w-[62%] rounded-[7px] rounded-bl-[2px]" style={{ background: dark ? '#18181b' : '#ffffff' }} />
      <span className="ml-auto h-3.5 w-[54%] rounded-[7px] rounded-br-[2px] bg-[var(--accent)] opacity-90" />
      <span className="h-3.5 w-[40%] rounded-[7px] rounded-bl-[2px]" style={{ background: dark ? '#18181b' : '#ffffff' }} />
    </span>
    <span className={`flex items-center gap-1.5 text-[13px] font-medium ${active ? 'text-accent' : 'text-ink-2'}`}>
      {dark ? <IconMoon size={15} /> : <IconSun size={15} />}
      {dark ? 'Тёмная' : 'Светлая'}
    </span>
  </button>
);

/**
 * «Оформление» — Telegram-style chat appearance: live preview, light/dark,
 * accent, message text size / corners / font and wallpapers. Every change is
 * previewed across the app at once; «Отмена» restores the saved settings.
 */
export const ThemeSettingsModal: React.FC<ThemeSettingsModalProps> = ({
  currentConfig,
  isDark,
  onToggleDark,
  onPreview,
  onSave,
  onClose,
}) => {
  const [draft, setDraft] = useState<ChatThemeConfig>(() => {
    const wp = getWallpaperById(currentConfig.wallpaperId);
    return {
      ...currentConfig,
      customWallpaper: {
        ...currentConfig.customWallpaper,
        blur: currentConfig.customWallpaper?.blur ?? wp.blur ?? 0,
        dimming: currentConfig.customWallpaper?.dimming ?? wp.dimming ?? 0,
      },
    };
  });
  const [activeTab, setActiveTab] = useState<'all' | WallpaperCategory>('all');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const patch = (p: Partial<ChatThemeConfig>) => setDraft((d) => ({ ...d, ...p }));
  const patchWallpaper = (p: NonNullable<ChatThemeConfig['customWallpaper']>) =>
    setDraft((d) => ({ ...d, customWallpaper: { ...d.customWallpaper, ...p } }));

  useEffect(() => {
    onPreview?.(draft);
  }, [draft, onPreview]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const blur = draft.customWallpaper?.blur ?? 0;
  const dimming = draft.customWallpaper?.dimming ?? 0;
  const textSize = draft.textSize ?? TEXT_SIZE.default;
  const radius = draft.bubbleRadius ?? BUBBLE_RADIUS_RANGE.default;
  const font = draft.messageFont ?? DEFAULT_MESSAGE_FONT;
  const customImage = draft.customWallpaper?.imageUrl;
  const activeWallpaper = getWallpaperById(draft.wallpaperId);

  const filteredWallpapers = useMemo(
    () => (activeTab === 'all' ? CHAT_WALLPAPERS : CHAT_WALLPAPERS.filter((w) => w.category === activeTab)),
    [activeTab],
  );

  const selectWallpaper = (id: string) => {
    const wp = getWallpaperById(id);
    setDraft((d) => ({
      ...d,
      wallpaperId: id,
      customWallpaper: { ...d.customWallpaper, blur: wp.blur ?? 0, dimming: wp.dimming ?? 0 },
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    const readAsDataUrl = (blob: Blob) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    let dataUrl: string;
    try {
      // Keep the stored wallpaper small: localStorage quota + fast first paint.
      dataUrl = await readAsDataUrl(await compressImage(file, { maxWidth: 1600, maxHeight: 1200, quality: 0.8, mimeType: 'image/jpeg' }));
    } catch (err) {
      console.warn('Image compression fallback:', err);
      dataUrl = await readAsDataUrl(file);
    }
    setDraft((d) => ({ ...d, wallpaperId: 'custom', customWallpaper: { ...d.customWallpaper, imageUrl: dataUrl } }));
  };

  const removeCustom = () =>
    setDraft((d) => ({
      ...d,
      wallpaperId: d.wallpaperId === 'custom' ? DEFAULT_THEME_CONFIG.wallpaperId : d.wallpaperId,
      customWallpaper: { ...d.customWallpaper, imageUrl: undefined },
    }));

  const handleSave = () => {
    onSave({
      ...draft,
      customWallpaper: {
        imageUrl: draft.wallpaperId === 'custom' ? customImage : undefined,
        blur,
        dimming,
      },
    });
    onClose();
  };

  const handleReset = () =>
    setDraft({
      ...DEFAULT_THEME_CONFIG,
      textSize: TEXT_SIZE.default,
      bubbleRadius: BUBBLE_RADIUS_RANGE.default,
      messageFont: DEFAULT_MESSAGE_FONT,
      customWallpaper: { blur: 0, dimming: 0 },
    });

  const previewBackground = (): React.CSSProperties => {
    const filter = blur > 0 ? `blur(${blur}px)` : undefined;
    const transform = blur > 0 ? 'scale(1.12)' : undefined;
    const image = draft.wallpaperId === 'custom' ? customImage : activeWallpaper.imageUrl;
    if (image) {
      return { backgroundImage: `url("${image}")`, backgroundSize: 'cover', backgroundPosition: 'center', filter, transform };
    }
    const bgCss = isDark ? activeWallpaper.backgroundCssDark : activeWallpaper.backgroundCssLight;
    if (activeWallpaper.patternSvg) {
      return {
        backgroundImage: `${activeWallpaper.patternSvg}, ${bgCss}`,
        backgroundSize: '120px 120px, 100% 100%',
        backgroundRepeat: 'repeat, no-repeat',
        filter,
        transform,
      };
    }
    return { backgroundImage: bgCss, backgroundSize: '100% 100%', filter, transform };
  };

  const animated = activeWallpaper.animatedType;
  const peerTop = getBubbleCorners(false, false, true);
  const peerBottom = getBubbleCorners(false, true, false);
  const self = getBubbleCorners(true, false, false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4 ui-scrim animate-backdrop select-none"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Оформление"
        onClick={(e) => e.stopPropagation()}
        className="ui-sheet tg-sheet-in flex h-[100dvh] w-full flex-col overflow-hidden sm:h-auto sm:max-h-[88vh] sm:max-w-[460px] sm:rounded-2xl"
      >
        {/* Header */}
        <header className="flex shrink-0 items-center gap-2 border-b border-line px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top,0px))]">
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-elevated hover:text-ink cursor-pointer"
          >
            <IconX size={20} />
          </button>
          <h2 className="flex-1 text-[16px] font-semibold text-ink">Оформление</h2>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-full px-3 py-1.5 text-[13px] font-medium text-accent transition-colors hover:bg-accent-muted cursor-pointer"
          >
            Сбросить
          </button>
        </header>

        <div className="tg-scrollbar flex-1 space-y-6 overflow-y-auto px-4 pb-6 pt-4">
          {/* Live preview — real bubble classes, so it follows every setting */}
          <div className="relative h-[220px] overflow-hidden rounded-2xl border border-line">
            {animated === 'squares' ? (
              <div className="absolute inset-0 pointer-events-none"><Squares speed={0.4} borderColor={isDark ? 'rgba(91, 140, 255, 0.15)' : 'rgba(47, 107, 255, 0.25)'} /></div>
            ) : animated === 'aurora' ? (
              <div className="absolute inset-0 pointer-events-none"><Aurora /></div>
            ) : animated === 'particles' ? (
              <div className="absolute inset-0 pointer-events-none"><Particles particleCount={25} particleColor={isDark ? '#5b8cff' : '#2f6bff'} /></div>
            ) : animated === 'letter-glitch' ? (
              <div className="absolute inset-0 pointer-events-none"><LetterGlitch glitchSpeed={60} /></div>
            ) : animated === 'hyperspeed' ? (
              <div className="absolute inset-0 pointer-events-none"><Hyperspeed speed={10} starCount={150} /></div>
            ) : animated === 'waves' ? (
              <div className="absolute inset-0 pointer-events-none"><Waves waveAmpX={20} waveAmpY={15} /></div>
            ) : animated === 'dither' ? (
              <div className="absolute inset-0 pointer-events-none"><Dither colorA={isDark ? '#080d1a' : '#e0e7ff'} colorB={isDark ? '#5b8cff' : '#6366f1'} /></div>
            ) : (
              <div className="absolute inset-0 pointer-events-none transition-all duration-300" style={previewBackground()} />
            )}
            {dimming > 0 && <div className="absolute inset-0 bg-black pointer-events-none" style={{ opacity: dimming / 100 }} />}

            <div className="relative flex h-full flex-col justify-end gap-[3px] p-3">
              <span className="tg-date-pill mx-auto mb-auto rounded-full px-2.5 py-0.5 text-[12px] font-medium">Сегодня</span>
              <div className="tg-bubble-peer w-fit max-w-[78%]" style={{ borderRadius: bubbleRadiusCss(peerTop) }}>
                <div className="tg-msg-text px-3 pt-[6px] pb-[7px]">Привет! Как тебе новое оформление?</div>
              </div>
              <div className="tg-bubble-peer relative w-fit max-w-[78%]" style={{ borderRadius: bubbleRadiusCss(peerBottom) }}>
                <div className="tg-msg-text relative px-3 pt-[6px] pb-[7px]">
                  Шрифт и углы можно настроить 👇
                  <span aria-hidden className="invisible ml-2 inline-block text-[11px]">12:30</span>
                  <span className="absolute bottom-[6px] right-3 text-[11px] leading-none text-muted">12:30</span>
                </div>
              </div>
              <div className="tg-bubble-self relative ml-auto mt-1.5 w-fit max-w-[78%]" style={{ borderRadius: bubbleRadiusCss(self) }}>
                <div className="tg-msg-text relative px-3 pt-[6px] pb-[7px]">
                  Выглядит отлично 🔥
                  <span aria-hidden className="invisible ml-2 inline-block text-[11px]">12:31 ✓✓</span>
                  <span className="absolute bottom-[6px] right-3 inline-flex items-center gap-0.5 text-[11px] leading-none text-tick">
                    12:31 <IconChecks size={14} />
                  </span>
                </div>
              </div>
            </div>
          </div>

          {onToggleDark && (
            <Section title="Тема">
              <div className="flex gap-2">
                <ThemeCard dark={false} active={!isDark} onClick={() => isDark && onToggleDark()} />
                <ThemeCard dark active={isDark} onClick={() => !isDark && onToggleDark()} />
              </div>
            </Section>
          )}

          <Section title="Цвет акцента">
            <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
              {THEME_ACCENT_COLORS.map((accent) => {
                const selected = draft.accentColorId === accent.id;
                return (
                  <button
                    key={accent.id}
                    type="button"
                    onClick={() => patch({ accentColorId: accent.id })}
                    aria-pressed={selected}
                    aria-label={accent.title}
                    title={accent.title}
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-white transition-transform cursor-pointer ${
                      selected ? 'scale-110' : 'hover:scale-105'
                    }`}
                    style={{
                      backgroundColor: accent.hex,
                      boxShadow: selected ? `0 0 0 2px var(--surface), 0 0 0 4px ${accent.hex}` : undefined,
                    }}
                  >
                    {selected && <IconCheck size={16} stroke={3} />}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="Сообщения">
            <div className="space-y-4 rounded-2xl bg-elevated p-3.5">
              <Slider
                label="Размер текста"
                value={textSize}
                min={TEXT_SIZE.min}
                max={TEXT_SIZE.max}
                onChange={(v) => patch({ textSize: v })}
                left={<span className="text-[12px] font-medium text-muted">A</span>}
                right={<span className="text-[19px] font-medium text-muted">A</span>}
              />
              <Slider
                label="Скругление углов"
                value={radius}
                min={BUBBLE_RADIUS_RANGE.min}
                max={BUBBLE_RADIUS_RANGE.max}
                unit=" px"
                onChange={(v) => patch({ bubbleRadius: v })}
              />
              <div className="space-y-1.5">
                <span className="text-[13.5px] text-ink">Шрифт</span>
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface p-1" role="radiogroup" aria-label="Шрифт сообщений">
                  {FONTS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      role="radio"
                      aria-checked={font === f.id}
                      onClick={() => patch({ messageFont: f.id })}
                      className={`flex flex-col items-center rounded-lg px-2 py-1.5 transition-colors cursor-pointer ${
                        font === f.id ? 'bg-accent text-[var(--accent-contrast)] shadow-sm' : 'text-ink-2 hover:bg-elevated'
                      }`}
                    >
                      <span className="text-[13.5px] font-semibold" style={{ fontFamily: f.id === 'app' ? 'var(--font-sans)' : undefined }}>
                        {f.label}
                      </span>
                      <span className={`text-[11px] ${font === f.id ? 'opacity-85' : 'text-muted'}`}>{f.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          <Section title="Обои">
            <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
              {CATEGORIES.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors cursor-pointer ${
                    activeTab === tab.id ? 'bg-accent text-[var(--accent-contrast)]' : 'bg-elevated text-ink-2 hover:text-ink'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              <div
                className={`relative flex aspect-[3/4] flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border border-dashed transition-colors ${
                  draft.wallpaperId === 'custom' ? 'border-accent text-accent' : 'border-line-strong text-muted hover:border-accent hover:text-accent'
                }`}
              >
                {customImage && (
                  <span className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: `url("${customImage}")` }} />
                )}
                <button
                  type="button"
                  onClick={() => (customImage && draft.wallpaperId !== 'custom' ? patch({ wallpaperId: 'custom' }) : fileInputRef.current?.click())}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 shadow-sm">
                    {draft.wallpaperId === 'custom' ? <IconCheck size={16} stroke={2.6} /> : <IconPlus size={16} />}
                  </span>
                  <span className="rounded-full bg-surface/90 px-2 py-0.5 text-[11px] font-medium">Своё фото</span>
                </button>
                {customImage && (
                  <button
                    type="button"
                    onClick={removeCustom}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:text-[var(--danger)] cursor-pointer"
                    aria-label="Удалить своё фото"
                  >
                    <IconTrash size={12} />
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </div>

              {filteredWallpapers.map((wallpaper) => {
                const selected = draft.wallpaperId === wallpaper.id;
                const bgCss = isDark ? wallpaper.backgroundCssDark : wallpaper.backgroundCssLight;
                return (
                  <button
                    key={wallpaper.id}
                    type="button"
                    onClick={() => selectWallpaper(wallpaper.id)}
                    title={wallpaper.title}
                    aria-pressed={selected}
                    className={`group relative aspect-[3/4] overflow-hidden rounded-xl transition-shadow cursor-pointer ${
                      selected ? 'shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--accent)]' : ''
                    }`}
                  >
                    <span
                      className="absolute inset-0 transition-transform duration-300 group-hover:scale-105"
                      style={
                        wallpaper.imageUrl
                          ? { backgroundImage: `url("${wallpaper.thumbnailUrl || wallpaper.imageUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
                          : {
                              backgroundImage: wallpaper.patternSvg ? `${wallpaper.patternSvg}, ${bgCss}` : bgCss,
                              backgroundSize: wallpaper.patternSvg ? '64px 64px, 100% 100%' : '100% 100%',
                              backgroundRepeat: wallpaper.patternSvg ? 'repeat, no-repeat' : 'no-repeat',
                            }
                      }
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4 text-left text-[10.5px] font-medium leading-tight text-white">
                      <span className="line-clamp-2">{wallpaper.title}</span>
                    </span>
                    {selected && (
                      <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white shadow-sm">
                        <IconCheck size={12} stroke={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="space-y-4 rounded-2xl bg-elevated p-3.5">
              <Slider label="Затемнение" value={dimming} min={0} max={80} step={5} unit="%" onChange={(v) => patchWallpaper({ dimming: v })} />
              <Slider label="Размытие" value={blur} min={0} max={20} unit=" px" onChange={(v) => patchWallpaper({ blur: v })} />
            </div>
          </Section>
        </div>

        <footer className="flex shrink-0 items-center gap-2 border-t border-line px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-elevated py-2.5 text-[14px] font-medium text-ink-2 transition-colors hover:text-ink cursor-pointer"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="tg-btn-primary flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[14px] font-semibold cursor-pointer"
          >
            <IconCheck size={17} />
            Применить
          </button>
        </footer>
      </div>
    </div>
  );
};
