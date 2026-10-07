import { useCallback, useEffect, useState } from 'react';
import { toggleInSet } from '../lib/chat-hotkeys';

/**
 * Multi-select mode for the message feed: toggling the last selected message
 * off leaves the mode, Escape exits it.
 */
export function useMessageSelection() {
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(() => new Set());

  const clearSelection = useCallback(() => {
    setIsSelectMode(false);
    setSelectedMessageIds(new Set());
  }, []);

  const toggleSelected = useCallback((id: string) => {
    setSelectedMessageIds((prev) => {
      const next = toggleInSet(prev, id);
      if (next.size === 0) setIsSelectMode(false);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!isSelectMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clearSelection();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSelectMode, clearSelection]);

  return {
    isSelectMode,
    setIsSelectMode,
    selectedMessageIds,
    setSelectedMessageIds,
    toggleSelected,
    clearSelection,
  };
}
