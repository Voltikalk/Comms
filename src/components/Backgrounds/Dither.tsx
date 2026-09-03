import React, { useRef, useEffect } from 'react';

export interface DitherProps {
  waveSpeed?: number;
  waveFrequency?: number;
  waveAmplitude?: number;
  colorA?: string;
  colorB?: string;
  className?: string;
}

export const Dither: React.FC<DitherProps> = ({
  waveSpeed = 0.03,
  waveFrequency = 0.02,
  waveAmplitude = 25,
  colorA = '#0f172a',
  colorB = '#3390ec',
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = Math.floor(canvas.offsetWidth / 2));
    let height = (canvas.height = Math.floor(canvas.offsetHeight / 2));

    const resizeCanvas = () => {
      if (!canvas) return;
      width = canvas.width = Math.floor(canvas.offsetWidth / 2);
      height = canvas.height = Math.floor(canvas.offsetHeight / 2);
    };

    window.addEventListener('resize', resizeCanvas);

    let animationId: number;

    const render = () => {
      timeRef.current += waveSpeed;
      const t = timeRef.current;

      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, colorA);
      gradient.addColorStop(0.5 + Math.sin(t) * 0.2, colorB);
      gradient.addColorStop(1, colorA);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Procedural wave distortion rings
      ctx.fillStyle = colorB;
      ctx.globalAlpha = 0.15;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        const r = ((t * 20 + i * 40) % Math.max(width, height));
        ctx.arc(width / 2 + Math.sin(t + i) * waveAmplitude, height / 2 + Math.cos(t + i) * waveAmplitude, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, [waveSpeed, waveFrequency, waveAmplitude, colorA, colorB]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full block pointer-events-none filter blur-[40px] opacity-80 ${className}`}
    />
  );
};
