import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  type FilterOptions,
  type MessageSortBy,
  type FilterPreset,
  type AttachmentFilterType,
  type MessageTypeFilter,
  type FilterValidationResult,
  applyFilters,
  validateFilters,
  countActiveFilters,
  exportFilteredMessagesToJSON,
  exportFilteredMessagesToCSV,
} from '../lib/filter-utils';
import { MessageFilterService } from '../services/message-filter.service';

export interface UseMessageFilterOptions<T = any> {
  initialMessages?: T[];
  initialFilters?: FilterOptions;
  initialSortBy?: MessageSortBy;
  roomId?: string;
  userId?: string;
  autoFetchFromSupabase?: boolean;
}

export function useMessageFilter<T = any>(options: UseMessageFilterOptions<T> = {}) {
  const {
    initialMessages = [],
    initialFilters = {},
    initialSortBy = 'date_desc',
    roomId,
    userId = 'anonymous',
    autoFetchFromSupabase = false,
  } = options;

  const [messages, setMessages] = useState<T[]>(initialMessages);
  const [filters, setFilters] = useState<FilterOptions>(initialFilters);
  const [sortBy, setSortBy] = useState<MessageSortBy>(initialSortBy);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(initialMessages.length);
  const [hasMore, setHasMore] = useState(false);

  // Sync initial messages when changed externally
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages);
      setTotalCount(initialMessages.length);
    }
  }, [initialMessages]);

  // Load presets on mount
  const refreshPresets = useCallback(() => {
    setPresets(MessageFilterService.getPresets());
  }, []);

  useEffect(() => {
    refreshPresets();
  }, [refreshPresets]);

  // Filter validation
  const validation: FilterValidationResult = useMemo(() => {
    return validateFilters(filters);
  }, [filters]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    return countActiveFilters(filters);
  }, [filters]);

  // In-memory filtered messages
  const filteredMessages = useMemo(() => {
    if (autoFetchFromSupabase) {
      return messages;
    }
    return applyFilters(messages, filters, sortBy);
  }, [messages, filters, sortBy, autoFetchFromSupabase]);

  // Query from Supabase when autoFetchFromSupabase is true or on demand
  const fetchFromDatabase = useCallback(
    async (customFilters = filters, customSort = sortBy, offset = 0) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await MessageFilterService.queryMessages({
          roomId,
          filters: customFilters,
          sortBy: customSort,
          pagination: { limit: 50, offset },
          userId,
        });

        if (offset === 0) {
          setMessages(response.messages as unknown as T[]);
        } else {
          setMessages((prev) => [...prev, ...(response.messages as unknown as T[])]);
        }
        setTotalCount(response.totalCount);
        setHasMore(response.hasMore);
      } catch (err: any) {
        setError(err.message || 'Ошибка загрузки отфильтрованных сообщений');
      } finally {
        setIsLoading(false);
      }
    },
    [roomId, userId, filters, sortBy]
  );

  // Auto fetch when filters change if enabled
  useEffect(() => {
    if (autoFetchFromSupabase) {
      fetchFromDatabase(filters, sortBy, 0);
    }
  }, [filters, sortBy, autoFetchFromSupabase, fetchFromDatabase]);

  // 1. Generic Filter Updater
  const updateFilter = useCallback(<K extends keyof FilterOptions>(key: K, value: FilterOptions[K]) => {
    setActivePresetId(null);
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  // 2. Reset All Filters
  const resetFilters = useCallback(() => {
    setActivePresetId(null);
    setFilters({});
    setSortBy('date_desc');
  }, []);

  // 3. Date Range Helper
  const setDateRange = useCallback((startDate: string | Date | null, endDate: string | Date | null) => {
    setActivePresetId(null);
    setFilters((prev) => ({
      ...prev,
      dateRange: { startDate, endDate },
    }));
  }, []);

  const clearDateRange = useCallback(() => {
    setActivePresetId(null);
    setFilters((prev) => {
      const next = { ...prev };
      delete next.dateRange;
      return next;
    });
  }, []);

  // 4. Senders Toggle Helper
  const toggleSender = useCallback((senderId: string) => {
    setActivePresetId(null);
    setFilters((prev) => {
      const current = prev.senders || [];
      const exists = current.includes(senderId);
      const nextSenders = exists
        ? current.filter((s) => s !== senderId)
        : [...current, senderId];

      return {
        ...prev,
        senders: nextSenders.length > 0 ? nextSenders : undefined,
      };
    });
  }, []);

  // 5. Attachment Types Toggle Helper
  const toggleAttachmentType = useCallback((type: AttachmentFilterType) => {
    setActivePresetId(null);
    setFilters((prev) => {
      const current = prev.attachmentTypes || [];
      const exists = current.includes(type);
      const nextTypes = exists
        ? current.filter((t) => t !== type)
        : [...current, type];

      return {
        ...prev,
        attachmentTypes: nextTypes.length > 0 ? nextTypes : undefined,
        hasAttachments: nextTypes.length > 0 ? true : prev.hasAttachments,
      };
    });
  }, []);

  // 6. Room Toggle Helper
  const toggleRoom = useCallback((targetRoomId: string) => {
    setActivePresetId(null);
    setFilters((prev) => {
      const current = prev.roomIds || [];
      const exists = current.includes(targetRoomId);
      const nextRooms = exists
        ? current.filter((r) => r !== targetRoomId)
        : [...current, targetRoomId];

      return {
        ...prev,
        roomIds: nextRooms.length > 0 ? nextRooms : undefined,
      };
    });
  }, []);

  // 7. Message Type Selector
  const setMessageType = useCallback((type: MessageTypeFilter) => {
    setActivePresetId(null);
    setFilters((prev) => ({
      ...prev,
      messageType: type === 'all' ? undefined : type,
    }));
  }, []);

  // 8. Boolean Toggles
  const toggleHasAttachments = useCallback((val?: boolean) => {
    setActivePresetId(null);
    setFilters((prev) => ({
      ...prev,
      hasAttachments: val !== undefined ? val : !prev.hasAttachments,
    }));
  }, []);

  const toggleHasReactions = useCallback((val?: boolean) => {
    setActivePresetId(null);
    setFilters((prev) => ({
      ...prev,
      hasReactions: val !== undefined ? val : !prev.hasReactions,
    }));
  }, []);

  const toggleIsEdited = useCallback((val?: boolean) => {
    setActivePresetId(null);
    setFilters((prev) => ({
      ...prev,
      isEdited: val !== undefined ? val : !prev.isEdited,
    }));
  }, []);

  const toggleIsPinned = useCallback((val?: boolean) => {
    setActivePresetId(null);
    setFilters((prev) => ({
      ...prev,
      isPinned: val !== undefined ? val : !prev.isPinned,
    }));
  }, []);

  // 9. Apply Preset
  const applyPreset = useCallback((preset: FilterPreset) => {
    setActivePresetId(preset.id);
    setFilters(preset.filters);
    if (preset.sortBy) {
      setSortBy(preset.sortBy);
    }
  }, []);

  // 10. Save Current Filters as Preset
  const saveCurrentAsPreset = useCallback((name: string, icon = '⭐') => {
    if (!name.trim()) return null;
    const created = MessageFilterService.savePreset(name, filters, sortBy, icon);
    refreshPresets();
    setActivePresetId(created.id);
    return created;
  }, [filters, sortBy, refreshPresets]);

  // 11. Delete Preset
  const deletePreset = useCallback((presetId: string) => {
    MessageFilterService.deletePreset(presetId);
    refreshPresets();
    if (activePresetId === presetId) {
      setActivePresetId(null);
    }
  }, [activePresetId, refreshPresets]);

  // 12. Export filtered items
  const exportJSON = useCallback((filename?: string) => {
    exportFilteredMessagesToJSON(filteredMessages, filename);
  }, [filteredMessages]);

  const exportCSV = useCallback((filename?: string) => {
    exportFilteredMessagesToCSV(filteredMessages, filename);
  }, [filteredMessages]);

  return {
    // States
    filters,
    setFilters,
    sortBy,
    setSortBy,
    filteredMessages,
    rawMessages: messages,
    totalCount: autoFetchFromSupabase ? totalCount : filteredMessages.length,
    activePresetId,
    presets,
    validation,
    activeFilterCount,
    isLoading,
    hasMore,
    error,

    // Actions & Updaters
    updateFilter,
    resetFilters,
    setDateRange,
    clearDateRange,
    toggleSender,
    toggleAttachmentType,
    toggleRoom,
    setMessageType,
    toggleHasAttachments,
    toggleHasReactions,
    toggleIsEdited,
    toggleIsPinned,
    applyPreset,
    saveCurrentAsPreset,
    deletePreset,
    refreshPresets,
    fetchFromDatabase,
    exportJSON,
    exportCSV,
  };
}

export default useMessageFilter;
