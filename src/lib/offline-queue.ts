/**
 * Offline outbox. Messages typed while the socket is down are persisted to
 * IndexedDB, rendered optimistically with the «ожидание 🕒» status and flushed
 * in FIFO order once the socket reconnects.
 */
import type { Message } from '../types';
import { createPersistentStore, type KeyValueStore } from './idb-store';

/** Wire payload for `send_message` (everything except server-assigned fields). */
export type OutgoingMessage = Omit<Message, 'id' | 'sender' | 'timestamp' | 'readBy' | 'reactions' | 'pending' | 'queued'> & {
  clientId: string;
};

export interface QueuedItem {
  clientId: string;
  roomId: string;
  createdAt: number;
  attempts: number;
  /** Account that queued the item; another account on this browser never sends it. */
  owner?: string;
  payload: OutgoingMessage;
}

export const MAX_QUEUE_ATTEMPTS = 5;

export function createClientId(now = Date.now()): string {
  const rand = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `c-${now.toString(36)}-${rand}`;
}

export interface FlushResult {
  sent: string[];
  failed: string[];
  dropped: string[];
}

export class OfflineQueue {
  private readonly store: KeyValueStore<QueuedItem>;
  private readonly owner?: string;
  private flushing: Promise<FlushResult> | null = null;

  constructor(store: KeyValueStore<QueuedItem> = createPersistentStore<QueuedItem>('offline-queue'), owner?: string) {
    this.store = store;
    this.owner = owner;
  }

  async enqueue(payload: OutgoingMessage, now = Date.now()): Promise<QueuedItem> {
    const item: QueuedItem = { clientId: payload.clientId, roomId: payload.roomId, createdAt: now, attempts: 0, owner: this.owner, payload };
    await this.store.put(item.clientId, item);
    return item;
  }

  /** FIFO by creation time, optionally scoped to a room. Only this owner's items. */
  async list(roomId?: string): Promise<QueuedItem[]> {
    const all = await this.store.getAll();
    return all
      .filter((i) => (!this.owner || i.owner === this.owner) && (!roomId || i.roomId === roomId))
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  async remove(clientId: string): Promise<void> {
    await this.store.delete(clientId);
  }

  /** Drops this owner's items (all items for an unscoped queue). */
  async clear(): Promise<void> {
    if (!this.owner) return this.store.clear();
    for (const item of await this.list()) await this.store.delete(item.clientId);
  }

  /**
   * Sends queued items in order. `send` resolves `true` when the server acked.
   * Items that fail stay queued (attempts++); after MAX_QUEUE_ATTEMPTS they are dropped.
   * Concurrent calls share a single in-flight flush to avoid double delivery.
   */
  flush(send: (item: QueuedItem) => Promise<boolean>): Promise<FlushResult> {
    if (this.flushing) return this.flushing;
    this.flushing = (async () => {
      const result: FlushResult = { sent: [], failed: [], dropped: [] };
      try {
        for (const item of await this.list()) {
          let ok = false;
          try {
            ok = await send(item);
          } catch {
            ok = false;
          }
          if (ok) {
            await this.store.delete(item.clientId);
            result.sent.push(item.clientId);
            continue;
          }
          const attempts = item.attempts + 1;
          if (attempts >= MAX_QUEUE_ATTEMPTS) {
            await this.store.delete(item.clientId);
            result.dropped.push(item.clientId);
          } else {
            await this.store.put(item.clientId, { ...item, attempts });
            result.failed.push(item.clientId);
          }
        }
      } finally {
        this.flushing = null;
      }
      return result;
    })();
    return this.flushing;
  }
}

/** Builds the optimistic bubble shown while an item waits in the queue. */
export function toOptimisticMessage(item: QueuedItem, sender: Message['sender']): Message {
  return {
    ...item.payload,
    id: item.clientId,
    sender,
    text: item.payload.text ?? '',
    timestamp: item.createdAt,
    pending: true,
    queued: true,
  };
}
