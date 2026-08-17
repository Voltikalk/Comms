import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Variants } from 'framer-motion';

export interface FieldValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (val: string) => string | null;
  message?: string;
}

/**
 * Hook for real-time validation micro-interactions, spring checkmarks, and 5s auto-hiding error alerts
 */
export function useFormValidation() {
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Auto-hide error alert after 5 seconds
  useEffect(() => {
    if (!globalError) return;

    const timer = setTimeout(() => {
      setGlobalError(null);
    }, 5000);

    return () => clearTimeout(timer);
  }, [globalError]);

  const setError = useCallback((error: string | null) => {
    setGlobalError(error);
  }, []);

  const clearError = useCallback(() => {
    setGlobalError(null);
  }, []);

  // Slide-down and fade-in/out error banner variants
  const errorBannerVariants: Variants = useMemo(() => ({
    hidden: {
      opacity: 0,
      y: -12,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 25,
      },
    },
    exit: {
      opacity: 0,
      y: -8,
      scale: 0.96,
      transition: { duration: 0.3, ease: 'easeIn' },
    },
  }), []);

  // Spring Validation Checkmark Animation (scale 0 -> 1 with spring bounce)
  const springCheckmarkVariants: Variants = useMemo(() => ({
    hidden: { scale: 0, opacity: 0, rotate: -45 },
    visible: {
      scale: 1,
      opacity: 1,
      rotate: 0,
      transition: {
        type: 'spring',
        stiffness: 450,
        damping: 20,
      },
    },
  }), []);

  // Tooltip Slide-up Micro-interaction
  const tooltipSlideUpVariants: Variants = useMemo(() => ({
    hidden: { opacity: 0, y: 6, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
    },
    exit: { opacity: 0, y: 4, transition: { duration: 0.15 } },
  }), []);

  return {
    globalError,
    setError,
    clearError,
    errorBannerVariants,
    springCheckmarkVariants,
    tooltipSlideUpVariants,
  };
}

export default useFormValidation;
