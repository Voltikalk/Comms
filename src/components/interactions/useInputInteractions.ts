import { useState, useCallback, useMemo } from 'react';
import type { Variants } from 'framer-motion';

export interface UseInputInteractionsOptions {
  maxLength?: number;
  initialValue?: string;
}

/**
 * Hook for rich input micro-interactions (spring labels, clear button, character counter, focus icon tint)
 */
export function useInputInteractions(options: UseInputInteractionsOptions = {}) {
  const { maxLength, initialValue = '' } = options;
  const [value, setValue] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);

  const hasValue = value.length > 0;
  const charCount = value.length;

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    setValue(e.target.value);
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  }, []);

  const handleClear = useCallback(() => {
    setValue('');
  }, []);

  // Spring Label Animation (Jumps up on input focus/fill)
  const springLabelVariants: Variants = useMemo(() => ({
    idle: {
      y: 0,
      scale: 1,
      color: 'rgba(100, 116, 139, 1)',
      transition: { duration: 0.2, ease: 'easeOut' },
    },
    floating: {
      y: -3,
      scale: 0.96,
      color: isFocused ? '#0066FF' : 'rgba(71, 85, 105, 1)',
      transition: {
        type: 'spring',
        stiffness: 420,
        damping: 24,
      },
    },
  }), [isFocused]);

  // Left Icon Focus & Hover Color Tinting
  const iconFocusVariants: Variants = useMemo(() => ({
    unfocused: {
      color: 'rgba(148, 163, 184, 1)',
      scale: 1,
      transition: { duration: 0.2 },
    },
    focused: {
      color: '#0066FF',
      scale: 1.08,
      transition: { duration: 0.2, ease: 'easeOut' },
    },
    hover: {
      scale: 1.12,
      rotate: 4,
      transition: { duration: 0.25 },
    },
  }), []);

  // Clear 'X' Icon Fade & Pop Animation
  const clearButtonVariants: Variants = useMemo(() => ({
    hidden: { opacity: 0, scale: 0.6, rotate: -45 },
    visible: {
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: {
        type: 'spring',
        stiffness: 500,
        damping: 25,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.6,
      rotate: 45,
      transition: { duration: 0.15 },
    },
  }), []);

  // Character Counter Fade Animation
  const counterVariants: Variants = useMemo(() => ({
    hidden: { opacity: 0, y: 2 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  }), []);

  return {
    value,
    setValue,
    isFocused,
    hasValue,
    charCount,
    maxLength,
    handleFocus,
    handleBlur,
    handleChange,
    handleClear,
    springLabelVariants,
    iconFocusVariants,
    clearButtonVariants,
    counterVariants,
  };
}

export default useInputInteractions;
