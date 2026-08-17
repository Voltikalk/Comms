import { useState, useCallback, useMemo } from 'react';
import type { Variants } from 'framer-motion';

export interface UseInputAnimationOptions {
  initialValue?: string;
  hasError?: boolean;
}

/**
 * Custom hook providing animations for interactive input fields
 */
export function useInputAnimation(options: UseInputAnimationOptions = {}) {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hasValue, setHasValue] = useState(Boolean(options.initialValue));

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    setHasValue(Boolean(e.target.value));
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setHasValue(Boolean(e.target.value));
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // Icon Hover Rotation Animation Variants (rotate: 5deg, 0.3s)
  const iconVariants: Variants = useMemo(() => ({
    idle: {
      rotate: 0,
      scale: 1,
      transition: { duration: 0.3, ease: 'easeOut' },
    },
    hovered: {
      rotate: 5,
      scale: 1.08,
      transition: { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] },
    },
    focused: {
      rotate: 0,
      scale: 1.1,
      transition: { duration: 0.2, ease: 'easeOut' },
    },
  }), []);

  // Floating label animation variants
  const labelVariants: Variants = useMemo(() => ({
    default: {
      y: 0,
      scale: 1,
      color: 'rgba(100, 116, 139, 1)',
      transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
    },
    floating: {
      y: -2,
      scale: 0.98,
      color: '#0066FF',
      transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
    },
  }), []);

  // Error Shake Variants
  const errorShakeVariants: Variants = useMemo(() => ({
    initial: { x: 0, opacity: 0 },
    animate: {
      x: [0, -6, 6, -5, 5, -2, 2, 0],
      opacity: 1,
      transition: { duration: 0.35, ease: 'easeInOut' },
    },
    exit: { opacity: 0, y: -4, transition: { duration: 0.2 } },
  }), []);

  return {
    isFocused,
    isHovered,
    hasValue,
    handleFocus,
    handleBlur,
    handleChange,
    handleMouseEnter,
    handleMouseLeave,
    iconVariants,
    labelVariants,
    errorShakeVariants,
  };
}

export default useInputAnimation;
