import { useEffect, useRef } from 'react';

export interface ParticleOptions {
  particleCount?: number;
  maxDistance?: number;
  speed?: number;
  colors?: string[];
  connectLines?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
}

const DEFAULT_COLORS = ['#0066FF', '#9933FF', '#00D084'];

/**
 * Mobile-optimized High-performance Canvas Particle System hook
 * - Adaptive particle count based on screen size (saves mobile battery)
 * - Automatically respects prefers-reduced-motion
 * - Zero re-initialization during parent re-renders
 */
export function useParticles(options: ParticleOptions = {}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    // 1. Accessibility Check: Skip heavy loop if user requested reduced motion
    const prefersReducedMotion = typeof window !== 'undefined' && 
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const currentOpts = optionsRef.current;
    const isMobile = window.innerWidth < 640;
    const baseCount = isMobile ? 18 : (currentOpts.particleCount ?? 40);
    const maxDistance = isMobile ? 85 : (currentOpts.maxDistance ?? 110);
    const speed = isMobile ? 0.35 : (currentOpts.speed ?? 0.5);
    const colors = currentOpts.colors ?? DEFAULT_COLORS;
    const connectLines = currentOpts.connectLines ?? true;

    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    // Responsive particle count calculation
    const actualCount = Math.min(
      baseCount,
      Math.max(12, Math.floor((width * height) / 22000))
    );

    const particles: Particle[] = [];

    // Initialize particles once
    for (let i = 0; i < actualCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        radius: isMobile ? (1.2 + Math.random() * 1.8) : (1.5 + Math.random() * 2.5),
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.25 + Math.random() * 0.45,
      });
    }

    // Touch & Mouse proximity tracking
    let mouseX = -1000;
    let mouseY = -1000;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      if ('touches' in e && e.touches.length > 0) {
        mouseX = e.touches[0].clientX - rect.left;
        mouseY = e.touches[0].clientY - rect.top;
      } else if ('clientX' in e) {
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
      }
    };

    const handlePointerLeave = () => {
      mouseX = -1000;
      mouseY = -1000;
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('mouseleave', handlePointerLeave);
    window.addEventListener('touchend', handlePointerLeave);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize, { passive: true });

    // Main 60 FPS render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw connecting lines
      if (connectLines) {
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const p1 = particles[i];
            const p2 = particles[j];

            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < maxDistance) {
              const lineAlpha = (1 - dist / maxDistance) * (isMobile ? 0.2 : 0.28);
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = `rgba(153, 51, 255, ${lineAlpha})`;
              ctx.lineWidth = isMobile ? 0.6 : 0.8;
              ctx.stroke();
            }
          }

          // Proximity to pointer / touch
          const mdx = particles[i].x - mouseX;
          const mdy = particles[i].y - mouseY;
          const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mDist < maxDistance * 1.25) {
            const lineAlpha = (1 - mDist / (maxDistance * 1.25)) * 0.35;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(mouseX, mouseY);
            ctx.strokeStyle = `rgba(0, 102, 255, ${lineAlpha})`;
            ctx.lineWidth = 0.9;
            ctx.stroke();
          }
        }
      }

      // 2. Draw and update each particle
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        if (!isMobile) {
          ctx.shadowBlur = 6;
          ctx.shadowColor = p.color;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('mouseleave', handlePointerLeave);
      window.removeEventListener('touchend', handlePointerLeave);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return { canvasRef };
}

export default useParticles;
