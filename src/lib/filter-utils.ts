/**
 * Filter and Sort Utilities for Secure Comms Messages
 * Multilingual, robust filtering, sorting, preset management and CSV/JSON export.
 */

export type AttachmentFilterType = 'image' | 'video' | 'audio' | 'document';
export type MessageTypeFilter = 'all' | 'text' | 'media' | 'system';
export type MessageSortBy =
  | 'date_desc'
  | 'date_asc'
  | 'relevance'
  | 'reactions_desc'
  | 'edited_desc';

export interface DateRangeFilter {
  startDate?: string | Date | null;
  endDate?: string | Date | null;
}

export interface FilterOptions {
  dateRange?: DateRangeFilter;
  senders?: string[]; // Array of userIds
  hasAttachments?: boolean;
  attachmentTypes?: AttachmentFilterType[];
  hasReactions?: boolean;
  isPinned?: boolean;
  isEdited?: boolean;
  messageType?: MessageTypeFilter;
  roomIds?: string[]; // For global search across multiple rooms
  searchQuery?: string;
  minReactions?: number;
  onlyUnread?: boolean;
}

export interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  filters: FilterOptions;
  sortBy?: MessageSortBy;
  isSystem?: boolean;
  icon?: string;
  createdAt?: string;
}

export interface FilterValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ActiveFilterTag {
  id: string;
  label: string;
  type: keyof FilterOptions | 'sortBy';
  value?: any;
}

/**
 * 1. Validate filter options (dates logical, senders valid, roomIds valid)
 */
export function validateFilters(filters: FilterOptions): FilterValidationResult {
  const errors: string[] = [];

  if (filters.dateRange?.startDate && filters.dateRange?.endDate) {
    const start = new Date(filters.dateRange.startDate).getTime();
    const end = new Date(filters.dateRange.endDate).getTime();

    if (isNaN(start)) {
      errors.push('Некорректная начальная дата');
    }
    if (isNaN(end)) {
      errors.push('Некорректная конечная дата');
    }
    if (!isNaN(start) && !isNaN(end) && start > end) {
      errors.push('Начальная дата не может быть позже конечной даты');
    }
  }

  if (filters.senders && (!Array.isArray(filters.senders) || filters.senders.some((s) => typeof s !== 'string' || !s.trim()))) {
    errors.push('Список отправителей должен содержать корректные идентификаторы');
  }

  if (filters.roomIds && (!Array.isArray(filters.roomIds) || filters.roomIds.some((r) => typeof r !== 'string' || !r.trim()))) {
    errors.push('Список комнат должен содержать корректные идентификаторы');
  }

  if (filters.minReactions !== undefined && (typeof filters.minReactions !== 'number' || filters.minReactions < 0)) {
    errors.push('Минимальное количество реакций не может быть отрицательным');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Helper to normalize any message entity timestamp to millisecond number
 */
export function getMessageTimestamp(msg: any): number {
  if (typeof msg.timestamp === 'number') return msg.timestamp;
  if (typeof msg.created_at === 'string' || typeof msg.created_at === 'number') {
    return new Date(msg.created_at).getTime();
  }
  if (typeof msg.createdAt === 'string' || typeof msg.createdAt === 'number') {
    return new Date(msg.createdAt).getTime();
  }
  return 0;
}

/**
 * Helper to get message sender ID
 */
export function getMessageSenderId(msg: any): string {
  if (msg.sender_id) return String(msg.sender_id);
  if (typeof msg.sender === 'string') return msg.sender;
  if (msg.sender && typeof msg.sender === 'object' && msg.sender.id) return String(msg.sender.id);
  if (msg.userId) return String(msg.userId);
  return '';
}

/**
 * Helper to get message room ID
 */
export function getMessageRoomId(msg: any): string {
  if (msg.room_id) return String(msg.room_id);
  if (msg.roomId) return String(msg.roomId);
  return '';
}

/**
 * Helper to get reactions count for a message
 */
export function getReactionsCount(msg: any): number {
  if (Array.isArray(msg.reactions)) {
    return msg.reactions.length;
  }
  if (msg.reactions && typeof msg.reactions === 'object') {
    return Object.values(msg.reactions).reduce((acc: number, val: any) => {
      if (Array.isArray(val)) return acc + val.length;
      return acc + 1;
    }, 0);
  }
  return 0;
}

/**
 * Helper to detect file type category
 */
export function matchAttachmentCategory(
  fileType: string | undefined,
  category: AttachmentFilterType
): boolean {
  if (!fileType) return false;
  const lower = fileType.toLowerCase();

  switch (category) {
    case 'image':
      return lower.includes('image') || lower.includes('jpg') || lower.includes('jpeg') || lower.includes('png') || lower.includes('webp') || lower.includes('gif');
    case 'video':
      return lower.includes('video') || lower.includes('mp4') || lower.includes('mov') || lower.includes('webm') || lower.includes('video_note');
    case 'audio':
      return lower.includes('audio') || lower.includes('voice') || lower.includes('mp3') || lower.includes('ogg') || lower.includes('wav');
    case 'document':
      return lower.includes('pdf') || lower.includes('doc') || lower.includes('txt') || lower.includes('zip') || lower.includes('tar') || lower.includes('file') || (!lower.includes('image') && !lower.includes('video') && !lower.includes('audio'));
    default:
      return false;
  }
}

/**
 * 2. Apply all filters in-memory to an array of messages with combined AND logic
 */
export function applyFilters<T = any>(
  messages: T[],
  filters: FilterOptions = {},
  sortBy: MessageSortBy = 'date_desc'
): T[] {
  if (!Array.isArray(messages) || messages.length === 0) return [];

  const filtered = messages.filter((msg: any) => {
    // 1. Date Range Filter
    if (filters.dateRange) {
      const msgTime = getMessageTimestamp(msg);
      if (filters.dateRange.startDate) {
        const start = new Date(filters.dateRange.startDate).getTime();
        if (!isNaN(start) && msgTime < start) return false;
      }
      if (filters.dateRange.endDate) {
        const end = new Date(filters.dateRange.endDate).getTime();
        // If end date is at midnight (00:00:00), extend to 23:59:59.999 of that day
        const endDay = new Date(end);
        if (endDay.getHours() === 0 && endDay.getMinutes() === 0) {
          endDay.setHours(23, 59, 59, 999);
        }
        if (!isNaN(end) && msgTime > endDay.getTime()) return false;
      }
    }

    // 2. Senders Filter
    if (filters.senders && filters.senders.length > 0) {
      const senderId = getMessageSenderId(msg);
      if (!filters.senders.some((s) => s.toLowerCase() === senderId.toLowerCase())) {
        return false;
      }
    }

    // 3. Room IDs Filter (for global search)
    if (filters.roomIds && filters.roomIds.length > 0) {
      const roomId = getMessageRoomId(msg);
      if (!filters.roomIds.includes(roomId)) {
        return false;
      }
    }

    // 4. Has Attachments Filter
    const hasAttachments = Boolean(
      msg.file ||
      (Array.isArray(msg.attachments) && msg.attachments.length > 0) ||
      msg.file_url
    );

    if (filters.hasAttachments !== undefined) {
      if (filters.hasAttachments && !hasAttachments) return false;
      if (!filters.hasAttachments && hasAttachments) return false;
    }

    // 5. Attachment Types Filter
    if (filters.attachmentTypes && filters.attachmentTypes.length > 0) {
      if (!hasAttachments) return false;

      let matchesType = false;
      if (msg.file?.type) {
        matchesType = filters.attachmentTypes.some((t) =>
          matchAttachmentCategory(msg.file.type, t)
        );
      }
      if (!matchesType && Array.isArray(msg.attachments)) {
        matchesType = msg.attachments.some((att: any) =>
          filters.attachmentTypes!.some((t) =>
            matchAttachmentCategory(att.file_type || att.fileType, t)
          )
        );
      }
      if (!matchesType && msg.file_type) {
        matchesType = filters.attachmentTypes.some((t) =>
          matchAttachmentCategory(msg.file_type, t)
        );
      }
      if (!matchesType) return false;
    }

    // 6. Has Reactions Filter
    const reactionCount = getReactionsCount(msg);
    if (filters.hasReactions !== undefined) {
      if (filters.hasReactions && reactionCount === 0) return false;
      if (!filters.hasReactions && reactionCount > 0) return false;
    }

    // 7. Min Reactions Filter
    if (filters.minReactions !== undefined && filters.minReactions > 0) {
      if (reactionCount < filters.minReactions) return false;
    }

    // 8. Is Edited Filter
    const isEdited = Boolean(
      msg.isEdited ||
      msg.edited_at != null ||
      msg.editedAt != null
    );
    if (filters.isEdited !== undefined) {
      if (filters.isEdited && !isEdited) return false;
      if (!filters.isEdited && isEdited) return false;
    }

    // 9. Is Pinned Filter
    const isPinned = Boolean(msg.isPinned || msg.is_pinned);
    if (filters.isPinned !== undefined) {
      if (filters.isPinned && !isPinned) return false;
      if (!filters.isPinned && isPinned) return false;
    }

    // 10. Message Type Filter ('all' | 'text' | 'media' | 'system')
    if (filters.messageType && filters.messageType !== 'all') {
      const isSystem = Boolean(msg.type === 'system' || msg.isSystem);
      if (filters.messageType === 'system' && !isSystem) return false;
      if (filters.messageType === 'media' && !hasAttachments) return false;
      if (filters.messageType === 'text' && (hasAttachments || isSystem)) return false;
    }

    // 11. Search Query Filter (Sub-string or snippet match)
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.trim().toLowerCase();
      const content = String(msg.content || msg.text || msg.snippet || '').toLowerCase();
      if (!content.includes(q)) return false;
    }

    return true;
  });

  // Apply Sorting
  return sortMessages(filtered, sortBy);
}

/**
 * Sort message list by selected sorting criterion
 */
export function sortMessages<T = any>(messages: T[], sortBy: MessageSortBy = 'date_desc'): T[] {
  const list = [...messages];

  switch (sortBy) {
    case 'date_desc':
      return list.sort((a, b) => getMessageTimestamp(b) - getMessageTimestamp(a));

    case 'date_asc':
      return list.sort((a, b) => getMessageTimestamp(a) - getMessageTimestamp(b));

    case 'reactions_desc':
      return list.sort((a, b) => {
        const countDiff = getReactionsCount(b) - getReactionsCount(a);
        if (countDiff !== 0) return countDiff;
        return getMessageTimestamp(b) - getMessageTimestamp(a);
      });

    case 'edited_desc':
      return list.sort((a: any, b: any) => {
        const editTimeA = a.edited_at ? new Date(a.edited_at).getTime() : 0;
        const editTimeB = b.edited_at ? new Date(b.edited_at).getTime() : 0;
        if (editTimeB !== editTimeA) return editTimeB - editTimeA;
        return getMessageTimestamp(b) - getMessageTimestamp(a);
      });

    case 'relevance':
      return list.sort((a: any, b: any) => {
        const rankA = typeof a.rank === 'number' ? a.rank : 0;
        const rankB = typeof b.rank === 'number' ? b.rank : 0;
        if (rankB !== rankA) return rankB - rankA;
        return getMessageTimestamp(b) - getMessageTimestamp(a);
      });

    default:
      return list;
  }
}

/**
 * 3. Convert FilterOptions into Supabase PostgREST query chain & SQL WHERE clauses
 */
export function buildFilterQuery(filters: FilterOptions) {
  const sqlClauses: string[] = ['deleted_at IS NULL'];
  const params: Record<string, any> = {};

  if (filters.dateRange?.startDate) {
    const isoStart = new Date(filters.dateRange.startDate).toISOString();
    sqlClauses.push(`created_at >= '${isoStart.replace(/'/g, "''")}'`);
    params.startDate = isoStart;
  }

  if (filters.dateRange?.endDate) {
    const end = new Date(filters.dateRange.endDate);
    if (end.getHours() === 0 && end.getMinutes() === 0) {
      end.setHours(23, 59, 59, 999);
    }
    const isoEnd = end.toISOString();
    sqlClauses.push(`created_at <= '${isoEnd.replace(/'/g, "''")}'`);
    params.endDate = isoEnd;
  }

  if (filters.senders && filters.senders.length > 0) {
    const escapedSenders = filters.senders.map((s) => `'${s.replace(/'/g, "''")}'`).join(', ');
    sqlClauses.push(`sender_id IN (${escapedSenders})`);
    params.senders = filters.senders;
  }

  if (filters.roomIds && filters.roomIds.length > 0) {
    const escapedRooms = filters.roomIds.map((r) => `'${r.replace(/'/g, "''")}'`).join(', ');
    sqlClauses.push(`room_id IN (${escapedRooms})`);
    params.roomIds = filters.roomIds;
  }

  if (filters.isEdited === true) {
    sqlClauses.push('edited_at IS NOT NULL');
  } else if (filters.isEdited === false) {
    sqlClauses.push('edited_at IS NULL');
  }

  // PostgREST query applier function
  const applyToQuery = (query: any) => {
    let q = query.is('deleted_at', null);

    if (filters.dateRange?.startDate) {
      q = q.gte('created_at', new Date(filters.dateRange.startDate).toISOString());
    }
    if (filters.dateRange?.endDate) {
      const end = new Date(filters.dateRange.endDate);
      if (end.getHours() === 0 && end.getMinutes() === 0) {
        end.setHours(23, 59, 59, 999);
      }
      q = q.lte('created_at', end.toISOString());
    }
    if (filters.senders && filters.senders.length > 0) {
      q = q.in('sender_id', filters.senders);
    }
    if (filters.roomIds && filters.roomIds.length > 0) {
      q = q.in('room_id', filters.roomIds);
    }
    if (filters.isEdited === true) {
      q = q.not('edited_at', 'is', null);
    } else if (filters.isEdited === false) {
      q = q.is('edited_at', null);
    }

    return q;
  };

  return {
    sqlWhere: sqlClauses.join(' AND '),
    clauses: sqlClauses,
    params,
    applyToQuery,
  };
}

/**
 * 4. Presets Management: Get common default filter presets
 */
export function getCommonFilters(): FilterPreset[] {
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString();

  return [
    {
      id: 'today',
      name: 'Сегодня',
      description: 'Сообщения за текущий день',
      icon: '📅',
      isSystem: true,
      filters: {
        dateRange: { startDate: startOfToday, endDate: endOfToday },
      },
      sortBy: 'date_desc',
    },
    {
      id: 'this_week',
      name: 'За 7 дней',
      description: 'Сообщения за последнюю неделю',
      icon: '📆',
      isSystem: true,
      filters: {
        dateRange: { startDate: startOfWeek, endDate: endOfToday },
      },
      sortBy: 'date_desc',
    },
    {
      id: 'this_month',
      name: 'За месяц',
      description: 'Сообщения за последние 30 дней',
      icon: '🗓️',
      isSystem: true,
      filters: {
        dateRange: { startDate: startOfMonth, endDate: endOfToday },
      },
      sortBy: 'date_desc',
    },
    {
      id: 'with_attachments',
      name: 'С вложениями',
      description: 'Все сообщения с файлами и медиа',
      icon: '📎',
      isSystem: true,
      filters: {
        hasAttachments: true,
      },
      sortBy: 'date_desc',
    },
    {
      id: 'photos_and_videos',
      name: 'Фото и видео',
      description: 'Изображения и видеозаписи',
      icon: '🎬',
      isSystem: true,
      filters: {
        hasAttachments: true,
        attachmentTypes: ['image', 'video'],
      },
      sortBy: 'date_desc',
    },
    {
      id: 'voice_audio',
      name: 'Голосовые и аудио',
      description: 'Аудиозаписи и голосовые сообщения',
      icon: '🎙️',
      isSystem: true,
      filters: {
        hasAttachments: true,
        attachmentTypes: ['audio'],
      },
      sortBy: 'date_desc',
    },
    {
      id: 'documents',
      name: 'Документы',
      description: 'Файлы, PDF, таблицы и архивы',
      icon: '📄',
      isSystem: true,
      filters: {
        hasAttachments: true,
        attachmentTypes: ['document'],
      },
      sortBy: 'date_desc',
    },
    {
      id: 'with_reactions',
      name: 'С реакциями',
      description: 'Сообщения, вызвавшие отклик',
      icon: '❤️',
      isSystem: true,
      filters: {
        hasReactions: true,
      },
      sortBy: 'reactions_desc',
    },
    {
      id: 'edited_messages',
      name: 'Отредактированные',
      description: 'Сообщения с историей изменений',
      icon: '✏️',
      isSystem: true,
      filters: {
        isEdited: true,
      },
      sortBy: 'edited_desc',
    },
  ];
}

const LOCAL_STORAGE_PRESETS_KEY = 'secure_comms_filter_presets';

/**
 * Save custom filter preset to localStorage
 */
export function saveFilterPreset(
  name: string,
  filters: FilterOptions,
  sortBy: MessageSortBy = 'date_desc',
  icon = '⭐'
): FilterPreset {
  const newPreset: FilterPreset = {
    id: `preset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim(),
    filters,
    sortBy,
    icon,
    isSystem: false,
    createdAt: new Date().toISOString(),
  };

  try {
    const existing = getSavedPresets();
    const updated = [newPreset, ...existing.filter((p) => p.name.toLowerCase() !== name.toLowerCase())];
    localStorage.setItem(LOCAL_STORAGE_PRESETS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('[FilterUtils] Failed to save preset in localStorage:', e);
  }

  return newPreset;
}

/**
 * Get all custom saved filter presets
 */
export function getSavedPresets(): FilterPreset[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

/**
 * Delete custom saved filter preset
 */
export function deleteSavedPreset(presetId: string): void {
  try {
    const existing = getSavedPresets();
    const updated = existing.filter((p) => p.id !== presetId);
    localStorage.setItem(LOCAL_STORAGE_PRESETS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('[FilterUtils] Failed to delete preset:', e);
  }
}

/**
 * 5. Export filtered messages to JSON with complete metadata
 */
export function exportFilteredMessagesToJSON(messages: any[], filename?: string): void {
  if (!messages || messages.length === 0) return;

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    totalCount: messages.length,
    messages: messages.map((m) => {
      const senderName = m.sender?.display_name || m.sender?.username || m.sender_id || m.sender;
      return {
        id: m.id,
        roomId: getMessageRoomId(m),
        sender: senderName,
        senderId: getMessageSenderId(m),
        content: m.content || m.text || '',
        createdAt: m.created_at || (m.timestamp ? new Date(m.timestamp).toISOString() : ''),
        isEdited: Boolean(m.isEdited || m.edited_at),
        editedAt: m.edited_at || null,
        reactionsCount: getReactionsCount(m),
        reactions: m.reactions || null,
        attachments: m.attachments || (m.file ? [m.file] : []),
      };
    }),
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);
  downloadBlob(jsonStr, 'application/json', filename || `messages-export-${Date.now()}.json`);
}

/**
 * 6. Export filtered messages to CSV for Excel / Sheets
 */
export function exportFilteredMessagesToCSV(messages: any[], filename?: string): void {
  if (!messages || messages.length === 0) return;

  const headers = [
    'ID',
    'Room ID',
    'Date & Time (ISO)',
    'Sender Name / ID',
    'Message Content',
    'Edited',
    'Edited Time',
    'Reactions Count',
    'Attachments Count',
    'Attachment Types',
  ];

  const escapeCSV = (val: any): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = messages.map((m) => {
    const senderName = m.sender?.display_name || m.sender?.username || m.sender_id || m.sender || '';
    const content = m.content || m.text || '';
    const dateStr = m.created_at || (m.timestamp ? new Date(m.timestamp).toISOString() : '');
    const isEdited = Boolean(m.isEdited || m.edited_at) ? 'YES' : 'NO';
    const editedTime = m.edited_at || '';
    const reactionsCount = getReactionsCount(m);

    let attCount = 0;
    let attTypes: string[] = [];
    if (Array.isArray(m.attachments)) {
      attCount = m.attachments.length;
      attTypes = m.attachments.map((a: any) => a.file_type || a.file_name || 'file');
    } else if (m.file) {
      attCount = 1;
      attTypes = [m.file.type || m.file.name || 'file'];
    }

    return [
      escapeCSV(m.id),
      escapeCSV(getMessageRoomId(m)),
      escapeCSV(dateStr),
      escapeCSV(senderName),
      escapeCSV(content),
      escapeCSV(isEdited),
      escapeCSV(editedTime),
      escapeCSV(reactionsCount),
      escapeCSV(attCount),
      escapeCSV(attTypes.join('; ')),
    ].join(',');
  });

  const csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
  downloadBlob(csvContent, 'text/csv;charset=utf-8;', filename || `messages-export-${Date.now()}.csv`);
}

function downloadBlob(content: string, mimeType: string, filename: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 7. Count active filter conditions
 */
export function countActiveFilters(filters: FilterOptions): number {
  let count = 0;
  if (filters.dateRange?.startDate || filters.dateRange?.endDate) count += 1;
  if (filters.senders && filters.senders.length > 0) count += filters.senders.length;
  if (filters.roomIds && filters.roomIds.length > 0) count += filters.roomIds.length;
  if (filters.hasAttachments !== undefined) count += 1;
  if (filters.attachmentTypes && filters.attachmentTypes.length > 0) count += filters.attachmentTypes.length;
  if (filters.hasReactions !== undefined) count += 1;
  if (filters.minReactions !== undefined && filters.minReactions > 0) count += 1;
  if (filters.isEdited !== undefined) count += 1;
  if (filters.isPinned !== undefined) count += 1;
  if (filters.messageType && filters.messageType !== 'all') count += 1;
  if (filters.searchQuery && filters.searchQuery.trim()) count += 1;
  return count;
}
