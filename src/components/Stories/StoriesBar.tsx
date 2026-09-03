import React, { useRef, useState } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { useStories } from '../../context/StoriesContext';
import { USER_NAMES, DEFAULT_USER_PROFILES } from '../../constants';
import type { Story } from '../../types/story.types';

interface StoriesBarProps {
  currentUserName?: string;
  onOpenCreate: () => void;
  onOpenViewer: (userId: string | null) => void;
}

interface SegmentedRingProps {
  stories: Story[];
  isStoryViewed: (id: string) => boolean;
  size?: number;
}

export const SegmentedStoryRing: React.FC<SegmentedRingProps> = ({ stories, isStoryViewed, size = 62 }) => {
  const count = stories.length;
  if (count === 0) return null;

  const radius = 27;
  const strokeWidth = 2.4;
  const circumference = 2 * Math.PI * radius;
  const gap = count > 1 ? 4.5 : 0;
  const totalGapLength = count * gap;
  const segmentLength = Math.max(2, (circumference - totalGapLength) / count);

  const anyUnviewed = stories.some((s) => !isStoryViewed(s.id));

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`absolute inset-0 pointer-events-none transition-transform duration-300 ${
        anyUnviewed ? 'animate-pulse-subtle' : ''
      }`}
    >
      <defs>
        {/* Telegram Multi-color gradient for public stories */}
        <linearGradient id="tgStoryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3390ec" />
          <stop offset="50%" stopColor="#ac8bdd" />
          <stop offset="100%" stopColor="#e6604c" />
        </linearGradient>

        {/* Telegram Green gradient for Close Friends */}
        <linearGradient id="tgCloseFriendsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00c853" />
          <stop offset="100%" stopColor="#aeea00" />
        </linearGradient>
      </defs>

      {count === 1 ? (
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={
            !isStoryViewed(stories[0].id)
              ? stories[0].isCloseFriends
                ? 'url(#tgCloseFriendsGradient)'
                : 'url(#tgStoryGradient)'
              : 'rgba(148, 163, 184, 0.45)'
          }
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          transform="rotate(-90 32 32)"
        />
      ) : (
        stories.map((story, i) => {
          const viewed = isStoryViewed(story.id);
          const strokeColor = viewed
            ? 'rgba(148, 163, 184, 0.45)'
            : story.isCloseFriends
            ? 'url(#tgCloseFriendsGradient)'
            : 'url(#tgStoryGradient)';

          // Calculate rotation offset for this segment
          const segmentDegrees = 360 / count;
          const rotation = -90 + i * segmentDegrees;

          return (
            <circle
              key={story.id || i}
              cx="32"
              cy="32"
              r={radius}
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
              strokeLinecap="round"
              transform={`rotate(${rotation} 32 32)`}
              className="transition-colors duration-300"
            />
          );
        })
      )}
    </svg>
  );
};

export const StoriesBar: React.FC<StoriesBarProps> = ({ currentUserName, onOpenCreate, onOpenViewer }) => {
  const { myStories, othersStories, isStoryViewed } = useStories();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartXRef = useRef<number>(0);
  const scrollLeftRef = useRef<number>(0);

  const myUnviewed = myStories.some((s) => !isStoryViewed(s.id));
  const myUser = (typeof window !== 'undefined' ? localStorage.getItem('chat_user_v2') : null) || '';
  const myAvatar = DEFAULT_USER_PROFILES[myUser]?.avatarUrl;

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (scrollRef.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      scrollRef.current.scrollLeft += e.deltaY;
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    dragStartXRef.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeftRef.current = scrollRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - dragStartXRef.current) * 1.5;
    scrollRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="relative group/storiesbar">
      <div
        ref={scrollRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        className="flex items-center gap-2.5 px-3 py-2.5 overflow-x-auto tg-scrollbar shrink-0 border-b border-slate-200/70 dark:border-white/5 select-none scroll-smooth cursor-grab active:cursor-grabbing"
      >
        {/* My Story Tile */}
        <button
          type="button"
          onClick={() => (myStories.length > 0 ? onOpenViewer('me') : onOpenCreate())}
          className="relative shrink-0 flex flex-col items-center gap-1 cursor-pointer group w-[64px] transition-transform active:scale-95"
          title={myStories.length > 0 ? 'Моя история' : 'Опубликовать историю'}
        >
          <div className="relative w-[60px] h-[60px] flex items-center justify-center">
            {myStories.length > 0 ? (
              <SegmentedStoryRing stories={myStories} isStoryViewed={isStoryViewed} size={60} />
            ) : (
              <div className="absolute inset-0 rounded-full border border-dashed border-slate-300 dark:border-white/20 group-hover:border-[#3390ec] transition-colors" />
            )}

            <div className="w-[50px] h-[50px] rounded-full bg-slate-100 dark:bg-[#17212b] p-0.5 overflow-hidden flex items-center justify-center shadow-inner">
              {myAvatar ? (
                <img src={myAvatar} alt="Моя история" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-base font-bold text-slate-700 dark:text-slate-200">
                  {(currentUserName || myUser || 'Я').charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Plus Add Button Badge */}
            <span
              onClick={(e) => {
                e.stopPropagation();
                onOpenCreate();
              }}
              className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[#3390ec] hover:bg-[#2b7ac9] border-2 border-white dark:border-[#17212b] flex items-center justify-center text-white group-hover:scale-110 shadow-md transition-transform cursor-pointer z-10"
              title="Создать историю"
            >
              <IconPlus size={12} stroke={3.5} />
            </span>
          </div>

          <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate w-full text-center leading-tight">
            {myStories.length > 0 ? (
              myUnviewed ? (
                <span className="font-bold text-slate-900 dark:text-white">Ваша история</span>
              ) : (
                'Ваша история'
              )
            ) : (
              'История'
            )}
          </span>
        </button>

        {/* Others Stories */}
        {othersStories.map(({ userId, stories }) => {
          const hasUnviewed = stories.some((s) => !isStoryViewed(s.id));
          const hasCloseFriends = stories.some((s) => s.isCloseFriends);
          const name = USER_NAMES[userId] || DEFAULT_USER_PROFILES[userId]?.firstName || userId;
          const avatar = DEFAULT_USER_PROFILES[userId]?.avatarUrl;

          return (
            <button
              key={userId}
              type="button"
              onClick={() => onOpenViewer(userId)}
              className="shrink-0 flex flex-col items-center gap-1 cursor-pointer w-[64px] group transition-transform active:scale-95"
              title={`${name} (${stories.length})`}
            >
              <div className="relative w-[60px] h-[60px] flex items-center justify-center">
                <SegmentedStoryRing stories={stories} isStoryViewed={isStoryViewed} size={60} />

                <div className="w-[50px] h-[50px] rounded-full bg-slate-100 dark:bg-[#17212b] p-0.5 overflow-hidden flex items-center justify-center shadow-inner">
                  {avatar ? (
                    <img src={avatar} alt={name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-base font-bold text-slate-700 dark:text-slate-200">
                      {name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {hasCloseFriends && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#00c853] text-white flex items-center justify-center text-[9px] shadow-xs border border-white dark:border-[#17212b]"
                    title="Близкие друзья"
                  >
                    ★
                  </span>
                )}
              </div>

              <span
                className={`text-[11px] truncate w-full text-center leading-tight ${
                  hasUnviewed
                    ? 'font-bold text-slate-900 dark:text-white'
                    : 'font-medium text-slate-500 dark:text-slate-400'
                }`}
              >
                {name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StoriesBar;
