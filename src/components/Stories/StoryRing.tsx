import React, { useId } from 'react';
import { useStories } from '../../context/stories-context';
import type { Story } from '../../types/story.types';

const R = 27;
const C = 2 * Math.PI * R;

/**
 * One arc per story: accent = unseen, green = close friends, muted = seen.
 * Drawn in a 60×60 viewBox, so it scales with the box it is placed in.
 */
export const StoryRing: React.FC<{ stories: Story[]; isStoryViewed: (id: string) => boolean }> = ({ stories, isStoryViewed }) => {
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

/**
 * Wraps an existing round avatar (chat list, chat header): when `userId` has
 * stories the avatar shrinks a little and the segmented ring is drawn around it.
 * Clicking the avatar then opens the stories instead of `onClick`.
 */
export const StoryAvatarRing: React.FC<{
  userId?: string | null;
  children: React.ReactNode;
  className?: string;
  /** Called when the user has no stories (e.g. open the profile). */
  onClick?: () => void;
  /** Stop the click from reaching a parent button (chat list item). */
  isolateClick?: boolean;
}> = ({ userId, children, className = '', onClick, isolateClick }) => {
  const { storiesOf, isStoryViewed, openStories, ringState } = useStories();
  const list = userId ? storiesOf(userId) : [];
  const has = list.length > 0;

  const handle = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (!has && !onClick) return;
    if (isolateClick) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (has && userId) openStories(userId);
    else onClick?.();
  };

  if (!has && !onClick) return <>{children}</>;

  return (
    <span
      role="button"
      tabIndex={has ? 0 : -1}
      aria-label={has ? `Истории${userId && ringState(userId) === 'unseen' ? ' · есть новые' : ''}` : undefined}
      onClick={handle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handle(e);
      }}
      onPointerDown={isolateClick && has ? (e) => e.stopPropagation() : undefined}
      className={`relative block shrink-0 cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}
    >
      {has && <StoryRing stories={list} isStoryViewed={isStoryViewed} />}
      <span className={`block transition-transform duration-200 ${has ? 'scale-[0.8]' : ''}`}>{children}</span>
    </span>
  );
};
