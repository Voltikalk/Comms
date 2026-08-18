import { useState, useRef, useCallback } from 'react';

export interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number; // Minimum distance in px to register a swipe (default 50px)
  maxVerticalOffset?: number; // Prevent swipe if vertical scrolling was intended
}

/**
 * Hook for touch swipe gestures (e.g. swiping between Login and Register tabs on mobile)
 */
export function useSwipeGestures(options: SwipeOptions = {}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    maxVerticalOffset = 80,
  } = options;

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const diffX = touchEndX - touchStartX.current;
    const diffY = touchEndY - touchStartY.current;

    const absDiffX = Math.abs(diffX);
    const absDiffY = Math.abs(diffY);

    // Check Horizontal Swipes
    if (absDiffX > threshold && absDiffY < maxVerticalOffset) {
      if (diffX < 0) {
        onSwipeLeft?.();
      } else {
        onSwipeRight?.();
      }
    }
    // Check Vertical Swipes
    else if (absDiffY > threshold && absDiffX < maxVerticalOffset) {
      if (diffY < 0) {
        onSwipeUp?.();
      } else {
        onSwipeDown?.();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold, maxVerticalOffset]);

  return {
    onTouchStart,
    onTouchEnd,
  };
}

export interface LongPressOptions {
  onLongPress: () => void;
  onClick?: () => void;
  delay?: number; // Default 500ms
}

/**
 * Hook for long-press mobile gestures (e.g. preview, context menu, or special actions)
 */
export function useLongPress(options: LongPressOptions) {
  const { onLongPress, onClick, delay = 500 } = options;
  const [isLongPressActive, setIsLongPressActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggered = useRef(false);

  const startPress = useCallback(() => {
    isLongPressTriggered.current = false;
    timerRef.current = setTimeout(() => {
      isLongPressTriggered.current = true;
      setIsLongPressActive(true);
      onLongPress();
    }, delay);
  }, [onLongPress, delay]);

  const cancelPress = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsLongPressActive(false);
  }, []);

  const handleClick = useCallback(() => {
    if (!isLongPressTriggered.current) {
      onClick?.();
    }
  }, [onClick]);

  return {
    onMouseDown: startPress,
    onMouseUp: cancelPress,
    onMouseLeave: cancelPress,
    onTouchStart: startPress,
    onTouchEnd: cancelPress,
    onClick: handleClick,
    isLongPressActive,
  };
}

export default useSwipeGestures;
