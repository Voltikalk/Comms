import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { USER_NAMES } from '../constants';
import { MessageBubble } from './MessageBubble';
import type { Room, UserId, Message } from '../types';
import {
  IconPhone,
  IconVideo,
  IconPhoneOff,
  IconSearch,
  IconLogout,
  IconPaperclip,
  IconSend,
  IconMicrophone,
  IconX,
  IconUsers,
  IconChevronLeft,
  IconSun,
  IconMoon,
  IconCamera,
  IconMoodSmile,
  IconMenu2,
  IconDotsVertical,
  IconBell,
  IconPhoneCall,
  IconUserCheck,
  IconDeviceMobile,
  IconQrcode,
  IconCopy,
  IconCheck,
  IconChecks,
  IconPhoto,
  IconEdit,
  IconShare3,
  IconTrash,
  IconPin,
  IconUser,
  IconFileText,
  IconChevronUp,
  IconChevronDown,
  IconWorld,
  IconPalette
} from '@tabler/icons-react';
import { TelegramEmojiPickerModal } from './TelegramEmojiPickerModal';
import { TelegramContextMenuModal } from './TelegramContextMenuModal';
import { ProfileEditModal } from './ProfileEditModal';
import { SearchPage } from '../pages/SearchPage';
import { AdvancedSearchModal } from './Search/AdvancedSearchModal';
import { ThemeSettingsModal } from './Theme/ThemeSettingsModal';
import { DEFAULT_THEME_CONFIG, getWallpaperById, getAccentColorById } from '../constants/wallpapers';
import type { ChatThemeConfig } from '../types/theme.types';
import { applyFilters, type FilterOptions } from '../lib/filter-utils';
import { triggerTelegramDisintegrate } from './effects/disintegrate';
import { findStickersByEmoji } from '../constants/stickers';
import type { Sticker } from '../types/sticker.types';
import { TgsStickerPlayer } from './Stickers/TgsStickerPlayer';

interface ChatScreenProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const ROOM_AVATAR_COLORS: Record<string, string> = {
  vlad: 'bg-indigo-600',
  anya: 'bg-pink-600',
  mom: 'bg-amber-600',
  dad: 'bg-sky-600',
  sister: 'bg-emerald-600',
};

const getSelectedText = (count: number) => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) {
    return `Выбрано ${count} сообщений`;
  }
  if (mod10 === 1) {
    return `Выбрано ${count} сообщение`;
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return `Выбрано ${count} сообщения`;
  }
  return `Выбрано ${count} сообщений`;
};

export const ChatScreen: React.FC<ChatScreenProps> = ({ darkMode, toggleDarkMode }) => {
  const {
    currentUser,
    currentUserName,
    currentUserProfile,
    userProfiles,
    getUserDisplayName,
    getUserAvatar,
    rooms,
    activeRoomId,
    setActiveRoomId,
    activeRoom,
    onlineStatus,
    messages,
    activeMessages,
    logout,
    sendMessage,
    forwardMessage,
    deleteMessage,
    editMessage,
    toggleReaction,
    typingUsers,
    sendTypingStatus,
    unreadCount,
    lastMessageOf,

    // Calling context
    callSession,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    localStream,
    remoteStream,
    isMuted,
    toggleMute,
    isCameraOff,
    toggleCamera
  } = useSocket();

  const [inputText, setInputText] = useState('');
  const [roomFilterQuery, setRoomFilterQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [isUrlCopied, setIsUrlCopied] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [themeConfig, setThemeConfig] = useState<ChatThemeConfig>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tg_chat_theme_config');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return DEFAULT_THEME_CONFIG;
  });

  // Apply accent colors dynamically to CSS root variables
  useEffect(() => {
    try {
      const accent = getAccentColorById(themeConfig.accentColorId);
      document.documentElement.style.setProperty('--tg-theme-accent', accent.hex);
      document.documentElement.style.setProperty('--tg-theme-accent-hover', accent.hoverHex);
      document.documentElement.style.setProperty('--tg-theme-accent-subtle', accent.subtleHex);
      document.documentElement.style.setProperty('--tg-theme-accent-border', accent.borderHex);
      localStorage.setItem('tg_chat_theme_config', JSON.stringify(themeConfig));
    } catch (e) {
      console.warn('Failed to persist chat theme config:', e);
    }
  }, [themeConfig]);

  const getChatBackgroundStyle = (): React.CSSProperties => {
    if (themeConfig.wallpaperId === 'custom' && themeConfig.customWallpaper?.imageUrl) {
      const blur = themeConfig.customWallpaper.blur || 0;
      return {
        backgroundImage: `url("${themeConfig.customWallpaper.imageUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        filter: blur > 0 ? `blur(${blur}px)` : undefined,
        transform: blur > 0 ? 'scale(1.08)' : undefined
      };
    }

    const wp = getWallpaperById(themeConfig.wallpaperId);
    if (wp.imageUrl) {
      const blur = wp.blur || 0;
      return {
        backgroundImage: `url("${wp.imageUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        filter: blur > 0 ? `blur(${blur}px)` : undefined,
        transform: blur > 0 ? 'scale(1.08)' : undefined
      };
    }

    const bgCss = darkMode ? wp.backgroundCssDark : wp.backgroundCssLight;

    if (wp.patternSvg) {
      return {
        backgroundImage: `${wp.patternSvg}, ${bgCss}`,
        backgroundSize: '160px 160px, 100% 100%',
        backgroundRepeat: 'repeat, no-repeat'
      };
    }

    return {
      backgroundImage: bgCss,
      backgroundSize: '100% 100%'
    };
  };

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messageFeedRef = useRef<HTMLElement | null>(null);
  const isNearBottomRef = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const typingTimeoutRef = useRef<any>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [chatFilters, setChatFilters] = useState<FilterOptions>({});
  const [showGlobalSearchModal, setShowGlobalSearchModal] = useState(false);
  const [showAdvancedSearchModal, setShowAdvancedSearchModal] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(40);
  const [contextMenuTarget, setContextMenuTarget] = useState<{
    message: Message;
    x: number;
    y: number;
    isSelf: boolean;
  } | null>(null);

  // Context menu action states
  const [pinnedMessages, setPinnedMessages] = useState<Record<string, string>>({});
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [toast, setToast] = useState<{
    text: string;
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());

  const showToast = (
    textOrConfig: string | { text: string; actionLabel?: string; onAction?: () => void }
  ) => {
    if (typeof textOrConfig === 'string') {
      setToast({ text: textOrConfig });
    } else {
      setToast(textOrConfig);
    }
    setTimeout(() => setToast(null), 3500);
  };

  // File & Voice Attachment states
  const [selectedFile, setSelectedFile] = useState<{ 
    name: string; 
    type: 'image' | 'audio' | 'video' | 'video_note' | 'file' | 'sticker'; 
    data: string; 
    size: number; 
    rawBlob?: Blob | File;
    width?: number;
    height?: number;
    orientation?: 'vertical' | 'horizontal' | 'square';
    stickerData?: Sticker;
  } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<any>(null);

  // Video Circle recording states
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoRecordTime, setVideoRecordTime] = useState(0);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const videoIntervalRef = useRef<any>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  // Call stream refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Ringtone synthesizer state
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Reset visible count on room switch (unless pending message navigation is active)
  useEffect(() => {
    if (!pendingNavigateMessageIdRef.current) {
      setVisibleCount(40);
    }
    setShowEmojiPicker(false);
  }, [activeRoomId]);

  // Memoized message map for O(1) replies lookup
  const messageMap = React.useMemo(() => {
    return new Map(messages.map((m) => [m.id, m]));
  }, [messages]);

  const currentPinnedMessageId = activeRoomId ? pinnedMessages[activeRoomId] : null;
  const currentPinnedMessage = currentPinnedMessageId ? messageMap.get(currentPinnedMessageId) || null : null;

  const togglePinMessage = (msgId: string) => {
    if (!activeRoomId) return;
    setPinnedMessages((prev) => {
      if (prev[activeRoomId] === msgId) {
        const next = { ...prev };
        delete next[activeRoomId];
        showToast('Сообщение откреплено');
        return next;
      }
      showToast('Сообщение закреплено');
      return { ...prev, [activeRoomId]: msgId };
    });
  };

  const COMPACT_SIDEBAR_WIDTH = 72;
  const SNAP_THRESHOLD = 175;
  const MIN_EXPANDED_WIDTH = 250;
  const MAX_SIDEBAR_WIDTH = 640;
  const DEFAULT_SIDEBAR_WIDTH = 380;

  // Resizable Chat List Sidebar width state (Telegram Desktop behavior)
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tg_sidebar_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && ((parsed >= MIN_EXPANDED_WIDTH && parsed <= MAX_SIDEBAR_WIDTH) || parsed === COMPACT_SIDEBAR_WIDTH)) {
          return parsed;
        }
      }
    }
    return DEFAULT_SIDEBAR_WIDTH;
  });
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const isCompactSidebar = sidebarWidth <= 130;

  const startResizingSidebar = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsResizingSidebar(true);
  }, []);

  useEffect(() => {
    if (!isResizingSidebar) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const maxAllowed = Math.min(MAX_SIDEBAR_WIDTH, window.innerWidth * 0.6);
      
      let newWidth: number;
      if (clientX < SNAP_THRESHOLD) {
        newWidth = COMPACT_SIDEBAR_WIDTH;
      } else {
        newWidth = Math.max(MIN_EXPANDED_WIDTH, Math.min(clientX, maxAllowed));
      }
      setSidebarWidth(newWidth);
    };

    const handlePointerUp = () => {
      setIsResizingSidebar(false);
      localStorage.setItem('tg_sidebar_width', sidebarWidth.toString());
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove);
    window.addEventListener('touchend', handlePointerUp);

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      localStorage.setItem('tg_sidebar_width', sidebarWidth.toString());
    };
  }, [isResizingSidebar, sidebarWidth]);

  const handleForwardToRoom = (targetRoomId: string) => {
    if (!forwardingMessage) return;

    // 1. Forward message to target room with full forwardedFrom metadata
    forwardMessage(targetRoomId, forwardingMessage);

    // 2. Close modal and reset selection (stay in current chat smoothly)
    setForwardingMessage(null);
    setIsSelectMode(false);
    setSelectedMessageIds(new Set());

    const targetRoom = rooms.find((r) => r.id === targetRoomId);
    const roomName = targetRoom ? getRoomDisplayName(targetRoom) : 'чат';

    // 3. Show smooth Telegram notification with "Перейти" action
    showToast({
      text: `Сообщение переслано в ${roomName}`,
      actionLabel: 'Перейти',
      onAction: () => {
        setActiveRoomId(targetRoomId);
        setMobileView('chat');
      }
    });
  };

  const handleDeleteMessageAnimated = useCallback((messageId: string) => {
    const element = document.getElementById(`msg-${messageId}`);
    const bubble = (element?.querySelector('[data-bubble="true"]') || element) as HTMLElement | null;
    if (bubble) {
      triggerTelegramDisintegrate(bubble, () => {
        deleteMessage(messageId);
      });
    } else {
      deleteMessage(messageId);
    }
  }, [deleteMessage]);

  const handleDeleteSelectedAnimated = useCallback(() => {
    const ids = Array.from(selectedMessageIds);
    if (ids.length === 0) return;

    const bubbles: HTMLElement[] = [];
    ids.forEach((id) => {
      const element = document.getElementById(`msg-${id}`);
      const bubble = (element?.querySelector('[data-bubble="true"]') || element) as HTMLElement | null;
      if (bubble) {
        bubbles.push(bubble);
      }
    });

    if (bubbles.length > 0) {
      triggerTelegramDisintegrate(bubbles, () => {
        ids.forEach((id) => deleteMessage(id));
      });
    } else {
      ids.forEach((id) => deleteMessage(id));
    }

    setIsSelectMode(false);
    setSelectedMessageIds(new Set());
    showToast(ids.length > 1 ? 'Сообщения удалены' : 'Сообщение удалено');
  }, [selectedMessageIds, deleteMessage]);

  // Filter messages using our rich applyFilters system
  const filteredMessages = React.useMemo(() => {
    if (!isSearching && Object.keys(chatFilters).length === 0) {
      return activeMessages;
    }
    return applyFilters(activeMessages, {
      ...chatFilters,
      searchQuery: searchQuery.trim() || undefined,
    });
  }, [activeMessages, isSearching, chatFilters, searchQuery]);

  const activeChatFiltersCount = Object.keys(chatFilters).filter((k) => {
    const v = (chatFilters as any)[k];
    if (v === undefined || v === null || v === false) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'object') return Object.values(v).some(Boolean);
    return true;
  }).length;

  const handleDatePreset = (preset: 'today' | 'week' | 'month') => {
    const now = new Date();
    if (preset === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
      const isAlready = chatFilters.dateRange?.startDate === start;
      setChatFilters((prev) => ({
        ...prev,
        dateRange: isAlready ? undefined : { startDate: start, endDate: end },
      }));
    } else if (preset === 'week') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
      const isAlready = chatFilters.dateRange?.startDate === start;
      setChatFilters((prev) => ({
        ...prev,
        dateRange: isAlready ? undefined : { startDate: start, endDate: end },
      }));
    } else if (preset === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
      const isAlready = chatFilters.dateRange?.startDate === start;
      setChatFilters((prev) => ({
        ...prev,
        dateRange: isAlready ? undefined : { startDate: start, endDate: end },
      }));
    }
  };

  const pendingNavigateMessageIdRef = useRef<string | null>(null);

  const jumpToMessage = useCallback((messageId: string, highlightDuration = 2600) => {
    if (!messageId) return;

    // 1. If the message index is beyond current visible slice, expand visibleCount
    const targetIdx = activeMessages.findIndex((m) => String(m.id) === String(messageId));
    if (targetIdx !== -1) {
      const countNeeded = activeMessages.length - targetIdx + 20;
      if (countNeeded > visibleCount) {
        setVisibleCount(Math.max(countNeeded, activeMessages.length));
      }
    }

    // 2. Multi-stage scroll to message directly on the feed container
    let attempts = 0;
    const maxAttempts = 20;

    const performScroll = () => {
      const el = document.getElementById(`msg-${messageId}`);
      const container = messageFeedRef.current;

      if (el && container && container.clientHeight > 0) {
        const containerRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const currentScrollTop = container.scrollTop;
        const relativeTop = elRect.top - containerRect.top + currentScrollTop;
        const targetScrollTop = Math.max(0, relativeTop - (containerRect.height / 2) + (elRect.height / 2));

        // Direct container scroll to target message
        container.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth',
        });

        // Fallback smooth centering
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Highlight message row with clean, even Telegram strip
        el.classList.add('tg-message-row-highlight');
        setTimeout(() => {
          el.classList.remove('tg-message-row-highlight');
        }, highlightDuration);

        // Calibration pass after layout stabilization (250ms)
        setTimeout(() => {
          const reCheckEl = document.getElementById(`msg-${messageId}`);
          const reCheckContainer = messageFeedRef.current;
          if (reCheckEl && reCheckContainer) {
            const cRect = reCheckContainer.getBoundingClientRect();
            const eRect = reCheckEl.getBoundingClientRect();
            const reTop = eRect.top - cRect.top + reCheckContainer.scrollTop;
            const reTarget = Math.max(0, reTop - (cRect.height / 2) + (eRect.height / 2));
            if (Math.abs(reCheckContainer.scrollTop - reTarget) > 40) {
              reCheckContainer.scrollTo({
                top: reTarget,
                behavior: 'smooth',
              });
            }
          }
          pendingNavigateMessageIdRef.current = null;
        }, 250);

      } else if (attempts < maxAttempts) {
        attempts++;
        if (targetIdx !== -1) {
          const countNeeded = activeMessages.length - targetIdx + 20;
          if (countNeeded > visibleCount) {
            setVisibleCount(Math.max(countNeeded, activeMessages.length));
          }
        }
        setTimeout(performScroll, 60);
      }
    };

    setTimeout(performScroll, 50);
  }, [activeMessages, visibleCount]);

  // Execute pending navigation after room switch, message update, or mobile view change
  useEffect(() => {
    if (pendingNavigateMessageIdRef.current) {
      const msgId = pendingNavigateMessageIdRef.current;
      jumpToMessage(msgId);
    }
  }, [activeMessages, activeRoomId, mobileView, jumpToMessage]);

  const scrollToMatch = (index: number) => {
    if (filteredMessages.length === 0) return;
    const bounded = (index + filteredMessages.length) % filteredMessages.length;
    setCurrentMatchIndex(bounded);
    const targetMsg = filteredMessages[bounded];
    if (targetMsg) {
      jumpToMessage(targetMsg.id);
    }
  };

  const handleNextMatch = () => scrollToMatch(currentMatchIndex + 1);
  const handlePrevMatch = () => scrollToMatch(currentMatchIndex - 1);

  // Ctrl+F / Cmd+F shortcut listener
  useEffect(() => {
    const handleSearchKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSearching(true);
      }
      if (e.key === 'Escape' && isSearching) {
        setIsSearching(false);
        setSearchQuery('');
        setChatFilters({});
      }
    };
    window.addEventListener('keydown', handleSearchKeyDown);
    return () => window.removeEventListener('keydown', handleSearchKeyDown);
  }, [isSearching]);

  const slicedMessages = filteredMessages.slice(-visibleCount);

  // Get peer online status for direct chat
  const activePeerId = activeRoom?.type === 'direct' 
    ? (activeRoom.participants.find(p => p !== currentUser) || currentUser) 
    : null;
  const isPeerOnline = activePeerId ? (activePeerId === currentUser ? true : onlineStatus[activePeerId]) : false;
  const activePeerProfile = activePeerId ? (userProfiles[activePeerId as UserId] || (activePeerId === currentUser ? currentUserProfile : null)) : null;
  const activePeerAvatar = activePeerId ? (getUserAvatar(activePeerId as UserId) || (activePeerId === currentUser ? currentUserProfile?.avatarUrl : undefined)) : undefined;

  // Get typing users in active room (excluding self)
  const activeRoomTypingMap = typingUsers[activeRoomId || ''] || {};
  const typingUserNames = Object.keys(activeRoomTypingMap)
    .filter((u) => u !== currentUser)
    .map((u) => USER_NAMES[u as UserId] || u);

  const isSomeoneTyping = typingUserNames.length > 0;

  // Filtered rooms list by search in sidebar
  const filteredRooms = rooms.filter((r) => {
    if (!roomFilterQuery.trim()) return true;
    const name = r.type === 'direct'
      ? (USER_NAMES[r.participants.find(p => p !== currentUser) as UserId] || r.name)
      : r.name;
    return name.toLowerCase().includes(roomFilterQuery.toLowerCase());
  });

  const isInitialRoomLoadRef = useRef(true);

  const handleScroll = () => {
    if (!messageFeedRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messageFeedRef.current;
    const nearBottom = scrollHeight - scrollTop - clientHeight < 150;
    isNearBottomRef.current = nearBottom;

    // If user scrolled up intentionally during initial load, release lock so we don't fight user
    if (!nearBottom) {
      isInitialRoomLoadRef.current = false;
    }
  };

  const prevMessagesCountRef = useRef(activeMessages.length);

  // Helper to scroll message feed directly inside container without window jumps
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    if (messageFeedRef.current) {
      if (behavior === 'auto') {
        messageFeedRef.current.scrollTop = messageFeedRef.current.scrollHeight;
      } else {
        messageFeedRef.current.scrollTo({
          top: messageFeedRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, []);

  // 1. Guaranteed Instant Scroll to Bottom when opening/switching chats (Pre-paint)
  useLayoutEffect(() => {
    if (!pendingNavigateMessageIdRef.current && messageFeedRef.current) {
      messageFeedRef.current.scrollTop = messageFeedRef.current.scrollHeight;
    }
  }, [activeRoomId, visibleCount]);

  // 2. Continuous ResizeObserver bottom-locking (Guarantees bottom anchor whenever media/video covers expand)
  useEffect(() => {
    if (pendingNavigateMessageIdRef.current) return;

    isInitialRoomLoadRef.current = true;
    const feed = messageFeedRef.current;
    if (!feed) return;

    // Immediate lock
    feed.scrollTop = feed.scrollHeight;

    // Observe inner container size changes as images/stickers/avatars/video covers mount
    const innerContainer = feed.firstElementChild;
    let observer: ResizeObserver | null = null;

    if (innerContainer && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        if (feed && !pendingNavigateMessageIdRef.current) {
          // If in initial room load phase OR user is currently near the bottom: keep pinned to bottom
          if (isInitialRoomLoadRef.current || isNearBottomRef.current) {
            feed.scrollTop = feed.scrollHeight;
          }
        }
      });
      observer.observe(innerContainer);
    }

    // Release initial strict lock after 2500ms (keeps bottom lock if user remains at bottom)
    const timeout = setTimeout(() => {
      isInitialRoomLoadRef.current = false;
      if (feed && !pendingNavigateMessageIdRef.current && isNearBottomRef.current) {
        feed.scrollTop = feed.scrollHeight;
      }
    }, 2500);

    return () => {
      observer?.disconnect();
      clearTimeout(timeout);
    };
  }, [activeRoomId]);

  // 3. Smart auto-scroll on NEW messages
  useEffect(() => {
    const isNewMessage = activeMessages.length > prevMessagesCountRef.current;
    prevMessagesCountRef.current = activeMessages.length;

    if (isNewMessage) {
      const lastMessage = activeMessages[activeMessages.length - 1];
      const isSelf = lastMessage?.sender === currentUser;

      // When sending own sticker/message: instant lock to bottom (1:1 Telegram behavior)
      // When receiving peer message while near bottom: smooth scroll
      if (isSelf) {
        requestAnimationFrame(() => {
          if (messageFeedRef.current) {
            messageFeedRef.current.scrollTop = messageFeedRef.current.scrollHeight;
          }
        });
      } else if (isNearBottomRef.current) {
        scrollToBottom('smooth');
      }
    }
  }, [activeMessages, currentUser, scrollToBottom]);

  // Escape key handler for exiting selection mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSelectMode) {
        setIsSelectMode(false);
        setSelectedMessageIds(new Set());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelectMode]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      stopRingtone();
    };
  }, []);

  // WebRTC Stream track bindings
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
    if (localAudioRef.current && localStream) {
      localAudioRef.current.srcObject = localStream;
    }
  }, [localStream, callSession]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(() => { });
    }
  }, [remoteStream, callSession]);

  // Call ringtone trigger
  useEffect(() => {
    if (callSession) {
      if (callSession.status === 'incoming') {
        startRingtone('ring');
      } else if (callSession.status === 'calling') {
        startRingtone('dial');
      } else {
        stopRingtone();
      }
    } else {
      stopRingtone();
    }
    return () => stopRingtone();
  }, [callSession]);

  const startRingtone = (type: 'ring' | 'dial') => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(type === 'ring' ? 440 : 350, ctx.currentTime);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      oscillatorRef.current = osc;

      let toggle = true;
      const interval = setInterval(() => {
        if (!audioCtxRef.current || !oscillatorRef.current) {
          clearInterval(interval);
          return;
        }
        gain.gain.setValueAtTime(toggle ? 0 : 0.08, audioCtxRef.current.currentTime);
        toggle = !toggle;
      }, 750);
    } catch (e) {
      console.warn('Oscillator ringtone failed:', e);
    }
  };

  const stopRingtone = () => {
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
      } catch { }
      oscillatorRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch { }
      audioCtxRef.current = null;
    }
  };

  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 160; // Max height limit (~6-7 lines)
      const minHeight = 24; // 1 single line
      
      const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
      textareaRef.current.style.height = `${newHeight}px`;
      textareaRef.current.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputText, adjustTextareaHeight]);

  const handleInputChange = (text: string) => {
    setInputText(text);

    if (!isTyping) {
      setIsTyping(true);
      sendTypingStatus(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingStatus(false);
    }, 2000);
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !selectedFile) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setIsTyping(false);
    sendTypingStatus(false);

    if (editingMessage) {
      if (inputText.trim()) {
        editMessage(editingMessage.id, inputText.trim());
        showToast('Сообщение изменено');
      }
      setEditingMessage(null);
      setInputText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      return;
    }

    sendMessage(inputText, replyingToMessage?.id, selectedFile || undefined);
    setInputText('');
    setReplyingToMessage(null);
    setSelectedFile(null);
    setShowEmojiPicker(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const insertEmoji = (emoji: string) => {
    handleInputChange(inputText + emoji);
    textareaRef.current?.focus();
  };

  const handleSendSticker = (sticker: Sticker) => {
    sendMessage('', replyingToMessage?.id, {
      name: sticker.title || `sticker_${sticker.id}`,
      type: 'sticker',
      data: sticker.url,
      size: 2048,
      stickerData: sticker
    });
    setReplyingToMessage(null);
    setShowEmojiPicker(false);
    showToast('Стикер отправлен');
  };

  const quickStickerSuggestions = React.useMemo(() => {
    const trimmed = inputText.trim();
    if (!trimmed || trimmed.length > 8) return [];
    return findStickersByEmoji(trimmed);
  }, [inputText]);

  // File selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let type: 'image' | 'audio' | 'video' | 'video_note' | 'file' | 'sticker' = 'file';
    const name = file.name.toLowerCase();
    if (name.endsWith('.tgs') || file.type === 'application/x-tgsticker' || (file.type === 'application/gzip' && name.includes('sticker'))) {
      type = 'sticker';
    } else if (file.type.startsWith('image/') || name.match(/\.(jpg|jpeg|png|gif|webp|heic)$/)) {
      type = 'image';
    } else if (file.type.startsWith('audio/') || name.match(/\.(mp3|wav|ogg|m4a|aac)$/)) {
      type = 'audio';
    } else if (file.type.startsWith('video/') || name.match(/\.(mp4|webm|mov|m4v|mkv|avi)$/)) {
      type = 'video';
    }

    const previewUrl = URL.createObjectURL(file);

    if (type === 'video') {
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.src = previewUrl;
      tempVideo.onloadedmetadata = () => {
        const ratio = tempVideo.videoWidth / (tempVideo.videoHeight || 1);
        setSelectedFile({
          name: file.name,
          type,
          data: previewUrl,
          size: file.size,
          rawBlob: file,
          width: tempVideo.videoWidth,
          height: tempVideo.videoHeight,
          orientation: ratio < 0.85 ? 'vertical' : ratio > 1.15 ? 'horizontal' : 'square'
        });
      };
      tempVideo.onerror = () => {
        setSelectedFile({
          name: file.name,
          type,
          data: previewUrl,
          size: file.size,
          rawBlob: file
        });
      };
    } else {
      setSelectedFile({
        name: file.name,
        type,
        data: previewUrl,
        size: file.size,
        rawBlob: file
      });
    }

    e.target.value = '';
  };

  // Audio Note recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mimeType = 'audio/webm;codecs=opus';
        else if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
        else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
        else if (MediaRecorder.isTypeSupported('audio/aac')) mimeType = 'audio/aac';
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const actualMimeType = mediaRecorder.mimeType || mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          const extension = actualMimeType.includes('mp4') ? 'mp4' : actualMimeType.includes('ogg') ? 'ogg' : actualMimeType.includes('aac') ? 'aac' : 'webm';
          sendMessage('', undefined, {
            name: `Голосовое сообщение.${extension}`,
            type: 'audio',
            data: base64,
            size: audioBlob.size,
            rawBlob: audioBlob
          });
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordTime(0);

      recordIntervalRef.current = setInterval(() => {
        setRecordTime((t) => t + 1);
      }, 1000);
    } catch (err) {
      console.error('Record microphone error:', err);
      alert('Не удалось получить доступ к микрофону.');
    }
  };

  const stopRecording = (shouldSend = true) => {
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && isRecording) {
      if (!shouldSend) {
        mediaRecorderRef.current.onstop = () => {
          mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
        };
      }
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const formatRecordTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // Video Circle Note recording
  const startVideoRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Запись видео-кружков требует защищенного соединения (HTTPS или localhost).');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } }
      });

      setVideoStream(stream);
      setIsRecordingVideo(true);
      setVideoRecordTime(0);
      videoChunksRef.current = [];

      setTimeout(() => {
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
        }
      }, 100);

      let mimeType = 'video/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) mimeType = 'video/webm;codecs=vp8,opus';
        else if (MediaRecorder.isTypeSupported('video/webm')) mimeType = 'video/webm';
        else if (MediaRecorder.isTypeSupported('video/mp4')) mimeType = 'video/mp4';
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      videoRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          videoChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const actualMimeType = mediaRecorder.mimeType || mimeType || 'video/webm';
        const videoBlob = new Blob(videoChunksRef.current, { type: actualMimeType });
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          const extension = actualMimeType.includes('mp4') ? 'mp4' : actualMimeType.includes('ogg') ? 'ogg' : 'webm';
          sendMessage('', undefined, {
            name: `Видео-кружок.${extension}`,
            type: 'video_note',
            data: base64,
            size: videoBlob.size,
            rawBlob: videoBlob
          });
        };
        reader.readAsDataURL(videoBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();

      videoIntervalRef.current = setInterval(() => {
        setVideoRecordTime((t) => t + 1);
      }, 1000);
    } catch (err) {
      console.error('Record video circle error:', err);
      alert('Не удалось получить доступ к камере/микрофону.');
    }
  };

  const stopVideoRecording = (shouldSend = true) => {
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }

    if (videoRecorderRef.current && isRecordingVideo) {
      if (!shouldSend) {
        videoRecorderRef.current.onstop = () => {
          videoRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
        };
      }
      videoRecorderRef.current.stop();
    } else if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
    }

    setIsRecordingVideo(false);
    setVideoStream(null);
  };

  const getRoomDisplayName = (room: Room) => {
    if (room.type === 'direct') {
      const peerId = room.participants.find(p => p !== currentUser) as UserId | undefined;
      return peerId ? (getUserDisplayName(peerId) || USER_NAMES[peerId] || peerId) : room.name;
    }
    return room.name;
  };

  const getRoomColor = (room: Room) => {
    if (room.type === 'group') return 'bg-[#3390ec]';
    const peerId = room.participants.find(p => p !== currentUser) || '';
    return ROOM_AVATAR_COLORS[peerId] || 'bg-[#3390ec]';
  };

  const getCleanMessageText = (msg: Message | null, showSender = false): string => {
    if (!msg) return '';

    // 1. Remove zero-width spaces, fwd metadata tags, and legacy forward headers
    const rawText = msg.text || '';
    const cleanText = rawText
      .replace(/^[\u200B\s]*\[fwd:[^\]]+\][\u200B\s]*/g, '')
      .replace(/^\[Переслано от [^\]]+\]:\s*/, '')
      .trim();

    let content = cleanText;

    // 2. If text was purely metadata (e.g. forwarded image/video/sticker without text)
    if (!content) {
      if (msg.file) {
        if (msg.file.type === 'sticker' || (msg.file.name && msg.file.name.includes('sticker'))) {
          content = '🎭 Стикер';
        } else if (msg.file.type === 'image') {
          content = '🖼 Фотография';
        } else if (msg.file.type === 'video_note') {
          content = '⭕ Видеосообщение';
        } else if (msg.file.type === 'video') {
          content = '📹 Видео';
        } else if (msg.file.type === 'audio') {
          content = '🎤 Голосовое сообщение';
        } else {
          content = `📁 ${msg.file.name || 'Вложение'}`;
        }
      } else if (msg.sticker) {
        content = `🎭 Стикер${msg.sticker.title ? `: ${msg.sticker.title}` : ''}`;
      } else {
        content = 'Сообщение';
      }
    }

    if (showSender) {
      const isSelf = msg.sender === currentUser;
      const senderName = isSelf ? 'Вы' : (getUserDisplayName(msg.sender) || USER_NAMES[msg.sender] || msg.sender);
      return `${senderName}: ${content}`;
    }

    return content;
  };

  const getLastMessageTime = (msg: Message | null) => {
    if (!msg) return '';
    const date = new Date(msg.timestamp);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatSeparatorDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Сегодня';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Вчера';
    } else {
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
  };

  return (
    <div className="flex h-dvh w-full overflow-hidden select-none">

      {/* 1. Left Sidebar: Telegram Chat List & Contacts */}
      <aside
        style={{
          '--sidebar-width': `${sidebarWidth}px`,
        } as React.CSSProperties}
        className={`w-full md:w-[var(--sidebar-width)] tg-sidebar flex flex-col shrink-0 ${
          showMenuDropdown ? 'z-50' : 'z-20'
        } ${
          isResizingSidebar ? 'select-none transition-none' : 'transition-transform duration-150'
        } ${mobileView === 'list'
          ? 'translate-x-0 flex'
          : '-translate-x-full md:translate-x-0 absolute md:relative z-20 h-full left-0 top-0 hidden md:flex'
          }`}
      >
        {/* Top Bar: Hamburger + Search Input */}
        <div className={`p-2.5 flex items-center gap-2 relative ${isCompactSidebar ? 'justify-center p-2' : ''}`}>
          <button
            type="button"
            onClick={() => setShowMenuDropdown(!showMenuDropdown)}
            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors shrink-0"
            title="Меню"
          >
            <IconMenu2 size={20} />
          </button>

          {/* Menu Dropdown */}
          {showMenuDropdown && (
            <>
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setShowMenuDropdown(false)}
              />
              <div className={`absolute top-12 ${isCompactSidebar ? 'left-2' : 'left-3'} z-50 w-64 tg-header rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 py-2 animate-pop-in select-none`}>
                {/* User Profile Card Header */}
                <div 
                  onClick={() => {
                    setShowProfileModal(true);
                    setShowMenuDropdown(false);
                  }}
                  className="px-3.5 py-2.5 mx-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors flex items-center gap-3 border-b border-slate-100 dark:border-white/5 pb-3"
                >
                  <div className="relative shrink-0">
                    {currentUserProfile?.avatarUrl ? (
                      <img 
                        src={currentUserProfile.avatarUrl} 
                        alt="Avatar" 
                        className="w-10 h-10 rounded-full object-cover shadow-xs ring-2 ring-[#3390ec]/20" 
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#3390ec] text-white flex items-center justify-center text-sm font-bold shadow-xs">
                        {currentUserName?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {currentUserProfile?.statusEmoji && (
                      <span className="absolute -bottom-1 -right-1 text-xs">
                        {currentUserProfile.statusEmoji}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                        {currentUserName}
                      </span>
                      <IconEdit size={14} className="text-[#3390ec] shrink-0" />
                    </div>
                    <span className="text-[10.5px] text-slate-400 truncate block">
                      {currentUserProfile?.username ? `@${currentUserProfile.username}` : (currentUserProfile?.bio || 'Нажмите для настройки')}
                    </span>
                  </div>
                </div>

                {/* Menu Actions */}
                <div className="pt-1.5 space-y-0.5 px-1">
                  {/* Search Action */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowGlobalSearchModal(true);
                      setShowMenuDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconSearch size={18} className="text-[#3390ec]" />
                      <span>Поиск по сообщениям</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded-md">FTS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileModal(true);
                      setShowMenuDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconUser size={18} className="text-[#3390ec]" />
                      <span>Мой профиль</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowQrModal(true);
                      setShowMenuDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconDeviceMobile size={18} className="text-[#3390ec]" />
                      <span>Открыть на телефоне</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      toggleDarkMode();
                      setShowMenuDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      {darkMode ? <IconSun size={18} className="text-amber-400" /> : <IconMoon size={18} className="text-indigo-500" />}
                      <span>{darkMode ? 'Светлая тема' : 'Ночной режим'}</span>
                    </span>
                    <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${darkMode ? 'bg-[#3390ec]' : 'bg-slate-300 dark:bg-slate-600'}`}>
                      <div className={`w-3 h-3 rounded-full bg-white transition-transform ${darkMode ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowThemeModal(true);
                      setShowMenuDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconPalette size={18} className="text-[#3390ec]" />
                      <span>Оформление и обои</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setShowMenuDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-rose-500 hover:bg-rose-500/10 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconLogout size={18} />
                      <span>Выйти</span>
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Search Input Bar (Shown in expanded mode) */}
          {!isCompactSidebar && (
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                value={roomFilterQuery}
                onChange={(e) => setRoomFilterQuery(e.target.value)}
                placeholder="Поиск..."
                className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-transparent focus:border-[#3390ec] outline-hidden text-slate-900 dark:text-white placeholder:text-slate-400 transition-colors"
              />
              <IconSearch size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              {roomFilterQuery && (
                <button
                  type="button"
                  onClick={() => setRoomFilterQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 rounded-full"
                >
                  <IconX size={14} />
                </button>
              )}
            </div>
          )}

          {!isCompactSidebar && (
            <button
              type="button"
              onClick={() => setShowGlobalSearchModal(true)}
              className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-[#3390ec] dark:hover:text-[#3390ec] transition-colors cursor-pointer shrink-0"
              title="Глобальный поиск сообщений (FTS)"
            >
              <IconWorld size={18} />
            </button>
          )}
        </div>

        {/* Stories / Active Contacts Circular Row (Hidden in compact icon mode) */}
        {!isCompactSidebar && (
          <div className="px-3 py-1 flex items-center gap-3 overflow-x-auto no-scrollbar border-b border-slate-100 dark:border-white/5 pb-2">
            {rooms.filter(r => r.type === 'direct').map((room) => {
              const peerId = room.participants.find(p => p !== currentUser) as UserId | undefined;
              const isOnline = peerId ? onlineStatus[peerId] : false;
              const name = peerId ? (getUserDisplayName(peerId) || USER_NAMES[peerId] || room.name) : room.name;
              const avatarUrl = peerId ? getUserAvatar(peerId) : undefined;
              const isSelected = room.id === activeRoomId;

              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => {
                    setActiveRoomId(room.id);
                    setMobileView('chat');
                  }}
                  className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
                  title={name}
                >
                  <div className={`relative p-0.5 rounded-full ${isSelected ? 'ring-2 ring-[#3390ec]' : ''}`}>
                    {avatarUrl ? (
                      <img 
                        src={avatarUrl} 
                        alt={name} 
                        className="w-12 h-12 rounded-full object-cover shadow-xs" 
                      />
                    ) : (
                      <div className={`w-12 h-12 rounded-full ${getRoomColor(room)} text-white flex items-center justify-center text-sm font-bold shadow-xs`}>
                        {name.charAt(0)}
                      </div>
                    )}
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#17212b]" />
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate max-w-[56px] text-center">
                    {name}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Folder Tabs (All chats) */}
        {!isCompactSidebar && (
          <div className="px-3 pt-2 pb-1 flex items-center gap-2 text-xs font-semibold select-none">
            <div className="px-3 py-1 rounded-full bg-[#3390ec] text-white flex items-center gap-1.5 shadow-xs">
              <span>Все</span>
              <span className="text-[10px] bg-white/20 px-1 rounded-full">{rooms.length}</span>
            </div>
          </div>
        )}

        {/* Chat List Items */}
        <div className={`flex-1 overflow-y-auto ${isCompactSidebar ? 'px-1 py-1 space-y-1' : 'px-1.5 py-1 space-y-0.5'}`}>
          {/* Prompt to search messages across all chats */}
          {!isCompactSidebar && roomFilterQuery.trim() && (
            <button
              type="button"
              onClick={() => setShowGlobalSearchModal(true)}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-[#3390ec]/10 hover:bg-[#3390ec]/20 border border-[#3390ec]/30 text-[#3390ec] transition-all cursor-pointer text-left mb-1.5 shadow-xs"
            >
              <div className="w-9 h-9 rounded-full bg-[#3390ec] text-white flex items-center justify-center text-xs font-bold shadow-md shadow-[#3390ec]/20 shrink-0">
                🔍
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold truncate text-slate-900 dark:text-white">
                  Искать «{roomFilterQuery}»
                </div>
                <div className="text-[10.5px] text-slate-500 dark:text-slate-400">
                  Полнотекстовый поиск по сообщениям
                </div>
              </div>
            </button>
          )}

          {filteredRooms.map((room) => {
            const isActive = room.id === activeRoomId;
            const peerId = room.type === 'direct' ? room.participants.find(p => p !== currentUser) as UserId | undefined : null;
            const isOnline = room.type === 'direct' ? (peerId ? onlineStatus[peerId] : false) : false;
            const avatarUrl = peerId ? getUserAvatar(peerId) : undefined;

            const lastMsg = lastMessageOf(room.id);
            const count = unreadCount(room.id);

            const roomTyping = typingUsers[room.id] || {};
            const isTypingInRoom = Object.keys(roomTyping).some(u => u !== currentUser);

            return (
              <button
                key={room.id}
                type="button"
                onClick={() => {
                  setActiveRoomId(room.id);
                  setMobileView('chat');
                  setReplyingToMessage(null);
                  setSearchQuery('');
                  setIsSearching(false);
                  setSelectedFile(null);
                }}
                title={getRoomDisplayName(room)}
                className={`w-full flex items-center transition-colors cursor-pointer select-none ${
                  isCompactSidebar 
                    ? 'justify-center p-1.5 rounded-2xl relative' 
                    : 'gap-3 p-2.5 rounded-xl text-left'
                } ${isActive
                  ? (isCompactSidebar ? 'bg-[#3390ec]/15 dark:bg-[#3390ec]/25 text-[#3390ec]' : 'bg-[#3390ec] text-white shadow-xs')
                  : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-800 dark:text-slate-200'
                }`}
              >
                {/* Avatar */}
                <div className={`relative shrink-0 ${isCompactSidebar && isActive ? 'ring-2 ring-[#3390ec] rounded-full' : ''}`}>
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt={getRoomDisplayName(room)} 
                      className={`${isCompactSidebar ? 'w-11 h-11' : 'w-12 h-12'} rounded-full object-cover shadow-xs`} 
                    />
                  ) : (
                    <div className={`${isCompactSidebar ? 'w-11 h-11' : 'w-12 h-12'} rounded-full flex items-center justify-center text-sm font-bold ${
                      isActive && !isCompactSidebar ? 'bg-white/20 text-white' : `${getRoomColor(room)} text-white`
                    }`}>
                      {room.type === 'group' ? (
                        <IconUsers size={isCompactSidebar ? 18 : 20} />
                      ) : (
                        getRoomDisplayName(room).charAt(0).toUpperCase()
                      )}
                    </div>
                  )}

                  {room.type === 'direct' && isOnline && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#17212b]" />
                  )}

                  {/* Compact mode unread badge on top-right of avatar */}
                  {isCompactSidebar && count > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-[#3390ec] text-white shadow-xs border-2 border-white dark:border-[#17212b]">
                      {count}
                    </span>
                  )}
                </div>

                {/* Details (Hidden in compact icon mode) */}
                {!isCompactSidebar && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-[14px] truncate block ${isActive ? 'font-bold text-white' : 'font-semibold text-slate-900 dark:text-white'}`}>
                        {getRoomDisplayName(room)}
                      </span>
                      {lastMsg && (
                        <span className={`text-[11.5px] font-mono ml-1 shrink-0 ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                          {getLastMessageTime(lastMsg)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-0.5 gap-2">
                      {isTypingInRoom ? (
                        <span className={`text-xs font-semibold flex items-center gap-1.5 truncate ${isActive ? 'text-white' : 'text-[#3390ec]'}`}>
                          <span className="inline-flex gap-0.5 items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" />
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:0.2s]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:0.4s]" />
                          </span>
                          <span>печатает...</span>
                        </span>
                      ) : (
                        <div className="flex-1 min-w-0">
                          {(() => {
                            if (!lastMsg) {
                              if (room.type === 'group') {
                                return <span className={`text-[13px] truncate block ${isActive ? 'text-white/80' : 'text-slate-400'}`}>Группа семьи</span>;
                              }
                              return (
                                <span className={`text-[13px] truncate block ${isActive ? 'text-white/80' : isOnline ? 'text-emerald-500 font-medium' : 'text-slate-400'}`}>
                                  {isOnline ? 'в сети' : 'был(а) недавно'}
                                </span>
                              );
                            }

                            const isSelf = lastMsg.sender === currentUser;
                            const isRead = (lastMsg.readBy || []).some((u) => u !== currentUser);

                            const cleanText = (lastMsg.text || '')
                              .replace(/^[\u200B\s]*\[fwd:[^\]]+\][\u200B\s]*/g, '')
                              .replace(/^\[Переслано от [^\]]+\]:\s*/, '')
                              .trim();

                            const senderPrefix = isSelf 
                              ? 'Вы: ' 
                              : (room.type === 'group' ? `${getUserDisplayName(lastMsg.sender) || USER_NAMES[lastMsg.sender] || lastMsg.sender}: ` : '');

                            return (
                              <div className="flex items-center gap-1 min-w-0 text-[13px] truncate">
                                {isSelf && (
                                  <span className="shrink-0 inline-flex items-center mr-0.5">
                                    {isRead ? (
                                      <IconChecks size={14} className={isActive ? 'text-white' : 'text-[#3390ec] dark:text-[#70b1ff]'} />
                                    ) : (
                                      <IconCheck size={14} className={isActive ? 'text-white/70' : 'text-slate-400'} />
                                    )}
                                  </span>
                                )}

                                {senderPrefix && (
                                  <span className={`shrink-0 font-medium ${isActive ? 'text-white' : isSelf ? 'text-slate-800 dark:text-slate-200' : 'text-[#3390ec] dark:text-[#70b1ff]'}`}>
                                    {senderPrefix}
                                  </span>
                                )}

                                {cleanText ? (
                                  <span className={`truncate ${isActive ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'}`}>
                                    {cleanText}
                                  </span>
                                ) : lastMsg.file ? (
                                  lastMsg.file.type === 'image' ? (
                                    <span className={`inline-flex items-center gap-1 ${isActive ? 'text-white/90' : 'text-[#3390ec] dark:text-[#70b1ff]'}`}>
                                      <IconPhoto size={14} className="shrink-0" />
                                      <span>Фотография</span>
                                    </span>
                                  ) : lastMsg.file.type === 'video' ? (
                                    <span className={`inline-flex items-center gap-1 ${isActive ? 'text-white/90' : 'text-[#3390ec] dark:text-[#70b1ff]'}`}>
                                      <IconVideo size={14} className="shrink-0" />
                                      <span>Видео</span>
                                    </span>
                                  ) : lastMsg.file.type === 'sticker' || (lastMsg.file.name && lastMsg.file.name.includes('sticker')) ? (
                                    <span className={`inline-flex items-center gap-1 ${isActive ? 'text-white/90' : 'text-amber-500'}`}>
                                      <IconMoodSmile size={14} className="shrink-0" />
                                      <span>Стикер</span>
                                    </span>
                                  ) : lastMsg.file.type === 'video_note' ? (
                                    <span className={`inline-flex items-center gap-1 ${isActive ? 'text-white/90' : 'text-[#3390ec] dark:text-[#70b1ff]'}`}>
                                      <IconCamera size={14} className="shrink-0" />
                                      <span>Видеосообщение</span>
                                    </span>
                                  ) : lastMsg.file.type === 'audio' ? (
                                    <span className={`inline-flex items-center gap-1 ${isActive ? 'text-white/90' : 'text-emerald-500'}`}>
                                      <IconMicrophone size={14} className="shrink-0" />
                                      <span>Голосовое</span>
                                    </span>
                                  ) : (
                                    <span className={`inline-flex items-center gap-1 truncate ${isActive ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'}`}>
                                      <IconFileText size={14} className="shrink-0" />
                                      <span className="truncate">{lastMsg.file.name || 'Вложение'}</span>
                                    </span>
                                  )
                                ) : lastMsg.sticker ? (
                                  <span className={`inline-flex items-center gap-1 ${isActive ? 'text-white/90' : 'text-amber-500'}`}>
                                    <IconMoodSmile size={14} className="shrink-0" />
                                    <span>Стикер</span>
                                  </span>
                                ) : (
                                  <span className={`truncate ${isActive ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'}`}>
                                    Сообщение
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {count > 0 && (
                        <span className={`shrink-0 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold ${isActive ? 'bg-white text-[#3390ec]' : 'bg-[#3390ec] text-white'
                          }`}>
                          {count}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Draggable Divider Handle between Sidebar and Chat (Telegram Desktop behavior) */}
      <div
        onMouseDown={startResizingSidebar}
        onTouchStart={startResizingSidebar}
        className={`hidden md:flex relative w-1 hover:w-2 active:w-2 group cursor-col-resize z-10 transition-all items-center justify-center shrink-0 -ml-0.5 select-none ${
          isResizingSidebar ? 'w-2' : ''
        }`}
        title="Потяните, чтобы изменить ширину списка чатов"
      >
        <div
          className={`w-[1px] h-full transition-colors pointer-events-none ${
            isResizingSidebar
              ? 'bg-[#3390ec] w-[2px]'
              : 'bg-slate-200/80 dark:bg-white/10 group-hover:bg-[#3390ec] group-hover:w-[2px]'
          }`}
        />
      </div>

      {/* Global Drag Overlay to prevent iframe/mouse trapping while resizing */}
      {isResizingSidebar && (
        <div
          className="fixed inset-0 z-[99999] cursor-col-resize select-none pointer-events-auto"
          onMouseMove={(e) => {
            const maxAllowed = Math.min(MAX_SIDEBAR_WIDTH, window.innerWidth * 0.6);
            let newWidth: number;
            if (e.clientX < SNAP_THRESHOLD) {
              newWidth = COMPACT_SIDEBAR_WIDTH;
            } else {
              newWidth = Math.max(MIN_EXPANDED_WIDTH, Math.min(e.clientX, maxAllowed));
            }
            setSidebarWidth(newWidth);
          }}
          onMouseUp={() => {
            setIsResizingSidebar(false);
            localStorage.setItem('tg_sidebar_width', sidebarWidth.toString());
          }}
        />
      )}

      {/* 2. Main Center Chat Panel: Telegram Wallpaper & Bubbles */}
      <main
        className={`flex-1 min-w-0 w-full max-w-full flex flex-col h-full tg-chat-canvas transition-transform duration-150 relative overflow-hidden ${mobileView === 'chat'
          ? 'translate-x-0 flex'
          : '-translate-x-full md:translate-x-0 absolute md:relative z-10 w-full h-full hidden md:flex'
          }`}
      >
        {/* Dynamic Wallpaper Background Layer */}
        <div 
          className="absolute inset-0 pointer-events-none transition-all duration-300 overflow-hidden"
          style={getChatBackgroundStyle()}
        />

        {/* Dimming overlay for photo wallpapers and custom uploads */}
        {((themeConfig.wallpaperId === 'custom' && themeConfig.customWallpaper) || Boolean(getWallpaperById(themeConfig.wallpaperId).imageUrl)) && (
          <div 
            className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-200"
            style={{
              opacity: (
                themeConfig.wallpaperId === 'custom'
                  ? (themeConfig.customWallpaper?.dimming ?? 20)
                  : (getWallpaperById(themeConfig.wallpaperId).dimming ?? 20)
              ) / 100
            }}
          />
        )}

        {/* Telegram Chat Header or Top Selection Action Bar */}
        <header className="px-3 sm:px-4 py-2 tg-header flex items-center justify-between z-10 select-none shadow-xs min-h-[56px] w-full min-w-0 max-w-full">
          {isSelectMode ? (
            <div className="w-full min-w-0 flex items-center justify-between animate-pop-in">
              {/* Left: Cancel Cross Button & Counter */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsSelectMode(false);
                    setSelectedMessageIds(new Set());
                  }}
                  className="p-1.5 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                  title="Отменить (Esc)"
                >
                  <IconX size={22} />
                </button>

                <span className="text-[15px] font-bold text-slate-900 dark:text-white">
                  Выбрано: {selectedMessageIds.size}
                </span>
              </div>

              {/* Right: Group Action Buttons */}
              <div className="flex items-center gap-1">
                {/* Pin */}
                <button
                  type="button"
                  onClick={() => {
                    const firstId = Array.from(selectedMessageIds)[0];
                    if (firstId) {
                      togglePinMessage(firstId);
                      setIsSelectMode(false);
                      setSelectedMessageIds(new Set());
                    }
                  }}
                  disabled={selectedMessageIds.size === 0}
                  className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer transition-colors"
                  title="Закрепить"
                >
                  <IconPin size={20} />
                </button>

                {/* Copy */}
                <button
                  type="button"
                  onClick={() => {
                    const texts = activeMessages
                      .filter(m => selectedMessageIds.has(m.id) && m.text)
                      .map(m => m.text)
                      .join('\n\n');
                    if (texts) {
                      navigator.clipboard.writeText(texts);
                      showToast('Текст скопирован в буфер');
                    }
                  }}
                  disabled={selectedMessageIds.size === 0}
                  className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer transition-colors"
                  title="Копировать"
                >
                  <IconCopy size={20} />
                </button>

                {/* Forward */}
                <button
                  type="button"
                  onClick={() => {
                    const firstSelected = activeMessages.find(m => selectedMessageIds.has(m.id));
                    if (firstSelected) {
                      setForwardingMessage(firstSelected);
                    }
                  }}
                  disabled={selectedMessageIds.size === 0}
                  className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer transition-colors"
                  title="Переслать"
                >
                  <IconShare3 size={20} />
                </button>

                {/* Delete */}
                <button
                  type="button"
                  onClick={handleDeleteSelectedAnimated}
                  disabled={selectedMessageIds.size === 0}
                  className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 disabled:opacity-30 cursor-pointer transition-colors"
                  title="Удалить"
                >
                  <IconTrash size={20} />
                </button>
              </div>
            </div>
          ) : isSearching ? (
            /* Ultra-clean Telegram / iOS Minimalist Search Bar */
            <div className="w-full min-w-0 flex items-center gap-2">
              {/* Minimalist Search Input Capsule */}
              <div className="flex-1 min-w-0 flex items-center gap-2 bg-slate-100 dark:bg-[#242f3d] px-3 py-1.5 rounded-full border border-transparent focus-within:border-[#3390ec]/50 transition-all">
                <IconSearch size={16} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Поиск в чате..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (e.shiftKey) handlePrevMatch();
                      else handleNextMatch();
                    }
                  }}
                  className="bg-transparent border-none text-[13.5px] text-slate-900 dark:text-white focus:outline-none w-full min-w-0 placeholder-slate-400"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-slate-400 hover:text-slate-200 cursor-pointer p-0.5 shrink-0"
                    title="Очистить"
                  >
                    <IconX size={14} />
                  </button>
                )}

                {/* Match Counter & Quick Navigation */}
                {filteredMessages.length > 0 && (searchQuery.trim() || activeChatFiltersCount > 0) && (
                  <div className="flex items-center gap-0.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0 border-l border-slate-300 dark:border-white/10 pl-1.5">
                    <span>{currentMatchIndex + 1}/{filteredMessages.length}</span>
                    <button
                      type="button"
                      onClick={handlePrevMatch}
                      className="p-0.5 hover:text-[#3390ec] cursor-pointer"
                      title="Предыдущее"
                    >
                      <IconChevronUp size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextMatch}
                      className="p-0.5 hover:text-[#3390ec] cursor-pointer"
                      title="Следующее"
                    >
                      <IconChevronDown size={13} />
                    </button>
                  </div>
                )}
              </div>

              {/* Cancel Button */}
              <button
                type="button"
                onClick={() => {
                  setIsSearching(false);
                  setSearchQuery('');
                  setChatFilters({});
                }}
                className="text-xs sm:text-[13px] font-medium text-[#3390ec] hover:text-[#3390ec]/80 px-1 py-1 cursor-pointer shrink-0 transition-colors whitespace-nowrap"
              >
                Отмена
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowUserInfo(!showUserInfo)}>
                {/* Mobile back */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMobileView('list');
                  }}
                  className="p-1 rounded-full text-slate-500 hover:text-[#3390ec] cursor-pointer md:hidden"
                >
                  <IconChevronLeft size={24} />
                </button>

                {/* Contact Avatar */}
                {activeRoom && (
                  <div className="relative">
                    {activePeerAvatar ? (
                      <img 
                        src={activePeerAvatar} 
                        alt="Avatar" 
                        className="w-10 h-10 rounded-full object-cover shadow-xs ring-2 ring-[#3390ec]/20" 
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full ${getRoomColor(activeRoom)} text-white flex items-center justify-center text-sm font-bold shadow-xs`}>
                        {activeRoom.type === 'group' ? <IconUsers size={20} /> : getRoomDisplayName(activeRoom).charAt(0).toUpperCase()}
                      </div>
                    )}
                    {activeRoom.type === 'direct' && isPeerOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#17212b]" />
                    )}
                  </div>
                )}

                <div>
                  <h2 className="text-[15px] font-bold text-slate-900 dark:text-white m-0 leading-tight">
                    {activeRoom ? getRoomDisplayName(activeRoom) : ''}
                  </h2>
                  <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {isSomeoneTyping ? (
                      <span className="text-[#3390ec] font-semibold">печатает...</span>
                    ) : activeRoom?.type === 'direct' ? (
                      isPeerOnline ? <span className="text-[#3390ec] font-semibold">в сети</span> : 'был(а) недавно'
                    ) : (
                      `${activeRoom?.participants.length || 0} участников`
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsSearching(true);
                  }}
                  className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                  title="Поиск в чате (Ctrl+F)"
                >
                  <IconSearch size={20} />
                </button>

                {activeRoom?.type === 'direct' && (
                  <>
                    <button
                      type="button"
                      onClick={() => startCall('audio')}
                      className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                      title="Аудиозвонок"
                    >
                      <IconPhone size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={() => startCall('video')}
                      className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                      title="Видеозвонок"
                    >
                      <IconVideo size={20} />
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setShowThemeModal(true)}
                  className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                  title="Обои и оформление чата"
                >
                  <IconPalette size={20} />
                </button>

                <button
                  type="button"
                  onClick={() => setShowUserInfo(!showUserInfo)}
                  className={`p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors ${showUserInfo ? 'text-[#3390ec]' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  title="Информация"
                >
                  <IconDotsVertical size={20} />
                </button>
              </div>
            </>
          )}
        </header>

        {/* Minimalist Horizontal Filter Tabs */}
        {isSearching && (
          <div className="w-full max-w-full min-w-0 px-2.5 sm:px-3 py-1.5 bg-white/95 dark:bg-[#17212b]/95 border-b border-slate-200/60 dark:border-white/5 backdrop-blur-md flex items-center gap-1.5 overflow-x-auto no-scrollbar z-20 select-none">
            <button
              type="button"
              onClick={() => setChatFilters({})}
              className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer ${
                activeChatFiltersCount === 0
                  ? 'bg-[#3390ec] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              Все
            </button>

            <button
              type="button"
              onClick={() => {
                const isMedia = chatFilters.attachmentTypes?.includes('image') || chatFilters.attachmentTypes?.includes('video');
                setChatFilters(prev => ({
                  ...prev,
                  attachmentTypes: isMedia ? undefined : ['image', 'video'],
                  hasAttachments: isMedia ? undefined : true,
                }));
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer ${
                chatFilters.attachmentTypes?.includes('image') || chatFilters.attachmentTypes?.includes('video')
                  ? 'bg-[#3390ec] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              Медиа
            </button>

            <button
              type="button"
              onClick={() => {
                const isDoc = chatFilters.attachmentTypes?.includes('document');
                setChatFilters(prev => ({
                  ...prev,
                  attachmentTypes: isDoc ? undefined : ['document'],
                  hasAttachments: isDoc ? undefined : true,
                }));
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer ${
                chatFilters.attachmentTypes?.includes('document')
                  ? 'bg-[#3390ec] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              Файлы
            </button>

            <button
              type="button"
              onClick={() => {
                const isAudio = chatFilters.attachmentTypes?.includes('audio');
                setChatFilters(prev => ({
                  ...prev,
                  attachmentTypes: isAudio ? undefined : ['audio'],
                  hasAttachments: isAudio ? undefined : true,
                }));
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer ${
                chatFilters.attachmentTypes?.includes('audio')
                  ? 'bg-[#3390ec] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              Голосовые
            </button>

            <button
              type="button"
              onClick={() => handleDatePreset('today')}
              className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer ${
                Boolean(chatFilters.dateRange?.startDate)
                  ? 'bg-[#3390ec] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              Сегодня
            </button>

            <button
              type="button"
              onClick={() => setShowGlobalSearchModal(true)}
              className="ml-auto px-2.5 py-1 rounded-full text-xs text-slate-500 dark:text-slate-400 hover:text-[#3390ec] dark:hover:text-[#3390ec] shrink-0 transition-colors flex items-center gap-1 cursor-pointer font-medium"
            >
              <IconWorld size={14} />
              <span className="hidden sm:inline">Во всех чатах</span>
              <span className="sm:hidden">Везде</span>
            </button>
          </div>
        )}

        {/* Pinned Message Banner */}
        {currentPinnedMessage && (
          <div
            onClick={() => {
              jumpToMessage(currentPinnedMessage.id);
            }}
            className="px-4 py-1.5 bg-white/95 dark:bg-[#17212b]/95 border-b border-slate-200 dark:border-white/10 flex items-center justify-between cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors z-20 backdrop-blur-md animate-pop-in select-none shadow-xs w-full min-w-0"
          >
            <div className="flex items-center gap-2.5 min-w-0 border-l-[3px] border-[#3390ec] pl-2.5">
              <div className="min-w-0">
                <span className="text-[11.5px] font-bold text-[#3390ec] block">Закреплённое сообщение</span>
                <span className="text-[12px] text-slate-700 dark:text-slate-300 truncate block">
                  {getCleanMessageText(currentPinnedMessage)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePinMessage(currentPinnedMessage.id);
              }}
              className="p-1 rounded-full text-slate-400 hover:text-rose-500 cursor-pointer shrink-0"
              title="Открепить"
            >
              <IconX size={16} />
            </button>
          </div>
        )}

        {/* Telegram Chat Message Stream */}
        <section
          ref={messageFeedRef}
          onScroll={handleScroll}
          className="flex-1 min-w-0 w-full max-w-full overflow-y-auto overflow-x-hidden px-2.5 sm:px-6 py-3"
        >
          <div key={activeRoomId} className="max-w-2xl mx-auto w-full min-w-0 max-w-full flex flex-col min-h-full">
            {/* Top flexible spacer to anchor small chats cleanly without flexbox justify-end scroll jumping */}
            <div className="flex-1 min-h-0" />
            {slicedMessages.map((message, index) => {
              const isSelf = message.sender === currentUser;
              const senderName = isSelf ? 'Вы' : USER_NAMES[message.sender];
              const parentMessage = message.replyToId ? messageMap.get(message.replyToId) || null : null;

              const prevMessage = index > 0 ? slicedMessages[index - 1] : null;
              const showDateSeparator = !prevMessage ||
                new Date(prevMessage.timestamp).toDateString() !== new Date(message.timestamp).toDateString();

              const isSameSender = prevMessage && prevMessage.sender === message.sender && !showDateSeparator;
              const showSenderLabel = activeRoom?.type === 'group' && !isSameSender;

              return (
                <React.Fragment key={message.id}>
                  {showDateSeparator && (
                    <div className="flex justify-center my-2.5 select-none">
                      <span className="px-3 py-0.5 rounded-full text-[12px] font-semibold tg-date-pill shadow-xs">
                        {formatSeparatorDate(message.timestamp)}
                      </span>
                    </div>
                  )}
                  <div id={`msg-${message.id}`} className={isSameSender ? 'mt-0.5' : 'mt-1.5'}>
                    <MessageBubble
                      message={message}
                      isSelf={isSelf}
                      senderName={senderName}
                      showSenderLabel={showSenderLabel}
                      onReply={setReplyingToMessage}
                      onOpenContextMenu={(msg, pos) => {
                        if (isSelectMode) {
                          setSelectedMessageIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(msg.id)) next.delete(msg.id);
                            else next.add(msg.id);
                            return next;
                          });
                          return;
                        }
                        setContextMenuTarget({ message: msg, x: pos.x, y: pos.y, isSelf: msg.sender === currentUser });
                      }}
                      parentMessage={parentMessage}
                      currentUser={currentUser}
                      deleteMessage={deleteMessage}
                      editMessage={editMessage}
                      toggleReaction={toggleReaction}
                      roomParticipantCount={activeRoom?.participants.length || 0}
                      searchQuery={searchQuery}
                      isSelectMode={isSelectMode}
                      isSelected={selectedMessageIds.has(message.id)}
                      onToggleSelect={(id) => {
                        setSelectedMessageIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(id)) next.delete(id);
                          else next.add(id);
                          return next;
                        });
                      }}
                      onJumpToMessage={jumpToMessage}
                    />
                  </div>
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </section>

        {/* Telegram Bottom Input Bar */}
        <footer className="p-2 sm:p-3 relative z-10 w-full min-w-0 max-w-full">
          <div className="max-w-2xl mx-auto w-full min-w-0 max-w-full flex flex-col gap-1.5 relative">

            {/* 1. Selected File Preview Bar (Telegram Style Floating Glassmorphic Pill) */}
            {selectedFile && (
              <div className="w-full bg-white/95 dark:bg-[#17212b]/95 backdrop-blur-md rounded-2xl p-2 sm:p-2.5 flex items-center justify-between shadow-xl border border-slate-200/80 dark:border-white/10 animate-pop-in">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  {selectedFile.type === 'image' ? (
                    <img src={selectedFile.data} className="w-11 h-11 rounded-xl object-cover shadow-xs border border-slate-200/50 dark:border-white/10 shrink-0" alt="preview" />
                  ) : selectedFile.type === 'video' ? (
                    <div className="w-11 h-11 rounded-xl bg-black relative overflow-hidden flex items-center justify-center shrink-0 shadow-xs border border-slate-200/50 dark:border-white/10">
                      <video src={selectedFile.data} className="w-full h-full object-cover" muted playsInline />
                      <span className="absolute bottom-0.5 right-0.5 text-[8px] bg-black/80 text-white px-1 rounded-xs font-mono font-bold">
                        {selectedFile.orientation === 'vertical' ? '9:16' : '16:9'}
                      </span>
                    </div>
                  ) : selectedFile.type === 'audio' ? (
                    <div className="w-11 h-11 rounded-xl bg-[#3390ec] flex items-center justify-center text-white text-lg shadow-xs shrink-0">
                      🎤
                    </div>
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-slate-200 dark:bg-white/10 text-[#3390ec] flex items-center justify-center text-lg shadow-xs shrink-0">
                      📄
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white truncate block">{selectedFile.name}</span>
                      {selectedFile.type === 'video' && selectedFile.orientation === 'vertical' && (
                        <span className="text-[9px] bg-[#3390ec]/20 text-[#3390ec] font-medium px-1 rounded-xs shrink-0">📱 Вертикальное</span>
                      )}
                    </div>
                    <span className="text-[10.5px] text-slate-400 dark:text-slate-500 font-mono block">
                      {selectedFile.size > 1024 * 1024 
                        ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} МБ` 
                        : `${(selectedFile.size / 1024).toFixed(1)} КБ`}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors shrink-0"
                  title="Удалить прикрепленный файл"
                >
                  <IconX size={18} />
                </button>
              </div>
            )}

            {/* 2. Editing Message Bar */}
            {editingMessage && (
              <div className="w-full bg-white/95 dark:bg-[#17212b]/95 backdrop-blur-md rounded-2xl p-2 sm:p-2.5 flex items-center justify-between shadow-xl border-l-[4px] border-amber-500 border-slate-200/80 dark:border-white/10 animate-pop-in">
                <div className="min-w-0 pl-1 flex items-center gap-2">
                  <IconEdit size={16} className="text-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-amber-500 block">
                      Редактирование
                    </span>
                    <span className="text-xs text-slate-700 dark:text-slate-300 truncate block mt-0.5">
                      {editingMessage.text}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingMessage(null);
                    setInputText('');
                  }}
                  className="p-1.5 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                  title="Отменить"
                >
                  <IconX size={16} />
                </button>
              </div>
            )}

            {/* 3. Reply Quote Bar */}
            {replyingToMessage && (
              <div className="w-full bg-white/95 dark:bg-[#17212b]/95 backdrop-blur-md rounded-2xl p-2 sm:p-2.5 flex items-center justify-between shadow-xl border-l-[4px] border-[#3390ec] border-slate-200/80 dark:border-white/10 animate-pop-in">
                <div className="min-w-0 pl-1">
                  <span className="text-[11px] font-bold text-[#3390ec] block">
                    Ответ для: {replyingToMessage.sender === currentUser ? 'Вы' : (USER_NAMES[replyingToMessage.sender] || replyingToMessage.sender)}
                  </span>
                  <span className="text-xs text-slate-700 dark:text-slate-300 truncate block mt-0.5">
                    {getCleanMessageText(replyingToMessage)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingToMessage(null)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                  title="Отменить ответ"
                >
                  <IconX size={16} />
                </button>
              </div>
            )}

            <div className="flex items-end gap-2 relative w-full">

            {/* Quick Emoji-to-Sticker Floating Bar (Telegram Style) */}
            {quickStickerSuggestions.length > 0 && !showEmojiPicker && (
              <div className="absolute bottom-full left-0 right-0 mb-2 z-30 animate-pop-in">
                <div className="p-2 bg-white/95 dark:bg-[#17212b]/95 rounded-2xl shadow-xl border border-slate-200 dark:border-white/10 flex items-center gap-2 overflow-x-auto tg-scrollbar select-none backdrop-blur-md">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1.5 shrink-0 flex items-center gap-1">
                    <span>✨</span>
                    <span>Стикеры:</span>
                  </span>
                  {quickStickerSuggestions.slice(0, 12).map((sticker) => (
                    <button
                      key={`quick-${sticker.id}`}
                      type="button"
                      onClick={() => {
                        handleSendSticker(sticker);
                        setInputText('');
                      }}
                      className="w-11 h-11 p-1 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 shrink-0 cursor-pointer transition-transform hover:scale-115 active:scale-95 flex items-center justify-center"
                      title={`${sticker.title} (${sticker.emoji})`}
                    >
                      <TgsStickerPlayer
                        src={sticker.url}
                        alt={sticker.title}
                        className="w-full h-full"
                        loop={true}
                        autoplay={true}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Emoji Popup Anchored Right Above Input Bar */}
            {showEmojiPicker && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowEmojiPicker(false)} 
                />
                <div 
                  className="absolute bottom-full right-0 sm:right-12 mb-2.5 z-50 animate-pop-in max-w-[calc(100vw-24px)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <TelegramEmojiPickerModal
                    onSelectEmoji={(emoji) => insertEmoji(emoji)}
                    onSelectSticker={(sticker) => handleSendSticker(sticker)}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                </div>
              </>
            )}

            {/* Input Capsule */}
            <form onSubmit={handleSend} className="flex-1 min-w-0 flex items-center min-h-[44px] sm:min-h-[46px] px-1.5 py-1 rounded-[22px] tg-input-capsule">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Clip */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-[#3390ec] cursor-pointer shrink-0 transition-colors rounded-full"
                title="Прикрепить"
              >
                <IconPaperclip size={20} />
              </button>

              {/* Input */}
              {isRecording ? (
                <div className="flex-1 flex items-center justify-between py-1.5 px-2 text-rose-500 font-semibold text-xs font-mono">
                  <span>Запись {formatRecordTime(recordTime)}</span>
                  <button
                    type="button"
                    onClick={() => stopRecording(false)}
                    className="text-slate-400 hover:text-rose-500 cursor-pointer text-xs uppercase"
                  >
                    Отмена
                  </button>
                </div>
              ) : (
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={inputText}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Сообщение..."
                  className="flex-1 py-0.5 px-2 bg-transparent border-none text-slate-900 dark:text-white text-[15px] focus:outline-none focus:ring-0 placeholder-slate-400 resize-none max-h-[160px] leading-[22px] tg-scrollbar self-center"
                  style={{ minHeight: '22px', height: '22px' }}
                />
              )}

              {/* Emoji */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-[#3390ec] cursor-pointer shrink-0 transition-colors rounded-full"
                title="Эмодзи"
              >
                <IconMoodSmile size={20} />
              </button>

              {/* Video Note Circle */}
              <button
                type="button"
                onClick={startVideoRecording}
                className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-[#3390ec] cursor-pointer shrink-0 transition-colors rounded-full"
                title="Видео-кружок"
              >
                <IconCamera size={20} />
              </button>
            </form>

            {/* Blue Circle Action Button (Mic / Video / Send) */}
            {!inputText.trim() && !selectedFile && !isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="w-[44px] h-[44px] sm:w-[46px] sm:h-[46px] rounded-full tg-btn-primary flex items-center justify-center shrink-0 shadow-md cursor-pointer transition-transform active:scale-95"
                title="Голосовое сообщение"
              >
                <IconMicrophone size={20} />
              </button>
            ) : isRecording ? (
              <button
                type="button"
                onClick={() => stopRecording(true)}
                className="w-[44px] h-[44px] sm:w-[46px] sm:h-[46px] rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-md cursor-pointer transition-transform active:scale-95"
                title="Отправить голосовое"
              >
                <IconSend size={20} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSend()}
                className="w-[44px] h-[44px] sm:w-[46px] sm:h-[46px] rounded-full tg-btn-primary flex items-center justify-center shrink-0 shadow-md cursor-pointer transition-transform active:scale-95"
                title="Отправить"
              >
                <IconSend size={20} />
              </button>
            )}

            </div>
          </div>
        </footer>
      </main>

      {/* 3. Right Sidebar: Telegram User Info Panel (Full-screen Drawer on Mobile, Inline on Desktop) */}
      {showUserInfo && (
        <>
          {/* Mobile Dark Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden animate-fade-in"
            onClick={() => setShowUserInfo(false)}
          />

          <aside className="fixed inset-0 z-50 w-full h-full md:relative md:inset-auto md:w-80 md:z-20 tg-user-panel flex flex-col shrink-0 overflow-y-auto shadow-2xl md:shadow-none animate-slide-in-right md:animate-pop-in">
            {/* Header */}
            <div className="p-3.5 sm:p-4 flex items-center justify-between border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-[#17212b]/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowUserInfo(false)}
                  className="min-h-[40px] min-w-[40px] p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 cursor-pointer flex items-center justify-center transition-all touch-manipulation"
                  title="Закрыть"
                >
                  <IconChevronLeft size={22} className="md:hidden" />
                  <IconX size={20} className="hidden md:block" />
                </button>
                <h3 className="text-base sm:text-sm font-bold text-slate-900 dark:text-white m-0">
                  Информация
                </h3>
              </div>
            </div>

            {/* Profile Card */}
            <div className="p-6 sm:p-5 flex flex-col items-center text-center border-b border-slate-200 dark:border-white/5">
              <div className="relative mb-3.5 sm:mb-3">
                {activePeerAvatar ? (
                  <img 
                    src={activePeerAvatar} 
                    alt="Avatar" 
                    className="w-28 h-28 sm:w-24 sm:h-24 rounded-full object-cover shadow-lg ring-4 ring-[#3390ec]/20" 
                  />
                ) : (
                  <div className={`w-28 h-28 sm:w-24 sm:h-24 rounded-full ${activeRoom ? getRoomColor(activeRoom) : 'bg-[#3390ec]'} text-white flex items-center justify-center text-4xl sm:text-3xl font-bold shadow-lg ring-4 ring-[#3390ec]/20`}>
                    {activeRoom ? (activeRoom.type === 'group' ? <IconUsers size={44} /> : getRoomDisplayName(activeRoom).charAt(0)) : '?'}
                  </div>
                )}
                {activePeerProfile?.statusEmoji && (
                  <span className="absolute -bottom-1 -right-1 w-8 h-8 sm:w-7 sm:h-7 rounded-full bg-white dark:bg-[#17212b] shadow-md flex items-center justify-center text-base sm:text-sm border-2 border-white dark:border-[#17212b]">
                    {activePeerProfile.statusEmoji}
                  </span>
                )}
              </div>

              <h2 className="text-lg sm:text-base font-bold text-slate-900 dark:text-white m-0 flex items-center gap-1.5 justify-center">
                <span>{activeRoom ? getRoomDisplayName(activeRoom) : ''}</span>
                {activePeerProfile?.statusEmoji && (
                  <span className="text-base sm:text-sm">{activePeerProfile.statusEmoji}</span>
                )}
              </h2>
              <span className="text-xs sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-0.5">
                {activePeerId ? (isPeerOnline ? 'в сети' : 'был(а) недавно') : `${activeRoom?.participants.length} участников`}
              </span>

              {/* Edit Profile button if viewing own profile */}
              {activePeerId === currentUser && (
                <button
                  type="button"
                  onClick={() => setShowProfileModal(true)}
                  className="mt-3.5 sm:mt-3 px-5 sm:px-4 py-2 sm:py-1.5 rounded-full bg-[#3390ec]/10 text-[#3390ec] hover:bg-[#3390ec]/20 active:scale-95 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 touch-manipulation"
                >
                  <IconEdit size={16} />
                  <span>Изменить профиль</span>
                </button>
              )}
            </div>

            {/* Details List */}
            <div className="p-5 sm:p-4 space-y-4 sm:space-y-4 text-sm sm:text-xs">
              {activePeerId && (
                <>
                  {/* Phone */}
                  <div className="flex items-center gap-3.5 sm:gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                      <IconPhoneCall size={18} className="text-[#3390ec]" />
                    </div>
                    <div>
                      <span className="text-slate-900 dark:text-white font-medium block text-sm sm:text-xs">
                        {activePeerProfile?.phoneNumber || '+7 (999) 000-00-00'}
                      </span>
                      <span className="text-[11px] sm:text-[10px] text-slate-400">Телефон</span>
                    </div>
                  </div>

                  {/* Username */}
                  <div className="flex items-center gap-3.5 sm:gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                      <IconUserCheck size={18} className="text-[#3390ec]" />
                    </div>
                    <div>
                      <span className="text-slate-900 dark:text-white font-medium block text-sm sm:text-xs">
                        @{activePeerProfile?.username || activePeerId}
                      </span>
                      <span className="text-[11px] sm:text-[10px] text-slate-400">Имя пользователя</span>
                    </div>
                  </div>

                  {/* Bio */}
                  {activePeerProfile?.bio && (
                    <div className="flex items-center gap-3.5 sm:gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                        <IconFileText size={18} className="text-[#3390ec]" />
                      </div>
                      <div>
                        <span className="text-slate-900 dark:text-white font-medium block text-sm sm:text-xs">
                          {activePeerProfile.bio}
                        </span>
                        <span className="text-[11px] sm:text-[10px] text-slate-400">О себе</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Notifications Toggle */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-3.5 sm:gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                    <IconBell size={18} className="text-[#3390ec]" />
                  </div>
                  <span className="text-slate-900 dark:text-white font-medium text-sm sm:text-xs">Уведомления</span>
                </div>
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  className="w-5 h-5 sm:w-4 sm:h-4 text-[#3390ec] rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Shared Media Tabs */}
            <div className="flex-1 p-5 sm:p-4 border-t border-slate-100 dark:border-white/5 overflow-y-auto">
              <span className="text-xs sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
                Общие медиа
              </span>
              <div className="grid grid-cols-3 gap-2 sm:gap-1.5">
                {activeMessages.filter(m => m.file?.type === 'image').slice(-6).map((m) => (
                  <img
                    key={m.id}
                    src={m.file?.data}
                    alt="shared"
                    className="w-full aspect-square object-cover rounded-xl sm:rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                  />
                ))}
              </div>
            </div>
          </aside>
        </>
      )}

      {/* WebRTC Calling Overlay */}
      {callSession && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center text-white select-none animate-pop-in">

          {callSession.status === 'active' && callSession.type === 'audio' && (
            <div style={{ position: 'absolute', width: 0, height: 0, opacity: 0, overflow: 'hidden' }}>
              <audio ref={remoteAudioRef} autoPlay playsInline />
              <audio ref={localAudioRef} autoPlay muted playsInline />
            </div>
          )}

          <div className="w-full max-w-sm p-6 flex flex-col items-center justify-center gap-5">
            <div className="flex flex-col items-center gap-2.5">
              <div className="w-20 h-20 rounded-full bg-[#3390ec] flex items-center justify-center text-3xl font-bold select-none uppercase shadow-lg">
                {activeRoom ? getRoomDisplayName(activeRoom).charAt(0) : '?'}
              </div>
              <h2 className="text-xl font-bold text-white mt-1">
                {activeRoom ? getRoomDisplayName(activeRoom) : 'Собеседник'}
              </h2>
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                {callSession.status === 'calling' && 'Исходящий вызов...'}
                {callSession.status === 'incoming' && `Входящий ${callSession.type === 'video' ? 'видеовызов' : 'аудиовызов'}...`}
                {callSession.status === 'active' && `Разговор (${callSession.type === 'video' ? 'Видео' : 'Аудио'})`}
              </span>
            </div>

            {callSession.status === 'active' && callSession.type === 'video' && (
              <div className="w-full aspect-video rounded-2xl overflow-hidden relative bg-black shadow-xl border border-white/10">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 right-2 w-1/3 aspect-video rounded-xl overflow-hidden bg-black shadow-md border border-white/20">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center gap-4 mt-4">
              {callSession.status === 'incoming' ? (
                <>
                  <button
                    type="button"
                    onClick={rejectCall}
                    className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg cursor-pointer"
                  >
                    <IconPhoneOff size={22} />
                  </button>
                  <button
                    type="button"
                    onClick={acceptCall}
                    className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg cursor-pointer"
                  >
                    <IconPhone size={22} />
                  </button>
                </>
              ) : (
                <>
                  {callSession.status === 'active' && (
                    <button
                      type="button"
                      onClick={toggleMute}
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer ${isMuted ? 'bg-rose-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                    >
                      <IconMicrophone size={20} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={endCall}
                    className="w-14 h-14 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg cursor-pointer"
                  >
                    <IconPhoneOff size={22} />
                  </button>

                  {callSession.status === 'active' && callSession.type === 'video' && (
                    <button
                      type="button"
                      onClick={toggleCamera}
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer ${isCameraOff ? 'bg-rose-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                    >
                      <IconVideo size={20} />
                    </button>
                  )}
                </>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Video Circle Record Modal */}
      {isRecordingVideo && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex flex-col items-center justify-center select-none animate-pop-in">
          <div className="p-6 tg-header rounded-3xl flex flex-col items-center gap-4 max-w-[280px] shadow-2xl border border-slate-200 dark:border-white/10">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Видео-кружок
            </span>

            <div className="w-40 h-40 rounded-full overflow-hidden border-3 border-[#3390ec] bg-black shadow-lg relative">
              <video
                ref={videoPreviewRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover scale-x-[-1]"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                {formatRecordTime(videoRecordTime)}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full mt-1">
              <button
                type="button"
                onClick={() => stopVideoRecording(false)}
                className="flex-1 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => stopVideoRecording(true)}
                className="flex-1 py-2 text-xs font-bold rounded-xl tg-btn-primary cursor-pointer shadow-xs"
              >
                Отправить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Open on Phone QR Code Modal */}
      {showQrModal && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 select-none animate-pop-in"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="w-full max-w-[360px] tg-header rounded-3xl p-6 flex flex-col items-center text-center shadow-2xl border border-slate-200 dark:border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className="flex items-center gap-2">
                <IconQrcode size={20} className="text-[#3390ec]" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white m-0">
                  Открыть на телефоне
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <IconX size={20} />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Отсканируйте QR-код камерой телефона или откройте ссылку в браузере:
            </p>

            {/* QR Code Image */}
            <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-100 mb-3 flex items-center justify-center">
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https://mobiles-plots-voluntary-via.trycloudflare.com"
                alt="QR Code to open chat"
                className="w-44 h-44 rounded-lg block"
              />
            </div>

            {/* Global HTTPS Cloudflare Link */}
            <div className="w-full flex items-center gap-2 p-2 rounded-xl bg-slate-100 dark:bg-[#242f3d] mb-2">
              <span className="text-[11px] font-mono text-slate-800 dark:text-slate-200 truncate flex-1 text-left px-1 select-all">
                https://mobiles-plots-voluntary-via.trycloudflare.com
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText('https://mobiles-plots-voluntary-via.trycloudflare.com');
                  setIsUrlCopied(true);
                  setTimeout(() => setIsUrlCopied(false), 2000);
                }}
                className="p-1.5 rounded-lg tg-btn-primary cursor-pointer shrink-0 transition-all flex items-center gap-1 text-[11px] font-semibold text-white"
                title="Скопировать ссылку"
              >
                {isUrlCopied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                <span>{isUrlCopied ? 'Скопировано' : 'Копия'}</span>
              </button>
            </div>

            {/* Wi-Fi local fallback link */}
            <div className="w-full text-left text-[10px] text-slate-400 font-mono mb-3 px-1">
              Локально по Wi-Fi: <a href="https://192.168.0.9:5173" target="_blank" rel="noreferrer" className="text-[#3390ec] underline">https://192.168.0.9:5173</a>
            </div>

            {/* User Passwords reminder */}
            <div className="w-full text-left bg-black/5 dark:bg-white/5 rounded-xl p-3 text-[11px] space-y-1">
              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Пароли для входа:
              </span>
              <div className="grid grid-cols-2 gap-1 text-slate-600 dark:text-slate-400 font-mono">
                <div>Влад: <b className="text-[#3390ec]">vladpass</b></div>
                <div>Аня: <b className="text-pink-500">anyapass</b></div>
                <div>Мама: <b className="text-amber-500">mompass</b></div>
                <div>Папа: <b className="text-sky-500">dadpass</b></div>
                <div>Сестра: <b className="text-emerald-500">sispass</b></div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Global Singleton Telegram Context Menu Modal */}
      {contextMenuTarget && (
        <TelegramContextMenuModal
          message={contextMenuTarget.message}
          x={contextMenuTarget.x}
          y={contextMenuTarget.y}
          isSelf={contextMenuTarget.isSelf}
          isPinned={activeRoomId ? pinnedMessages[activeRoomId] === contextMenuTarget.message.id : false}
          currentUser={currentUser}
          onClose={() => setContextMenuTarget(null)}
          onReply={(msg) => {
            setReplyingToMessage(msg);
            setEditingMessage(null);
            setContextMenuTarget(null);
          }}
          onPin={(msg) => {
            togglePinMessage(msg.id);
            setContextMenuTarget(null);
          }}
          onCopy={(msg) => {
            if (msg.text) {
              navigator.clipboard.writeText(msg.text);
              showToast('Текст скопирован в буфер обмена');
            } else if (msg.file) {
              navigator.clipboard.writeText(msg.file.name);
              showToast('Имя файла скопировано');
            }
            setContextMenuTarget(null);
          }}
          onEdit={(msg) => {
            setReplyingToMessage(null);
            setEditingMessage(msg);
            setInputText(msg.text || '');
            textareaRef.current?.focus();
            setContextMenuTarget(null);
          }}
          onForward={(msg) => {
            setForwardingMessage(msg);
            setContextMenuTarget(null);
          }}
          onDelete={(msg) => {
            handleDeleteMessageAnimated(msg.id);
            showToast('Сообщение удалено');
            setContextMenuTarget(null);
          }}
          onSelect={(msg) => {
            setIsSelectMode(true);
            setSelectedMessageIds(new Set([msg.id]));
            showToast('Режим выделения активен');
            setContextMenuTarget(null);
          }}
          onMarkRead={(_msg) => {
            showToast('Сообщение прочитано');
            setContextMenuTarget(null);
          }}
          onToggleReaction={(msgId, emoji) => {
            toggleReaction(msgId, emoji);
            setContextMenuTarget(null);
          }}
        />
      )}

      {/* Telegram Forward Message Modal */}
      {forwardingMessage && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-backdrop select-none"
          onClick={() => setForwardingMessage(null)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-[#17212b] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 p-4 flex flex-col gap-3 animate-pop-in text-slate-900 dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
              <span className="font-bold text-sm">Переслать сообщение</span>
              <button
                type="button"
                onClick={() => setForwardingMessage(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <IconX size={18} />
              </button>
            </div>

            {/* Preview */}
            <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border-l-2 border-[#3390ec] text-xs text-slate-600 dark:text-slate-300 truncate">
              {forwardingMessage.text || '📎 Вложение'}
            </div>

            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
              Выберите чат:
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
              {rooms.map((room) => {
                const name = getRoomDisplayName(room);
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => handleForwardToRoom(room.id)}
                    className="w-full p-2 rounded-2xl flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors text-left"
                  >
                    <div className={`w-9 h-9 rounded-full ${getRoomColor(room)} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                      {name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-xs text-slate-900 dark:text-white truncate block">{name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{room.type === 'direct' ? 'Личный чат' : 'Группа'}</span>
                    </div>
                    <IconShare3 size={16} className="text-slate-400 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification (Telegram Style with Action Button) */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#17212b]/95 dark:bg-[#242f3d]/95 text-white px-4 py-2.5 rounded-full shadow-2xl text-xs font-medium backdrop-blur-md border border-white/10 animate-pop-in select-none flex items-center gap-3">
          <span>{toast.text}</span>
          {toast.actionLabel && toast.onAction && (
            <button
              type="button"
              onClick={() => {
                toast.onAction?.();
                setToast(null);
              }}
              className="text-[#3390ec] dark:text-[#70b1ff] font-bold hover:underline cursor-pointer pl-1 shrink-0"
            >
              {toast.actionLabel}
            </button>
          )}
        </div>
      )}

      {/* Selection Mode Bottom Action Bar (1:1 with Telegram Web) */}
      {isSelectMode && (
        <div className="fixed bottom-3 inset-x-3 sm:inset-x-6 z-40 max-w-2xl mx-auto bg-white/98 dark:bg-[#17212b]/98 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 px-4 py-2.5 flex items-center justify-between animate-pop-in select-none backdrop-blur-md">
          {/* Left: Red Trash */}
          <button
            type="button"
            onClick={handleDeleteSelectedAnimated}
            disabled={selectedMessageIds.size === 0}
            className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-500/10 disabled:opacity-30 cursor-pointer transition-colors"
            title="Удалить"
          >
            <IconTrash size={20} />
          </button>

          {/* Center: Selected count text */}
          <span className="text-[13.5px] font-medium text-slate-800 dark:text-slate-200">
            {getSelectedText(selectedMessageIds.size)}
          </span>

          {/* Right: Copy & Forward */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const texts = activeMessages
                  .filter(m => selectedMessageIds.has(m.id) && m.text)
                  .map(m => m.text)
                  .join('\n');
                if (texts) {
                  navigator.clipboard.writeText(texts);
                  showToast('Скопировано в буфер');
                }
              }}
              disabled={selectedMessageIds.size === 0}
              className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer transition-colors"
              title="Копировать"
            >
              <IconCopy size={20} />
            </button>
            <button
              type="button"
              onClick={() => {
                const firstSelected = activeMessages.find(m => selectedMessageIds.has(m.id));
                if (firstSelected) {
                  setForwardingMessage(firstSelected);
                }
              }}
              disabled={selectedMessageIds.size === 0}
              className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer transition-colors"
              title="Переслать"
            >
              <IconShare3 size={20} />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSelectMode(false);
                setSelectedMessageIds(new Set());
              }}
              className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors ml-1"
              title="Закрыть"
            >
              <IconX size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Profile Edit Modal */}
      {showProfileModal && (
        <ProfileEditModal
          onClose={() => setShowProfileModal(false)}
          onToast={showToast}
        />
      )}

      {/* Global Message Search Suite Modal */}
      {showGlobalSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full h-full md:h-[80vh] md:max-w-xl bg-white dark:bg-[#17212b] md:rounded-3xl md:border md:border-slate-200 dark:md:border-white/10 md:shadow-2xl flex flex-col overflow-hidden">
            <SearchPage
              roomId={activeRoomId || undefined}
              userId={currentUser || 'vlad'}
              allMessages={messages}
              rooms={rooms}
              userProfiles={userProfiles}
              onNavigateToMessage={(item) => {
                const targetRoomId = item.room_id || item.roomId;
                const targetMessageId = item.id;
                setShowGlobalSearchModal(false);
                setMobileView('chat');

                // Clear in-chat search & filter state so the conversation context is unobstructed
                setIsSearching(false);
                setSearchQuery('');
                setChatFilters({});

                if (targetRoomId && targetRoomId !== activeRoomId) {
                  pendingNavigateMessageIdRef.current = targetMessageId;
                  setActiveRoomId(targetRoomId);
                } else {
                  jumpToMessage(targetMessageId);
                }
              }}
              onClose={() => setShowGlobalSearchModal(false)}
            />
          </div>
        </div>
      )}

      {/* Advanced Filter Modal */}
      {showAdvancedSearchModal && (
        <AdvancedSearchModal
          isOpen={showAdvancedSearchModal}
          filters={{
            startDate: chatFilters.dateRange?.startDate || undefined,
            endDate: chatFilters.dateRange?.endDate || undefined,
            senderId: chatFilters.senders?.[0] || undefined,
            contentType: chatFilters.attachmentTypes?.[0] || undefined,
            hasAttachments: chatFilters.hasAttachments || false,
          }}
          onClose={() => setShowAdvancedSearchModal(false)}
          onApplyFilters={(applied) => {
            setChatFilters((prev) => ({
              ...prev,
              dateRange: applied.startDate || applied.endDate ? { startDate: applied.startDate, endDate: applied.endDate } : undefined,
              senders: applied.senderId ? [applied.senderId] : undefined,
              attachmentTypes: applied.contentType ? [applied.contentType as any] : undefined,
              hasAttachments: applied.hasAttachments || undefined,
            }));
          }}
        />
      )}

      {/* Theme & Wallpaper Settings Modal */}
      {showThemeModal && (
        <ThemeSettingsModal
          currentConfig={themeConfig}
          isDark={darkMode}
          onSave={(newConfig) => {
            setThemeConfig(newConfig);
            showToast('Тема и обои успешно обновлены');
          }}
          onClose={() => setShowThemeModal(false)}
        />
      )}

    </div>
  );
};
