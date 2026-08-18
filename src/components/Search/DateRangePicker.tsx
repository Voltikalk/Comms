import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export interface DateRangePickerProps {
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  onChange: (range: { startDate: string | null; endDate: string | null }) => void;
  onClear?: () => void;
  className?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  onClear,
  className = '',
}) => {
  const [localStart, setLocalStart] = useState<string>('');
  const [localEnd, setLocalEnd] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync props to local inputs
  useEffect(() => {
    if (startDate) {
      const d = new Date(startDate);
      if (!isNaN(d.getTime())) {
        setLocalStart(d.toISOString().split('T')[0]);
      }
    } else {
      setLocalStart('');
    }

    if (endDate) {
      const d = new Date(endDate);
      if (!isNaN(d.getTime())) {
        setLocalEnd(d.toISOString().split('T')[0]);
      }
    } else {
      setLocalEnd('');
    }
  }, [startDate, endDate]);

  // Validate dates when inputs change
  useEffect(() => {
    if (localStart && localEnd) {
      const s = new Date(localStart).getTime();
      const e = new Date(localEnd).getTime();
      if (!isNaN(s) && !isNaN(e) && s > e) {
        setValidationError('Начальная дата не может быть позже конечной');
        return;
      }
    }
    setValidationError(null);
  }, [localStart, localEnd]);

  // Quick Preset Handlers
  const handlePreset = (preset: 'today' | 'yesterday' | 'week' | 'month' | 'all') => {
    const now = new Date();
    setValidationError(null);

    if (preset === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
      onChange({ startDate: start, endDate: end });
    } else if (preset === 'yesterday') {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).toISOString();
      const end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999).toISOString();
      onChange({ startDate: start, endDate: end });
    } else if (preset === 'week') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
      onChange({ startDate: start, endDate: end });
    } else if (preset === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
      onChange({ startDate: start, endDate: end });
    } else {
      handleClear();
    }
  };

  const handleApplyCustom = () => {
    if (validationError) return;

    const s = localStart ? new Date(localStart).toISOString() : null;
    let e = null;
    if (localEnd) {
      const endObj = new Date(localEnd);
      endObj.setHours(23, 59, 59, 999);
      e = endObj.toISOString();
    }

    onChange({ startDate: s, endDate: e });
  };

  const handleClear = () => {
    setLocalStart('');
    setLocalEnd('');
    setValidationError(null);
    if (onClear) {
      onClear();
    } else {
      onChange({ startDate: null, endDate: null });
    }
  };

  const hasActiveRange = Boolean(startDate || endDate);

  return (
    <div className={`p-4 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl space-y-3.5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white/90 flex items-center gap-1.5">
            <span>📅</span>
            <span>Диапазон дат</span>
          </span>
          {hasActiveRange && (
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[10px]">
              Активен
            </span>
          )}
        </div>

        {hasActiveRange && (
          <button
            type="button"
            onClick={handleClear}
            className="text-[11px] text-white/40 hover:text-red-400 transition-colors"
          >
            Сбросить даты
          </button>
        )}
      </div>

      {/* Quick Preset Buttons */}
      <div className="flex flex-wrap gap-1.5">
        {[
          { key: 'today', label: 'Сегодня' },
          { key: 'yesterday', label: 'Вчера' },
          { key: 'week', label: '7 дней' },
          { key: 'month', label: '30 дней' },
          { key: 'all', label: 'Все время' },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => handlePreset(item.key as any)}
            className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white text-xs font-medium transition-all"
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Custom Date Pickers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        <div className="space-y-1">
          <label className="text-[11px] text-white/50 block">С даты (начало):</label>
          <input
            type="date"
            value={localStart}
            onChange={(e) => setLocalStart(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white focus:border-cyan-400 focus:outline-none transition-all"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-white/50 block">По дату (конец):</label>
          <input
            type="date"
            value={localEnd}
            onChange={(e) => setLocalEnd(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white focus:border-cyan-400 focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Validation Error Alert */}
      {validationError && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[11px] text-red-400 font-medium flex items-center gap-1"
        >
          <span>⚠️</span> {validationError}
        </motion.p>
      )}

      {/* Apply Button */}
      {(localStart || localEnd) && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleApplyCustom}
            disabled={Boolean(validationError)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-md shadow-cyan-500/20"
          >
            Применить даты
          </button>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
