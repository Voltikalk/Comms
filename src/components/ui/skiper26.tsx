import React, { useCallback } from 'react';
import { motion } from 'framer-motion';

export type AnimationVariant =
  | 'circle'
  | 'rectangle'
  | 'polygon'
  | 'circle-blur';

export type AnimationStart =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'center'
  | 'top-center'
  | 'bottom-center'
  | 'bottom-up'
  | 'top-down'
  | 'left-right'
  | 'right-left';

interface ThemeToggleProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
  className?: string;
  variant?: AnimationVariant;
  start?: AnimationStart;
  blur?: boolean;
}

const STYLE_ID = 'skiper26-theme-transition-styles';

export const createAnimation = (
  variant: AnimationVariant = 'circle',
  start: AnimationStart = 'top-right',
  blur = false,
  clickCoords?: { x: number; y: number }
) => {
  let clipFrom = 'circle(0% at 90% 10%)';
  let clipTo = 'circle(150% at 90% 10%)';

  if (clickCoords && typeof window !== 'undefined') {
    const xPct = ((clickCoords.x / window.innerWidth) * 100).toFixed(1);
    const yPct = ((clickCoords.y / window.innerHeight) * 100).toFixed(1);
    clipFrom = `circle(0% at ${xPct}% ${yPct}%)`;
    clipTo = `circle(150% at ${xPct}% ${yPct}%)`;
  } else if (start === 'center') {
    clipFrom = 'circle(0% at 50% 50%)';
    clipTo = 'circle(150% at 50% 50%)';
  } else if (start === 'top-right') {
    clipFrom = 'circle(0% at 95% 5%)';
    clipTo = 'circle(150% at 95% 5%)';
  } else if (start === 'top-left') {
    clipFrom = 'circle(0% at 5% 5%)';
    clipTo = 'circle(150% at 5% 5%)';
  }

  const css = `
    ::view-transition-group(root) {
      animation-duration: 1.15s;
      animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
    }
    ::view-transition-new(root) {
      animation-name: skiper26-reveal-new${blur ? '-blur' : ''};
      ${blur ? 'filter: blur(2px);' : ''}
    }
    ::view-transition-old(root),
    .dark::view-transition-old(root) {
      animation: none;
      z-index: -1;
    }
    .dark::view-transition-new(root) {
      animation-name: skiper26-reveal-dark${blur ? '-blur' : ''};
      ${blur ? 'filter: blur(2px);' : ''}
    }
    @keyframes skiper26-reveal-dark${blur ? '-blur' : ''} {
      from {
        clip-path: ${clipFrom};
        ${blur ? 'filter: blur(8px);' : ''}
      }
      to {
        clip-path: ${clipTo};
        ${blur ? 'filter: blur(0px);' : ''}
      }
    }
    @keyframes skiper26-reveal-new${blur ? '-blur' : ''} {
      from {
        clip-path: ${clipFrom};
        ${blur ? 'filter: blur(8px);' : ''}
      }
      to {
        clip-path: ${clipTo};
        ${blur ? 'filter: blur(0px);' : ''}
      }
    }
  `;

  return { name: `skiper26-${variant}-${start}`, css };
};

export const Skiper26ThemeToggle: React.FC<ThemeToggleProps> = ({
  darkMode,
  toggleDarkMode,
  className = '',
  variant = 'circle',
  start = 'top-right',
  blur = false
}) => {
  const rawId = React.useId();
  const clipId = `skiper-btn-2-${rawId.replace(/:/g, '')}`;

  const updateStyles = useCallback((css: string) => {
    if (typeof window === 'undefined') return;
    let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = STYLE_ID;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
  }, []);

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const coords = { x: e.clientX, y: e.clientY };
    const animation = createAnimation(variant, start, blur, coords);
    updateStyles(animation.css);

    // Use native View Transitions API if supported for super smooth circular reveal
    const doc = document as any;
    if (typeof doc.startViewTransition === 'function') {
      doc.startViewTransition(() => {
        toggleDarkMode();
      });
    } else {
      toggleDarkMode();
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center transition-all duration-300 active:scale-90 hover:scale-105 cursor-pointer shadow-sm ${
        darkMode 
          ? 'bg-white/10 hover:bg-white/20 text-amber-300 border border-white/10' 
          : 'bg-black/5 hover:bg-black/10 text-amber-500 hover:text-amber-600 border border-slate-200'
      } ${className}`}
      title={darkMode ? 'Включить светлую тему' : 'Включить темную тему'}
      aria-label="Toggle theme"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        fill="currentColor"
        strokeLinecap="round"
        viewBox="0 0 32 32"
        className="w-5 h-5 sm:w-5.5 sm:h-5.5"
      >
        <clipPath id={clipId}>
          <motion.path
            animate={{ y: darkMode ? 10 : 0, x: darkMode ? -12 : 0 }}
            transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.65 }}
            d="M0-5h30a1 1 0 0 0 9 13v24H0Z"
          />
        </clipPath>
        <g clipPath={`url(#${clipId})`}>
          <motion.circle
            r={darkMode ? 10 : 8}
            initial={{ r: darkMode ? 10 : 8 }}
            animate={{ r: darkMode ? 10 : 8 }}
            transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.65 }}
            cx="16"
            cy="16"
          />
          <motion.g
            animate={{
              rotate: darkMode ? -100 : 0,
              scale: darkMode ? 0.5 : 1,
              opacity: darkMode ? 0 : 1,
            }}
            transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.65 }}
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M16 5.5v-4" />
            <path d="M16 30.5v-4" />
            <path d="M1.5 16h4" />
            <path d="M26.5 16h4" />
            <path d="m23.4 8.6 2.8-2.8" />
            <path d="m5.7 26.3 2.9-2.9" />
            <path d="m5.8 5.8 2.8 2.8" />
            <path d="m23.4 23.4 2.9 2.9" />
          </motion.g>
        </g>
      </svg>
    </button>
  );
};

export default Skiper26ThemeToggle;
