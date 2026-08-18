import React, { useState, useMemo, useEffect } from 'react';
import { useSearchMessages } from '../hooks/useSearchMessages';
import { SearchBar } from '../components/Search/SearchBar';
import { SearchHistory } from '../components/Search/SearchHistory';
import { SearchResults } from '../components/Search/SearchResults';
import type { Message, Room, UserProfile } from '../types';
import { USER_NAMES, ALL_ROOMS } from '../constants';
import { IconChevronLeft, IconWorld, IconMessageDots } from '@tabler/icons-react';

export interface SearchPageProps {
  roomId?: string;
  userId?: string;
  allMessages?: Message[];
  rooms?: Room[];
  userProfiles?: Record<string, UserProfile>;
  onNavigateToMessage?: (item: any) => void;
  onClose?: () => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({
  roomId,
  userId = 'vlad',
  allMessages = [],
  rooms = [],
  userProfiles = {},
  onNavigateToMessage,
  onClose,
}) => {
  const [searchScope, setSearchScope] = useState<'all' | 'room'>(roomId ? 'room' : 'all');
  const [activeTab, setActiveTab] = useState<'all' | 'media' | 'files' | 'voice' | 'today'>('all');
  const [searchHistoryList, setSearchHistoryList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`search_history_${userId}`);
      return saved ? JSON.parse(saved) : ['привет', 'документ', 'фото'];
    } catch {
      return [];
    }
  });

  const saveHistory = (q: string) => {
    const clean = q.trim();
    if (!clean || clean.length < 2) return;
    setSearchHistoryList((prev) => {
      const next = [clean, ...prev.filter((item) => item !== clean)].slice(0, 10);
      try {
        localStorage.setItem(`search_history_${userId}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const clearHistory = () => {
    setSearchHistoryList([]);
    try {
      localStorage.removeItem(`search_history_${userId}`);
    } catch {}
  };

  const {
    query,
    setQuery,
    setFilters,
    results: dbResults,
    isLoading: isDbLoading,
    hasMore,
    loadMore,
    clearSearch,
  } = useSearchMessages({ roomId: searchScope === 'room' ? roomId : undefined, userId });

  const getRoomName = (rId: string): string => {
    const rList = rooms.length > 0 ? rooms : ALL_ROOMS;
    const room = rList.find((r) => r.id === rId);
    if (!room) return 'Чат';
    if (room.name) return room.name;
    const peer = room.participants?.find((p) => p !== userId);
    return peer ? (USER_NAMES[peer] || peer) : room.name || 'Диалог';
  };

  const createHighlightedSnippet = (text: string, q: string) => {
    if (!text) return '';
    const cleanText = text
      .replace(/^[\u200B\s]*\[fwd:[^\]]+\][\u200B\s]*/g, '')
      .replace(/^\[Переслано от [^\]]+\]:\s*/, '');
    if (!q) return cleanText;
    const lowerText = cleanText.toLowerCase();
    const lowerQ = q.toLowerCase();
    const index = lowerText.indexOf(lowerQ);
    if (index === -1) return cleanText.length > 90 ? cleanText.slice(0, 90) + '...' : cleanText;

    const start = Math.max(0, index - 30);
    const end = Math.min(cleanText.length, index + q.length + 50);
    const prefix = start > 0 ? '...' : '';
    const suffix = end < cleanText.length ? '...' : '';
    const matchSegment = cleanText.slice(index, index + q.length);

    return `${prefix}${cleanText.slice(start, index)}<span class="text-[#3390ec] font-bold">${matchSegment}</span>${cleanText.slice(index + q.length, end)}${suffix}`;
  };

  // In-memory instant search across all loaded messages
  const localResults = useMemo(() => {
    if (!allMessages || allMessages.length === 0) return [];
    const cleanQ = query.trim().toLowerCase();

    let filtered = [...allMessages];

    // 1. Search Scope
    if (searchScope === 'room' && roomId) {
      filtered = filtered.filter((m) => m.roomId === roomId);
    }

    // 2. Query matching (text, file name, sender)
    if (cleanQ) {
      filtered = filtered.filter((m) => {
        const cleanMsgText = (m.text || '')
          .replace(/^[\u200B\s]*\[fwd:[^\]]+\][\u200B\s]*/g, '')
          .replace(/^\[Переслано от [^\]]+\]:\s*/, '');
        const textMatch = cleanMsgText.toLowerCase().includes(cleanQ);
        const fileNameMatch = m.file && m.file.name.toLowerCase().includes(cleanQ);
        const senderName = USER_NAMES[m.sender] || m.sender;
        const senderMatch = senderName.toLowerCase().includes(cleanQ);
        return textMatch || fileNameMatch || senderMatch;
      });
    }

    // 3. Tab filter
    if (activeTab === 'media') {
      filtered = filtered.filter((m) => m.file && ['image', 'video', 'video_note'].includes(m.file.type));
    } else if (activeTab === 'files') {
      filtered = filtered.filter(
        (m) => m.file && (m.file.type === 'file' || !['image', 'video', 'video_note', 'audio'].includes(m.file.type))
      );
    } else if (activeTab === 'voice') {
      filtered = filtered.filter((m) => m.file && m.file.type === 'audio');
    } else if (activeTab === 'today') {
      const todayStr = new Date().toDateString();
      filtered = filtered.filter((m) => new Date(m.timestamp).toDateString() === todayStr);
    }

    // Sort newest first
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    return filtered.map((m) => {
      const rName = getRoomName(m.roomId);
      const cleanMsgText = (m.text || '')
        .replace(/^[\u200B\s]*\[fwd:[^\]]+\][\u200B\s]*/g, '')
        .replace(/^\[Переслано от [^\]]+\]:\s*/, '');
      const headline = createHighlightedSnippet(cleanMsgText || (m.file ? m.file.name : ''), cleanQ);
      const senderProfile = userProfiles[m.sender];
      return {
        id: m.id,
        roomId: m.roomId,
        room_id: m.roomId,
        roomName: rName,
        sender: {
          id: m.sender,
          username: m.sender,
          display_name: senderProfile?.firstName || USER_NAMES[m.sender] || m.sender,
          avatar_url: senderProfile?.avatarUrl,
        },
        content: cleanMsgText,
        text: cleanMsgText,
        timestamp: m.timestamp,
        created_at: new Date(m.timestamp).toISOString(),
        headline,
        file: m.file,
      };
    });
  }, [allMessages, query, activeTab, searchScope, roomId, rooms, userProfiles, userId]);

  // Combine local and remote results (deduplicating by message id)
  const combinedResults = useMemo(() => {
    const map = new Map<string, any>();
    localResults.forEach((item) => map.set(item.id, item));
    dbResults.forEach((item) => {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    });
    return Array.from(map.values());
  }, [localResults, dbResults]);

  // Save history on query submit / debounce
  useEffect(() => {
    if (query.trim().length >= 2) {
      const t = setTimeout(() => saveHistory(query), 1200);
      return () => clearTimeout(t);
    }
  }, [query]);

  const handleTabChange = (tab: 'all' | 'media' | 'files' | 'voice' | 'today') => {
    setActiveTab(tab);
    if (tab === 'all') {
      setFilters({});
    } else if (tab === 'media') {
      setFilters({ contentType: 'image', hasAttachments: true });
    } else if (tab === 'files') {
      setFilters({ contentType: 'document', hasAttachments: true });
    } else if (tab === 'voice') {
      setFilters({ contentType: 'audio', hasAttachments: true });
    } else if (tab === 'today') {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      setFilters({ startDate: start });
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-[#0e1621] text-slate-900 dark:text-white">
      {/* Top Mobile-Friendly Header */}
      <div className="px-3 sm:px-4 py-2.5 border-b border-slate-200 dark:border-white/5 bg-white dark:bg-[#17212b] flex items-center gap-2 shrink-0">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-500 hover:text-[#3390ec] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Назад"
          >
            <IconChevronLeft size={24} />
          </button>
        )}

        <div className="flex-1">
          <SearchBar
            value={query}
            onChange={setQuery}
            onClear={clearSearch}
            isLoading={isDbLoading}
            placeholder={searchScope === 'room' && roomId ? 'Поиск в этом чате...' : 'Поиск во всех чатах...'}
            autoFocus
          />
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-xs sm:text-[13px] font-medium text-[#3390ec] hover:text-[#3390ec]/80 px-1 py-1 cursor-pointer shrink-0 transition-colors"
          >
            Отмена
          </button>
        )}
      </div>

      {/* Scope Switcher & Category Tabs Bar */}
      <div className="px-3 sm:px-4 py-2 border-b border-slate-200/70 dark:border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar select-none bg-slate-50 dark:bg-[#17212b]/60 shrink-0">
        {/* Scope Toggle: Everywhere vs This Chat */}
        {roomId && (
          <>
            <button
              type="button"
              onClick={() => setSearchScope('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all flex items-center gap-1 cursor-pointer ${
                searchScope === 'all'
                  ? 'bg-[#3390ec] text-white shadow-xs'
                  : 'bg-slate-200/60 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-300/70 dark:hover:bg-white/10'
              }`}
            >
              <IconWorld size={13} />
              <span>Везде</span>
            </button>
            <button
              type="button"
              onClick={() => setSearchScope('room')}
              className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all flex items-center gap-1 cursor-pointer ${
                searchScope === 'room'
                  ? 'bg-[#3390ec] text-white shadow-xs'
                  : 'bg-slate-200/60 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-300/70 dark:hover:bg-white/10'
              }`}
            >
              <IconMessageDots size={13} />
              <span>В этом чате</span>
            </button>
            <div className="w-[1px] h-4 bg-slate-300 dark:bg-white/10 mx-0.5 shrink-0" />
          </>
        )}

        {[
          { id: 'all', label: 'Все' },
          { id: 'media', label: 'Медиа' },
          { id: 'files', label: 'Файлы' },
          { id: 'voice', label: 'Голосовые' },
          { id: 'today', label: 'Сегодня' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabChange(tab.id as any)}
            className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#3390ec] text-white shadow-xs'
                : 'bg-slate-200/60 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-300/70 dark:hover:bg-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-2">
        {/* Search History when query is empty and tab is all */}
        {!query && activeTab === 'all' && (
          <SearchHistory
            history={searchHistoryList}
            onSelectQuery={setQuery}
            onClearHistory={clearHistory}
          />
        )}

        {/* Results Stream */}
        <SearchResults
          results={combinedResults}
          isLoading={isDbLoading}
          hasMore={hasMore}
          onLoadMore={loadMore}
          onSelectResult={onNavigateToMessage}
          query={query}
        />
      </div>
    </div>
  );
};

export default SearchPage;
