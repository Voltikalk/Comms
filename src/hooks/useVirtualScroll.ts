import { useState, useMemo, useCallback } from 'react';

export interface UseVirtualScrollOptions {
  itemCount: number;
  itemHeight?: number; // Estimated average height in px (e.g. 70)
  viewportHeight: number;
  overscan?: number; // Number of items to render above and below visible area
}

export function useVirtualScroll({
  itemCount,
  itemHeight = 72,
  viewportHeight,
  overscan = 6,
}: UseVirtualScrollOptions) {
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = useMemo(() => itemCount * itemHeight, [itemCount, itemHeight]);

  const { startIndex, endIndex } = useMemo(() => {
    if (itemCount === 0 || viewportHeight === 0) {
      return { startIndex: 0, endIndex: 0 };
    }

    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(viewportHeight / itemHeight) + 2 * overscan;
    const end = Math.min(itemCount - 1, start + visibleCount);

    return { startIndex: start, endIndex: end };
  }, [scrollTop, itemHeight, viewportHeight, overscan, itemCount]);

  const virtualItems = useMemo(() => {
    const items = [];
    for (let index = startIndex; index <= endIndex; index++) {
      items.push({
        index,
        offsetTop: index * itemHeight,
        height: itemHeight,
      });
    }
    return items;
  }, [startIndex, endIndex, itemHeight]);

  const onScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    virtualItems,
    totalHeight,
    startIndex,
    endIndex,
    scrollTop,
    onScroll,
  };
}

export default useVirtualScroll;
