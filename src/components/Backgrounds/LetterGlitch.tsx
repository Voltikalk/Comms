import React, { useRef, useEffect } from 'react';

export interface LetterGlitchProps {
  glitchColors?: string[];
  glitchSpeed?: number;
  centerVignette?: boolean;
  outerVignette?: boolean;
  smooth?: boolean;
  characters?: string;
  className?: string;
}

export const LetterGlitch: React.FC<LetterGlitchProps> = ({
  glitchColors = ['#2b4539', '#61dca3', '#61b3dc'],
  glitchSpeed = 50,
  centerVignette = false,
  outerVignette = true,
  smooth = true,
  characters = '0123456789ABCDEF!@#$%&*+-=<>~',
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);
    const fontSize = 16;
    let cols = Math.floor(width / fontSize);
    let rows = Math.floor(height / fontSize);

    const grid: { char: string; color: string }[][] = [];
    const charList = characters.split('');

    const getRandomChar = () => charList[Math.floor(Math.random() * charList.length)];
    const getRandomColor = () => glitchColors[Math.floor(Math.random() * glitchColors.length)];

    for (let r = 0; r < rows; r++) {
      grid[r] = [];
      for (let c = 0; c < cols; c++) {
        grid[r][c] = {
          char: getRandomChar(),
          color: getRandomColor(),
        };
      }
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
      cols = Math.floor(width / fontSize);
      rows = Math.floor(height / fontSize);
    };

    window.addEventListener('resize', handleResize);

    const interval = setInterval(() => {
      // Glitch random cells
      const changesPerFrame = Math.floor((cols * rows) * 0.05);
      for (let i = 0; i < changesPerFrame; i++) {
        const r = Math.floor(Math.random() * rows);
        const c = Math.floor(Math.random() * cols);
        if (grid[r] && grid[r][c]) {
          grid[r][c].char = getRandomChar();
          grid[r][c].color = getRandomColor();
        }
      }

      ctx.fillStyle = '#0a0d14';
      ctx.fillRect(0, 0, width, height);

      ctx.font = `${fontSize - 2}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r] && grid[r][c]) {
            ctx.fillStyle = grid[r][c].color;
            ctx.fillText(grid[r][c].char, c * fontSize + fontSize / 2, r * fontSize + fontSize / 2);
          }
        }
      }

      // Vignette effects
      if (outerVignette) {
        const gradient = ctx.createRadialGradient(
          width / 2,
          height / 2,
          Math.min(width, height) * 0.3,
          width / 2,
          height / 2,
          Math.max(width, height) * 0.7
        );
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, '#000000d0');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }
    }, glitchSpeed);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(interval);
    };
  }, [glitchColors, glitchSpeed, centerVignette, outerVignette, smooth, characters]);

  return <canvas ref={canvasRef} className={`w-full h-full block ${className}`} />;
};
