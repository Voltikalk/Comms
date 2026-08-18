import { inflate } from 'pako';

// Global In-memory cache for parsed Lottie animation JSONs
const lottieMemoryCache = new Map<string, any>();
const pendingFetches = new Map<string, Promise<any>>();

/**
 * Checks if a URL or data source represents a .tgs Telegram Animated Sticker
 */
export function isTgsSource(source: string): boolean {
  if (!source) return false;
  const lower = source.toLowerCase().trim();
  return (
    lower.endsWith('.tgs') ||
    lower.includes('.tgs?') ||
    lower.startsWith('data:application/x-tgsticker') ||
    lower.startsWith('data:application/gzip')
  );
}

/**
 * Fast cached loader for both .tgs and .json Lottie animations
 */
export async function loadLottieData(source: string | ArrayBuffer | Uint8Array | Blob): Promise<any> {
  if (typeof source === 'string') {
    // 1. Return from in-memory cache if already parsed
    if (lottieMemoryCache.has(source)) {
      return lottieMemoryCache.get(source);
    }
    // 2. Reuse in-flight promise to avoid duplicate network fetches
    if (pendingFetches.has(source)) {
      return pendingFetches.get(source);
    }
  }

  const fetchPromise = (async () => {
    try {
      if (typeof source === 'string') {
        if (source.endsWith('.json')) {
          const res = await fetch(source);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();
          lottieMemoryCache.set(source, json);
          return json;
        }

        if (source.startsWith('data:')) {
          const base64Part = source.split(',')[1] || '';
          const binaryString = window.atob(base64Part);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const inflated = inflate(bytes);
          const json = JSON.parse(new TextDecoder('utf-8').decode(inflated));
          lottieMemoryCache.set(source, json);
          return json;
        }

        // Fetch .tgs via HTTP
        const response = await fetch(source);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        const inflated = inflate(new Uint8Array(arrayBuffer));
        const json = JSON.parse(new TextDecoder('utf-8').decode(inflated));
        lottieMemoryCache.set(source, json);
        return json;
      }

      let arrayBuffer: ArrayBuffer;
      if (source instanceof Blob) {
        arrayBuffer = await source.arrayBuffer();
      } else if (source instanceof Uint8Array) {
        arrayBuffer = source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength) as ArrayBuffer;
      } else {
        arrayBuffer = source;
      }

      const inflated = inflate(new Uint8Array(arrayBuffer));
      const json = JSON.parse(new TextDecoder('utf-8').decode(inflated));
      return json;
    } finally {
      if (typeof source === 'string') {
        pendingFetches.delete(source);
      }
    }
  })();

  if (typeof source === 'string') {
    pendingFetches.set(source, fetchPromise);
  }

  return fetchPromise;
}

export const loadTgsAnimation = loadLottieData;
