import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SearchFilters } from '../../services/message-search.service';

export interface AdvancedSearchModalProps {
  isOpen: boolean;
  filters: SearchFilters;
  onClose: () => void;
  onApplyFilters: (filters: SearchFilters) => void;
  onExportResults?: (format: 'json' | 'csv') => void;
}

export const AdvancedSearchModal: React.FC<AdvancedSearchModalProps> = ({
  isOpen,
  filters,
  onClose,
  onApplyFilters,
  onExportResults,
}) => {
  const [localStartDate, setLocalStartDate] = useState(
    filters.startDate ? new Date(filters.startDate).toISOString().split('T')[0] : ''
  );
  const [localEndDate, setLocalEndDate] = useState(
    filters.endDate ? new Date(filters.endDate).toISOString().split('T')[0] : ''
  );
  const [localSenderId, setLocalSenderId] = useState(filters.senderId || '');
  const [localContentType, setLocalContentType] = useState(filters.contentType || '');
  const [localHasAttachments, setLocalHasAttachments] = useState(filters.hasAttachments || false);

  if (!isOpen) return null;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyFilters({
      startDate: localStartDate ? new Date(localStartDate).toISOString() : undefined,
      endDate: localEndDate ? new Date(localEndDate).toISOString() : undefined,
      senderId: localSenderId.trim() || undefined,
      contentType: localContentType || undefined,
      hasAttachments: localHasAttachments || !!localContentType,
    });
    onClose();
  };

  const handleReset = () => {
    setLocalStartDate('');
    setLocalEndDate('');
    setLocalSenderId('');
    setLocalContentType('');
    setLocalHasAttachments(false);
    onApplyFilters({});
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-slate-900/90 backdrop-blur-2xl shadow-2xl p-6 text-white space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>⚙️</span> Расширенные параметры поиска
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-white/50 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Filters Form */}
          <form onSubmit={handleApply} className="space-y-4 text-xs">
            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-white/70 block font-medium">Диапазон дат</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-white/40 block mb-1">От:</span>
                  <input
                    type="date"
                    value={localStartDate}
                    onChange={(e) => setLocalStartDate(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-2 text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-white/40 block mb-1">До:</span>
                  <input
                    type="date"
                    value={localEndDate}
                    onChange={(e) => setLocalEndDate(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-2 text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Sender Filter */}
            <div>
              <label className="text-white/70 block font-medium mb-1">Отправитель (User ID / Username)</label>
              <input
                type="text"
                value={localSenderId}
                onChange={(e) => setLocalSenderId(e.target.value)}
                placeholder="Например: vlad, anya..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {/* Content Type Selector */}
            <div>
              <label className="text-white/70 block font-medium mb-1">Тип вложения</label>
              <select
                value={localContentType}
                onChange={(e) => {
                  setLocalContentType(e.target.value);
                  if (e.target.value) setLocalHasAttachments(true);
                }}
                className="w-full rounded-xl border border-white/10 bg-slate-950 p-2 text-white focus:border-cyan-400 focus:outline-none"
              >
                <option value="">Любой контент (текст и файлы)</option>
                <option value="image">📷 Только изображения (JPG, PNG, GIF)</option>
                <option value="video">📹 Только видеозаписи (MP4, MOV)</option>
                <option value="audio">🎙️ Только аудио и голосовые</option>
                <option value="document">📄 Только документы (PDF, DOCX, ZIP)</option>
              </select>
            </div>

            {/* Has Attachments Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={localHasAttachments}
                onChange={(e) => setLocalHasAttachments(e.target.checked)}
                className="rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-0"
              />
              <span className="text-white/80">Только сообщения с прикрепленными файлами</span>
            </label>

            {/* Export Actions if provided */}
            {onExportResults && (
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-[11px] text-white/50">Экспорт результатов:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onExportResults('json')}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 transition-all text-[11px]"
                  >
                    JSON ⬇
                  </button>
                  <button
                    type="button"
                    onClick={() => onExportResults('csv')}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 transition-all text-[11px]"
                  >
                    CSV ⬇
                  </button>
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex gap-2 pt-3">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2.5 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 transition-all font-semibold"
              >
                Сбросить
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 hover:scale-[1.02] transition-all"
              >
                Применить фильтры
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AdvancedSearchModal;
