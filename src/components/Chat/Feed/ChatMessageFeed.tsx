import React, { useMemo } from 'react';
import type { Message, UserId, Room } from '../../../types';
import { MessageBubble } from '../../MessageBubble';
import type { PinnedMessagesState } from '../../../hooks/usePinnedMessages';
import { buildFeedEntries } from '../../../lib/message-grouping';
import { PinnedBar } from './PinnedBar';
import { AlbumBubble } from './AlbumBubble';
import { useRooms } from '../../../context/contexts';
import { serviceText } from '../../../lib/service-messages';
import {
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
  pinned: PinnedMessagesState;
  onJumpToMessage: (id: string) => void;
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
  /** Active in-chat search: its matches are highlighted in the bubbles. */
  searchQuery?: string;
  /** #тег click inside a bubble. */
  onHashtagClick?: (tag: string) => void;
}

const formatPinTime = (ts: number) =>
  new Date(ts).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const ChatMessageFeed: React.FC<ChatMessageFeedProps> = ({
  activeRoomId,
  activeRoom,
  currentUser,
  isConnected,
  messageFeedRef,
  handleScroll,
  slicedMessages,
  messageMap,
  pinned,
  onJumpToMessage,
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
  searchQuery,
  onHashtagClick,
}) => {
  const { getUserDisplayName } = useRooms();
  const isChannel = activeRoom?.type === 'channel';
  const entries = useMemo(
    // Channel posts are authored by the channel itself — no per-sender labels.
    () => buildFeedEntries(slicedMessages, { isGroupChat: activeRoom?.type === 'group' }),
    [slicedMessages, activeRoom?.type],
  );
  const openContextMenu = (msg: Message, pos: { x: number; y: number }) =>
    onContextMenu({ clientX: pos.x, clientY: pos.y, preventDefault: () => {} }, msg);

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

      {/* Multi-pin bar + slide-out list */}
      <PinnedBar
        pinned={pinned}
        onJumpToMessage={onJumpToMessage}
        getCleanMessageText={getCleanMessageText}
        formatTime={formatPinTime}
      />

      {/* Message Feed Scroll Area */}
      <section
        ref={messageFeedRef as any}
        onScroll={handleScroll}
        className="flex-1 min-w-0 w-full max-w-full overflow-y-auto overflow-x-hidden px-2.5 sm:px-6 py-3 tg-scrollbar"
      >
        <div key={activeRoomId} className="max-w-2xl mx-auto w-full min-w-0 max-w-full flex flex-col min-h-full">
          {/* Top flexible spacer to anchor short chat history cleanly at bottom without jumping */}
          <div className="flex-1 min-h-0" />

          {entries.map((entry) => {
            const { message } = entry;
            const isSelf = message.sender === currentUser;
            const senderName = isSelf ? 'Вы' : getUserDisplayName(message.sender) || message.sender;

            return (
              <React.Fragment key={entry.key}>
                {entry.showDateSeparator && (
                  <div className="flex justify-center my-2.5 select-none">
                    <span className="tg-date-pill shadow-xs">{formatDateHeader(message.timestamp)}</span>
                  </div>
                )}

                {message.service ? (
                  <div data-message-id={message.id} className="my-1.5 flex justify-center px-6 select-none">
                    <span className="tg-date-pill max-w-full text-center leading-snug shadow-xs">
                      {serviceText(message, getUserDisplayName, {
                        me: currentUser,
                        isChannel,
                        pinnedPreview: (() => {
                          const target = message.service.messageId ? messageMap.get(message.service.messageId) : undefined;
                          const text = target ? getCleanMessageText(target).trim() : '';
                          return text ? (text.length > 40 ? `${text.slice(0, 40)}…` : text) : undefined;
                        })(),
                      })}
                    </span>
                  </div>
                ) : entry.kind === 'album' ? (
                  <AlbumBubble
                    items={entry.items}
                    isSelf={isSelf}
                    senderName={senderName}
                    showSenderLabel={entry.showSenderLabel}
                    groupedAbove={entry.groupedAbove}
                    groupedBelow={entry.groupedBelow}
                    currentUser={currentUser}
                    isSelectMode={isSelectMode}
                    selectedMessageIds={selectedMessageIds}
                    onToggleSelect={onToggleSelectMessage}
                    onOpenGallery={onOpenGalleryMedia}
                    onOpenContextMenu={openContextMenu}
                    onToggleReaction={onToggleReaction}
                  />
                ) : (
                  <div data-message-id={message.id} className="transition-all duration-300">
                    <MessageBubble
                      message={message}
                      isSelf={isSelf}
                      senderName={senderName}
                      parentMessage={message.replyToId ? messageMap.get(message.replyToId) || null : null}
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
                      groupedAbove={entry.groupedAbove}
                      groupedBelow={entry.groupedBelow}
                      showSenderLabel={entry.showSenderLabel}
                      roomParticipantCount={activeRoom?.participants?.length || 0}
                      onOpenContextMenu={openContextMenu}
                      searchQuery={searchQuery}
                      onHashtagClick={onHashtagClick}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </section>

      {/* Drag and Drop File Overlay */}
      {isChatDragging && (
        <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center animate-pop-in">
          <div className="absolute inset-2.5 rounded-3xl border-[3px] border-dashed border-accent bg-accent/10 backdrop-blur-[2px]" />
          <div className="relative z-10 flex flex-col items-center gap-3 px-6 py-5 rounded-3xl bg-white/95 dark:bg-surface/95 shadow-2xl border border-zinc-200/80 dark:border-white/10">
            <div className="w-14 h-14 rounded-full bg-accent/15 flex items-center justify-center">
              <IconPaperclip size={28} className="text-accent" />
            </div>
            <div className="text-center">
              <div className="text-[15px] font-bold text-zinc-900 dark:text-white">Отпустите для отправки</div>
              <div className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-0.5">Файл будет прикреплён к сообщению</div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Scroll to Bottom Button */}
      {showScrollDownBtn && (
        <button
          type="button"
          onClick={() => onScrollToBottom('smooth')}
          className="absolute right-3 sm:right-5 bottom-[88px] z-20 w-11 h-11 rounded-full bg-white dark:bg-[#2b3946] shadow-lg border border-zinc-200/70 dark:border-white/10 flex items-center justify-center text-zinc-500 dark:text-zinc-300 hover:text-accent cursor-pointer transition-all animate-pop-in"
          title="Прокрутить вниз"
        >
          <IconArrowDown size={22} />
          {(activeRoomId ? unreadCount(activeRoomId) : 0) > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-accent text-white flex items-center justify-center border-2 border-white dark:border-surface">
              {unreadCount(activeRoomId)}
            </span>
          )}
        </button>
      )}
    </>
  );
};

export default ChatMessageFeed;
