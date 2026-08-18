import React, { useState } from 'react';
import { useRoomMessages } from '../../hooks/useRoomMessages';
import { MessageService } from '../../services/message.service';
import { ReactionService } from '../../services/reaction.service';
import { MessageList } from './MessageList';
import { SendMessage } from './SendMessage';
import type { EnrichedMessage } from '../../lib/supabase/types';

export interface ChatRoomProps {
  roomId: string;
  roomName: string;
  roomAvatar?: string;
  currentUserId?: string;
  onOpenMembers?: () => void;
  onStartCall?: (type: 'audio' | 'video') => void;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({
  roomId,
  roomName,
  roomAvatar,
  currentUserId,
  onOpenMembers,
  onStartCall,
}) => {
  const {
    messages,
    isLoading,
    hasMore,
    error,
    loadMore,
    refetch,
  } = useRoomMessages(roomId, 50);

  const [replyingTo, setReplyingTo] = useState<EnrichedMessage | null>(null);

  const handleSendMessage = async (
    content: string,
    attachments?: { fileUrl: string; fileName: string; fileType?: string; fileSize?: number }[]
  ) => {
    await MessageService.sendMessage({
      roomId,
      content,
      senderId: currentUserId,
      replyToId: replyingTo?.id,
      attachments,
    });
    setReplyingTo(null);
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!currentUserId) return;
    await ReactionService.toggleReaction(messageId, currentUserId, emoji);
  };

  const handleDeleteMessage = async (messageId: string) => {
    await MessageService.deleteMessage(messageId);
  };

  const handleEditMessage = async (msg: EnrichedMessage) => {
    const newContent = prompt('Редактировать сообщение:', msg.content);
    if (newContent !== null && newContent.trim()) {
      await MessageService.editMessage(msg.id, newContent.trim());
    }
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Chat Header */}
      <div className="flex h-16 items-center justify-between border-b border-white/10 bg-black/30 backdrop-blur-xl px-4 z-10">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/20 bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center font-semibold text-white shadow-inner">
            {roomAvatar ? (
              <img src={roomAvatar} alt={roomName} className="h-full w-full object-cover" />
            ) : (
              <span>{roomName.charAt(0).toUpperCase()}</span>
            )}
          </div>

          {/* Info */}
          <div>
            <h2 className="text-sm font-semibold text-white/90 truncate max-w-[200px] md:max-w-md">
              {roomName}
            </h2>
            <p className="text-xs text-cyan-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>в сети (Supabase Realtime)</span>
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1 text-white/70">
          {onStartCall && (
            <>
              <button
                onClick={() => onStartCall('audio')}
                className="p-2 rounded-xl hover:bg-white/10 hover:text-white transition-colors"
                title="Аудиозвонок"
              >
                📞
              </button>
              <button
                onClick={() => onStartCall('video')}
                className="p-2 rounded-xl hover:bg-white/10 hover:text-white transition-colors"
                title="Видеозвонок"
              >
                📹
              </button>
            </>
          )}
          {onOpenMembers && (
            <button
              onClick={onOpenMembers}
              className="p-2 rounded-xl hover:bg-white/10 hover:text-white transition-colors"
              title="Информация и участники"
            >
              👥
            </button>
          )}
        </div>
      </div>

      {/* Error Notice with Retry */}
      {error && (
        <div className="flex items-center justify-between bg-red-500/20 border-b border-red-500/30 px-4 py-2 text-xs text-red-200">
          <span>⚠️ {error}</span>
          <button
            onClick={() => refetch()}
            className="underline hover:text-white font-medium"
          >
            Повторить
          </button>
        </div>
      )}

      {/* Message List */}
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        isLoading={isLoading}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onToggleReaction={handleToggleReaction}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        onReplyMessage={(msg) => setReplyingTo(msg)}
      />

      {/* Send Message Input */}
      <SendMessage
        roomId={roomId}
        onSendMessage={handleSendMessage}
        replyingTo={replyingTo ? { id: replyingTo.id, content: replyingTo.content } : null}
        onCancelReply={() => setReplyingTo(null)}
      />
    </div>
  );
};

export default ChatRoom;
