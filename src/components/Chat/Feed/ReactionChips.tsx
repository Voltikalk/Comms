import React from 'react';
import { useSocket } from '../../../context/contexts';
import { USER_NAMES } from '../../../constants';
import type { ReactionEntry } from '../../../lib/reactions';
import { HoverAnimatedEmoji } from '../../TelegramEmojiPickerModal';

interface ReactionChipsProps {
  entries: ReactionEntry[];
  currentUser: string | null;
  align: 'start' | 'end';
  onToggle: (messageId: string, emoji: string) => void;
  className?: string;
}

/** Reaction chips under a bubble or album, with a "who reacted" tooltip. */
export const ReactionChips: React.FC<ReactionChipsProps> = ({ entries, currentUser, align, onToggle, className = '' }) => {
  const { getUserDisplayName } = useSocket();
  if (entries.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1 ${align === 'end' ? 'justify-end' : 'justify-start'} ${className}`}>
      {entries.map(({ emoji, reactors, targetId }) => {
        const hasReacted = currentUser ? reactors.includes(currentUser) : false;
        const reactorNames = reactors.map((id) => (id === currentUser ? 'Вы' : getUserDisplayName(id) || USER_NAMES[id] || id));
        const previewNames = reactorNames.slice(0, 4).join(', ') + (reactorNames.length > 4 ? ` и ещё ${reactorNames.length - 4}` : '');
        return (
          <div key={emoji} className="relative group/reaction">
            <button
              type="button"
              onClick={() => onToggle(targetId, emoji)}
              aria-pressed={hasReacted}
              aria-label={`${emoji} ${reactors.length}`}
              className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 transition-all hover:scale-110 active:scale-90 cursor-pointer select-none animate-reaction-pop ${
                hasReacted ? 'bg-accent/25 ring-1.5 ring-accent shadow-xs' : 'bg-black/5 dark:bg-white/10 hover:bg-black/10'
              }`}
            >
              <HoverAnimatedEmoji emoji={emoji} size={18} />
              <span className="font-bold text-[10px] text-zinc-700 dark:text-zinc-200">{reactors.length}</span>
            </button>

            {/* Who reacted (Telegram style) */}
            <div className="pointer-events-none absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-50 opacity-0 translate-y-1 group-hover/reaction:opacity-100 group-hover/reaction:translate-y-0 transition-all duration-150">
              <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-elevated shadow-xl border border-zinc-200 dark:border-white/10 whitespace-nowrap max-w-[240px]">
                <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-200">
                  {emoji} {previewNames}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
