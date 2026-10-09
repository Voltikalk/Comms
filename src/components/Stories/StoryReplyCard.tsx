import React from 'react';
import { IconCircleDashed } from '@tabler/icons-react';
import { useStories } from '../../context/stories-context';
import type { StoryReplyRef } from '../../types';
import { StoryThumb } from './StoryThumb';

/**
 * «Ответ на историю» card on top of a message bubble: a mini preview of the
 * story plus who it belongs to. A click reopens the story while it is still
 * live; once it expired or was deleted the card says so instead.
 */
export const StoryReplyCard: React.FC<{
  reply: StoryReplyRef;
  isSelf: boolean;
  currentUser: string;
  authorName: string;
}> = ({ reply, isSelf, currentUser, authorName }) => {
  const { storiesOf, openStories } = useStories();
  const alive = storiesOf(reply.authorId).some((s) => s.id === reply.storyId);
  const mine = reply.authorId === currentUser;
  const title = mine ? 'Ваша история' : authorName;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (alive) openStories(mine ? 'me' : reply.authorId, reply.storyId);
      }}
      title={alive ? 'Открыть историю' : 'История больше недоступна'}
      aria-disabled={!alive}
      className={`mx-2.5 mt-1.5 mb-1 flex items-center gap-2.5 rounded-lg border-l-[3px] py-1 pl-1.5 pr-3 text-left transition-colors ${alive ? 'cursor-pointer' : 'cursor-default'} select-none ${
        isSelf
          ? 'border-current bg-black/10 hover:bg-black/15 dark:bg-white/10 dark:hover:bg-white/15'
          : 'border-accent bg-black/5 hover:bg-black/8 dark:bg-white/5 dark:hover:bg-white/10'
      }`}
    >
      <StoryThumb
        story={{ type: reply.type, data: reply.preview, background: reply.background }}
        className={`w-[38px] shrink-0 rounded-md ${alive ? '' : 'opacity-45 grayscale'}`}
      />
      <span className="min-w-0">
        <span className={`block truncate text-[11.5px] font-semibold leading-tight ${isSelf ? '' : 'text-accent'}`}>{title}</span>
        <span className="mt-0.5 flex items-center gap-1 text-[11px] leading-snug opacity-75">
          <IconCircleDashed size={12} className="shrink-0" />
          {!alive ? 'История больше недоступна' : mine ? 'Ответ на историю' : 'История'}
        </span>
      </span>
    </button>
  );
};
