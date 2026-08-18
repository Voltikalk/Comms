import React, { useState, useRef, useMemo } from 'react';
import type { Sticker } from '../../types/sticker.types';
import {
  STICKER_PACKS,
  ALL_STICKERS,
  searchStickers,
  getRecentStickers,
  getFavoriteStickers,
  toggleFavoriteSticker,
  addRecentSticker
} from '../../constants/stickers';
import {
  IconSearch,
  IconClock,
  IconHeart,
  IconHeartFilled,
  IconX
} from '@tabler/icons-react';
import { TgsStickerPlayer } from './TgsStickerPlayer';

interface StickerPickerProps {
  onSelectSticker: (sticker: Sticker) => void;
  onClose?: () => void;
  className?: string;
}

export const StickerPicker: React.FC<StickerPickerProps> = ({
  onSelectSticker,
  onClose: _onClose,
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activePackId, setActivePackId] = useState<string>('all');
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => {
    return new Set(getFavoriteStickers().map((s) => s.id));
  });

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const packRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const recentStickers = useMemo(() => getRecentStickers(), []);
  const favoriteStickers = useMemo(() => {
    return ALL_STICKERS.filter((s) => favoriteIds.has(s.id));
  }, [favoriteIds]);

  const filteredStickers = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return searchStickers(searchQuery);
  }, [searchQuery]);

  const handleToggleFavorite = (e: React.MouseEvent, sticker: Sticker) => {
    e.stopPropagation();
    const isNowFav = toggleFavoriteSticker(sticker.id);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isNowFav) {
        next.add(sticker.id);
      } else {
        next.delete(sticker.id);
      }
      return next;
    });
  };

  const handleSelect = (sticker: Sticker) => {
    addRecentSticker(sticker);
    onSelectSticker(sticker);
  };

  const scrollToPack = (packId: string) => {
    setActivePackId(packId);
    if (packId === 'recent') {
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const target = packRefs.current[packId];
    if (target && scrollContainerRef.current) {
      const offsetTop = target.offsetTop - scrollContainerRef.current.offsetTop - 10;
      scrollContainerRef.current.scrollTo({ top: offsetTop, behavior: 'smooth' });
    }
  };

  return (
    <div className={`flex flex-col h-full select-none text-slate-900 dark:text-white ${className}`}>
      {/* 1. Search Bar */}
      <div className="p-2 border-b border-slate-200/60 dark:border-white/10 shrink-0">
        <div className="flex items-center gap-1.5 bg-black/5 dark:bg-[#242f3d] px-2.5 py-1.5 rounded-xl">
          <IconSearch size={15} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Поиск стикеров по названию или эмодзи..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none text-xs text-slate-900 dark:text-white focus:outline-none w-full placeholder-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <IconX size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Scrollable Sticker Feed */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto tg-scrollbar p-2 space-y-4 max-h-[320px] sm:max-h-[360px]"
      >
        {/* Search Results */}
        {filteredStickers !== null ? (
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
              Результаты поиска ({filteredStickers.length})
            </div>
            {filteredStickers.length > 0 ? (
              <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
                {filteredStickers.map((sticker) => (
                  <StickerCell
                    key={sticker.id}
                    sticker={sticker}
                    isFavorite={favoriteIds.has(sticker.id)}
                    onSelect={handleSelect}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <span className="text-2xl">🔍</span>
                <span>Стикеры не найдены</span>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Recent Stickers Section */}
            {recentStickers.length > 0 && (
              <div
                ref={(el) => {
                  packRefs.current['recent'] = el;
                }}
              >
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                  <IconClock size={14} className="text-[#3390ec]" />
                  <span>Недавние стикеры</span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
                  {recentStickers.map((sticker) => (
                    <StickerCell
                      key={`recent-${sticker.id}`}
                      sticker={sticker}
                      isFavorite={favoriteIds.has(sticker.id)}
                      onSelect={handleSelect}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Favorite Stickers Section */}
            {favoriteStickers.length > 0 && (
              <div
                ref={(el) => {
                  packRefs.current['favorites'] = el;
                }}
              >
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-pink-500 uppercase tracking-wider mb-2 px-1">
                  <IconHeartFilled size={14} />
                  <span>Избранные ({favoriteStickers.length})</span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
                  {favoriteStickers.map((sticker) => (
                    <StickerCell
                      key={`fav-${sticker.id}`}
                      sticker={sticker}
                      isFavorite={true}
                      onSelect={handleSelect}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Installed Sticker Packs */}
            {STICKER_PACKS.map((pack) => (
              <div
                key={pack.id}
                ref={(el) => {
                  packRefs.current[pack.id] = el;
                }}
                className="pt-1"
              >
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-1 border-t border-slate-200/40 dark:border-white/5 pt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{pack.icon}</span>
                    <span className="text-slate-800 dark:text-slate-200">{pack.title}</span>
                    {pack.isAnimated && (
                      <span className="px-1.5 py-0.2 rounded-full bg-[#3390ec]/20 text-[#3390ec] text-[9px] font-bold">
                        3D
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {pack.stickers.length} шт.
                  </span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
                  {pack.stickers.map((sticker) => (
                    <StickerCell
                      key={sticker.id}
                      sticker={sticker}
                      isFavorite={favoriteIds.has(sticker.id)}
                      onSelect={handleSelect}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* 3. Bottom Pack Tabs Bar (Horizontal Carousel 1:1 Telegram Web) */}
      <div className="p-1.5 border-t border-slate-200/60 dark:border-white/10 flex items-center gap-1 overflow-x-auto tg-scrollbar shrink-0 bg-black/5 dark:bg-black/20 rounded-b-3xl">
        <button
          type="button"
          onClick={() => scrollToPack('recent')}
          className={`p-1.5 rounded-xl cursor-pointer transition-colors shrink-0 ${
            activePackId === 'recent'
              ? 'bg-[#3390ec] text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10'
          }`}
          title="Недавние"
        >
          <IconClock size={16} />
        </button>

        {favoriteStickers.length > 0 && (
          <button
            type="button"
            onClick={() => scrollToPack('favorites')}
            className={`p-1.5 rounded-xl cursor-pointer transition-colors shrink-0 ${
              activePackId === 'favorites'
                ? 'bg-pink-500 text-white shadow-xs'
                : 'text-pink-400 hover:bg-black/5 dark:hover:bg-white/10'
            }`}
            title="Избранные"
          >
            <IconHeart size={16} />
          </button>
        )}

        <div className="h-4 w-px bg-slate-300 dark:bg-white/20 mx-0.5 shrink-0" />

        {STICKER_PACKS.map((pack) => (
          <button
            key={`tab-${pack.id}`}
            type="button"
            onClick={() => scrollToPack(pack.id)}
            className={`w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all shrink-0 text-base ${
              activePackId === pack.id
                ? 'bg-[#3390ec] text-white shadow-xs scale-105 ring-2 ring-[#3390ec]/30'
                : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-300'
            }`}
            title={pack.title}
          >
            <span>{pack.icon}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// Single Sticker Grid Cell Component (Memoized for high performance)
const StickerCell = React.memo<{
  sticker: Sticker;
  isFavorite: boolean;
  onSelect: (sticker: Sticker) => void;
  onToggleFavorite: (e: React.MouseEvent, sticker: Sticker) => void;
}>(({ sticker, isFavorite, onSelect, onToggleFavorite }) => {
  return (
    <div
      onClick={() => onSelect(sticker)}
      className="relative aspect-square rounded-2xl p-1.5 flex items-center justify-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all duration-150 group"
      title={`${sticker.title} (${sticker.emoji})`}
    >
      <TgsStickerPlayer
        src={sticker.url}
        alt={sticker.title}
        className="w-full h-full"
        loop={true}
        autoplay={true}
      />

      {/* Floating Mini Emoji Badge */}
      <span className="absolute bottom-1 right-1 text-[11px] opacity-70 group-hover:opacity-100 transition-opacity bg-black/40 rounded-full px-1 backdrop-blur-xs select-none">
        {sticker.emoji}
      </span>

      {/* Favorite Star / Heart Icon on Hover */}
      <button
        type="button"
        onClick={(e) => onToggleFavorite(e, sticker)}
        className={`absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white backdrop-blur-xs transition-opacity cursor-pointer ${
          isFavorite ? 'opacity-100 text-pink-400' : 'opacity-0 group-hover:opacity-90 hover:text-pink-400'
        }`}
        title={isFavorite ? 'Удалить из избранного' : 'В избранное'}
      >
        {isFavorite ? <IconHeartFilled size={11} /> : <IconHeart size={11} />}
      </button>
    </div>
  );
});

StickerCell.displayName = 'StickerCell';
