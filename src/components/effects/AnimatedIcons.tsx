import React from 'react';
import { motion } from 'framer-motion';

/**
 * 1. Animated Lock Icon with 360-degree spin on loading / hover
 */
export interface AnimatedLockIconProps {
  isSpinning?: boolean;
  className?: string;
  size?: number;
}

export const AnimatedLockIcon: React.FC<AnimatedLockIconProps> = ({
  isSpinning = false,
  className = 'w-7 h-7 text-white',
  size = 28,
}) => {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      animate={isSpinning ? { rotate: 360 } : { rotate: 0 }}
      transition={isSpinning ? { duration: 0.6, repeat: Infinity, ease: 'linear' } : { duration: 0.3 }}
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </motion.svg>
  );
};

/**
 * 2. Animated Checkmark with SVG Path Drawing Animation (stroke-dasharray)
 */
export interface AnimatedCheckmarkProps {
  className?: string;
  size?: number;
}

export const AnimatedCheckmark: React.FC<AnimatedCheckmarkProps> = ({
  className = 'w-4 h-4 text-[#00D084]',
  size = 16,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" className="opacity-30" />
      <motion.path
        d="m8 12 3 3 5-6"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
      />
    </svg>
  );
};

/**
 * 3. Animated Error X Icon with Shake Effect
 */
export interface AnimatedErrorIconProps {
  className?: string;
  size?: number;
}

export const AnimatedErrorIcon: React.FC<AnimatedErrorIconProps> = ({
  className = 'w-4 h-4 text-[#FF3333]',
  size = 16,
}) => {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      initial={{ scale: 0.7, rotate: -15 }}
      animate={{ scale: 1, rotate: [0, -6, 6, -4, 4, 0] }}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
    >
      <circle cx="12" cy="12" r="10" className="opacity-30" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </motion.svg>
  );
};

/**
 * 4. Subtle Web Audio Feedback (Success & Error chimes)
 */
export const playUISound = (type: 'success' | 'error' | 'click') => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'success') {
      // Pleasant upward dual-chime
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc1.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      osc2.frequency.setValueAtTime(783.99, ctx.currentTime + 0.08); // G5
      osc2.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.22); // C6

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime + 0.08);
      osc1.stop(ctx.currentTime + 0.28);
      osc2.stop(ctx.currentTime + 0.28);
      osc2.onended = () => ctx.close();
    } else if (type === 'error') {
      // Soft low buzz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.18);
      osc.onended = () => ctx.close();
    } else {
      // Click tactile pop
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.04, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
      osc.onended = () => ctx.close();
    }
  } catch {
    // Ignore audio errors if context blocked
  }
};
