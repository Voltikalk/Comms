import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { useSocket, type OutgoingFile, type SendOptions } from '../context/contexts';
import { MAX_PENDING_FILES, detectFileKind, planBatchSend } from '../lib/outgoing-batch';
import { deleteBackward, insertAtSelection } from '../lib/emoji-catalog';
import { createClientId } from '../lib/offline-queue';
import { formatScheduledAt } from '../lib/schedule';
import { usePinnedMessages, type SharedPins } from '../hooks/usePinnedMessages';
import { can, isAdminLike, isManagedRoom, parseJoinHash, roleOf, sendRestriction } from '../lib/roles';
import { RestrictedComposer } from './Chat/Input/RestrictedComposer';
import { IconLogout } from '@tabler/icons-react';
import { RoomManageSheet, type ManagePage } from './Chat/Manage/RoomManageSheet';
import { ConfirmDialog, type ConfirmRequest } from './ui/ConfirmDialog';
import { JoinRoomModal } from './Chat/Manage/JoinRoomModal';
import type { JoinTarget } from '../context/contexts';
import { serviceText } from '../lib/service-messages';
import { useChatHotkeys } from '../hooks/useChatHotkeys';
import { useChatNavigation } from '../hooks/useChatNavigation';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useMessageSelection } from '../hooks/useMessageSelection';
import { ROOM_AVATAR_COLORS, USER_NAMES } from '../constants';
import type { Room, UserId, Message } from '../types';
import { DEFAULT_THEME_CONFIG, getWallpaperById } from '../constants/wallpapers';
import { applyAppearance } from '../lib/appearance';
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
import { DeleteMessagesDialog, type DeleteRequest } from './Chat/Modals/DeleteMessagesDialog';
import { VideoNoteRecorderOverlay } from './Media/VideoNoteRecorderOverlay';
import { useVideoNoteRecorder } from '../hooks/useVideoNoteRecorder';
import { findStickersByEmoji } from '../constants/stickers';
import { createAudioLiveAnalyser, normalizeWaveform, type AudioLiveAnalyser } from '../lib/audio-waveform';
import type { Sticker } from '../types/sticker.types';
import { usePlatform } from '../context/platform-context';
import { useStories } from '../context/stories-context';
import type { MobileTab } from './Mobile/MobileBottomNav';
import type { NewChatMode } from './Chat/NewChatModal';
import type { ChatFolderId, FolderCountInfo } from './Navigation/ChatFolderTabs';
import type { ChatPreview } from './Chat/Sidebar/ChatListItem';
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
    createDirectChat,
    forwardMessage,
    deleteMessage,
    hideMessagesForMe,
    editMessage,
    toggleReaction,
    votePoll,
    closePoll,
    typingUsers,
    sendTypingStatus,
    unreadCount,
    lastMessageOf,
    markRoomAsRead,
    roomAction,

    // Calling context
    callSession,
    startCall,
  } = useSocket();
  const { openStories } = useStories();

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
  /** «Управление группой/каналом» sheet. */
  const [manage, setManage] = useState<{ roomId: string; page?: ManagePage; userId?: UserId } | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  /** Invite link opened via `#/join/<code|@username>`. */
  const [joinTarget, setJoinTarget] = useState<JoinTarget | null>(() =>
    typeof window === 'undefined' ? null : parseJoinHash(window.location.hash),
  );
  useEffect(() => {
    const consume = () => {
      const target = parseJoinHash(window.location.hash);
      if (!target) return;
      setJoinTarget(target);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    };
    consume();
    window.addEventListener('hashchange', consume);
    return () => window.removeEventListener('hashchange', consume);
  }, []);
  const closeJoin = useCallback(() => setJoinTarget(null), []);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatMode, setNewChatMode] = useState<NewChatMode>('direct');
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
  // Unsaved draft from the appearance window — previewed live across the app, dropped on cancel.
  const [themePreview, setThemePreview] = useState<ChatThemeConfig | null>(null);
  const activeTheme = themePreview ?? themeConfig;

  // Helper for room display name
  const getRoomDisplayName = useCallback((room: Room) => {
    if (isSavedMessagesRoom(room)) return 'Избранное';
    if (room.type === 'direct') {
      const peerId = room.participants.find(p => p !== currentUser) as UserId | undefined;
      return peerId ? (getUserDisplayName(peerId) || USER_NAMES[peerId] || peerId) : room.name;
    }
    return room.name;
  }, [currentUser, getUserDisplayName]);

  // Accent, text size, bubble corners and font → CSS variables on <html>.
  useEffect(() => {
    applyAppearance(activeTheme);
  }, [activeTheme]);

  useEffect(() => {
    try {
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
    let channelsTotal = 0;
    let channelsUnread = 0;
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
      } else if (r.type === 'channel') {
        channelsTotal++;
        channelsUnread += u;
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
      channels: { total: channelsTotal, unread: channelsUnread },
      unread: { total: unreadTotal, unread: unreadUnread },
      saved: { total: savedTotal, unread: savedUnread },
    };
  }, [rooms, unreadCount]);

  // ===== Pinned chats (local, like Telegram's per-device pin order) =====
  const [pinnedRooms, setPinnedRooms] = useState<string[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('tg_pinned_rooms') || '[]');
      return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
    } catch {
      return [];
    }
  });

  const toggleRoomPin = useCallback((roomId: string) => {
    setPinnedRooms((prev) => {
      const next = prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [roomId, ...prev];
      try {
        localStorage.setItem('tg_pinned_rooms', JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  // Filtered rooms list by folder tab AND search in sidebar; pinned chats first.
  const filteredRooms = useMemo(() => {
    const pinRank = (id: string) => {
      const i = pinnedRooms.indexOf(id);
      return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    };
    return rooms.filter((r) => {
      // 1. Folder tab filter
      if (activeFolder === 'direct') {
        if (r.type !== 'direct' || isSavedMessagesRoom(r)) return false;
      } else if (activeFolder === 'groups') {
        if (r.type !== 'group') return false;
      } else if (activeFolder === 'channels') {
        if (r.type !== 'channel') return false;
      } else if (activeFolder === 'unread') {
        if (unreadCount(r.id) <= 0) return false;
      } else if (activeFolder === 'saved') {
        if (!isSavedMessagesRoom(r)) return false;
      }

      // 2. Query search filter
      if (!roomFilterQuery.trim()) return true;
      const name = getRoomDisplayName(r);
      return name.toLowerCase().includes(roomFilterQuery.toLowerCase());
    }).map((r, i) => ({ r, i }))
      .sort((a, b) => pinRank(a.r.id) - pinRank(b.r.id) || a.i - b.i)
      .map(({ r }) => r);
  }, [rooms, activeFolder, roomFilterQuery, unreadCount, getRoomDisplayName, pinnedRooms]);

  // Phone tab bar: each tab is its own screen inside the sidebar (Telegram iOS).
  const handleMobileTabSelect = (tab: MobileTab) => {
    setMobileTab(tab);
    setMobileView('list');
  };

  // Interactive edge swipe-back (Telegram iOS): the chat follows the finger and
  // the list slides out from under it. Panes are moved directly — no re-render
  // per touchmove — and released either to the list or back to the chat.
  const navSwipe = useRef<{ x: number; y: number; dx: number; locked: boolean; lastX: number; lastT: number; v: number } | null>(null);
  const navPanes = () =>
    [
      document.querySelector<HTMLElement>('[data-nav-pane="chat"]'),
      document.querySelector<HTMLElement>('[data-nav-pane="list"]'),
    ] as const;

  const handleTouchStart = (e: React.TouchEvent) => {
    navSwipe.current = null;
    if (!stackedNav || mobileView !== 'chat' || e.touches.length !== 1) return;
    const t = e.touches[0];
    if (t.clientX > 32) return;
    navSwipe.current = { x: t.clientX, y: t.clientY, dx: 0, locked: false, lastX: t.clientX, lastT: e.timeStamp, v: 0 };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const s = navSwipe.current;
    if (!s) return;
    const t = e.touches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (!s.locked) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      if (dx <= 0 || Math.abs(dy) > Math.abs(dx)) {
        navSwipe.current = null;
        return;
      }
      s.locked = true;
      navPanes().forEach((pane) => pane?.classList.add('tg-nav-dragging'));
    }
    const dt = e.timeStamp - s.lastT;
    if (dt > 0) s.v = (t.clientX - s.lastX) / dt;
    s.lastX = t.clientX;
    s.lastT = e.timeStamp;
    s.dx = Math.max(0, dx);
    const progress = Math.min(1, s.dx / window.innerWidth);
    const [chat, list] = navPanes();
    if (chat) chat.style.transform = `translateX(${s.dx}px)`;
    if (list) {
      list.style.transform = `translateX(${-28 * (1 - progress)}%)`;
      list.style.setProperty('--nav-dim', String(1 - progress));
    }
  };

  const handleTouchEnd = () => {
    const s = navSwipe.current;
    navSwipe.current = null;
    if (!s?.locked) return;
    // Hand the panes back to the CSS classes; the transition runs from where
    // the finger left them to whichever state React renders next.
    navPanes().forEach((pane) => {
      if (!pane) return;
      pane.classList.remove('tg-nav-dragging');
      pane.style.transform = '';
      pane.style.removeProperty('--nav-dim');
    });
    if (s.dx > window.innerWidth / 3 || s.v > 0.45) {
      triggerHaptic('light');
      setMobileView('list');
    }
  };

  const getChatBackgroundStyle = (): React.CSSProperties => {
    const wp = getWallpaperById(activeTheme.wallpaperId);
    const blur = activeTheme.customWallpaper?.blur ?? (activeTheme.wallpaperId === 'custom' ? 0 : (wp.blur ?? 0));
    const filterStyle = blur > 0 ? `blur(${blur}px)` : undefined;
    const transformStyle = blur > 0 ? 'scale(1.12)' : undefined;

    if (activeTheme.wallpaperId === 'custom' && activeTheme.customWallpaper?.imageUrl) {
      return {
        backgroundImage: `url("${activeTheme.customWallpaper.imageUrl}")`,
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
  // List and chat are stacked screens only on phone-width touch layouts;
  // tablets and wide "mobile" view modes keep the split view.
  const isNarrow = useMediaQuery('(max-width: 767.98px)');
  const stackedNav = !isDesktopView && isNarrow;
  // Phones: an open chat owns a history entry, so the system/browser Back
  // button (and Android's back gesture) returns to the list instead of
  // leaving the app. The entry keeps the URL; RoomsContext's #/chat/ entries
  // underneath stay as they are.
  useEffect(() => {
    if (window.history.state?.commsChat) {
      // Reloaded on top of a stale entry — it no longer means "chat open".
      window.history.replaceState({ ...window.history.state, commsChat: undefined }, '');
    }
    const onPop = () => {
      if (!window.history.state?.commsChat) setMobileView('list');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  useEffect(() => {
    if (!stackedNav) return;
    const open = Boolean(window.history.state?.commsChat);
    if (mobileView === 'chat' && !open) window.history.pushState({ ...window.history.state, commsChat: true }, '');
    else if (mobileView === 'list' && open) window.history.back();
  }, [mobileView, stackedNav]);
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
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [toast, setToast] = useState<{
    text: string;
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);
  const {
    isSelectMode,
    setIsSelectMode,
    selectedMessageIds,
    setSelectedMessageIds,
    toggleSelected: toggleSelectedMessage,
    clearSelection,
  } = useMessageSelection();
  const { openRoom, openAdjacentRoom, openAdjacentUnreadRoom, openRoomByIndex } = useChatNavigation({
    rooms,
    filteredRooms,
    activeRoomId,
    setActiveRoomId,
    setMobileView,
    unreadCount,
  });

  // Global Keyboard Shortcuts (Desktop / Power User Navigation Suite) — see src/lib/chat-hotkeys.ts
  useChatHotkeys({
    commandPalette: () => {
      triggerHaptic('selection');
      setShowCommandPalette((prev) => !prev);
    },
    adjacentChat: ({ direction }) => {
      triggerHaptic('selection');
      openAdjacentRoom(direction);
    },
    adjacentUnread: ({ direction }) => {
      if (!openAdjacentUnreadRoom(direction)) return false;
      triggerHaptic('selection');
    },
    savedMessages: () => {
      const saved = rooms.find(isSavedMessagesRoom);
      if (!saved) return false;
      triggerHaptic('selection');
      openRoom(saved.id);
    },
    folder: ({ folder }) => {
      triggerHaptic('selection');
      setActiveFolder(folder);
    },
    shortcuts: () => {
      triggerHaptic('selection');
      setShowShortcutsModal(true);
    },
    settings: () => {
      triggerHaptic('selection');
      setShowThemeModal(true);
    },
    chatIndex: ({ index }) => {
      if (!openRoomByIndex(index)) return false;
      triggerHaptic('selection');
    },
    // Hierarchical Escape: innermost layer closes first; unhandled → default behaviour
    escape: () => {
      if (showCommandPalette) setShowCommandPalette(false);
      else if (showGlobalSearchModal) setShowGlobalSearchModal(false);
      else if (showEmojiPicker) setShowEmojiPicker(false);
      else if (editingMessage) {
        setEditingMessage(null);
        setInputText('');
      } else if (replyingToMessage) setReplyingToMessage(null);
      else if (isSearching) {
        setIsSearching(false);
        setSearchQuery('');
      } else if (mobileView === 'chat' && stackedNav) setMobileView('list');
      else return false;
    },
  });

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
  // Composer attachments (several at once; photos / videos go out as an album).
  const [selectedFiles, setSelectedFiles] = useState<OutgoingFile[]>([]);
  const selectedCountRef = useRef(0);
  selectedCountRef.current = selectedFiles.length;
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [liveVolumeLevels, setLiveVolumeLevels] = useState<number[]>([]);
  const [inputActionMode, setInputActionModeState] = useState<'voice' | 'video'>(() =>
    localStorage.getItem('comms_input_action_mode') === 'video' ? 'video' : 'voice',
  );
  const setInputActionMode = useCallback((mode: 'voice' | 'video') => {
    setInputActionModeState(mode);
    localStorage.setItem('comms_input_action_mode', mode);
  }, []);
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
  // Mic / camera button: a short tap toggles the mode, holding starts recording.
  const actionHoldTimerRef = useRef<number | null>(null);
  const holdModeRef = useRef<'voice' | 'video' | null>(null);
  const voiceStartTimeRef = useRef<number>(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<any>(null);
  const audioAnalyserRef = useRef<AudioLiveAnalyser | null>(null);
  const rawAudioAmplitudesRef = useRef<number[]>([]);
  const audioVolumeIntervalRef = useRef<any>(null);

  // Video note ("кружок") recorder — see hooks/useVideoNoteRecorder
  const videoNote = useVideoNoteRecorder({
    onRecorded: (file) => sendMessage('', undefined, file),
    onError: (text) => showToast(text),
  });

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

  // Multi-pin state (persisted per room, Telegram-style cursor through pins)
  // Groups/channels pin on the server for everyone; other chats keep local pins.
  const sharedPinRoomId = isManagedRoom(activeRoom) ? activeRoom.id : null;
  const sharedPinIds = isManagedRoom(activeRoom) ? activeRoom.pinnedIds : undefined;
  const sharedPins = useMemo<SharedPins | null>(() => {
    if (!sharedPinRoomId) return null;
    const run = (payload: Record<string, unknown>) =>
      void roomAction('pin_message', { roomId: sharedPinRoomId, ...payload }).then((res) => {
        if (!res.ok) showToast(res.error || 'Не удалось изменить закреп');
      });
    return {
      ids: sharedPinIds || [],
      set: (messageId, pin) => run(pin ? { messageId } : { messageId, unpin: true }),
      clear: () => run({ unpin: true }),
    };
  }, [sharedPinRoomId, sharedPinIds, roomAction, showToast]);
  const pinned = usePinnedMessages(activeRoomId, messageMap, sharedPins);
  const canPinHere = !isManagedRoom(activeRoom) || can(activeRoom, currentUser, 'pinMessages');

  const togglePinMessage = (msgId: string) => {
    if (!activeRoomId) return;
    if (!canPinHere) {
      showToast('Закреплять могут только администраторы');
      return;
    }
    showToast(pinned.toggle(msgId) ? 'Сообщение закреплено' : 'Сообщение откреплено');
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
    clearSelection();

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

  // ── Deletion ────────────────────────────────────────────────────────────
  // Every delete entry point (context menu, selection bar, clear history) opens the
  // same confirmation sheet. On confirm the bubbles disintegrate, then own messages are
  // revoked on the server (or hidden locally if "for everyone" was unticked) and other
  // people's messages are hidden for the current user only.
  const [pendingDelete, setPendingDelete] = useState<DeleteRequest | null>(null);

  const requestDelete = useCallback((ids: string[], opts: { clearHistory?: boolean } = {}) => {
    if (ids.length === 0 || !activeRoom) return;
    const idSet = new Set(ids);
    const targets = activeMessages.filter((m) => idSet.has(m.id));
    const hasOwn = targets.some((m) => m.sender === currentUser);
    const allOwn = targets.length > 0 && targets.every((m) => m.sender === currentUser);
    const isSaved = isSavedMessagesRoom(activeRoom);
    const peerLabel = isSaved
      ? null
      : activeRoom.type === 'direct'
        ? getRoomDisplayName(activeRoom)
        : 'всех участников';
    setPendingDelete({
      ids,
      canRevoke: opts.clearHistory ? hasOwn : allOwn,
      peerLabel,
      clearHistory: opts.clearHistory,
    });
  }, [activeRoom, activeMessages, currentUser, getRoomDisplayName]);

  const handleDeleteMessageAnimated = useCallback((messageId: string) => {
    requestDelete([messageId]);
  }, [requestDelete]);

  const handleDeleteSelectedAnimated = useCallback(() => {
    requestDelete(Array.from(selectedMessageIds));
  }, [selectedMessageIds, requestDelete]);

  const cancelDelete = useCallback(() => setPendingDelete(null), []);

  const confirmDelete = useCallback((forEveryone: boolean) => {
    const request = pendingDelete;
    if (!request) return;
    setPendingDelete(null);

    const ids = request.ids;
    const senderOf = new Map(activeMessages.map((m) => [m.id, m.sender]));
    const commit = () => {
      const revoke: string[] = [];
      const hide: string[] = [];
      ids.forEach((id) => {
        if (forEveryone && senderOf.get(id) === currentUser) revoke.push(id);
        else hide.push(id);
      });
      if (hide.length > 0) hideMessagesForMe(hide);
      revoke.forEach((id) => deleteMessage(id));
    };

    const bubbles = ids
      .map((id) => {
        const row = document.getElementById(`msg-${id}`);
        return (row?.querySelector('[data-bubble="true"]') || row) as HTMLElement | null;
      })
      .filter((el): el is HTMLElement => !!el);

    // Let the sheet start closing before the grains take over the frame budget.
    window.setTimeout(() => {
      if (bubbles.length > 0) triggerTelegramDisintegrate(bubbles, commit);
      else commit();
    }, 120);

    clearSelection();
    showToast(
      request.clearHistory
        ? 'История чата очищена'
        : ids.length > 1
          ? `Удалено сообщений: ${ids.length}`
          : 'Сообщение удалено'
    );
  }, [pendingDelete, activeMessages, currentUser, hideMessagesForMe, deleteMessage, showToast, clearSelection]);

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
  const activeOnlineCount =
    activeRoom?.type === 'group' ? activeRoom.participants.filter((p) => p === currentUser || onlineStatus[p]).length : 0;
  const canManageActive =
    isManagedRoom(activeRoom) && (isAdminLike(activeRoom, currentUser) || can(activeRoom, currentUser, 'changeInfo'));
  const manageRoom = manage ? rooms.find((r) => r.id === manage.roomId) ?? null : null;

  const openManage = (page?: ManagePage, userId?: UserId) => {
    if (activeRoom && isManagedRoom(activeRoom)) setManage({ roomId: activeRoom.id, page, userId });
  };

  /** Leave a group/channel; the owner may delete it for everyone instead. */
  const requestLeaveRoom = (room: Room) => {
    const channel = room.type === 'channel';
    const owner = roleOf(room, currentUser) === 'owner';
    setConfirmRequest({
      title: channel ? 'Покинуть канал?' : 'Покинуть группу?',
      description: owner
        ? `Вы владелец: права перейдут к администратору${channel ? '' : ' или участнику'}. Можно вместо этого удалить ${channel ? 'канал' : 'группу'} для всех.`
        : channel
          ? 'Вы перестанете получать публикации. Вернуться можно по ссылке.'
          : 'Вы больше не будете получать сообщения из этой группы.',
      confirmLabel: 'Покинуть',
      danger: true,
      icon: <IconLogout size={19} />,
      checkbox: owner ? { label: channel ? 'Удалить канал для всех' : 'Удалить группу для всех' } : undefined,
      onConfirm: async (deleteForAll) => {
        const res = await roomAction(deleteForAll ? 'delete_room' : 'leave_room', { roomId: room.id });
        if (!res.ok) {
          showToast(res.error || 'Не удалось выйти');
          return;
        }
        if (activeRoomId === room.id) {
          setShowUserInfo(false);
          setMobileView('list');
        }
        showToast(deleteForAll ? (channel ? 'Канал удалён' : 'Группа удалена') : channel ? 'Вы покинули канал' : 'Вы покинули группу');
      },
    });
  };

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

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      stopRingtone();
    };
  }, []);

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

  const handleSend = (e?: React.FormEvent, options?: SendOptions) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && selectedFiles.length === 0) return;

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

    if (selectedFiles.length === 0) {
      sendMessage(inputText, replyingToMessage?.id, undefined, undefined, undefined, undefined, options);
    } else {
      // One message per file, sent in order so the album keeps its layout; reply goes on the first.
      const plan = planBatchSend(selectedFiles, inputText, createClientId);
      const roomId = activeRoomId || undefined;
      const replyToId = replyingToMessage?.id;
      void (async () => {
        for (const [i, item] of plan.entries()) {
          await sendMessage(item.text, i === 0 ? replyToId : undefined, item.file, roomId, undefined, undefined, {
            ...options,
            albumId: item.albumId,
          });
        }
      })();
    }
    if (options?.scheduledAt) showToast(`Сообщение будет отправлено ${formatScheduledAt(options.scheduledAt)}`);
    else if (options?.silent) showToast('Отправлено без звука');
    persistDraft(activeRoomId || null, '');
    setInputText('');
    setMentionState(null);
    setReplyingToMessage(null);
    setSelectedFiles([]);
    setShowEmojiPicker(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // Picker edits happen at the caret (or over the selection), like Telegram.
  // Phones keep the keyboard hidden while the panel is open, so focus only on desktop.
  const pendingCaretRef = useRef<number | null>(null);
  const applyComposerEdit = (edit: { text: string; caret: number }) => {
    pendingCaretRef.current = edit.caret;
    handleInputChange(edit.text);
  };

  // Runs right after the controlled textarea receives the new value, before
  // the browser would otherwise leave the caret at the end.
  useLayoutEffect(() => {
    const caret = pendingCaretRef.current;
    const textarea = textareaRef.current;
    if (caret === null || !textarea) return;
    pendingCaretRef.current = null;
    if (isDesktopView) textarea.focus();
    textarea.setSelectionRange(caret, caret);
  }, [inputText, isDesktopView]);

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? inputText.length;
    const end = textarea?.selectionEnd ?? start;
    applyComposerEdit(insertAtSelection(inputText, start, end, emoji));
  };

  const deleteEmojiBackward = () => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? inputText.length;
    const end = textarea?.selectionEnd ?? start;
    applyComposerEdit(deleteBackward(inputText, start, end));
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

  // Group permissions / channel posting rights for the composer.
  const textRestriction = sendRestriction(activeRoom, currentUser, 'text');
  const mediaRestriction = sendRestriction(activeRoom, currentUser, 'media');
  const pollRestriction = sendRestriction(activeRoom, currentUser, 'poll');
  const mediaRestrictionRef = useRef<string | null>(null);
  mediaRestrictionRef.current = mediaRestriction;

  // File selection & Drag&Drop attachment processing
  const acceptIncomingFiles = useCallback((incoming: FileList | readonly File[]) => {
    const files = Array.from(incoming);
    if (files.length === 0) return;
    if (mediaRestrictionRef.current) {
      showToast(mediaRestrictionRef.current);
      return;
    }

    const room = Math.max(0, MAX_PENDING_FILES - selectedCountRef.current);
    if (files.length > room) showToast(`Можно прикрепить не больше ${MAX_PENDING_FILES} файлов за раз`);
    const items: OutgoingFile[] = files.slice(0, room).map((file) => ({
      name: file.name,
      type: detectFileKind(file),
      data: URL.createObjectURL(file),
      size: file.size,
      rawBlob: file,
    }));
    if (items.length === 0) return;
    selectedCountRef.current += items.length;
    setSelectedFiles((prev) => [...prev, ...items]);

    // Videos: dimensions for the album / bubble layout, patched in once known.
    for (const item of items) {
      if (item.type !== 'video') continue;
      const probe = document.createElement('video');
      probe.preload = 'metadata';
      probe.src = item.data;
      probe.onloadedmetadata = () => {
        const width = probe.videoWidth;
        const height = probe.videoHeight;
        const ratio = width / (height || 1);
        const orientation = ratio < 0.85 ? 'vertical' : ratio > 1.15 ? 'horizontal' : 'square';
        setSelectedFiles((prev) => prev.map((f) => (f.data === item.data ? { ...f, width, height, orientation } : f)));
      };
    }
  }, [showToast]);

  const removeSelectedFile = useCallback((data: string) => {
    URL.revokeObjectURL(data);
    setSelectedFiles((prev) => prev.filter((f) => f.data !== data));
  }, []);

  const clearSelectedFiles = useCallback(() => {
    setSelectedFiles((prev) => {
      prev.forEach((f) => URL.revokeObjectURL(f.data));
      return [];
    });
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) acceptIncomingFiles(e.target.files);
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
    if (e.dataTransfer.files?.length) acceptIncomingFiles(e.dataTransfer.files);
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
    if (e.button !== 0) return;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    voicePointerStartPosRef.current = { x: e.clientX, y: e.clientY };
    holdModeRef.current = null;
    if (actionHoldTimerRef.current) window.clearTimeout(actionHoldTimerRef.current);
    actionHoldTimerRef.current = window.setTimeout(() => {
      actionHoldTimerRef.current = null;
      holdModeRef.current = inputActionMode;
      isVoiceHoldingRef.current = true;
      triggerHaptic('light');
      if (inputActionMode === 'voice') startRecording();
      else void videoNote.start();
    }, 220);
  };

  const handleVoicePointerMove = (e: React.PointerEvent) => {
    if (!isVoiceHoldingRef.current || !voicePointerStartPosRef.current) return;
    const dx = e.clientX - voicePointerStartPosRef.current.x;
    const dy = e.clientY - voicePointerStartPosRef.current.y;

    if (holdModeRef.current === 'video') {
      if (dx < -80) {
        triggerHaptic('warning');
        isVoiceHoldingRef.current = false;
        videoNote.stop(false);
      } else if (dy < -55) {
        // Hands-free: keep recording, the overlay's buttons finish it.
        triggerHaptic('success');
        isVoiceHoldingRef.current = false;
      }
      return;
    }

    if (isVoiceLocked) return;
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
    if (actionHoldTimerRef.current) {
      // Released before the hold threshold → it was a tap: switch voice <-> video.
      window.clearTimeout(actionHoldTimerRef.current);
      actionHoldTimerRef.current = null;
      if (e.type === 'pointerup') {
        triggerHaptic('light');
        setInputActionMode(inputActionMode === 'voice' ? 'video' : 'voice');
      }
      return;
    }
    if (!isVoiceHoldingRef.current) return;
    isVoiceHoldingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (holdModeRef.current === 'video') {
      videoNote.stop(true);
      return;
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

  const getRoomColor = (room: Room) => {
    if (room.type === 'group') return 'bg-accent';
    const peerId = room.participants.find(p => p !== currentUser) || '';
    return ROOM_AVATAR_COLORS[peerId] || 'bg-accent';
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
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
    // Within the last week Telegram shows the weekday, older — a short date.
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (msg.timestamp > startOfToday - 6 * 86400000) {
      const day = date.toLocaleDateString('ru-RU', { weekday: 'short' });
      return day.charAt(0).toUpperCase() + day.slice(1);
    }
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      ...(date.getFullYear() === now.getFullYear() ? {} : { year: '2-digit' }),
    });
  };

  const getLastMessagePreview = useCallback((roomId: string): ChatPreview | null => {
    const draft = draftsMap[roomId];
    const lastMsg = lastMessageOf(roomId);
    const room = rooms.find((r) => r.id === roomId);
    const isGroupRoom = room?.type === 'group';

    if (draft?.trim()) {
      return {
        text: draft.replace(/\s+/g, ' ').trim(),
        time: lastMsg ? getLastMessageTime(lastMsg) : '',
        isMine: true,
        isDraft: true,
        status: null,
        senderLabel: null,
        mediaIcon: null,
      };
    }

    if (!lastMsg) return null;

    if (lastMsg.service) {
      const nameOf = (id: UserId) => getUserDisplayName(id) || USER_NAMES[id] || id;
      return {
        text: serviceText(lastMsg, nameOf, { me: currentUser, isChannel: room?.type === 'channel' }),
        time: getLastMessageTime(lastMsg),
        isMine: false,
        isDraft: false,
        status: null,
        senderLabel: null,
        mediaIcon: null,
      };
    }

    const isMine = lastMsg.sender === currentUser;
    const f = lastMsg.file;
    const mediaIcon: ChatPreview['mediaIcon'] = lastMsg.poll
      ? 'poll'
      : lastMsg.sticker || f?.type === 'sticker'
        ? null
        : f?.type === 'image'
          ? 'photo'
          : f?.type === 'video' || f?.type === 'video_note'
            ? 'video'
            : f?.type === 'audio'
              ? 'voice'
              : f
                ? 'file'
                : null;

    const status: ChatPreview['status'] = !isMine || room?.type === 'channel' || isSavedMessagesRoom(room ?? ({ id: roomId } as Room))
      ? null
      : lastMsg.pending || lastMsg.queued
        ? 'pending'
        : lastMsg.readBy && lastMsg.readBy.length > 0
          ? 'read'
          : 'sent';

    return {
      text: getCleanMessageText(lastMsg),
      time: getLastMessageTime(lastMsg),
      isMine,
      isDraft: false,
      status,
      senderLabel: isGroupRoom ? (isMine ? 'Вы' : getUserDisplayName(lastMsg.sender) || USER_NAMES[lastMsg.sender] || lastMsg.sender) : null,
      mediaIcon,
    };
  }, [lastMessageOf, currentUser, draftsMap, getCleanMessageText, rooms, getUserDisplayName]);

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
    requestDelete(activeMessages.map((m) => m.id), { clearHistory: true });
  }, [activeRoomId, activeMessages, requestDelete]);

  const handleSearchQueryChange = useCallback((q: string) => {
    setSearchQuery(q);
    setCurrentMatchIndex(0);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent | { clientX: number; clientY: number; preventDefault?: () => void }, msg: Message) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (isSelectMode) {
      toggleSelectedMessage(msg.id);
      return;
    }
    setContextMenuTarget({
      message: msg,
      x: e.clientX,
      y: e.clientY,
      isSelf: msg.sender === currentUser
    });
  }, [isSelectMode, currentUser, toggleSelectedMessage]);

  const handleNavigateFromGlobalSearch = useCallback((targetRoomId: string, targetMessageId?: string) => {
    setActiveRoomId(targetRoomId);
    setMobileView('chat');
    setShowGlobalSearchModal(false);
    if (targetMessageId) {
      setTimeout(() => jumpToMessage(targetMessageId), 150);
    }
  }, [jumpToMessage, setActiveRoomId]);

  const renderDynamicWallpaper = () => {
    const activeWp = getWallpaperById(activeTheme.wallpaperId);
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

    const dimming = activeTheme.customWallpaper?.dimming ?? (
      activeTheme.wallpaperId === 'custom'
        ? 20
        : (getWallpaperById(activeTheme.wallpaperId).dimming ?? 0)
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
      className="flex flex-col fixed inset-0 w-full h-full overflow-hidden select-none bg-white dark:bg-surface"
      style={{
        paddingTop: isDesktopView ? undefined : 'calc(env(safe-area-inset-top, 0px) + 0.5rem)',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Main Split-View Workspace */}
      <div className="flex flex-1 w-full min-h-0 overflow-hidden relative">
        {/* 1. Left Sidebar: Telegram Chat List & Contacts */}
        <ChatSidebar
          isDesktopView={isDesktopView}
          stackedNav={stackedNav}
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
          isRoomMuted={(roomId) => Boolean(mutedRooms[roomId])}
          isRoomPinned={(roomId) => pinnedRooms.includes(roomId)}
          onToggleRoomMute={toggleRoomMute}
          onToggleRoomPin={toggleRoomPin}
          onMarkRoomRead={markRoomAsRead}
          onLeaveRoom={(roomId) => {
            const room = rooms.find((r) => r.id === roomId);
            if (isManagedRoom(room)) requestLeaveRoom(room);
          }}
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
          onOpenNewChatModal={(mode) => {
            setNewChatMode(mode ?? 'direct');
            setShowNewChatModal(true);
          }}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
          onLogout={logout}
          onOpenStoryCreate={() => setIsStoryCreateOpen(true)}
          onOpenStoryViewer={(userId) => openStories(userId ?? 'me')}
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
          data-nav-pane="chat"
          inert={stackedNav && mobileView !== 'chat'}
          className={`min-w-0 w-full max-w-full flex flex-col h-full tg-chat-canvas overflow-hidden ${
            stackedNav
              ? `tg-nav-pane absolute inset-0 z-30 ${mobileView === 'chat' ? '' : 'tg-nav-away'}`
              : 'flex-1 relative'
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
            onlineCount={activeOnlineCount}
            onOpenManage={canManageActive ? () => openManage() : undefined}
            onLeaveRoom={isManagedRoom(activeRoom) ? () => requestLeaveRoom(activeRoom) : undefined}
            getRoomAvatar={getRoomAvatar}
            getRoomColor={getRoomColor}
            onBackToRooms={() => setMobileView('list')}
            isSelectMode={isSelectMode}
            selectedMessageIds={selectedMessageIds}
            onCancelSelectMode={clearSelection}
            onPinSelected={() => {
              const firstId = Array.from(selectedMessageIds)[0];
              if (firstId) {
                togglePinMessage(firstId);
                clearSelection();
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
            pinned={pinned}
            onJumpToMessage={jumpToMessage}
            getCleanMessageText={getCleanMessageText}
            formatDateHeader={formatSeparatorDate}
            isChatDragging={isDraggingFile}
            showScrollDownBtn={showScrollDownBtn}
            onScrollToBottom={scrollToBottom}
            unreadCount={unreadCount}
            isSelectMode={isSelectMode}
            selectedMessageIds={selectedMessageIds}
            onToggleSelectMessage={toggleSelectedMessage}
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
          {textRestriction && !editingMessage ? (
            <RestrictedComposer
              channel={activeRoom?.type === 'channel'}
              reason={textRestriction}
              muted={Boolean(activeRoomId && mutedRooms[activeRoomId])}
              onToggleMute={() => activeRoomId && toggleRoomMute(activeRoomId)}
            />
          ) : (
          <ChatInputBar
            mediaRestriction={mediaRestriction}
            pollRestriction={pollRestriction}
            selectedFiles={selectedFiles}
            onRemoveSelectedFile={removeSelectedFile}
            onClearSelectedFiles={clearSelectedFiles}
            onAddFiles={acceptIncomingFiles}
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
            onEmojiBackspace={deleteEmojiBackward}
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
            onOpenPollModal={() => setShowPollModal(true)}
            inputActionMode={inputActionMode}
            setInputActionMode={setInputActionMode}
            onVoicePointerDown={handleVoicePointerDown}
            onVoicePointerMove={handleVoicePointerMove}
            onVoicePointerUp={handleVoicePointerUp}
            onSend={handleSend}
          />
          )}
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
            messages={activeMessages}
            onOpenGalleryMedia={(msgId) => setActiveGalleryMediaId(msgId)}
            onJumpToMessage={jumpToMessage}
            onStartAudioCall={() => startCall('audio')}
            onStartVideoCall={() => startCall('video')}
            onStartSearch={() => setIsSearching(true)}
            onToast={showToast}
            onOpenManage={openManage}
            onLeaveRoom={isManagedRoom(activeRoom) ? () => requestLeaveRoom(activeRoom) : undefined}
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
        setThemePreview={setThemePreview}
        isStoryCreateOpen={isStoryCreateOpen}
        setIsStoryCreateOpen={setIsStoryCreateOpen}
        onSendStoryReply={async (peerUserId, text, storyReply) => {
          // Stories can be public, so there may be no chat with the author yet — open one.
          const dmRoom =
            rooms.find(r => r.type === 'direct' && r.participants.includes(peerUserId as UserId)) ??
            (await createDirectChat(peerUserId));
          if (dmRoom) {
            sendMessage(text, undefined, undefined, dmRoom.id, undefined, undefined, { storyReply });
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
        isMessagePinned={pinned.isPinned}
        onDeleteMessageAnimated={handleDeleteMessageAnimated}
        onToggleReaction={(msgId, emoji) => toggleReaction(msgId, emoji)}
        forwardMessage={forwardMessage}
        toast={toast}
        setToast={setToast}
        showToast={showToast}
        showQrModal={showQrModal}
        setShowQrModal={setShowQrModal}
        showNewChatModal={showNewChatModal}
        newChatMode={newChatMode}
        setShowNewChatModal={setShowNewChatModal}
      />

      <VideoNoteRecorderOverlay recorder={videoNote} />

      <DeleteMessagesDialog
        request={pendingDelete}
        isDesktop={isDesktopView}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />

      {manageRoom && (
        <RoomManageSheet
          key={manageRoom.id}
          room={manageRoom}
          initialPage={manage?.page}
          initialUserId={manage?.userId}
          onClose={() => setManage(null)}
          onToast={showToast}
        />
      )}
      <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />
      <JoinRoomModal
        target={joinTarget}
        onClose={closeJoin}
        onOpened={(roomId) => {
          setActiveRoomId(roomId);
          setMobileView('chat');
        }}
      />
    </div>
  );
};

export default ChatScreen;
