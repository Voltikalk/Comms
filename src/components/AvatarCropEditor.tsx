import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { IconCheck, IconLoader2, IconPhoto, IconRefresh, IconRotate2, IconX } from '@tabler/icons-react';
import { renderAvatar, rotatedSize, type AvatarRotation } from '../lib/avatar-crop';

interface AvatarCropEditorProps {
  file: File;
  onCancel: () => void;
  onDone: (blob: Blob) => void;
}

const MAX_ZOOM = 4;
const KEY_STEP = 12;

interface View {
  zoom: number;
  x: number;
  y: number;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Telegram-style avatar editor: drag to position, pinch / wheel / slider to
 * zoom, rotate by 90°. The circle shows exactly what will be uploaded.
 */
export const AvatarCropEditor: React.FC<AvatarCropEditorProps> = ({ file, onCancel, onDone }) => {
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [rotation, setRotation] = useState<AvatarRotation>(0);
  const [view, setView] = useState<View>({ zoom: 1, x: 0, y: 0 });
  const [stage, setStage] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());

  useEffect(() => {
    let alive = true;
    let bmp: ImageBitmap | null = null;
    const url = URL.createObjectURL(file);
    setSrc(url);
    createImageBitmap(file, { imageOrientation: 'from-image' })
      .then((b) => {
        if (alive) setBitmap((bmp = b));
        else b.close();
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      URL.revokeObjectURL(url);
      bmp?.close();
    };
  }, [file]);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setStage(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dims = useMemo(() => (bitmap ? rotatedSize(bitmap.width, bitmap.height, rotation) : null), [bitmap, rotation]);
  const base = dims && stage ? stage / Math.min(dims.width, dims.height) : 0;

  /** Keeps the image covering the whole circle. */
  const fit = useCallback(
    (v: View): View => {
      if (!dims || !base) return v;
      const zoom = clamp(v.zoom, 1, MAX_ZOOM);
      const k = base * zoom;
      const maxX = Math.max(0, (dims.width * k - stage) / 2);
      const maxY = Math.max(0, (dims.height * k - stage) / 2);
      return { zoom, x: clamp(v.x, -maxX, maxX), y: clamp(v.y, -maxY, maxY) };
    },
    [dims, base, stage],
  );

  const pan = (dx: number, dy: number) => setView((v) => fit({ ...v, x: v.x + dx, y: v.y + dy }));

  /** Zoom keeping the point (fx, fy) — relative to the stage center — in place. */
  const zoomAt = useCallback(
    (nextZoom: number, fx = 0, fy = 0) =>
      setView((v) => {
        const zoom = clamp(nextZoom, 1, MAX_ZOOM);
        const ratio = zoom / v.zoom;
        return fit({ zoom, x: fx - (fx - v.x) * ratio, y: fy - (fy - v.y) * ratio });
      }),
    [fit],
  );

  const relative = (clientX: number, clientY: number) => {
    const r = stageRef.current!.getBoundingClientRect();
    return { fx: clientX - r.left - r.width / 2, fy: clientY - r.top - r.height / 2 };
  };

  // Wheel must be non-passive to stop the page from scrolling.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { fx, fy } = relative(e.clientX, e.clientY);
      setView((v) => {
        const zoom = clamp(v.zoom * Math.exp(-e.deltaY * 0.0015), 1, MAX_ZOOM);
        const ratio = zoom / v.zoom;
        return fit({ zoom, x: fx - (fx - v.x) * ratio, y: fy - (fy - v.y) * ratio });
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [fit]);

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const map = pointers.current;
    const prev = map.get(e.pointerId);
    if (!prev) return;
    if (map.size === 1) {
      pan(e.clientX - prev.x, e.clientY - prev.y);
    } else if (map.size === 2) {
      const other = [...map.entries()].find(([id]) => id !== e.pointerId)![1];
      const before = Math.hypot(prev.x - other.x, prev.y - other.y);
      const after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
      const mid = relative((e.clientX + other.x) / 2, (e.clientY + other.y) / 2);
      const midShift = { x: (e.clientX - prev.x) / 2, y: (e.clientY - prev.y) / 2 };
      setView((v) => {
        const zoom = clamp(v.zoom * (before > 0 ? after / before : 1), 1, MAX_ZOOM);
        const ratio = zoom / v.zoom;
        return fit({
          zoom,
          x: mid.fx - (mid.fx - v.x) * ratio + midShift.x,
          y: mid.fy - (mid.fy - v.y) * ratio + midShift.y,
        });
      });
    }
    map.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };

  const onPointerEnd = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) setDragging(false);
  };

  const rotate = () => {
    setRotation((r) => ((r + 270) % 360) as AvatarRotation);
    setView((v) => ({ ...v, x: 0, y: 0 }));
  };

  const reset = () => {
    setRotation(0);
    setView({ zoom: 1, x: 0, y: 0 });
  };

  // Re-clamp after rotation / resize changed the bounds.
  useEffect(() => {
    setView((v) => {
      const next = fit(v);
      return next.x === v.x && next.y === v.y && next.zoom === v.zoom ? v : next;
    });
  }, [fit]);

  const done = useCallback(async () => {
    if (!bitmap || !dims || !base || busy) return;
    const k = base * view.zoom;
    const side = stage / k;
    const cx = dims.width / 2 - view.x / k;
    const cy = dims.height / 2 - view.y / k;
    setBusy(true);
    try {
      onDone(await renderAvatar(bitmap, { x: cx - side / 2, y: cy - side / 2, side }, rotation));
    } catch {
      setBusy(false);
      setFailed(true);
    }
  }, [bitmap, dims, base, busy, view, stage, rotation, onDone]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Arrows on the zoom slider belong to the slider.
      const inSlider = (e.target as HTMLElement | null)?.tagName === 'INPUT';
      const actions: Record<string, () => void> = {
        Escape: onCancel,
        Enter: () => void done(),
        ...(inSlider
          ? {}
          : {
              ArrowLeft: () => pan(KEY_STEP, 0),
              ArrowRight: () => pan(-KEY_STEP, 0),
              ArrowUp: () => pan(0, KEY_STEP),
              ArrowDown: () => pan(0, -KEY_STEP),
              '-': () => zoomAt(view.zoom / 1.15),
              '+': () => zoomAt(view.zoom * 1.15),
              '=': () => zoomAt(view.zoom * 1.15),
            }),
      };
      const action = actions[e.key];
      if (!action) return;
      e.preventDefault();
      e.stopPropagation();
      action();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  const k = base * view.zoom;

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Фото профиля"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[95] flex select-none flex-col bg-black text-white"
    >
      <header className="flex shrink-0 items-center gap-1 px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onCancel}
          className="flex h-11 w-11 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
          aria-label="Отмена"
          title="Отмена (Esc)"
        >
          <IconX size={22} />
        </button>
        <h2 className="m-0 flex-1 text-[16px] font-semibold">Фото профиля</h2>
        <button
          type="button"
          onClick={reset}
          disabled={rotation === 0 && view.zoom === 1 && view.x === 0 && view.y === 0}
          className="flex h-11 w-11 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-default"
          aria-label="Сбросить"
          title="Сбросить"
        >
          <IconRefresh size={21} />
        </button>
        <button
          type="button"
          onClick={rotate}
          className="flex h-11 w-11 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
          aria-label="Повернуть"
          title="Повернуть на 90°"
        >
          <IconRotate2 size={21} />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center px-4">
        <div
          ref={stageRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          style={{ width: 'min(100%, 440px, calc(100dvh - 230px))', touchAction: 'none' }}
          className={`relative aspect-square overflow-hidden ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        >
          {src && bitmap && k > 0 && (
            <img
              src={src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
              style={{
                width: bitmap.width * k,
                height: bitmap.height * k,
                transform: `translate(-50%, -50%) translate(${view.x}px, ${view.y}px) rotate(${rotation}deg)`,
                transition: dragging ? 'none' : 'transform 0.18s cubic-bezier(0.2, 0.9, 0.3, 1)',
              }}
            />
          )}
          {/* Circle mask + rule-of-thirds grid while dragging */}
          <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] ring-2 ring-white/80" />
          <div
            className={`pointer-events-none absolute inset-0 overflow-hidden rounded-full transition-opacity duration-200 ${dragging ? 'opacity-100' : 'opacity-0'}`}
          >
            <div className="absolute inset-y-0 left-1/3 w-px bg-white/40" />
            <div className="absolute inset-y-0 left-2/3 w-px bg-white/40" />
            <div className="absolute inset-x-0 top-1/3 h-px bg-white/40" />
            <div className="absolute inset-x-0 top-2/3 h-px bg-white/40" />
          </div>
          {!bitmap && !failed && (
            <div className="absolute inset-0 flex items-center justify-center">
              <IconLoader2 size={30} className="animate-spin text-white/70" />
            </div>
          )}
          {failed && (
            <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-[14px] text-white/80">
              Не удалось открыть изображение. Попробуйте другой файл.
            </div>
          )}
        </div>
      </div>

      <footer className="flex shrink-0 flex-col items-center gap-4 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
        <label className="flex w-full max-w-[360px] items-center gap-3">
          <IconPhoto size={16} className="shrink-0 text-white/60" />
          <span className="sr-only">Масштаб</span>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={view.zoom}
            onChange={(e) => zoomAt(Number(e.target.value))}
            disabled={!bitmap}
            className="h-1 flex-1 cursor-pointer accent-[var(--accent)]"
          />
          <IconPhoto size={22} className="shrink-0 text-white/60" />
        </label>
        <div className="flex w-full max-w-[360px] items-center justify-between">
          <span className="text-[13px] text-white/55">Перетащите и приблизьте фото</span>
          <button
            type="button"
            onClick={() => void done()}
            disabled={!bitmap || busy}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg transition-[background-color,transform,opacity] hover:bg-accent-strong active:scale-95 disabled:opacity-50 cursor-pointer"
            aria-label="Готово"
            title="Готово (Enter)"
          >
            {busy ? <IconLoader2 size={24} className="animate-spin" /> : <IconCheck size={26} stroke={2.6} />}
          </button>
        </div>
      </footer>
    </motion.div>,
    document.body,
  );
};

export default AvatarCropEditor;
