import { useState, useCallback, useMemo } from 'react';
import type { Variants } from 'framer-motion';

export interface RippleData {
  id: number;
  x: number;
  y: number;
  size: number;
}

/**
 * Custom hook providing rich micro-interactions and ripple effects for buttons
 */
export function useButtonAnimation() {
  const [ripples, setRipples] = useState<RippleData[]>([]);

  const createRipple = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    const newRipple: RippleData = {
      id: Date.now() + Math.random(),
      x,
      y,
      size,
    };

    setRipples((prev) => [...prev, newRipple]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);
  }, []);

  const buttonVariants: Variants = useMemo(() => ({
    idle: {
      scale: 1,
      transition: { duration: 0.2, ease: 'easeOut' },
    },
    hover: {
      scale: 1.02,
      transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
    },
    tap: {
      scale: 0.98,
      transition: { duration: 0.1, ease: 'easeIn' },
    },
    disabled: {
      scale: 1,
      opacity: 0.55,
      transition: { duration: 0.2 },
    },
  }), []);

  const socialButtonVariants: Variants = useMemo(() => ({
    idle: {
      scale: 1,
      y: 0,
      transition: { duration: 0.2 },
    },
    hover: {
      scale: 1.06,
      y: -2,
      transition: { duration: 0.25, ease: [0.34, 1.56, 0.64, 1] },
    },
    tap: {
      scale: 0.95,
      y: 0,
      transition: { duration: 0.1 },
    },
  }), []);

  return {
    ripples,
    createRipple,
    buttonVariants,
    socialButtonVariants,
  };
}

export default useButtonAnimation;
