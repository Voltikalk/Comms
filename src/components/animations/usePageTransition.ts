import { useMemo } from 'react';
import type { Variants, Transition } from 'framer-motion';

/**
 * Custom hook providing Framer Motion animation configurations for pages, cards, and tab switches
 */
export function usePageTransition() {
  const smoothTransition: Transition = useMemo(() => ({
    duration: 0.4,
    ease: [0.4, 0, 0.2, 1],
  }), []);

  const pageVariants: Variants = useMemo(() => ({
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: 'easeOut',
      },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.3, ease: 'easeIn' },
    },
  }), []);

  const cardVariants: Variants = useMemo(() => ({
    hidden: {
      opacity: 0,
      scale: 0.95,
      y: 16,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1],
        delay: 0.05,
      },
    },
  }), []);

  const tabSlideVariants: Variants = useMemo(() => ({
    enter: (direction: number) => ({
      x: direction > 0 ? 35 : -35,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.35,
        ease: [0.4, 0, 0.2, 1],
      },
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 35 : -35,
      opacity: 0,
      transition: {
        duration: 0.25,
        ease: [0.4, 0, 1, 1],
      },
    }),
  }), []);

  const feedbackVariants: Variants = useMemo(() => ({
    hidden: { opacity: 0, y: -6, scale: 0.96 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: [0.34, 1.56, 0.64, 1],
      },
    },
    exit: { opacity: 0, y: -4, transition: { duration: 0.2 } },
  }), []);

  return {
    pageVariants,
    cardVariants,
    tabSlideVariants,
    feedbackVariants,
    smoothTransition,
  };
}

export default usePageTransition;
