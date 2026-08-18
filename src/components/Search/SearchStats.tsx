import React from 'react';

export type SearchSortOrder = 'relevance' | 'newest' | 'oldest';

export interface SearchStatsProps {
  totalCount: number;
  elapsedMs?: number;
  sortOrder: SearchSortOrder;
  onSortChange: (order: SearchSortOrder) => void;
}

export const SearchStats: React.FC<SearchStatsProps> = ({
  totalCount,
  elapsedMs,
  sortOrder,
  onSortChange,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-white/50">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-white/80">
          Найдено сообщений: <span className="text-cyan-400 font-bold">{totalCount}</span>
        </span>
        {typeof elapsedMs === 'number' && (
          <span className="text-[11px] text-white/40">
            ({elapsedMs} мс)
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-[11px]">Сортировка:</span>
        <select
          value={sortOrder}
          onChange={(e) => onSortChange(e.target.value as SearchSortOrder)}
          className="rounded-xl border border-white/10 bg-black/40 px-2 py-1 text-xs text-white/80 focus:border-cyan-400 focus:outline-none"
        >
          <option value="relevance">По релевантности</option>
          <option value="newest">Сначала новые</option>
          <option value="oldest">Сначала старые</option>
        </select>
      </div>
    </div>
  );
};

export default SearchStats;
