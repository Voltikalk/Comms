import React, { useCallback, useEffect, useMemo, useState } from 'react';
import authService, { AuthError } from '../services/auth.service';
import type { RegisterRequest, UserSanitized } from '../types/auth.types';
import type { UserId } from '../types';
import { AuthContext, type AuthContextValue, type AuthStatus, type TwoFactorPrompt } from './contexts';

const message = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);

/**
 * JWT session provider. On start it silently restores the session from the
 * HttpOnly refresh cookie; the access token itself never leaves `authService`.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSanitized | null>(() => authService.getUser());
  const [status, setStatus] = useState<AuthStatus>(() => (authService.getUser() ? 'authenticated' : 'restoring'));
  const [error, setError] = useState<string | null>(null);
  const [twoFactor, setTwoFactor] = useState<TwoFactorPrompt | null>(null);

  useEffect(() => {
    const unsubscribe = authService.subscribe(({ user: next }) => {
      setUser(next);
      setStatus(next ? 'authenticated' : 'anonymous');
    });
    if (!authService.getUser()) {
      authService.restore().then((session) => {
        if (!session) setStatus('anonymous');
      });
    }
    return unsubscribe;
  }, []);

  const login = useCallback(async (identifier: string, password?: string): Promise<boolean> => {
    setError(null);
    const email = identifier.trim().replace(/^@/, '').trim();
    if (!email || !password) {
      setError('Укажите логин и пароль.');
      return false;
    }
    try {
      const result = await authService.login({ email, password });
      if (result.kind === '2fa') {
        setTwoFactor({ challenge: result.challenge, hint: result.hint });
        return false;
      }
      setTwoFactor(null);
      return true;
    } catch (err) {
      setError(message(err, 'Ошибка авторизации'));
      return false;
    }
  }, []);

  const verifyTwoFactor = useCallback(
    async (cloudPassword: string): Promise<boolean> => {
      if (!twoFactor) return false;
      setError(null);
      try {
        await authService.verifyTwoFactor(twoFactor.challenge, cloudPassword);
        setTwoFactor(null);
        return true;
      } catch (err) {
        const remaining = err instanceof AuthError ? err.remaining : undefined;
        setError(message(err, 'Неверный облачный пароль'));
        // An expired / used challenge or a lockout cannot be retried — back to step 1.
        const restart = err instanceof AuthError && (err.status === 429 || (err.status === 401 && remaining === undefined));
        if (restart) setTwoFactor(null);
        else setTwoFactor((prev) => (prev ? { ...prev, remaining } : prev));
        return false;
      }
    },
    [twoFactor],
  );

  const cancelTwoFactor = useCallback(() => {
    setTwoFactor(null);
    setError(null);
  }, []);

  const register = useCallback(async (payload: RegisterRequest): Promise<boolean> => {
    setError(null);
    try {
      await authService.register(payload);
      return true;
    } catch (err) {
      setError(message(err, 'Ошибка при регистрации'));
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    void authService.logout();
    try {
      localStorage.removeItem('chat_active_room_v2');
    } catch {
      // ignore
    }
  }, []);

  const endSession = useCallback((reason?: string) => {
    authService.dropSession();
    if (reason) setError(reason);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      currentUser: (user?.userId as UserId | undefined) ?? null,
      error,
      setError,
      twoFactor,
      login,
      verifyTwoFactor,
      cancelTwoFactor,
      register,
      logout,
      endSession,
    }),
    [status, user, error, twoFactor, login, verifyTwoFactor, cancelTwoFactor, register, logout, endSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
