import { supabase } from '../lib/supabase/client';
import { dbCache } from '../lib/supabase/cache';
import { SUPABASE_CONFIG } from '../lib/supabase/config';
import type { User as SupabaseUser, Session as SupabaseSession, AuthError } from '@supabase/supabase-js';
import type { User as DbUser } from '../lib/supabase/types';

export interface RegisterParams {
  email: string;
  username: string;
  password: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
}

export interface AuthResponse {
  user: SupabaseUser | null;
  session: SupabaseSession | null;
  profile: DbUser | null;
  error: string | null;
}

/**
 * 1. Register a new user with Supabase Auth & create database profile
 */
export async function registerUser(params: RegisterParams): Promise<AuthResponse> {
  const { email, username, password, displayName, avatarUrl, bio } = params;

  // Validation
  const cleanEmail = email.trim().toLowerCase();
  const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');

  if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
    return { user: null, session: null, profile: null, error: 'Введите корректный адрес электронной почты.' };
  }
  if (!cleanUsername || cleanUsername.length < 3) {
    return { user: null, session: null, profile: null, error: 'Username должен содержать минимум 3 символа.' };
  }
  if (password.length < 6) {
    return { user: null, session: null, profile: null, error: 'Пароль должен содержать минимум 6 символов.' };
  }

  // Check unique username in public.users
  const { data: existingUsername } = await supabase
    .from('users')
    .select('id')
    .eq('username', cleanUsername)
    .maybeSingle();

  if (existingUsername) {
    return { user: null, session: null, profile: null, error: 'Этот username уже занят.' };
  }

  try {
    // 1. Supabase Auth sign up
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          username: cleanUsername,
          display_name: displayName || cleanUsername,
        },
      },
    });

    if (authError || !authData.user) {
      return {
        user: null,
        session: null,
        profile: null,
        error: authError?.message || 'Ошибка создания учетной записи.',
      };
    }

    // 2. Insert user profile into public.users table
    const newProfile: DbUser = {
      id: authData.user.id,
      email: cleanEmail,
      username: cleanUsername,
      password_hash: 'managed_by_supabase_auth',
      display_name: displayName || cleanUsername,
      avatar_url: avatarUrl || null,
      bio: bio || null,
      is_active: true,
      last_login: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    const { data: savedProfile, error: profileError } = await supabase
      .from('users')
      .upsert(newProfile)
      .select()
      .single();

    if (profileError) {
      console.warn('[registerUser] Profile creation notice:', profileError);
    }

    return {
      user: authData.user,
      session: authData.session,
      profile: savedProfile || newProfile,
      error: null,
    };
  } catch (err: any) {
    return { user: null, session: null, profile: null, error: err.message || 'Сетевая ошибка при регистрации.' };
  }
}

/**
 * 2. Login user with Email or Username and Password
 */
export async function loginUser(emailOrUsername: string, password: string): Promise<AuthResponse> {
  const identifier = emailOrUsername.trim();
  if (!identifier) {
    return { user: null, session: null, profile: null, error: 'Введите email или username.' };
  }
  if (!password) {
    return { user: null, session: null, profile: null, error: 'Введите пароль.' };
  }

  let targetEmail = identifier.toLowerCase();

  // If input is username, resolve email
  if (!identifier.includes('@')) {
    const cleanUsername = identifier.toLowerCase().replace(/^@/, '');
    const { data: userRecord } = await supabase
      .from('users')
      .select('email')
      .eq('username', cleanUsername)
      .maybeSingle();

    if (userRecord?.email) {
      targetEmail = userRecord.email;
    }
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password,
    });

    // Audit Login Attempt
    await supabase.from('login_attempts').insert({
      email: targetEmail,
      success: !authError,
      attempted_at: new Date().toISOString(),
    });

    if (authError || !authData.user) {
      return {
        user: null,
        session: null,
        profile: null,
        error: authError?.message === 'Invalid login credentials'
          ? 'Неверный логин или пароль.'
          : (authError?.message || 'Ошибка входа.'),
      };
    }

    // Update last_login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', authData.user.id);

    // Invalidate & fetch profile
    dbCache.invalidate(`user:${authData.user.id}`);
    const profile = await getUserProfile(authData.user.id);

    return {
      user: authData.user,
      session: authData.session,
      profile,
      error: null,
    };
  } catch (err: any) {
    return { user: null, session: null, profile: null, error: err.message || 'Сетевая ошибка при авторизации.' };
  }
}

/**
 * 3. Logout User & clear local state
 */
export async function logoutUser(): Promise<{ error: AuthError | null }> {
  dbCache.clear();
  return await supabase.auth.signOut();
}

/**
 * 4. Refresh Active Session
 */
export async function refreshSession(): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.user) {
      return { user: null, session: null, profile: null, error: error?.message || 'Сессия истекла' };
    }

    const profile = await getUserProfile(data.user.id);
    return {
      user: data.user,
      session: data.session,
      profile,
      error: null,
    };
  } catch (err: any) {
    return { user: null, session: null, profile: null, error: err.message };
  }
}

/**
 * 5. Reset Password for Email
 */
export async function resetPassword(email: string): Promise<{ success: boolean; error: string | null }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
    return { success: false, error: 'Введите корректный email.' };
  }

  const redirectUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/reset-password`
    : undefined;

  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: redirectUrl,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * 6. Update Password for authenticated user
 */
export async function updatePassword(newPassword: string): Promise<{ success: boolean; error: string | null }> {
  if (newPassword.length < 6) {
    return { success: false, error: 'Пароль должен содержать не менее 6 символов.' };
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * 7. Get User Profile with Caching
 */
export async function getUserProfile(userId: string): Promise<DbUser | null> {
  const cacheKey = `user:${userId}`;
  return dbCache.getOrFetch(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data) {
        return null;
      }
      return data;
    },
    SUPABASE_CONFIG.cache.userProfileTTL
  );
}

export default {
  registerUser,
  loginUser,
  logoutUser,
  refreshSession,
  resetPassword,
  updatePassword,
  getUserProfile,
};
