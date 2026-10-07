/**
 * End-to-end encryption for secret chats.
 *
 * - Identity keys: ECDH P-256 (Web Crypto).
 * - Session key:   ECDH shared secret → HKDF-SHA-256 (info = room id) → AES-GCM 256.
 * - Messages:      AES-GCM with a random 96-bit IV; the server only ever stores
 *                  the `EncryptedPayload` envelope and an empty `text`.
 *
 * Works in browsers and in Node ≥ 20 (`globalThis.crypto.subtle`), which makes
 * the whole pipeline unit-testable in Vitest.
 */
import type { EncryptedPayload, Message, SecretChatTtl } from '../types';

export const E2EE_ALG = 'ECDH-P256+AES-GCM-256' as const;

/** Self-destruct timers offered in the secret chat UI. */
export const SECRET_TTL_OPTIONS: ReadonlyArray<{ value: SecretChatTtl; label: string }> = [
  { value: 10, label: '10 сек' },
  { value: 60, label: '1 мин' },
  { value: 3600, label: '1 час' },
  { value: 86400, label: '1 день' },
];

const subtle = (): SubtleCrypto => {
  const s = globalThis.crypto?.subtle;
  if (!s) throw new Error('Web Crypto API недоступен (требуется HTTPS или localhost)');
  return s;
};

const enc = new TextEncoder();
const dec = new TextDecoder();

export function bytesToBase64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = '';
  for (let i = 0; i < arr.length; i += 1) bin += String.fromCharCode(arr[i]);
  return btoa(bin);
}

export function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

/** Generates a fresh ECDH P-256 identity key pair. The private key is non-extractable. */
export async function generateIdentityKeyPair(): Promise<CryptoKeyPair> {
  const pair = (await subtle().generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, [
    'deriveBits',
  ])) as CryptoKeyPair;
  return pair;
}

/** Raw uncompressed public key point, base64 encoded (65 bytes → 88 chars). */
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  return bytesToBase64(await subtle().exportKey('raw', key));
}

export async function importPublicKey(b64: string): Promise<CryptoKey> {
  const raw = base64ToBytes(b64);
  if (raw.length !== 65 || raw[0] !== 0x04) throw new Error('Некорректный публичный ключ P-256');
  return subtle().importKey('raw', raw, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
}

/** Short key id: first 16 hex chars of SHA-256(raw public key). Shown as the safety fingerprint. */
export async function keyFingerprint(publicKeyB64: string): Promise<string> {
  const digest = await subtle().digest('SHA-256', base64ToBytes(publicKeyB64));
  return Array.from(new Uint8Array(digest))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Derives the per-room AES-GCM 256 key. Both peers derive the same key from
 * (own private, peer public). `context` (room id) separates keys between chats.
 */
export async function deriveSessionKey(
  ownPrivateKey: CryptoKey,
  peerPublicKey: CryptoKey,
  context: string,
): Promise<CryptoKey> {
  const shared = await subtle().deriveBits({ name: 'ECDH', public: peerPublicKey }, ownPrivateKey, 256);
  const hkdfKey = await subtle().importKey('raw', shared, 'HKDF', false, ['deriveKey']);
  return subtle().deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: enc.encode('secure-comms/e2ee/v1'), info: enc.encode(context) },
    hkdfKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptText(key: CryptoKey, plaintext: string, kid: string): Promise<EncryptedPayload> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = await subtle().encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  return { alg: E2EE_ALG, iv: bytesToBase64(iv), ct: bytesToBase64(ct), kid };
}

/** Throws if the payload was tampered with or encrypted under another key. */
export async function decryptText(key: CryptoKey, payload: EncryptedPayload): Promise<string> {
  if (payload.alg !== E2EE_ALG) throw new Error(`Неподдерживаемый алгоритм: ${payload.alg}`);
  const pt = await subtle().decrypt({ name: 'AES-GCM', iv: base64ToBytes(payload.iv) }, key, base64ToBytes(payload.ct));
  return dec.decode(pt);
}

/** Structural check used by both client and server before trusting an envelope. */
export function isEncryptedPayload(v: unknown): v is EncryptedPayload {
  if (!v || typeof v !== 'object') return false;
  const p = v as Record<string, unknown>;
  return (
    p.alg === E2EE_ALG &&
    typeof p.iv === 'string' &&
    typeof p.ct === 'string' &&
    typeof p.kid === 'string' &&
    p.iv.length <= 32 &&
    p.ct.length <= 64 * 1024 &&
    p.kid.length <= 64
  );
}

export function isValidTtl(v: unknown): v is SecretChatTtl {
  return SECRET_TTL_OPTIONS.some((o) => o.value === v);
}

export function computeExpiry(ttl: SecretChatTtl | undefined, sentAt: number): number | undefined {
  return ttl ? sentAt + ttl * 1000 : undefined;
}

export function isMessageExpired(m: Pick<Message, 'expiresAt'>, now = Date.now()): boolean {
  return typeof m.expiresAt === 'number' && m.expiresAt <= now;
}

/** "9с", "59с", "12м", "3ч", "1д" — compact countdown shown on self-destructing bubbles. */
export function formatTtlRemaining(expiresAt: number, now = Date.now()): string {
  const s = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  if (s < 60) return `${s}с`;
  if (s < 3600) return `${Math.ceil(s / 60)}м`;
  if (s < 86400) return `${Math.ceil(s / 3600)}ч`;
  return `${Math.ceil(s / 86400)}д`;
}
