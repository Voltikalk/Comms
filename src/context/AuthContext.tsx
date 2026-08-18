import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User as SupabaseUser, Session as SupabaseSession } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';
import { 
  registerUser, 
  loginUser, 
  logoutUser, 
  resetPassword as resetPasswordService, 
  updatePassword as updatePasswordService, 
  getUserProfile,
  type RegisterParams 
} from '../services/supabase-auth.service';
import type { User as DbUser } from '../lib/supabase/types';

export interface AuthContextType {
  user: SupabaseUser | null;
  session: SupabaseSession | null;
  profile: DbUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Methods
  login: (emailOrUsername: string, pass: string) => Promise<boolean>;
  register: (params: RegisterParams) => Promise<boolean>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  updatePassword: (newPass: string) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [profile, setProfile] = useState<DbUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize and restore active session
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (initialSession && isMounted) {
          setSession(initialSession);
          setUser(initialSession.user);
          const userProfile = await getUserProfile(initialSession.user.id);
          if (isMounted) setProfile(userProfile);
        }
      } catch (err: any) {
        console.error('[AuthContext] Session init error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initSession();

    // Listen to live auth changes (login, logout, token refresh, password recovery)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return;

        if (newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
          const userProfile = await getUserProfile(newSession.user.id);
          if (isMounted) setProfile(userProfile);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
        }

        if (event === 'SIGNED_OUT') {
          setIsLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Login handler
  const login = useCallback(async (emailOrUsername: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await loginUser(emailOrUsername, pass);
      if (res.error || !res.user) {
        setError(res.error || 'Ошибка входа');
        return false;
      }
      setUser(res.user);
      setSession(res.session);
      setProfile(res.profile);
      return true;
    } catch (err: any) {
      setError(err.message || 'Ошибка сети');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Register handler
  const register = useCallback(async (params: RegisterParams): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await registerUser(params);
      if (res.error || !res.user) {
        setError(res.error || 'Ошибка регистрации');
        return false;
      }
      setUser(res.user);
      setSession(res.session);
      setProfile(res.profile);
      return true;
    } catch (err: any) {
      setError(err.message || 'Ошибка сети');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout handler
  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await logoutUser();
      setUser(null);
      setSession(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Password Reset handler
  const resetPassword = useCallback(async (email: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await resetPasswordService(email);
      if (res.error) {
        setError(res.error);
        return false;
      }
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update Password handler
  const updatePassword = useCallback(async (newPass: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await updatePasswordService(newPass);
      if (res.error) {
        setError(res.error);
        return false;
      }
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh Profile
  const refreshProfile = useCallback(async (): Promise<void> => {
    if (user?.id) {
      const p = await getUserProfile(user.id);
      setProfile(p);
    }
  }, [user]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    session,
    profile,
    isAuthenticated: !!user && !!session,
    isLoading,
    error,
    login,
    register,
    logout,
    resetPassword,
    updatePassword,
    refreshProfile,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
