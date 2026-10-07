/**
 * Supabase service client.
 *
 * When VITE_SUPABASE_URL is not configured (unit tests, offline dev) an inert
 * chainable stub is exported instead: every query builder call chains, and
 * awaiting it resolves to `{ data: null, error }`, so all callers fall back to
 * the in-memory stores exactly like they do on a network failure.
 */
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from '../config.js';

export const isSupabaseConfigured = Boolean(SUPABASE_URL);

const OFFLINE_ERROR = Object.freeze({ message: 'Supabase is not configured' });

export function createOfflineSupabase() {
  const result = Object.freeze({ data: null, error: OFFLINE_ERROR });
  const handler = {
    get(_target, prop) {
      if (prop === 'then') return (resolve) => resolve(result);
      if (prop === 'data') return null;
      if (prop === 'error') return OFFLINE_ERROR;
      return proxy;
    },
    apply() {
      return proxy;
    },
  };
  const proxy = new Proxy(function offlineSupabase() {}, handler);
  return proxy;
}

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
  : createOfflineSupabase();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (str) => typeof str === 'string' && UUID_RE.test(str);

export async function resolveUserUuid(usernameOrId) {
  if (isUuid(usernameOrId)) return usernameOrId;
  const { data } = await supabase.from('users').select('id').eq('username', usernameOrId).maybeSingle();
  return data?.id || null;
}

const LEGACY_ROOM_NAMES = {
  girlfriend: 'Аня',
  family: 'Семья',
  'mom-dm': 'Мама',
  'dad-dm': 'Папа',
  'sister-dm': 'Сестра',
};

export async function resolveRoomUuid(roomIdOrName) {
  if (isUuid(roomIdOrName)) return roomIdOrName;
  const targetName = LEGACY_ROOM_NAMES[roomIdOrName] || roomIdOrName;
  const { data } = await supabase.from('rooms').select('id').eq('name', targetName).maybeSingle();
  return data?.id || null;
}
