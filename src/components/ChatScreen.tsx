import React, { useState, useEffect, useRef } from 'react';
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
  IconEdit,
  IconShare3,
  IconTrash,
  IconPin,
  IconUser
} from '@tabler/icons-react';
import { TelegramEmojiPickerModal } from './TelegramEmojiPickerModal';
import { TelegramContextMenuModal } from './TelegramContextMenuModal';
import { ProfileEditModal } from './ProfileEditModal';

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
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // File & Voice Attachment states
  const [selectedFile, setSelectedFile] = useState<{ name: string; type: 'image' | 'audio' | 'video' | 'video_note' | 'file'; data: string; size: number; rawBlob?: Blob | File } | null>(null);
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

  // Reset visible count on room switch
  useEffect(() => {
    setVisibleCount(40);
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

  const handleForwardToRoom = (targetRoomId: string) => {
    if (!forwardingMessage) return;
    const origText = forwardingMessage.text;
    const origFile = forwardingMessage.file;
    const sender = USER_NAMES[forwardingMessage.sender] || forwardingMessage.sender;

    setActiveRoomId(targetRoomId);
    sendMessage(
      origText ? `[Переслано от ${sender}]:\n${origText}` : `[Переслано от ${sender}]`,
      undefined,
      origFile || undefined
    );
    setForwardingMessage(null);
    showToast(`Сообщение переслано`);
  };

  // Filter messages by search query
  const filteredMessages = searchQuery.trim()
    ? activeMessages.filter((m) => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : activeMessages;

  const slicedMessages = filteredMessages.slice(-visibleCount);

  // Get peer online status for direct chat
  const activePeerId = activeRoom?.type === 'direct' ? activeRoom.participants.find(p => p !== currentUser) : null;
  const isPeerOnline = activePeerId ? onlineStatus[activePeerId] : false;

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

  const handleScroll = () => {
    if (!messageFeedRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messageFeedRef.current;
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 150;
  };

  const prevMessagesCountRef = useRef(activeMessages.length);
  const prevRoomIdRef = useRef(activeRoomId);

  // Smart auto-scroll on NEW messages or room change ONLY (never on reactions or edits)
  useEffect(() => {
    const isRoomChange = activeRoomId !== prevRoomIdRef.current;
    const isNewMessage = activeMessages.length > prevMessagesCountRef.current;

    prevMessagesCountRef.current = activeMessages.length;
    prevRoomIdRef.current = activeRoomId;

    if (isRoomChange) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      return;
    }

    if (isNewMessage) {
      const lastMessage = activeMessages[activeMessages.length - 1];
      const isSelf = lastMessage?.sender === currentUser;
      if (isSelf || isNearBottomRef.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [activeMessages, activeRoomId, currentUser]);

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
      remoteAudioRef.current.play().catch(() => {});
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
      } catch {}
      oscillatorRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {}
      audioCtxRef.current = null;
    }
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const maxHeight = 120;
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`;
    }
  };

  const handleInputChange = (text: string) => {
    setInputText(text);
    setTimeout(adjustTextareaHeight, 0);

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

  // File selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      let type: 'image' | 'audio' | 'video' | 'file' = 'file';
      const name = file.name.toLowerCase();
      if (file.type.startsWith('image/') || name.match(/\.(jpg|jpeg|png|gif|webp|heic)$/)) type = 'image';
      else if (file.type.startsWith('audio/') || name.match(/\.(mp3|wav|ogg|m4a|aac)$/)) type = 'audio';
      else if (file.type.startsWith('video/') || name.match(/\.(mp4|webm|mov)$/)) type = 'video';

      setSelectedFile({
        name: file.name,
        type,
        data: reader.result as string,
        size: file.size,
        rawBlob: file
      });
    };
    reader.readAsDataURL(file);
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
      const peerId = room.participants.find(p => p !== currentUser);
      return peerId ? (USER_NAMES[peerId] || peerId) : room.name;
    }
    return room.name;
  };

  const getRoomColor = (room: Room) => {
    if (room.type === 'group') return 'bg-[#3390ec]';
    const peerId = room.participants.find(p => p !== currentUser) || '';
    return ROOM_AVATAR_COLORS[peerId] || 'bg-[#3390ec]';
  };

  const getLastMessagePreview = (msg: Message | null) => {
    if (!msg) return '';
    const prefix = msg.sender === currentUser ? 'Вы: ' : `${USER_NAMES[msg.sender] || msg.sender}: `;
    
    if (msg.file) {
      if (msg.file.type === 'image') return `${prefix}🖼 Фото`;
      if (msg.file.type === 'audio') return `${prefix}🎤 Голосовое сообщение`;
      if (msg.file.type === 'video') return `${prefix}📹 Видео-кружок`;
      return `${prefix}📁 ${msg.file.name}`;
    }
    return `${prefix}${msg.text}`;
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
        className={`w-full md:w-[360px] lg:w-[400px] tg-sidebar flex flex-col shrink-0 transition-transform duration-150 z-20 ${
          mobileView === 'list' 
            ? 'translate-x-0 flex' 
            : '-translate-x-full md:translate-x-0 absolute md:relative z-20 h-full left-0 top-0 hidden md:flex'
        }`}
      >
        {/* Top Bar: Hamburger + Search Input */}
        <div className="p-2.5 flex items-center gap-2 relative">
          <button
            type="button"
            onClick={() => setShowMenuDropdown(!showMenuDropdown)}
            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
            title="Меню"
          >
            <IconMenu2 size={20} />
          </button>

          {/* Menu Dropdown */}
          {showMenuDropdown && (
            <div className="absolute top-12 left-3 z-50 w-60 tg-header rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 py-2 animate-pop-in select-none">
              {/* User Profile Card */}
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
                    {currentUserProfile?.username ? `@${currentUserProfile.username}` : (currentUserProfile?.bio || 'Нажмите, чтобы настроить')}
                  </span>
                </div>
              </div>

              {/* Menu Actions */}
              <div className="pt-1.5 space-y-0.5 px-1">
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
          )}

          {/* Search bar */}
          <div className="flex-1 relative">
            <IconSearch size={16} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={roomFilterQuery}
              onChange={(e) => setRoomFilterQuery(e.target.value)}
              placeholder="Search"
              className="w-full pl-9 pr-7 py-1.5 rounded-full bg-slate-100 dark:bg-[#242f3d] border-none text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#3390ec]"
            />
            {roomFilterQuery && (
              <button
                type="button"
                onClick={() => setRoomFilterQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <IconX size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Stories / Active Contacts Circular Row */}
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

        {/* Folder Tabs (All chats) */}
        <div className="px-3 pt-2 pb-1 flex items-center gap-2 text-xs font-semibold select-none">
          <div className="px-3 py-1 rounded-full bg-[#3390ec] text-white flex items-center gap-1.5 shadow-xs">
            <span>Все</span>
            <span className="text-[10px] bg-white/20 px-1 rounded-full">{rooms.length}</span>
          </div>
        </div>

        {/* Chat List Items */}
        <div className="flex-1 overflow-y-auto px-1.5 py-1 space-y-0.5">
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
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors cursor-pointer text-left select-none ${
                  isActive 
                    ? 'bg-[#3390ec] text-white shadow-xs' 
                    : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-800 dark:text-slate-200'
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt={getRoomDisplayName(room)} 
                      className="w-12 h-12 rounded-full object-cover shadow-xs" 
                    />
                  ) : (
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${
                      isActive ? 'bg-white/20 text-white' : `${getRoomColor(room)} text-white`
                    }`}>
                      {room.type === 'group' ? (
                        <IconUsers size={20} />
                      ) : (
                        getRoomDisplayName(room).charAt(0).toUpperCase()
                      )}
                    </div>
                  )}

                  {room.type === 'direct' && isOnline && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#17212b]" />
                  )}
                </div>

                {/* Details */}
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
                      <span className={`text-xs font-semibold flex items-center gap-1 truncate ${isActive ? 'text-white' : 'text-[#3390ec]'}`}>
                        <span>печатает...</span>
                      </span>
                    ) : (
                      <span className={`text-[13px] truncate block flex-1 ${
                        isActive ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        {lastMsg ? getLastMessagePreview(lastMsg) : (room.type === 'group' ? 'Группа семьи' : isOnline ? 'В сети' : 'Не в сети')}
                      </span>
                    )}
                    
                    {count > 0 && (
                      <span className={`shrink-0 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold ${
                        isActive ? 'bg-white text-[#3390ec]' : 'bg-[#3390ec] text-white'
                      }`}>
                        {count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* 2. Main Center Chat Panel: Telegram Wallpaper & Bubbles */}
      <main 
        className={`flex-1 flex flex-col h-full tg-chat-canvas transition-transform duration-150 relative ${
          mobileView === 'chat' 
            ? 'translate-x-0 flex' 
            : '-translate-x-full md:translate-x-0 absolute md:relative z-10 w-full h-full hidden md:flex'
        }`}
      >
        {/* Telegram Chat Header or Top Selection Action Bar */}
        <header className="px-4 py-2.5 tg-header flex items-center justify-between z-10 select-none shadow-xs min-h-[58px] transition-all">
          {isSelectMode ? (
            <div className="w-full flex items-center justify-between animate-pop-in">
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
                  onClick={() => {
                    selectedMessageIds.forEach(id => deleteMessage(id));
                    setIsSelectMode(false);
                    setSelectedMessageIds(new Set());
                    showToast('Сообщения удалены');
                  }}
                  disabled={selectedMessageIds.size === 0}
                  className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 disabled:opacity-30 cursor-pointer transition-colors"
                  title="Удалить"
                >
                  <IconTrash size={20} />
                </button>
              </div>
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
                    <div className={`w-10 h-10 rounded-full ${getRoomColor(activeRoom)} text-white flex items-center justify-center text-sm font-bold shadow-xs`}>
                      {activeRoom.type === 'group' ? <IconUsers size={20} /> : getRoomDisplayName(activeRoom).charAt(0).toUpperCase()}
                    </div>
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
                {isSearching ? (
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#242f3d] px-3 py-1.5 rounded-full">
                    <IconSearch size={16} className="text-slate-400" />
                    <input
                      type="text"
                      placeholder="Поиск в чате..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent border-none text-xs text-slate-900 dark:text-white focus:outline-none w-28 sm:w-48 placeholder-slate-400"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsSearching(false);
                        setSearchQuery('');
                      }}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <IconX size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsSearching(true)}
                      className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                      title="Поиск"
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
                      onClick={() => setShowUserInfo(!showUserInfo)}
                      className={`p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors ${
                        showUserInfo ? 'text-[#3390ec]' : 'text-slate-500 dark:text-slate-400'
                      }`}
                      title="Информация"
                    >
                      <IconDotsVertical size={20} />
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </header>

        {/* Pinned Message Banner */}
        {currentPinnedMessage && (
          <div 
            onClick={() => {
              const el = document.getElementById(`msg-${currentPinnedMessage.id}`);
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            className="px-4 py-1.5 bg-white/95 dark:bg-[#17212b]/95 border-b border-slate-200 dark:border-white/10 flex items-center justify-between cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors z-20 backdrop-blur-md animate-pop-in select-none shadow-xs"
          >
            <div className="flex items-center gap-2.5 min-w-0 border-l-[3px] border-[#3390ec] pl-2.5">
              <div className="min-w-0">
                <span className="text-[11.5px] font-bold text-[#3390ec] block">Закреплённое сообщение</span>
                <span className="text-[12px] text-slate-700 dark:text-slate-300 truncate block">
                  {currentPinnedMessage.text || (currentPinnedMessage.file ? '📎 Вложение' : '')}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePinMessage(currentPinnedMessage.id);
              }}
              className="p-1 rounded-full text-slate-400 hover:text-rose-500 cursor-pointer"
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
          className="flex-1 overflow-y-auto px-4 sm:px-8 py-3"
        >
          <div key={activeRoomId} className="max-w-2xl mx-auto w-full flex flex-col min-h-full justify-end animate-chat-switch">
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
                  <div className={isSameSender ? 'mt-0.5' : 'mt-1.5'}>
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
                    />
                  </div>
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </section>

        {/* Selected File Preview */}
        {selectedFile && (
          <div className="max-w-2xl mx-auto w-full px-4 mb-2">
            <div className="p-2.5 tg-header rounded-2xl flex items-center justify-between shadow-md border border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2.5 min-w-0">
                {selectedFile.type === 'image' ? (
                  <img src={selectedFile.data} className="w-10 h-10 rounded-lg object-cover" alt="thumbnail" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-[#3390ec] flex items-center justify-center text-white text-xs font-bold">
                    📄
                  </div>
                )}
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white truncate block">{selectedFile.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{(selectedFile.size / 1024).toFixed(1)} КБ</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="p-1 rounded-full text-slate-400 hover:text-rose-500 cursor-pointer"
              >
                <IconX size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Editing Message Bar */}
        {editingMessage && (
          <div className="max-w-2xl mx-auto w-full px-4 mb-2">
            <div className="p-2 tg-header rounded-xl flex items-center justify-between shadow-md border-l-[3px] border-amber-500 border-slate-200 dark:border-white/10 animate-pop-in">
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
                className="p-1 rounded-full text-slate-400 hover:text-rose-500 cursor-pointer"
                title="Отменить"
              >
                <IconX size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Reply Quote Bar */}
        {replyingToMessage && (
          <div className="max-w-2xl mx-auto w-full px-4 mb-2">
            <div className="p-2 tg-header rounded-xl flex items-center justify-between shadow-md border-l-[3px] border-[#3390ec] border-slate-200 dark:border-white/10">
              <div className="min-w-0 pl-1">
                <span className="text-[11px] font-bold text-[#3390ec] block">
                  Ответ для: {replyingToMessage.sender === currentUser ? 'Вы' : (USER_NAMES[replyingToMessage.sender] || replyingToMessage.sender)}
                </span>
                <span className="text-xs text-slate-700 dark:text-slate-300 truncate block mt-0.5">
                  {replyingToMessage.text || (replyingToMessage.file ? '📎 Вложение' : '')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setReplyingToMessage(null)}
                className="p-1 rounded-full text-slate-400 hover:text-rose-500 cursor-pointer"
              >
                <IconX size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Emoji Quick Picker */}
        {showEmojiPicker && (
          <div className="max-w-2xl mx-auto w-full px-4 mb-2 flex justify-end">
            <TelegramEmojiPickerModal
              onSelectEmoji={(emoji) => insertEmoji(emoji)}
              onClose={() => setShowEmojiPicker(false)}
            />
          </div>
        )}

        {/* Telegram Bottom Input Bar */}
        <footer className="p-2 sm:p-3 relative z-10">
          <div className="max-w-2xl mx-auto w-full flex items-end gap-2">
            
            {/* Input Capsule */}
            <form onSubmit={handleSend} className="flex-1 flex items-center min-h-[44px] sm:min-h-[46px] px-2.5 py-1 rounded-[23px] tg-input-capsule">
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
                className="p-1.5 text-slate-400 hover:text-[#3390ec] cursor-pointer shrink-0 transition-colors flex items-center justify-center"
                title="Прикрепить"
              >
                <IconPaperclip size={20} />
              </button>

              {/* Input */}
              {isRecording ? (
                <div className="flex-1 flex items-center justify-between py-1 px-2 text-rose-500 font-semibold text-xs font-mono">
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
                  placeholder="Message"
                  className="flex-1 py-1.5 px-1 bg-transparent border-none text-slate-900 dark:text-white text-[15px] focus:outline-none focus:ring-0 placeholder-slate-400 resize-none max-h-[120px] leading-snug"
                />
              )}

              {/* Emoji */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1.5 text-slate-400 hover:text-[#3390ec] cursor-pointer shrink-0 transition-colors flex items-center justify-center"
                title="Эмодзи"
              >
                <IconMoodSmile size={20} />
              </button>

              {/* Video Note Circle */}
              <button
                type="button"
                onClick={startVideoRecording}
                className="p-1.5 text-slate-400 hover:text-[#3390ec] cursor-pointer shrink-0 transition-colors flex items-center justify-center"
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
        </footer>
      </main>

      {/* 3. Right Sidebar: Telegram User Info Panel */}
      {showUserInfo && (
        <aside className="w-80 tg-user-panel h-full flex flex-col shrink-0 z-20 animate-pop-in">
          {/* Header */}
          <div className="p-3.5 flex items-center justify-between border-b border-slate-200 dark:border-white/5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowUserInfo(false)}
                className="p-1 rounded-full text-slate-500 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                <IconX size={20} />
              </button>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0">
                Информация
              </h3>
            </div>
          </div>

          {/* Profile Card */}
          <div className="p-5 flex flex-col items-center text-center border-b border-slate-200 dark:border-white/5">
            <div className={`w-24 h-24 rounded-full ${activeRoom ? getRoomColor(activeRoom) : 'bg-[#3390ec]'} text-white flex items-center justify-center text-3xl font-bold mb-3 shadow-md`}>
              {activeRoom ? (activeRoom.type === 'group' ? <IconUsers size={40} /> : getRoomDisplayName(activeRoom).charAt(0)) : '?'}
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white m-0">
              {activeRoom ? getRoomDisplayName(activeRoom) : ''}
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {activePeerId ? (isPeerOnline ? 'в сети' : 'был(а) недавно') : `${activeRoom?.participants.length} участников`}
            </span>
          </div>

          {/* Details List */}
          <div className="p-4 space-y-4 text-xs">
            {activePeerId && (
              <>
                <div className="flex items-center gap-3">
                  <IconPhoneCall size={18} className="text-slate-400" />
                  <div>
                    <span className="text-slate-900 dark:text-white font-medium block">+7 999 {Math.abs(activePeerId.split('').reduce((a, b) => a + b.charCodeAt(0), 1000)).toString().padEnd(7, '0')}</span>
                    <span className="text-[10px] text-slate-400">Телефон</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <IconUserCheck size={18} className="text-slate-400" />
                  <div>
                    <span className="text-slate-900 dark:text-white font-medium block">@{activePeerId}</span>
                    <span className="text-[10px] text-slate-400">Имя пользователя</span>
                  </div>
                </div>
              </>
            )}

            {/* Notifications Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <IconBell size={18} className="text-slate-400" />
                <span className="text-slate-900 dark:text-white font-medium">Уведомления</span>
              </div>
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                className="w-4 h-4 text-[#3390ec] rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Shared Media Tabs */}
          <div className="flex-1 p-4 border-t border-slate-100 dark:border-white/5 overflow-y-auto">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
              Общие медиа
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {activeMessages.filter(m => m.file?.type === 'image').slice(-6).map((m) => (
                <img
                  key={m.id}
                  src={m.file?.data}
                  alt="shared"
                  className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                />
              ))}
            </div>
          </div>
        </aside>
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
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer ${
                        isMuted ? 'bg-rose-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
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
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer ${
                        isCameraOff ? 'bg-rose-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
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
            deleteMessage(msg.id);
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

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#17212b]/95 dark:bg-[#242f3d]/95 text-white px-4 py-2 rounded-full shadow-2xl text-xs font-medium backdrop-blur-md border border-white/10 animate-pop-in select-none">
          {toastMessage}
        </div>
      )}

      {/* Selection Mode Bottom Action Bar (1:1 with Telegram Web) */}
      {isSelectMode && (
        <div className="fixed bottom-3 inset-x-3 sm:inset-x-6 z-40 max-w-2xl mx-auto bg-white/98 dark:bg-[#17212b]/98 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 px-4 py-2.5 flex items-center justify-between animate-pop-in select-none backdrop-blur-md">
          {/* Left: Red Trash */}
          <button
            type="button"
            onClick={() => {
              selectedMessageIds.forEach(id => deleteMessage(id));
              setIsSelectMode(false);
              setSelectedMessageIds(new Set());
              showToast('Сообщения удалены');
            }}
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

    </div>
  );
};
