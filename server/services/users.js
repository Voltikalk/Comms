/**
 * User directory: in-memory auth cache (preset seed accounts + Supabase users).
 * Lookups are keyed by userId, uuid, email and username (all lower-case).
 */
import bcrypt from 'bcryptjs';
import { supabase } from './supabase.js';

/**
 * Legacy preset socket keys (dev only, see socketAuth). Bare usernames are
 * intentionally NOT accepted — knowing a login must never be enough to connect.
 */
export const AUTH_KEYS = {
  vladpass: 'vlad',
  anyapass: 'anya',
  mompass: 'mom',
  dadpass: 'dad',
  sispass: 'sister',
  sisterpass: 'sister',
};

export const memoryUsers = new Map();

const SEED_USERS = [
  { userId: 'vlad', email: 'vlad@telegram.org', username: 'vlad', pass: 'vladpass', firstName: 'Влад', lastName: '', bio: '⚡ Всегда на связи', statusEmoji: '⚡' },
  { userId: 'anya', email: 'anya@telegram.org', username: 'anya', pass: 'anyapass', firstName: 'Аня', lastName: '❤️', bio: 'Люблю Влада ❤️', statusEmoji: '❤️' },
  { userId: 'mom', email: 'mom@telegram.org', username: 'mom', pass: 'mompass', firstName: 'Мама', lastName: '', bio: 'Всегда на связи ☕', statusEmoji: '🌸' },
  { userId: 'dad', email: 'dad@telegram.org', username: 'dad', pass: 'dadpass', firstName: 'Папа', lastName: '', bio: 'На работе 🚗', statusEmoji: '🔧' },
  { userId: 'sister', email: 'sister@telegram.org', username: 'sister', pass: 'sispass', firstName: 'Сестра', lastName: '', bio: 'Слушаю музыку 🎧', statusEmoji: '✨' },
];

export function cacheUser(user) {
  if (user.userId) memoryUsers.set(String(user.userId).toLowerCase(), user);
  if (user.id) memoryUsers.set(user.id, user);
  if (user.email) memoryUsers.set(user.email.toLowerCase(), user);
  if (user.username) memoryUsers.set(user.username.toLowerCase(), user);
  return user;
}

export function getUser(key) {
  if (!key) return undefined;
  return memoryUsers.get(String(key).toLowerCase()) || memoryUsers.get(key);
}

/** Maps a Supabase `users` row to the in-memory user document. */
export function mapDbUser(u) {
  return {
    id: u.id,
    userId: u.username || u.id,
    email: (u.email || '').toLowerCase(),
    username: (u.username || '').toLowerCase(),
    passwordHash: u.password_hash || '',
    cloudPasswordHash: u.cloud_password_hash || '',
    cloudPasswordHint: u.cloud_password_hint || '',
    isActive: u.is_active !== false,
    firstName: u.display_name || u.username,
    lastName: '',
    bio: u.bio || '',
    avatarUrl: u.avatar_url || '',
    statusEmoji: '✨',
    createdAt: u.created_at ? new Date(u.created_at) : new Date(),
    updatedAt: u.updated_at ? new Date(u.updated_at) : new Date(),
  };
}

let usersReady = null;

/** Seeds preset accounts and loads Supabase users. Idempotent. */
export function initUsers() {
  if (usersReady) return usersReady;
  usersReady = (async () => {
    for (const u of SEED_USERS) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(u.pass, salt);
      cacheUser({
        id: u.userId,
        userId: u.userId,
        email: u.email.toLowerCase(),
        username: u.username.toLowerCase(),
        passwordHash,
        cloudPasswordHash: '',
        cloudPasswordHint: '',
        isActive: true,
        firstName: u.firstName,
        lastName: u.lastName,
        bio: u.bio,
        avatarUrl: '',
        statusEmoji: u.statusEmoji,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    try {
      const { data: dbUsers, error } = await supabase.from('users').select('*');
      if (!error && dbUsers) {
        for (const row of dbUsers) {
          const existing = getUser(row.username || row.id);
          const mapped = mapDbUser(row);
          // Preset accounts keep their local hash if the DB has none.
          if (existing && !mapped.passwordHash) mapped.passwordHash = existing.passwordHash;
          cacheUser(mapped);
        }
        console.log(`[Supabase Auth] Loaded ${dbUsers.length} users into auth cache.`);
      }
    } catch (err) {
      console.warn('[Supabase Auth Warning] Could not load users from Supabase:', err.message);
    }
  })();
  return usersReady;
}

/** Finds a user by login (username or email) in cache, then in Supabase. */
export async function findUserForLogin(cleanInput) {
  let user = getUser(cleanInput);
  if (user) return user;
  try {
    const sanitizedInput = cleanInput.replace(/[%.,()]/g, '');
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('*')
      .or(`username.eq.${sanitizedInput},email.eq.${sanitizedInput}`)
      .maybeSingle();
    if (dbUser && !error) {
      user = cacheUser(mapDbUser(dbUser));
    }
  } catch (err) {
    console.warn('[Login DB lookup error]', err.message);
  }
  return user;
}

export function sanitizeUser(user) {
  return {
    userId: user.userId,
    email: user.email,
    username: user.username,
    createdAt: user.createdAt || new Date(),
    updatedAt: user.updatedAt || new Date(),
    lastLogin: user.lastLogin || null,
    isActive: user.isActive !== false,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    bio: user.bio || '',
    phoneNumber: user.phoneNumber || '',
    avatarUrl: user.avatarUrl || '',
    statusEmoji: user.statusEmoji || '',
    hasCloudPassword: Boolean(user.cloudPasswordHash),
  };
}

export const displayNameOf = (doc, fallback) =>
  doc ? (`${doc.firstName || ''} ${doc.lastName || ''}`.trim() || doc.username) : fallback;

/** Shared by the REST and socket user search. */
export async function searchUsers(query, currentUserId, isOnline) {
  const q = String(query || '').trim().toLowerCase();
  const current = String(currentUserId || '').trim().toLowerCase();
  if (!q) return [];

  const resultsMap = new Map();
  const sanitizedQ = q.replace(/[^a-zA-Z0-9а-яА-ЯёЁ _-]/g, '').trim();
  if (sanitizedQ) {
    try {
      const { data: dbUsers } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url, bio, is_active')
        .or(`username.ilike.%${sanitizedQ}%,display_name.ilike.%${sanitizedQ}%`)
        .limit(25);
      if (dbUsers) {
        dbUsers.forEach((u) => {
          const uName = (u.username || '').toLowerCase();
          if (uName && uName !== current && u.id !== current) {
            resultsMap.set(uName, {
              userId: u.username,
              username: u.username,
              displayName: u.display_name || u.username,
              avatarUrl: u.avatar_url || '',
              bio: u.bio || '',
              isOnline: isOnline(u.username),
            });
          }
        });
      }
    } catch {
      // Supabase search fallback
    }
  }

  for (const [key, user] of memoryUsers.entries()) {
    if (key !== user.username) continue;
    const uName = (user.username || '').toLowerCase();
    if (uName === current || String(user.userId).toLowerCase() === current) continue;
    const dName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
    if ((uName.includes(q) || dName.includes(q)) && !resultsMap.has(uName)) {
      resultsMap.set(uName, {
        userId: user.username,
        username: user.username,
        displayName: displayNameOf(user, user.username),
        avatarUrl: user.avatarUrl || '',
        bio: user.bio || '',
        isOnline: isOnline(user.username),
      });
    }
  }
  return Array.from(resultsMap.values());
}
