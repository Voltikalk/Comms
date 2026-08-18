import React, { useState, useRef, useEffect } from 'react';
import { useVideoPlayer } from '../../../hooks/useVideoPlayer';
import type { PlaybackRate, VideoQuality } from '../../../types/video-player.types';
import {
  IconSettings,
  IconChevronRight,
  IconCheck,
  IconInfoCircle,
  IconGauge,
  IconAdjustments,
} from '@tabler/icons-react';

export interface SettingsMenuProps {
  className?: string;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ className = '' }) => {
  const {
    isSettingsOpen,
    toggleSettings,
    playbackRate,
    setPlaybackRate,
    quality,
    setQuality,
    props,
    buffered,
    duration,
    currentTime,
  } = useVideoPlayer();

  const [activeTab, setActiveTab] = useState<'main' | 'speed' | 'quality' | 'info'>('main');
  const menuRef = useRef<HTMLDivElement | null>(null);

  const speeds: PlaybackRate[] = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const defaultQualities: VideoQuality[] = ['1080p', '720p', '480p', '360p', 'auto'];

  // Save selected settings to localStorage
  const handleSpeedSelect = (rate: PlaybackRate) => {
    setPlaybackRate(rate);
    try {
      localStorage.setItem('comms_video_playback_rate', String(rate));
    } catch {}
    setActiveTab('main');
  };

  const handleQualitySelect = (q: VideoQuality) => {
    setQuality(q);
    try {
      localStorage.setItem('comms_video_quality', q);
    } catch {}
    setActiveTab('main');
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        if (isSettingsOpen) {
          toggleSettings();
        }
      }
    };

    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen, toggleSettings]);

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      {/* Gear Trigger Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleSettings();
        }}
        aria-expanded={isSettingsOpen}
        aria-haspopup="true"
        aria-label="Настройки видео"
        title="Настройки"
        className={`comms-video-control-btn focus-visible:ring-2 focus-visible:ring-[#3390ec] outline-none ${
          isSettingsOpen ? 'text-[#3390ec]' : ''
        }`}
      >
        <IconSettings
          size={20}
          className={`transition-transform duration-200 ${
            isSettingsOpen ? 'rotate-45' : 'rotate-0'
          }`}
        />
      </button>

      {/* Popover Menu */}
      {isSettingsOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="comms-video-settings-menu animate-pop-in select-none"
        >
          {/* 1. Main Settings List */}
          {activeTab === 'main' && (
            <div className="space-y-0.5">
              {/* Speed Row */}
              <button
                type="button"
                onClick={() => setActiveTab('speed')}
                className="comms-video-menu-item"
              >
                <div className="flex items-center gap-2">
                  <IconGauge size={16} className="text-slate-400" />
                  <span>Скорость</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400 text-xs font-mono">
                  <span>{playbackRate === 1 ? 'Обычная' : `${playbackRate}x`}</span>
                  <IconChevronRight size={14} />
                </div>
              </button>

              {/* Quality Row */}
              <button
                type="button"
                onClick={() => setActiveTab('quality')}
                className="comms-video-menu-item"
              >
                <div className="flex items-center gap-2">
                  <IconAdjustments size={16} className="text-slate-400" />
                  <span>Качество</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400 text-xs font-mono uppercase">
                  <span>{quality}</span>
                  <IconChevronRight size={14} />
                </div>
              </button>

              {/* Video Stats Info Row */}
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className="comms-video-menu-item"
              >
                <div className="flex items-center gap-2">
                  <IconInfoCircle size={16} className="text-slate-400" />
                  <span>Статистика</span>
                </div>
                <IconChevronRight size={14} className="text-slate-400" />
              </button>
            </div>
          )}

          {/* 2. Speed Submenu */}
          {activeTab === 'speed' && (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 border-b border-white/10 mb-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('main')}
                  className="hover:text-white cursor-pointer"
                >
                  ← Назад
                </button>
              </div>
              {speeds.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => handleSpeedSelect(rate)}
                  className={`comms-video-menu-item ${playbackRate === rate ? 'active' : ''}`}
                >
                  <span>{rate === 1 ? 'Обычная (1x)' : `${rate}x`}</span>
                  {playbackRate === rate && <IconCheck size={14} />}
                </button>
              ))}
            </div>
          )}

          {/* 3. Quality Submenu */}
          {activeTab === 'quality' && (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 border-b border-white/10 mb-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('main')}
                  className="hover:text-white cursor-pointer"
                >
                  ← Назад
                </button>
              </div>
              {(props.qualityLevels?.map((l) => l.quality) || defaultQualities).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleQualitySelect(q)}
                  className={`comms-video-menu-item ${quality === q ? 'active' : ''}`}
                >
                  <span className="uppercase">{q}</span>
                  {quality === q && <IconCheck size={14} />}
                </button>
              ))}
            </div>
          )}

          {/* 4. Info Submenu */}
          {activeTab === 'info' && (
            <div className="p-1 space-y-1 text-xs">
              <div className="flex items-center gap-1 px-1 py-1 text-slate-400 border-b border-white/10 mb-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('main')}
                  className="hover:text-white cursor-pointer"
                >
                  ← Назад
                </button>
              </div>
              <div className="space-y-1 font-mono text-[11px] text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Формат:</span>
                  <span>MP4 / H.264</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Длительность:</span>
                  <span>{Math.round(duration)} сек</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Буфер:</span>
                  <span>{Math.round(buffered)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Позиция:</span>
                  <span>{Math.round(currentTime)} сек</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SettingsMenu;
