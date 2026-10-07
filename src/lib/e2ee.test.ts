import { describe, it, expect } from 'vitest';
import {
  computeExpiry,
  decryptText,
  deriveSessionKey,
  encryptText,
  exportPublicKey,
  formatTtlRemaining,
  generateIdentityKeyPair,
  importPublicKey,
  isEncryptedPayload,
  isMessageExpired,
  isValidTtl,
  keyFingerprint,
  E2EE_ALG,
} from './e2ee';

async function pairUp(room = 'room-1') {
  const alice = await generateIdentityKeyPair();
  const bob = await generateIdentityKeyPair();
  const alicePub = await exportPublicKey(alice.publicKey);
  const bobPub = await exportPublicKey(bob.publicKey);
  const kA = await deriveSessionKey(alice.privateKey, await importPublicKey(bobPub), room);
  const kB = await deriveSessionKey(bob.privateKey, await importPublicKey(alicePub), room);
  return { alice, bob, alicePub, bobPub, kA, kB };
}

describe('E2EE (ECDH P-256 + AES-GCM 256)', () => {
  it('exports a 65-byte uncompressed public key', async () => {
    const { alicePub } = await pairUp();
    expect(atob(alicePub)).toHaveLength(65);
    await expect(importPublicKey(btoa('short'))).rejects.toThrow();
  });

  it('both peers derive the same session key and can round-trip text', async () => {
    const { kA, kB, alicePub } = await pairUp();
    const kid = await keyFingerprint(alicePub);
    const env = await encryptText(kA, 'Привет, это секрет 🔐', kid);
    expect(env.alg).toBe(E2EE_ALG);
    expect(env.ct).not.toContain('Привет');
    expect(await decryptText(kB, env)).toBe('Привет, это секрет 🔐');
  });

  it('uses a fresh IV for every message', async () => {
    const { kA } = await pairUp();
    const a = await encryptText(kA, 'same', 'k');
    const b = await encryptText(kA, 'same', 'k');
    expect(a.iv).not.toBe(b.iv);
    expect(a.ct).not.toBe(b.ct);
  });

  it('rejects tampered ciphertext (GCM auth tag)', async () => {
    const { kA, kB } = await pairUp();
    const env = await encryptText(kA, 'integrity', 'k');
    const bytes = Uint8Array.from(atob(env.ct), (c) => c.charCodeAt(0));
    bytes[0] ^= 0xff;
    const tampered = { ...env, ct: btoa(String.fromCharCode(...bytes)) };
    await expect(decryptText(kB, tampered)).rejects.toThrow();
  });

  it('separates keys per room (HKDF info)', async () => {
    const alice = await generateIdentityKeyPair();
    const bob = await generateIdentityKeyPair();
    const bobPub = await importPublicKey(await exportPublicKey(bob.publicKey));
    const alicePub = await importPublicKey(await exportPublicKey(alice.publicKey));
    const k1 = await deriveSessionKey(alice.privateKey, bobPub, 'room-1');
    const k2 = await deriveSessionKey(bob.privateKey, alicePub, 'room-2');
    const env = await encryptText(k1, 'x', 'k');
    await expect(decryptText(k2, env)).rejects.toThrow();
  });

  it('a third party cannot decrypt', async () => {
    const { kA, alicePub } = await pairUp();
    const eve = await generateIdentityKeyPair();
    const kE = await deriveSessionKey(eve.privateKey, await importPublicKey(alicePub), 'room-1');
    const env = await encryptText(kA, 'secret', 'k');
    await expect(decryptText(kE, env)).rejects.toThrow();
  });

  it('fingerprints are 16 hex chars and stable', async () => {
    const { alicePub } = await pairUp();
    const f1 = await keyFingerprint(alicePub);
    expect(f1).toMatch(/^[0-9a-f]{16}$/);
    expect(await keyFingerprint(alicePub)).toBe(f1);
  });

  it('validates envelope shape', () => {
    expect(isEncryptedPayload({ alg: E2EE_ALG, iv: 'a', ct: 'b', kid: 'c' })).toBe(true);
    expect(isEncryptedPayload({ alg: 'none', iv: 'a', ct: 'b', kid: 'c' })).toBe(false);
    expect(isEncryptedPayload({ alg: E2EE_ALG, iv: 'a', ct: 1, kid: 'c' })).toBe(false);
    expect(isEncryptedPayload(null)).toBe(false);
  });
});

describe('self-destruct timers', () => {
  it('accepts only 10s, 1m, 1h, 1d', () => {
    expect([10, 60, 3600, 86400].every(isValidTtl)).toBe(true);
    expect(isValidTtl(5)).toBe(false);
    expect(isValidTtl('60')).toBe(false);
  });

  it('computes expiry and detects expired messages', () => {
    expect(computeExpiry(10, 1000)).toBe(11_000);
    expect(computeExpiry(undefined, 1000)).toBeUndefined();
    expect(isMessageExpired({ expiresAt: 5 }, 10)).toBe(true);
    expect(isMessageExpired({ expiresAt: 50 }, 10)).toBe(false);
    expect(isMessageExpired({}, 10)).toBe(false);
  });

  it('formats remaining time compactly', () => {
    expect(formatTtlRemaining(9_500, 0)).toBe('10с');
    expect(formatTtlRemaining(120_000, 0)).toBe('2м');
    expect(formatTtlRemaining(2 * 3600_000, 0)).toBe('2ч');
    expect(formatTtlRemaining(86400_000, 0)).toBe('1д');
    expect(formatTtlRemaining(0, 10)).toBe('0с');
  });
});
