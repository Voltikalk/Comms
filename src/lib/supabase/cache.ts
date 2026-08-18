/**
 * High-Performance TTL In-Memory & LocalStorage Cache Manager
 * Provides cache storage, automatic expiration, pattern invalidation, and hit/miss telemetry
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
  hits: number;
}

class SupabaseCacheManager {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private maxEntries = 300;

  /**
   * Set an item with specific TTL (in milliseconds)
   */
  set<T>(key: string, data: T, ttlMs: number): void {
    // Evict oldest entry if size limit reached
    if (this.memoryCache.size >= this.maxEntries) {
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) this.memoryCache.delete(oldestKey);
    }

    const entry: CacheEntry<T> = {
      data,
      expiresAt: Date.now() + ttlMs,
      createdAt: Date.now(),
      hits: 0,
    };

    this.memoryCache.set(key, entry);
  }

  /**
   * Get cached item or null if expired or missing
   */
  get<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }

    entry.hits += 1;
    return entry.data as T;
  }

  /**
   * Check if valid unexpired key exists
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Invalidate specific key
   */
  invalidate(key: string): void {
    this.memoryCache.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix (e.g., "messages:room-123")
   */
  invalidatePrefix(prefix: string): void {
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Invalidate all keys matching a regex pattern
   */
  invalidatePattern(pattern: RegExp): void {
    for (const key of this.memoryCache.keys()) {
      if (pattern.test(key)) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.memoryCache.clear();
  }

  /**
   * Fetch with cache-aside wrapper
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const freshData = await fetcher();
    this.set(key, freshData, ttlMs);
    return freshData;
  }
}

export const dbCache = new SupabaseCacheManager();
export default dbCache;
