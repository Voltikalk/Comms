/**
 * E2EE session manager for secret chats.
 *
 * - Each account/device has an ECDH P-256 identity; the private key is a
 *   non-extractable CryptoKey persisted in IndexedDB (`e2ee-keys`).
 * - Only the raw public key is published to the server (`e2ee_publish_key`).
 * - Per room, both peers derive the same AES-GCM 256 key from
 *   (own private, peer public) + HKDF(info = roomId).
 * - `kid` = "<sender fp>:<recipient fp>" lets the receiver detect messages
 *   encrypted under a stale identity without trying to decrypt garbage.
 */
import type { EncryptedPayload, Room, UserId } from '../types';
import {
  decryptText,
  deriveSessionKey,
  encryptText,
  exportPublicKey,
  generateIdentityKeyPair,
  importPublicKey,
  keyFingerprint,
} from './e2ee';
import { createPersistentStore, type KeyValueStore } from './idb-store';

export interface StoredIdentity {
  privateKey: CryptoKey;
  publicKey: string;
  createdAt: number;
}

export type StoredKey = StoredIdentity | { peerPublicKey: string; updatedAt: number };

export interface SecretSessionDeps {
  /** Resolves the peer's published key (`e2ee_get_key`); `null` if unknown / offline. */
  fetchPeerKey: (userId: UserId) => Promise<string | null>;
  store?: KeyValueStore<StoredKey>;
  /** Cross-tab lock so two tabs never generate two identities at once. */
  withLock?: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
}

export type SecretChatErrorCode = 'no-peer-key' | 'stale-key';

export class SecretChatError extends Error {
  readonly code: SecretChatErrorCode;

  constructor(message: string, code: SecretChatErrorCode) {
    super(message);
    this.name = 'SecretChatError';
    this.code = code;
  }
}

interface RoomSession {
  key: CryptoKey;
  ownFp: string;
  peerFp: string;
  peerPublicKey: string;
}

export const isSecretRoom = (room: Pick<Room, 'id' | 'secret'> | null | undefined): boolean =>
  Boolean(room && (room.secret || room.id.startsWith('secret-')));

export function secretPeer(room: Pick<Room, 'participants'>, self: UserId): UserId | null {
  return room.participants.find((p) => p !== self) ?? null;
}

const identityKey = (user: UserId) => `identity:${user}`;
const peerKey = (user: UserId) => `peer:${user}`;

export class SecretSessionManager {
  private readonly user: UserId;
  private readonly deps: SecretSessionDeps;
  private readonly store: KeyValueStore<StoredKey>;
  private identity: Promise<StoredIdentity> | null = null;
  private readonly sessions = new Map<string, Promise<RoomSession>>();
  private readonly peerKeys = new Map<UserId, string>();
  private readonly sessionPeers = new Map<string, UserId>();

  constructor(user: UserId, deps: SecretSessionDeps) {
    this.user = user;
    this.deps = deps;
    this.store = deps.store ?? createPersistentStore<StoredKey>('e2ee-keys');
  }

  /** Loads (or creates once) this device's identity key pair. */
  getIdentity(): Promise<StoredIdentity> {
    if (!this.identity) {
      const run = async () => {
        const saved = await this.store.get(identityKey(this.user));
        if (saved && 'privateKey' in saved) return saved;
        const pair = await generateIdentityKeyPair();
        const created: StoredIdentity = {
          privateKey: pair.privateKey,
          publicKey: await exportPublicKey(pair.publicKey),
          createdAt: Date.now(),
        };
        await this.store.put(identityKey(this.user), created);
        return created;
      };
      const lock = this.deps.withLock;
      this.identity = (lock ? lock(`secure-comms-e2ee-${this.user}`, run) : run()).catch((err: unknown) => {
        this.identity = null;
        throw err;
      });
    }
    return this.identity;
  }

  async getPublicKey(): Promise<string> {
    return (await this.getIdentity()).publicKey;
  }

  /** Called on `e2ee_key_updated`: drops cached sessions with that peer. */
  updatePeerKey(userId: UserId, publicKey: string | null, invalidate = true): void {
    if (publicKey) {
      if (this.peerKeys.get(userId) === publicKey) return;
      this.peerKeys.set(userId, publicKey);
      void this.store.put(peerKey(userId), { peerPublicKey: publicKey, updatedAt: Date.now() });
    } else {
      this.peerKeys.delete(userId);
    }
    if (!invalidate) return;
    for (const roomId of [...this.sessions.keys()]) {
      if (this.sessionPeers.get(roomId) === userId) this.sessions.delete(roomId);
    }
  }

  private async resolvePeerKey(userId: UserId): Promise<string | null> {
    const fresh = await this.deps.fetchPeerKey(userId).catch(() => null);
    if (fresh) {
      // First sighting must not drop the session that is being derived right now.
      this.updatePeerKey(userId, fresh, this.peerKeys.has(userId));
      return fresh;
    }
    const cached = this.peerKeys.get(userId);
    if (cached) return cached;
    // Offline: fall back to the last key we saw for this peer.
    const stored = await this.store.get(peerKey(userId));
    if (stored && 'peerPublicKey' in stored) {
      this.peerKeys.set(userId, stored.peerPublicKey);
      return stored.peerPublicKey;
    }
    return null;
  }

  private session(roomId: string, peer: UserId): Promise<RoomSession> {
    let s = this.sessions.get(roomId);
    if (!s) {
      s = (async () => {
        const [identity, peerPublicKey] = await Promise.all([this.getIdentity(), this.resolvePeerKey(peer)]);
        if (!peerPublicKey) {
          throw new SecretChatError('Собеседник ещё не открыл секретный чат на своём устройстве. Попробуйте позже.', 'no-peer-key');
        }
        const key = await deriveSessionKey(identity.privateKey, await importPublicKey(peerPublicKey), roomId);
        const [ownFp, peerFp] = await Promise.all([keyFingerprint(identity.publicKey), keyFingerprint(peerPublicKey)]);
        return { key, ownFp, peerFp, peerPublicKey };
      })();
      s.catch(() => this.sessions.delete(roomId));
      this.sessions.set(roomId, s);
      this.sessionPeers.set(roomId, peer);
    }
    return s;
  }

  async encrypt(roomId: string, peer: UserId, plaintext: string): Promise<EncryptedPayload> {
    const s = await this.session(roomId, peer);
    return encryptText(s.key, plaintext, `${s.ownFp}:${s.peerFp}`);
  }

  async decrypt(roomId: string, peer: UserId, payload: EncryptedPayload): Promise<string> {
    const s = await this.session(roomId, peer);
    const fps = payload.kid.split(':');
    if (fps.length === 2 && !(fps.includes(s.ownFp) && fps.includes(s.peerFp))) {
      throw new SecretChatError('Сообщение зашифровано другим ключом.', 'stale-key');
    }
    return decryptText(s.key, payload);
  }

  /**
   * Safety number shown to both peers: identical on both sides
   * (sorted fingerprints), changes if either side re-keys.
   */
  async fingerprint(roomId: string, peer: UserId): Promise<string> {
    const s = await this.session(roomId, peer);
    return [s.ownFp, s.peerFp].sort().join('');
  }
}

/** Groups a fingerprint into blocks of 4 for display: "a1b2 c3d4 …". */
export function formatFingerprint(fp: string): string {
  return (fp.match(/.{1,4}/g) ?? []).join(' ');
}

/**
 * Telegram-style 8×8 "encryption key" identicon: every hex nibble yields two
 * 2-bit cells (palette index 0–3). Both peers see the same picture iff their
 * keys match. Short fingerprints are cycled to fill 64 cells.
 */
export function fingerprintGrid(fp: string): number[] {
  const nibbles = (fp.toLowerCase().match(/[0-9a-f]/g) ?? []).map((c) => parseInt(c, 16));
  if (!nibbles.length) return Array<number>(64).fill(0);
  const cells: number[] = [];
  for (let i = 0; cells.length < 64; i += 1) {
    const n = nibbles[i % nibbles.length];
    cells.push(n >> 2, n & 3);
  }
  return cells;
}
