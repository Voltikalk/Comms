import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  IconX,
  IconPhoto,
  IconTypography,
  IconCamera,
  IconUpload,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconBrush,
  IconSparkles,
  IconClock,
  IconLock,
  IconPin,
  IconEraser,
  IconMoodSmile,
  IconVideo,
  IconCircleDot
} from '@tabler/icons-react';
import { useStories } from '../../context/StoriesContext';
import {
  STORY_GRADIENTS,
  STORY_FONT_FAMILIES,
  STORY_DURATIONS,
  STORY_PRIVACY_OPTIONS,
  type StoryFontStyle,
  type StoryPrivacy,
  type StoryTextOverlay,
  type StoryStickerOverlay
} from '../../types/story.types';
import { SERVER_URL } from '../../constants';

interface StoryCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GRADIENT_KEYS = Object.keys(STORY_GRADIENTS);
const FONT_STYLES: { id: StoryFontStyle; label: string }[] = [
  { id: 'classic', label: 'Классика' },
  { id: 'neon', label: 'Неон' },
  { id: 'bold', label: 'Жирный' },
  { id: 'serif', label: 'Сериф' },
  { id: 'mono', label: 'Моно' },
  { id: 'script', label: 'Курсив' }
];

const TEXT_COLORS = ['#ffffff', '#ffd166', '#06d6a0', '#118ab2', '#ef476f', '#c77dff', '#000000'];
const BRUSH_COLORS = ['#ffffff', '#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#007aff', '#af52de', '#000000'];
const QUICK_EMOJIS = ['🔥', '❤️', '😍', '✨', '⚡', '🎉', '👏', '🕶️', '👑', '🚀', '💯', '🌸'];

export const StoryCreateModal: React.FC<StoryCreateModalProps> = ({ isOpen, onClose }) => {
  const { sendStory } = useStories();
  const me = (typeof window !== 'undefined' ? localStorage.getItem('chat_user_v2') : null) || '';
  const myProfileName = me.charAt(0).toUpperCase() + me.slice(1);

  const [tab, setTab] = useState<'text' | 'media' | 'camera'>('text');

  // Text Story States
  const [text, setText] = useState('');
  const [background, setBackground] = useState(GRADIENT_KEYS[0]);
  const [fontStyle, setFontStyle] = useState<StoryFontStyle>('classic');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textBgStyle, setTextBgStyle] = useState<'none' | 'fill' | 'glow'>('none');

  // Media Story States
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Settings: TTL, Privacy, Pin
  const [durationHours, setDurationHours] = useState<number>(24);
  const [privacy, setPrivacy] = useState<StoryPrivacy>('everyone');
  const [isPinned, setIsPinned] = useState(false);

  // Canvas Overlays & Doodle Tool
  const [isPosting, setIsPosting] = useState(false);
  const [isDoodleMode, setIsDoodleMode] = useState(false);
  const [brushColor, setBrushColor] = useState('#ffffff');
  const [brushWidth, setBrushWidth] = useState(4);
  const [textOverlays, setTextOverlays] = useState<StoryTextOverlay[]>([]);
  const [stickerOverlays, setStickerOverlays] = useState<StoryStickerOverlay[]>([]);
  const [showEmojiStickerPicker, setShowEmojiStickerPicker] = useState(false);

  // Live Camera Stream
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoRecordSeconds, setVideoRecordSeconds] = useState(0);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);

  // Drawing Canvas Ref
  const doodleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  const fileRef = useRef<HTMLInputElement | null>(null);

  // Stop camera helper
  const stopCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
    setIsRecordingVideo(false);
    clearInterval(recordTimerRef.current);
  }, []);

  // Reset form helper
  const resetForm = useCallback(() => {
    setText('');
    setMediaUrl(null);
    setCaption('');
    setTab('text');
    setTextOverlays([]);
    setStickerOverlays([]);
    setIsDoodleMode(false);
    setIsPinned(false);
    setDurationHours(24);
    setPrivacy('everyone');
    stopCamera();
  }, [stopCamera]);

  // Initialize camera stream
  const startCamera = useCallback(async () => {
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1080 }, height: { ideal: 1920 }, facingMode: 'user' },
        audio: true
      });
      mediaStreamRef.current = stream;
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err);
    }
  }, [stopCamera]);

  useEffect(() => {
    if (isOpen && tab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, tab, startCamera, stopCamera]);

  if (!isOpen) return null;

  // Capture Photo from Camera
  const snapPhoto = () => {
    if (!cameraVideoRef.current) return;
    const video = cameraVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 1280;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setMediaUrl(dataUrl);
      setMediaType('image');
      setTab('media');
      stopCamera();
    }
  };

  // Start Video Recording from Camera
  const startVideoRecord = () => {
    if (!mediaStreamRef.current) return;
    recordedChunksRef.current = [];
    try {
      const recorder = new MediaRecorder(mediaStreamRef.current, { mimeType: 'video/webm' });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const vidUrl = URL.createObjectURL(blob);
        setMediaUrl(vidUrl);
        setMediaType('video');
        setTab('media');
        stopCamera();
      };
      recorder.start(200);
      mediaRecorderRef.current = recorder;
      setIsRecordingVideo(true);
      setVideoRecordSeconds(0);

      recordTimerRef.current = setInterval(() => {
        setVideoRecordSeconds((s) => {
          if (s >= 59) {
            stopVideoRecord();
            return 60;
          }
          return s + 1;
        });
      }, 1000);
    } catch (e) {
      console.warn('Video recorder error:', e);
    }
  };

  const stopVideoRecord = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingVideo(false);
    clearInterval(recordTimerRef.current);
  };

  // Handle uploaded files
  const handleFile = async (file: File) => {
    const isImg = file.type.startsWith('image/');
    const isVid = file.type.startsWith('video/');
    if (!isImg && !isVid) return;

    setMediaType(isVid ? 'video' : 'image');
    setTab('media');
    setIsUploading(true);

    // Instant local blob preview
    const localUrl = URL.createObjectURL(file);
    setMediaUrl(localUrl);

    try {
      const form = new FormData();
      form.append('file', file, file.name);
      const res = await fetch(`${SERVER_URL}/api/upload`, { method: 'POST', body: form });
      const json = await res.json();
      if (json.url) {
        setMediaUrl(json.url);
      }
    } catch {
      // keep local preview
    } finally {
      setIsUploading(false);
    }
  };

  // Drawing Canvas Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = doodleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    isDrawingRef.current = true;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = doodleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearDoodle = () => {
    const canvas = doodleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const addEmojiOverlay = (emoji: string) => {
    const newSticker: StoryStickerOverlay = {
      id: 'stk-' + Date.now(),
      type: 'emoji',
      content: emoji,
      x: 35 + Math.random() * 30,
      y: 35 + Math.random() * 30,
      scale: 1.2
    };
    setStickerOverlays((prev) => [...prev, newSticker]);
    setShowEmojiStickerPicker(false);
  };

  const canPost = tab === 'text' ? text.trim().length > 0 : Boolean(mediaUrl);

  const handlePost = () => {
    if (!canPost || isPosting) return;
    setIsPosting(true);

    // Export drawing data if canvas used
    let drawingData: string | undefined = undefined;
    if (doodleCanvasRef.current) {
      drawingData = doodleCanvasRef.current.toDataURL('image/png');
    }

    const isCloseFriends = privacy === 'close_friends';

    if (tab === 'text') {
      sendStory({
        type: 'text',
        data: text.trim(),
        background,
        fontStyle,
        textColor,
        textBgStyle,
        authorName: myProfileName,
        durationHours,
        privacy,
        isPinned,
        isCloseFriends,
        textOverlays: textOverlays.length > 0 ? textOverlays : undefined,
        stickerOverlays: stickerOverlays.length > 0 ? stickerOverlays : undefined,
        drawingData
      });
    } else if (mediaUrl) {
      sendStory({
        type: mediaType,
        data: mediaUrl,
        caption: caption.trim() || undefined,
        authorName: myProfileName,
        durationHours,
        privacy,
        isPinned,
        isCloseFriends,
        textOverlays: textOverlays.length > 0 ? textOverlays : undefined,
        stickerOverlays: stickerOverlays.length > 0 ? stickerOverlays : undefined,
        drawingData
      });
    }

    setIsPosting(false);
    resetForm();
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[85] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 select-none animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-[#17212b] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-pop-in flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#3390ec] via-[#ac8bdd] to-[#e6604c] flex items-center justify-center text-white">
              <IconSparkles size={16} />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Студия историй Telegram</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Top 3-Way Mode Switcher */}
        <div className="px-5 pb-2 flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setTab('text')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
              tab === 'text'
                ? 'bg-[#3390ec] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            <IconTypography size={15} />
            Текст
          </button>

          <button
            type="button"
            onClick={() => setTab('media')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
              tab === 'media'
                ? 'bg-[#3390ec] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            <IconPhoto size={15} />
            Медиа
          </button>

          <button
            type="button"
            onClick={() => setTab('camera')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
              tab === 'camera'
                ? 'bg-[#3390ec] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            <IconCamera size={15} />
            Камера
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="px-5 py-2 overflow-y-auto tg-scrollbar flex-1 flex flex-col gap-3">
          {/* Main Story Interactive Preview Box (9:14 Aspect Ratio) */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className={`relative w-full aspect-[9/13] max-h-[310px] mx-auto rounded-2xl overflow-hidden flex items-center justify-center shadow-inner transition-all border border-black/10 dark:border-white/10 ${
              isDragging ? 'ring-4 ring-[#3390ec]' : ''
            }`}
            style={tab === 'text' ? { background: STORY_GRADIENTS[background] } : { background: '#0a0f1d' }}
          >
            {tab === 'text' ? (
              <p
                style={{
                  textAlign,
                  fontFamily: STORY_FONT_FAMILIES[fontStyle],
                  color: textColor
                }}
                className={`px-6 text-xl font-bold leading-snug drop-shadow-xl whitespace-pre-wrap break-words max-w-full ${
                  textBgStyle === 'fill'
                    ? 'p-3 bg-black/50 rounded-2xl backdrop-blur-xs'
                    : textBgStyle === 'glow'
                    ? 'drop-shadow-[0_0_12px_rgba(255,255,255,0.8)]'
                    : ''
                }`}
              >
                {text || 'Напишите что-нибудь...'}
              </p>
            ) : tab === 'camera' ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <video
                  ref={cameraVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover -scale-x-100"
                />
                {/* Live Camera Actions Overlay */}
                <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-4 z-30">
                  {/* Photo snap button */}
                  <button
                    type="button"
                    onClick={snapPhoto}
                    disabled={!isCameraActive || isRecordingVideo}
                    className="w-12 h-12 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                    title="Сделать фото"
                  >
                    <IconCamera size={22} />
                  </button>

                  {/* Video record button */}
                  <button
                    type="button"
                    onClick={isRecordingVideo ? stopVideoRecord : startVideoRecord}
                    disabled={!isCameraActive}
                    className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all ${
                      isRecordingVideo
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-rose-500 hover:bg-rose-600 text-white hover:scale-105 active:scale-95 cursor-pointer'
                    }`}
                    title={isRecordingVideo ? 'Остановить запись' : 'Записать видео'}
                  >
                    {isRecordingVideo ? <IconCircleDot size={22} /> : <IconVideo size={22} />}
                  </button>
                </div>

                {isRecordingVideo && (
                  <div className="absolute top-3 px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-bold animate-pulse shadow-md">
                    REC 0:{videoRecordSeconds < 10 ? `0${videoRecordSeconds}` : videoRecordSeconds} / 1:00
                  </div>
                )}
              </div>
            ) : mediaUrl ? (
              mediaType === 'video' ? (
                <video src={mediaUrl} autoPlay loop muted playsInline className="w-full h-full object-contain" />
              ) : (
                <img src={mediaUrl} alt="Превью" className="w-full h-full object-cover" />
              )
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center gap-2 text-white/80 hover:text-white cursor-pointer p-4 text-center group"
              >
                <div className="w-12 h-12 rounded-full bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition-colors">
                  <IconUpload size={22} />
                </div>
                <div>
                  <span className="text-xs font-semibold block">
                    {isUploading ? 'Загрузка медиа...' : 'Нажмите или перетащите фото/видео'}
                  </span>
                  <span className="text-[10px] text-white/60 block mt-0.5">JPG, PNG, WebP, MP4, MOV</span>
                </div>
              </button>
            )}

            {/* Sticker Overlays Rendering */}
            {stickerOverlays.map((stk) => (
              <div
                key={stk.id}
                style={{
                  left: `${stk.x}%`,
                  top: `${stk.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                className="absolute z-20 text-3xl select-none drop-shadow-lg"
              >
                {stk.content}
              </div>
            ))}

            {/* Interactive Drawing Doodle Canvas */}
            <canvas
              ref={doodleCanvasRef}
              width={360}
              height={520}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className={`absolute inset-0 w-full h-full z-20 ${
                isDoodleMode ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'
              }`}
            />

            {/* In-Preview Caption Preview */}
            {tab === 'media' && caption.trim() && (
              <div className="absolute bottom-2 left-2 right-2 p-2 rounded-xl bg-black/65 backdrop-blur-xs text-white text-xs leading-snug text-center truncate z-30">
                {caption}
              </div>
            )}
          </div>

          <input
            type="file"
            ref={fileRef}
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />

          {/* Canvas Tools Toolbar: Doodle, Emoji Stickers, Clear */}
          <div className="flex items-center justify-between px-1 py-1 rounded-xl bg-slate-100 dark:bg-white/5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsDoodleMode((d) => !d)}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                  isDoodleMode
                    ? 'bg-[#3390ec] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                <IconBrush size={14} />
                Кисть
              </button>

              <button
                type="button"
                onClick={() => setShowEmojiStickerPicker((p) => !p)}
                className="p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer"
              >
                <IconMoodSmile size={14} />
                Стикер
              </button>
            </div>

            {isDoodleMode && (
              <button
                type="button"
                onClick={clearDoodle}
                className="p-1.5 rounded-lg text-xs text-rose-500 hover:bg-rose-500/10 flex items-center gap-1 cursor-pointer"
              >
                <IconEraser size={14} />
                Очистить
              </button>
            )}
          </div>

          {/* Doodle Palette when Doodle Mode active */}
          {isDoodleMode && (
            <div className="flex items-center gap-1.5 overflow-x-auto tg-scrollbar py-1">
              {BRUSH_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setBrushColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full shrink-0 border border-white/20 transition-transform ${
                    brushColor === c ? 'scale-125 ring-2 ring-[#3390ec]' : 'hover:scale-110'
                  }`}
                />
              ))}
              <input
                type="range"
                min="2"
                max="16"
                value={brushWidth}
                onChange={(e) => setBrushWidth(Number(e.target.value))}
                className="w-20 accent-[#3390ec] ml-2"
                title="Толщина кисти"
              />
            </div>
          )}

          {/* Quick Emoji Sticker Drawer */}
          {showEmojiStickerPicker && (
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-wrap gap-2 animate-pop-in">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => addEmojiOverlay(emoji)}
                  className="text-2xl p-1 hover:scale-125 active:scale-95 transition-transform cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Text Story Customizer Controls */}
          {tab === 'text' && (
            <div className="flex flex-col gap-2.5">
              {/* Font Style Tabs */}
              <div className="flex gap-1 overflow-x-auto tg-scrollbar py-0.5">
                {FONT_STYLES.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFontStyle(f.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-colors ${
                      fontStyle === f.id
                        ? 'bg-[#3390ec] text-white'
                        : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Text Alignment & Background Fill Style */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setTextAlign('left')}
                    className={`p-1 rounded ${textAlign === 'left' ? 'bg-white dark:bg-white/20 text-[#3390ec]' : 'text-slate-400'}`}
                  >
                    <IconAlignLeft size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextAlign('center')}
                    className={`p-1 rounded ${textAlign === 'center' ? 'bg-white dark:bg-white/20 text-[#3390ec]' : 'text-slate-400'}`}
                  >
                    <IconAlignCenter size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextAlign('right')}
                    className={`p-1 rounded ${textAlign === 'right' ? 'bg-white dark:bg-white/20 text-[#3390ec]' : 'text-slate-400'}`}
                  >
                    <IconAlignRight size={14} />
                  </button>
                </div>

                {/* Text Background Mode: Normal, Fill, Glow */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-0.5 rounded-lg text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setTextBgStyle('none')}
                    className={`px-1.5 py-0.5 rounded ${textBgStyle === 'none' ? 'bg-white dark:bg-white/20 text-[#3390ec]' : 'text-slate-400'}`}
                  >
                    A
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextBgStyle('fill')}
                    className={`px-1.5 py-0.5 rounded ${textBgStyle === 'fill' ? 'bg-white dark:bg-white/20 text-[#3390ec]' : 'text-slate-400'}`}
                  >
                    [A]
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextBgStyle('glow')}
                    className={`px-1.5 py-0.5 rounded ${textBgStyle === 'glow' ? 'bg-white dark:bg-white/20 text-[#3390ec]' : 'text-slate-400'}`}
                  >
                    ✨A
                  </button>
                </div>

                {/* Text Color Swatches */}
                <div className="flex items-center gap-1.5">
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setTextColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-5 h-5 rounded-full border border-black/10 transition-transform ${
                        textColor === c ? 'scale-125 ring-2 ring-[#3390ec]' : 'hover:scale-110'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Background Gradient Palette */}
              <div className="flex gap-1.5 overflow-x-auto tg-scrollbar py-1">
                {GRADIENT_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setBackground(key)}
                    className={`w-7 h-7 rounded-full shrink-0 cursor-pointer transition-transform hover:scale-110 ${
                      background === key ? 'ring-2 ring-offset-2 ring-[#3390ec] dark:ring-offset-[#17212b]' : ''
                    }`}
                    style={{ background: STORY_GRADIENTS[key] }}
                    title={key}
                  />
                ))}
              </div>

              {/* Main Textarea */}
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Текст вашей истории..."
                maxLength={512}
                rows={2}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-transparent focus:border-[#3390ec] outline-none text-[14px] text-slate-900 dark:text-white placeholder-slate-400 resize-none transition-colors"
              />
            </div>
          )}

          {/* Media Story Caption Input */}
          {tab === 'media' && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Подпись к истории
                </label>
                <span className="text-[10px] text-slate-400">{caption.length}/200</span>
              </div>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Добавьте подпись, @упоминание или #тег..."
                maxLength={200}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-transparent focus:border-[#3390ec] outline-none text-[13.5px] text-slate-900 dark:text-white placeholder-slate-400 transition-colors"
              />
            </div>
          )}

          {/* Telegram Stories 2.0 Options: Duration, Privacy & Pin */}
          <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-2.5">
            {/* Duration Selector (6, 12, 24, 48 hours) */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <IconClock size={15} className="text-[#3390ec]" />
                <span>Срок жизни</span>
              </div>
              <div className="flex gap-1">
                {STORY_DURATIONS.map((d) => (
                  <button
                    key={d.hours}
                    type="button"
                    onClick={() => setDurationHours(d.hours)}
                    className={`px-2 py-0.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      durationHours === d.hours
                        ? 'bg-[#3390ec] text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Privacy Selector (Everyone, Contacts, Close Friends) */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <IconLock size={15} className="text-[#3390ec]" />
                <span>Кто видит</span>
              </div>
              <div className="flex gap-1">
                {STORY_PRIVACY_OPTIONS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPrivacy(p.id)}
                    className={`px-2 py-0.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                      privacy === p.id
                        ? p.id === 'close_friends'
                          ? 'bg-[#00c853] text-white shadow-xs'
                          : 'bg-[#3390ec] text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                    title={p.desc}
                  >
                    <span>{p.icon}</span>
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pin to profile toggle */}
            <label className="flex items-center justify-between cursor-pointer py-0.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <IconPin size={15} className="text-amber-500" />
                <span>Сохранить в профиле (Актуальное)</span>
              </div>
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="w-4 h-4 accent-[#3390ec] rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Submit Footer */}
        <div className="px-5 pb-4 pt-2 shrink-0 border-t border-slate-100 dark:border-white/5">
          <button
            type="button"
            onClick={handlePost}
            disabled={!canPost || isUploading || isPosting}
            className={`w-full py-3 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all shadow-md ${
              canPost && !isUploading && !isPosting
                ? 'tg-btn-primary text-white cursor-pointer active:scale-[0.98]'
                : 'bg-slate-200 dark:bg-white/10 text-slate-400 cursor-not-allowed'
            }`}
          >
            <IconSparkles size={18} />
            {isUploading ? 'Загрузка медиа...' : isPosting ? 'Публикация...' : 'Опубликовать историю'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default StoryCreateModal;
