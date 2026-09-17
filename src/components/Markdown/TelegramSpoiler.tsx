import React, { useState, useRef, useEffect, useId } from 'react';

export interface TelegramSpoilerProps {
  children: React.ReactNode;
  className?: string;
}

export const TelegramSpoiler: React.FC<TelegramSpoilerProps> = ({ children, className = '' }) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const spoilerId = useId();

  useEffect(() => {
    if (isRevealed) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.offsetWidth || 100);
    let height = (canvas.height = canvas.offsetHeight || 20);

    // Particle-based shimmering noise
    const particlesCount = Math.max(30, Math.floor((width * height) / 18));
    const particles = Array.from({ length: particlesCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 1,
      alpha: Math.random() * 0.7 + 0.3,
      speed: (Math.random() - 0.5) * 0.8,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
    }));

    let isMounted = true;

    const render = () => {
      if (!isMounted || !ctx) return;

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width !== width || rect.height !== height) {
          width = canvas.width = Math.max(20, Math.floor(rect.width));
          height = canvas.height = Math.max(16, Math.floor(rect.height));
        }
      }

      ctx.clearRect(0, 0, width, height);

      // Shimmer background layer
      ctx.fillStyle = 'rgba(120, 140, 160, 0.45)';
      ctx.fillRect(0, 0, width, height);

      // Draw sparkling particle dust
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x = (p.x + p.vx + width) % width;
        p.y = (p.y + p.vy + height) % height;
        p.alpha += (Math.random() - 0.5) * 0.1;
        p.alpha = Math.max(0.2, Math.min(0.9, p.alpha));

        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      isMounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRevealed]);

  const handleReveal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRevealed) return;
    setIsAnimating(true);
    setTimeout(() => {
      setIsRevealed(true);
      setIsAnimating(false);
    }, 280);
  };

  return (
    <span
      ref={containerRef}
      id={`spoiler-${spoilerId}`}
      onClick={handleReveal}
      title={isRevealed ? '' : 'Нажмите, чтобы показать спойлер'}
      className={`relative inline-flex items-center align-baseline rounded-[5px] transition-all duration-300 ${
        isRevealed
          ? 'cursor-text select-text bg-transparent'
          : 'cursor-pointer select-none overflow-hidden bg-slate-700/40 dark:bg-slate-300/20 backdrop-blur-xs hover:brightness-110 active:scale-[0.98]'
      } ${isAnimating ? 'animate-spoiler-burst' : ''} ${className}`}
    >
      {!isRevealed && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none rounded-[5px] z-10 opacity-90 mix-blend-screen"
        />
      )}
      <span
        className={`transition-all duration-300 ${
          isRevealed
            ? 'opacity-100 blur-0'
            : 'opacity-0 filter blur-[6px] pointer-events-none'
        }`}
      >
        {children}
      </span>
    </span>
  );
};
