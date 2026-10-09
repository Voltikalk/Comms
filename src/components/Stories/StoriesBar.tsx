import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconChevronLeft, IconEye, IconEyeOff, IconPlus } from '@tabler/icons-react';
import { useStories } from '../../context/stories-context';
import { useAuth, useRooms } from '../../context/contexts';
import type { UserId } from '../../types';
import type { StoryAuthorEntry } from '../../lib/story-utils';
import { StoryRing } from './StoryRing';

interface StoriesBarProps {
  onOpenCreate: () => void;
  onOpenViewer: (userId: string | null) => void;
}

const RING = 58;

const Face: React.FC<{ src?: string; name: string }> = ({ src, name }) => (
  <span className="absolute inset-[5px] flex items-center justify-center overflow-hidden rounded-full bg-elevated text-[17px] font-semibold text-ink">
    {src ? <img src={src} alt="" className="h-full w-full object-cover" draggable={false} /> : (name.trim().charAt(0) || '?').toUpperCase()}
  </span>
);

export const StoriesBar: React.FC<StoriesBarProps> = ({ onOpenCreate, onOpenViewer }) => {
  const { myStories, othersStories, hiddenStories, isStoryViewed, isAuthorHidden, toggleHiddenAuthor } = useStories();
  const [showHidden, setShowHidden] = useState(false);
  const [menu, setMenu] = useState<{ userId: string; x: number; y: number } | null>(null);
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

  // Right click / long press on an author → «Скрыть истории» / «Показать истории».
  const press = useRef<{ timer: number; fired: boolean } | null>(null);
  const openMenu = (userId: string, x: number, y: number) => setMenu({ userId, x, y });
  const authorTile = ({ userId, stories }: StoryAuthorEntry, hidden: boolean) => {
    const unseen = stories.some((s) => !isStoryViewed(s.id));
    const name = getUserDisplayName(userId);
    return (
      <div key={userId} role="listitem" className="shrink-0">
        <button
          type="button"
          onClick={() => {
            if (press.current?.fired) {
              press.current = null;
              return;
            }
            onOpenViewer(userId);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            openMenu(userId, e.clientX, e.clientY);
          }}
          onPointerDown={(e) => {
            if (e.pointerType === 'mouse') return;
            const { clientX: x, clientY: y } = e;
            const state = { timer: 0, fired: false };
            state.timer = window.setTimeout(() => {
              state.fired = true;
              navigator.vibrate?.(12);
              openMenu(userId, x, y);
            }, 480);
            press.current = state;
          }}
          onPointerUp={() => press.current && window.clearTimeout(press.current.timer)}
          onPointerLeave={() => press.current && window.clearTimeout(press.current.timer)}
          className={`group flex w-[66px] flex-col items-center gap-1 rounded-xl py-1 cursor-pointer outline-none focus-visible:bg-accent-muted ${hidden ? 'opacity-60 hover:opacity-100' : ''}`}
          title={`${name} · ${stories.length}`}
        >
          <span className="relative block transition-transform group-active:scale-95" style={{ width: RING, height: RING }}>
            <StoryRing stories={stories} isStoryViewed={isStoryViewed} />
            <Face src={getUserAvatar(userId)} name={name} />
          </span>
          <span className={`w-full truncate text-center text-[11.5px] leading-tight ${unseen && !hidden ? 'font-semibold text-ink' : 'text-muted'}`}>
            {name.split(' ')[0]}
          </span>
        </button>
      </div>
    );
  };

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

      {othersStories.map((entry) => authorTile(entry, false))}

      {/* Hidden authors: one collapsed tile at the end, expands in place */}
      {hiddenStories.length > 0 && (
        <div role="listitem" className="shrink-0">
          <button
            type="button"
            onClick={() => setShowHidden((v) => !v)}
            aria-expanded={showHidden}
            className="group flex w-[66px] flex-col items-center gap-1 rounded-xl py-1 cursor-pointer outline-none focus-visible:bg-accent-muted"
            title={showHidden ? 'Свернуть скрытые' : 'Скрытые истории'}
          >
            <span
              className="relative flex items-center justify-center rounded-full bg-elevated text-muted transition-[transform,color] group-hover:text-ink group-active:scale-95"
              style={{ width: RING - 10, height: RING - 10, margin: 5 }}
            >
              {showHidden ? <IconChevronLeft size={22} /> : <IconEyeOff size={21} />}
              {!showHidden && (
                <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-muted px-1 text-[10.5px] font-bold tabular-nums text-white ring-2 ring-canvas">
                  {hiddenStories.length}
                </span>
              )}
            </span>
            <span className="w-full truncate text-center text-[11.5px] leading-tight text-muted">{showHidden ? 'Свернуть' : 'Скрытые'}</span>
          </button>
        </div>
      )}
      {showHidden && hiddenStories.map((entry) => authorTile(entry, true))}

      {menu &&
        createPortal(
          <div className="fixed inset-0 z-[70]" onClick={() => setMenu(null)} onContextMenu={(e) => (e.preventDefault(), setMenu(null))}>
            <div
              role="menu"
              className="absolute min-w-[210px] rounded-xl bg-elevated p-1 shadow-xl ring-1 ring-line"
              style={{ left: Math.min(menu.x, window.innerWidth - 222), top: Math.min(menu.y, window.innerHeight - 60) }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  toggleHiddenAuthor(menu.userId);
                  setMenu(null);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[14px] text-ink cursor-pointer hover:bg-accent-muted"
              >
                {isAuthorHidden(menu.userId) ? <IconEye size={18} className="text-muted" /> : <IconEyeOff size={18} className="text-muted" />}
                {isAuthorHidden(menu.userId) ? 'Показывать истории' : 'Скрыть истории'}
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default StoriesBar;
