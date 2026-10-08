import React, { useId, useRef } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { useStories } from '../../context/stories-context';
import { useAuth, useRooms } from '../../context/contexts';
import type { UserId } from '../../types';
import type { Story } from '../../types/story.types';

interface StoriesBarProps {
  onOpenCreate: () => void;
  onOpenViewer: (userId: string | null) => void;
}

const RING = 58;
const R = 27;
const C = 2 * Math.PI * R;

/** One arc per story: accent = unseen, green = close friends, muted = seen. */
const StoryRing: React.FC<{ stories: Story[]; isStoryViewed: (id: string) => boolean }> = ({ stories, isStoryViewed }) => {
  const gid = useId();
  const count = stories.length;
  const gap = count > 1 ? Math.min(4, 24 / count) : 0;
  const segment = C / count - gap;

  return (
    <svg viewBox="0 0 60 60" className="pointer-events-none absolute inset-0 h-full w-full -rotate-90" aria-hidden>
      <defs>
        <linearGradient id={`${gid}a`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--accent-strong)" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
        <linearGradient id={`${gid}g`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#a3e635" />
        </linearGradient>
      </defs>
      {stories.map((s, i) => {
        const seen = isStoryViewed(s.id);
        return (
          <circle
            key={s.id}
            cx="30"
            cy="30"
            r={R}
            fill="none"
            strokeWidth={seen ? 1.6 : 2.4}
            strokeLinecap={count > 1 ? 'round' : 'butt'}
            stroke={seen ? 'var(--muted)' : s.isCloseFriends ? `url(#${gid}g)` : `url(#${gid}a)`}
            strokeOpacity={seen ? 0.45 : 1}
            strokeDasharray={count > 1 ? `${segment} ${C - segment}` : undefined}
            strokeDashoffset={count > 1 ? -(i * (C / count) + gap / 2) : undefined}
            className="transition-[stroke,stroke-width] duration-300"
          />
        );
      })}
    </svg>
  );
};

const Face: React.FC<{ src?: string; name: string }> = ({ src, name }) => (
  <span className="absolute inset-[5px] flex items-center justify-center overflow-hidden rounded-full bg-elevated text-[17px] font-semibold text-ink">
    {src ? <img src={src} alt="" className="h-full w-full object-cover" draggable={false} /> : (name.trim().charAt(0) || '?').toUpperCase()}
  </span>
);

export const StoriesBar: React.FC<StoriesBarProps> = ({ onOpenCreate, onOpenViewer }) => {
  const { myStories, othersStories, isStoryViewed } = useStories();
  const me = (useAuth().currentUser ?? '') as UserId;
  const { getUserDisplayName, getUserAvatar } = useRooms();

  // Mouse drag-to-scroll; a drag must not count as a click on the tile under the cursor.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !scrollRef.current) return;
    drag.current = { x: e.clientX, left: scrollRef.current.scrollLeft, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || !scrollRef.current) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < 6) return;
    d.moved = true;
    scrollRef.current.scrollLeft = d.left - dx;
  };
  const onPointerUp = () => {
    suppressClick.current = !!drag.current?.moved;
    drag.current = null;
  };

  const hasMine = myStories.length > 0;

  return (
    <div
      ref={scrollRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => (drag.current = null)}
      onClickCapture={(e) => {
        if (!suppressClick.current) return;
        suppressClick.current = false;
        e.stopPropagation();
        e.preventDefault();
      }}
      onWheel={(e) => {
        if (scrollRef.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) scrollRef.current.scrollLeft += e.deltaY;
      }}
      className="[scrollbar-width:none] flex shrink-0 select-none gap-1 overflow-x-auto border-b border-line px-2 pb-2 pt-1.5 [mask-image:linear-gradient(90deg,transparent,#000_8px,#000_calc(100%-16px),transparent)]"
      role="list"
      aria-label="Истории"
    >
      {/* Own tile: opens own stories, the badge always creates a new one */}
      <div className="relative shrink-0" role="listitem">
        <button
          type="button"
          onClick={() => (hasMine ? onOpenViewer('me') : onOpenCreate())}
          className="group flex w-[66px] flex-col items-center gap-1 rounded-xl py-1 cursor-pointer outline-none focus-visible:bg-accent-muted"
          title={hasMine ? 'Моя история' : 'Добавить историю'}
        >
          <span className="relative block transition-transform group-active:scale-95" style={{ width: RING, height: RING }}>
            {hasMine ? (
              <StoryRing stories={myStories} isStoryViewed={isStoryViewed} />
            ) : (
              <span className="absolute inset-[1px] rounded-full border-[1.5px] border-dashed border-line-strong transition-colors group-hover:border-accent" />
            )}
            <Face src={getUserAvatar(me)} name={getUserDisplayName(me)} />
          </span>
          <span className="w-full truncate text-center text-[11.5px] leading-tight text-muted">{hasMine ? 'Моя история' : 'Добавить'}</span>
        </button>
        <button
          type="button"
          onClick={onOpenCreate}
          aria-label="Новая история"
          title="Новая история"
          className="absolute right-[5px] top-[45px] flex h-[20px] w-[20px] items-center justify-center rounded-full bg-accent text-white ring-[2.5px] ring-canvas cursor-pointer transition-transform hover:scale-110 active:scale-95"
        >
          <IconPlus size={12} stroke={3.2} />
        </button>
      </div>

      {othersStories.map(({ userId, stories }) => {
        const unseen = stories.some((s) => !isStoryViewed(s.id));
        const name = getUserDisplayName(userId);
        return (
          <div key={userId} role="listitem" className="shrink-0">
            <button
              type="button"
              onClick={() => onOpenViewer(userId)}
              className="group flex w-[66px] flex-col items-center gap-1 rounded-xl py-1 cursor-pointer outline-none focus-visible:bg-accent-muted"
              title={`${name} · ${stories.length}`}
            >
              <span className="relative block transition-transform group-active:scale-95" style={{ width: RING, height: RING }}>
                <StoryRing stories={stories} isStoryViewed={isStoryViewed} />
                <Face src={getUserAvatar(userId)} name={name} />
              </span>
              <span className={`w-full truncate text-center text-[11.5px] leading-tight ${unseen ? 'font-semibold text-ink' : 'text-muted'}`}>
                {name.split(' ')[0]}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default StoriesBar;
