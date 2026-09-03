import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSocket } from '../context/SocketContext';
import { USER_NAMES, DEFAULT_USER_PROFILES } from '../constants';
import { parseAndRenderRichText } from '../lib/markdown-parser';
import { normalizeWaveform, generateFallbackWaveform } from '../lib/audio-waveform';
import type { Message, UserId } from '../types';
import { 
  IconDownload, 
  IconPlayerPlayFilled, 
  IconPlayerPauseFilled, 
  IconFileText, 
  IconX,
  IconCheck,
  IconChecks,
  IconTrash,
  IconShare3,
  IconPhoto,
  IconVideo,
  IconMicrophone,
  IconMoodSmile,
  IconCamera,
  IconChartBar
} from '@tabler/icons-react';
import { VideoPlayer } from './VideoPlayer';
import { PollCard } from './Poll/PollCard';
import { triggerTelegramDisintegrate } from './effects/disintegrate';
import { TgsStickerPlayer } from './Stickers/TgsStickerPlayer';
import { findStickerByTitleOrId } from '../constants/stickers';
import { TelegramVideoNotePlayer } from './Media/TelegramVideoNotePlayer';

// Telegram author color palette
const PEER_COLORS: Record<string, string> = {
  vlad: '#3390ec',
  anya: '#e91e63',
  mom: '#f39c12',
  dad: '#2980b9',
  sister: '#27ae60',
};

const getAuthorColor = (userId?: string): string => {
  if (!userId) return '#3390ec';
  if (PEER_COLORS[userId]) return PEER_COLORS[userId];
  const palette = ['#3390ec', '#2ecc71', '#f39c12', '#9b59b6', '#e74c3c', '#1abc9c', '#e91e63', '#3498db'];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
};

const CircularProgress: React.FC<{ progress: number }> = ({ progress }) => {
  const radius = 20;
  const stroke = 3;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(progress, 100) / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center select-none bg-black/60 backdrop-blur-xs rounded-full p-2.5 shadow-lg">
      <svg
        height={radius * 2}
        width={radius * 2}
        className="transform -rotate-90"
      >
        <circle
          stroke="rgba(255, 255, 255, 0.25)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="#3390ec"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.2s ease' }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="text-[#3390ec]"
        />
      </svg>
      <span className="absolute text-[9px] font-bold font-mono text-white">
        {Math.min(progress, 100)}%
      </span>
    </div>
  );
};

import { HoverAnimatedEmoji } from './TelegramEmojiPickerModal';

interface MessageBubbleProps {
  message: Message;
  isSelf: boolean;
  senderName: string;
  showSenderLabel: boolean;
  onReply: (message: Message) => void;
  onOpenContextMenu: (message: Message, pos: { x: number; y: number }) => void;
  parentMessage?: Message | null;
  currentUser: UserId | null;
  deleteMessage: (messageId: string) => void;
  editMessage: (messageId: string, newText: string) => void;
  toggleReaction: (messageId: string, reaction: string) => void;
  roomParticipantCount: number;
  searchQuery?: string;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (messageId: string) => void;
  onJumpToMessage?: (messageId: string) => void;
  onHashtagClick?: (tag: string) => void;
  onOpenGallery?: (messageId: string) => void;
  onVotePoll?: (messageId: string, roomId: string, optionIds: string[]) => void;
  onClosePoll?: (messageId: string, roomId: string) => void;
  groupedAbove?: boolean;
  groupedBelow?: boolean;
}

export const MessageBubble = React.memo<MessageBubbleProps>(({ 
  message, 
  isSelf, 
  senderName,
  showSenderLabel,
  onReply,
  onOpenContextMenu,
  parentMessage,
  currentUser,
  deleteMessage,
  editMessage,
  toggleReaction,
  roomParticipantCount: _roomParticipantCount,
  searchQuery,
  isSelectMode = false,
  isSelected = false,
  onToggleSelect,
  onJumpToMessage,
  onHashtagClick,
  onOpenGallery,
  onVotePoll,
  onClosePoll,
  groupedAbove = false,
  groupedBelow = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [isMediaLoading, setIsMediaLoading] = useState(true);

  // Regular Video states (auto-detecting orientation & ratio)
  const initialOrientation = message.file?.orientation || (
    message.file?.width && message.file?.height 
      ? (message.file.width / message.file.height < 0.85 ? 'vertical' : message.file.width / message.file.height > 1.15 ? 'horizontal' : 'square')
      : 'horizontal'
  );
  const initialRatio = message.file?.width && message.file?.height ? message.file.width / message.file.height : null;
  const [videoOrientation, setVideoOrientation] = useState<'vertical' | 'horizontal' | 'square'>(initialOrientation);
  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(initialRatio);

  // Swipe-to-reply states
  const [swipeOffset, setSwipeOffset] = useState(0);
  const swipeStartXRef = useRef<number | null>(null);
  const swipeStartYRef = useRef<number | null>(null);
  const isSwipeLockedRef = useRef(false);
  const isScrollLockedRef = useRef(false);
  const hasTriggeredSwipeRef = useRef(false);

  // Long-press states
  const touchTimerRef = useRef<any>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const { playingAudioId, setPlayingAudioId, getUserDisplayName } = useSocket();

  // Dedicated Forwarded Sender extraction & display text cleaning
  const forwardedSenderName = useMemo(() => {
    // 1. Check explicit forwardedFrom object
    if (message.forwardedFrom) {
      if (message.forwardedFrom.senderName && message.forwardedFrom.senderName !== message.forwardedFrom.sender) {
        return message.forwardedFrom.senderName;
      }
      if (message.forwardedFrom.sender) {
        const s = message.forwardedFrom.sender;
        const resolved = getUserDisplayName(s);
        if (resolved && resolved !== s) return resolved;
        if (USER_NAMES[s]) return USER_NAMES[s];
        if (DEFAULT_USER_PROFILES[s]?.firstName) return DEFAULT_USER_PROFILES[s].firstName;
        return message.forwardedFrom.senderName || s;
      }
      if (message.forwardedFrom.senderName) {
        return message.forwardedFrom.senderName;
      }
    }

    // 2. Check embedded zero-width metadata tag
    if (message.text) {
      const zeroWidthMatch = message.text.match(/^\u200B\u200B\[fwd:([^\]]+)\]\u200B\u200B/);
      if (zeroWidthMatch) {
        try {
          const parsed = JSON.parse(zeroWidthMatch[1]);
          if (parsed.n) return parsed.n;
          if (parsed.s) {
            const resolved = getUserDisplayName(parsed.s);
            if (resolved && resolved !== parsed.s) return resolved;
            return USER_NAMES[parsed.s] || DEFAULT_USER_PROFILES[parsed.s]?.firstName || parsed.s;
          }
        } catch {
          // ignore
        }
      }

      // 3. Check legacy textual prefix
      const match = message.text.match(/^\[Переслано от ([^\]]+)\]:\s*/);
      if (match) {
        return match[1];
      }
    }

    return null;
  }, [message.forwardedFrom, message.text, getUserDisplayName]);

  const displayMessageText = useMemo(() => {
    if (!message.text) return '';
    // Strip zero-width metadata & legacy prefix so the indicator is strictly a separate element
    return message.text
      .replace(/^\u200B\u200B\[fwd:[^\]]+\]\u200B\u200B/, '')
      .replace(/^\[Переслано от [^\]]+\]:\s*/, '');
  }, [message.text]);

  const isAudioPlaying = playingAudioId === message.id;

  // Audio Playback states
  const [playSpeed, setPlaySpeed] = useState<1 | 1.5 | 2>(1);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      if (isAudioPlaying) {
        audioRef.current.play().catch(() => {
          setPlayingAudioId(null);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isAudioPlaying, setPlayingAudioId]);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isAudioPlaying) {
      setPlayingAudioId(null);
    } else {
      setPlayingAudioId(message.id);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const dur = audioRef.current.duration || 0;
    setAudioCurrentTime(current);
    setAudioProgress(dur > 0 && dur !== Infinity ? (current / dur) * 100 : 0);
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      if (audio.duration === Infinity) {
        audio.currentTime = 1e101;
        const onSeeked = () => {
          audio.removeEventListener('seeked', onSeeked);
          audio.currentTime = 0;
          setAudioDuration(audio.duration || 0);
        };
        audio.addEventListener('seeked', onSeeked);
        setTimeout(() => {
          if (audio && audio.currentTime === 1e101) {
            audio.currentTime = 0;
          }
        }, 400);
      } else {
        setAudioDuration(audio.duration || 0);
      }
    } catch {
      // ignore
    }
  };

  const hasFile = !!message.file;

  const matchedSticker = useMemo(() => {
    if (message.sticker) return message.sticker;
    if (!message.file) return null;
    if (message.file.stickerData) return message.file.stickerData;
    if (message.file.type === 'sticker') {
      const found = findStickerByTitleOrId(message.file.name);
      return found || {
        id: message.file.name,
        packId: 'custom',
        packTitle: 'Стикер',
        emoji: '✨',
        title: message.file.name,
        url: message.file.data
      };
    }
    const fName = (message.file.name || '').toLowerCase();
    const fData = (message.file.data || '').toLowerCase();
    if (
      fName.startsWith('sticker_') || 
      fName.endsWith('.tgs') || 
      fData.endsWith('.tgs') || 
      fData.includes('/stickers/') || 
      message.file.data?.startsWith('data:image/svg+xml')
    ) {
      const found = findStickerByTitleOrId(message.file.name);
      return found || {
        id: message.file.name,
        packId: 'custom',
        packTitle: 'Стикер',
        emoji: '✨',
        title: message.file.name,
        url: message.file.data
      };
    }
    const matchByTitle = findStickerByTitleOrId(message.file.name);
    if (matchByTitle) {
      return matchByTitle;
    }
    return null;
  }, [message.file, message.sticker]);

  const isSticker = !!matchedSticker || (hasFile && message.file?.type === 'sticker');

  const isAudioFile = hasFile && !isSticker && (
    message.file?.type === 'audio' ||
    (message.file?.name && (
      message.file.name.toLowerCase().startsWith('голосовое сообщение') ||
      /\.(mp3|wav|ogg|m4a|aac|opus)$/i.test(message.file.name)
    ))
  );
  const isVideoNote = hasFile && !isSticker && !isAudioFile && (
    message.file?.type === 'video_note' ||
    (message.file?.type === 'video' && message.file.name.includes('кружок'))
  );
  const isRegularVideo = hasFile && !isSticker && !isAudioFile && !isVideoNote && (
    message.file?.type === 'video' ||
    (message.file?.name && /\.(mp4|mov|mkv|avi|m4v|webm)$/i.test(message.file.name))
  );
  const isImageFile = hasFile && !isSticker && !isAudioFile && !isVideoNote && !isRegularVideo && (
    message.file?.type === 'image' ||
    (message.file?.name && /\.(jpg|jpeg|png|gif|webp|svg|heic)$/i.test(message.file.name))
  );
  const isDocumentFile = hasFile && !isSticker && !isAudioFile && !isVideoNote && !isRegularVideo && !isImageFile;

  const changeSpeed = () => {
    if (!audioRef.current) return;
    const nextSpeedMap: Record<1 | 1.5 | 2, 1 | 1.5 | 2> = { 1: 1.5, 1.5: 2, 2: 1 };
    const next = nextSpeedMap[playSpeed];
    audioRef.current.playbackRate = next;
    setPlaySpeed(next);
  };

  const formatAudioTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds === Infinity) return '0:00';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const rawCleanText = displayMessageText.trim();
  const isAutoFileNameCaption = hasFile && message.file?.name && (
    rawCleanText === message.file.name ||
    rawCleanText === `📎 ${message.file.name}` ||
    rawCleanText === `📎  ${message.file.name}` ||
    rawCleanText === '📎'
  );
  const hasText = !!rawCleanText && !isAutoFileNameCaption && !isSticker;

  const isPureImage = hasFile && isImageFile && !hasText && !parentMessage;
  const isPureAudio = hasFile && isAudioFile && !hasText;
  const hasReactions = message.reactions && Object.keys(message.reactions).length > 0;
  const isPending = !!message.pending;

  const readersCount = (message.readBy || []).filter((u) => u !== currentUser).length;
  const deliveryStatus: 'pending' | 'sent' | 'read' = isPending
    ? 'pending'
    : readersCount > 0
      ? 'read'
      : 'sent';

  // Video notes and stickers have NO rectangular bubble background
  const bubbleClass = (isVideoNote || isSticker) 
    ? 'bg-transparent shadow-none border-none' 
    : isSelf 
      ? 'tg-bubble-self' 
      : 'tg-bubble-peer';

  // Telegram-style grouped corner flattening
  const groupCornerStyle: React.CSSProperties = (isVideoNote || isSticker) ? {} : {
    borderTopRightRadius: isSelf && groupedAbove ? 6 : undefined,
    borderBottomRightRadius: isSelf && groupedBelow ? 6 : undefined,
    borderTopLeftRadius: !isSelf && groupedAbove ? 6 : undefined,
    borderBottomLeftRadius: !isSelf && groupedBelow ? 6 : undefined
  };

  // Real audio waveform or deterministic speech fallback
  const waveform = useMemo(() => {
    if (message.file?.waveform && Array.isArray(message.file.waveform) && message.file.waveform.length > 0) {
      return normalizeWaveform(message.file.waveform, 30, 8, 100);
    }
    return generateFallbackWaveform(message.id, 30, 8, 100);
  }, [message.file?.waveform, message.id]);

  // Gesture Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    
    swipeStartXRef.current = touch.clientX;
    swipeStartYRef.current = touch.clientY;
    isSwipeLockedRef.current = false;
    isScrollLockedRef.current = false;
    hasTriggeredSwipeRef.current = false;

    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => {
      if (touchStartPosRef.current && !isSwipeLockedRef.current) {
        try {
          if (navigator.vibrate) navigator.vibrate(40);
        } catch {}
        onOpenContextMenu(message, touchStartPosRef.current);
      }
    }, 360);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];

    if (touchStartPosRef.current) {
      const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
      const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
      if (dx > 16 || dy > 16) {
        if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
      }
    }

    if (swipeStartXRef.current !== null && swipeStartYRef.current !== null) {
      if (isScrollLockedRef.current) return;

      const diffX = swipeStartXRef.current - touch.clientX;
      const diffY = Math.abs(touch.clientY - swipeStartYRef.current);

      if (!isSwipeLockedRef.current) {
        if (diffY > 10 && diffY > Math.abs(diffX)) {
          isScrollLockedRef.current = true;
          return;
        }
        if (diffX > 18) {
          isSwipeLockedRef.current = true;
          if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
        }
      }

      if (isSwipeLockedRef.current && diffX > 0) {
        if (e.cancelable) {
          e.preventDefault();
        }
        const offset = Math.min(diffX, 80);
        setSwipeOffset(offset);

        if (offset >= 60 && !hasTriggeredSwipeRef.current) {
          hasTriggeredSwipeRef.current = true;
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);

    if (swipeOffset >= 60) {
      onReply(message);
    }

    setSwipeOffset(0);
    swipeStartXRef.current = null;
    swipeStartYRef.current = null;
    isSwipeLockedRef.current = false;
    hasTriggeredSwipeRef.current = false;
  };

  // Prevent rendering empty ghost messages
  if (!hasText && !hasFile && !isSticker && !isVideoNote && !message.poll && !parentMessage && !forwardedSenderName) {
    return null;
  }

  return (
    <div 
      id={`msg-${message.id}`} 
      onClick={() => {
        if (isSelectMode && onToggleSelect) {
          onToggleSelect(message.id);
        }
      }}
      className={`w-full py-1 px-1.5 sm:px-2 relative group animate-message-appear transition-colors duration-150 rounded-xl ${
        isSelectMode ? 'cursor-pointer' : ''
      } ${
        isSelected 
          ? 'tg-message-row-selected' 
          : isSelectMode 
            ? 'hover:bg-black/5 dark:hover:bg-white/5' 
            : ''
      }`}
    >
      {/* Message Row */}
      <div 
        className={`flex items-end gap-2 w-full min-w-0 max-w-full ${isSelf ? 'justify-end' : 'justify-start'}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(-${swipeOffset}px)`,
          transition: swipeOffset === 0 ? 'transform 0.2s ease' : 'none'
        }}
      >
        {/* Telegram Selection Circle Checkbox */}
        {isSelectMode && (
          <button
            type="button"
            role="checkbox"
            aria-pressed={isSelected}
            aria-label="Выбрать сообщение"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.(message.id);
            }}
            className="mr-2.5 mb-1.5 shrink-0 cursor-pointer flex items-center justify-center select-none animate-pop-in focus:outline-none"
            title="Выбрать"
          >
            {isSelected ? (
              <div className="w-5.5 h-5.5 rounded-full bg-[#3390ec] flex items-center justify-center text-white shadow-xs animate-check-bounce">
                <IconCheck size={14} stroke={3} />
              </div>
            ) : (
              <div className="w-5.5 h-5.5 rounded-full border-2 border-slate-400 dark:border-white/40 bg-white/20 dark:bg-black/20 hover:border-slate-600 dark:hover:border-white/80 transition-colors" />
            )}
          </button>
        )}

        {/* Peer Avatar in Groups */}
        {!isSelf && (
          showSenderLabel ? (
            <div 
              className="w-8 h-8 rounded-full bg-[#3390ec] text-white flex items-center justify-center text-xs font-bold shrink-0 mr-1.5 mb-0.5 shadow-xs select-none"
              title={senderName}
            >
              {senderName.charAt(0).toUpperCase()}
            </div>
          ) : (
            <div className="w-8 shrink-0 mr-1.5" />
          )
        )}

        <div className="flex flex-col min-w-0 max-w-[85%] sm:max-w-[75%] relative">
          
          {/* Main Bubble / Video Note Container */}
          <div 
            data-bubble="true"
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenContextMenu(message, { x: e.clientX, y: e.clientY });
            }} 
            className={`${bubbleClass} relative select-none transition-shadow duration-300`}
            style={groupCornerStyle}
          >
            {/* Separate Forwarded Badge (Telegram Style) */}
            {forwardedSenderName && !isVideoNote && !isSticker && (
              <div className="px-3 pt-1.5 pb-0.5 text-[11.5px] font-medium text-[#3390ec] dark:text-[#70b1ff] flex items-center gap-1.5 cursor-default select-none border-b border-black/5 dark:border-white/5 mb-0.5">
                <IconShare3 size={13} className="shrink-0 scale-x-[-1] text-[#3390ec] dark:text-[#70b1ff]" />
                <span className="opacity-95">
                  Переслано от <strong className="font-semibold">{forwardedSenderName}</strong>
                </span>
              </div>
            )}

            {/* Sender Label in Groups */}
            {!isSelf && showSenderLabel && !isVideoNote && !isSticker && !forwardedSenderName && (
              <div className="px-3 pt-1 text-[12px] font-bold text-[#3390ec]">
                {senderName}
              </div>
            )}

            {/* Quote Preview with Author Color, Tabler Icons, Live Media Thumbnail & Flash Highlight Jump */}
            {parentMessage && !isVideoNote && !isSticker && (() => {
              const authorColor = getAuthorColor(parentMessage.sender);
              const authorName = parentMessage.sender === currentUser 
                ? 'Вы' 
                : (USER_NAMES[parentMessage.sender] || parentMessage.sender);

              const cleanText = (parentMessage.text || '')
                .replace(/^[\u200B\s]*\[fwd:[^\]]+\][\u200B\s]*/g, '')
                .replace(/^\[Переслано от [^\]]+\]:\s*/, '')
                .trim();

              const hasImageThumbnail = parentMessage.file?.type === 'image' && parentMessage.file.data;
              const hasVideoThumbnail = parentMessage.file?.type === 'video' && parentMessage.file.data;
              const hasStickerThumbnail = (parentMessage.file?.type === 'sticker' && parentMessage.file.data) || parentMessage.sticker?.url;

              return (
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onJumpToMessage) {
                      onJumpToMessage(parentMessage.id);
                    } else {
                      const element = document.getElementById(`msg-${parentMessage.id}`);
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        element.classList.add('tg-message-row-highlight');
                        setTimeout(() => element.classList.remove('tg-message-row-highlight'), 2600);
                      }
                    }
                  }}
                  className={`mx-2.5 mt-1.5 mb-1 px-2.5 py-1 rounded-lg border-l-[3px] text-xs cursor-pointer flex items-center justify-between gap-2 transition-all duration-150 active:scale-[0.99] select-none ${
                    isSelf 
                      ? 'bg-black/10 hover:bg-black/15 dark:bg-white/10 dark:hover:bg-white/15' 
                      : 'bg-black/5 hover:bg-black/8 dark:bg-white/5 dark:hover:bg-white/10'
                  }`}
                  style={{
                    borderLeftColor: isSelf ? 'currentColor' : authorColor
                  }}
                  title="Перейти к сообщению"
                >
                  <div className="min-w-0 flex-1 py-0.5">
                    <span 
                      className="font-semibold block text-[11px] leading-tight truncate"
                      style={{
                        color: isSelf ? 'inherit' : authorColor
                      }}
                    >
                      {authorName}
                    </span>
                    <div className="text-[11px] leading-snug opacity-85 truncate mt-0.5 flex items-center gap-1">
                      {cleanText ? (
                        <span className="truncate">{cleanText}</span>
                      ) : parentMessage.poll ? (
                        <span className="truncate flex items-center gap-1">
                          <IconChartBar size={13} className="shrink-0" />
                          <span>Опрос: {parentMessage.poll.question}</span>
                        </span>
                      ) : parentMessage.file ? (
                        parentMessage.file.type === 'sticker' || (parentMessage.file.name && parentMessage.file.name.includes('sticker')) ? (
                          <span className="flex items-center gap-1">
                            <IconMoodSmile size={13} className="shrink-0 text-amber-500" />
                            <span>Стикер</span>
                          </span>
                        ) : parentMessage.file.type === 'image' ? (
                          <span className="flex items-center gap-1">
                            <IconPhoto size={13} className="shrink-0 text-[#3390ec]" />
                            <span>Фотография</span>
                          </span>
                        ) : parentMessage.file.type === 'video_note' ? (
                          <span className="flex items-center gap-1">
                            <IconCamera size={13} className="shrink-0 text-[#3390ec]" />
                            <span>Видеосообщение</span>
                          </span>
                        ) : parentMessage.file.type === 'video' ? (
                          <span className="flex items-center gap-1">
                            <IconVideo size={13} className="shrink-0 text-[#3390ec]" />
                            <span>Видео</span>
                          </span>
                        ) : parentMessage.file.type === 'audio' ? (
                          <span className="flex items-center gap-1">
                            <IconMicrophone size={13} className="shrink-0 text-emerald-500" />
                            <span>Голосовое сообщение</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 truncate">
                            <IconFileText size={13} className="shrink-0 text-[#3390ec]" />
                            <span className="truncate">{parentMessage.file.name || 'Вложение'}</span>
                          </span>
                        )
                      ) : parentMessage.sticker ? (
                        <span className="flex items-center gap-1">
                          <IconMoodSmile size={13} className="shrink-0 text-amber-500" />
                          <span>Стикер</span>
                        </span>
                      ) : (
                        <span>Сообщение</span>
                      )}
                    </div>
                  </div>

                  {/* Live Media Thumbnail (Photo / Video / Sticker) */}
                  {hasImageThumbnail ? (
                    <div className="w-8.5 h-8.5 rounded-md overflow-hidden bg-black/15 shrink-0 border border-black/10 dark:border-white/10 ml-1 shadow-2xs">
                      <img src={parentMessage.file!.data} className="w-full h-full object-cover" alt="quote-preview" />
                    </div>
                  ) : hasVideoThumbnail ? (
                    <div className="w-8.5 h-8.5 rounded-md overflow-hidden bg-black shrink-0 border border-black/10 dark:border-white/10 ml-1 relative flex items-center justify-center shadow-2xs">
                      <video src={parentMessage.file!.data} className="w-full h-full object-cover" muted playsInline />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <IconPlayerPlayFilled size={10} className="text-white" />
                      </div>
                    </div>
                  ) : hasStickerThumbnail ? (
                    <div className="w-8 h-8 shrink-0 ml-1 flex items-center justify-center">
                      <TgsStickerPlayer 
                        src={parentMessage.file?.data || parentMessage.sticker?.url || ''} 
                        alt="quote-sticker" 
                        className="w-full h-full" 
                        loop={false} 
                        autoplay={false} 
                      />
                    </div>
                  ) : null}
                </div>
              );
            })()}

            {/* POLL - Interactive Live Poll Card (replaces text & media) */}
            {message.poll && (
              <div className="px-3 pt-2.5 pb-2">
                <PollCard
                  poll={message.poll}
                  messageId={message.id}
                  roomId={message.roomId}
                  currentUser={currentUser}
                  isOwnPoll={isSelf}
                  onVote={onVotePoll ?? (() => {})}
                  onClose={onClosePoll ? (id) => onClosePoll(id, message.roomId) : undefined}
                  timestamp={message.timestamp}
                  deliveryStatus={deliveryStatus}
                  isPending={isPending}
                  formatTime={formatTime}
                  getUserDisplayName={getUserDisplayName}
                />
              </div>
            )}

            {/* 0. TELEGRAM STICKER - Pure Transparent Sticker with Floating Timestamp */}
            {isSticker && (
              <div className={`relative flex flex-col items-center py-1 select-none ${
                isSelf ? 'animate-sticker-send' : 'animate-sticker-send-peer'
              }`}>
                <div 
                  className="relative w-36 h-36 xs:w-44 xs:h-44 sm:w-48 sm:h-48 md:w-52 md:h-52 flex items-center justify-center transition-transform duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                  title={matchedSticker?.title || message.file?.name || message.sticker?.title || 'Стикер'}
                >
                  <TgsStickerPlayer
                    src={matchedSticker?.url || message.file?.data || message.sticker?.url || ''}
                    alt={matchedSticker?.title || message.file?.name || message.sticker?.title || 'Стикер'}
                    className="w-full h-full"
                    loop={true}
                    autoplay={true}
                  />
                  {message.file?.isUploading && (message.file.uploadProgress === undefined || message.file.uploadProgress < 100) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl z-20 pointer-events-none">
                      <CircularProgress progress={message.file.uploadProgress || 0} />
                    </div>
                  )}
                </div>

                {/* Floating Timestamp pill for Sticker */}
                <div className={`mt-0.5 px-2.5 py-0.5 rounded-full bg-black/45 text-white backdrop-blur-xs text-[10px] font-mono flex items-center gap-1 select-none shadow-xs ${
                  isSelf ? 'self-end' : 'self-start'
                }`}>
                  {message.isEdited && <span className="opacity-75 text-[8px]">изм.</span>}
                  <span>{formatTime(message.timestamp)}</span>
                  {isSelf && !isPending && (
                    <span className="text-[#4fae4e] dark:text-[#82b1ff]">
                      {deliveryStatus === 'read' ? <IconChecks size={13} stroke={2} /> : <IconCheck size={13} stroke={2} />}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 1. TELEGRAM VIDEO NOTE (КРУЖОК) - Pure Circle with Optimized Player */}
            {isVideoNote && message.file && (
              <TelegramVideoNotePlayer
                message={message}
                isSelf={isSelf}
                isPending={isPending}
                deliveryStatus={deliveryStatus}
                formatTime={formatTime}
              />
            )}

            {/* 2. REGULAR VIDEO PLAYER (Кастомный многофункциональный видеоплеер с авто-определением ориентации) */}
            {isRegularVideo && message.file && (
              <div 
                className={`relative p-1 w-full ${
                  videoOrientation === 'vertical'
                    ? 'min-w-[200px] max-w-[240px] xs:max-w-[260px] sm:max-w-[290px]'
                    : videoOrientation === 'square'
                      ? 'min-w-[220px] max-w-[280px] xs:max-w-[320px] sm:max-w-[360px]'
                      : 'min-w-[260px] max-w-[350px] xs:max-w-[420px] sm:max-w-[480px] md:max-w-[540px]'
                }`} 
                onClick={(e) => e.stopPropagation()}
              >
                <div 
                  className={`relative rounded-2xl overflow-hidden bg-black flex items-center justify-center shadow-md ${
                    !videoAspectRatio ? 'aspect-video' : ''
                  }`}
                  style={videoAspectRatio ? { 
                    aspectRatio: `${videoAspectRatio}`,
                    maxHeight: videoOrientation === 'vertical' ? '460px' : '380px'
                  } : undefined}
                >
                  <VideoPlayer
                    src={message.file.data}
                    allowFullscreen={true}
                    allowPictureInPicture={true}
                    controls={true}
                    onOrientationChange={(orientation, ratio) => {
                      setVideoOrientation(orientation);
                      setVideoAspectRatio(ratio);
                    }}
                  />
                  {message.file.isUploading && (message.file.uploadProgress === undefined || message.file.uploadProgress < 100) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-30 pointer-events-none">
                      <CircularProgress progress={message.file.uploadProgress || 0} />
                    </div>
                  )}
                </div>
                {!hasText && (
                  <div className="flex items-center justify-end px-1 pt-1 text-[10px] text-slate-500 dark:text-slate-400 select-none">
                    {message.isEdited && <span className="opacity-75 text-[8px] mr-1">изм.</span>}
                    <span className="font-mono">{formatTime(message.timestamp)}</span>
                    {isSelf && !isPending && (
                      <span className="ml-1 text-[#4fae4e] dark:text-[#82b1ff]">
                        {deliveryStatus === 'read' ? <IconChecks size={13} stroke={2} /> : <IconCheck size={13} stroke={2} />}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 3. Image Media */}
            {isImageFile && message.file && (
              <div className="relative p-1 min-w-[140px] min-h-[100px] flex items-center justify-center">
                <img
                  src={message.file.data}
                  alt={message.file.name}
                  onLoad={() => setIsMediaLoading(false)}
                  onError={() => setIsMediaLoading(false)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenGallery) {
                      onOpenGallery(message.id);
                    } else {
                      setIsImagePreviewOpen(true);
                    }
                  }}
                  className={`w-full h-auto max-w-[300px] sm:max-w-[360px] max-h-[380px] rounded-xl block object-cover cursor-pointer ${
                    isMediaLoading && !message.file.isUploading ? 'opacity-30' : 'opacity-100'
                  }`}
                />
                {message.file.isUploading && (message.file.uploadProgress === undefined || message.file.uploadProgress < 100) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl z-10 pointer-events-none">
                    <CircularProgress progress={message.file.uploadProgress || 0} />
                  </div>
                )}
                {isPureImage && !message.file.isUploading && (
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/50 text-[10px] text-white font-mono flex items-center gap-1">
                    {message.isEdited && <span className="opacity-75 text-[8px]">изм.</span>}
                    <span>{formatTime(message.timestamp)}</span>
                    {isSelf && !isPending && (
                      <span className="ml-0.5 text-[#4fae4e] dark:text-[#82b1ff]">
                        {deliveryStatus === 'read' ? <IconChecks size={13} stroke={2} /> : <IconCheck size={13} stroke={2} />}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Lightbox Modal for Photos */}
            {isImagePreviewOpen && isImageFile && message.file && createPortal(
              <div
                className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 select-none animate-backdrop"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsImagePreviewOpen(false);
                }}
              >
                <a
                  href={message.file.data}
                  download={message.file.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-5 right-18 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer z-50 flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                  title="Скачать фото"
                >
                  <IconDownload size={20} />
                </a>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsImagePreviewOpen(false);
                  }}
                  className="absolute top-5 right-5 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer z-50 transition-transform hover:scale-110 active:scale-95"
                  title="Закрыть"
                >
                  <IconX size={20} />
                </button>

                <div className="max-w-full max-h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                  <img
                    src={message.file.data}
                    alt={message.file.name}
                    className="max-w-[92vw] max-h-[88vh] rounded-2xl object-contain shadow-2xl animate-lightbox"
                  />
                </div>
              </div>,
              document.body
            )}

            {/* 4. Telegram-Style Audio Voice Player (Pixel-Perfect Alignment) */}
            {isAudioFile && message.file && (
              message.file.isUploading && (message.file.uploadProgress === undefined || message.file.uploadProgress < 100) ? (
                <div className="flex items-center gap-3 py-2 px-3 min-w-[220px]" onClick={(e) => e.stopPropagation()}>
                  <div className="shrink-0 scale-75">
                    <CircularProgress progress={message.file.uploadProgress || 0} />
                  </div>
                  <span className="text-xs opacity-80 font-medium">Отправка аудио...</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-3 py-2 min-w-[240px] sm:min-w-[270px] max-w-[310px]" onClick={(e) => e.stopPropagation()}>
                  <audio
                    ref={audioRef}
                    src={message.file.data}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={() => setPlayingAudioId(null)}
                    playsInline
                  />
                  
                  {/* Circle Play/Pause Button - 100% Dead Centered */}
                  <button
                    type="button"
                    onClick={toggleAudio}
                    className="w-10 h-10 rounded-full bg-[#3390ec] text-white flex items-center justify-center shrink-0 shadow-xs cursor-pointer active:scale-95 transition-transform"
                    title={isAudioPlaying ? 'Пауза' : 'Слушать'}
                  >
                    {isAudioPlaying ? (
                      <IconPlayerPauseFilled size={18} />
                    ) : (
                      <IconPlayerPlayFilled size={18} />
                    )}
                  </button>

                  {/* Waveform & Info Row */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between h-9">
                    {/* Dynamic Spectrum waveform */}
                    <div 
                      className="flex items-end gap-[2px] h-4 cursor-pointer select-none overflow-hidden py-0.5"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const pct = Math.max(0, Math.min(1, clickX / rect.width));
                        if (audioRef.current) {
                          const dur = audioRef.current.duration || message.file?.duration || 0;
                          if (dur > 0 && dur !== Infinity) {
                            audioRef.current.currentTime = pct * dur;
                            setAudioProgress(pct * 100);
                          }
                        }
                      }}
                    >
                      {waveform.map((h, i) => {
                        const barPct = (i / waveform.length) * 100;
                        const isPlayed = audioProgress >= barPct;
                        return (
                          <span
                            key={i}
                            className={`w-[2.5px] rounded-full transition-colors duration-100 ${
                              isPlayed
                                ? isSelf 
                                  ? 'bg-[#3390ec] dark:bg-white' 
                                  : 'bg-[#3390ec]'
                                : isSelf 
                                  ? 'bg-black/20 dark:bg-white/30' 
                                  : 'bg-black/15 dark:bg-white/20'
                            }`}
                            style={{ height: `${Math.max(3, (h / 100) * 16)}px` }}
                          />
                        );
                      })}
                    </div>

                    {/* Bottom row: [0:02 1x]  ...  [19:50 ✓✓] */}
                    <div className="flex items-center justify-between text-[11px] leading-none select-none">
                      {/* Left: Duration & Speed */}
                      <div className="flex items-center gap-1.5 text-[#6c7883] dark:text-[#8b9ba8]">
                        <span className="font-mono text-[10.5px]">
                          {isAudioPlaying 
                            ? formatAudioTime(audioCurrentTime) 
                            : formatAudioTime(audioDuration || message.file?.duration || 0)}
                        </span>
                        <button
                          type="button"
                          onClick={changeSpeed}
                          className="px-1 py-0.2 rounded text-[9px] font-bold cursor-pointer bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 transition-colors"
                        >
                          {playSpeed}x
                        </button>
                      </div>

                      {/* Right: Timestamp & Read Status */}
                      {isPureAudio && (
                        <div className={`flex items-center gap-0.5 text-[10.5px] ${
                          isSelf 
                            ? 'text-[#4fae4e] dark:text-[#82b1ff]' 
                            : 'text-[#8b9ba8] dark:text-[#708499]'
                        }`}>
                          <span className="font-sans">{formatTime(message.timestamp)}</span>
                          {isSelf && !isPending && (
                            <span className="ml-0.5">
                              {deliveryStatus === 'read' ? (
                                <IconChecks size={13} stroke={2} />
                              ) : (
                                <IconCheck size={13} stroke={2} />
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            )}

            {/* 5. Document File Card */}
            {isDocumentFile && message.file && (
              <div className="p-2">
                <div className="flex items-center gap-3 p-2.5 bg-black/5 dark:bg-white/5 rounded-xl min-w-[220px]" onClick={(e) => e.stopPropagation()}>
                  <div className="w-10 h-10 rounded-full bg-[#3390ec] text-white flex items-center justify-center shrink-0">
                    <IconFileText size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold truncate block">{message.file.name}</span>
                    <span className="text-[10px] opacity-70 block font-mono">
                      {message.file.isUploading ? 'Отправка...' : `${(message.file.size / 1024).toFixed(1)} КБ`}
                    </span>
                  </div>
                  {!message.file.isUploading && (
                    <a
                      href={message.file.data}
                      download={message.file.name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer text-slate-600 dark:text-slate-400"
                      title="Скачать файл"
                    >
                      <IconDownload size={18} />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Message Text with Authentic Telegram Inline Timestamp */}
            {hasText && (
              <div className={`px-3 ${hasFile ? 'pb-2 pt-1' : 'py-1.5'} leading-[1.35] text-[14.5px]`}>
                {isEditing ? (
                  <div className="flex flex-col gap-2 min-w-[200px]" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (editText.trim() && editText.trim() !== message.text) {
                            editMessage(message.id, editText);
                          }
                          setIsEditing(false);
                        } else if (e.key === 'Escape') {
                          setIsEditing(false);
                        }
                      }}
                      className="w-full bg-transparent border-b border-black/20 dark:border-white/20 py-1 text-[14px] focus:outline-none focus:border-[#3390ec]"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2 text-[11px] font-semibold">
                      <button 
                        type="button"
                        onClick={() => setIsEditing(false)} 
                        className="px-2 py-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                      >
                        Отмена
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          if (editText.trim() && editText.trim() !== message.text) {
                            editMessage(message.id, editText);
                          }
                          setIsEditing(false);
                        }} 
                        className="px-2.5 py-1 rounded-md tg-btn-primary cursor-pointer text-white"
                      >
                        Сохранить
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {displayMessageText && (
                      <span className="whitespace-pre-wrap break-words">{parseAndRenderRichText(displayMessageText, searchQuery, onHashtagClick)}</span>
                    )}
                    
                    {/* Telegram Inline Timestamp & Double Checkmarks (Baseline-Aligned) */}
                    <span className={`inline-flex items-center gap-0.5 select-none ml-2 text-[11px] leading-none align-baseline whitespace-nowrap ${
                      isSelf 
                        ? 'text-[#4fae4e] dark:text-[#82b1ff]' 
                        : 'text-[#8b9ba8] dark:text-[#708499]'
                    }`}>
                      {message.isEdited && <span className="text-[9px] opacity-75 mr-0.5 font-sans">изм.</span>}
                      <span className="font-sans tabular-nums">{formatTime(message.timestamp)}</span>
                      {isSelf && !isPending && (
                        <span className="ml-0.5 inline-flex items-center">
                          {deliveryStatus === 'read' ? (
                            <IconChecks size={13} stroke={2} />
                          ) : (
                            <IconCheck size={13} stroke={2} />
                          )}
                        </span>
                      )}
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Reactions Inside Bubble Below Content with 3D Animated Emojis */}
            {hasReactions && !isVideoNote && (
              <div className={`flex flex-wrap gap-1 px-2.5 pb-2 pt-1 ${isSelf ? 'justify-end' : 'justify-start'}`}>
                {Object.entries(message.reactions || {}).map(([emoji, reactors]) => {
                  const hasReacted = currentUser ? reactors.includes(currentUser) : false;
                  const reactorNames = reactors.map((id) => (id === currentUser ? 'Вы' : (getUserDisplayName(id) || USER_NAMES[id] || id)));
                  const previewNames = reactorNames.slice(0, 4).join(', ') + (reactorNames.length > 4 ? ` и ещё ${reactorNames.length - 4}` : '');
                  return (
                    <div key={emoji} className="relative group/reaction">
                      <button
                        type="button"
                        onClick={() => toggleReaction(message.id, emoji)}
                        className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 transition-all hover:scale-110 active:scale-90 cursor-pointer select-none animate-reaction-pop ${
                          hasReacted 
                            ? 'bg-[#3390ec]/25 ring-1.5 ring-[#3390ec] shadow-xs'
                            : 'bg-black/5 dark:bg-white/10 hover:bg-black/10'
                        }`}
                      >
                        <HoverAnimatedEmoji emoji={emoji} size={18} />
                        <span className="font-bold text-[10px] text-slate-700 dark:text-slate-200">{reactors.length}</span>
                      </button>

                      {/* Who Reacted Tooltip (Telegram Style) */}
                      <div className="pointer-events-none absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-50 opacity-0 translate-y-1 group-hover/reaction:opacity-100 group-hover/reaction:translate-y-0 transition-all duration-150">
                        <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#232e3c] shadow-xl border border-slate-200 dark:border-white/10 whitespace-nowrap max-w-[240px]">
                          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                            {emoji} {previewNames}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && createPortal(
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-pop-in"
          onClick={() => setIsDeleteModalOpen(false)}
        >
          <div 
            className="w-full max-w-[320px] tg-header rounded-2xl p-5 flex flex-col items-center text-center shadow-xl border border-slate-200 dark:border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-11 h-11 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-3">
              <IconTrash size={22} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0">
              Удалить сообщение?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
              Сообщение будет удалено для всех участников диалога.
            </p>
            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-white/5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  const element = document.getElementById(`msg-${message.id}`);
                  const bubble = (element?.querySelector('[data-bubble="true"]') || element) as HTMLElement | null;
                  if (bubble) {
                    triggerTelegramDisintegrate(bubble, () => {
                      deleteMessage(message.id);
                    });
                  } else {
                    deleteMessage(message.id);
                  }
                }}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});
