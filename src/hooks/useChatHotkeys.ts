import { useEffect, useRef } from 'react';
import { resolveChatHotkey, type ChatHotkeyAction } from '../lib/chat-hotkeys';

/**
 * Handlers for global chat shortcuts. Return `false` from a handler to let
 * the event through (no `preventDefault`) — e.g. Ctrl+5 when there is no 5th chat.
 */
export type ChatHotkeyHandlers = {
  [K in ChatHotkeyAction['type']]?: (action: Extract<ChatHotkeyAction, { type: K }>) => boolean | void;
};

/**
 * Global keyboard shortcuts for the chat screen (Ctrl+K palette, Alt+↑/↓,
 * Alt+1..5 folders, Ctrl+1..9 chats, Ctrl+/, Ctrl+, and hierarchical Escape).
 * Handlers are read through a ref, so the listener is attached once.
 */
export function useChatHotkeys(handlers: ChatHotkeyHandlers): void {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const action = resolveChatHotkey(e);
      if (!action) return;
      const handler = handlersRef.current[action.type] as ((a: ChatHotkeyAction) => boolean | void) | undefined;
      if (!handler) return;
      if (handler(action) !== false) e.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
