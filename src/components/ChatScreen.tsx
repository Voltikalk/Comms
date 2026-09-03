import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { useSocket } from '../context/SocketContext';
import { USER_NAMES } from '../constants';
import type { Room, UserId, Message } from '../types';
import { DEFAULT_THEME_CONFIG, getWallpaperById, getAccentColorById } from '../constants/wallpapers';
import type { ChatThemeConfig } from '../types/theme.types';
import { applyFilters, type FilterOptions } from '../lib/filter-utils';
import {
  getActiveToken,
  buildMentionCandidates,
  filterMentionCandidates,
  type ActiveToken,
  type MentionCandidate
} from '../lib/mentions';
import { triggerTelegramDisintegrate } from './effects/disintegrate';
import { findStickersByEmoji } from '../constants/stickers';
import { createAudioLiveAnalyser, normalizeWaveform, type AudioLiveAnalyser } from '../lib/audio-waveform';
import type { Sticker } from '../types/sticker.types';
import { usePlatform } from '../context/PlatformContext';
import { DesktopTitleBar } from './Desktop/DesktopTitleBar';
import type { MobileTab } from './Mobile/MobileBottomNav';
import type { ChatFolderId, FolderCountInfo } from './Navigation/ChatFolderTabs';
import { Squares, Aurora, Particles, LetterGlitch, Hyperspeed, Waves, Dither } from './Backgrounds';
import {
  ChatSidebar,
  ChatHeader,
  ChatMessageFeed,
  ChatInputBar,
  ChatModalsHost,
  ChatUserInfoPanel
} from './Chat';

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

const isSavedMessagesRoom = (room: Room) => room.id === 'saved-messages' || room.id === 'saved';

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
    isConnected,
    messages,
    activeMessages,
    logout,
    sendMessage,
    forwardMessage,
    deleteMessage,
    editMessage,
    toggleReaction,
    votePoll,
    closePoll,
    typingUsers,
    sendTypingStatus,
    unreadCount,
    lastMessageOf,
    notificationsEnabled,
    setNotificationsEnabled,

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

  const {
    isDesktopView,
    triggerHaptic,
    setShowShortcutsModal,
    setShowInstallModal,
  } = usePlatform();

  const [mobileTab, setMobileTab] = useState<MobileTab>('chats');
  const [activeFolder, setActiveFolder] = useState<ChatFolderId>('all');
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  const [inputText, setInputText] = useState('');
  const [roomFilterQuery, setRoomFilterQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
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

  // Helper for room display name
  const getRoomDisplayName = useCallback((room: Room) => {
    if (isSavedMessagesRoom(room)) return 'Избранное';
    if (room.type === 'direct') {
      const peerId = room.participants.find(p => p !== currentUser) as UserId | undefined;
      return peerId ? (getUserDisplayName(peerId) || USER_NAMES[peerId] || peerId) : room.name;
    }
    return room.name;
  }, [currentUser, getUserDisplayName]);

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

  const totalUnreadCount = useMemo(() => {
    return rooms.reduce((acc, r) => acc + unreadCount(r.id), 0);
  }, [rooms, unreadCount]);

  // Dynamic counts for each folder tab
  const folderCounts = useMemo<Record<ChatFolderId, FolderCountInfo>>(() => {
    let allUnread = 0;
    let directTotal = 0;
    let directUnread = 0;
    let groupsTotal = 0;
    let groupsUnread = 0;
    let unreadTotal = 0;
    let unreadUnread = 0;
    let savedTotal = 0;
    let savedUnread = 0;

    rooms.forEach((r) => {
      const u = unreadCount(r.id);
      allUnread += u;
      const isSaved = isSavedMessagesRoom(r);
      const isDirect = r.type === 'direct';
      const isGroup = r.type === 'group';

      if (isSaved) {
        savedTotal++;
        savedUnread += u;
      } else if (isDirect) {
        directTotal++;
        directUnread += u;
      } else if (isGroup) {
        groupsTotal++;
        groupsUnread += u;
      }

      if (u > 0) {
        unreadTotal++;
        unreadUnread += u;
      }
    });

    return {
      all: { total: rooms.length, unread: allUnread },
      direct: { total: directTotal, unread: directUnread },
      groups: { total: groupsTotal, unread: groupsUnread },
      unread: { total: unreadTotal, unread: unreadUnread },
      saved: { total: savedTotal, unread: savedUnread },
    };
  }, [rooms, unreadCount]);

  // Filtered rooms list by folder tab AND search in sidebar
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      // 1. Folder tab filter
      if (activeFolder === 'direct') {
        if (r.type !== 'direct' || isSavedMessagesRoom(r)) return false;
      } else if (activeFolder === 'groups') {
        if (r.type !== 'group') return false;
      } else if (activeFolder === 'unread') {
        if (unreadCount(r.id) <= 0) return false;
      } else if (activeFolder === 'saved') {
        if (!isSavedMessagesRoom(r)) return false;
      }

      // 2. Query search filter
      if (!roomFilterQuery.trim()) return true;
      const name = getRoomDisplayName(r);
      return name.toLowerCase().includes(roomFilterQuery.toLowerCase());
    });
  }, [rooms, activeFolder, roomFilterQuery, unreadCount, getRoomDisplayName]);

  const handleMobileTabSelect = (tab: MobileTab) => {
    setMobileTab(tab);
    if (tab === 'chats') {
      setActiveFolder('all');
      setMobileView('list');
    } else if (tab === 'stories') {
      setIsStoryCreateOpen(true);
    } else if (tab === 'search') {
      setShowCommandPalette(true);
    } else if (tab === 'rooms') {
      setActiveFolder('groups');
      setMobileView('list');
    } else if (tab === 'settings') {
      setShowThemeModal(true);
    }
  };

  // Edge-swipe navigation for mobile (swipe from left edge to return to chat list)
  const edgeTouchStartX = useRef<number | null>(null);
  const edgeTouchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    edgeTouchStartX.current = e.touches[0].clientX;
    edgeTouchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (edgeTouchStartX.current === null || edgeTouchStartY.current === null) return;
    const diffX = e.changedTouches[0].clientX - edgeTouchStartX.current;
    const diffY = e.changedTouches[0].clientY - edgeTouchStartY.current;

    // Trigger edge swipe if started near left edge (< 48px) and swiped right (> 50px)
    if (edgeTouchStartX.current < 48 && diffX > 50 && Math.abs(diffY) < 60) {
      if (mobileView === 'chat') {
        triggerHaptic('light');
        setMobileView('list');
      }
    }
    edgeTouchStartX.current = null;
    edgeTouchStartY.current = null;
  };

  const getChatBackgroundStyle = (): React.CSSProperties => {
    const wp = getWallpaperById(themeConfig.wallpaperId);
    const blur = themeConfig.customWallpaper?.blur ?? (themeConfig.wallpaperId === 'custom' ? 0 : (wp.blur ?? 0));
    const filterStyle = blur > 0 ? `blur(${blur}px)` : undefined;
    const transformStyle = blur > 0 ? 'scale(1.12)' : undefined;

    if (themeConfig.wallpaperId === 'custom' && themeConfig.customWallpaper?.imageUrl) {
      return {
        backgroundImage: `url("${themeConfig.customWallpaper.imageUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        filter: filterStyle,
        transform: transformStyle
      };
    }

    if (wp.imageUrl) {
      return {
        backgroundImage: `url("${wp.imageUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        filter: filterStyle,
        transform: transformStyle
      };
    }

    const bgCss = darkMode ? wp.backgroundCssDark : wp.backgroundCssLight;

    if (wp.patternSvg) {
      return {
        backgroundImage: `${wp.patternSvg}, ${bgCss}`,
        backgroundSize: '160px 160px, 100% 100%',
        backgroundRepeat: 'repeat, no-repeat',
        filter: filterStyle,
        transform: transformStyle
      };
    }

    return {
      backgroundImage: bgCss,
      backgroundSize: '100% 100%',
      filter: filterStyle,
      transform: transformStyle
    };
  };

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
  const [globalSearchSeed, setGlobalSearchSeed] = useState<string | undefined>(undefined);
  const [showPollModal, setShowPollModal] = useState(false);
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

  // Global Keyboard Shortcuts (Desktop / Power User Navigation Suite)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + K or Cmd + K: Command Palette (Spotlight)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        triggerHaptic('selection');
        setShowCommandPalette((prev) => !prev);
        return;
      }

      // Alt + Up: Previous chat in filtered list
      if (e.altKey && e.key === 'ArrowUp') {
        e.preventDefault();
        triggerHaptic('selection');
        const currentIdx = filteredRooms.findIndex((r) => r.id === activeRoomId);
        if (currentIdx > 0) {
          setActiveRoomId(filteredRooms[currentIdx - 1].id);
          setMobileView('chat');
        } else if (filteredRooms.length > 0) {
          setActiveRoomId(filteredRooms[filteredRooms.length - 1].id);
          setMobileView('chat');
        }
        return;
      }

      // Alt + Down: Next chat in filtered list
      if (e.altKey && e.key === 'ArrowDown') {
        e.preventDefault();
        triggerHaptic('selection');
        const currentIdx = filteredRooms.findIndex((r) => r.id === activeRoomId);
        if (currentIdx !== -1 && currentIdx < filteredRooms.length - 1) {
          setActiveRoomId(filteredRooms[currentIdx + 1].id);
          setMobileView('chat');
        } else if (filteredRooms.length > 0) {
          setActiveRoomId(filteredRooms[0].id);
          setMobileView('chat');
        }
        return;
      }

      // Alt + 1..5: Chat Folder Switching
      if (e.altKey && /^[1-5]$/.test(e.key)) {
        e.preventDefault();
        triggerHaptic('selection');
        const folders: ChatFolderId[] = ['all', 'direct', 'groups', 'unread', 'saved'];
        const target = folders[parseInt(e.key, 10) - 1];
        if (target) setActiveFolder(target);
        return;
      }

      // Ctrl + /: Keyboard shortcuts cheat sheet
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        triggerHaptic('selection');
        setShowShortcutsModal(true);
        return;
      }

      // Ctrl + ,: Theme & Settings
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        triggerHaptic('selection');
        setShowThemeModal(true);
        return;
      }

      // Ctrl + 1..9: Chat Switching by Index
      if ((e.ctrlKey || e.metaKey) && /^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (rooms[idx]) {
          e.preventDefault();
          triggerHaptic('selection');
          setActiveRoomId(rooms[idx].id);
          setMobileView('chat');
        }
        return;
      }

      // Hierarchical Escape
      if (e.key === 'Escape') {
        if (showCommandPalette) {
          e.preventDefault();
          setShowCommandPalette(false);
          return;
        }
        if (showGlobalSearchModal) {
          e.preventDefault();
          setShowGlobalSearchModal(false);
          return;
        }
        if (showEmojiPicker) {
          e.preventDefault();
          setShowEmojiPicker(false);
          return;
        }
        if (editingMessage) {
          e.preventDefault();
          setEditingMessage(null);
          setInputText('');
          return;
        }
        if (replyingToMessage) {
          e.preventDefault();
          setReplyingToMessage(null);
          return;
        }
        if (isSearching) {
          e.preventDefault();
          setIsSearching(false);
          setSearchQuery('');
          return;
        }
        if (mobileView === 'chat' && !isDesktopView) {
          e.preventDefault();
          setMobileView('list');
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    rooms,
    filteredRooms,
    activeRoomId,
    showCommandPalette,
    showGlobalSearchModal,
    showEmojiPicker,
    editingMessage,
    replyingToMessage,
    isSearching,
    mobileView,
    isDesktopView,
    triggerHaptic,
    setShowShortcutsModal,
    setActiveRoomId,
  ]);

  // Media Gallery and Formatting Toolbar states
  const [activeGalleryMediaId, setActiveGalleryMediaId] = useState<string | null>(null);
  const [formattingToolbar, setFormattingToolbar] = useState<{
    isVisible: boolean;
    position: { top: number; left: number };
  } | null>(null);

  const handleTextSelection = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setFormattingToolbar(null);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start !== end && end - start > 0) {
      const rect = textarea.getBoundingClientRect();
      setFormattingToolbar({
        isVisible: true,
        position: {
          top: Math.max(10, rect.top - 8),
          left: Math.min(window.innerWidth - 120, Math.max(120, rect.left + rect.width / 2)),
        },
      });
    } else {
      setFormattingToolbar(null);
    }
  }, []);

  const applyFormatting = useCallback((tagOpen: string, tagClose: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = inputTextRef.current;

    if (start !== end) {
      const selectedText = currentText.substring(start, end);
      const newText = currentText.substring(0, start) + tagOpen + selectedText + tagClose + currentText.substring(end);
      setInputText(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tagOpen.length, end + tagOpen.length);
      }, 0);
    } else {
      const newText = currentText.substring(0, start) + tagOpen + tagClose + currentText.substring(end);
      setInputText(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tagOpen.length, start + tagOpen.length);
      }, 0);
    }
    setFormattingToolbar(null);
  }, []);

  // Stories Modal States
  const [activeStoryViewerUser, setActiveStoryViewerUser] = useState<string | null>(null);
  const [isStoryCreateOpen, setIsStoryCreateOpen] = useState(false);

  const showToast = useCallback((
    textOrConfig: string | { text: string; actionLabel?: string; onAction?: () => void }
  ) => {
    if (typeof textOrConfig === 'string') {
      setToast({ text: textOrConfig });
    } else {
      setToast(textOrConfig);
    }
    setTimeout(() => setToast(null), 3500);
  }, []);

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
    waveform?: number[];
    duration?: number;
  } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [liveVolumeLevels, setLiveVolumeLevels] = useState<number[]>([]);
  const [inputActionMode, setInputActionMode] = useState<'voice' | 'video'>('voice');
  const [isVoiceLocked, setIsVoiceLocked] = useState(false);
  const [isVoicePaused, setIsVoicePaused] = useState(false);
  const [voiceDragOffset, setVoiceDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [recordedVoicePreview, setRecordedVoicePreview] = useState<{
    blob: Blob;
    url: string;
    waveform: number[];
    duration: number;
    mimeType: string;
  } | null>(null);

  const voiceStopActionRef = useRef<'send' | 'preview' | 'cancel'>('send');
  const voicePointerStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isVoiceHoldingRef = useRef(false);
  const voiceStartTimeRef = useRef<number>(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<any>(null);
  const audioAnalyserRef = useRef<AudioLiveAnalyser | null>(null);
  const rawAudioAmplitudesRef = useRef<number[]>([]);
  const audioVolumeIntervalRef = useRef<any>(null);

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
    setShowScrollDownBtn(false);
  }, [activeRoomId]);

  // ===== Per-chat Message Drafts (localStorage persistence like Telegram Desktop) =====
  const inputTextRef = useRef('');
  useEffect(() => {
    inputTextRef.current = inputText;
  }, [inputText]);

  // Reactive mirror of persisted drafts for chat list previews
  const [draftsMap, setDraftsMap] = useState<Record<string, string>>({});

  // Hydrate all saved drafts once on mount
  useEffect(() => {
    const map: Record<string, string> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('tg_draft_')) {
          map[key.slice('tg_draft_'.length)] = localStorage.getItem(key) || '';
        }
      }
    } catch { /* ignore */ }
    setDraftsMap(map);
  }, []);

  const persistDraft = useCallback((roomId: string | null, text: string) => {
    if (!roomId) return;
    const hasText = Boolean(text.trim());
    try {
      if (hasText) localStorage.setItem(`tg_draft_${roomId}`, text);
      else localStorage.removeItem(`tg_draft_${roomId}`);
    } catch { /* quota exceeded — ignore */ }
    setDraftsMap((prev) => {
      if (hasText && prev[roomId] === text) return prev;
      const next = { ...prev };
      if (hasText) next[roomId] = text;
      else delete next[roomId];
      return next;
    });
  }, []);

  // ===== Per-Chat Mute =====
  const [mutedRooms, setMutedRooms] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('tg_muted_rooms') || '{}');
    } catch {
      return {};
    }
  });

  const toggleRoomMute = useCallback((roomId: string) => {
    setMutedRooms((prev) => {
      const next = { ...prev, [roomId]: !prev[roomId] };
      try {
        localStorage.setItem('tg_muted_rooms', JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
    showToast(mutedRooms[roomId] ? 'Уведомления чата включены' : 'Чат отключён от уведомлений');
  }, [mutedRooms, showToast]);

  const prevDraftRoomRef = useRef<string | null>(null);

  useEffect(() => {
    const prevRoom = prevDraftRoomRef.current;

    let restored = '';
    if (activeRoomId) {
      try {
        restored = localStorage.getItem(`tg_draft_${activeRoomId}`) || '';
      } catch { /* ignore */ }
    }

    // Flush the previous room's draft synchronously before switching
    if (prevRoom && prevRoom !== activeRoomId) {
      persistDraft(prevRoom, prevRoom === activeRoomId ? restored : inputTextRef.current);
    }

    setInputText(restored);
    setMentionState(null);
    setDraftsMap((prev) => {
      if (restored.trim()) {
        return prev[activeRoomId || ''] === restored ? prev : { ...prev, [activeRoomId || '']: restored };
      }
      if (!prev[activeRoomId || '']) return prev;
      const next = { ...prev };
      delete next[activeRoomId || ''];
      return next;
    });
    prevDraftRoomRef.current = activeRoomId || null;
  }, [activeRoomId, persistDraft]);

  useEffect(() => {
    if (!activeRoomId || editingMessage) return;
    const timer = setTimeout(() => {
      persistDraft(activeRoomId, inputText);
    }, 400);
    return () => clearTimeout(timer);
  }, [inputText, activeRoomId, editingMessage, persistDraft]);

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
  }, [selectedMessageIds, deleteMessage, showToast]);

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

  // Media gallery collection for active room
  const roomMediaMessages = React.useMemo(() => {
    return activeMessages.filter(
      (m) =>
        m.file &&
        (m.file.type === 'image' ||
          m.file.type === 'video' ||
          m.file.type?.startsWith('image/') ||
          m.file.type?.startsWith('video/') ||
          /\.(jpg|jpeg|png|gif|webp|svg|mp4|webm|mov)$/i.test(m.file.name || ''))
    );
  }, [activeMessages]);

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
  const activeRoomTypingUsers = Object.keys(activeRoomTypingMap)
    .filter((u) => u !== currentUser)
    .map((u) => USER_NAMES[u as UserId] || u);

  const isInitialRoomLoadRef = useRef(true);
  const [showScrollDownBtn, setShowScrollDownBtn] = useState(false);

  const handleScroll = () => {
    if (!messageFeedRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messageFeedRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const nearBottom = distanceFromBottom < 150;
    isNearBottomRef.current = nearBottom;

    // Scroll-to-bottom FAB visibility
    setShowScrollDownBtn(distanceFromBottom > 350);

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
    updateMentionDetection(text);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionState && filteredMentions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionCursor((prev) => (prev + 1) % filteredMentions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionCursor((prev) => (prev - 1 + filteredMentions.length) % filteredMentions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applyMention(filteredMentions[mentionCursor]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setMentionState(null);
        return;
      }
    }
    // Rich text formatting hotkeys
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        applyFormatting('**', '**');
        return;
      }
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        applyFormatting('*', '*');
        return;
      }
      if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        applyFormatting('__', '__');
        return;
      }
      if (e.shiftKey && (e.key === 'X' || e.key === 'x')) {
        e.preventDefault();
        applyFormatting('~~', '~~');
        return;
      }
      if (e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        applyFormatting('||', '||');
        return;
      }
      if (e.shiftKey && (e.key === 'M' || e.key === 'm')) {
        e.preventDefault();
        applyFormatting('`', '`');
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
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
    persistDraft(activeRoomId || null, '');
    setInputText('');
    setMentionState(null);
    setReplyingToMessage(null);
    setSelectedFile(null);
    setShowEmojiPicker(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
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

  const handleCreatePoll = (poll: import('../types').Poll) => {
    sendMessage('', undefined, undefined, undefined, undefined, poll);
    setShowPollModal(false);
    showToast('Опрос создан');
  };

  const quickStickerSuggestions = React.useMemo(() => {
    const trimmed = inputText.trim();
    if (!trimmed || trimmed.length > 8) return [];
    return findStickersByEmoji(trimmed);
  }, [inputText]);

  // ===== @Mention Autocomplete =====
  const [mentionState, setMentionState] = useState<ActiveToken | null>(null);
  const [mentionCursor, setMentionCursor] = useState(0);

  const roomParticipantIds = activeRoom?.participants || [];
  const participantKey = roomParticipantIds.join(',');

  const mentionCandidates = React.useMemo(() => {
    return buildMentionCandidates(roomParticipantIds, { ...userProfiles });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantKey, userProfiles]);

  const filteredMentions = React.useMemo(() => {
    if (!mentionState || mentionState.type !== 'mention') return [];
    return filterMentionCandidates(mentionCandidates, mentionState.query);
  }, [mentionCandidates, mentionState]);

  const updateMentionDetection = (text: string) => {
    const caret = textareaRef.current?.selectionStart ?? text.length;
    const token = getActiveToken(text, caret);
    if (token && token.type === 'mention') {
      setMentionState(token);
      setMentionCursor(0);
    } else {
      setMentionState(null);
    }
  };

  const applyMention = (candidate: MentionCandidate) => {
    const caret = textareaRef.current?.selectionStart ?? inputText.length;
    const token = getActiveToken(inputText, caret) || mentionState;
    if (!token) return;
    const handle = candidate.profile?.username || candidate.userId;
    const nextText = `${inputText.slice(0, token.startIndex)}@${handle} ${inputText.slice(token.endIndex)}`;
    setInputText(nextText);
    setMentionState(null);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      const pos = token.startIndex + handle.length + 2;
      textareaRef.current?.setSelectionRange(pos, pos);
    });
  };

  const handleHashtagClick = useCallback((tag: string) => {
    setGlobalSearchSeed(tag);
    setShowGlobalSearchModal(true);
  }, []);

  // File selection & Drag&Drop attachment processing
  const acceptIncomingFile = useCallback((file: File) => {
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
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    acceptIncomingFile(file);
    e.target.value = '';
  };

  // ===== Full-Chat-Area Drag & Drop Attachments =====
  const dragDepthRef = useRef(0);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const handleChatDragEnter = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    dragDepthRef.current += 1;
    setIsDraggingFile(true);
  };

  const handleChatDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleChatDragLeave = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDraggingFile(false);
  };

  const handleChatDrop = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    dragDepthRef.current = 0;
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) acceptIncomingFile(file);
  };

  // Audio Note recording with Web Audio Waveform Capture & Slide-to-Cancel / Lock / Preview
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
      rawAudioAmplitudesRef.current = [];
      setLiveVolumeLevels([]);
      setIsVoiceLocked(false);
      setIsVoicePaused(false);
      setVoiceDragOffset({ x: 0, y: 0 });
      setRecordedVoicePreview(null);
      voiceStopActionRef.current = 'send';
      voiceStartTimeRef.current = Date.now();

      // Initialize real-time Web Audio Analyser
      const analyser = createAudioLiveAnalyser(stream);
      audioAnalyserRef.current = analyser;

      if (analyser) {
        audioVolumeIntervalRef.current = setInterval(() => {
          const vol = analyser.getInstantVolume();
          rawAudioAmplitudesRef.current.push(vol);
          setLiveVolumeLevels((prev) => [...prev.slice(-15), vol]);
        }, 90);
      }

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (audioVolumeIntervalRef.current) {
          clearInterval(audioVolumeIntervalRef.current);
          audioVolumeIntervalRef.current = null;
        }
        audioAnalyserRef.current?.close();
        audioAnalyserRef.current = null;

        const action = voiceStopActionRef.current;
        const actualMimeType = mediaRecorder.mimeType || mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
        const normalizedWaveform = normalizeWaveform(rawAudioAmplitudesRef.current, 30, 8, 100);
        const duration = Math.max(1, recordTime);

        if (action === 'send') {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result as string;
            const extension = actualMimeType.includes('mp4') ? 'mp4' : actualMimeType.includes('ogg') ? 'ogg' : actualMimeType.includes('aac') ? 'aac' : 'webm';
            sendMessage('', undefined, {
              name: `Голосовое сообщение.${extension}`,
              type: 'audio',
              data: base64,
              size: audioBlob.size,
              rawBlob: audioBlob,
              waveform: normalizedWaveform,
              duration
            });
          };
          reader.readAsDataURL(audioBlob);
          stream.getTracks().forEach((track) => track.stop());
        } else if (action === 'preview') {
          const previewUrl = URL.createObjectURL(audioBlob);
          setRecordedVoicePreview({
            blob: audioBlob,
            url: previewUrl,
            waveform: normalizedWaveform,
            duration,
            mimeType: actualMimeType
          });
          stream.getTracks().forEach((track) => track.stop());
        } else {
          // action === 'cancel'
          stream.getTracks().forEach((track) => track.stop());
        }
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

  const toggleVoicePause = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    if (mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      if (audioVolumeIntervalRef.current) clearInterval(audioVolumeIntervalRef.current);
      setIsVoicePaused(true);
      triggerHaptic('light');
    } else if (mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      recordIntervalRef.current = setInterval(() => {
        setRecordTime((t) => t + 1);
      }, 1000);
      if (audioAnalyserRef.current) {
        audioVolumeIntervalRef.current = setInterval(() => {
          const vol = audioAnalyserRef.current?.getInstantVolume() ?? 10;
          rawAudioAmplitudesRef.current.push(vol);
          setLiveVolumeLevels((prev) => [...prev.slice(-15), vol]);
        }, 90);
      }
      setIsVoicePaused(false);
      triggerHaptic('light');
    }
  };

  const stopRecording = (action: 'send' | 'preview' | 'cancel' = 'send') => {
    voiceStopActionRef.current = action;
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
    if (audioVolumeIntervalRef.current) {
      clearInterval(audioVolumeIntervalRef.current);
      audioVolumeIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsVoiceLocked(false);
    setIsVoicePaused(false);
    setVoiceDragOffset({ x: 0, y: 0 });
    setLiveVolumeLevels([]);
  };

  const sendRecordedVoicePreview = () => {
    if (!recordedVoicePreview) return;
    const { blob, mimeType, waveform, duration, url } = recordedVoicePreview;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const extension = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : mimeType.includes('aac') ? 'aac' : 'webm';
      sendMessage('', undefined, {
        name: `Голосовое сообщение.${extension}`,
        type: 'audio',
        data: base64,
        size: blob.size,
        rawBlob: blob,
        waveform,
        duration
      });
      URL.revokeObjectURL(url);
      setRecordedVoicePreview(null);
    };
    reader.readAsDataURL(blob);
  };

  const cancelRecordedVoicePreview = () => {
    if (recordedVoicePreview) {
      URL.revokeObjectURL(recordedVoicePreview.url);
      setRecordedVoicePreview(null);
    }
  };

  const handleVoicePointerDown = (e: React.PointerEvent) => {
    if (inputActionMode !== 'voice') return;
    if (e.button !== 0) return;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    voicePointerStartPosRef.current = { x: e.clientX, y: e.clientY };
    isVoiceHoldingRef.current = true;
    startRecording();
  };

  const handleVoicePointerMove = (e: React.PointerEvent) => {
    if (!isVoiceHoldingRef.current || !voicePointerStartPosRef.current || isVoiceLocked) return;
    const dx = e.clientX - voicePointerStartPosRef.current.x;
    const dy = e.clientY - voicePointerStartPosRef.current.y;
    setVoiceDragOffset({ x: dx, y: dy });

    if (dx < -80) {
      triggerHaptic('warning');
      isVoiceHoldingRef.current = false;
      stopRecording('cancel');
      return;
    }

    if (dy < -55) {
      triggerHaptic('success');
      setIsVoiceLocked(true);
      isVoiceHoldingRef.current = false;
      setVoiceDragOffset({ x: 0, y: 0 });
    }
  };

  const handleVoicePointerUp = (e: React.PointerEvent) => {
    if (!isVoiceHoldingRef.current) return;
    isVoiceHoldingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (!isVoiceLocked && isRecording) {
      const elapsedMs = Date.now() - voiceStartTimeRef.current;
      if (elapsedMs < 600) {
        setIsVoiceLocked(true);
      } else {
        stopRecording('send');
      }
    }
  };

  const formatRecordTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // Video Circle Note recording (up to 60 seconds)
  const startVideoRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Запись видео-кружков требует защищенного соединения (HTTPS или localhost).');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: {
          facingMode: 'user',
          width: { ideal: 480, max: 720 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 30, max: 30 }
        }
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

      const recorderOptions: MediaRecorderOptions = {
        mimeType: mimeType || undefined,
        videoBitsPerSecond: 1_200_000
      };

      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
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
            rawBlob: videoBlob,
            duration: videoRecordTime || 1
          });
        };
        reader.readAsDataURL(videoBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();

      videoIntervalRef.current = setInterval(() => {
        setVideoRecordTime((t) => {
          if (t >= 59) {
            stopVideoRecording(true);
            return 60;
          }
          return t + 1;
        });
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

  const getRoomColor = (room: Room) => {
    if (room.type === 'group') return 'bg-[#3390ec]';
    const peerId = room.participants.find(p => p !== currentUser) || '';
    return ROOM_AVATAR_COLORS[peerId] || 'bg-[#3390ec]';
  };

  const getCleanMessageText = useCallback((msg: Message | null, showSender = false): string => {
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
  }, [currentUser, getUserDisplayName]);

  const getLastMessageTime = (msg: Message | null) => {
    if (!msg) return '';
    const date = new Date(msg.timestamp);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getLastMessagePreview = useCallback((roomId: string) => {
    const draft = draftsMap[roomId];
    const lastMsg = lastMessageOf(roomId);

    if (draft && (!lastMsg || draft.trim())) {
      return {
        text: `Черновик: ${draft}`,
        time: lastMsg ? getLastMessageTime(lastMsg) : '',
        sender: currentUser || '',
        isMine: true,
        isPhoto: false,
        isVideo: false,
        isVoice: false,
        isFile: false,
        isSticker: false,
        isPoll: false
      };
    }

    if (!lastMsg) return null;

    const isMine = lastMsg.sender === currentUser;
    const time = getLastMessageTime(lastMsg);
    const text = getCleanMessageText(lastMsg);

    const isPhoto = Boolean(lastMsg.file && (lastMsg.file.type === 'image' || lastMsg.file.type?.startsWith('image/')));
    const isVideo = Boolean(lastMsg.file && (lastMsg.file.type === 'video' || lastMsg.file.type === 'video_note' || lastMsg.file.type?.startsWith('video/')));
    const isVoice = Boolean(lastMsg.file && (lastMsg.file.type === 'audio' || lastMsg.file.type?.startsWith('audio/')));
    const isFile = Boolean(lastMsg.file && !isPhoto && !isVideo && !isVoice);
    const isSticker = Boolean(lastMsg.sticker || (lastMsg.file && lastMsg.file.type === 'sticker'));
    const isPoll = Boolean(lastMsg.poll);

    return {
      text,
      time,
      sender: lastMsg.sender,
      isMine,
      isPhoto,
      isVideo,
      isVoice,
      isFile,
      isSticker,
      isPoll
    };
  }, [lastMessageOf, currentUser, draftsMap, getCleanMessageText]);

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

  const getRoomAvatar = useCallback((room: Room) => {
    if (room.type === 'direct') {
      const peerId = room.participants.find(p => p !== currentUser);
      return peerId ? (getUserAvatar(peerId as UserId) || (peerId === currentUser ? currentUserProfile?.avatarUrl : undefined)) : undefined;
    }
    return undefined;
  }, [currentUser, getUserAvatar, currentUserProfile]);

  const isRoomOnline = useCallback((room: Room) => {
    if (room.type !== 'direct') return false;
    const peerId = room.participants.find(p => p !== currentUser);
    return peerId ? Boolean(onlineStatus[peerId as UserId]) : false;
  }, [currentUser, onlineStatus]);

  const getRoomTypingUsers = useCallback((roomId: string) => {
    const roomTyping = typingUsers[roomId] || {};
    return Object.keys(roomTyping)
      .filter((u) => u !== currentUser)
      .map((u) => USER_NAMES[u as UserId] || u);
  }, [typingUsers, currentUser]);

  const handleClearCurrentChatHistory = useCallback(() => {
    if (!activeRoomId) return;
    if (window.confirm('Вы уверены, что хотите очистить историю этого чата?')) {
      activeMessages.forEach((m) => deleteMessage(m.id));
      showToast('История чата очищена');
    }
  }, [activeRoomId, activeMessages, deleteMessage, showToast]);

  const handleSearchQueryChange = useCallback((q: string) => {
    setSearchQuery(q);
    setCurrentMatchIndex(0);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent | { clientX: number; clientY: number; preventDefault?: () => void }, msg: Message) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (isSelectMode) {
      setSelectedMessageIds((prev) => {
        const next = new Set(prev);
        if (next.has(msg.id)) next.delete(msg.id);
        else next.add(msg.id);
        return next;
      });
      return;
    }
    setContextMenuTarget({
      message: msg,
      x: e.clientX,
      y: e.clientY,
      isSelf: msg.sender === currentUser
    });
  }, [isSelectMode, currentUser]);

  const handleNavigateFromGlobalSearch = useCallback((targetRoomId: string, targetMessageId?: string) => {
    setActiveRoomId(targetRoomId);
    setMobileView('chat');
    setShowGlobalSearchModal(false);
    if (targetMessageId) {
      setTimeout(() => jumpToMessage(targetMessageId), 150);
    }
  }, [jumpToMessage, setActiveRoomId]);

  const renderDynamicWallpaper = () => {
    const activeWp = getWallpaperById(themeConfig.wallpaperId);
    let wallpaperContent: React.ReactNode = null;
    if (activeWp.animatedType === 'squares') {
      wallpaperContent = (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <Squares speed={0.4} borderColor={darkMode ? 'rgba(51, 144, 236, 0.15)' : 'rgba(51, 144, 236, 0.25)'} />
        </div>
      );
    } else if (activeWp.animatedType === 'aurora') {
      wallpaperContent = (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <Aurora />
        </div>
      );
    } else if (activeWp.animatedType === 'particles') {
      wallpaperContent = (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <Particles particleCount={45} particleColor={darkMode ? '#3390ec' : '#2563eb'} />
        </div>
      );
    } else if (activeWp.animatedType === 'letter-glitch') {
      wallpaperContent = (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <LetterGlitch glitchSpeed={60} />
        </div>
      );
    } else if (activeWp.animatedType === 'hyperspeed') {
      wallpaperContent = (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <Hyperspeed speed={12} starCount={350} />
        </div>
      );
    } else if (activeWp.animatedType === 'waves') {
      wallpaperContent = (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <Waves waveAmpX={35} waveAmpY={22} lineColor={darkMode ? 'rgba(51, 144, 236, 0.22)' : 'rgba(51, 144, 236, 0.35)'} />
        </div>
      );
    } else if (activeWp.animatedType === 'dither') {
      wallpaperContent = (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <Dither colorA={darkMode ? '#080d1a' : '#e0e7ff'} colorB={darkMode ? '#3390ec' : '#6366f1'} />
        </div>
      );
    } else {
      wallpaperContent = (
        <div 
          className="absolute inset-0 pointer-events-none transition-all duration-300 overflow-hidden"
          style={getChatBackgroundStyle()}
        />
      );
    }

    const dimming = themeConfig.customWallpaper?.dimming ?? (
      themeConfig.wallpaperId === 'custom'
        ? 20
        : (getWallpaperById(themeConfig.wallpaperId).dimming ?? 0)
    );

    return (
      <>
        {wallpaperContent}
        {dimming > 0 && (
          <div 
            className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-200"
            style={{ opacity: dimming / 100 }}
          />
        )}
      </>
    );
  };

  return (
    <div
      className="flex flex-col h-dvh w-full overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Desktop Native Titlebar (Shown in Desktop mode) */}
      {isDesktopView && (
        <DesktopTitleBar
          onOpenSearch={() => setShowGlobalSearchModal(true)}
          onOpenThemeSettings={() => setShowThemeModal(true)}
          activeRoomName={activeRoom ? getRoomDisplayName(activeRoom) : undefined}
          activeRoomIsOnline={isPeerOnline}
          onOpenCommandPalette={() => setShowCommandPalette(true)}
        />
      )}

      {/* Main Split-View Workspace */}
      <div className="flex flex-1 w-full min-h-0 overflow-hidden relative">
        {/* 1. Left Sidebar: Telegram Chat List & Contacts */}
        <ChatSidebar
          isDesktopView={isDesktopView}
          mobileView={mobileView}
          mobileTab={mobileTab}
          onSelectMobileTab={handleMobileTabSelect}
          activeFolder={activeFolder}
          onSelectFolder={setActiveFolder}
          folderCounts={folderCounts}
          sidebarWidth={sidebarWidth}
          isResizingSidebar={isResizingSidebar}
          isCompactSidebar={isCompactSidebar}
          showMenuDropdown={showMenuDropdown}
          setShowMenuDropdown={setShowMenuDropdown}
          currentUserName={currentUserName}
          currentUserProfile={currentUserProfile}
          rooms={filteredRooms}
          activeRoomId={activeRoomId}
          onSelectRoom={(roomId) => {
            setActiveRoomId(roomId);
            setMobileView('chat');
          }}
          getRoomDisplayName={getRoomDisplayName}
          getRoomAvatar={getRoomAvatar}
          getRoomColor={getRoomColor}
          isRoomOnline={isRoomOnline}
          unreadCount={unreadCount}
          getLastMessagePreview={getLastMessagePreview}
          roomTypingUsers={getRoomTypingUsers}
          roomFilterQuery={roomFilterQuery}
          setRoomFilterQuery={setRoomFilterQuery}
          onOpenProfileModal={() => setShowProfileModal(true)}
          onOpenGlobalSearch={() => setShowGlobalSearchModal(true)}
          onOpenThemeModal={() => setShowThemeModal(true)}
          onOpenQrModal={() => setShowQrModal(true)}
          onOpenInstallModal={() => setShowInstallModal(true)}
          onOpenShortcutsModal={() => setShowShortcutsModal(true)}
          onOpenArchiveModal={() => setShowArchiveModal(true)}
          onOpenNewChatModal={() => setShowNewChatModal(true)}
          onClearHistory={handleClearCurrentChatHistory}
          onLogout={logout}
          onOpenStoryCreate={() => setIsStoryCreateOpen(true)}
          onOpenStoryViewer={(userId) => setActiveStoryViewerUser(userId)}
          startResizingSidebar={startResizingSidebar}
          totalUnreadCount={totalUnreadCount}
        />

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
          onDragEnter={handleChatDragEnter}
          onDragOver={handleChatDragOver}
          onDragLeave={handleChatDragLeave}
          onDrop={handleChatDrop}
          className={`flex-1 min-w-0 w-full max-w-full flex flex-col h-full tg-chat-canvas transition-transform duration-150 relative overflow-hidden ${
            mobileView === 'chat' || isDesktopView
              ? 'translate-x-0 flex'
              : '-translate-x-full md:translate-x-0 absolute md:relative z-10 w-full h-full hidden md:flex'
          }`}
        >
          {/* Dynamic Wallpaper Background Layer */}
          {renderDynamicWallpaper()}

          {/* Chat Header or Selection Action Bar */}
          <ChatHeader
            activeRoom={activeRoom}
            activeRoomDisplayName={activeRoom ? getRoomDisplayName(activeRoom) : ''}
            isPeerOnline={isPeerOnline}
            activeRoomTypingUsers={activeRoomTypingUsers}
            getRoomAvatar={getRoomAvatar}
            getRoomColor={getRoomColor}
            onBackToRooms={() => setMobileView('list')}
            isSelectMode={isSelectMode}
            selectedMessageIds={selectedMessageIds}
            onCancelSelectMode={() => {
              setIsSelectMode(false);
              setSelectedMessageIds(new Set());
            }}
            onPinSelected={() => {
              const firstId = Array.from(selectedMessageIds)[0];
              if (firstId) {
                togglePinMessage(firstId);
                setIsSelectMode(false);
                setSelectedMessageIds(new Set());
              }
            }}
            onCopySelected={() => {
              const texts = activeMessages
                .filter(m => selectedMessageIds.has(m.id))
                .map(m => m.text || (m.poll ? `📊 Опрос: ${m.poll.question}\n` + m.poll.options.map((o, i) => `${i + 1}. ${o.text}`).join('\n') : (m.file ? `📎 ${m.file.name}` : '')))
                .filter(Boolean)
                .join('\n\n');
              if (texts) {
                navigator.clipboard.writeText(texts);
                showToast('Скопировано в буфер');
              }
            }}
            onForwardSelected={() => {
              const firstSelected = activeMessages.find(m => selectedMessageIds.has(m.id));
              if (firstSelected) {
                setForwardingMessage(firstSelected);
              }
            }}
            onDeleteSelected={handleDeleteSelectedAnimated}
            isSearching={isSearching}
            searchQuery={searchQuery}
            onSearchQueryChange={handleSearchQueryChange}
            totalSearchMatches={filteredMessages.length}
            currentMatchIndex={currentMatchIndex}
            onPrevMatch={handlePrevMatch}
            onNextMatch={handleNextMatch}
            onCloseSearch={() => {
              setIsSearching(false);
              setSearchQuery('');
              setChatFilters({});
            }}
            onOpenGlobalSearch={() => setShowGlobalSearchModal(true)}
            chatFilters={chatFilters}
            setChatFilters={setChatFilters}
            handleDatePreset={handleDatePreset}
            onStartAudioCall={() => startCall('audio')}
            onStartVideoCall={() => startCall('video')}
            onStartSearching={() => setIsSearching(true)}
            isRoomMuted={activeRoomId ? Boolean(mutedRooms[activeRoomId]) : false}
            onToggleMute={() => activeRoomId && toggleRoomMute(activeRoomId)}
            onOpenThemeModal={() => setShowThemeModal(true)}
            onOpenUserInfo={() => setShowUserInfo(!showUserInfo)}
            onClearHistory={handleClearCurrentChatHistory}
          />

          {/* Chat Message Stream */}
          <ChatMessageFeed
            activeRoomId={activeRoomId}
            activeRoom={activeRoom}
            currentUser={currentUser}
            isConnected={isConnected}
            messageFeedRef={messageFeedRef}
            handleScroll={handleScroll}
            slicedMessages={slicedMessages}
            messageMap={messageMap}
            currentPinnedMessage={currentPinnedMessage}
            onJumpToMessage={jumpToMessage}
            onTogglePinMessage={togglePinMessage}
            getCleanMessageText={getCleanMessageText}
            formatDateHeader={formatSeparatorDate}
            isChatDragging={isDraggingFile}
            showScrollDownBtn={showScrollDownBtn}
            onScrollToBottom={scrollToBottom}
            unreadCount={unreadCount}
            isSelectMode={isSelectMode}
            selectedMessageIds={selectedMessageIds}
            onToggleSelectMessage={(id) => {
              setSelectedMessageIds(prev => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                if (next.size === 0) setIsSelectMode(false);
                return next;
              });
            }}
            onReplyMessage={(msg) => {
              setReplyingToMessage(msg);
              setEditingMessage(null);
            }}
            onEditMessage={(msg) => {
              setEditingMessage(msg);
              setInputText(msg.text || '');
              setReplyingToMessage(null);
            }}
            onDeleteMessageAnimated={handleDeleteMessageAnimated}
            onToggleReaction={(msgId, reaction) => toggleReaction(msgId, reaction)}
            onVotePoll={(msgId, roomId, optionIds) => votePoll(msgId, roomId, optionIds)}
            onClosePoll={(msgId, roomId) => closePoll(msgId, roomId)}
            onOpenGalleryMedia={(msgId) => setActiveGalleryMediaId(msgId)}
            onContextMenu={handleContextMenu}
          />

          {/* Bottom Input Bar */}
          <ChatInputBar
            selectedFile={selectedFile}
            onClearSelectedFile={() => setSelectedFile(null)}
            editingMessage={editingMessage}
            onCancelEditing={() => {
              setEditingMessage(null);
              setInputText('');
            }}
            replyingToMessage={replyingToMessage}
            onCancelReply={() => setReplyingToMessage(null)}
            currentUser={currentUser}
            getCleanMessageText={getCleanMessageText}
            mentionState={mentionState}
            filteredMentions={filteredMentions}
            mentionCursor={mentionCursor}
            setMentionCursor={setMentionCursor}
            applyMention={applyMention}
            quickStickerSuggestions={quickStickerSuggestions}
            onSendSticker={handleSendSticker}
            showEmojiPicker={showEmojiPicker}
            setShowEmojiPicker={setShowEmojiPicker}
            onInsertEmoji={insertEmoji}
            recordedVoicePreview={recordedVoicePreview}
            onCancelRecordedVoicePreview={cancelRecordedVoicePreview}
            onSendRecordedVoicePreview={sendRecordedVoicePreview}
            isRecording={isRecording}
            isVoiceLocked={isVoiceLocked}
            isVoicePaused={isVoicePaused}
            recordTime={recordTime}
            liveVolumeLevels={liveVolumeLevels}
            voiceDragOffset={voiceDragOffset}
            onStopRecording={stopRecording}
            onToggleVoicePause={toggleVoicePause}
            fileInputRef={fileInputRef}
            onFileSelect={handleFileSelect}
            textareaRef={textareaRef}
            inputText={inputText}
            onInputChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onTextSelection={handleTextSelection}
            formattingToolbar={formattingToolbar}
            applyFormatting={applyFormatting}
            onCloseFormattingToolbar={() => setFormattingToolbar(null)}
            onStartVideoRecording={startVideoRecording}
            onOpenPollModal={() => setShowPollModal(true)}
            inputActionMode={inputActionMode}
            setInputActionMode={setInputActionMode}
            onVoicePointerDown={handleVoicePointerDown}
            onVoicePointerMove={handleVoicePointerMove}
            onVoicePointerUp={handleVoicePointerUp}
            onSend={handleSend}
            showToast={showToast}
          />
        </main>

        {/* 3. Right Sidebar: User Info Panel */}
        {showUserInfo && (
          <ChatUserInfoPanel
            onClose={() => setShowUserInfo(false)}
            activeRoom={activeRoom}
            activePeerId={activePeerId}
            activePeerProfile={activePeerProfile}
            activePeerAvatar={activePeerAvatar}
            isPeerOnline={isPeerOnline}
            currentUser={currentUser}
            getRoomDisplayName={getRoomDisplayName}
            getRoomColor={getRoomColor}
            onOpenProfileModal={() => setShowProfileModal(true)}
            isMuted={activeRoomId ? Boolean(mutedRooms[activeRoomId]) : false}
            onToggleMute={() => activeRoomId && toggleRoomMute(activeRoomId)}
            notificationsEnabled={notificationsEnabled}
            setNotificationsEnabled={setNotificationsEnabled}
            sharedMediaMessages={activeMessages.filter(m => m.file && (m.file.type === 'image' || m.file.type === 'video' || m.file.type?.startsWith('image/') || m.file.type?.startsWith('video/')))}
            onOpenGalleryMedia={(msgId) => setActiveGalleryMediaId(msgId)}
          />
        )}
      </div>

      {/* Centralized Modals Host */}
      <ChatModalsHost
        currentUser={currentUser}
        rooms={rooms}
        activeRoomId={activeRoomId}
        activeRoom={activeRoom}
        userProfiles={userProfiles}
        getUserDisplayName={getUserDisplayName}
        getUserAvatar={getUserAvatar}
        getRoomDisplayName={getRoomDisplayName}
        getRoomColor={getRoomColor}
        onlineStatus={onlineStatus}
        unreadCount={unreadCount}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        isSelectMode={isSelectMode}
        setIsSelectMode={setIsSelectMode}
        selectedMessageIds={selectedMessageIds}
        setSelectedMessageIds={setSelectedMessageIds}
        activeMessages={activeMessages}
        handleDeleteSelectedAnimated={handleDeleteSelectedAnimated}
        getSelectedText={getSelectedText}
        showProfileModal={showProfileModal}
        setShowProfileModal={setShowProfileModal}
        showPollModal={showPollModal}
        setShowPollModal={setShowPollModal}
        handleCreatePoll={handleCreatePoll}
        showGlobalSearchModal={showGlobalSearchModal}
        setShowGlobalSearchModal={setShowGlobalSearchModal}
        globalSearchSeed={globalSearchSeed}
        setGlobalSearchSeed={setGlobalSearchSeed}
        onNavigateFromGlobalSearch={handleNavigateFromGlobalSearch}
        allMessages={messages}
        showAdvancedSearchModal={showAdvancedSearchModal}
        setShowAdvancedSearchModal={setShowAdvancedSearchModal}
        chatFilters={chatFilters}
        setChatFilters={setChatFilters}
        showThemeModal={showThemeModal}
        setShowThemeModal={setShowThemeModal}
        themeConfig={themeConfig}
        setThemeConfig={setThemeConfig}
        activeStoryViewerUser={activeStoryViewerUser}
        setActiveStoryViewerUser={setActiveStoryViewerUser}
        isStoryCreateOpen={isStoryCreateOpen}
        setIsStoryCreateOpen={setIsStoryCreateOpen}
        onSendStoryDirectMessage={(peerUserId, text) => {
          const dmRoom = rooms.find(r => r.type === 'direct' && r.participants.includes(peerUserId as UserId));
          if (dmRoom) {
            sendMessage(text, undefined, undefined, dmRoom.id);
          }
        }}
        activeGalleryMediaId={activeGalleryMediaId}
        setActiveGalleryMediaId={setActiveGalleryMediaId}
        roomMediaMessages={roomMediaMessages}
        onHashtagClick={handleHashtagClick}
        showCommandPalette={showCommandPalette}
        setShowCommandPalette={setShowCommandPalette}
        onSelectRoomFromPalette={(roomId) => {
          setActiveRoomId(roomId);
          setMobileView('chat');
        }}
        onToggleMuteActiveRoom={activeRoomId ? () => toggleRoomMute(activeRoomId) : undefined}
        isRoomMuted={activeRoomId ? Boolean(mutedRooms[activeRoomId]) : false}
        showArchiveModal={showArchiveModal}
        setShowArchiveModal={setShowArchiveModal}
        forwardingMessage={forwardingMessage}
        setForwardingMessage={setForwardingMessage}
        handleForwardToRoom={handleForwardToRoom}
        contextMenuTarget={contextMenuTarget}
        setContextMenuTarget={setContextMenuTarget}
        onReplyMessage={(msg) => {
          setReplyingToMessage(msg);
          setEditingMessage(null);
        }}
        onEditMessage={(msg) => {
          setEditingMessage(msg);
          setInputText(msg.text || '');
          setReplyingToMessage(null);
        }}
        onPinMessage={togglePinMessage}
        onDeleteMessageAnimated={handleDeleteMessageAnimated}
        onToggleReaction={(msgId, emoji) => toggleReaction(msgId, emoji)}
        forwardMessage={forwardMessage}
        toast={toast}
        setToast={setToast}
        showToast={showToast}
        callSession={callSession}
        remoteAudioRef={remoteAudioRef}
        localAudioRef={localAudioRef}
        remoteVideoRef={remoteVideoRef}
        localVideoRef={localVideoRef}
        acceptCall={acceptCall}
        rejectCall={rejectCall}
        endCall={endCall}
        toggleMute={toggleMute}
        isMuted={isMuted}
        toggleCamera={toggleCamera}
        isCameraOff={isCameraOff}
        isRecordingVideo={isRecordingVideo}
        videoPreviewRef={videoPreviewRef}
        videoRecordTime={videoRecordTime}
        formatRecordTime={formatRecordTime}
        stopVideoRecording={stopVideoRecording}
        showQrModal={showQrModal}
        setShowQrModal={setShowQrModal}
        showNewChatModal={showNewChatModal}
        setShowNewChatModal={setShowNewChatModal}
      />
    </div>
  );
};

export default ChatScreen;
