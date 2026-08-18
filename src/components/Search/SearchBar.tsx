import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconSearch, IconX } from '@tabler/icons-react';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  isLoading?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onClear,
  isLoading = false,
  placeholder = 'Поиск...',
  autoFocus = true,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Ctrl+F / Cmd+F shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative flex items-center w-full">
      {/* Search Icon */}
      <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
        <IconSearch size={16} />
      </div>

      {/* Main Search Input */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label="Поле поиска сообщений"
        className="w-full h-9 pl-9 pr-9 rounded-full bg-slate-100 dark:bg-[#242f3d] border-none text-[13.5px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#3390ec] transition-all"
      />

      {/* Right Spinner / Clear button */}
      <div className="absolute right-2.5 flex items-center gap-1">
        {isLoading && (
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#3390ec] border-t-transparent mr-1" />
        )}

        <AnimatePresence>
          {value && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              type="button"
              onClick={onClear}
              className="h-5 w-5 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Очистить"
              aria-label="Очистить"
            >
              <IconX size={14} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SearchBar;
