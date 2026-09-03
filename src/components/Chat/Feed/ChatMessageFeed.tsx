import React from 'react';
import type { Message, UserId, Room } from '../../../types';
import { MessageBubble } from '../../MessageBubble';
import {
  IconX,
  IconPaperclip,
  IconArrowDown
} from '@tabler/icons-react';

export interface ChatMessageFeedProps {
  activeRoomId: string;
  activeRoom: Room | null;
  currentUser: UserId | null;
  isConnected: boolean;
  messageFeedRef: React.RefObject<HTMLElement | null>;
  handleScroll: (e: React.UIEvent<HTMLElement>) => void;
  slicedMessages: Message[];
  messageMap: Map<string, Message>;
  currentPinnedMessage: Message | null;
  onJumpToMessage: (id: string) => void;
  onTogglePinMessage: (id: string) => void;
  getCleanMessageText: (msg: Message) => string;
  formatDateHeader: (timestamp: number) => string;
  isChatDragging: boolean;
  showScrollDownBtn: boolean;
  onScrollToBottom: (behavior?: ScrollBehavior) => void;
  unreadCount: (roomId: string) => number;
  // Selection
  isSelectMode: boolean;
  selectedMessageIds: Set<string>;
  onToggleSelectMessage: (id: string) => void;
  // Bubble actions
  onReplyMessage: (msg: Message) => void;
  onEditMessage: (msg: Message) => void;
  onDeleteMessageAnimated: (id: string) => void;
  onToggleReaction: (messageId: string, reaction: string) => void;
  onVotePoll: (messageId: string, roomId: string, optionIds: string[]) => void;
  onClosePoll: (messageId: string, roomId: string) => void;
  onOpenGalleryMedia: (msgId: string) => void;
  onContextMenu: (e: React.MouseEvent | { clientX: number; clientY: number; preventDefault?: () => void }, msg: Message) => void;
}

export const ChatMessageFeed: React.FC<ChatMessageFeedProps> = ({
  activeRoomId,
  activeRoom,
  currentUser,
  isConnected,
  messageFeedRef,
  handleScroll,
  slicedMessages,
  messageMap,
  currentPinnedMessage,
  onJumpToMessage,
  onTogglePinMessage,
  getCleanMessageText,
  formatDateHeader,
  isChatDragging,
  showScrollDownBtn,
  onScrollToBottom,
  unreadCount,
  isSelectMode,
  selectedMessageIds,
  onToggleSelectMessage,
  onReplyMessage,
  onEditMessage,
  onDeleteMessageAnimated,
  onToggleReaction,
  onVotePoll,
  onClosePoll,
  onOpenGalleryMedia,
  onContextMenu,
}) => {
  return (
    <>
      {/* Offline Connection Banner */}
      {!isConnected && (
        <div className="px-4 py-1.5 bg-amber-500/15 border-b border-amber-500/30 flex items-center justify-center gap-2 z-30 animate-pop-in select-none">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <span className="text-[12px] font-semibold text-amber-600 dark:text-amber-400">
            Нет соединения с сервером · сообщения не отправляются
          </span>
        </div>
      )}

      {/* Pinned Message Banner */}
      {currentPinnedMessage && (
        <div
          onClick={() => {
            onJumpToMessage(currentPinnedMessage.id);
          }}
          className="px-4 py-1.5 bg-white/95 dark:bg-[#17212b]/95 border-b border-slate-200 dark:border-white/10 flex items-center justify-between cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors z-20 backdrop-blur-md animate-pop-in select-none shadow-xs w-full min-w-0"
        >
          <div className="flex items-center gap-2.5 min-w-0 border-l-[3px] border-[#3390ec] pl-2.5">
            <div className="min-w-0">
              <span className="text-[11.5px] font-bold text-[#3390ec] block">Закреплённое сообщение</span>
              <span className="text-[12px] text-slate-700 dark:text-slate-300 truncate block">
                {getCleanMessageText(currentPinnedMessage)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePinMessage(currentPinnedMessage.id);
            }}
            className="p-1 rounded-full text-slate-400 hover:text-rose-500 cursor-pointer shrink-0"
            title="Открепить"
          >
            <IconX size={16} />
          </button>
        </div>
      )}

      {/* Message Feed Scroll Area */}
      <section
        ref={messageFeedRef as any}
        onScroll={handleScroll}
        className="flex-1 min-w-0 w-full max-w-full overflow-y-auto overflow-x-hidden px-2.5 sm:px-6 py-3 tg-scrollbar"
      >
        <div key={activeRoomId} className="max-w-2xl mx-auto w-full min-w-0 max-w-full flex flex-col min-h-full">
          {/* Top flexible spacer to anchor short chat history cleanly at bottom without jumping */}
          <div className="flex-1 min-h-0" />

          {slicedMessages.map((message, index) => {
            const isSelf = message.sender === currentUser;
            const senderName = isSelf ? 'Вы' : message.sender;
            const parentMessage = message.replyToId ? messageMap.get(message.replyToId) || null : null;

            const prevMessage = index > 0 ? slicedMessages[index - 1] : null;
            const nextMessage = index < slicedMessages.length - 1 ? slicedMessages[index + 1] : null;
            const showDateSeparator = !prevMessage ||
              new Date(prevMessage.timestamp).toDateString() !== new Date(message.timestamp).toDateString();

            // Telegram grouping logic: same sender within 5 mins, no reply
            const canGroupWith = (a: Message | null, b: Message | null) =>
              Boolean(a && b && a.sender === b.sender &&
                !b.replyToId &&
                (b.timestamp - a.timestamp) < 5 * 60 * 1000 &&
                new Date(a.timestamp).toDateString() === new Date(b.timestamp).toDateString());

            const groupedAbove = canGroupWith(prevMessage, message);
            const groupedBelow = canGroupWith(message, nextMessage);

            const isSameSender = prevMessage && prevMessage.sender === message.sender && !showDateSeparator;
            const showSenderLabel = activeRoom?.type === 'group' && !isSameSender;

            return (
              <React.Fragment key={message.id}>
                {showDateSeparator && (
                  <div className="flex justify-center my-2.5 select-none">
                    <span className="px-3 py-1 bg-black/30 dark:bg-black/40 text-white text-[11.5px] font-medium rounded-full backdrop-blur-md shadow-xs border border-white/10">
                      {formatDateHeader(message.timestamp)}
                    </span>
                  </div>
                )}

                <div 
                  id={`msg-${message.id}`} 
                  data-message-id={message.id} 
                  className="transition-all duration-300"
                >
                  <MessageBubble
                    message={message}
                    isSelf={isSelf}
                    senderName={senderName}
                    parentMessage={parentMessage}
                    currentUser={currentUser}
                    isSelectMode={isSelectMode}
                    isSelected={selectedMessageIds.has(message.id)}
                    onToggleSelect={onToggleSelectMessage}
                    onReply={onReplyMessage}
                    deleteMessage={onDeleteMessageAnimated}
                    editMessage={(_id, _text) => onEditMessage(message)}
                    toggleReaction={onToggleReaction}
                    onVotePoll={onVotePoll}
                    onClosePoll={onClosePoll}
                    onOpenGallery={onOpenGalleryMedia}
                    onJumpToMessage={onJumpToMessage}
                    groupedAbove={groupedAbove}
                    groupedBelow={groupedBelow}
                    showSenderLabel={showSenderLabel}
                    roomParticipantCount={activeRoom?.participants?.length || 0}
                    onOpenContextMenu={(msg, pos) => onContextMenu({ clientX: pos.x, clientY: pos.y, preventDefault: () => {} }, msg)}
                  />
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </section>

      {/* Drag and Drop File Overlay */}
      {isChatDragging && (
        <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center animate-pop-in">
          <div className="absolute inset-2.5 rounded-3xl border-[3px] border-dashed border-[#3390ec] bg-[#3390ec]/10 backdrop-blur-[2px]" />
          <div className="relative z-10 flex flex-col items-center gap-3 px-6 py-5 rounded-3xl bg-white/95 dark:bg-[#17212b]/95 shadow-2xl border border-slate-200/80 dark:border-white/10">
            <div className="w-14 h-14 rounded-full bg-[#3390ec]/15 flex items-center justify-center">
              <IconPaperclip size={28} className="text-[#3390ec]" />
            </div>
            <div className="text-center">
              <div className="text-[15px] font-bold text-slate-900 dark:text-white">Отпустите для отправки</div>
              <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">Файл будет прикреплён к сообщению</div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Scroll to Bottom Button */}
      {showScrollDownBtn && (
        <button
          type="button"
          onClick={() => onScrollToBottom('smooth')}
          className="absolute right-3 sm:right-5 bottom-[88px] z-20 w-11 h-11 rounded-full bg-white dark:bg-[#2b3946] shadow-lg border border-slate-200/70 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-slate-300 hover:text-[#3390ec] cursor-pointer transition-all animate-pop-in"
          title="Прокрутить вниз"
        >
          <IconArrowDown size={22} />
          {(activeRoomId ? unreadCount(activeRoomId) : 0) > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-[#3390ec] text-white flex items-center justify-center border-2 border-white dark:border-[#17212b]">
              {unreadCount(activeRoomId)}
            </span>
          )}
        </button>
      )}
    </>
  );
};

export default ChatMessageFeed;
