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
