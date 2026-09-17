'use client';
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';

const opacity: Variants = {
  initial: {
    opacity: 0,
  },
  enter: {
    opacity: 0.75,
    transition: { duration: 1, delay: 0.2 },
  },
};

const slideUp: Variants = {
  initial: {
    top: 0,
  },
  exit: {
    top: '-100vh',
    transition: {
      duration: 0.8,
      ease: [0.76, 0, 0.24, 1] as [number, number, number, number],
      delay: 0.2,
    },
  },
};

export interface Skiper8Props {
  words?: string[];
  onComplete?: () => void;
  className?: string;
}

const DEFAULT_WORDS = [
  'Hello',
  'Bonjour',
  'Ciao',
  'Olà',
  'やあ',
  'Hallå',
  'Guten tag',
  'Hallo',
];

/**
 * Skiper UI 08 - Words Preloader
 * 1:1 Authentic Recreation of Dennis Snellenberg (dennissnellenberg.com) & Olivier Larose preloader.
 * Features exact typography (42px, white dot indicator, 0.75 opacity), rapid word sequence,
 * SVG quadratic bezier curved bottom pull-up, and cubic-bezier(0.76, 0, 0.24, 1) exit.
 */
export const Skiper8: React.FC<Skiper8Props> = ({
  words = DEFAULT_WORDS,
  onComplete,
  className = '',
}) => {
  const [index, setIndex] = useState(0);
  const [dimension, setDimension] = useState({ width: 0, height: 0 });
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    setDimension({ width: window.innerWidth, height: window.innerHeight });

    const handleResize = () => {
      setDimension({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (index === words.length - 1) return;
    const timer = setTimeout(
      () => {
        setIndex(index + 1);
      },
      index === 0 ? 1000 : 150
    );
    return () => clearTimeout(timer);
  }, [index, words.length]);

  useEffect(() => {
    // Total duration before curved slide-up exit starts:
    // 1000ms (first word) + 150ms per subsequent word + 350ms pause on last word
    const totalDuration = 1000 + (words.length - 1) * 150 + 350;
    const timer = setTimeout(() => {
      setIsActive(false);
    }, totalDuration);

    return () => clearTimeout(timer);
  }, [words.length]);

  const initialPath = `M0 0 L${dimension.width} 0 L${dimension.width} ${dimension.height} Q${dimension.width / 2} ${dimension.height + 300} 0 ${dimension.height}  L0 0`;
  const targetPath = `M0 0 L${dimension.width} 0 L${dimension.width} ${dimension.height} Q${dimension.width / 2} ${dimension.height} 0 ${dimension.height}  L0 0`;

  const curve: Variants = {
    initial: {
      d: initialPath,
      transition: {
        duration: 0.7,
        ease: [0.76, 0, 0.24, 1] as [number, number, number, number],
      },
    },
    exit: {
      d: targetPath,
      transition: {
        duration: 0.7,
        ease: [0.76, 0, 0.24, 1] as [number, number, number, number],
        delay: 0.3,
      },
    },
  };

  return (
    <AnimatePresence mode="wait" onExitComplete={onComplete}>
      {isActive && (
        <motion.div
          variants={slideUp}
          initial="initial"
          exit="exit"
          className={`h-screen w-screen flex items-center justify-center fixed top-0 left-0 z-[9999] bg-[#141516] select-none ${className}`}
        >
          {dimension.width > 0 && (
            <>
              <motion.p
                variants={opacity}
                initial="initial"
                animate="enter"
                className="flex text-white text-[32px] sm:text-[42px] items-center absolute z-[1] font-normal tracking-normal select-none pointer-events-none leading-none"
              >
                <span className="block w-[10px] h-[10px] bg-white rounded-full mr-[10px] shrink-0" />
                {words[index]}
              </motion.p>
              <svg className="absolute top-0 w-full h-[calc(100%+300px)] pointer-events-none">
                <motion.path
                  variants={curve}
                  initial="initial"
                  exit="exit"
                  fill="#141516"
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
