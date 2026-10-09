import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  IconX,
  IconTypography,
  IconPhoto,
  IconCamera,
  IconBrush,
  IconMoodSmile,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconArrowUp,
  IconChevronUp,
  IconCheck,
  IconArrowBackUp,
  IconTrash,
  IconCameraRotate,
  IconUpload,
  IconAlertTriangle,
  IconRefresh,
  IconPin,
  IconLoader2,
  IconChevronRight,
} from '@tabler/icons-react';
import { useStories } from '../../context/stories-context';
import { useAuth, useRooms } from '../../context/contexts';
import { uploadFile } from '../../services/upload.service';
import {
  STORY_DURATIONS,
  STORY_FONT_FAMILIES,
  STORY_GRADIENTS,
  STORY_PRIVACY_OPTIONS,
  type StoryFontStyle,
  type StoryPrivacy,
  type StoryStickerOverlay,
} from '../../types/story.types';
import { StoryMedia } from './storyCanvas';
import { CloseFriendsSheet } from './CloseFriendsSheet';
import { FONT_LABELS, PRIVACY_META, STORY_CAPTION_MAX, STORY_TEXT_MAX, storyGradient, storyTextProps } from './storyStyle';

interface StoryCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Mode = 'text' | 'media' | 'camera';
type Panel = 'font' | 'color' | 'background' | 'brush' | 'sticker' | null;
type Align = 'left' | 'center' | 'right';
type TextBg = 'none' | 'fill' | 'glow';

interface Stroke {
  color: string;
  size: number;
  points: [number, number][];
}

interface MediaDraft {
  preview: string;
  type: 'image' | 'video';
  status: 'uploading' | 'ready' | 'error';
  progress: number;
  url?: string;
  error?: string;
  blob: Blob;
  name: string;
}

const GRADIENT_KEYS = Object.keys(STORY_GRADIENTS);
const FONT_KEYS = Object.keys(FONT_LABELS) as StoryFontStyle[];
const COLORS = ['#ffffff', '#111111', '#ff453a', '#ff9f0a', '#ffd60a', '#32d74b', '#64d2ff', '#0a84ff', '#bf5af2', '#ff375f'];
const BRUSH_SIZES = [8, 16, 30];
const STICKERS = [
  '🔥', '❤️', '😂', '😍', '🥹', '😎', '🤯', '🥳',
  '👍', '👏', '🙏', '💯', '✨', '⚡', '🎉', '🚀',
  '🌸', '🌈', '☀️', '🌙', '⭐', '🍕', '☕', '🎧',
  '📍', '💬', '👀', '💪', '🫶', '😴', '🤔', '😭',
];
const CANVAS_W = 720;
const CANVAS_H = 1280;
const MAX_VIDEO_SECONDS = 60;
const HOLD_TO_RECORD_MS = 280;
const ALIGN_ORDER: Align[] = ['center', 'left', 'right'];
const TEXT_BG_ORDER: TextBg[] = ['none', 'fill', 'glow'];

const pickRecorderMime = () =>
  typeof MediaRecorder === 'undefined'
    ? ''
    : ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find((t) => MediaRecorder.isTypeSupported(t)) || '';

const next = <T,>(list: readonly T[], value: T) => list[(list.indexOf(value) + 1) % list.length];

export const StoryCreateModal: React.FC<StoryCreateModalProps> = ({ isOpen, onClose }) => (
  <AnimatePresence>{isOpen && <StoryEditor key="story-editor" onClose={onClose} />}</AnimatePresence>
);

/** Full-screen story composer. Mounted fresh each time it opens, so no reset logic is needed. */
const StoryEditor: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { sendStory, closeFriends } = useStories();
  const me = useAuth().currentUser ?? '';
  const { currentUserName } = useRooms();
  const authorName = currentUserName || me.charAt(0).toUpperCase() + me.slice(1);

  const [mode, setMode] = useState<Mode>('text');
  const [panel, setPanel] = useState<Panel>(null);

  // Text story
  const [text, setText] = useState('');
  const [background, setBackground] = useState(GRADIENT_KEYS[0]);
  const [fontStyle, setFontStyle] = useState<StoryFontStyle>('classic');
  const [align, setAlign] = useState<Align>('center');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textBg, setTextBg] = useState<TextBg>('none');
  const editableRef = useRef<HTMLDivElement | null>(null);

  // Media story
  const [media, setMedia] = useState<MediaDraft | null>(null);
  const [caption, setCaption] = useState('');
  const [isDropTarget, setIsDropTarget] = useState(false);
  const uploadSeqRef = useRef(0);
  const previewsRef = useRef<string[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Overlays
  const [stickers, setStickers] = useState<StoryStickerOverlay[]>([]);
  const [draggingSticker, setDraggingSticker] = useState<string | null>(null);
  const [overTrash, setOverTrash] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [brushColor, setBrushColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(BRUSH_SIZES[1]);
  const doodleRef = useRef<HTMLCanvasElement | null>(null);
  const liveStrokeRef = useRef<Stroke | null>(null);
  const canvasBoxRef = useRef<HTMLDivElement | null>(null);

  // Settings
  const [privacy, setPrivacy] = useState<StoryPrivacy>('everyone');
  const [durationHours, setDurationHours] = useState(24);
  const [isPinned, setIsPinned] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [editFriends, setEditFriends] = useState(false);

  // Camera
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [cameraState, setCameraState] = useState<'starting' | 'live' | 'denied'>('starting');
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [recordSeconds, setRecordSeconds] = useState<number | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const holdTimerRef = useRef<number | undefined>(undefined);
  const recordTimerRef = useRef<number | undefined>(undefined);

  const isDirty = text.trim().length > 0 || media !== null || stickers.length > 0 || strokes.length > 0;

  // ---------------------------------------------------------------------------
  // Media upload: always upload, so the story works for everyone — not a local blob: URL
  // ---------------------------------------------------------------------------
  const startUpload = useCallback((blob: Blob, name: string, type: 'image' | 'video') => {
    const preview = URL.createObjectURL(blob);
    previewsRef.current.push(preview);
    const seq = ++uploadSeqRef.current;
    const isCurrent = () => seq === uploadSeqRef.current;
    setMedia({ preview, type, status: 'uploading', progress: 0, blob, name });
    setMode('media');
    setPanel(null);
    uploadFile({ name, type: blob.type, data: '', rawBlob: blob }, (progress) => {
      if (isCurrent()) setMedia((m) => (m ? { ...m, progress } : m));
    })
      .then((url) => {
        if (isCurrent()) setMedia((m) => (m ? { ...m, status: 'ready', url, progress: 100 } : m));
      })
      .catch((err: Error) => {
        if (isCurrent()) setMedia((m) => (m ? { ...m, status: 'error', error: err.message } : m));
      });
  }, []);

  const handleFile = useCallback(
    (file: File | undefined | null) => {
      if (!file) return;
      const type = file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : null;
      if (type) startUpload(file, file.name, type);
    },
    [startUpload]
  );

  const retryUpload = () => media && startUpload(media.blob, media.name, media.type);

  useEffect(() => {
    const previews = previewsRef.current;
    return () => previews.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  // Paste an image straight into the composer.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.files ?? []).find((f) => /^(image|video)\//.test(f.type));
      if (!file) return;
      e.preventDefault();
      handleFile(file);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [handleFile]);

  // ---------------------------------------------------------------------------
  // Camera
  // ---------------------------------------------------------------------------
  const openCamera = () => {
    setPanel(null);
    setCameraState('starting');
    setMode('camera');
  };

  useEffect(() => {
    if (mode !== 'camera') return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    const video = { facingMode: facing, width: { ideal: 1080 }, height: { ideal: 1920 } };
    navigator.mediaDevices
      ?.getUserMedia({ video, audio: true })
      .catch(() => navigator.mediaDevices.getUserMedia({ video }))
      .then((s) => {
        stream = s;
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        streamRef.current = s;
        if (cameraVideoRef.current) cameraVideoRef.current.srcObject = s;
        setCameraState('live');
      })
      .catch(() => !cancelled && setCameraState('denied'));
    if (!navigator.mediaDevices) setCameraState('denied');
    return () => {
      cancelled = true;
      window.clearTimeout(holdTimerRef.current);
      window.clearInterval(recordTimerRef.current);
      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.onstop = null;
        recorderRef.current.stop();
      }
      recorderRef.current = null;
      setRecordSeconds(null);
      stream?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [mode, facing, cameraAttempt]);

  const snapPhoto = () => {
    const video = cameraVideoRef.current;
    if (!video || cameraState !== 'live') return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (facing === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => blob && startUpload(blob, `story-${Date.now()}.jpg`, 'image'), 'image/jpeg', 0.9);
  };

  const stopRecording = () => {
    window.clearInterval(recordTimerRef.current);
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream || typeof MediaRecorder === 'undefined') return;
    const mimeType = pickRecorderMime();
    const chunks: Blob[] = [];
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      return;
    }
    recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
    recorder.onstop = () => {
      setRecordSeconds(null);
      const type = recorder.mimeType || mimeType || 'video/webm';
      const blob = new Blob(chunks, { type });
      if (blob.size > 0) startUpload(blob, `story-${Date.now()}.${type.includes('mp4') ? 'mp4' : 'webm'}`, 'video');
    };
    recorder.start(250);
    recorderRef.current = recorder;
    setRecordSeconds(0);
    const startedAt = Date.now();
    recordTimerRef.current = window.setInterval(() => {
      const s = Math.floor((Date.now() - startedAt) / 1000);
      setRecordSeconds(s);
      if (s >= MAX_VIDEO_SECONDS) stopRecording();
    }, 200);
  };

  // Tap = photo, hold = video (released → stop).
  const shutterDown = (e: React.PointerEvent) => {
    if (cameraState !== 'live') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    holdTimerRef.current = window.setTimeout(() => {
      holdTimerRef.current = undefined;
      startRecording();
    }, HOLD_TO_RECORD_MS);
  };
  const shutterUp = () => {
    if (holdTimerRef.current !== undefined) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = undefined;
      snapPhoto();
    } else {
      stopRecording();
    }
  };

  // ---------------------------------------------------------------------------
  // Doodle layer (strokes kept as data so they can be undone)
  // ---------------------------------------------------------------------------
  const paintStroke = (ctx: CanvasRenderingContext2D, s: Stroke) => {
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;
    ctx.lineWidth = s.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const [first, ...rest] = s.points;
    if (!first) return;
    if (rest.length === 0) {
      ctx.beginPath();
      ctx.arc(first[0], first[1], s.size / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(first[0], first[1]);
    rest.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.stroke();
  };

  useEffect(() => {
    const ctx = doodleRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    strokes.forEach((s) => paintStroke(ctx, s));
  }, [strokes, mode]);

  const toCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const rect = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - rect.left) / rect.width) * CANVAS_W, ((e.clientY - rect.top) / rect.height) * CANVAS_H];
  };

  const drawDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    liveStrokeRef.current = { color: brushColor, size: brushSize, points: [toCanvasPoint(e)] };
  };
  const drawMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const stroke = liveStrokeRef.current;
    const ctx = e.currentTarget.getContext('2d');
    if (!stroke || !ctx) return;
    const prev = stroke.points[stroke.points.length - 1];
    const point = toCanvasPoint(e);
    stroke.points.push(point);
    paintStroke(ctx, { ...stroke, points: [prev, point] });
  };
  const drawUp = () => {
    const stroke = liveStrokeRef.current;
    liveStrokeRef.current = null;
    if (stroke) setStrokes((s) => [...s, stroke]);
  };

  // ---------------------------------------------------------------------------
  // Stickers: drag to move, wheel to resize, drop on the bin to remove
  // ---------------------------------------------------------------------------
  const addSticker = (emoji: string) => {
    setStickers((list) => [
      ...list,
      { id: `stk-${Date.now()}-${list.length}`, type: 'emoji', content: emoji, x: 50 + (Math.random() - 0.5) * 20, y: 42 + (Math.random() - 0.5) * 20, scale: 1, rotation: 0 },
    ]);
    setPanel(null);
  };

  const stickerPointer = (id: string) => ({
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      setDraggingSticker(id);
      setStickers((list) => [...list.filter((s) => s.id !== id), ...list.filter((s) => s.id === id)]);
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      if (draggingSticker !== id) return;
      const rect = canvasBoxRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
      setOverTrash(y > 86 && Math.abs(x - 50) < 14);
      setStickers((list) => list.map((s) => (s.id === id ? { ...s, x, y } : s)));
    },
    onPointerUp: () => {
      if (overTrash) setStickers((list) => list.filter((s) => s.id !== id));
      setDraggingSticker(null);
      setOverTrash(false);
    },
    onWheel: (e: React.WheelEvent<HTMLDivElement>) => {
      const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
      setStickers((list) => list.map((s) => (s.id === id ? { ...s, scale: Math.min(4, Math.max(0.4, (s.scale || 1) * factor)) } : s)));
    },
  });

  // ---------------------------------------------------------------------------
  // Text editing (contentEditable shrink-wraps, so the "fill" style hugs the text)
  // ---------------------------------------------------------------------------
  const onTextInput = (e: React.FormEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    let value = el.innerText.replace(/\n$/, '');
    if (value.length > STORY_TEXT_MAX) {
      value = value.slice(0, STORY_TEXT_MAX);
      el.innerText = value;
      const sel = window.getSelection();
      sel?.selectAllChildren(el);
      sel?.collapseToEnd();
    }
    if (!value.trim()) el.textContent = '';
    setText(value);
  };

  const focusText = () => {
    const el = editableRef.current;
    if (!el || document.activeElement === el) return;
    el.focus();
    const sel = window.getSelection();
    sel?.selectAllChildren(el);
    sel?.collapseToEnd();
  };

  useEffect(() => {
    if (mode === 'text') requestAnimationFrame(focusText);
  }, [mode]);

  // ---------------------------------------------------------------------------
  // Publish / close
  // ---------------------------------------------------------------------------
  const canPublish = mode === 'text' ? text.trim().length > 0 : mode === 'media' && media?.status === 'ready';

  const publish = () => {
    if (!canPublish) return;
    const drawingData = strokes.length > 0 ? doodleRef.current?.toDataURL('image/png') : undefined;
    const common = {
      authorName,
      durationHours,
      privacy,
      isPinned,
      isCloseFriends: privacy === 'close_friends',
      stickerOverlays: stickers.length > 0 ? stickers : undefined,
      drawingData,
    };
    if (mode === 'text') {
      sendStory({ ...common, type: 'text', data: text.trim(), background, fontStyle, textColor, textBgStyle: textBg });
    } else if (media?.url) {
      sendStory({ ...common, type: media.type, data: media.url, caption: caption.trim() || undefined });
    }
    onClose();
  };

  const requestClose = () => (isDirty ? setConfirmDiscard(true) : onClose());

  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyHandlerRef.current = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (editFriends) setEditFriends(false);
      else if (confirmDiscard) setConfirmDiscard(false);
      else if (showSettings) setShowSettings(false);
      else if (panel) setPanel(null);
      else requestClose();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      publish();
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyHandlerRef.current(e);
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const togglePanel = (p: Exclude<Panel, null>) => setPanel((cur) => (cur === p ? null : p));
  const AlignIcon = align === 'left' ? IconAlignLeft : align === 'right' ? IconAlignRight : IconAlignCenter;
  const PrivacyIcon = PRIVACY_META[privacy].icon;
  const textProps = storyTextProps(text, { fontStyle, textColor, textBgStyle: textBg, align });
  const showTools = mode !== 'camera';

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[85] flex flex-col items-center justify-center bg-[#0b0b0d] text-white select-none"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      role="dialog"
      aria-modal="true"
      aria-label="Новая история"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDropTarget(true);
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setIsDropTarget(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDropTarget(false);
        handleFile(e.dataTransfer.files?.[0]);
      }}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      <motion.div
        className="relative flex flex-col items-center gap-3 sm:gap-4"
        initial={{ scale: 0.97, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.98, y: 8 }}
        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      >
        {/* ---------------- Canvas ---------------- */}
        <div
          ref={canvasBoxRef}
          className={`@container relative aspect-[9/16] h-[min(calc(100dvh-148px-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)),calc(100vw*16/9),820px)] overflow-hidden bg-zinc-900 sm:rounded-[26px] sm:ring-1 sm:ring-white/10 transition-shadow ${
            isDropTarget ? 'ring-2! ring-accent!' : ''
          }`}
          style={mode === 'text' ? { background: storyGradient(background) } : undefined}
        >
          {/* Content */}
          {mode === 'text' && (
            <div className="absolute inset-0 flex items-center justify-center p-[8cqw]" onClick={focusText}>
              <div
                ref={editableRef}
                contentEditable="plaintext-only"
                role="textbox"
                aria-multiline="true"
                aria-label="Текст истории"
                data-placeholder="Начните печатать"
                spellCheck={false}
                onInput={onTextInput}
                onClick={(e) => e.stopPropagation()}
                onFocus={() => panel === 'brush' && setPanel(null)}
                className={`${textProps.className} min-w-[2cqw] cursor-text outline-none select-text caret-white empty:before:text-white/55 empty:before:content-[attr(data-placeholder)]`}
                style={textProps.style}
              />
            </div>
          )}

          {mode === 'media' &&
            (media ? (
              <>
                <StoryMedia type={media.type} src={media.preview} loop />
                {media.status !== 'ready' && (
                  <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/35 backdrop-blur-[2px]">
                    {media.status === 'uploading' ? (
                      <div className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-[13px] font-medium tabular-nums">
                        <IconLoader2 size={16} className="animate-spin" />
                        Загрузка {media.progress}%
                      </div>
                    ) : (
                      <div className="mx-6 flex flex-col items-center gap-3 rounded-2xl bg-black/70 px-5 py-4 text-center">
                        <IconAlertTriangle size={22} className="text-amber-400" />
                        <p className="text-[13px] leading-snug text-white/85">
                          Не удалось загрузить файл
                          {media.error ? <span className="mt-0.5 block text-white/50">{media.error}</span> : null}
                        </p>
                        <button type="button" onClick={retryUpload} className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-semibold text-black cursor-pointer">
                          <IconRefresh size={15} /> Повторить
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="group absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center cursor-pointer"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 transition-colors group-hover:bg-white/15">
                  <IconUpload size={26} stroke={1.75} />
                </span>
                <span>
                  <span className="block text-[15px] font-semibold">Выберите фото или видео</span>
                  <span className="mt-1 block text-[13px] text-white/55">или перетащите файл сюда · вставьте Ctrl+V</span>
                </span>
                <span className="rounded-full bg-white px-4 py-2 text-[13.5px] font-semibold text-black transition-transform group-active:scale-95">
                  Открыть галерею
                </span>
              </button>
            ))}

          {mode === 'camera' && (
            <div className="absolute inset-0 bg-black">
              <video
                ref={cameraVideoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover ${facing === 'user' ? '-scale-x-100' : ''}`}
              />
              {cameraState === 'denied' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
                  <IconCamera size={30} stroke={1.5} className="text-white/50" />
                  <p className="text-[14px] leading-snug text-white/80">Нет доступа к камере. Разрешите его в настройках браузера.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setCameraState('starting');
                      setCameraAttempt((n) => n + 1);
                    }}
                    className="rounded-full bg-white px-4 py-2 text-[13.5px] font-semibold text-black cursor-pointer"
                  >
                    Попробовать снова
                  </button>
                </div>
              )}
              {recordSeconds !== null && (
                <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/55 px-3 py-1 text-[13px] font-semibold tabular-nums">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                  0:{String(recordSeconds).padStart(2, '0')} / 1:00
                </div>
              )}
              {cameraState === 'live' && (
                <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 bg-gradient-to-t from-black/50 to-transparent pb-6 pt-16">
                  <div className="relative flex w-full items-center justify-center">
                    <button
                      type="button"
                      aria-label="Сделать фото — удерживайте для видео"
                      onPointerDown={shutterDown}
                      onPointerUp={shutterUp}
                      onPointerCancel={stopRecording}
                      className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full cursor-pointer touch-none"
                    >
                      <svg viewBox="0 0 72 72" className="absolute inset-0 -rotate-90">
                        <circle cx="36" cy="36" r="33" fill="none" stroke="white" strokeWidth="4" opacity={recordSeconds === null ? 1 : 0.35} />
                        {recordSeconds !== null && (
                          <circle
                            cx="36"
                            cy="36"
                            r="33"
                            fill="none"
                            stroke="#ff453a"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray={2 * Math.PI * 33}
                            strokeDashoffset={2 * Math.PI * 33 * (1 - recordSeconds / MAX_VIDEO_SECONDS)}
                            className="transition-[stroke-dashoffset] duration-200 ease-linear"
                          />
                        )}
                      </svg>
                      <span
                        className={`block transition-all duration-200 ${
                          recordSeconds === null ? 'h-[58px] w-[58px] rounded-full bg-white active:scale-90' : 'h-7 w-7 rounded-lg bg-[#ff453a]'
                        }`}
                      />
                    </button>
                    {recordSeconds === null && (
                      <button
                        type="button"
                        aria-label="Сменить камеру"
                        onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}
                        className="absolute right-[calc(50%-110px)] flex h-11 w-11 items-center justify-center rounded-full bg-white/15 backdrop-blur-md cursor-pointer active:scale-90 transition-transform"
                      >
                        <IconCameraRotate size={21} stroke={1.75} />
                      </button>
                    )}
                  </div>
                  <span className="text-[12px] text-white/70">{recordSeconds === null ? 'Нажмите — фото, удерживайте — видео' : 'Отпустите, чтобы закончить'}</span>
                </div>
              )}
            </div>
          )}

          {/* Doodle + stickers (shared by text and media stories) */}
          {showTools && (
            <canvas
              ref={doodleRef}
              width={CANVAS_W}
              height={CANVAS_H}
              onPointerDown={drawDown}
              onPointerMove={drawMove}
              onPointerUp={drawUp}
              onPointerCancel={drawUp}
              className={`absolute inset-0 z-10 h-full w-full touch-none ${panel === 'brush' ? 'cursor-crosshair' : 'pointer-events-none'}`}
            />
          )}
          {showTools &&
            stickers.map((s) => (
              <div
                key={s.id}
                {...stickerPointer(s.id)}
                className={`absolute z-20 cursor-grab touch-none leading-none drop-shadow-[0_1cqw_2cqw_rgba(0,0,0,0.25)] transition-[opacity,scale] ${
                  draggingSticker === s.id ? 'cursor-grabbing' : ''
                } ${draggingSticker === s.id && overTrash ? 'scale-50 opacity-60' : ''} ${panel === 'brush' ? 'pointer-events-none' : ''}`}
                style={{ left: `${s.x}%`, top: `${s.y}%`, fontSize: `${12 * (s.scale || 1)}cqw`, transform: 'translate(-50%, -50%)' }}
                title="Перетащите; колесо — размер"
              >
                {s.content}
              </div>
            ))}

          {/* Bin shown while a sticker is dragged */}
          <AnimatePresence>
            {draggingSticker && (
              <motion.div
                className={`pointer-events-none absolute bottom-[5%] left-1/2 z-30 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full backdrop-blur-md transition-colors ${
                  overTrash ? 'bg-red-500' : 'bg-black/45'
                }`}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: overTrash ? 1.15 : 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
              >
                <IconTrash size={20} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Top bar: close + tool rail */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between bg-gradient-to-b from-black/30 to-transparent p-3">
            <ToolButton label="Закрыть" onClick={requestClose}>
              <IconX size={22} />
            </ToolButton>
            {showTools && !draggingSticker && (
              <div className="flex flex-col items-center gap-2">
                {mode === 'text' && (
                  <>
                    <ToolButton label="Шрифт" active={panel === 'font'} onClick={() => togglePanel('font')}>
                      <span className="text-[15px] font-bold" style={{ fontFamily: STORY_FONT_FAMILIES[fontStyle] }}>
                        Aa
                      </span>
                    </ToolButton>
                    <ToolButton label="Цвет текста" active={panel === 'color'} onClick={() => togglePanel('color')}>
                      <span className="h-[18px] w-[18px] rounded-full ring-2 ring-white" style={{ background: textColor }} />
                    </ToolButton>
                    <ToolButton label="Фон" active={panel === 'background'} onClick={() => togglePanel('background')}>
                      <span className="h-[18px] w-[18px] rounded-[6px] ring-2 ring-white" style={{ background: storyGradient(background) }} />
                    </ToolButton>
                    <ToolButton label="Выравнивание" onClick={() => setAlign((a) => next(ALIGN_ORDER, a))}>
                      <AlignIcon size={20} />
                    </ToolButton>
                    <ToolButton label="Подложка текста" onClick={() => setTextBg((b) => next(TEXT_BG_ORDER, b))}>
                      <span
                        className={`flex h-[22px] w-[22px] items-center justify-center rounded-[6px] text-[13px] font-bold ${
                          textBg === 'fill' ? 'bg-white text-black' : textBg === 'glow' ? 'ring-1 ring-white/70 [text-shadow:0_0_6px_#fff]' : 'ring-1 ring-white/70'
                        }`}
                      >
                        A
                      </span>
                    </ToolButton>
                  </>
                )}
                {mode === 'media' && media && (
                  <ToolButton label="Заменить" onClick={() => fileRef.current?.click()}>
                    <IconPhoto size={20} />
                  </ToolButton>
                )}
                <ToolButton label="Рисовать" active={panel === 'brush'} onClick={() => togglePanel('brush')}>
                  <IconBrush size={20} />
                </ToolButton>
                <ToolButton label="Стикер" active={panel === 'sticker'} onClick={() => togglePanel('sticker')}>
                  <IconMoodSmile size={20} />
                </ToolButton>
              </div>
            )}
          </div>

          {/* Bottom of canvas: tool panel and caption */}
          <div className="absolute inset-x-0 bottom-0 z-30 flex flex-col gap-2 p-3">
            <AnimatePresence mode="wait">
              {panel && (
                <motion.div
                  key={panel}
                  className="rounded-2xl bg-black/55 p-2 backdrop-blur-xl"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8, transition: { duration: 0.1 } }}
                  transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                >
                  {panel === 'font' && (
                    <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
                      {FONT_KEYS.map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setFontStyle(f)}
                          className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold cursor-pointer transition-colors ${
                            fontStyle === f ? 'bg-white text-black' : 'text-white/85 hover:bg-white/10'
                          }`}
                          style={{ fontFamily: STORY_FONT_FAMILIES[f] }}
                        >
                          {FONT_LABELS[f]}
                        </button>
                      ))}
                    </div>
                  )}
                  {panel === 'color' && <Swatches colors={COLORS} value={textColor} onChange={setTextColor} />}
                  {panel === 'background' && (
                    <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] p-0.5">
                      {GRADIENT_KEYS.map((key) => (
                        <button
                          key={key}
                          type="button"
                          aria-label={`Фон ${key}`}
                          onClick={() => setBackground(key)}
                          className={`h-8 w-8 shrink-0 rounded-[10px] cursor-pointer transition-transform hover:scale-105 ${
                            background === key ? 'ring-2 ring-white ring-offset-2 ring-offset-black/60' : ''
                          }`}
                          style={{ background: STORY_GRADIENTS[key] }}
                        />
                      ))}
                    </div>
                  )}
                  {panel === 'brush' && (
                    <div className="flex flex-col gap-2">
                      <Swatches colors={COLORS} value={brushColor} onChange={setBrushColor} />
                      <div className="flex items-center gap-1">
                        {BRUSH_SIZES.map((size) => (
                          <button
                            key={size}
                            type="button"
                            aria-label={`Толщина ${size}`}
                            onClick={() => setBrushSize(size)}
                            className={`flex h-8 w-8 items-center justify-center rounded-full cursor-pointer ${brushSize === size ? 'bg-white/20' : 'hover:bg-white/10'}`}
                          >
                            <span className="rounded-full" style={{ width: size / 2.2 + 2, height: size / 2.2 + 2, background: brushColor }} />
                          </button>
                        ))}
                        <div className="flex-1" />
                        <button
                          type="button"
                          disabled={strokes.length === 0}
                          onClick={() => setStrokes((s) => s.slice(0, -1))}
                          className="flex h-8 items-center gap-1 rounded-full px-2.5 text-[12.5px] font-medium cursor-pointer hover:bg-white/10 disabled:opacity-35 disabled:cursor-default"
                        >
                          <IconArrowBackUp size={16} /> Отменить
                        </button>
                        <button
                          type="button"
                          onClick={() => setPanel(null)}
                          className="flex h-8 items-center gap-1 rounded-full bg-white px-3 text-[12.5px] font-semibold text-black cursor-pointer"
                        >
                          Готово
                        </button>
                      </div>
                    </div>
                  )}
                  {panel === 'sticker' && (
                    <div className="grid grid-cols-8 gap-0.5">
                      {STICKERS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => addSticker(emoji)}
                          className="flex aspect-square items-center justify-center rounded-lg text-[22px] cursor-pointer transition-transform hover:scale-110 hover:bg-white/10 active:scale-95"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {mode === 'media' && media && !draggingSticker && panel !== 'brush' && (
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={STORY_CAPTION_MAX}
                placeholder="Добавить подпись…"
                className="w-full rounded-full bg-black/45 px-4 py-2.5 text-[14px] text-white placeholder:text-white/55 outline-none backdrop-blur-md focus:bg-black/60"
              />
            )}
          </div>
        </div>

        {/* ---------------- Bottom bar ---------------- */}
        <div className="flex w-full max-w-[460px] flex-col gap-3 px-3 sm:px-0">
          <div className="relative mx-auto flex rounded-full bg-white/[0.07] p-1" role="tablist" aria-label="Тип истории">
            {(
              [
                { id: 'text', label: 'Текст', icon: IconTypography },
                { id: 'media', label: 'Галерея', icon: IconPhoto },
                { id: 'camera', label: 'Камера', icon: IconCamera },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mode === id}
                onClick={() => (id === 'camera' ? openCamera() : (setMode(id), setPanel(null)))}
                className={`relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold cursor-pointer transition-colors ${
                  mode === id ? 'text-black' : 'text-white/65 hover:text-white'
                }`}
              >
                {mode === id && (
                  <motion.span layoutId="story-mode-pill" className="absolute inset-0 rounded-full bg-white" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
                )}
                <Icon size={16} stroke={2} className="relative" />
                <span className="relative">{label}</span>
              </button>
            ))}
          </div>

          <div className="relative flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setShowSettings((s) => !s)}
              aria-expanded={showSettings}
              className="flex min-w-0 items-center gap-2 rounded-full bg-white/[0.07] py-2 pl-3 pr-2.5 text-[13.5px] font-medium cursor-pointer transition-colors hover:bg-white/[0.12]"
            >
              <PrivacyIcon size={17} stroke={1.9} className={privacy === 'close_friends' ? 'text-[#32d74b]' : 'text-white/80'} />
              <span className="truncate">
                {PRIVACY_META[privacy].label} · {isPinned ? 'в профиле' : `${durationHours} ч`}
              </span>
              <IconChevronUp size={15} className={`shrink-0 text-white/50 transition-transform ${showSettings ? '' : 'rotate-180'}`} />
            </button>

            <button
              type="button"
              onClick={publish}
              disabled={!canPublish}
              className="flex shrink-0 items-center gap-2 rounded-full bg-accent py-2 pl-4 pr-2 text-[14px] font-semibold text-white shadow-[0_6px_20px_-6px_var(--accent)] cursor-pointer transition-all hover:bg-accent-strong active:scale-[0.97] disabled:cursor-default disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none"
            >
              {media?.status === 'uploading' && mode === 'media' ? `Загрузка ${media.progress}%` : 'Опубликовать'}
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
                <IconArrowUp size={17} stroke={2.4} />
              </span>
            </button>

            <AnimatePresence>
              {showSettings && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
                  <motion.div
                    className="absolute bottom-[calc(100%+10px)] left-0 z-50 w-[min(340px,calc(100vw-24px))] origin-bottom-left rounded-2xl bg-[#1c1c1f] p-1.5 shadow-2xl ring-1 ring-white/10"
                    initial={{ opacity: 0, scale: 0.96, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97, y: 6, transition: { duration: 0.12 } }}
                    transition={{ type: 'spring', stiffness: 520, damping: 36 }}
                  >
                    <p className="px-2.5 pb-1 pt-2 text-[12px] font-medium text-white/45">Кто увидит</p>
                    {STORY_PRIVACY_OPTIONS.map(({ id }) => {
                      const meta = PRIVACY_META[id];
                      const Icon = meta.icon;
                      const active = privacy === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setPrivacy(id)}
                          className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left cursor-pointer transition-colors ${active ? 'bg-white/[0.08]' : 'hover:bg-white/[0.05]'}`}
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                              id === 'close_friends' ? 'bg-[#32d74b]/15 text-[#32d74b]' : 'bg-white/[0.08] text-white/85'
                            }`}
                          >
                            <Icon size={17} stroke={1.9} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[14px] font-medium leading-tight">{meta.label}</span>
                            <span className="block truncate text-[12px] leading-tight text-white/45">{meta.hint}</span>
                          </span>
                          {active && <IconCheck size={18} stroke={2.4} className="shrink-0 text-accent" />}
                        </button>
                      );
                    })}
                    {privacy === 'close_friends' && (
                      <button
                        type="button"
                        onClick={() => setEditFriends(true)}
                        className="flex w-full items-center gap-2 rounded-xl py-1.5 pl-[52px] pr-2.5 text-left text-[13px] font-medium text-[#32d74b] cursor-pointer hover:bg-white/[0.05]"
                      >
                        <span className="flex-1">{closeFriends === null ? 'Выбрать близких друзей' : `Список: ${closeFriends.length}`}</span>
                        <IconChevronRight size={15} />
                      </button>
                    )}

                    <div className="mx-2.5 my-1.5 h-px bg-white/10" />

                    <div className={`px-2.5 py-1.5 transition-opacity ${isPinned ? 'opacity-40' : ''}`}>
                      <p className="pb-1.5 text-[12px] font-medium text-white/45">Исчезнет через</p>
                      <div className="grid grid-cols-4 gap-1 rounded-xl bg-white/[0.06] p-1">
                        {STORY_DURATIONS.map((d) => (
                          <button
                            key={d.hours}
                            type="button"
                            disabled={isPinned}
                            onClick={() => setDurationHours(d.hours)}
                            className={`rounded-lg py-1.5 text-[13px] font-semibold tabular-nums cursor-pointer transition-colors disabled:cursor-default ${
                              durationHours === d.hours ? 'bg-white text-black' : 'text-white/70 hover:text-white'
                            }`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={isPinned}
                      onClick={() => setIsPinned((p) => !p)}
                      className="mt-1 flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left cursor-pointer hover:bg-white/[0.05]"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-white/85">
                        <IconPin size={17} stroke={1.9} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-medium leading-tight">Оставить в профиле</span>
                        <span className="block text-[12px] leading-tight text-white/45">Не исчезнет через {durationHours} ч</span>
                      </span>
                      <span className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${isPinned ? 'bg-accent' : 'bg-white/20'}`}>
                        <span className={`absolute top-[3px] h-4 w-4 rounded-full bg-white shadow transition-[left] ${isPinned ? 'left-[19px]' : 'left-[3px]'}`} />
                      </span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>{editFriends && <CloseFriendsSheet onClose={() => setEditFriends(false)} />}</AnimatePresence>

      {/* Discard confirmation */}
      <AnimatePresence>
        {confirmDiscard && (
          <motion.div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmDiscard(false)}
          >
            <motion.div
              className="w-full max-w-[300px] rounded-2xl bg-[#1c1c1f] p-5 text-center ring-1 ring-white/10"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.97 }}
              onClick={(e) => e.stopPropagation()}
              role="alertdialog"
              aria-label="Удалить черновик?"
            >
              <p className="text-[16px] font-semibold">Удалить черновик?</p>
              <p className="mt-1 text-[13.5px] text-white/55">Текст, рисунки и стикеры не сохранятся.</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setConfirmDiscard(false)} className="rounded-xl bg-white/10 py-2.5 text-[14px] font-semibold cursor-pointer hover:bg-white/15">
                  Продолжить
                </button>
                <button type="button" onClick={onClose} className="rounded-xl bg-danger py-2.5 text-[14px] font-semibold text-white cursor-pointer hover:brightness-110">
                  Удалить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>,
    document.body
  );
};

const ToolButton: React.FC<{ label: string; active?: boolean; onClick: () => void; children: React.ReactNode }> = ({ label, active, onClick, children }) => (
  <button
    type="button"
    aria-label={label}
    aria-pressed={active}
    title={label}
    onClick={onClick}
    className={`pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md cursor-pointer transition-all active:scale-90 ${
      active ? 'bg-white text-black' : 'bg-black/30 text-white hover:bg-black/45'
    }`}
  >
    {children}
  </button>
);

const Swatches: React.FC<{ colors: string[]; value: string; onChange: (c: string) => void }> = ({ colors, value, onChange }) => (
  <div className="flex items-center justify-between gap-1 px-0.5">
    {colors.map((c) => (
      <button
        key={c}
        type="button"
        aria-label={`Цвет ${c}`}
        onClick={() => onChange(c)}
        className={`h-7 w-7 shrink-0 rounded-full cursor-pointer transition-transform hover:scale-110 ring-2 ${value === c ? 'scale-110 ring-white' : 'ring-white/25'}`}
        style={{ background: c }}
      />
    ))}
  </div>
);

export default StoryCreateModal;
