/**
 * Message disintegration ("Thanos snap") effect.
 *
 * - Particles are sampled from the real bubble: its background colour, text colour
 *   and — for photos / video notes — the actual pixels of the media element.
 * - A dissolve front sweeps across the bubble, grains drift up and away with a
 *   little turbulence, then the row collapses smoothly.
 * - `onDone` fires once the row has collapsed, so the list never jumps.
 * - If the row is still in the DOM afterwards (e.g. the delete was rejected),
 *   its inline styles are restored so nothing stays invisible.
 */

interface Grain {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  r: number;
  g: number;
  b: number;
  delay: number;
  life: number;
  age: number;
  wobble: number;
}

interface Entry {
  element: HTMLElement;
  rect: DOMRect;
}

const GRAIN_STEP = 2.6; // px between sampled grains
const MAX_GRAINS_PER_ELEMENT = 5200;
const MAX_GRAINS_TOTAL = 26000; // keeps multi-select / clear-history at 60fps
const SWEEP_MS = 260; // time for the dissolve front to cross a bubble
const COLLAPSE_DELAY_MS = 300;
const COLLAPSE_MS = 320;

type RGB = [number, number, number];

const parseColor = (value: string | null | undefined): RGB | null => {
  if (!value) return null;
  const m = value.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  if (parts.length >= 4 && parts[3] === 0) return null;
  if (parts.length < 3 || parts.slice(0, 3).some((n) => Number.isNaN(n))) return null;
  return [parts[0], parts[1], parts[2]];
};

/** Pull the first solid colour from a gradient `background-image`. */
const gradientColors = (value: string): RGB[] => {
  const found = value.match(/rgba?\([^)]+\)/g) || [];
  return found.map((c) => parseColor(c)).filter((c): c is RGB => !!c);
};

/** Draws <img>/<video> children into small offscreen canvases so we can read real pixels. */
const sampleMedia = (root: HTMLElement) => {
  const samplers: { rect: DOMRect; data: Uint8ClampedArray; w: number; h: number }[] = [];
  const media = Array.from(root.querySelectorAll('img, video')) as (HTMLImageElement | HTMLVideoElement)[];
  for (const el of media) {
    const rect = el.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) continue;
    const w = Math.max(8, Math.min(96, Math.round(rect.width / 3)));
    const h = Math.max(8, Math.min(96, Math.round(rect.height / 3)));
    try {
      const off = document.createElement('canvas');
      off.width = w;
      off.height = h;
      const octx = off.getContext('2d', { willReadFrequently: true });
      if (!octx) continue;
      if (el instanceof HTMLVideoElement && el.readyState < 2) continue;
      octx.drawImage(el, 0, 0, w, h);
      samplers.push({ rect, data: octx.getImageData(0, 0, w, h).data, w, h });
    } catch {
      // Cross-origin media taints the canvas — fall back to bubble colours.
    }
  }
  return samplers;
};

const insideRoundedRect = (px: number, py: number, rect: DOMRect, radius: number) => {
  const r = Math.min(radius, rect.width / 2, rect.height / 2);
  if (r <= 0) return true;
  const lx = px - rect.left;
  const ly = py - rect.top;
  const cx = lx < r ? r : lx > rect.width - r ? rect.width - r : lx;
  const cy = ly < r ? r : ly > rect.height - r ? rect.height - r : ly;
  const dx = lx - cx;
  const dy = ly - cy;
  return dx * dx + dy * dy <= r * r;
};

const buildGrains = (entry: Entry, isDark: boolean, maxGrains: number): Grain[] => {
  const { element, rect } = entry;
  const style = getComputedStyle(element);
  const radius = parseFloat(style.borderTopLeftRadius) || 0;

  const bg =
    parseColor(style.backgroundColor) ||
    gradientColors(style.backgroundImage)[0] ||
    (isDark ? ([43, 82, 120] as RGB) : ([238, 255, 222] as RGB));
  const ink = parseColor(style.color) || (isDark ? ([255, 255, 255] as RGB) : ([20, 24, 31] as RGB));
  const media = sampleMedia(element);

  const area = rect.width * rect.height;
  const step = Math.max(GRAIN_STEP, Math.sqrt(area / maxGrains));
  const grains: Grain[] = [];

  for (let y = rect.top; y < rect.bottom; y += step) {
    for (let x = rect.left; x < rect.right; x += step) {
      const px = x + Math.random() * step;
      const py = y + Math.random() * step;
      if (!insideRoundedRect(px, py, rect, radius)) continue;

      let color: RGB = bg;
      const sampler = media.find(
        (m) => px >= m.rect.left && px <= m.rect.right && py >= m.rect.top && py <= m.rect.bottom
      );
      if (sampler) {
        const sx = Math.min(sampler.w - 1, Math.floor(((px - sampler.rect.left) / sampler.rect.width) * sampler.w));
        const sy = Math.min(sampler.h - 1, Math.floor(((py - sampler.rect.top) / sampler.rect.height) * sampler.h));
        const i = (sy * sampler.w + sx) * 4;
        if (sampler.data[i + 3] > 20) color = [sampler.data[i], sampler.data[i + 1], sampler.data[i + 2]];
      } else if (Math.random() < 0.14) {
        // A sprinkle of text-coloured grains keeps the "ink" readable as it dissolves.
        color = ink;
      }

      const jitter = (Math.random() - 0.5) * 22;
      const u = (px - rect.left) / rect.width;
      const v = (py - rect.top) / rect.height;
      // Dissolve front: left → right with a slight diagonal, plus noise.
      const front = u * 0.82 + (1 - v) * 0.18 + (Math.random() - 0.5) * 0.12;

      grains.push({
        x: px,
        y: py,
        vx: 0.35 + Math.random() * 1.1,
        vy: -(0.25 + Math.random() * 0.9),
        size: Math.random() > 0.9 ? step * 0.95 : step * (0.55 + Math.random() * 0.25),
        r: Math.max(0, Math.min(255, color[0] + jitter)),
        g: Math.max(0, Math.min(255, color[1] + jitter)),
        b: Math.max(0, Math.min(255, color[2] + jitter)),
        delay: Math.max(0, front) * SWEEP_MS,
        life: 520 + Math.random() * 420,
        age: 0,
        wobble: Math.random() * Math.PI * 2,
      });
    }
  }
  return grains;
};

const collapseRow = (element: HTMLElement) => {
  const row = (element.closest('[id^="msg-"]') as HTMLElement) || element;
  const saved = row.getAttribute('style') || '';
  row.style.height = `${row.offsetHeight}px`;
  row.style.overflow = 'hidden';
  row.style.boxSizing = 'border-box';
  row.style.pointerEvents = 'none';
  const ease = 'cubic-bezier(0.32, 0.72, 0, 1)';
  row.style.transition = `height ${COLLAPSE_MS}ms ${ease}, padding ${COLLAPSE_MS}ms ${ease}, margin ${COLLAPSE_MS}ms ${ease}`;
  window.setTimeout(() => {
    row.style.height = '0px';
    row.style.paddingTop = '0px';
    row.style.paddingBottom = '0px';
    row.style.marginTop = '0px';
    row.style.marginBottom = '0px';
  }, COLLAPSE_DELAY_MS);
  return { row, saved };
};

export function triggerTelegramDisintegrate(
  elementOrElements: HTMLElement | HTMLElement[],
  onDone?: () => void
) {
  const elements = (Array.isArray(elementOrElements) ? elementOrElements : [elementOrElements]).filter(Boolean);
  const entries: Entry[] = elements
    .map((element) => ({ element, rect: element.getBoundingClientRect() }))
    .filter((e) => e.rect.width > 0 && e.rect.height > 0 && e.rect.bottom > 0 && e.rect.top < window.innerHeight);

  // Off-screen messages (selected then scrolled away) just get removed.
  if (entries.length === 0) {
    onDone?.();
    return;
  }

  try {
    navigator.vibrate?.(entries.length > 1 ? [12, 30, 12] : 14);
  } catch { /* ignore */ }

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const isDark = document.documentElement.classList.contains('dark');

  // Sample colours BEFORE hiding anything.
  const grains = reduceMotion ? [] : entries.flatMap((entry) =>
        buildGrains(entry, isDark, Math.min(MAX_GRAINS_PER_ELEMENT, MAX_GRAINS_TOTAL / entries.length))
      );

  // The bubble is erased by a sweeping mask while the grains take its place.
  const mask = 'linear-gradient(90deg, transparent 0%, transparent var(--dz-p, 0%), #000 calc(var(--dz-p, 0%) + 14%))';
  const setSweep = (pct: number) => {
    entries.forEach(({ element }) => element.style.setProperty('--dz-p', `${pct}%`));
  };
  entries.forEach(({ element }) => {
    if (reduceMotion || grains.length === 0) {
      element.style.transition = 'opacity 160ms ease-out';
      element.style.opacity = '0';
      return;
    }
    element.style.setProperty('--dz-p', '-14%');
    element.style.setProperty('mask-image', mask);
    element.style.setProperty('-webkit-mask-image', mask);
  });

  const collapsed = entries.map(({ element }) => collapseRow(element));

  let doneCalled = false;
  const finish = () => {
    if (doneCalled) return;
    doneCalled = true;
    onDone?.();
    // If the row survived (delete rejected / message re-rendered), undo our inline styles.
    window.setTimeout(() => {
      collapsed.forEach(({ row, saved }) => {
        if (row.isConnected) row.setAttribute('style', saved);
      });
      entries.forEach(({ element }) => {
        if (element.isConnected) {
          element.style.removeProperty('mask-image');
          element.style.removeProperty('-webkit-mask-image');
          element.style.removeProperty('--dz-p');
          element.style.opacity = '';
          element.style.transition = '';
        }
      });
    }, 1200);
  };
  window.setTimeout(finish, COLLAPSE_DELAY_MS + COLLAPSE_MS + 20);

  if (grains.length === 0) return;

  const canvas = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  canvas.width = vw * dpr;
  canvas.height = vh * dpr;
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: `${vw}px`,
    height: `${vh}px`,
    pointerEvents: 'none',
    zIndex: '99999',
  } as CSSStyleDeclaration);
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    entries.forEach(({ element }) => { element.style.opacity = '0'; });
    return;
  }
  ctx.scale(dpr, dpr);
  // rAF is suspended in background tabs; don't leave the overlay stranded there.
  window.setTimeout(() => canvas.remove(), 2600);

  const start = performance.now();
  let last = start;

  const tick = (now: number) => {
    const elapsed = now - start;
    const dt = Math.min(32, now - last) / 16.67;
    last = now;
    ctx.clearRect(0, 0, vw, vh);
    // Front position in % of bubble width (grains release at u ≈ front / 0.82).
    const sweep = Math.min(1.2, elapsed / SWEEP_MS / 0.82);
    setSweep(sweep >= 1.2 ? 120 : sweep * 100 - 14);
    if (sweep >= 1.2) entries.forEach(({ element }) => { element.style.opacity = '0'; });

    let alive = 0;
    for (let i = 0; i < grains.length; i++) {
      const g = grains[i];
      if (elapsed < g.delay) {
        alive++;
        continue;
      }
      g.age += 16.67 * dt;
      const t = g.age / g.life;
      if (t >= 1) continue;
      alive++;

      g.wobble += 0.12 * dt;
      g.vx += 0.012 * dt;
      g.vy -= 0.018 * dt;
      g.x += (g.vx + Math.sin(g.wobble) * 0.35) * dt;
      g.y += g.vy * dt;

      const alpha = t < 0.15 ? 1 : 1 - (t - 0.15) / 0.85;
      const size = g.size * (1 - t * 0.55);
      ctx.globalAlpha = alpha * alpha;
      ctx.fillStyle = `rgb(${g.r | 0},${g.g | 0},${g.b | 0})`;
      ctx.fillRect(g.x, g.y, size, size);
    }

    if (alive > 0 && elapsed < 2000) {
      requestAnimationFrame(tick);
    } else {
      canvas.remove();
    }
  };

  requestAnimationFrame(tick);
}
