import React, { useState, useRef, useEffect } from 'react';
import { useVideoPlayer } from '../../../hooks/useVideoPlayer';
import { IconSubtitles, IconCheck } from '@tabler/icons-react';

export interface SubtitlesButtonProps {
  className?: string;
}

export const SubtitlesButton: React.FC<SubtitlesButtonProps> = ({ className = '' }) => {
  const { activeSubtitleId, setSubtitle, props } = useVideoPlayer();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const subtitles = props.subtitles || [];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (subtitles.length === 0) return null;

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Субтитры"
        aria-expanded={isOpen}
        title="Субтитры"
        className={`comms-video-control-btn focus-visible:ring-2 focus-visible:ring-[#3390ec] outline-none ${
          activeSubtitleId ? 'text-[#3390ec]' : ''
        }`}
      >
        <IconSubtitles size={20} />
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="comms-video-settings-menu animate-pop-in select-none w-44"
        >
          <div className="text-xs text-slate-400 font-semibold px-2 py-1 border-b border-white/10 mb-1">
            Субтитры
          </div>

          {/* Off Option */}
          <button
            type="button"
            onClick={() => {
              setSubtitle(null);
              setIsOpen(false);
            }}
            className={`comms-video-menu-item ${activeSubtitleId === null ? 'active' : ''}`}
          >
            <span>Выключены</span>
            {activeSubtitleId === null && <IconCheck size={14} />}
          </button>

          {/* Languages list */}
          {subtitles.map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() => {
                setSubtitle(sub.id);
                setIsOpen(false);
              }}
              className={`comms-video-menu-item ${activeSubtitleId === sub.id ? 'active' : ''}`}
            >
              <span>{sub.label}</span>
              {activeSubtitleId === sub.id && <IconCheck size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SubtitlesButton;
