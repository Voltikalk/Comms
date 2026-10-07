import { describe, it, expect } from 'vitest';
import { createMemoryStore, createPersistentStore } from './idb-store';
import {
  MAX_QUEUE_ATTEMPTS,
  OfflineQueue,
  createClientId,
  toOptimisticMessage,
  type OutgoingMessage,
  type QueuedItem,
} from './offline-queue';

const payload = (clientId: string, roomId = 'r1', text = 'hello'): OutgoingMessage => ({ clientId, roomId, text });

const makeQueue = () => new OfflineQueue(createMemoryStore<QueuedItem>());

describe('offline queue (IndexedDB outbox)', () => {
  it('falls back to memory store when IndexedDB is unavailable', async () => {
    const store = createPersistentStore<number>('offline-queue');
    await store.put('a', 1);
    expect(await store.get('a')).toBe(1);
    expect(await store.getAll()).toEqual([1]);
    await store.delete('a');
    expect(await store.get('a')).toBeUndefined();
  });

  it('generates unique client ids', () => {
    const ids = new Set(Array.from({ length: 50 }, () => createClientId()));
    expect(ids.size).toBe(50);
    expect([...ids][0]).toMatch(/^c-/);
  });

  it('lists items FIFO and scoped by room', async () => {
    const q = makeQueue();
    await q.enqueue(payload('b', 'r1'), 2);
    await q.enqueue(payload('a', 'r1'), 1);
    await q.enqueue(payload('c', 'r2'), 3);
    expect((await q.list()).map((i) => i.clientId)).toEqual(['a', 'b', 'c']);
    expect((await q.list('r2')).map((i) => i.clientId)).toEqual(['c']);
  });

  it('flushes in order and removes acked items', async () => {
    const q = makeQueue();
    await q.enqueue(payload('1'), 1);
    await q.enqueue(payload('2'), 2);
    const order: string[] = [];
    const res = await q.flush(async (item) => {
      order.push(item.clientId);
      return true;
    });
    expect(order).toEqual(['1', '2']);
    expect(res.sent).toEqual(['1', '2']);
    expect(await q.list()).toHaveLength(0);
  });

  it('keeps failed items with incremented attempts and drops after max attempts', async () => {
    const q = makeQueue();
    await q.enqueue(payload('x'), 1);
    for (let i = 1; i < MAX_QUEUE_ATTEMPTS; i += 1) {
      const r = await q.flush(async () => false);
      expect(r.failed).toEqual(['x']);
      expect((await q.list())[0].attempts).toBe(i);
    }
    const last = await q.flush(async () => {
      throw new Error('socket closed');
    });
    expect(last.dropped).toEqual(['x']);
    expect(await q.list()).toHaveLength(0);
  });

  it('dedupes concurrent flushes (no double delivery)', async () => {
    const q = makeQueue();
    await q.enqueue(payload('once'), 1);
    let calls = 0;
    const send = async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 5));
      return true;
    };
    await Promise.all([q.flush(send), q.flush(send)]);
    expect(calls).toBe(1);
  });

  it('scopes items per account on a shared browser', async () => {
    const store = createMemoryStore<QueuedItem>();
    const alice = new OfflineQueue(store, 'alice');
    const bob = new OfflineQueue(store, 'bob');
    await alice.enqueue(payload('a1'));
    await bob.enqueue(payload('b1'));
    expect((await alice.list()).map((i) => i.clientId)).toEqual(['a1']);
    const sent: string[] = [];
    await bob.flush(async (item) => {
      sent.push(item.clientId);
      return true;
    });
    expect(sent).toEqual(['b1']);
    await alice.clear();
    expect(await store.getAll()).toEqual([]);
  });

  it('builds an optimistic queued bubble', async () => {
    const q = makeQueue();
    const item = await q.enqueue({ ...payload('opt'), silent: true }, 42);
    const m = toOptimisticMessage(item, 'vlad');
    expect(m).toMatchObject({ id: 'opt', sender: 'vlad', timestamp: 42, queued: true, pending: true, silent: true });
  });
});
