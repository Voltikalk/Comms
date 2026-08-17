import { useState, useCallback, useMemo } from 'react';
import type { Variants } from 'framer-motion';

export type SubmissionStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Hook for animated tab switching, eye rotation tilt, and submission success transitions
 */
export function useToggleAnimation() {
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>('idle');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // Toggle password visibility with rotational tilt
  const togglePasswordVisibility = useCallback(() => {
    setIsPasswordVisible((prev) => !prev);
  }, []);

  // Eye icon tilt variants (rotate -10 -> 10 -> 0)
  const eyeIconVariants: Variants = useMemo(() => ({
    hidden: {
      rotate: 0,
      scale: 1,
    },
    visible: {
      rotate: [0, -10, 10, 0],
      scale: [1, 1.15, 1],
      transition: {
        duration: 0.3,
        ease: 'easeInOut',
      },
    },
  }), []);

  // Success Button morph transition (turns green with checkmark)
  const submitButtonVariants: Variants = useMemo(() => ({
    idle: {
      backgroundColor: undefined,
      scale: 1,
      transition: { duration: 0.2 },
    },
    loading: {
      scale: 0.99,
      transition: { duration: 0.2 },
    },
    success: {
      backgroundColor: '#00D084',
      scale: [1, 1.03, 1],
      boxShadow: '0 8px 25px rgba(0, 208, 132, 0.45)',
      transition: {
        duration: 0.35,
        ease: [0.34, 1.56, 0.64, 1],
      },
    },
    error: {
      backgroundColor: '#FF3333',
      x: [0, -6, 6, -4, 4, 0],
      transition: { duration: 0.35 },
    },
  }), []);

  const setStatus = useCallback((status: SubmissionStatus) => {
    setSubmissionStatus(status);
  }, []);

  return {
    submissionStatus,
    setStatus,
    isPasswordVisible,
    togglePasswordVisibility,
    eyeIconVariants,
    submitButtonVariants,
  };
}

export default useToggleAnimation;
