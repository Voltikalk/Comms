import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconHistory } from '@tabler/icons-react';

export interface SearchHistoryProps {
  history: string[];
  onSelectQuery: (query: string) => void;
  onClearHistory: () => void;
}

export const SearchHistory: React.FC<SearchHistoryProps> = ({
  history,
  onSelectQuery,
  onClearHistory,
}) => {
  if (history.length === 0) return null;

  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center justify-between text-slate-400 px-1">
        <span className="font-medium flex items-center gap-1.5 text-[11.5px]">
          <IconHistory size={14} />
          <span>Недавние запросы</span>
        </span>
        <button
          onClick={onClearHistory}
          className="hover:text-rose-400 text-[11px] transition-colors cursor-pointer"
        >
          Очистить
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <AnimatePresence>
          {history.map((query) => (
            <motion.button
              key={query}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => onSelectQuery(query)}
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer text-xs"
            >
              <span>{query}</span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SearchHistory;
