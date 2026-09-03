import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  IconX,
  IconTrash,
  IconEye,
  IconPlus,
  IconVolume,
  IconVolumeOff,
  IconSend,
  IconChevronLeft,
  IconChevronRight,
  IconShare3,
  IconDownload,
  IconDotsVertical,
  IconSearch
} from '@tabler/icons-react';
import { useStories } from '../../context/StoriesContext';
import {
  STORY_GRADIENTS,
  STORY_FONT_FAMILIES,
  type Story
} from '../../types/story.types';
import { USER_NAMES, DEFAULT_USER_PROFILES } from '../../constants';

interface StoryViewerProps {
  /** 'me' opens own stories, otherwise a specific userId */
  targetUser: string | null;
  onClose: () => void;
  onOpenCreate: () => void;
  onSendDirectMessage?: (peerUserId: string, text: string) => void;
}

const DEFAULT_STORY_DURATION_MS = 5000;
const TG_REACTIONS = ['❤️', '🔥', '👍', '👏', '😂', '😍', '🎉', '⚡', '💯', '🚀'];

const formatAge = (ts: number) => {
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч назад`;
  return 'вчера';
};

export const StoryViewer: React.FC<StoryViewerProps> = ({
  targetUser,
  onClose,
  onOpenCreate,
  onSendDirectMessage
}) => {
  const {
    stories,
    myStories,
    othersStories,
    deleteStory,
    viewStory,
    reactStory,
    markStoryViewedLocal
  } = useStories();

  const me = (typeof window !== 'undefined' ? localStorage.getItem('chat_user_v2') : null) || '';

  // Build the list of active user IDs
  const allUserIds = useMemo(() => [
    ...(myStories.length > 0 ? ['me'] : []),
    ...othersStories.map((o) => o.userId)
  ], [myStories.length, othersStories]);

  const [activeUserId, setActiveUserId] = useState<string>(targetUser || 'me');

  useEffect(() => {
    if (targetUser) {
      setActiveUserId(targetUser);
    }
  }, [targetUser]);

  const isOwn = activeUserId === 'me' || activeUserId === me;
  const currentStoriesList: Story[] = isOwn ? myStories : (stories[activeUserId] || []);

  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showViewsDrawer, setShowViewsDrawer] = useState(false);
  const [viewerSearch, setViewerSearch] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [doubleTapHeart, setDoubleTapHeart] = useState(false);
  const [flyingReactions, setFlyingReactions] = useState<{ id: string; emoji: string; x: number; rot: number }[]>([]);

  // Drag down to close
  const [dragY, setDragY] = useState(0);
  const isDraggingDownRef = useRef(false);
  const touchStartYRef = useRef(0);
  const lastTapTimeRef = useRef(0);

  const rafRef = useRef<number>(0);
  const elapsedTimeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const pausedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Sync pausedRef with state
  useEffect(() => {
    pausedRef.current = isHolding || showViewsDrawer || showMoreMenu;
  }, [isHolding, showViewsDrawer, showMoreMenu]);

  // Reset index on user switch
  useEffect(() => {
    setIndex(0);
    setProgress(0);
    elapsedTimeRef.current = 0;
    setShowViewsDrawer(false);
    setShowMoreMenu(false);
    setReplyText('');
  }, [activeUserId]);

  const current = currentStoriesList[index];

  const switchUser = useCallback((direction: 'next' | 'prev') => {
    const currentIdx = allUserIds.indexOf(activeUserId);
    if (direction === 'next') {
      if (currentIdx !== -1 && currentIdx < allUserIds.length - 1) {
        setActiveUserId(allUserIds[currentIdx + 1]);
      } else {
        onClose();
      }
    } else {
      if (currentIdx > 0) {
        setActiveUserId(allUserIds[currentIdx - 1]);
      } else {
        elapsedTimeRef.current = 0;
        setProgress(0);
        setIndex(0);
      }
    }
  }, [activeUserId, allUserIds, onClose]);

  const advance = useCallback(() => {
    elapsedTimeRef.current = 0;
    setProgress(0);
    if (index < currentStoriesList.length - 1) {
      setIndex((i) => i + 1);
    } else {
      switchUser('next');
    }
  }, [index, currentStoriesList.length, switchUser]);

  const goBack = useCallback(() => {
    elapsedTimeRef.current = 0;
    setProgress(0);
    if (index > 0) {
      setIndex((i) => i - 1);
    } else {
      switchUser('prev');
    }
  }, [index, switchUser]);

  // Mark story as viewed on server and locally
  useEffect(() => {
    if (!current) return;
    markStoryViewedLocal(current.id);
    if (!isOwn) {
      viewStory(current.id, current.userId);
    }
  }, [current, isOwn, markStoryViewedLocal, viewStory]);

  // Timer loop for story progress
  useEffect(() => {
    if (!current) return;
    elapsedTimeRef.current = 0;
    setProgress(0);
    lastTimeRef.current = performance.now();

    const duration = current.type === 'video' && videoRef.current && videoRef.current.duration
      ? videoRef.current.duration * 1000
      : DEFAULT_STORY_DURATION_MS;

    const tick = (now: number) => {
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      if (!pausedRef.current) {
        if (current.type === 'video' && videoRef.current && !isNaN(videoRef.current.duration) && videoRef.current.duration > 0) {
          const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
          setProgress(Math.min(100, pct));
          if (videoRef.current.ended || pct >= 99.5) {
            advance();
            return;
          }
        } else {
          elapsedTimeRef.current += delta;
          const pct = Math.min(100, (elapsedTimeRef.current / duration) * 100);
          setProgress(pct);

          if (elapsedTimeRef.current >= duration) {
            advance();
            return;
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [current, advance]);

  const handleSendReaction = (emoji: string) => {
    if (!current) return;
    reactStory(current.id, current.userId, emoji);

    // Floating reaction burst with physics
    const reactionId = Math.random().toString(36).substring(2, 9);
    const randomX = 30 + Math.random() * 40;
    const randomRot = (Math.random() - 0.5) * 40;
    setFlyingReactions((prev) => [...prev, { id: reactionId, emoji, x: randomX, rot: randomRot }]);
    setTimeout(() => {
      setFlyingReactions((prev) => prev.filter((r) => r.id !== reactionId));
    }, 1600);

    if (onSendDirectMessage && current.userId !== me) {
      onSendDirectMessage(current.userId, `${emoji} Отреагировал(а) на вашу историю`);
    }
  };

  const handleDoubleTapLike = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastTapTimeRef.current < 300) {
      // Double tap detected!
      setDoubleTapHeart(true);
      handleSendReaction('❤️');
      setTimeout(() => setDoubleTapHeart(false), 900);
      lastTapTimeRef.current = 0;
    } else {
      lastTapTimeRef.current = now;
    }
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !current || current.userId === me) return;
    if (onSendDirectMessage) {
      onSendDirectMessage(current.userId, `Ответ на историю: ${replyText.trim()}`);
    }
    setReplyText('');
    advance();
  };

  const handleDownload = () => {
    if (!current || !current.data) return;
    const link = document.createElement('a');
    link.href = current.data;
    link.download = `tg-story-${current.userId}-${Date.now()}`;
    link.target = '_blank';
    link.click();
    setShowMoreMenu(false);
  };

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setShowMoreMenu(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showViewsDrawer) setShowViewsDrawer(false);
        else if (showMoreMenu) setShowMoreMenu(false);
        else onClose();
      } else if (e.key === 'ArrowRight') {
        advance();
      } else if (e.key === 'ArrowLeft') {
        goBack();
      } else if (e.key === 'ArrowUp') {
        switchUser('prev');
      } else if (e.key === 'ArrowDown') {
        switchUser('next');
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsHolding((h) => !h);
      } else if (e.key === 'm' || e.key === 'M') {
        setIsMuted((m) => !m);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [advance, goBack, switchUser, onClose, showViewsDrawer, showMoreMenu]);

  if (!targetUser || !current) return null;

  const authorName = isOwn
    ? 'Моя история'
    : (USER_NAMES[current.userId] || DEFAULT_USER_PROFILES[current.userId]?.firstName || current.authorName || current.userId);
  const avatar = DEFAULT_USER_PROFILES[current.userId]?.avatarUrl;
  const gradient = STORY_GRADIENTS[current.background || 'telegram'] || STORY_GRADIENTS.telegram;
  const fontStyle = current.fontStyle || 'classic';
  const fontFamily = STORY_FONT_FAMILIES[fontStyle] || STORY_FONT_FAMILIES.classic;

  const filteredViewers = (current.views || []).filter((uid) => {
    const uName = uid === me ? 'Вы' : (USER_NAMES[uid] || DEFAULT_USER_PROFILES[uid]?.firstName || uid);
    return uName.toLowerCase().includes(viewerSearch.toLowerCase());
  });

  return createPortal(
    <div
      className="fixed inset-0 z-[90] bg-black/95 backdrop-blur-md flex items-center justify-center select-none overflow-hidden animate-fade-in"
      onClick={onClose}
    >
      {/* Desktop Prev Button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); goBack(); }}
        className="hidden md:flex absolute left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95 z-50 backdrop-blur-sm"
        title="Назад (ArrowLeft)"
      >
        <IconChevronLeft size={28} />
      </button>

      {/* Desktop Next Button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); advance(); }}
        className="hidden md:flex absolute right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95 z-50 backdrop-blur-sm"
        title="Вперед (ArrowRight)"
      >
        <IconChevronRight size={28} />
      </button>

      {/* Close Button Top Right */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer transition-transform active:scale-90"
        title="Закрыть (Esc)"
      >
        <IconX size={22} />
      </button>

      {/* Main Story Viewport Card with 3D feel */}
      <div
        onClick={(e) => { e.stopPropagation(); handleDoubleTapLike(e); }}
        style={{
          transform: `translateY(${dragY}px) scale(${Math.max(0.85, 1 - dragY / 1000)})`,
          transition: isDraggingDownRef.current ? 'none' : 'transform 0.25s ease-out',
          ...(current.type === 'text' ? { background: gradient } : { background: '#0a0f1d' })
        }}
        className="relative w-full max-w-[430px] h-full sm:h-[92vh] sm:max-h-[820px] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between border border-white/10"
      >
        {/* Top Progress Segment Bars */}
        <div
          className={`absolute top-3 left-3 right-3 z-40 flex gap-1.5 transition-opacity duration-200 ${
            isHolding ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          {currentStoriesList.map((s, i) => (
            <div
              key={s.id || i}
              className="flex-1 h-[3px] rounded-full bg-white/30 overflow-hidden backdrop-blur-xs shadow-xs"
            >
              <div
                className="h-full bg-white rounded-full transition-all ease-linear"
                style={{
                  width: i < index ? '100%' : i === index ? `${progress}%` : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* Top Header Card (Author, Time, Close Friends badge, Sound & More) */}
        <div
          className={`absolute top-6 left-3 right-3 z-40 flex items-center gap-2.5 pt-1 transition-opacity duration-200 ${
            isHolding ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <div className="relative w-10 h-10 rounded-full bg-white/20 backdrop-blur-md p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
            {avatar ? (
              <img src={avatar} alt={authorName} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-white">{authorName.charAt(0).toUpperCase()}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[14.5px] font-bold text-white leading-tight drop-shadow-md truncate">
                {authorName}
              </span>
              {current.isCloseFriends && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#00c853] text-white text-[9px] font-bold shadow-xs">
                  ★ Близкие
                </span>
              )}
              {current.isPinned && (
                <span className="text-[11px]" title="Сохранено в профиле">
                  📌
                </span>
              )}
            </div>
            <span className="block text-[11px] text-white/80 leading-tight drop-shadow-xs">
              {formatAge(current.timestamp)}
              {currentStoriesList.length > 1 ? ` • ${index + 1} из ${currentStoriesList.length}` : ''}
            </span>
          </div>

          {/* Action Icons Top Bar */}
          <div className="flex items-center gap-1.5">
            {current.type === 'video' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted((prev) => !prev);
                  if (videoRef.current) videoRef.current.muted = !isMuted;
                }}
                className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center cursor-pointer transition-colors backdrop-blur-sm"
                title={isMuted ? 'Включить звук' : 'Выключить звук'}
              >
                {isMuted ? <IconVolumeOff size={16} /> : <IconVolume size={16} />}
              </button>
            )}

            {isOwn && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowViewsDrawer((v) => !v);
                }}
                className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center cursor-pointer transition-colors backdrop-blur-sm relative"
                title="Просмотры и зрители"
              >
                <IconEye size={16} />
                {(current.views || []).length > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-[#3390ec] text-white text-[9px] font-bold rounded-full">
                    {current.views.length}
                  </span>
                )}
              </button>
            )}

            {/* More Options Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMoreMenu((m) => !m);
                }}
                className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center cursor-pointer transition-colors backdrop-blur-sm"
                title="Опции"
              >
                <IconDotsVertical size={16} />
              </button>

              {showMoreMenu && (
                <div
                  className="absolute right-0 top-10 w-48 rounded-2xl bg-black/85 backdrop-blur-xl border border-white/15 py-1.5 shadow-2xl z-50 animate-pop-in text-white text-xs font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-white/15 cursor-pointer text-left transition-colors"
                  >
                    <IconDownload size={15} />
                    Сохранить медиа
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-white/15 cursor-pointer text-left transition-colors"
                  >
                    <IconShare3 size={15} />
                    Копировать ссылку
                  </button>
                  {isOwn && (
                    <button
                      type="button"
                      onClick={() => {
                        deleteStory(current.id);
                        if (currentStoriesList.length <= 1) onClose();
                        setShowMoreMenu(false);
                      }}
                      className="w-full px-3.5 py-2 flex items-center gap-2.5 text-rose-400 hover:bg-rose-600/20 cursor-pointer text-left transition-colors"
                    >
                      <IconTrash size={15} />
                      Удалить историю
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Viewers Sheet Drawer (Slide-up modal for author) */}
        {isOwn && showViewsDrawer && (
          <div
            className="absolute inset-x-0 bottom-0 top-24 z-50 bg-[#17212b]/95 backdrop-blur-2xl rounded-t-3xl border-t border-white/15 p-4 flex flex-col animate-slide-up shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <IconEye size={18} className="text-[#3390ec]" />
                <span className="text-sm font-bold text-white">
                  Просмотры ({current.views?.length || 0})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowViewsDrawer(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <IconX size={14} />
              </button>
            </div>

            {/* Viewer Search Bar */}
            <div className="relative my-3">
              <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={viewerSearch}
                onChange={(e) => setViewerSearch(e.target.value)}
                placeholder="Поиск среди зрителей..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#3390ec]"
              />
            </div>

            {/* Viewers List */}
            <div className="flex-1 overflow-y-auto tg-scrollbar space-y-2 pr-1">
              {filteredViewers.length === 0 ? (
                <div className="py-8 text-center text-white/50 text-xs">
                  {viewerSearch ? 'Ничего не найдено' : 'Пока никто не просмотрел историю'}
                </div>
              ) : (
                filteredViewers.map((uid) => {
                  const uName = uid === me ? 'Вы' : (USER_NAMES[uid] || DEFAULT_USER_PROFILES[uid]?.firstName || uid);
                  const uAvatar = DEFAULT_USER_PROFILES[uid]?.avatarUrl;

                  // Check if this viewer reacted
                  const userReactions = Object.entries(current.reactions || {})
                    .filter(([, users]) => users.includes(uid))
                    .map(([emoji]) => emoji);

                  return (
                    <div
                      key={uid}
                      className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/5 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center overflow-hidden text-xs font-bold text-white shrink-0">
                        {uAvatar ? (
                          <img src={uAvatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          uName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-white truncate block">{uName}</span>
                        <span className="text-[10px] text-white/50 block">Недавно</span>
                      </div>
                      {userReactions.length > 0 && (
                        <div className="flex gap-1 text-sm">
                          {userReactions.map((emoji, rxIdx) => (
                            <span key={rxIdx}>{emoji}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Story Body Canvas / Media */}
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          {current.type === 'image' ? (
            <img
              src={current.data}
              alt="История"
              className="w-full h-full object-contain select-none"
              draggable={false}
            />
          ) : current.type === 'video' ? (
            <video
              ref={videoRef}
              src={current.data}
              autoPlay
              playsInline
              muted={isMuted}
              className="w-full h-full object-contain select-none"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-8">
              <p
                style={{
                  fontFamily,
                  color: current.textColor || '#ffffff'
                }}
                className={`text-[23px] font-bold text-center leading-snug drop-shadow-xl whitespace-pre-wrap break-words max-w-full ${
                  current.textBgStyle === 'fill'
                    ? 'p-3 bg-black/50 rounded-2xl backdrop-blur-xs'
                    : current.textBgStyle === 'glow'
                    ? 'drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]'
                    : ''
                }`}
              >
                {current.data}
              </p>
            </div>
          )}

          {/* Render Text Overlays if present */}
          {current.textOverlays?.map((overlay) => (
            <div
              key={overlay.id}
              style={{
                left: `${overlay.x}%`,
                top: `${overlay.y}%`,
                transform: 'translate(-50%, -50%)',
                fontFamily: STORY_FONT_FAMILIES[overlay.fontStyle || 'classic'],
                color: overlay.color || '#ffffff',
                backgroundColor: overlay.backgroundColor || 'transparent'
              }}
              className="absolute z-20 px-2 py-1 rounded-xl text-lg font-bold drop-shadow-md select-none pointer-events-none"
            >
              {overlay.text}
            </div>
          ))}

          {/* Render Sticker / Emoji Overlays if present */}
          {current.stickerOverlays?.map((stk) => (
            <div
              key={stk.id}
              style={{
                left: `${stk.x}%`,
                top: `${stk.y}%`,
                transform: `translate(-50%, -50%) scale(${stk.scale || 1}) rotate(${stk.rotation || 0}deg)`
              }}
              className="absolute z-20 select-none pointer-events-none text-4xl drop-shadow-lg"
            >
              {stk.type === 'emoji' ? stk.content : <img src={stk.content} alt="" className="w-24 h-24 object-contain" />}
            </div>
          ))}

          {/* Render Doodle Drawing Canvas if present */}
          {current.drawingData && (
            <img
              src={current.drawingData}
              alt=""
              className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20"
            />
          )}

          {/* Caption Overlay */}
          {current.caption && (
            <div className="absolute bottom-20 left-4 right-4 z-30 p-3 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 text-white text-[13.5px] leading-snug text-center animate-fade-in shadow-lg">
              {current.caption}
            </div>
          )}

          {/* Double Tap Heart Pop Burst */}
          {doubleTapHeart && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
              <div className="text-7xl animate-ping text-rose-500 drop-shadow-2xl">
                ❤️
              </div>
            </div>
          )}

          {/* Flying Reaction Particles */}
          {flyingReactions.map((r) => (
            <div
              key={r.id}
              style={{
                left: `${r.x}%`,
                transform: `rotate(${r.rot}deg)`
              }}
              className="absolute bottom-20 text-4xl animate-fly-up pointer-events-none z-50 select-none drop-shadow-lg"
            >
              {r.emoji}
            </div>
          ))}
        </div>

        {/* Hold to Pause & Tap Navigation Zones */}
        <button
          type="button"
          aria-label="Назад"
          onClick={goBack}
          className="absolute left-0 top-16 bottom-24 w-[35%] z-20 cursor-default"
          onMouseDown={() => setIsHolding(true)}
          onMouseUp={() => setIsHolding(false)}
          onTouchStart={(e) => {
            touchStartYRef.current = e.touches[0].clientY;
            setIsHolding(true);
          }}
          onTouchMove={(e) => {
            const diffY = e.touches[0].clientY - touchStartYRef.current;
            if (diffY > 20) {
              isDraggingDownRef.current = true;
              setDragY(diffY);
            }
          }}
          onTouchEnd={() => {
            setIsHolding(false);
            if (dragY > 100) {
              onClose();
            } else {
              setDragY(0);
              isDraggingDownRef.current = false;
            }
          }}
        />

        <button
          type="button"
          aria-label="Вперед"
          onClick={advance}
          className="absolute right-0 top-16 bottom-24 w-[65%] z-20 cursor-default"
          onMouseDown={() => setIsHolding(true)}
          onMouseUp={() => setIsHolding(false)}
          onTouchStart={(e) => {
            touchStartYRef.current = e.touches[0].clientY;
            setIsHolding(true);
          }}
          onTouchMove={(e) => {
            const diffY = e.touches[0].clientY - touchStartYRef.current;
            if (diffY > 20) {
              isDraggingDownRef.current = true;
              setDragY(diffY);
            }
          }}
          onTouchEnd={() => {
            setIsHolding(false);
            if (dragY > 100) {
              onClose();
            } else {
              setDragY(0);
              isDraggingDownRef.current = false;
            }
          }}
        />

        {/* Bottom Interaction Footer (Reaction pill & Direct Reply) */}
        <div
          className={`relative z-30 px-3 pb-3 pt-2 bg-gradient-to-t from-black/85 via-black/50 to-transparent transition-opacity duration-200 ${
            isHolding ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          {isOwn ? (
            <button
              type="button"
              onClick={onOpenCreate}
              className="w-full py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] shadow-md"
            >
              <IconPlus size={16} stroke={2.5} />
              Добавить ещё одну историю
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              {/* Telegram Quick Reaction Pill Bar */}
              <div className="flex items-center justify-between px-2 py-1 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 overflow-x-auto tg-scrollbar">
                {TG_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleSendReaction(emoji)}
                    className="text-xl px-1.5 py-0.5 hover:scale-130 active:scale-95 transition-transform cursor-pointer"
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Direct Reply Form */}
              <form onSubmit={handleSendReply} className="flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Ответить на историю..."
                  className="flex-1 px-4 py-2.5 rounded-full bg-white/15 backdrop-blur-xl border border-white/20 text-white placeholder-white/60 text-xs focus:outline-none focus:border-white transition-colors"
                />
                {replyText.trim() && (
                  <button
                    type="submit"
                    className="w-9 h-9 rounded-full bg-[#3390ec] hover:bg-[#2b7ac9] text-white flex items-center justify-center cursor-pointer transition-transform active:scale-90 shadow-md shrink-0"
                  >
                    <IconSend size={16} />
                  </button>
                )}
              </form>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default StoryViewer;
