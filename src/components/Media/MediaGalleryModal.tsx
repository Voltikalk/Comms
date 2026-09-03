import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { Message, UserId } from '../../types';
import { USER_NAMES, DEFAULT_USER_PROFILES } from '../../constants';
import {
  IconChevronLeft,
  IconChevronRight,
  IconX,
  IconDownload,
  IconRotateClockwise,
  IconZoomIn,
  IconZoomOut,
  IconZoomReset,
  IconCopy,
  IconCheck,
  IconPlayerPlayFilled,
  IconPlayerPauseFilled,
  IconVolume,
  IconVolumeOff,
  IconMaximize,
} from '@tabler/icons-react';
import { parseAndRenderRichText } from '../../lib/markdown-parser';

export interface MediaGalleryModalProps {
  isOpen: boolean;
  activeMessageId: string | null;
  mediaMessages: Message[];
  onClose: () => void;
  onSelectMessageId?: (id: string) => void;
  onHashtagClick?: (tag: string) => void;
  showToast?: (text: string) => void;
}

export const MediaGalleryModal: React.FC<MediaGalleryModalProps> = ({
  isOpen,
  activeMessageId,
  mediaMessages,
  onClose,
  onSelectMessageId,
  onHashtagClick,
  showToast,
}) => {
  const [currentId, setCurrentId] = useState<string | null>(activeMessageId);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [copied, setCopied] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const thumbnailsContainerRef = useRef<HTMLDivElement | null>(null);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);

  // Sync internal currentId with prop activeMessageId
  useEffect(() => {
    if (activeMessageId) {
      setCurrentId(activeMessageId);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
      setIsVideoPlaying(false);
    }
  }, [activeMessageId]);

  const currentIndex = useMemo(() => {
    if (!currentId || mediaMessages.length === 0) return 0;
    const idx = mediaMessages.findIndex((m) => m.id === currentId);
    return idx !== -1 ? idx : 0;
  }, [currentId, mediaMessages]);

  const currentMessage = mediaMessages[currentIndex] || null;

  // Reset zoom & transform on slide switch
  const handleSelectIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < mediaMessages.length) {
        const nextMsg = mediaMessages[index];
        setCurrentId(nextMsg.id);
        onSelectMessageId?.(nextMsg.id);
        setScale(1);
        setPosition({ x: 0, y: 0 });
        setRotation(0);
        setIsVideoPlaying(false);
      }
    },
    [mediaMessages, onSelectMessageId]
  );

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      handleSelectIndex(currentIndex - 1);
    }
  }, [currentIndex, handleSelectIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < mediaMessages.length - 1) {
      handleSelectIndex(currentIndex + 1);
    }
  }, [currentIndex, mediaMessages.length, handleSelectIndex]);

  // Auto-scroll active thumbnail into view
  useEffect(() => {
    if (thumbnailsContainerRef.current) {
      const activeThumb = thumbnailsContainerRef.current.querySelector(
        `[data-thumb-id="${currentId}"]`
      ) as HTMLElement | null;
      if (activeThumb) {
        activeThumb.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest',
        });
      }
    }
  }, [currentId]);

  // Zoom controls
  const handleZoomIn = () => setScale((s) => Math.min(4, Number((s + 0.5).toFixed(1))));
  const handleZoomOut = () =>
    setScale((s) => {
      const next = Math.max(1, Number((s - 0.5).toFixed(1)));
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  const handleZoomReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  };
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (scale > 1) {
      handleZoomReset();
    } else {
      setScale(2.5);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY < 0) {
      setScale((s) => Math.min(4, Number((s + 0.25).toFixed(2))));
    } else {
      setScale((s) => {
        const next = Math.max(1, Number((s - 0.25).toFixed(2)));
        if (next === 1) setPosition({ x: 0, y: 0 });
        return next;
      });
    }
  };

  // Drag / Pan mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  // Copy Image / Link
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentMessage?.file?.data) return;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentMessage.file.data);
      setCopied(true);
      showToast?.('Ссылка на медиа скопирована');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Video controls
  const togglePlayVideo = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsVideoPlaying(true);
      } else {
        videoRef.current.pause();
        setIsVideoPlaying(false);
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === '0') {
        handleZoomReset();
      } else if (e.key.toLowerCase() === 'r') {
        handleRotate();
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlayVideo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrev, handleNext, onClose]);

  if (!isOpen || !currentMessage || !currentMessage.file) return null;

  const isVideo =
    currentMessage.file.type === 'video' ||
    currentMessage.file.type?.startsWith('video/') ||
    /\.(mp4|webm|mov)$/i.test(currentMessage.file.name || '');

  const senderId = currentMessage.sender as UserId;
  const senderDisplayName =
    USER_NAMES[senderId] ||
    DEFAULT_USER_PROFILES[senderId]?.firstName ||
    currentMessage.sender ||
    'Пользователь';

  const formattedDate = new Date(currentMessage.timestamp).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/95 select-none flex flex-col justify-between overflow-hidden animate-backdrop pointer-events-auto"
      onClick={handleZoomReset}
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 1. Top Header Bar */}
      <header
        className="w-full h-16 px-4 md:px-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between z-20 shrink-0 select-none backdrop-blur-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Author info & Timestamp */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-[#3390ec] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-md">
            {senderDisplayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h4 className="text-white text-sm font-semibold truncate leading-tight">
              {senderDisplayName}
            </h4>
            <span className="text-xs text-slate-400 block leading-tight">
              {formattedDate} • {currentIndex + 1} из {mediaMessages.length}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Rotate */}
          {!isVideo && (
            <button
              type="button"
              onClick={handleRotate}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer"
              title="Повернуть на 90° (R)"
            >
              <IconRotateClockwise size={20} />
            </button>
          )}

          {/* Zoom controls */}
          {!isVideo && (
            <>
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer hidden sm:flex"
                title="Увеличить (+)"
              >
                <IconZoomIn size={20} />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer hidden sm:flex"
                title="Уменьшить (-)"
              >
                <IconZoomOut size={20} />
              </button>
              {scale !== 1 && (
                <button
                  type="button"
                  onClick={handleZoomReset}
                  className="p-2.5 rounded-xl bg-[#3390ec]/80 hover:bg-[#3390ec] active:scale-95 text-white transition-all cursor-pointer"
                  title="Сбросить масштаб (0)"
                >
                  <IconZoomReset size={20} />
                </button>
              )}
            </>
          )}

          {/* Copy link */}
          <button
            type="button"
            onClick={handleCopy}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer"
            title="Скопировать ссылку"
          >
            {copied ? <IconCheck size={20} className="text-emerald-400" /> : <IconCopy size={20} />}
          </button>

          {/* Download */}
          <a
            href={currentMessage.file.data}
            download={currentMessage.file.name || 'comms_media'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer"
            title="Скачать файл"
          >
            <IconDownload size={20} />
          </a>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-rose-600/80 active:scale-95 text-white transition-all cursor-pointer ml-1"
            title="Закрыть (Esc)"
          >
            <IconX size={20} />
          </button>
        </div>
      </header>

      {/* 2. Main Media Viewport */}
      <main
        ref={imageContainerRef}
        className="flex-1 relative w-full h-full flex items-center justify-center p-2 sm:p-6 overflow-hidden"
        onMouseDown={handleMouseDown}
      >
        {/* Navigation Arrow Left */}
        {currentIndex > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-3 sm:left-6 z-30 w-12 h-12 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-md shadow-xl border border-white/10"
            title="Предыдущее (Стрелка влево)"
          >
            <IconChevronLeft size={28} />
          </button>
        )}

        {/* Navigation Arrow Right */}
        {currentIndex < mediaMessages.length - 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-3 sm:right-6 z-30 w-12 h-12 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-md shadow-xl border border-white/10"
            title="Следующее (Стрелка вправо)"
          >
            <IconChevronRight size={28} />
          </button>
        )}

        {/* Media Container */}
        <div
          className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-150 ease-out"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
          }}
          onDoubleClick={handleDoubleClick}
        >
          {isVideo ? (
            <div className="relative max-w-[90vw] max-h-[75vh] rounded-2xl overflow-hidden shadow-2xl bg-black">
              <video
                ref={videoRef}
                src={currentMessage.file.data}
                className="max-w-[90vw] max-h-[75vh] object-contain rounded-2xl"
                playsInline
                muted={isVideoMuted}
                onTimeUpdate={() => {
                  if (videoRef.current) {
                    const prog = (videoRef.current.currentTime / videoRef.current.duration) * 100;
                    setVideoProgress(prog || 0);
                  }
                }}
                onEnded={() => setIsVideoPlaying(false)}
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlayVideo();
                }}
              />

              {/* Video Overlay Controls */}
              <div
                className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-center justify-between text-white z-20 select-none"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={togglePlayVideo}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white cursor-pointer"
                  >
                    {isVideoPlaying ? <IconPlayerPauseFilled size={18} /> : <IconPlayerPlayFilled size={18} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.muted = !isVideoMuted;
                        setIsVideoMuted(!isVideoMuted);
                      }
                    }}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white cursor-pointer"
                  >
                    {isVideoMuted ? <IconVolumeOff size={18} /> : <IconVolume size={18} />}
                  </button>
                </div>

                {/* Scrubber bar */}
                <div
                  className="flex-1 mx-4 h-2 bg-white/20 rounded-full overflow-hidden cursor-pointer relative"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const percent = clickX / rect.width;
                    if (videoRef.current) {
                      videoRef.current.currentTime = percent * videoRef.current.duration;
                    }
                  }}
                >
                  <div
                    className="h-full bg-[#3390ec] rounded-full transition-all"
                    style={{ width: `${videoProgress}%` }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (videoRef.current?.requestFullscreen) {
                      videoRef.current.requestFullscreen();
                    }
                  }}
                  className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white cursor-pointer"
                  title="На весь экран"
                >
                  <IconMaximize size={18} />
                </button>
              </div>
            </div>
          ) : (
            <img
              src={currentMessage.file.data}
              alt={currentMessage.file.name || 'Photo'}
              className="max-w-[92vw] max-h-[76vh] object-contain rounded-2xl shadow-2xl animate-lightbox select-none pointer-events-auto"
              draggable={false}
            />
          )}
        </div>
      </main>

      {/* 3. Bottom Footer: Caption & Thumbnail Carousel */}
      <footer
        className="w-full bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 sm:p-4 z-20 flex flex-col items-center gap-2 select-none backdrop-blur-xs shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Caption text (if message contains text) */}
        {currentMessage.text && currentMessage.text.trim() && (
          <div className="max-w-2xl w-full text-center px-4 py-1.5 bg-black/60 rounded-xl border border-white/10 text-white text-sm">
            {parseAndRenderRichText(currentMessage.text, undefined, onHashtagClick)}
          </div>
        )}

        {/* Thumbnail Carousel Strip */}
        <div
          ref={thumbnailsContainerRef}
          className="max-w-3xl w-full flex items-center justify-start sm:justify-center gap-2 overflow-x-auto tg-scrollbar py-1 px-2 select-none"
        >
          {mediaMessages.map((msg, index) => {
            const isSelected = msg.id === currentId;
            const isThumbVideo =
              msg.file?.type === 'video' ||
              msg.file?.type?.startsWith('video/') ||
              /\.(mp4|webm|mov)$/i.test(msg.file?.name || '');

            return (
              <button
                key={`thumb-${msg.id}`}
                data-thumb-id={msg.id}
                type="button"
                onClick={() => handleSelectIndex(index)}
                className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden shrink-0 transition-all cursor-pointer border ${
                  isSelected
                    ? 'ring-2 ring-[#3390ec] border-white scale-105 opacity-100 shadow-lg'
                    : 'border-white/20 opacity-55 hover:opacity-90 hover:scale-100'
                }`}
                title={`Медиа ${index + 1}`}
              >
                {isThumbVideo ? (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white">
                    <IconPlayerPlayFilled size={16} />
                  </div>
                ) : (
                  <img
                    src={msg.file?.data}
                    alt=""
                    className="w-full h-full object-cover select-none"
                    loading="lazy"
                  />
                )}
                {isSelected && (
                  <div className="absolute inset-0 bg-[#3390ec]/20 pointer-events-none" />
                )}
              </button>
            );
          })}
        </div>
      </footer>
    </div>,
    document.body
  );
};
