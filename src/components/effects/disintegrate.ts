/**
 * Telegram Authentic Thanos Snap Disintegration & Smooth Height Collapse (Щелчок Таноса 1:1)
 * - 60 FPS Canvas Dust Particles
 * - Smooth cubic-bezier height collapse (zero sudden layout jumps or delays)
 * - Responsive 420ms duration (no 1.7s awkward pauses)
 */

interface ThanosDustParticle {
  // Coordinates
  x: number;
  y: number;
  originX: number;
  originY: number;
  // Velocities
  vx: number;
  vy: number;
  drag: number;
  buoyancy: number;
  // Visuals
  size: number;
  color: string;
  alpha: number;
  maxAlpha: number;
  twinkleFreq: number;
  twinklePhase: number;
  // Timing
  startDelay: number;
  decayRate: number;
}

// Telegram Stardust / Ice Cyan / Cosmic Sparkle Palette
const TG_STARDUST_DARK = [
  '#ffffff', // Pure white spark
  '#b8f2ff', // Bright icy cyan
  '#70b1ff', // Telegram electric blue
  '#5ac8fa', // Apple/Telegram iOS cyan
  '#9be5ff', // Sky stardust
  '#38bdf8', // Cyan 400
  '#3390ec', // Telegram brand blue
  '#cffafe', // Mint glow
  '#93c5fd', // Light blue spark
  '#67e8f9', // Neon cyan
];

const TG_STARDUST_LIGHT = [
  '#3390ec', // Telegram primary
  '#5ac8fa', // Cyan
  '#4fae4e', // Telegram green spark
  '#70b1ff', // Light blue
  '#38bdf8', // Electric sky
  '#86efac', // Light mint
  '#ffffff', // White spark
  '#60a5fa', // Blue 400
  '#bae6fd', // Soft sky
];

export function triggerTelegramDisintegrate(
  elementOrElements: HTMLElement | HTMLElement[],
  onDone?: () => void
) {
  const elements = (Array.isArray(elementOrElements) ? elementOrElements : [elementOrElements]).filter(Boolean);
  const validEntries = elements
    .map((el) => ({ element: el, rect: el.getBoundingClientRect() }))
    .filter((e) => e.rect.width > 0 && e.rect.height > 0);

  if (validEntries.length === 0) {
    onDone?.();
    return;
  }

  // 1. Soft Haptic Pulse (Silent, tactile only)
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(validEntries.length > 1 ? [15, 25, 15] : [12, 20]);
    } catch {}
  }

  // 2. Fullscreen Overlay Canvas
  const canvas = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.position = 'fixed';
  canvas.style.left = '0';
  canvas.style.top = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    onDone?.();
    return;
  }
  ctx.scale(dpr, dpr);

  // 3. Smooth CSS Height Collapse of the message row (prevents sudden layout drop)
  validEntries.forEach(({ element }) => {
    // Hide bubble itself
    element.style.transition = 'opacity 80ms ease-out';
    element.style.opacity = '0';

    // Collapse parent message row smoothly
    const row = (element.closest('[id^="msg-"]') as HTMLElement) || element;
    if (row) {
      const initialHeight = row.offsetHeight;
      row.style.height = `${initialHeight}px`;
      row.style.overflow = 'hidden';
      row.style.boxSizing = 'border-box';
      row.style.transition = 'height 340ms cubic-bezier(0.33, 1, 0.68, 1), padding 340ms cubic-bezier(0.33, 1, 0.68, 1), margin 340ms cubic-bezier(0.33, 1, 0.68, 1), opacity 180ms ease-out';

      requestAnimationFrame(() => {
        row.style.height = '0px';
        row.style.paddingTop = '0px';
        row.style.paddingBottom = '0px';
        row.style.marginTop = '0px';
        row.style.marginBottom = '0px';
        row.style.opacity = '0';
      });
    }
  });

  const isDark = document.documentElement.classList.contains('dark');
  const palette = isDark ? TG_STARDUST_DARK : TG_STARDUST_LIGHT;

  // 4. Generate 2,500 - 4,500 Microscopic Sand Grains (Crisp & snappy)
  const particles: ThanosDustParticle[] = [];

  validEntries.forEach(({ rect }) => {
    const area = rect.width * rect.height;
    const particleCount = Math.min(4500, Math.max(1800, Math.floor(area / 4.5)));

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    for (let i = 0; i < particleCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const posX = rect.left + u * rect.width + (Math.random() - 0.5) * 1.5;
      const posY = rect.top + v * rect.height + (Math.random() - 0.5) * 1.5;

      const dx = posX - centerX;
      const dy = posY - centerY;
      const angleFromCenter = Math.atan2(dy, dx);

      // Fast progressive sweep (0ms to 120ms)
      const waveProgress = (u * 0.45 + (1 - v) * 0.55) + (Math.random() * 0.1 - 0.05);
      const startDelay = Math.max(0, waveProgress * 120);

      // Soft velocity
      const spreadSpeed = Math.random() * 0.8 + 0.3;
      const lateralDirection = dx >= 0 ? 1 : -1;
      const vx = Math.cos(angleFromCenter) * spreadSpeed * 0.4 + lateralDirection * (Math.random() * 0.6 + 0.2);
      const vy = -Math.random() * 1.2 - 0.4; // upward draft

      const size = Math.random() > 0.88 
        ? Math.random() * 0.3 + 0.9 
        : Math.random() * 0.3 + 0.6;

      const color = palette[Math.floor(Math.random() * palette.length)];

      particles.push({
        x: posX,
        y: posY,
        originX: posX,
        originY: posY,
        vx,
        vy,
        drag: Math.random() * 0.006 + 0.975,
        buoyancy: Math.random() * 0.005 + 0.012,
        size,
        color,
        alpha: 1,
        maxAlpha: Math.random() * 0.3 + 0.7,
        twinkleFreq: Math.random() * 0.02 + 0.01,
        twinklePhase: Math.random() * Math.PI * 2,
        startDelay,
        decayRate: Math.random() * 0.015 + 0.018, // Lifespan ~380ms
      });
    }
  });

  // 5. 60 FPS Particle Physics Animation (~380-420ms total)
  let animId: number;
  const startTime = performance.now();
  const maxDuration = 420; // ms (smooth and snappy, 0 awkward pause)

  const render = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    let activeCount = 0;
    const globalFadeIn = Math.min(1, elapsed / 30);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (p.alpha <= 0) continue;
      activeCount++;

      if (elapsed < p.startDelay) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.maxAlpha * globalFadeIn;
        ctx.fillRect(p.originX, p.originY, p.size, p.size);
        continue;
      }

      p.vx *= p.drag;
      p.vy = (p.vy * p.drag) - p.buoyancy;

      p.x += p.vx;
      p.y += p.vy;

      p.alpha -= p.decayRate;
      if (p.alpha < 0) p.alpha = 0;

      const particleAge = elapsed - p.startDelay;
      const twinkle = 0.88 + 0.12 * Math.sin(particleAge * p.twinkleFreq + p.twinklePhase);
      const renderAlpha = Math.max(0, Math.min(1, p.alpha * p.maxAlpha * twinkle * globalFadeIn));

      ctx.fillStyle = p.color;
      ctx.globalAlpha = renderAlpha;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }

    if (activeCount > 0 && elapsed < maxDuration) {
      animId = requestAnimationFrame(render);
    } else {
      cancelAnimationFrame(animId);
      canvas.remove();
      onDone?.();
    }
  };

  animId = requestAnimationFrame(render);
}
