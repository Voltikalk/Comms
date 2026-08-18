import React, { useState } from 'react';
import { ANIMATED_EMOJIS } from '../constants';
import {
  IconSearch,
  IconClock,
  IconHeart,
  IconThumbUp,
  IconConfetti,
  IconMoodSmile,
  IconX
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

interface TelegramEmojiPickerModalProps {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
  title?: string;
  isReactionMode?: boolean;
}

const CATEGORY_MAP: Record<string, string[]> = {
  hearts: ['❤️', '🔥', '💖', '🥰', '😍', '😘', '😻', '💓', '💗', '💕', '💞'],
  thumbs: ['👍', '👎', '👏', '🤝', '🙌', '👊', '👌', '✌️', '💪'],
  party: ['🎉', '🥳', '🍾', '🎊', '✨', '🕺', '💃', '🚀', '⭐', '🌟', '💥', '💯', '🤩'],
  smiles: ['😊', '😂', '🤣', '😭', '😎', '😋', '🥺', '😏', '😁', '😄', '😃', '😉', '😜', '😝', '🤤', '🤠', '🤡', '😇', '🤫', '🤔', '🧐']
};

export const TelegramEmojiPickerModal: React.FC<TelegramEmojiPickerModalProps> = ({
  onSelectEmoji,
  onClose,
  title: _title,
  isReactionMode: _isReactionMode
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'recent' | 'all' | 'favorites'>('all');
  const [activeCategory, setActiveCategory] = useState<'all' | 'hearts' | 'thumbs' | 'party' | 'smiles'>('all');

  const allEmojis = Object.keys(ANIMATED_EMOJIS);

  let currentList = allEmojis;
  if (activeTab === 'recent') {
    currentList = allEmojis.slice(0, 16);
  } else if (activeTab === 'favorites') {
    currentList = ['❤️', '🔥', '👍', '🎉', '😂', '🥰', '😍', '👏', '💯', '🚀', '✨', '😎'];
  } else if (activeCategory !== 'all' && CATEGORY_MAP[activeCategory]) {
    currentList = CATEGORY_MAP[activeCategory].filter(e => allEmojis.includes(e));
  }

  const filteredEmojis = currentList.filter((emoji) => {
    if (!searchQuery.trim()) return true;
    return emoji.includes(searchQuery.trim());
  });

  return (
    <div
      className="w-76 sm:w-84 bg-[#17212b]/98 dark:bg-[#17212b]/98 bg-white/98 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 p-3 flex flex-col gap-2.5 animate-pop-in select-none z-50 text-slate-900 dark:text-white"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Top Packs Header Tabs */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10 px-1">
        <div className="flex items-center gap-2 text-slate-400">
          <button
            type="button"
            onClick={() => { setActiveTab('recent'); setActiveCategory('all'); }}
            className={`p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors ${activeTab === 'recent' ? 'text-[#3390ec] bg-black/5 dark:bg-white/10' : 'text-slate-400 hover:text-slate-200'
              }`}
            title="Недавние"
          >
            <IconClock size={18} />
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('all'); setActiveCategory('all'); }}
            className={`p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors ${activeTab === 'all' && activeCategory === 'all' ? 'text-[#3390ec] bg-black/5 dark:bg-white/10' : 'text-slate-400 hover:text-slate-200'
              }`}
            title="Все эмодзи"
          >
            <IconMoodSmile size={18} />
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('favorites'); setActiveCategory('all'); }}
            className={`p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors ${activeTab === 'favorites' ? 'text-pink-500 bg-black/5 dark:bg-white/10' : 'text-slate-400 hover:text-slate-200'
              }`}
            title="Избранные"
          >
            <IconHeart size={18} />
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
        >
          <IconX size={16} />
        </button>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="flex items-center gap-1.5 bg-black/5 dark:bg-[#242f3d] px-2.5 py-1.5 rounded-xl">
        <IconSearch size={16} className="text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Поиск"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent border-none text-xs text-slate-900 dark:text-white focus:outline-none w-full placeholder-slate-400"
          autoFocus
        />

        {/* Category Filters */}
        <div className="flex items-center gap-0.5 shrink-0 text-slate-400">
          <button
            type="button"
            onClick={() => {
              setActiveCategory(activeCategory === 'hearts' ? 'all' : 'hearts');
              setActiveTab('all');
            }}
            className={`p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors ${activeCategory === 'hearts' ? 'text-pink-500 bg-black/5 dark:bg-white/10' : ''
              }`}
            title="Сердца"
          >
            <IconHeart size={14} />
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveCategory(activeCategory === 'thumbs' ? 'all' : 'thumbs');
              setActiveTab('all');
            }}
            className={`p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors ${activeCategory === 'thumbs' ? 'text-[#3390ec] bg-black/5 dark:bg-white/10' : ''
              }`}
            title="Жесты"
          >
            <IconThumbUp size={14} />
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveCategory(activeCategory === 'party' ? 'all' : 'party');
              setActiveTab('all');
            }}
            className={`p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors ${activeCategory === 'party' ? 'text-amber-500 bg-black/5 dark:bg-white/10' : ''
              }`}
            title="Праздник"
          >
            <IconConfetti size={14} />
          </button>
        </div>
      </div>

      {/* 3. 8-Column Vertical Grid of Emojis */}
      <div className="grid grid-cols-7 sm:grid-cols-8 gap-1 max-h-64 overflow-y-auto tg-scrollbar p-1 pr-1.5">
        {filteredEmojis.length > 0 ? (
          filteredEmojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onSelectEmoji(emoji)}
              className="w-8.5 h-8.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center active:scale-90 transition-transform cursor-pointer p-0.5"
              title={emoji}
            >
              <HoverAnimatedEmoji emoji={emoji} size={28} />
            </button>
          ))
        ) : (
          <div className="col-span-8 py-8 text-center text-xs text-slate-400">
            Ничего не найдено
          </div>
        )}
      </div>
    </div>
  );
};
