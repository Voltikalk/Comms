import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { EnrichedMessage } from '../../lib/supabase/types';
import { ANIMATED_EMOJIS } from '../../constants';

export interface MessageListProps {
  messages: EnrichedMessage[];
  currentUserId?: string;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onEditMessage?: (message: EnrichedMessage) => void;
  onDeleteMessage?: (messageId: string) => void;
  onReplyMessage?: (message: EnrichedMessage) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  onToggleReaction,
  onEditMessage,
  onDeleteMessage,
  onReplyMessage,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleScroll = () => {
    if (!scrollContainerRef.current || !hasMore || isLoading) return;
    if (scrollContainerRef.current.scrollTop === 0 && onLoadMore) {
      onLoadMore();
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"
    >
      {/* Load More Indicator */}
      {hasMore && (
        <div className="flex justify-center py-2">
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            className="px-3 py-1 text-xs rounded-full bg-white/10 hover:bg-white/20 text-white/70 transition-all"
          >
            {isLoading ? 'Загрузка...' : 'Загрузить предыдущие'}
          </button>
        </div>
      )}

      {/* Skeleton Loading State */}
      {isLoading && messages.length === 0 && (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}
            >
              <div className="h-12 w-48 rounded-2xl bg-white/10" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center text-white/40 space-y-2 py-12">
          <div className="text-4xl">💬</div>
          <p className="text-sm">В этом чате пока нет сообщений</p>
          <p className="text-xs text-white/30">Напишите первое сообщение!</p>
        </div>
      )}

      {/* Messages Feed */}
      <AnimatePresence initial={false}>
        {messages.map((msg) => {
          const isOwn = currentUserId ? msg.sender_id === currentUserId : false;

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              {/* Message Bubble */}
              <div
                className={`group relative max-w-[80%] md:max-w-[65%] rounded-2xl p-3 shadow-md backdrop-blur-md transition-all ${
                  isOwn
                    ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white rounded-br-none'
                    : 'bg-white/10 text-white/95 rounded-bl-none border border-white/10'
                }`}
              >
                {/* Attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mb-2 space-y-1.5 overflow-hidden rounded-xl">
                    {msg.attachments.map((att) => (
                      <div key={att.id}>
                        {att.file_type?.startsWith('image/') ? (
                          <img
                            src={att.file_url}
                            alt={att.file_name}
                            className="max-h-64 w-full rounded-lg object-cover cursor-pointer hover:opacity-95 transition-opacity"
                            onClick={() => window.open(att.file_url, '_blank')}
                          />
                        ) : (
                          <a
                            href={att.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 rounded-lg bg-black/20 hover:bg-black/30 transition-colors text-xs text-cyan-200"
                          >
                            <span>📎</span>
                            <span className="truncate">{att.file_name}</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Content */}
                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                  {msg.content}
                </p>

                {/* Footer Info: Time + Edited + Delivery */}
                <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-white/60">
                  {msg.edited_at && <span className="italic">изм.</span>}
                  <span>{formatTime(msg.created_at)}</span>
                  {isOwn && (
                    <span title="Доставлено в Supabase">
                      ✓✓
                    </span>
                  )}
                </div>

                {/* Reactions list */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {Array.from(new Set(msg.reactions.map((r) => r.emoji))).map((emoji) => {
                      const count = msg.reactions?.filter((r) => r.emoji === emoji).length || 0;
                      const hasReacted = currentUserId
                        ? msg.reactions?.some((r) => r.emoji === emoji && r.user_id === currentUserId)
                        : false;

                      return (
                        <button
                          key={emoji}
                          onClick={() => onToggleReaction && onToggleReaction(msg.id, emoji)}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-all ${
                            hasReacted
                              ? 'bg-cyan-400/30 border border-cyan-400 text-cyan-200'
                              : 'bg-black/30 text-white/80 hover:bg-black/50'
                          }`}
                        >
                          {ANIMATED_EMOJIS[emoji] ? (
                            <img src={ANIMATED_EMOJIS[emoji]} alt={emoji} className="w-4 h-4 inline" />
                          ) : (
                            <span>{emoji}</span>
                          )}
                          <span>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Quick Hover Actions Menu */}
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-lg p-1">
                  {onReplyMessage && (
                    <button
                      onClick={() => onReplyMessage(msg)}
                      className="p-1 hover:text-cyan-400 text-white/70 transition-colors"
                      title="Ответить"
                    >
                      ↩
                    </button>
                  )}
                  {isOwn && onEditMessage && (
                    <button
                      onClick={() => onEditMessage(msg)}
                      className="p-1 hover:text-cyan-400 text-white/70 transition-colors"
                      title="Редактировать"
                    >
                      ✏️
                    </button>
                  )}
                  {isOwn && onDeleteMessage && (
                    <button
                      onClick={() => onDeleteMessage(msg.id)}
                      className="p-1 hover:text-red-400 text-white/70 transition-colors"
                      title="Удалить"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      <div ref={bottomRef} />
    </div>
  );
};

export default MessageList;
