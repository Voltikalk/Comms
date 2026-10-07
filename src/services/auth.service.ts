/**
 * JWT session client.
 *
 * - The access token lives **only in memory** (never in localStorage/sessionStorage).
 * - The refresh token is an `HttpOnly; Secure; SameSite=Strict` cookie scoped to
 *   `/api/auth` — JavaScript never sees it; we just call `/api/auth/refresh`
 *   with `credentials: 'include'`.
 * - The access token is rotated ~1 minute before its 15-minute expiry. Rotation
 *   is serialized across tabs with the Web Locks API so two tabs never replay
 *   the same (single-use) refresh cookie.
 * - Logout is broadcast to the other tabs through a BroadcastChannel.
 */
import type {
  AuthResponse,
  LoginRequest,
  LoginResult,
  RegisterRequest,
  TwoFactorStatus,
  UserSanitized,
} from '../types/auth.types';
import type { AuthSessionInfo } from '../types';

/** Keys written by previous versions that kept tokens in localStorage. */
export const LEGACY_TOKEN_KEYS = [
  'chat_access_token_v2',
  'chat_refresh_token_v2',
  'chat_auth_user_v2',
  'chat_auth_key_v2',
  'comms-supabase-auth-token',
] as const;

const REFRESH_LOCK = 'secure-comms-auth-refresh';
const CHANNEL = 'secure-comms-auth';
/** Rotate this long before expiry. */
const REFRESH_SKEW_MS = 60_000;
const MIN_REFRESH_DELAY_MS = 5_000;

export class AuthError extends Error {
  readonly status: number;
  readonly remaining?: number;
  constructor(message: string, status: number, remaining?: number) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
    this.remaining = remaining;
  }
}

export interface AuthState {
  user: UserSanitized | null;
  accessToken: string | null;
}

type Listener = (state: AuthState) => void;

interface LockManagerLike {
  request<T>(name: string, cb: () => Promise<T>): Promise<T>;
}

interface ChannelLike {
  postMessage(msg: unknown): void;
  onmessage: ((ev: { data: unknown }) => void) | null;
  close(): void;
}

export interface AuthClientDeps {
  baseUrl: string;
  fetch: typeof fetch;
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  locks?: LockManagerLike | null;
  channel?: ChannelLike | null;
  storage?: Pick<Storage, 'removeItem'> | null;
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    const data: unknown = await res.json();
    return data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function toError(res: Response, data: Record<string, unknown>, fallback: string): AuthError {
  const message = typeof data.error === 'string' ? data.error : fallback;
  const remaining = typeof data.remaining === 'number' ? data.remaining : undefined;
  return new AuthError(message, res.status, remaining);
}

export class AuthClient {
  private readonly deps: Required<Omit<AuthClientDeps, 'locks' | 'channel' | 'storage'>> &
    Pick<AuthClientDeps, 'locks' | 'channel' | 'storage'>;
  private accessToken: string | null = null;
  private user: UserSanitized | null = null;
  private timer: unknown = null;
  private refreshing: Promise<AuthResponse | null> | null = null;
  private readonly listeners = new Set<Listener>();

  constructor(deps: AuthClientDeps) {
    this.deps = {
      now: () => Date.now(),
      setTimer: (fn, ms) => setTimeout(fn, ms),
      clearTimer: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
      ...deps,
    };
    if (this.deps.channel) {
      this.deps.channel.onmessage = (ev) => {
        if ((ev.data as { type?: string } | null)?.type === 'logout') this.clearLocal();
      };
    }
    this.purgeLegacyStorage();
  }

  // ===== State =====

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getUser(): UserSanitized | null {
    return this.user;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const state: AuthState = { user: this.user, accessToken: this.accessToken };
    for (const l of this.listeners) l(state);
  }

  /** Removes tokens persisted by older builds (XSS-readable). */
  purgeLegacyStorage(): void {
    const s = this.deps.storage;
    if (!s) return;
    for (const key of LEGACY_TOKEN_KEYS) {
      try {
        s.removeItem(key);
      } catch {
        // storage may be unavailable (privacy mode)
      }
    }
  }

  private applySession(data: AuthResponse): AuthResponse {
    this.accessToken = data.tokens.accessToken;
    this.user = data.user;
    this.schedule(data.tokens.expiresIn);
    this.emit();
    return data;
  }

  private schedule(expiresInSec: number): void {
    if (this.timer !== null) this.deps.clearTimer(this.timer);
    const delay = Math.max(MIN_REFRESH_DELAY_MS, expiresInSec * 1000 - REFRESH_SKEW_MS);
    this.timer = this.deps.setTimer(() => {
      this.timer = null;
      void this.refresh();
    }, delay);
  }

  private clearLocal(): void {
    if (this.timer !== null) this.deps.clearTimer(this.timer);
    this.timer = null;
    const had = this.accessToken !== null || this.user !== null;
    this.accessToken = null;
    this.user = null;
    if (had) this.emit();
  }

  // ===== HTTP =====

  private post(path: string, body?: unknown, token?: string | null): Promise<Response> {
    return this.deps.fetch(`${this.deps.baseUrl}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async register(payload: RegisterRequest): Promise<AuthResponse> {
    const res = await this.post('/api/auth/register', payload);
    const data = await readJson(res);
    if (!res.ok) throw toError(res, data, 'Ошибка при регистрации');
    return this.applySession(data as unknown as AuthResponse);
  }

  /** Step 1. Either opens a session or asks for the cloud password. */
  async login(payload: LoginRequest): Promise<LoginResult> {
    const res = await this.post('/api/auth/login', payload);
    const data = await readJson(res);
    if (!res.ok) throw toError(res, data, 'Ошибка при входе');
    if (data.requires2fa === true && typeof data.challenge === 'string') {
      return { kind: '2fa', challenge: data.challenge, hint: typeof data.hint === 'string' ? data.hint : '' };
    }
    return { kind: 'session', session: this.applySession(data as unknown as AuthResponse) };
  }

  /** Step 2 of a login guarded by a cloud password. */
  async verifyTwoFactor(challenge: string, password: string): Promise<AuthResponse> {
    const res = await this.post('/api/auth/2fa/verify', { challenge, password });
    const data = await readJson(res);
    if (!res.ok) throw toError(res, data, 'Неверный облачный пароль');
    return this.applySession(data as unknown as AuthResponse);
  }

  /**
   * Exchanges the HttpOnly refresh cookie for a new access token. Concurrent
   * callers in this tab share one request; tabs are serialized via Web Locks.
   * Resolves `null` (and clears local state) when the session is gone.
   */
  refresh(): Promise<AuthResponse | null> {
    if (this.refreshing) return this.refreshing;
    const run = async (): Promise<AuthResponse | null> => {
      try {
        const res = await this.post('/api/auth/refresh');
        const data = await readJson(res);
        if (!res.ok) {
          // 5xx/network hiccups keep the current token; auth failures end the session.
          if (res.status === 401 || res.status === 403) this.clearLocal();
          return null;
        }
        return this.applySession(data as unknown as AuthResponse);
      } catch {
        return null;
      }
    };
    const locks = this.deps.locks;
    this.refreshing = (locks ? locks.request(REFRESH_LOCK, run) : run()).finally(() => {
      this.refreshing = null;
    });
    return this.refreshing;
  }

  /** Called once on app start: the cookie (if any) restores the session. */
  restore(): Promise<AuthResponse | null> {
    return this.refresh();
  }

  async logout(): Promise<void> {
    const token = this.accessToken;
    try {
      await this.post('/api/auth/logout', undefined, token);
    } catch {
      // offline logout still clears the local session
    } finally {
      this.clearLocal();
      this.deps.channel?.postMessage({ type: 'logout' });
    }
  }

  /** Forget the session locally (e.g. the server kicked this device). */
  dropSession(): void {
    this.clearLocal();
  }

  /** `fetch` with the Bearer token; refreshes once and retries on 401. */
  async authFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const send = (token: string | null) => {
      const headers = new Headers(init.headers);
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return this.deps.fetch(`${this.deps.baseUrl}${path}`, { ...init, headers, credentials: 'include' });
    };
    const res = await send(this.accessToken);
    if (res.status !== 401) return res;
    const renewed = await this.refresh();
    return renewed ? send(renewed.tokens.accessToken) : res;
  }

  private async authJson<T>(path: string, init: RequestInit, fallback: string): Promise<T> {
    const res = await this.authFetch(path, init);
    const data = await readJson(res);
    if (!res.ok) throw toError(res, data, fallback);
    return data as T;
  }

  private jsonInit(body?: unknown): RequestInit {
    return {
      method: 'POST',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    };
  }

  async getMe(): Promise<UserSanitized | null> {
    try {
      const { user } = await this.authJson<{ user: UserSanitized }>('/api/auth/me', {}, 'Не удалось загрузить профиль');
      this.user = user;
      this.emit();
      return user;
    } catch {
      return null;
    }
  }

  // ===== Active sessions =====

  async listSessions(): Promise<AuthSessionInfo[]> {
    const { sessions } = await this.authJson<{ sessions: AuthSessionInfo[] }>(
      '/api/auth/sessions',
      {},
      'Не удалось загрузить сеансы',
    );
    return sessions;
  }

  async terminateOtherSessions(): Promise<number> {
    const { terminated } = await this.authJson<{ terminated: number }>(
      '/api/auth/sessions/terminate-others',
      this.jsonInit(),
      'Не удалось завершить сеансы',
    );
    return terminated;
  }

  async terminateSession(id: string): Promise<void> {
    await this.authJson(`/api/auth/sessions/${encodeURIComponent(id)}/terminate`, this.jsonInit(), 'Не удалось завершить сеанс');
  }

  // ===== Two-step verification (cloud password) =====

  getTwoFactorStatus(): Promise<TwoFactorStatus> {
    return this.authJson<TwoFactorStatus>('/api/auth/2fa', {}, 'Не удалось получить статус 2FA');
  }

  async setCloudPassword(newPassword: string, hint: string, currentPassword?: string): Promise<TwoFactorStatus> {
    const status = await this.authJson<TwoFactorStatus>(
      '/api/auth/2fa/password',
      this.jsonInit({ newPassword, hint, ...(currentPassword ? { currentPassword } : {}) }),
      'Не удалось сохранить облачный пароль',
    );
    if (this.user) {
      this.user = { ...this.user, hasCloudPassword: true };
      this.emit();
    }
    return status;
  }

  async disableCloudPassword(currentPassword: string): Promise<TwoFactorStatus> {
    const status = await this.authJson<TwoFactorStatus>(
      '/api/auth/2fa/disable',
      this.jsonInit({ currentPassword }),
      'Не удалось отключить облачный пароль',
    );
    if (this.user) {
      this.user = { ...this.user, hasCloudPassword: false };
      this.emit();
    }
    return status;
  }
}

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function browserDeps(): AuthClientDeps {
  const hasWindow = typeof window !== 'undefined';
  const locks = typeof navigator !== 'undefined' && 'locks' in navigator ? (navigator.locks as LockManagerLike) : null;
  let channel: ChannelLike | null = null;
  try {
    // MessageEvent satisfies the narrow `{ data }` shape the client reads.
    channel = typeof BroadcastChannel !== 'undefined' ? (new BroadcastChannel(CHANNEL) as unknown as ChannelLike) : null;
  } catch {
    channel = null;
  }
  return {
    baseUrl: hasWindow ? window.location.origin : 'http://localhost:3000',
    fetch: (...args) => globalThis.fetch(...args),
    locks,
    channel,
    storage: hasWindow ? safeLocalStorage() : null,
  };
}

export const authService = new AuthClient(browserDeps());
export default authService;
