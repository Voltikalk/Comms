import React from 'react';
import { motion } from 'framer-motion';
import { USER_NAMES } from '../../constants';

export interface SearchResultCardProps {
  item: any;
  roomName?: string;
  onClick?: (item: any) => void;
}

export const SearchResultCard: React.FC<SearchResultCardProps> = ({
  item,
  roomName,
  onClick,
}) => {
  const senderObj = (typeof item.sender === 'object' ? item.sender : null) || {};
  const senderId = typeof item.sender === 'string' ? item.sender : (item.sender_id || senderObj.id || '');
  const senderName = senderObj.display_name || senderObj.username || senderObj.name || (senderId ? USER_NAMES[senderId] || senderId : 'Пользователь');
  const avatarUrl = senderObj.avatar_url || senderObj.avatarUrl;

  const formatTime = (isoOrTs: string | number) => {
    try {
      const date = typeof isoOrTs === 'number' ? new Date(isoOrTs) : new Date(isoOrTs);
      const isToday = new Date().toDateString() === date.toDateString();
      if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return `${date.toLocaleDateString([], { day: 'numeric', month: 'short' })}`;
    } catch {
      return '';
    }
  };

  const displayTime = item.created_at || item.timestamp || Date.now();
  const displayRoomName = item.roomName || item.rooms?.name || roomName;
  const rawContent = item.headline || item.snippet || item.content || item.text || (item.file ? `📎 ${item.file.name}` : '');
  const contentHtml = typeof rawContent === 'string'
    ? rawContent.replace(/^[\u200B\s]*\[fwd:[^\]]+\][\u200B\s]*/g, '').replace(/^\[Переслано от [^\]]+\]:\s*/, '')
    : rawContent;

  return (
    <motion.div
      whileTap={{ scale: 0.99 }}
      onClick={() => onClick && onClick(item)}
      className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-100 dark:border-white/5 cursor-pointer transition-all space-y-1 group"
    >
      {/* Top Row: Sender Info & Time */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Avatar */}
          <div className="h-7 w-7 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-tr from-[#3390ec] to-sky-400 flex items-center justify-center font-bold text-white text-xs shadow-xs">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span>{senderName.charAt(0).toUpperCase()}</span>
            )}
          </div>

          <div className="min-w-0 flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-[#3390ec] transition-colors truncate">
              {senderName}
            </span>
            {displayRoomName && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/60 dark:bg-white/10 text-slate-600 dark:text-white/60 truncate">
                {displayRoomName}
              </span>
            )}
          </div>
        </div>

        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono shrink-0 ml-2">
          {formatTime(displayTime)}
        </span>
      </div>

      {/* Snippet Content with Highlight */}
      <div
        className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words line-clamp-2 pl-9.5"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />

      {/* Attachments Preview if present */}
      {(item.file || (item.attachments && item.attachments.length > 0)) && (
        <div className="flex items-center gap-1.5 pt-0.5 pl-9.5">
          {item.file ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-200/50 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-[11px] text-[#3390ec]">
              <span>📎</span>
              <span className="truncate max-w-[140px]">{item.file.name}</span>
            </div>
          ) : (
            item.attachments?.slice(0, 2).map((att: any) => (
              <div
                key={att.id}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-200/50 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-[11px] text-[#3390ec]"
              >
                <span>📎</span>
                <span className="truncate max-w-[120px]">{att.file_name}</span>
              </div>
            ))
          )}
        </div>
      )}
    </motion.div>
  );
};

export default SearchResultCard;
