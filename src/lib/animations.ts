import type { Variants, Transition } from 'framer-motion';
import gsap from 'gsap';
import AOS from 'aos';
import lottie, { type AnimationItem } from 'lottie-web';

/* ==========================================================================
   1. Framer Motion Spring & Transition Presets
   ========================================================================== */

export const SPRING_TRANSITION: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 24,
};

export const SMOOTH_TRANSITION: Transition = {
  duration: 0.35,
  ease: [0.4, 0, 0.2, 1],
};

export const FADE_IN_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
  exit: { opacity: 0, y: -10, transition: { duration: 0.25 } },
};

export const SCALE_SPRING_VARIANTS: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 450, damping: 22 },
  },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

export const BUTTON_INTERACTION_VARIANTS: Variants = {
  idle: { scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.2, ease: 'easeOut' } },
  tap: { scale: 0.98, transition: { duration: 0.1, ease: 'easeIn' } },
};

/* ==========================================================================
   2. GSAP (GreenSock Animation Platform) Helpers
   ========================================================================== */

/**
 * Animate floating ambient background spheres smoothly with GSAP
 */
export function animateFloatingSpheres(targets: string | Element | Element[]) {
  return gsap.to(targets, {
    y: '+=25',
    x: '+=15',
    rotation: 6,
    duration: 6,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
    stagger: 1.5,
  });
}

/**
 * Staggered fade in for lists or cards with GSAP
 */
export function gsapStaggerFadeIn(targets: string | Element | Element[], stagger = 0.08) {
  return gsap.from(targets, {
    opacity: 0,
    y: 20,
    duration: 0.6,
    stagger,
    ease: 'power3.out',
  });
}

/* ==========================================================================
   3. AOS (Animate On Scroll) Integration
   ========================================================================== */

/**
 * Initialize AOS for responsive scroll animations
 */
export function initAOS(options: AOS.AosOptions = {}) {
  if (typeof window === 'undefined') return;

  AOS.init({
    duration: 600,
    easing: 'ease-out-cubic',
    once: true,
    offset: 40,
    ...options,
  });
}

/* ==========================================================================
   4. Lottie Web Animation Helper
   ========================================================================== */

export interface LottieConfig {
  container: HTMLElement;
  animationData?: any;
  path?: string;
  loop?: boolean;
  autoplay?: boolean;
}

/**
 * Helper to mount a Lottie vector animation inside any DOM element
 */
export function renderLottieAnimation(config: LottieConfig): AnimationItem {
  return lottie.loadAnimation({
    container: config.container,
    renderer: 'svg',
    loop: config.loop ?? true,
    autoplay: config.autoplay ?? true,
    animationData: config.animationData,
    path: config.path,
  });
}

export default {
  SPRING_TRANSITION,
  SMOOTH_TRANSITION,
  FADE_IN_VARIANTS,
  SCALE_SPRING_VARIANTS,
  BUTTON_INTERACTION_VARIANTS,
  animateFloatingSpheres,
  gsapStaggerFadeIn,
  initAOS,
  renderLottieAnimation,
};
