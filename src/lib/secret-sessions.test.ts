import { describe, expect, it } from 'vitest';
import { createMemoryStore } from './idb-store';
import {
  SecretChatError,
  SecretSessionManager,
  fingerprintGrid,
  formatFingerprint,
  isSecretRoom,
  secretPeer,
  type StoredKey,
} from './secret-sessions';

const ROOM = 'secret-alice-bob';

/** Two devices talking through a fake key directory (the server's `e2ee_get_key`). */
function pair() {
  const directory = new Map<string, string>();
  const fetchPeerKey = async (userId: string) => directory.get(userId) ?? null;
  const aliceStore = createMemoryStore<StoredKey>();
  const alice = new SecretSessionManager('alice', { fetchPeerKey, store: aliceStore });
  const bob = new SecretSessionManager('bob', { fetchPeerKey, store: createMemoryStore<StoredKey>() });
  const publish = async () => {
    directory.set('alice', await alice.getPublicKey());
    directory.set('bob', await bob.getPublicKey());
  };
  return { alice, bob, aliceStore, directory, publish, fetchPeerKey };
}

describe('SecretSessionManager', () => {
  it('both peers derive the same key: ciphertext round-trips, server sees no plaintext', async () => {
    const { alice, bob, publish } = pair();
    await publish();
    const envelope = await alice.encrypt(ROOM, 'bob', 'встреча в 7');
    expect(JSON.stringify(envelope)).not.toContain('встреча');
    expect(envelope.kid).toMatch(/^[0-9a-f]{16}:[0-9a-f]{16}$/);
    expect(await bob.decrypt(ROOM, 'alice', envelope)).toBe('встреча в 7');
    // The sender can read its own message back as well.
    expect(await alice.decrypt(ROOM, 'bob', envelope)).toBe('встреча в 7');
  });

  it('shows the same safety fingerprint on both devices', async () => {
    const { alice, bob, publish } = pair();
    await publish();
    const a = await alice.fingerprint(ROOM, 'bob');
    expect(a).toHaveLength(32);
    expect(await bob.fingerprint(ROOM, 'alice')).toBe(a);
    expect(formatFingerprint(a).split(' ')).toHaveLength(8);
  });

  it('keys are bound to the room: another chat cannot decrypt', async () => {
    const { alice, bob, publish } = pair();
    await publish();
    const envelope = await alice.encrypt(ROOM, 'bob', 'secret');
    await expect(bob.decrypt('secret-other-room', 'alice', envelope)).rejects.toThrow();
  });

  it('persists the identity so a reload keeps the same public key', async () => {
    const { alice, aliceStore, fetchPeerKey } = pair();
    const first = await alice.getPublicKey();
    const reloaded = new SecretSessionManager('alice', { fetchPeerKey, store: aliceStore });
    expect(await reloaded.getPublicKey()).toBe(first);
  });

  it('fails clearly when the peer has never published a key', async () => {
    const { alice } = pair();
    await expect(alice.encrypt(ROOM, 'bob', 'x')).rejects.toBeInstanceOf(SecretChatError);
  });

  it('re-derives after the peer re-keys and rejects stale envelopes by kid', async () => {
    const { alice, bob, directory, publish, fetchPeerKey } = pair();
    await publish();
    const old = await alice.encrypt(ROOM, 'bob', 'old');

    // Bob reinstalls: a brand-new identity on a fresh device store.
    const bob2 = new SecretSessionManager('bob', { fetchPeerKey, store: createMemoryStore<StoredKey>() });
    directory.set('bob', await bob2.getPublicKey());
    alice.updatePeerKey('bob', directory.get('bob')!);

    const fresh = await alice.encrypt(ROOM, 'bob', 'new');
    expect(await bob2.decrypt(ROOM, 'alice', fresh)).toBe('new');
    await expect(bob2.decrypt(ROOM, 'alice', old)).rejects.toBeInstanceOf(SecretChatError);
    expect(bob).toBeDefined();
  });

  it('falls back to the last known peer key while offline', async () => {
    const { alice, bob, aliceStore, publish, directory } = pair();
    await publish();
    // Both sides have talked once (bob's session is cached in memory).
    expect(await bob.decrypt(ROOM, 'alice', await alice.encrypt(ROOM, 'bob', 'warm-up'))).toBe('warm-up');
    directory.clear();
    const offline = new SecretSessionManager('alice', { fetchPeerKey: async () => null, store: aliceStore });
    const envelope = await offline.encrypt(ROOM, 'bob', 'offline');
    expect(await bob.decrypt(ROOM, 'alice', envelope)).toBe('offline');
  });

  it('detects secret rooms and their peer', () => {
    expect(isSecretRoom({ id: 'secret-a-b' })).toBe(true);
    expect(isSecretRoom({ id: 'dm-a-b', secret: true })).toBe(true);
    expect(isSecretRoom({ id: 'dm-a-b' })).toBe(false);
    expect(isSecretRoom(null)).toBe(false);
    expect(secretPeer({ participants: ['a', 'b'] }, 'a')).toBe('b');
  });
});

describe('fingerprintGrid', () => {
  it('maps every nibble into two 2-bit palette cells (8×8)', () => {
    const grid = fingerprintGrid('f0'.repeat(16));
    expect(grid).toHaveLength(64);
    expect(grid.slice(0, 4)).toEqual([3, 3, 0, 0]);
    expect(grid.every((c) => c >= 0 && c <= 3)).toBe(true);
  });

  it('is deterministic and differs for different keys', () => {
    const a = fingerprintGrid('0123456789abcdef0123456789abcdef');
    expect(fingerprintGrid('0123456789abcdef0123456789abcdef')).toEqual(a);
    expect(fingerprintGrid('fedcba9876543210fedcba9876543210')).not.toEqual(a);
  });

  it('handles empty input', () => {
    expect(fingerprintGrid('')).toEqual(Array(64).fill(0));
  });
});
