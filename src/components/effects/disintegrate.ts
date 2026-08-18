/**
 * Telegram Authentic Thanos Snap Disintegration Effect (Щелчок Таноса 1:1)
 * - Rock-solid chat feed stability (chat stays completely stationary in place)
 * - 6,000 - 9,500 microscopic sand particles (0.6px - 1.1px)
 * - Pure laminar fluid physics with zero jitter, vibration, or layout jumping
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
      navigator.vibrate(validEntries.length > 1 ? [20, 35, 20] : [15, 25, 12]);
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

  // 3. Hide original bubble cleanly while PRESERVING exact chat dimensions (Chat stays in place)
  validEntries.forEach(({ element }) => {
    element.style.transition = 'opacity 70ms ease-out';
    element.style.opacity = '0';
  });

  const isDark = document.documentElement.classList.contains('dark');
  const palette = isDark ? TG_STARDUST_DARK : TG_STARDUST_LIGHT;

  // 4. Generate 6,000 - 9,500 Microscopic Sand Grains (0.6px - 1.1px)
  const particles: ThanosDustParticle[] = [];

  validEntries.forEach(({ rect }) => {
    const area = rect.width * rect.height;
    const particleCount = Math.min(9000, Math.max(3500, Math.floor(area / 3.8)));

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

      // Thanos Wave Progression: Gentle progressive sweep (0ms to 320ms)
      const waveProgress = (u * 0.45 + (1 - v) * 0.55) + (Math.random() * 0.12 - 0.06);
      const startDelay = Math.max(0, waveProgress * 320);

      // Ultra-soft, weightless velocity with zero jitter
      const spreadSpeed = Math.random() * 0.4 + 0.12;
      const lateralDirection = dx >= 0 ? 1 : -1;
      const vx = Math.cos(angleFromCenter) * spreadSpeed * 0.4 + lateralDirection * (Math.random() * 0.4 + 0.1);
      const vy = -Math.random() * 0.7 - 0.25; // delicate upward draft

      // Microscopic Sand Particle Size: 0.6px to 1.1px
      const size = Math.random() > 0.88 
        ? Math.random() * 0.3 + 0.9 // occasional 0.9 - 1.2px spark
        : Math.random() * 0.3 + 0.6; // majority 0.6 - 0.9px microscopic sand grains

      const color = palette[Math.floor(Math.random() * palette.length)];

      particles.push({
        x: posX,
        y: posY,
        originX: posX,
        originY: posY,
        vx,
        vy,
        drag: Math.random() * 0.005 + 0.982, // 0.982 to 0.987 viscous air resistance
        buoyancy: Math.random() * 0.003 + 0.005, // delicate continuous thermal lift
        size,
        color,
        alpha: 1,
        maxAlpha: Math.random() * 0.3 + 0.7, // 0.7 to 1.0
        twinkleFreq: Math.random() * 0.015 + 0.008,
        twinklePhase: Math.random() * Math.PI * 2,
        startDelay,
        decayRate: Math.random() * 0.005 + 0.004, // Graceful ~1.7s lifespan
      });
    }
  });

  // 5. 60/120 FPS Pure Laminar Fluid Physics (Chat stays completely in place)
  let animId: number;
  const startTime = performance.now();
  const maxDuration = 1750; // ms (relaxed, silky duration)

  const render = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    let activeCount = 0;
    const globalFadeIn = Math.min(1, elapsed / 50);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (p.alpha <= 0) continue;
      activeCount++;

      // Before wave reaches particle, draw solid shape with soft onset
      if (elapsed < p.startDelay) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.maxAlpha * globalFadeIn;
        ctx.fillRect(p.originX, p.originY, p.size, p.size);
        continue;
      }

      // Continuous monotonic air drag + continuous thermal buoyancy (Zero Jitter)
      p.vx *= p.drag;
      p.vy = (p.vy * p.drag) - p.buoyancy;

      p.x += p.vx;
      p.y += p.vy;

      // Twinkle & graceful quadratic decay
      p.alpha -= p.decayRate;
      if (p.alpha < 0) p.alpha = 0;

      const particleAge = elapsed - p.startDelay;
      const twinkle = 0.88 + 0.12 * Math.sin(particleAge * p.twinkleFreq + p.twinklePhase);
      const renderAlpha = Math.max(0, Math.min(1, p.alpha * p.maxAlpha * twinkle * globalFadeIn));

      // Draw microscopic sand grain
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
