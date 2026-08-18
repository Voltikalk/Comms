import React from 'react';
import { motion } from 'framer-motion';
import type { SearchFilters as FilterType } from '../../services/message-search.service';

export interface SearchFiltersProps {
  filters: FilterType;
  onChange: (filters: FilterType) => void;
  onReset: () => void;
  isOpen?: boolean;
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  filters,
  onChange,
  onReset,
  isOpen = true,
}) => {
  if (!isOpen) return null;

  const handleDatePreset = (preset: 'today' | 'week' | 'month' | 'all') => {
    const now = new Date();
    if (preset === 'today') {
      const start = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      onChange({ ...filters, startDate: start, endDate: undefined });
    } else if (preset === 'week') {
      const start = new Date(now.setDate(now.getDate() - 7)).toISOString();
      onChange({ ...filters, startDate: start, endDate: undefined });
    } else if (preset === 'month') {
      const start = new Date(now.setMonth(now.getMonth() - 1)).toISOString();
      onChange({ ...filters, startDate: start, endDate: undefined });
    } else {
      onChange({ ...filters, startDate: undefined, endDate: undefined });
    }
  };

  const handleContentType = (type?: string) => {
    if (!type || filters.contentType === type) {
      onChange({ ...filters, contentType: undefined, hasAttachments: undefined });
    } else {
      onChange({ ...filters, contentType: type, hasAttachments: true });
    }
  };

  const activeCount = [
    filters.startDate,
    filters.senderId,
    filters.contentType,
    filters.hasAttachments,
  ].filter(Boolean).length;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="p-4 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-xl space-y-3 text-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-white/80 flex items-center gap-1.5">
          <span>⚡ Быстрые фильтры</span>
          {activeCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[10px]">
              {activeCount}
            </span>
          )}
        </span>
        {activeCount > 0 && (
          <button
            onClick={onReset}
            className="text-white/40 hover:text-red-400 transition-colors"
          >
            Сбросить все
          </button>
        )}
      </div>

      {/* Date Presets */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-white/40 mr-1">Период:</span>
        {[
          { key: 'all', label: 'За все время' },
          { key: 'today', label: 'Сегодня' },
          { key: 'week', label: 'За неделю' },
          { key: 'month', label: 'За месяц' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => handleDatePreset(item.key as any)}
            className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition-all"
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Content Type Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-white/40 mr-1">Файлы:</span>
        {[
          { key: 'image', label: '📷 Фото' },
          { key: 'video', label: '📹 Видео' },
          { key: 'audio', label: '🎙️ Голосовые' },
          { key: 'document', label: '📄 Документы' },
        ].map((item) => {
          const isActive = filters.contentType === item.key;
          return (
            <button
              key={item.key}
              onClick={() => handleContentType(item.key)}
              className={`px-2.5 py-1 rounded-xl font-medium transition-all ${
                isActive
                  ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                  : 'bg-white/5 text-white/70 hover:bg-white/15 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

export default SearchFilters;
