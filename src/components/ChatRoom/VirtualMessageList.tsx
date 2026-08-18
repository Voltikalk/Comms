import React, { useRef, useState, useEffect } from 'react';
import { useVirtualScroll } from '../../hooks/useVirtualScroll';
import type { EnrichedMessage } from '../../lib/supabase/types';

export interface VirtualMessageListProps {
  messages: EnrichedMessage[];
  currentUserId?: string;
  unreadIndex?: number | null;
  hasMoreOlder?: boolean;
  isLoadingMore?: boolean;
  onLoadOlder?: () => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onEditMessage?: (message: EnrichedMessage) => void;
  onDeleteMessage?: (messageId: string) => void;
  onReplyMessage?: (message: EnrichedMessage) => void;
}

export const VirtualMessageList: React.FC<VirtualMessageListProps> = ({
  messages,
  currentUserId,
  unreadIndex = null,
  hasMoreOlder = false,
  isLoadingMore = false,
  onLoadOlder,
  onToggleReaction,
  onEditMessage,
  onDeleteMessage,
  onReplyMessage,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportHeight, setViewportHeight] = useState(600);

  useEffect(() => {
    if (containerRef.current) {
      setViewportHeight(containerRef.current.clientHeight);
    }
  }, []);

  const { virtualItems, totalHeight, onScroll } = useVirtualScroll({
    itemCount: messages.length,
    itemHeight: 78,
    viewportHeight,
    overscan: 8,
  });

  const handleContainerScroll = (e: React.UIEvent<HTMLDivElement>) => {
    onScroll(e);
    if (e.currentTarget.scrollTop === 0 && hasMoreOlder && !isLoadingMore && onLoadOlder) {
      onLoadOlder();
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
      ref={containerRef}
      onScroll={handleContainerScroll}
      className="relative flex-1 overflow-y-auto p-4 custom-scrollbar"
    >
      {/* Loading older indicator */}
      {isLoadingMore && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 text-xs shadow-lg backdrop-blur-md animate-pulse">
          Загрузка предыдущих сообщений...
        </div>
      )}

      {/* Virtual Container */}
      <div style={{ height: `${totalHeight}px`, width: '100%', position: 'relative' }}>
        {virtualItems.map((virtualItem) => {
          const msg = messages[virtualItem.index];
          if (!msg) return null;

          const isOwn = currentUserId ? msg.sender_id === currentUserId : false;
          const isUnreadMarker = unreadIndex !== null && virtualItem.index === unreadIndex;

          return (
            <div
              key={msg.id}
              style={{
                position: 'absolute',
                top: `${virtualItem.offsetTop}px`,
                left: 0,
                width: '100%',
              }}
              className="py-1 px-2"
            >
              {/* Unread Messages Separator Marker */}
              {isUnreadMarker && (
                <div className="my-2 flex items-center gap-3">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
                  <span className="px-3 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[11px] font-bold tracking-wider uppercase border border-cyan-500/30">
                    Новые сообщения
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
                </div>
              )}

              {/* Message Bubble */}
              <div className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`group relative max-w-[80%] md:max-w-[65%] rounded-2xl p-3 shadow-md backdrop-blur-md transition-all ${
                    isOwn
                      ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white rounded-br-none'
                      : 'bg-white/10 text-white/95 rounded-bl-none border border-white/10'
                  }`}
                >
                  {/* Sender Name if not own */}
                  {!isOwn && (
                    <p className="text-[11px] font-semibold text-cyan-300 mb-0.5">
                      {msg.sender?.display_name || msg.sender?.username || 'Собеседник'}
                    </p>
                  )}

                  {/* Content */}
                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                    {msg.content}
                  </p>

                  {/* Reactions */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Array.from(new Set(msg.reactions.map((r) => r.emoji))).map((emoji) => {
                        const count = msg.reactions?.filter((r) => r.emoji === emoji).length || 0;
                        return (
                          <button
                            key={emoji}
                            onClick={() => onToggleReaction && onToggleReaction(msg.id, emoji)}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] bg-black/30 text-white/80 hover:bg-black/50 transition-all"
                          >
                            <span>{emoji}</span>
                            <span>{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Time + Status */}
                  <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-white/60">
                    {msg.edited_at && <span className="italic">изм.</span>}
                    <span>{formatTime(msg.created_at)}</span>
                    {isOwn && <span>✓✓</span>}
                  </div>

                  {/* Quick Action Menu */}
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VirtualMessageList;
