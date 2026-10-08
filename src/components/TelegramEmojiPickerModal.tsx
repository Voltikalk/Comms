import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ANIMATED_EMOJIS } from '../constants';
import type { Sticker } from '../types/sticker.types';
import { StickerPicker } from './Stickers/StickerPicker';
import { PickerSearch, PickerSectionTitle, PickerStripButton } from './Stickers/PickerParts';
import {
  EMOJI_CATEGORIES,
  loadRecentEmojis,
  rememberRecentEmoji,
  searchEmojis,
  type EmojiCategoryId,
} from '../lib/emoji-catalog';
import {
  IconApple,
  IconBackspace,
  IconBallFootball,
  IconBulb,
  IconCar,
  IconClock,
  IconFlag,
  IconHeart,
  IconMoodSmile,
  IconPaw,
  IconSticker,
} from '@tabler/icons-react';

export const HoverAnimatedEmoji: React.FC<{
  emoji: string;
  size?: number;
  className?: string;
  alwaysAnimate?: boolean;
}> = ({ emoji, size = 30, className = '', alwaysAnimate = false }) => {
  const [isHovered, setIsHovered] = useState(false);
  const animUrl = ANIMATED_EMOJIS[emoji];

  if (!animUrl) {
    return <span style={{ fontSize: size * 0.75 }}>{emoji}</span>;
  }

  const staticUrl = animUrl.replace('/512.webp', '/128.png');

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={alwaysAnimate || isHovered ? animUrl : staticUrl}
        alt={emoji}
        className="w-full h-full object-contain pointer-events-none transition-transform duration-150"
        style={{ transform: isHovered ? 'scale(1.25)' : 'scale(1)' }}
        loading="lazy"
      />
    </div>
  );
};

export interface TelegramEmojiPickerModalProps {
  onSelectEmoji: (emoji: string) => void;
  onSelectSticker?: (sticker: Sticker) => void;
  onClose: () => void;
  /** Emoji tab backspace (Telegram's ⌫ next to the tabs); hidden when absent. */
  onBackspace?: () => void;
  title?: string;
  isReactionMode?: boolean;
  defaultTab?: 'emojis' | 'stickers';
}

type PickerTab = 'emojis' | 'stickers';

/**
 * Composer emoji / sticker panel, laid out like Telegram: search, a category
 * strip, one scrolling feed with sticky section titles, and the
 * Эмодзи · Стикеры switch (with backspace) along the bottom edge.
 */
export const TelegramEmojiPickerModal: React.FC<TelegramEmojiPickerModalProps> = ({
  onSelectEmoji,
  onSelectSticker,
  onClose,
  onBackspace,
  isReactionMode = false,
  defaultTab = 'emojis',
}) => {
  const [tab, setTab] = useState<PickerTab>(isReactionMode ? 'emojis' : defaultTab);

  return (
    <div
      className="ui-sheet flex h-[min(420px,calc(100dvh-170px))] w-[min(360px,calc(100vw-16px))] select-none flex-col overflow-hidden rounded-[20px]"
      role="dialog"
      aria-label={tab === 'emojis' ? 'Эмодзи' : 'Стикеры'}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {tab === 'emojis' ? (
          <EmojiPanel onSelectEmoji={onSelectEmoji} />
        ) : (
          <StickerPicker onSelectSticker={(sticker) => onSelectSticker?.(sticker)} onClose={onClose} />
        )}
      </div>

      {!isReactionMode && (
        <div className="flex h-11 shrink-0 items-center border-t border-line px-1.5">
          <span className="w-9 shrink-0" aria-hidden />
          <div className="flex flex-1 items-center justify-center gap-1" role="tablist" aria-label="Тип">
            <BottomTab active={tab === 'emojis'} onClick={() => setTab('emojis')} icon={<IconMoodSmile size={18} />} label="Эмодзи" />
            {onSelectSticker && (
              <BottomTab active={tab === 'stickers'} onClick={() => setTab('stickers')} icon={<IconSticker size={18} />} label="Стикеры" />
            )}
          </div>
          {tab === 'emojis' && onBackspace ? (
            <button
              type="button"
              onClick={onBackspace}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink active:scale-95 cursor-pointer"
              title="Стереть"
              aria-label="Стереть"
            >
              <IconBackspace size={20} />
            </button>
          ) : (
            <span className="w-9 shrink-0" aria-hidden />
          )}
        </div>
      )}
    </div>
  );
};

const BottomTab: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({
  active,
  onClick,
  icon,
  label,
}) => (
  <button
    type="button"
    role="tab"
    aria-selected={active}
    onClick={onClick}
    className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-[13.5px] font-semibold transition-colors cursor-pointer ${
      active ? 'bg-accent-muted text-accent' : 'text-muted hover:bg-ink/[0.06] hover:text-ink'
    }`}
  >
    {icon}
    {label}
  </button>
);

// --- Emoji tab -----------------------------------------------------------------

const CATEGORY_ICONS: Record<EmojiCategoryId | 'recent', React.ReactNode> = {
  recent: <IconClock size={20} />,
  people: <IconMoodSmile size={20} />,
  nature: <IconPaw size={20} />,
  food: <IconApple size={20} />,
  activity: <IconBallFootball size={20} />,
  travel: <IconCar size={20} />,
  objects: <IconBulb size={20} />,
  symbols: <IconHeart size={20} />,
  flags: <IconFlag size={20} />,
};

// Windows has no colour flag glyphs (🇷🇺 renders as "RU"), so the section would be letters.
const HIDE_FLAGS = typeof navigator !== 'undefined' && /Windows/i.test(navigator.userAgent);

interface EmojiSection {
  id: EmojiCategoryId | 'recent';
  title: string;
  emojis: string[];
}

const EmojiPanel: React.FC<{ onSelectEmoji: (emoji: string) => void }> = ({ onSelectEmoji }) => {
  const [query, setQuery] = useState('');
  // Recent row is read once per opening (like Telegram) so it doesn't reshuffle under the cursor.
  const [recent] = useState(loadRecentEmojis);
  const [activeId, setActiveId] = useState<EmojiSection['id']>('recent');
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Partial<Record<EmojiSection['id'], HTMLElement | null>>>({});
  const scrollingTo = useRef<EmojiSection['id'] | null>(null);
  // Category picked while search results are shown: scroll once the feed is back.
  const pendingJump = useRef<EmojiSection['id'] | null>(null);

  const sections = useMemo<EmojiSection[]>(
    () => [
      { id: 'recent', title: 'Часто используемые', emojis: recent },
      ...EMOJI_CATEGORIES.filter((c) => !(HIDE_FLAGS && c.id === 'flags')),
    ],
    [recent],
  );
  const results = useMemo(() => (query.trim() ? searchEmojis(query) : null), [query]);

  const pick = useCallback(
    (emoji: string) => {
      rememberRecentEmoji(emoji);
      onSelectEmoji(emoji);
    },
    [onSelectEmoji],
  );

  // Highlight the category whose section is at the top of the feed.
  const syncActive = useCallback(() => {
    const el = scrollRef.current;
    if (!el || scrollingTo.current) return;
    const top = el.scrollTop + 8;
    let current: EmojiSection['id'] = sections[0].id;
    for (const s of sections) {
      const node = sectionRefs.current[s.id];
      if (node && node.offsetTop <= top) current = s.id;
    }
    setActiveId(current);
  }, [sections]);

  const jumpTo = (id: EmojiSection['id']) => {
    setActiveId(id);
    if (results) {
      pendingJump.current = id;
      setQuery('');
      return;
    }
    const el = scrollRef.current;
    const node = sectionRefs.current[id];
    if (!el || !node) return;
    scrollingTo.current = id;
    el.scrollTo({ top: node.offsetTop, behavior: 'smooth' });
    window.setTimeout(() => {
      scrollingTo.current = null;
    }, 450);
  };

  useEffect(() => {
    if (results) return;
    const id = pendingJump.current;
    pendingJump.current = null;
    const el = scrollRef.current;
    const node = id ? sectionRefs.current[id] : null;
    if (el && node) el.scrollTop = node.offsetTop;
    else syncActive();
  }, [results, syncActive]);

  return (
    <>
      <div className="shrink-0 space-y-1.5 px-2 pt-2">
        <PickerSearch value={query} onChange={setQuery} placeholder="Поиск эмодзи" />
        <div className="no-scrollbar flex items-center justify-between gap-0.5 overflow-x-auto" aria-label="Категории">
          {sections.map((s) => (
            <PickerStripButton key={s.id} active={!results && activeId === s.id} title={s.title} onClick={() => jumpTo(s.id)}>
              {CATEGORY_ICONS[s.id]}
            </PickerStripButton>
          ))}
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={syncActive}
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2 tg-scrollbar"
      >
        {results ? (
          results.length > 0 ? (
            <section>
              <PickerSectionTitle>Результаты поиска</PickerSectionTitle>
              <EmojiGrid emojis={results} onPick={pick} />
            </section>
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center text-[13.5px] text-muted">
              <span className="text-[40px] leading-none">🔍</span>
              Ничего не найдено
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
              <PickerSectionTitle>{s.title}</PickerSectionTitle>
              <EmojiGrid emojis={s.emojis} onPick={pick} />
            </section>
          ))
        )}
      </div>
    </>
  );
};

const EmojiGrid = React.memo<{ emojis: string[]; onPick: (emoji: string) => void }>(({ emojis, onPick }) => (
  <div className="grid grid-cols-[repeat(auto-fill,minmax(40px,1fr))] px-1.5">
    {emojis.map((emoji) => (
      <button
        key={emoji}
        type="button"
        onClick={() => onPick(emoji)}
        className="flex aspect-square items-center justify-center rounded-xl text-[27px] leading-none transition-[background-color,transform] duration-100 hover:bg-ink/[0.06] active:scale-90 cursor-pointer"
        title={emoji}
      >
        {emoji}
      </button>
    ))}
  </div>
));
EmojiGrid.displayName = 'EmojiGrid';
