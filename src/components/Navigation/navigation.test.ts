import { describe, it, expect } from 'vitest';
import type { Room } from '../../types';
import type { ChatFolderId, FolderCountInfo } from './ChatFolderTabs';

// Test mock dataset
const mockRooms: Room[] = [
  { id: 'family', name: 'Семья', type: 'group', participants: ['vlad', 'mom', 'dad', 'sister'] },
  { id: 'work-team', name: 'Команда разработчиков', type: 'group', participants: ['vlad', 'anya', 'mom'] },
  { id: 'girlfriend', name: 'Аня', type: 'direct', participants: ['vlad', 'anya'] },
  { id: 'mom-dm', name: 'Мама', type: 'direct', participants: ['vlad', 'mom'] },
  { id: 'dad-dm', name: 'Папа', type: 'direct', participants: ['vlad', 'dad'] },
  { id: 'saved-messages', name: 'Избранное', type: 'direct', participants: ['vlad'] },
];

const mockUnreadCounts: Record<string, number> = {
  'family': 3,
  'girlfriend': 5,
  'work-team': 0,
  'mom-dm': 0,
  'dad-dm': 0,
  'saved-messages': 0,
};

const unreadCountGetter = (roomId: string) => mockUnreadCounts[roomId] || 0;
const isSavedRoom = (r: Room) => r.id === 'saved-messages' || r.id === 'saved';

// Pure helper function corresponding to folder filtering logic in ChatScreen
export const filterRoomsByFolderAndQuery = (
  rooms: Room[],
  folder: ChatFolderId,
  query: string = '',
  unreadGetter: (roomId: string) => number = unreadCountGetter
): Room[] => {
  return rooms.filter((r) => {
    // 1. Folder filter
    if (folder === 'direct') {
      if (r.type !== 'direct' || isSavedRoom(r)) return false;
    } else if (folder === 'groups') {
      if (r.type !== 'group') return false;
    } else if (folder === 'unread') {
      if (unreadGetter(r.id) <= 0) return false;
    } else if (folder === 'saved') {
      if (!isSavedRoom(r)) return false;
    }

    // 2. Query filter
    if (!query.trim()) return true;
    return r.name.toLowerCase().includes(query.trim().toLowerCase());
  });
};

// Pure helper function for calculating folder badges
export const calculateFolderCounts = (
  rooms: Room[],
  unreadGetter: (roomId: string) => number = unreadCountGetter
): Record<ChatFolderId, FolderCountInfo> => {
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
    const u = unreadGetter(r.id);
    allUnread += u;
    const isSaved = isSavedRoom(r);
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
};

describe('Master Navigation Suite (ChatFolderTabs & Folder Filtering)', () => {
  it('correctly filters all rooms under "all" folder', () => {
    const result = filterRoomsByFolderAndQuery(mockRooms, 'all');
    expect(result.length).toBe(6);
  });

  it('correctly filters only direct messages under "direct" folder (excluding saved messages)', () => {
    const result = filterRoomsByFolderAndQuery(mockRooms, 'direct');
    expect(result.map((r) => r.id)).toEqual(['girlfriend', 'mom-dm', 'dad-dm']);
    expect(result.length).toBe(3);
  });

  it('correctly filters group chats under "groups" folder', () => {
    const result = filterRoomsByFolderAndQuery(mockRooms, 'groups');
    expect(result.map((r) => r.id)).toEqual(['family', 'work-team']);
    expect(result.length).toBe(2);
  });

  it('correctly filters only chats with unread messages under "unread" folder', () => {
    const result = filterRoomsByFolderAndQuery(mockRooms, 'unread');
    expect(result.map((r) => r.id)).toEqual(['family', 'girlfriend']);
    expect(result.length).toBe(2);
  });

  it('correctly filters saved messages under "saved" folder', () => {
    const result = filterRoomsByFolderAndQuery(mockRooms, 'saved');
    expect(result.map((r) => r.id)).toEqual(['saved-messages']);
    expect(result.length).toBe(1);
  });

  it('combines folder filtering with query search correctly', () => {
    const result = filterRoomsByFolderAndQuery(mockRooms, 'direct', 'Аня');
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('girlfriend');

    const noResult = filterRoomsByFolderAndQuery(mockRooms, 'groups', 'Аня');
    expect(noResult.length).toBe(0);
  });

  it('calculates unread and total counters for all folder tabs accurately', () => {
    const counts = calculateFolderCounts(mockRooms);
    expect(counts.all).toEqual({ total: 6, unread: 8 });
    expect(counts.direct).toEqual({ total: 3, unread: 5 });
    expect(counts.groups).toEqual({ total: 2, unread: 3 });
    expect(counts.unread).toEqual({ total: 2, unread: 8 });
    expect(counts.saved).toEqual({ total: 1, unread: 0 });
  });
});

describe('Master Navigation Suite (Command Palette & Hotkeys)', () => {
  interface MockCommand {
    id: string;
    category: 'chats' | 'actions' | 'settings';
    title: string;
    keywords?: string[];
  }

  const mockCommands: MockCommand[] = [
    { id: 'room-1', category: 'chats', title: 'Аня', keywords: ['anya', 'direct'] },
    { id: 'room-2', category: 'chats', title: 'Семья', keywords: ['family', 'group'] },
    { id: 'act-poll', category: 'actions', title: 'Создать опрос или викторину', keywords: ['poll', 'quiz', 'опрос'] },
    { id: 'act-story', category: 'actions', title: 'Опубликовать историю', keywords: ['story', 'история', 'статус'] },
    { id: 'set-theme', category: 'settings', title: 'Оформление и обои', keywords: ['тема', 'обои', 'wallpapers'] },
  ];

  const searchCommands = (commands: MockCommand[], query: string, category: string = 'all') => {
    let list = commands;
    if (category !== 'all') {
      list = list.filter((c) => c.category === category);
    }
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => {
      const matchTitle = c.title.toLowerCase().includes(q);
      const matchKeywords = c.keywords?.some((k) => k.toLowerCase().includes(q));
      return matchTitle || matchKeywords;
    });
  };

  it('searches actions by title and keywords (e.g. "опрос" or "quiz")', () => {
    const resultsPoll = searchCommands(mockCommands, 'опрос');
    expect(resultsPoll.length).toBe(1);
    expect(resultsPoll[0].id).toBe('act-poll');

    const resultsQuiz = searchCommands(mockCommands, 'quiz');
    expect(resultsQuiz.length).toBe(1);
    expect(resultsQuiz[0].id).toBe('act-poll');
  });

  it('filters commands by category pill', () => {
    const chatResults = searchCommands(mockCommands, '', 'chats');
    expect(chatResults.length).toBe(2);
    expect(chatResults.every((c) => c.category === 'chats')).toBe(true);

    const settingResults = searchCommands(mockCommands, '', 'settings');
    expect(settingResults.length).toBe(1);
    expect(settingResults[0].id).toBe('set-theme');
  });

  it('handles empty search queries gracefully', () => {
    const allResults = searchCommands(mockCommands, '');
    expect(allResults.length).toBe(5);
  });
});
