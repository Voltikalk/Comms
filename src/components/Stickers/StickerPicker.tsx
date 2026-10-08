import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Sticker } from '../../types/sticker.types';
import {
  STICKER_PACKS,
  ALL_STICKERS,
  searchStickers,
  getRecentStickers,
  getFavoriteStickers,
  toggleFavoriteSticker,
  addRecentSticker,
} from '../../constants/stickers';
import { IconClock, IconHeart, IconHeartFilled } from '@tabler/icons-react';
import { TgsStickerPlayer } from './TgsStickerPlayer';
import { PickerSearch, PickerSectionTitle, PickerStripButton } from './PickerParts';

interface StickerPickerProps {
  onSelectSticker: (sticker: Sticker) => void;
  onClose?: () => void;
  className?: string;
}

interface StickerSection {
  id: string;
  title: string;
  stickers: Sticker[];
  strip: React.ReactNode;
}

/**
 * Sticker tab of the composer panel: search, a strip of packs (recent,
 * favourites, then every installed pack by its first sticker) and one feed
 * with sticky pack titles. The strip follows the scroll position.
 */
export const StickerPicker: React.FC<StickerPickerProps> = ({ onSelectSticker, className = '' }) => {
  const [query, setQuery] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set(getFavoriteStickers().map((s) => s.id)));
  const [recentStickers] = useState(getRecentStickers);
  const [activeId, setActiveId] = useState('recent');
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const jumping = useRef(false);
  const pendingJump = useRef<string | null>(null);

  const favoriteStickers = useMemo(() => ALL_STICKERS.filter((s) => favoriteIds.has(s.id)), [favoriteIds]);
  const results = useMemo(() => (query.trim() ? searchStickers(query) : null), [query]);

  const sections = useMemo<StickerSection[]>(() => {
    const out: StickerSection[] = [];
    if (recentStickers.length > 0) out.push({ id: 'recent', title: 'Недавние', stickers: recentStickers, strip: <IconClock size={20} /> });
    if (favoriteStickers.length > 0)
      out.push({ id: 'favorites', title: 'Избранные', stickers: favoriteStickers, strip: <IconHeart size={20} /> });
    for (const pack of STICKER_PACKS) {
      const cover = pack.stickers[0];
      out.push({
        id: pack.id,
        title: pack.title,
        stickers: pack.stickers,
        strip: cover ? (
          <TgsStickerPlayer src={cover.url} alt={pack.title} className="h-7 w-7" playOnHover loop={false} />
        ) : (
          <span className="text-[20px] leading-none">{pack.icon}</span>
        ),
      });
    }
    return out;
  }, [recentStickers, favoriteStickers]);

  const toggleFavorite = useCallback((e: React.MouseEvent, sticker: Sticker) => {
    e.stopPropagation();
    const isNowFav = toggleFavoriteSticker(sticker.id);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isNowFav) next.add(sticker.id);
      else next.delete(sticker.id);
      return next;
    });
  }, []);

  const select = useCallback(
    (sticker: Sticker) => {
      addRecentSticker(sticker);
      onSelectSticker(sticker);
    },
    [onSelectSticker],
  );

  const syncActive = () => {
    const el = scrollRef.current;
    if (!el || jumping.current || results) return;
    const top = el.scrollTop + 8;
    let current = sections[0]?.id ?? 'recent';
    for (const s of sections) {
      const node = sectionRefs.current[s.id];
      if (node && node.offsetTop <= top) current = s.id;
    }
    setActiveId(current);
  };

  const jumpTo = (id: string) => {
    setActiveId(id);
    if (results) {
      pendingJump.current = id;
      setQuery('');
      return;
    }
    const el = scrollRef.current;
    const node = sectionRefs.current[id];
    if (!el || !node) return;
    jumping.current = true;
    el.scrollTo({ top: node.offsetTop, behavior: 'smooth' });
    window.setTimeout(() => {
      jumping.current = false;
    }, 450);
  };

  // A pack picked from the strip during a search is scrolled to once the feed is back.
  useEffect(() => {
    if (results) return;
    const id = pendingJump.current;
    pendingJump.current = null;
    const el = scrollRef.current;
    const node = id ? sectionRefs.current[id] : null;
    if (el && node) el.scrollTop = node.offsetTop;
  }, [results]);

  const grid = (stickers: Sticker[], keyPrefix: string) => (
    <div className="grid grid-cols-4 gap-0.5 px-1.5">
      {stickers.map((sticker) => (
        <StickerCell
          key={`${keyPrefix}-${sticker.id}`}
          sticker={sticker}
          isFavorite={favoriteIds.has(sticker.id)}
          onSelect={select}
          onToggleFavorite={toggleFavorite}
        />
      ))}
    </div>
  );

  return (
    <div className={`flex min-h-0 flex-1 select-none flex-col ${className}`}>
      <div className="shrink-0 space-y-1.5 px-2 pt-2">
        <PickerSearch value={query} onChange={setQuery} placeholder="Поиск стикеров" />
        <div className="no-scrollbar flex items-center gap-0.5 overflow-x-auto" aria-label="Наборы стикеров">
          {sections.map((s) => (
            <PickerStripButton key={s.id} active={!results && activeId === s.id} title={s.title} onClick={() => jumpTo(s.id)}>
              {s.strip}
            </PickerStripButton>
          ))}
        </div>
      </div>

      <div ref={scrollRef} onScroll={syncActive} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2 tg-scrollbar">
        {results ? (
          results.length > 0 ? (
            <section>
              <PickerSectionTitle>Результаты поиска</PickerSectionTitle>
              {grid(results, 'search')}
            </section>
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center text-[13.5px] text-muted">
              <span className="text-[40px] leading-none">🔍</span>
              Стикеры не найдены
            </div>
          )
        ) : (
          sections.map((s) => (
            <section
              key={s.id}
              ref={(node) => {
                sectionRefs.current[s.id] = node;
              }}
              aria-label={s.title}
            >
              <PickerSectionTitle trailing={<span className="text-[12px] font-normal tabular-nums">{s.stickers.length}</span>}>
                {s.title}
              </PickerSectionTitle>
              {grid(s.stickers, s.id)}
            </section>
          ))
        )}
      </div>
    </div>
  );
};

const StickerCell = React.memo<{
  sticker: Sticker;
  isFavorite: boolean;
  onSelect: (sticker: Sticker) => void;
  onToggleFavorite: (e: React.MouseEvent, sticker: Sticker) => void;
}>(({ sticker, isFavorite, onSelect, onToggleFavorite }) => (
  <div
    role="button"
    tabIndex={0}
    onClick={() => onSelect(sticker)}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(sticker);
      }
    }}
    className="group relative flex aspect-square items-center justify-center rounded-2xl p-1.5 transition-[background-color,transform] duration-150 hover:bg-ink/[0.06] active:scale-90 cursor-pointer"
    title={`${sticker.title} ${sticker.emoji}`}
    aria-label={`Стикер ${sticker.title}`}
  >
    <TgsStickerPlayer src={sticker.url} alt={sticker.title} className="h-full w-full" loop autoplay />
    <button
      type="button"
      onClick={(e) => onToggleFavorite(e, sticker)}
      className={`absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-surface/90 opacity-0 shadow-sm ring-1 ring-line transition-opacity group-hover:opacity-100 focus-visible:opacity-100 cursor-pointer ${
        isFavorite ? 'text-danger' : 'text-muted hover:text-danger'
      }`}
      title={isFavorite ? 'Убрать из избранного' : 'В избранное'}
      aria-label={isFavorite ? 'Убрать из избранного' : 'В избранное'}
    >
      {isFavorite ? <IconHeartFilled size={13} /> : <IconHeart size={13} />}
    </button>
  </div>
));

StickerCell.displayName = 'StickerCell';
