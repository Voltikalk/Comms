/**
 * Minimal promise-based key/value store over IndexedDB with an in-memory
 * fallback (private mode, SSR, Vitest node env). No external deps.
 */

export interface KeyValueStore<T> {
  get(key: string): Promise<T | undefined>;
  getAll(): Promise<T[]>;
  put(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export function createMemoryStore<T>(): KeyValueStore<T> {
  const map = new Map<string, T>();
  return {
    get: async (key) => map.get(key),
    getAll: async () => Array.from(map.values()),
    put: async (key, value) => {
      map.set(key, value);
    },
    delete: async (key) => {
      map.delete(key);
    },
    clear: async () => {
      map.clear();
    },
  };
}

const DB_NAME = 'secure-comms';
const DB_VERSION = 1;
/** All object stores live in one DB so a single upgrade creates them together. */
export const IDB_STORES = ['offline-queue', 'e2ee-keys'] as const;
export type IdbStoreName = (typeof IDB_STORES)[number];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      for (const name of IDB_STORES) {
        if (!req.result.objectStoreNames.contains(name)) req.result.createObjectStore(name);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

function wrap<R>(req: IDBRequest<R>): Promise<R> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function createIdbStore<T>(storeName: IdbStoreName): KeyValueStore<T> {
  const run = async <R>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<R>): Promise<R> => {
    const db = await openDb();
    return wrap(fn(db.transaction(storeName, mode).objectStore(storeName)));
  };
  return {
    get: (key) => run('readonly', (s) => s.get(key) as IDBRequest<T | undefined>),
    getAll: () => run('readonly', (s) => s.getAll() as IDBRequest<T[]>),
    put: async (key, value) => {
      await run('readwrite', (s) => s.put(value, key));
    },
    delete: async (key) => {
      await run('readwrite', (s) => s.delete(key));
    },
    clear: async () => {
      await run('readwrite', (s) => s.clear());
    },
  };
}

/** IndexedDB when available, otherwise an in-memory map. */
export function createPersistentStore<T>(storeName: IdbStoreName): KeyValueStore<T> {
  if (typeof indexedDB === 'undefined') return createMemoryStore<T>();
  const idb = createIdbStore<T>(storeName);
  const mem = createMemoryStore<T>();
  // Degrade gracefully if IndexedDB is blocked (Firefox private mode, quota errors).
  const safe =
    <A extends unknown[], R>(fn: (...a: A) => Promise<R>, fallback: (...a: A) => Promise<R>) =>
    async (...a: A): Promise<R> => {
      try {
        return await fn(...a);
      } catch {
        return fallback(...a);
      }
    };
  return {
    get: safe(idb.get, mem.get),
    getAll: safe(idb.getAll, mem.getAll),
    put: safe(idb.put, mem.put),
    delete: safe(idb.delete, mem.delete),
    clear: safe(idb.clear, mem.clear),
  };
}
