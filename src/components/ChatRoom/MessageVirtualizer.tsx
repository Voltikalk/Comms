import React, { useState } from 'react';
import { useInfiniteMessageHistory } from '../../hooks/useInfiniteMessageHistory';
import { MessageHistoryService } from '../../services/message-history.service';
import { VirtualMessageList } from './VirtualMessageList';
import type { EnrichedMessage } from '../../lib/supabase/types';

export interface MessageVirtualizerProps {
  roomId: string;
  userId?: string;
  onReplyMessage?: (msg: EnrichedMessage) => void;
  onEditMessage?: (msg: EnrichedMessage) => void;
  onDeleteMessage?: (msgId: string) => void;
}

export const MessageVirtualizer: React.FC<MessageVirtualizerProps> = ({
  roomId,
  userId,
  onReplyMessage,
  onEditMessage,
  onDeleteMessage,
}) => {
  const {
    messages,
    isLoading,
    isLoadingMore,
    hasMoreOlder,
    filterType,
    unreadSeparatorIndex,
    loadOlderMessages,
    setFilterType,
  } = useInfiniteMessageHistory({ roomId, userId });

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'json' | 'csv') => {
    setIsExporting(true);
    try {
      const dataStr = await MessageHistoryService.exportHistory(roomId, format);
      const blob = new Blob([dataStr], { type: format === 'json' ? 'application/json' : 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comms-history-${roomId}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[Export Error]', err);
    } finally {
      setIsExporting(false);
    }
  };

  const filters = [
    { key: 'all', label: 'Все' },
    { key: 'media', label: '📷 Медиа' },
    { key: 'docs', label: '📎 Документы' },
    { key: 'voice', label: '🎙️ Аудио' },
  ] as const;

  return (
    <div className="flex flex-col h-full bg-slate-950/60 overflow-hidden">
      {/* History Toolbar & Filter Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/40 backdrop-blur-md z-10 text-xs">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterType(f.key)}
              className={`px-2.5 py-1 rounded-xl font-medium transition-all ${
                filterType === f.key
                  ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-1 text-[11px]">
          <button
            onClick={() => handleExport('json')}
            disabled={isExporting}
            className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all disabled:opacity-50"
            title="Экспорт в JSON"
          >
            JSON ⬇
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all disabled:opacity-50"
            title="Экспорт в CSV"
          >
            CSV ⬇
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="flex-1 p-4 space-y-3 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}
            >
              <div className="h-14 w-60 rounded-2xl bg-white/10" />
            </div>
          ))}
        </div>
      )}

      {/* Virtual Message List */}
      {!isLoading && (
        <VirtualMessageList
          messages={messages}
          currentUserId={userId}
          unreadIndex={unreadSeparatorIndex}
          hasMoreOlder={hasMoreOlder}
          isLoadingMore={isLoadingMore}
          onLoadOlder={loadOlderMessages}
          onReplyMessage={onReplyMessage}
          onEditMessage={onEditMessage}
          onDeleteMessage={onDeleteMessage}
        />
      )}
    </div>
  );
};

export default MessageVirtualizer;
