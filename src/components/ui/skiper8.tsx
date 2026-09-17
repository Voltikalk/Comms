import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';

export interface Skiper8Props {
  words?: string[];
  onComplete?: () => void;
  speed?: number;
  firstWordDelay?: number;
  showDot?: boolean;
  className?: string;
  theme?: 'dark' | 'light' | 'auto';
  subtitle?: string;
}

const DEFAULT_WORDS = [
  'Привет',
  'Hello',
  'Bonjour',
  'Ciao',
  'Olà',
  'やあ',
  'Hallå',
  'Guten Tag',
  'Secure Comms',
];

const textOpacityVariants: Variants = {
  initial: {
    opacity: 0,
    y: 16,
    scale: 0.96,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.28,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
  exit: {
    opacity: 0,
    y: -16,
    scale: 0.96,
    transition: {
      duration: 0.22,
      ease: [0.7, 0, 0.84, 0] as [number, number, number, number],
    },
  },
};

const slideUpVariants: Variants = {
  initial: {
    top: 0,
  },
  exit: {
    top: '-100vh',
    transition: {
      duration: 0.85,
      ease: [0.76, 0, 0.24, 1] as [number, number, number, number],
      delay: 0.25,
    },
  },
};

/**
 * Skiper UI 08 - Words Preloader
 * Inspired by Dennis Snellenberg (dennissnellenberg.com) & Apple design language.
 * Features multilingual typography text reveals, live viewport SVG bezier curve morph,
 * and high-end cubic-bezier page exit transition.
 */
export const Skiper8: React.FC<Skiper8Props> = ({
  words = DEFAULT_WORDS,
  onComplete,
  speed = 170,
  firstWordDelay = 700,
  showDot = true,
  className = '',
  theme = 'dark',
  subtitle,
}) => {
  const [index, setIndex] = useState<number>(0);
  const [dimension, setDimension] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [isExiting, setIsExiting] = useState<boolean>(false);

  // Responsive dimension tracker
  useEffect(() => {
    const updateDimensions = () => {
      setDimension({
        width: typeof window !== 'undefined' ? window.innerWidth : 1920,
        height: typeof window !== 'undefined' ? window.innerHeight : 1080,
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Words cycling timer
  useEffect(() => {
    if (index === words.length - 1) {
      const exitTimer = setTimeout(() => {
        setIsExiting(true);
        if (onComplete) {
          // Trigger onComplete slightly after exit begins
          setTimeout(onComplete, 950);
        }
      }, 550);
      return () => clearTimeout(exitTimer);
    }

    const timer = setTimeout(
      () => {
        setIndex((prev) => prev + 1);
      },
      index === 0 ? firstWordDelay : speed
    );

    return () => clearTimeout(timer);
  }, [index, words.length, firstWordDelay, speed, onComplete]);

  const width = dimension.width || (typeof window !== 'undefined' ? window.innerWidth : 1920);
  const height = dimension.height || (typeof window !== 'undefined' ? window.innerHeight : 1080);

  // Dennis Snellenberg curved SVG bezier path calculation
  const initialPath = `M0 0 L${width} 0 L${width} ${height} Q${width / 2} ${height + 300} 0 ${height} L0 0`;
  const targetPath = `M0 0 L${width} 0 L${width} ${height} Q${width / 2} ${height} 0 ${height} L0 0`;

  const curveVariants: Variants = {
    initial: {
      d: initialPath,
      transition: { duration: 0.7, ease: [0.76, 0, 0.24, 1] as [number, number, number, number] },
    },
    exit: {
      d: targetPath,
      transition: { duration: 0.7, ease: [0.76, 0, 0.24, 1] as [number, number, number, number], delay: 0.3 },
    },
  };

  const bgColor =
    theme === 'light'
      ? '#f8fafc'
      : '#0a0e17'; // Deep Telegram space navy / obsidian black

  return (
    <AnimatePresence mode="wait">
      {!isExiting && (
        <motion.div
          key="skiper8-words-preloader"
          variants={slideUpVariants}
          initial="initial"
          exit="exit"
          className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center cursor-wait select-none overflow-hidden ${className}`}
          style={{ backgroundColor: bgColor }}
          aria-live="polite"
          aria-busy="true"
        >
          {width > 0 && (
            <>
              {/* Words Text Reveal Centerpiece */}
              <div className="relative z-10 flex flex-col items-center justify-center px-4">
                <div className="flex items-center gap-3 sm:gap-4.5">
                  {showDot && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: [1, 1.25, 1], opacity: 1 }}
                      transition={{
                        scale: { repeat: Infinity, duration: 1.8, ease: 'easeInOut' },
                        opacity: { duration: 0.3 },
                      }}
                      className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full bg-[#3390EC] shadow-[0_0_12px_#3390EC]"
                      aria-hidden="true"
                    />
                  )}

                  <AnimatePresence mode="wait">
                    <motion.h2
                      key={`word-${index}-${words[index]}`}
                      variants={textOpacityVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="text-3xl sm:text-5xl md:text-6xl font-bold font-heading tracking-tight text-white flex items-center"
                    >
                      <span className="bg-gradient-to-r from-white via-slate-100 to-white/70 bg-clip-text text-transparent">
                        {words[index]}
                      </span>
                    </motion.h2>
                  </AnimatePresence>
                </div>

                {subtitle && (
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 0.6, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    className="mt-3 text-xs sm:text-sm font-medium text-slate-400 tracking-wider uppercase font-mono"
                  >
                    {subtitle}
                  </motion.p>
                )}
              </div>

              {/* Liquid Curved Bottom Morph SVG */}
              <svg
                className="absolute top-0 left-0 w-full pointer-events-none"
                style={{ height: `calc(100% + 300px)` }}
                preserveAspectRatio="none"
                viewBox={`0 0 ${width} ${height + 300}`}
              >
                <motion.path
                  variants={curveVariants}
                  initial="initial"
                  exit="exit"
                  fill={bgColor}
                />
              </svg>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const WordsPreloader = Skiper8;
export default Skiper8;
