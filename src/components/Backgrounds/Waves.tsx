import React, { useRef, useEffect } from 'react';

export interface WavesProps {
  lineColor?: string;
  waveSpeedX?: number;
  waveSpeedY?: number;
  waveAmpX?: number;
  waveAmpY?: number;
  xGap?: number;
  yGap?: number;
  className?: string;
}

export const Waves: React.FC<WavesProps> = ({
  lineColor = 'rgba(51, 144, 236, 0.25)',
  waveSpeedX = 0.015,
  waveSpeedY = 0.01,
  waveAmpX = 35,
  waveAmpY = 20,
  xGap = 12,
  yGap = 32,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resizeCanvas = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    let animationId: number;

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      timeRef.current += 1;
      const t = timeRef.current;

      const lines = Math.ceil(height / yGap) + 4;

      for (let i = 0; i < lines; i++) {
        ctx.beginPath();
        const yBase = i * yGap;

        for (let x = 0; x <= width + xGap; x += xGap) {
          const wave1 = Math.sin(x * 0.005 + t * waveSpeedX + i * 0.3) * waveAmpX;
          const wave2 = Math.cos(x * 0.003 - t * waveSpeedY + i * 0.2) * waveAmpY;
          const y = yBase + wave1 + wave2;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, [lineColor, waveSpeedX, waveSpeedY, waveAmpX, waveAmpY, xGap, yGap]);

  return <canvas ref={canvasRef} className={`w-full h-full block pointer-events-none ${className}`} />;
};
