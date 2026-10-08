import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  IconX,
  IconTrash,
  IconEye,
  IconPlus,
  IconVolume,
  IconVolumeOff,
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconHeart,
  IconHeartFilled,
  IconArrowUp,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconLoader2,
} from '@tabler/icons-react';
import { useStories } from '../../context/stories-context';
import { useAuth, useRooms } from '../../context/contexts';
import type { UserId } from '../../types';
import type { Story } from '../../types/story.types';
import { StoryContent } from './storyCanvas';
import { PRIVACY_META, formatStoryAge, storyGradient } from './storyStyle';

interface StoryViewerProps {
  /** 'me' opens own stories, otherwise a specific userId */
  targetUser: string | null;
  onClose: () => void;
  onOpenCreate: () => void;
  onSendDirectMessage?: (peerUserId: string, text: string) => void;
}

const PHOTO_DURATION_MS = 5500;
const HOLD_MS = 180;
const SWIPE_CLOSE_PX = 90;
const REACTIONS = ['❤️', '🔥', '😂', '😍', '👏', '😮', '😢', '🎉'];

const isTypingTarget = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);

export const StoryViewer: React.FC<StoryViewerProps> = ({ targetUser, onClose, onOpenCreate, onSendDirectMessage }) => {
  const { stories, myStories, othersStories, deleteStory, viewStory, reactStory, isStoryViewed, markStoryViewedLocal } = useStories();
  const me = useAuth().currentUser ?? '';
  const { getUserDisplayName, getUserAvatar } = useRooms();

  const normalize = (uid: string | null) => (!uid || uid === me ? 'me' : uid);
  const listFor = (uid: string): Story[] => (uid === 'me' ? myStories : stories[uid] ?? []);
  const startIndexFor = (uid: string) => {
    if (uid === 'me') return 0;
    const i = listFor(uid).findIndex((s) => !isStoryViewed(s.id));
    return i === -1 ? 0 : i;
  };

  // The author order is snapshotted on open: viewing a story re-sorts the bar, which must not reshuffle the viewer.
  const [order] = useState<string[]>(() => {
    const ids = [...(myStories.length > 0 ? ['me'] : []), ...othersStories.map((o) => o.userId as string)];
    const target = normalize(targetUser);
    return ids.includes(target) ? ids : [target, ...ids];
  });
  const [userIdx, setUserIdx] = useState(() => Math.max(0, order.indexOf(normalize(targetUser))));
  const [storyIdx, setStoryIdx] = useState(() => startIndexFor(normalize(targetUser)));

  const userId = order[userIdx];
  const isOwn = userId === 'me';
  const authorId = (isOwn ? me : userId) as UserId;
  const list = listFor(userId);
  const index = Math.min(storyIdx, list.length - 1);
  const story: Story | undefined = list[index];

  // Interaction state that pauses playback
  const [holding, setHolding] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [replyFocused, setReplyFocused] = useState(false);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tabHidden, setTabHidden] = useState(() => document.visibilityState === 'hidden');
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [reply, setReply] = useState('');
  const [burst, setBurst] = useState<{ emoji: string; key: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const loaded = story ? story.type === 'text' || loadedId === story.id : false;
  const paused = holding || userPaused || replyFocused || viewersOpen || confirmDelete || tabHidden || !!reply.trim();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const elapsedRef = useRef(0);
  const replyRef = useRef<HTMLInputElement | null>(null);

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------
  const goToUser = useCallback(
    (nextIdx: number) => {
      if (nextIdx < 0 || nextIdx >= order.length) return onClose();
      setUserIdx(nextIdx);
      setStoryIdx(startIndexFor(order[nextIdx]));
      setViewersOpen(false);
      setConfirmDelete(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [order, onClose, stories, myStories]
  );

  const goNext = useCallback(() => {
    if (index < list.length - 1) setStoryIdx(index + 1);
    else goToUser(userIdx + 1);
  }, [index, list.length, goToUser, userIdx]);

  const goPrev = useCallback(() => {
    if (index > 0) setStoryIdx(index - 1);
    else if (userIdx > 0) {
      const prev = order[userIdx - 1];
      setUserIdx(userIdx - 1);
      setStoryIdx(Math.max(0, listFor(prev).length - 1));
    } else {
      elapsedRef.current = 0;
      if (videoRef.current) videoRef.current.currentTime = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, userIdx, order, stories, myStories]);

  // Author ran out of stories (expired / deleted) → move on.
  useEffect(() => {
    if (list.length === 0) goToUser(order.findIndex((uid, i) => i > userIdx && listFor(uid).length > 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.length]);

  // Mark as viewed
  useEffect(() => {
    if (!story) return;
    // Own stories are only marked locally, so the ring in the bar dims once you've watched them.
    if (isOwn) markStoryViewedLocal(story.id);
    else viewStory(story.id, story.userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  // ---------------------------------------------------------------------------
  // Playback clock — writes the progress bar directly instead of re-rendering every frame
  // ---------------------------------------------------------------------------
  useEffect(() => {
    elapsedRef.current = 0;
    if (barRef.current) barRef.current.style.transform = 'scaleX(0)';
  }, [story?.id]);

  useEffect(() => {
    if (!story || !loaded || paused) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const video = videoRef.current;
      let progress: number;
      if (story.type === 'video' && video) {
        progress = video.duration > 0 ? video.currentTime / video.duration : 0;
        if (video.ended) return goNext();
      } else {
        elapsedRef.current += now - last;
        progress = elapsedRef.current / PHOTO_DURATION_MS;
        if (progress >= 1) return goNext();
      }
      last = now;
      if (barRef.current) barRef.current.style.transform = `scaleX(${Math.min(1, progress)})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [story, loaded, paused, goNext]);

  // Never get stuck on a broken image
  useEffect(() => {
    if (!story || story.type === 'text' || loadedId === story.id) return;
    const id = story.id;
    const t = window.setTimeout(() => setLoadedId(id), 8000);
    return () => window.clearTimeout(t);
  }, [story, loadedId]);

  // Video follows pause and mute state; fall back to muted if the browser blocks sound
  useEffect(() => {
    const video = videoRef.current;
    if (!video || story?.type !== 'video') return;
    video.muted = muted;
    if (paused) video.pause();
    else video.play().catch(() => !muted && setMuted(true));
  }, [paused, muted, story, loaded]);

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(t);
  }, [toast]);

  // ---------------------------------------------------------------------------
  // Keyboard (ignored while typing a reply)
  // ---------------------------------------------------------------------------
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (confirmDelete) setConfirmDelete(false);
      else if (viewersOpen) setViewersOpen(false);
      else if (isTypingTarget(e.target)) (e.target as HTMLElement).blur();
      else onClose();
      return;
    }
    if (isTypingTarget(e.target) || viewersOpen || confirmDelete) return;
    if (e.key === 'ArrowRight') goNext();
    else if (e.key === 'ArrowLeft') goPrev();
    else if (e.key === ' ') {
      e.preventDefault();
      setUserPaused((p) => !p);
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  // ---------------------------------------------------------------------------
  // Pointer: tap left/right to navigate, hold to pause, swipe down to close
  // ---------------------------------------------------------------------------
  const gesture = useRef<{ x: number; y: number; t: number; timer?: number; held: boolean } | null>(null);
  const [dragY, setDragY] = useState(0);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button,input,a,[data-no-tap]')) return;
    if (e.button !== 0) return;
    if (replyFocused) {
      replyRef.current?.blur();
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    const g = { x: e.clientX, y: e.clientY, t: Date.now(), held: false, timer: 0 };
    g.timer = window.setTimeout(() => {
      g.held = true;
      setHolding(true);
    }, HOLD_MS);
    gesture.current = g;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g) return;
    const dy = e.clientY - g.y;
    if (dy > 10 && Math.abs(dy) > Math.abs(e.clientX - g.x)) {
      window.clearTimeout(g.timer);
      g.held = true;
      setHolding(true);
      setDragY(Math.max(0, dy));
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    window.clearTimeout(g.timer);
    setHolding(false);
    const dy = e.clientY - g.y;
    setDragY(0);
    if (dy > SWIPE_CLOSE_PX) return onClose();
    if (g.held) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX - rect.left < rect.width * 0.3) goPrev();
    else goNext();
  };

  const onPointerCancel = () => {
    if (gesture.current) window.clearTimeout(gesture.current.timer);
    gesture.current = null;
    setHolding(false);
    setDragY(0);
  };

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  const myReaction = story && Object.entries(story.reactions ?? {}).find(([, users]) => users.includes(me as UserId))?.[0];

  const react = (emoji: string) => {
    if (!story || isOwn) return;
    reactStory(story.id, story.userId, emoji);
    setBurst({ emoji, key: Date.now() });
    replyRef.current?.blur();
  };

  const sendReply = () => {
    const text = reply.trim();
    if (!story || !text || !onSendDirectMessage) return;
    onSendDirectMessage(story.userId, `Ответ на историю: ${text}`);
    setReply('');
    replyRef.current?.blur();
    setToast('Ответ отправлен в личные сообщения');
  };

  const removeStory = () => {
    if (!story) return;
    deleteStory(story.id);
    setConfirmDelete(false);
  };

  if (!story) return null;

  const name = isOwn ? 'Моя история' : getUserDisplayName(authorId);
  const avatar = getUserAvatar(authorId);
  const privacy = story.privacy ?? 'everyone';
  const PrivacyIcon = PRIVACY_META[privacy].icon;
  const reactionByUser = new Map<string, string>();
  Object.entries(story.reactions ?? {}).forEach(([emoji, users]) => users.forEach((u) => reactionByUser.set(u, emoji)));
  const chromeHidden = holding && !viewersOpen;

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-hidden bg-[#09090b] text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={`История: ${name}`}
    >
      {/* Ambient backdrop taken from the story itself */}
      <div className="pointer-events-none absolute inset-0 opacity-40 blur-3xl saturate-150" aria-hidden>
        {story.type === 'image' ? (
          <img src={story.data} alt="" className="h-full w-full scale-110 object-cover" />
        ) : (
          <div className="h-full w-full" style={{ background: story.type === 'text' ? storyGradient(story.background) : '#000' }} />
        )}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-black/45" aria-hidden />

      {/* Desktop close */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Закрыть"
        className="absolute right-4 top-4 z-10 hidden h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 cursor-pointer transition-colors hover:bg-white/20 hover:text-white sm:flex"
      >
        <IconX size={22} />
      </button>

      <div className="relative flex items-center gap-5">
        {/* Desktop prev */}
        <button
          type="button"
          onClick={goPrev}
          disabled={index === 0 && userIdx === 0}
          aria-label="Предыдущая"
          className="hidden h-11 w-11 items-center justify-center rounded-full bg-white/10 cursor-pointer transition-all hover:bg-white/20 disabled:pointer-events-none disabled:opacity-0 sm:flex"
        >
          <IconChevronLeft size={24} />
        </button>

        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={userId}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            style={{ y: dragY }}
            className="@container relative aspect-[9/16] h-[min(100dvh,calc(100vw*16/9))] overflow-hidden bg-black select-none sm:h-[min(calc(100dvh-40px),880px)] sm:rounded-[22px] sm:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] data-[gesture=on]:touch-none"
            // touch-action is intersected down the tree, so let the viewers list scroll while the sheet is open
            data-gesture={viewersOpen ? 'off' : 'on'}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onContextMenu={(e) => e.preventDefault()}
          >
            <StoryContent key={story.id} story={story} videoRef={videoRef} muted={muted} onLoaded={() => setLoadedId(story.id)} />

            {!loaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <IconLoader2 size={30} className="animate-spin text-white/70" />
              </div>
            )}

            {/* Header */}
            <div
              className={`absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/55 via-black/20 to-transparent px-3 pb-10 pt-[max(10px,env(safe-area-inset-top))] transition-opacity duration-200 ${
                chromeHidden ? 'opacity-0' : ''
              }`}
            >
              <div className="flex gap-[3px]">
                {list.map((s, i) => (
                  <div key={s.id} className="h-[2.5px] flex-1 overflow-hidden rounded-full bg-white/30">
                    <div
                      ref={i === index ? barRef : undefined}
                      className="h-full origin-left rounded-full bg-white"
                      style={{ transform: `scaleX(${i < index ? 1 : 0})` }}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-2.5 flex items-center gap-2.5">
                <Avatar src={avatar} name={isOwn ? getUserDisplayName(me as UserId) : name} size={36} />
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[14.5px] font-semibold">{name}</span>
                    {(isOwn ? privacy !== 'everyone' : privacy === 'close_friends') && (
                      <span
                        title={PRIVACY_META[privacy].label}
                        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full ${
                          privacy === 'close_friends' ? 'bg-[#32d74b] text-black' : 'bg-white/20'
                        }`}
                      >
                        <PrivacyIcon size={11} stroke={2.4} />
                      </span>
                    )}
                  </div>
                  <span className="text-[12.5px] text-white/65">
                    {formatStoryAge(story.timestamp)}
                    {story.isPinned ? ' · в профиле' : ''}
                  </span>
                </div>

                <div className="flex items-center" data-no-tap>
                  {story.type === 'video' && (
                    <HeaderButton label={muted ? 'Включить звук' : 'Выключить звук'} onClick={() => setMuted((m) => !m)}>
                      {muted ? <IconVolumeOff size={20} /> : <IconVolume size={20} />}
                    </HeaderButton>
                  )}
                  <HeaderButton label={userPaused ? 'Продолжить' : 'Пауза'} onClick={() => setUserPaused((p) => !p)}>
                    {userPaused ? <IconPlayerPlayFilled size={18} /> : <IconPlayerPauseFilled size={18} />}
                  </HeaderButton>
                  {story.type !== 'text' && (
                    <a
                      href={story.data}
                      download
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Скачать"
                      title="Скачать"
                      className="flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/15"
                    >
                      <IconDownload size={20} />
                    </a>
                  )}
                  <HeaderButton label="Закрыть" onClick={onClose} className="sm:hidden">
                    <IconX size={22} />
                  </HeaderButton>
                </div>
              </div>
            </div>

            {/* Reaction burst */}
            <AnimatePresence>
              {burst && (
                <motion.div
                  key={burst.key}
                  className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center text-[30cqw]"
                  initial={{ opacity: 0, scale: 0.3 }}
                  animate={{ opacity: [0, 1, 1, 0], scale: [0.3, 1.15, 1, 1.4], y: [0, 0, 0, -40] }}
                  transition={{ duration: 1, times: [0, 0.25, 0.6, 1] }}
                  onAnimationComplete={() => setBurst(null)}
                >
                  {burst.emoji}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {toast && (
                <motion.div
                  className="pointer-events-none absolute inset-x-0 top-[18%] z-30 flex justify-center"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <span className="rounded-full bg-black/70 px-3.5 py-1.5 text-[13px] font-medium backdrop-blur-md">{toast}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer */}
            <div
              className={`absolute inset-x-0 bottom-0 z-20 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 transition-opacity duration-200 ${
                chromeHidden ? 'opacity-0' : ''
              }`}
              data-no-tap
            >
              {isOwn ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewersOpen(true)}
                    className="flex min-w-0 items-center gap-2 rounded-full bg-black/40 py-1.5 pl-1.5 pr-3.5 text-[13.5px] font-medium backdrop-blur-md cursor-pointer transition-colors hover:bg-black/55"
                  >
                    {story.views.length > 0 ? (
                      <span className="flex -space-x-2">
                        {story.views.slice(-3).map((v) => (
                          <Avatar key={v} src={getUserAvatar(v)} name={getUserDisplayName(v)} size={24} ring />
                        ))}
                      </span>
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                        <IconEye size={15} />
                      </span>
                    )}
                    <span className="truncate">
                      {story.views.length === 0 ? 'Пока нет просмотров' : `${story.views.length} ${plural(story.views.length, 'просмотр', 'просмотра', 'просмотров')}`}
                    </span>
                  </button>
                  <div className="flex-1" />
                  <FooterButton label="Удалить" onClick={() => setConfirmDelete(true)}>
                    <IconTrash size={20} />
                  </FooterButton>
                  <FooterButton
                    label="Новая история"
                    onClick={() => {
                      onClose();
                      onOpenCreate();
                    }}
                  >
                    <IconPlus size={21} />
                  </FooterButton>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <AnimatePresence>
                    {replyFocused && (
                      <motion.div
                        className="flex justify-between rounded-full bg-black/55 px-1.5 py-1 backdrop-blur-xl"
                        initial={{ opacity: 0, y: 10, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                      >
                        {REACTIONS.map((emoji, i) => (
                          <motion.button
                            key={emoji}
                            type="button"
                            // keep focus in the input so the strip doesn't collapse before the click lands
                            onPointerDown={(e) => e.preventDefault()}
                            onClick={() => react(emoji)}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0, transition: { delay: i * 0.02 } }}
                            className={`flex h-9 w-9 items-center justify-center rounded-full text-[22px] cursor-pointer transition-transform hover:scale-125 active:scale-95 ${
                              myReaction === emoji ? 'bg-white/20' : ''
                            }`}
                          >
                            {emoji}
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="flex items-center gap-2">
                    <form
                      className="flex min-w-0 flex-1 items-center rounded-full bg-black/35 ring-1 ring-white/25 backdrop-blur-md transition-colors focus-within:bg-black/55"
                      onSubmit={(e) => {
                        e.preventDefault();
                        sendReply();
                      }}
                    >
                      <input
                        ref={replyRef}
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        onFocus={() => setReplyFocused(true)}
                        onBlur={() => setReplyFocused(false)}
                        maxLength={1000}
                        disabled={!onSendDirectMessage}
                        placeholder="Ответить…"
                        className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-[14px] text-white placeholder:text-white/65 outline-none"
                      />
                      {reply.trim() && (
                        <button
                          type="submit"
                          aria-label="Отправить"
                          onPointerDown={(e) => e.preventDefault()}
                          className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent cursor-pointer transition-transform active:scale-90"
                        >
                          <IconArrowUp size={18} stroke={2.4} />
                        </button>
                      )}
                    </form>
                    <FooterButton label={myReaction ? 'Реакция поставлена' : 'Нравится'} onClick={() => react(myReaction ?? '❤️')}>
                      {myReaction && myReaction !== '❤️' ? (
                        <span className="text-[20px] leading-none">{myReaction}</span>
                      ) : myReaction ? (
                        <IconHeartFilled size={22} className="text-[#ff375f]" />
                      ) : (
                        <IconHeart size={22} />
                      )}
                    </FooterButton>
                  </div>
                </div>
              )}
            </div>

            {/* Paused indicator */}
            <AnimatePresence>
              {userPaused && !holding && (
                <motion.div
                  className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/40 backdrop-blur-md">
                    <IconPlayerPauseFilled size={28} />
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Viewers sheet (own stories) */}
            <AnimatePresence>
              {viewersOpen && (
                <>
                  <motion.div
                    className="absolute inset-0 z-40 bg-black/50"
                    data-no-tap
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setViewersOpen(false)}
                  />
                  <motion.div
                    className="absolute inset-x-0 bottom-0 z-50 flex max-h-[62%] flex-col rounded-t-[20px] bg-[#1c1c1f] pb-[env(safe-area-inset-bottom)]"
                    data-no-tap
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', stiffness: 420, damping: 40 }}
                  >
                    <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-white/20" />
                    <div className="flex items-center justify-between px-4 pb-2 pt-3">
                      <div>
                        <p className="text-[15px] font-semibold">Просмотры</p>
                        <p className="text-[12px] text-white/45">
                          {PRIVACY_META[privacy].label} · {story.isPinned ? 'в профиле' : `${story.durationHours ?? 24} ч`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setViewersOpen(false)}
                        aria-label="Закрыть"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 cursor-pointer hover:bg-white/15"
                      >
                        <IconX size={17} />
                      </button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
                      {story.views.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                          <IconEye size={28} className="text-white/30" />
                          <p className="text-[13.5px] text-white/55">Здесь появятся те, кто посмотрел историю</p>
                        </div>
                      ) : (
                        [...story.views].reverse().map((v) => (
                          <div key={v} className="flex items-center gap-3 rounded-xl px-2 py-2">
                            <Avatar src={getUserAvatar(v)} name={getUserDisplayName(v)} size={38} />
                            <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium">{getUserDisplayName(v)}</span>
                            {reactionByUser.get(v) && <span className="text-[20px]">{reactionByUser.get(v)}</span>}
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Delete confirmation */}
            <AnimatePresence>
              {confirmDelete && (
                <motion.div
                  className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-[8cqw]"
                  data-no-tap
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setConfirmDelete(false)}
                >
                  <motion.div
                    role="alertdialog"
                    aria-label="Удалить историю?"
                    className="w-full max-w-[290px] rounded-2xl bg-[#1c1c1f] p-5 text-center ring-1 ring-white/10"
                    initial={{ scale: 0.94 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.97 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-[16px] font-semibold">Удалить историю?</p>
                    <p className="mt-1 text-[13.5px] text-white/55">Её больше никто не увидит.</p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-xl bg-white/10 py-2.5 text-[14px] font-semibold cursor-pointer hover:bg-white/15">
                        Отмена
                      </button>
                      <button type="button" onClick={removeStory} className="rounded-xl bg-danger py-2.5 text-[14px] font-semibold text-white cursor-pointer hover:brightness-110">
                        Удалить
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        {/* Desktop next */}
        <button
          type="button"
          onClick={goNext}
          aria-label="Следующая"
          className="hidden h-11 w-11 items-center justify-center rounded-full bg-white/10 cursor-pointer transition-colors hover:bg-white/20 sm:flex"
        >
          <IconChevronRight size={24} />
        </button>
      </div>
    </motion.div>,
    document.body
  );
};

const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};

const Avatar: React.FC<{ src?: string; name: string; size: number; ring?: boolean }> = ({ src, name, size, ring }) => (
  <span
    className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15 font-semibold text-white ${ring ? 'ring-2 ring-black/60' : ''}`}
    style={{ width: size, height: size, fontSize: size * 0.42 }}
  >
    {src ? <img src={src} alt="" className="h-full w-full object-cover" draggable={false} /> : (name.trim().charAt(0) || '?').toUpperCase()}
  </span>
);

const HeaderButton: React.FC<{ label: string; onClick: () => void; className?: string; children: React.ReactNode }> = ({ label, onClick, className = '', children }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    className={`flex h-9 w-9 items-center justify-center rounded-full text-white/90 cursor-pointer transition-colors hover:bg-white/15 ${className}`}
  >
    {children}
  </button>
);

const FooterButton: React.FC<{ label: string; onClick: () => void; children: React.ReactNode }> = ({ label, onClick, children }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/40 backdrop-blur-md cursor-pointer transition-all hover:bg-black/55 active:scale-90"
  >
    {children}
  </button>
);

export default StoryViewer;
