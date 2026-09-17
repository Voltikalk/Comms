import { useState, useMemo, useCallback } from 'react';
import type { Message, Room, UserId } from '../types';
import { triggerTelegramDisintegrate } from '../components/effects/disintegrate';

export interface UseChatInteractionsOptions {
  activeRoomId: string | null;
  currentUser: UserId | null;
  rooms: Room[];
  deleteMessage: (id: string) => void;
  forwardMessage: (roomId: string, message: Message) => void;
  setActiveRoomId: (roomId: string) => void;
  setMobileView: (view: 'list' | 'chat') => void;
  getRoomDisplayName: (room: Room) => string;
  showToast: (options: string | { text: string; actionLabel?: string; onAction?: () => void }) => void;
  messages: Message[];
}

export interface ContextMenuTarget {
  message: Message;
  x: number;
  y: number;
  isSelf: boolean;
}

export const useChatInteractions = ({
  activeRoomId,
  currentUser,
  rooms,
  deleteMessage,
  forwardMessage,
  setActiveRoomId,
  setMobileView,
  getRoomDisplayName,
  showToast,
  messages,
}: UseChatInteractionsOptions) => {
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [pinnedMessages, setPinnedMessages] = useState<Record<string, string>>({});
  const [contextMenuTarget, setContextMenuTarget] = useState<ContextMenuTarget | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());

  // Memoized message map for O(1) replies and pins lookup
  const messageMap = useMemo(() => {
    return new Map(messages.map((m) => [m.id, m]));
  }, [messages]);

  const currentPinnedMessageId = activeRoomId ? pinnedMessages[activeRoomId] : null;
  const currentPinnedMessage = currentPinnedMessageId ? messageMap.get(currentPinnedMessageId) || null : null;

  const togglePinMessage = useCallback((msgId: string) => {
    if (!activeRoomId) return;
    setPinnedMessages((prev) => {
      if (prev[activeRoomId] === msgId) {
        const next = { ...prev };
        delete next[activeRoomId];
        showToast('Сообщение откреплено');
        return next;
      }
      showToast('Сообщение закреплено');
      return { ...prev, [activeRoomId]: msgId };
    });
  }, [activeRoomId, showToast]);

  const handleForwardToRoom = useCallback((targetRoomId: string) => {
    if (!forwardingMessage) return;

    forwardMessage(targetRoomId, forwardingMessage);

    setForwardingMessage(null);
    setIsSelectMode(false);
    setSelectedMessageIds(new Set());

    const targetRoom = rooms.find((r) => r.id === targetRoomId);
    const roomName = targetRoom ? getRoomDisplayName(targetRoom) : 'чат';

    showToast({
      text: `Сообщение переслано в ${roomName}`,
      actionLabel: 'Перейти',
      onAction: () => {
        setActiveRoomId(targetRoomId);
        setMobileView('chat');
      },
    });
  }, [forwardingMessage, forwardMessage, rooms, getRoomDisplayName, showToast, setActiveRoomId, setMobileView]);

  const handleDeleteMessageAnimated = useCallback((messageId: string) => {
    const element = document.getElementById(`msg-${messageId}`);
    const bubble = (element?.querySelector('[data-bubble="true"]') || element) as HTMLElement | null;
    if (bubble) {
      triggerTelegramDisintegrate(bubble, () => {
        deleteMessage(messageId);
      });
    } else {
      deleteMessage(messageId);
    }
  }, [deleteMessage]);

  const handleDeleteSelectedAnimated = useCallback(() => {
    const ids = Array.from(selectedMessageIds);
    if (ids.length === 0) return;

    const bubbles: HTMLElement[] = [];
    ids.forEach((id) => {
      const element = document.getElementById(`msg-${id}`);
      const bubble = (element?.querySelector('[data-bubble="true"]') || element) as HTMLElement | null;
      if (bubble) {
        bubbles.push(bubble);
      }
    });

    if (bubbles.length > 0) {
      triggerTelegramDisintegrate(bubbles, () => {
        ids.forEach((id) => deleteMessage(id));
      });
    } else {
      ids.forEach((id) => deleteMessage(id));
    }

    setIsSelectMode(false);
    setSelectedMessageIds(new Set());
    showToast(ids.length > 1 ? 'Сообщения удалены' : 'Сообщение удалено');
  }, [selectedMessageIds, deleteMessage, showToast]);

  const handleContextMenu = useCallback((
    e: React.MouseEvent | { clientX: number; clientY: number; preventDefault?: () => void },
    msg: Message
  ) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (isSelectMode) {
      setSelectedMessageIds((prev) => {
        const next = new Set(prev);
        if (next.has(msg.id)) next.delete(msg.id);
        else next.add(msg.id);
        return next;
      });
      return;
    }
    setContextMenuTarget({
      message: msg,
      x: e.clientX,
      y: e.clientY,
      isSelf: Boolean(currentUser && msg.sender === currentUser),
    });
  }, [isSelectMode, currentUser]);

  return {
    replyingToMessage,
    setReplyingToMessage,
    editingMessage,
    setEditingMessage,
    forwardingMessage,
    setForwardingMessage,
    pinnedMessages,
    setPinnedMessages,
    currentPinnedMessageId,
    currentPinnedMessage,
    contextMenuTarget,
    setContextMenuTarget,
    isSelectMode,
    setIsSelectMode,
    selectedMessageIds,
    setSelectedMessageIds,
    messageMap,
    togglePinMessage,
    handleForwardToRoom,
    handleDeleteMessageAnimated,
    handleDeleteSelectedAnimated,
    handleContextMenu,
  };
};
