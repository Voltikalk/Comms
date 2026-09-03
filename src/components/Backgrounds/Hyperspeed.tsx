import React, { useRef, useEffect } from 'react';

export interface HyperspeedProps {
  speed?: number;
  starCount?: number;
  starColor?: string;
  streakLength?: number;
  className?: string;
}

interface Star {
  x: number;
  y: number;
  z: number;
  pz: number;
}

export const Hyperspeed: React.FC<HyperspeedProps> = ({
  speed = 15,
  starCount = 400,
  starColor = '#3390ec',
  streakLength = 2.5,
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

    const stars: Star[] = [];
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: (Math.random() - 0.5) * width * 2,
        y: (Math.random() - 0.5) * height * 2,
        z: Math.random() * width,
        pz: width,
      });
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };

    window.addEventListener('resize', handleResize);

    let animationId: number;

    const render = () => {
      ctx.fillStyle = '#070a12';
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        star.pz = star.z;
        star.z -= speed;

        if (star.z <= 0) {
          star.z = width;
          star.pz = width;
          star.x = (Math.random() - 0.5) * width * 2;
          star.y = (Math.random() - 0.5) * height * 2;
        }

        const sx = (star.x / star.z) * cx + cx;
        const sy = (star.y / star.z) * cy + cy;

        const psx = (star.x / star.pz) * cx + cx;
        const psy = (star.y / star.pz) * cy + cy;

        const radius = Math.max(0.5, (1 - star.z / width) * 2.5);

        ctx.beginPath();
        ctx.moveTo(psx, psy);
        ctx.lineTo(sx * streakLength - psx * (streakLength - 1), sy * streakLength - psy * (streakLength - 1));
        ctx.strokeStyle = starColor;
        ctx.lineWidth = radius;
        ctx.stroke();
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, [speed, starCount, starColor, streakLength]);

  return <canvas ref={canvasRef} className={`w-full h-full block ${className}`} />;
};
