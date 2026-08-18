import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchResultCard } from './SearchResultCard';
import type { SearchResultItem } from '../../services/message-search.service';

export interface SearchResultsProps {
  results: SearchResultItem[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onSelectResult?: (item: SearchResultItem) => void;
  query?: string;
}

export const NoSearchResults: React.FC<{ query?: string }> = ({ query }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center space-y-2.5">
    <div className="h-14 w-14 rounded-full bg-slate-100 dark:bg-[#242f3d] flex items-center justify-center text-2xl shadow-xs text-[#3390ec]">
      🔍
    </div>
    <div>
      <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
        {query ? `Ничего не найдено по запросу «${query}»` : 'Введите запрос для поиска'}
      </h3>
      <p className="text-[11.5px] text-slate-500 dark:text-slate-400 max-w-xs mt-1">
        Попробуйте изменить запрос или переключить категорию фильтра
      </p>
    </div>
  </div>
);

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  onSelectResult,
  query,
}) => {
  return (
    <div className="space-y-2">
      {/* Shimmer / Skeleton Loading State */}
      {isLoading && results.length === 0 && (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-2"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-full bg-white/10" />
                <div className="space-y-1">
                  <div className="h-2.5 w-24 rounded bg-white/10" />
                  <div className="h-2 w-14 rounded bg-white/10" />
                </div>
              </div>
              <div className="h-3 w-full rounded bg-white/10 pl-9" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && results.length === 0 && (
        <NoSearchResults query={query} />
      )}

      {/* Results List with Stagger Animations */}
      <AnimatePresence initial={false}>
        {results.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
          >
            <SearchResultCard item={item} onClick={onSelectResult} />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-xs font-medium text-white/80 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? 'Загрузка...' : 'Загрузить еще'}
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchResults;
