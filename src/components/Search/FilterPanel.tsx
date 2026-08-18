import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  type FilterOptions,
  type MessageSortBy,
  type FilterPreset,
  type AttachmentFilterType,
  type MessageTypeFilter,
} from '../../lib/filter-utils';
import { DateRangePicker } from './DateRangePicker';
import { USER_NAMES } from '../../constants';

export interface FilterPanelProps {
  filters: FilterOptions;
  sortBy: MessageSortBy;
  presets?: FilterPreset[];
  activePresetId?: string | null;
  activeFilterCount?: number;
  filteredCount?: number;
  onFilterChange: <K extends keyof FilterOptions>(key: K, value: FilterOptions[K]) => void;
  onResetFilters: () => void;
  onSortChange: (sortBy: MessageSortBy) => void;
  onApplyPreset?: (preset: FilterPreset) => void;
  onSavePreset?: (name: string, icon?: string) => void;
  onDeletePreset?: (presetId: string) => void;
  onExportJSON?: () => void;
  onExportCSV?: () => void;
  className?: string;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  sortBy,
  presets = [],
  activePresetId,
  activeFilterCount = 0,
  filteredCount,
  onFilterChange,
  onResetFilters,
  onSortChange,
  onApplyPreset,
  onSavePreset,
  onDeletePreset,
  onExportJSON,
  onExportCSV,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetIcon, setNewPresetIcon] = useState('⭐');
  const [customSenderInput, setCustomSenderInput] = useState('');

  // Senders list from constants
  const knownUsers = Object.entries(USER_NAMES).map(([id, name]) => ({
    id,
    name,
  }));

  // Toggle sender helper
  const handleToggleSender = (userId: string) => {
    const current = filters.senders || [];
    const exists = current.includes(userId);
    const updated = exists ? current.filter((s) => s !== userId) : [...current, userId];
    onFilterChange('senders', updated.length > 0 ? updated : undefined);
  };

  const handleAddCustomSender = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSenderInput.trim()) return;
    const sId = customSenderInput.trim().toLowerCase();
    const current = filters.senders || [];
    if (!current.includes(sId)) {
      onFilterChange('senders', [...current, sId]);
    }
    setCustomSenderInput('');
  };

  // Toggle attachment type helper
  const handleToggleAttachmentType = (type: AttachmentFilterType) => {
    const current = filters.attachmentTypes || [];
    const exists = current.includes(type);
    const updated = exists ? current.filter((t) => t !== type) : [...current, type];
    onFilterChange('attachmentTypes', updated.length > 0 ? updated : undefined);
    if (updated.length > 0 && !filters.hasAttachments) {
      onFilterChange('hasAttachments', true);
    }
  };

  // Save preset submit
  const handleSavePresetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim() || !onSavePreset) return;
    onSavePreset(newPresetName.trim(), newPresetIcon);
    setNewPresetName('');
    setShowSavePresetModal(false);
  };

  // Build active filter tags for visual badges
  const activeTags: { id: string; label: string; onRemove: () => void }[] = [];

  if (filters.dateRange?.startDate || filters.dateRange?.endDate) {
    let dateLabel = 'Период: ';
    if (filters.dateRange.startDate && filters.dateRange.endDate) {
      const s = new Date(filters.dateRange.startDate).toLocaleDateString('ru-RU');
      const e = new Date(filters.dateRange.endDate).toLocaleDateString('ru-RU');
      dateLabel += `${s} — ${e}`;
    } else if (filters.dateRange.startDate) {
      dateLabel += `с ${new Date(filters.dateRange.startDate).toLocaleDateString('ru-RU')}`;
    } else if (filters.dateRange.endDate) {
      dateLabel += `по ${new Date(filters.dateRange.endDate).toLocaleDateString('ru-RU')}`;
    }
    activeTags.push({
      id: 'dateRange',
      label: dateLabel,
      onRemove: () => onFilterChange('dateRange', undefined),
    });
  }

  if (filters.senders && filters.senders.length > 0) {
    filters.senders.forEach((senderId) => {
      const uName = USER_NAMES[senderId as keyof typeof USER_NAMES] || senderId;
      activeTags.push({
        id: `sender_${senderId}`,
        label: `От: ${uName}`,
        onRemove: () => handleToggleSender(senderId),
      });
    });
  }

  if (filters.attachmentTypes && filters.attachmentTypes.length > 0) {
    filters.attachmentTypes.forEach((type) => {
      const labels: Record<string, string> = {
        image: '📷 Фото',
        video: '📹 Видео',
        audio: '🎙️ Аудио',
        document: '📄 Документы',
      };
      activeTags.push({
        id: `type_${type}`,
        label: labels[type] || type,
        onRemove: () => handleToggleAttachmentType(type),
      });
    });
  }

  if (filters.hasAttachments) {
    activeTags.push({
      id: 'hasAttachments',
      label: '📎 С вложениями',
      onRemove: () => onFilterChange('hasAttachments', undefined),
    });
  }

  if (filters.hasReactions) {
    activeTags.push({
      id: 'hasReactions',
      label: '❤️ С реакциями',
      onRemove: () => onFilterChange('hasReactions', undefined),
    });
  }

  if (filters.isEdited) {
    activeTags.push({
      id: 'isEdited',
      label: '✏️ Отредактированные',
      onRemove: () => onFilterChange('isEdited', undefined),
    });
  }

  if (filters.isPinned) {
    activeTags.push({
      id: 'isPinned',
      label: '📌 Закрепленные',
      onRemove: () => onFilterChange('isPinned', undefined),
    });
  }

  if (filters.messageType && filters.messageType !== 'all') {
    const typeLabels: Record<string, string> = {
      text: '💬 Только текст',
      media: '🎬 Только медиа',
      system: '⚙️ Системные',
    };
    activeTags.push({
      id: 'messageType',
      label: typeLabels[filters.messageType] || filters.messageType,
      onRemove: () => onFilterChange('messageType', undefined),
    });
  }

  return (
    <div
      className={`rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-2xl shadow-2xl overflow-hidden text-white transition-all ${className}`}
    >
      {/* 1. Header Bar */}
      <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base text-white">Фильтры и сортировка</h3>
              {activeFilterCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500 text-black font-extrabold text-[11px] shadow-sm shadow-cyan-500/30">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <p className="text-[11px] text-white/50">
              {filteredCount !== undefined
                ? `Найдено сообщений: ${filteredCount}`
                : 'Многокритериальная фильтрация сообщений'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onResetFilters}
              className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-semibold text-xs transition-all"
            >
              Сбросить все
            </button>
          )}

          {onSavePreset && activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => setShowSavePresetModal(true)}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 font-semibold text-xs transition-all flex items-center gap-1"
            >
              <span>⭐</span>
              <span className="hidden sm:inline">Сохранить пресет</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-semibold transition-all"
          >
            {isExpanded ? 'Свернуть ▲' : 'Развернуть ▼'}
          </button>
        </div>
      </div>

      {/* 2. Active Filter Chips */}
      {activeTags.length > 0 && (
        <div className="px-4 sm:px-5 py-2.5 bg-black/40 border-b border-white/5 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider mr-1">
            Активно:
          </span>
          {activeTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-medium"
            >
              <span>{tag.label}</span>
              <button
                type="button"
                onClick={tag.onRemove}
                className="ml-1 hover:text-white text-cyan-400 font-bold transition-colors"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 3. Collapsible Body */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="p-4 sm:p-5 space-y-5"
          >
            {/* Presets Row */}
            {presets.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] text-white/50 block font-semibold uppercase tracking-wider">
                  Быстрые пресеты:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {presets.map((preset) => {
                    const isActive = activePresetId === preset.id;
                    return (
                      <div key={preset.id} className="relative group">
                        <button
                          type="button"
                          onClick={() => onApplyPreset && onApplyPreset(preset)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                            isActive
                              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                              : 'bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/5'
                          }`}
                        >
                          <span>{preset.icon || '🏷️'}</span>
                          <span>{preset.name}</span>
                        </button>
                        {!preset.isSystem && onDeletePreset && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeletePreset(preset.id);
                            }}
                            className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                            title="Удалить пресет"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sorting Row */}
            <div className="space-y-2">
              <span className="text-[11px] text-white/50 block font-semibold uppercase tracking-wider">
                Сортировка сообщений:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: 'date_desc', label: '📅 Новые первые' },
                  { key: 'date_asc', label: '📅 Старые первые' },
                  { key: 'relevance', label: '🎯 По релевантности' },
                  { key: 'reactions_desc', label: '❤️ По реакциям' },
                  { key: 'edited_desc', label: '✏️ По времени изменения' },
                ].map((s) => {
                  const isSelected = sortBy === s.key;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => onSortChange(s.key as MessageSortBy)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/25'
                          : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date Range Picker Component */}
            <DateRangePicker
              startDate={filters.dateRange?.startDate}
              endDate={filters.dateRange?.endDate}
              onChange={(range) => onFilterChange('dateRange', range.startDate || range.endDate ? range : undefined)}
              onClear={() => onFilterChange('dateRange', undefined)}
            />

            {/* Message Types and Attachment Types Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Message Type Selector */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2.5">
                <span className="text-xs font-semibold text-white/90 block">
                  💬 Тип сообщения
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { key: 'all', label: '🌐 Все типы' },
                    { key: 'text', label: '💬 Только текст' },
                    { key: 'media', label: '🎬 Только медиа' },
                    { key: 'system', label: '⚙️ Системные' },
                  ].map((t) => {
                    const isSelected = (filters.messageType || 'all') === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => onFilterChange('messageType', t.key as MessageTypeFilter)}
                        className={`p-2 rounded-xl text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Attachment File Types Checkboxes */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2.5">
                <span className="text-xs font-semibold text-white/90 block">
                  📁 Категории файлов
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { key: 'image', label: '📷 Фото (JPG, PNG)' },
                    { key: 'video', label: '📹 Видео (MP4)' },
                    { key: 'audio', label: '🎙️ Аудио / Голос' },
                    { key: 'document', label: '📄 Документы (PDF)' },
                  ].map((att) => {
                    const isChecked = filters.attachmentTypes?.includes(att.key as AttachmentFilterType);
                    return (
                      <button
                        key={att.key}
                        type="button"
                        onClick={() => handleToggleAttachmentType(att.key as AttachmentFilterType)}
                        className={`p-2 rounded-xl text-xs font-medium text-left flex items-center justify-between transition-all ${
                          isChecked
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span>{att.label}</span>
                        <span>{isChecked ? '✓' : ''}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Senders Filter Section */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white/90">
                  👤 Отправитель (Multi-Select)
                </span>
                {filters.senders && filters.senders.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onFilterChange('senders', undefined)}
                    className="text-[11px] text-white/40 hover:text-red-400"
                  >
                    Очистить отправителей
                  </button>
                )}
              </div>

              {/* Known User Pills */}
              <div className="flex flex-wrap gap-1.5">
                {knownUsers.map((user) => {
                  const isSelected = filters.senders?.includes(user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleToggleSender(user.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        isSelected
                          ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                          : 'bg-white/5 hover:bg-white/15 text-white/70 hover:text-white'
                      }`}
                    >
                      <span>👤</span>
                      <span>{user.name}</span>
                      {isSelected && <span className="text-[10px] ml-0.5">✓</span>}
                    </button>
                  );
                })}
              </div>

              {/* Custom User ID Input */}
              <form onSubmit={handleAddCustomSender} className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={customSenderInput}
                  onChange={(e) => setCustomSenderInput(e.target.value)}
                  placeholder="Добавить ID пользователя (напр. vlad, anya)..."
                  className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white placeholder-white/30 focus:border-cyan-400 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all"
                >
                  + Добавить
                </button>
              </form>
            </div>

            {/* Quick Boolean Checkbox Flags */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer text-xs text-white/80 select-none transition-all">
                <input
                  type="checkbox"
                  checked={Boolean(filters.hasAttachments)}
                  onChange={(e) => onFilterChange('hasAttachments', e.target.checked ? true : undefined)}
                  className="rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-0"
                />
                <span>📎 С вложениями</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer text-xs text-white/80 select-none transition-all">
                <input
                  type="checkbox"
                  checked={Boolean(filters.hasReactions)}
                  onChange={(e) => onFilterChange('hasReactions', e.target.checked ? true : undefined)}
                  className="rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-0"
                />
                <span>❤️ С реакциями</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer text-xs text-white/80 select-none transition-all">
                <input
                  type="checkbox"
                  checked={Boolean(filters.isEdited)}
                  onChange={(e) => onFilterChange('isEdited', e.target.checked ? true : undefined)}
                  className="rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-0"
                />
                <span>✏️ Измененные</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer text-xs text-white/80 select-none transition-all">
                <input
                  type="checkbox"
                  checked={Boolean(filters.isPinned)}
                  onChange={(e) => onFilterChange('isPinned', e.target.checked ? true : undefined)}
                  className="rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-0"
                />
                <span>📌 Закрепленные</span>
              </label>
            </div>

            {/* Export Toolbar */}
            {(onExportJSON || onExportCSV) && (
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-white/60">
                  <span>Экспорт отфильтрованных сообщений:</span>
                </div>
                <div className="flex gap-2">
                  {onExportJSON && (
                    <button
                      type="button"
                      onClick={onExportJSON}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <span>📥</span>
                      <span>JSON</span>
                    </button>
                  )}
                  {onExportCSV && (
                    <button
                      type="button"
                      onClick={onExportCSV}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-semibold text-xs transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <span>📊</span>
                      <span>CSV (Excel)</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Preset Modal */}
      {showSavePresetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-sm rounded-3xl bg-slate-900 border border-white/15 p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <span>⭐</span> Сохранить фильтры как пресет
              </h4>
              <button
                type="button"
                onClick={() => setShowSavePresetModal(false)}
                className="text-white/40 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePresetSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] text-white/60 block mb-1">Название пресета:</label>
                <input
                  type="text"
                  required
                  placeholder="Например: Мои фото за неделю"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-white/60 block mb-1">Иконка:</label>
                <div className="flex gap-2">
                  {['⭐', '📸', '💬', '🔥', '📁', '❤️', '⚡'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewPresetIcon(emoji)}
                      className={`h-8 w-8 rounded-xl flex items-center justify-center text-sm transition-all ${
                        newPresetIcon === emoji
                          ? 'bg-cyan-500/30 border border-cyan-400'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSavePresetModal(false)}
                  className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white/80"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-bold text-white shadow-lg shadow-cyan-500/25"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;
