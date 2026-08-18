import { useAuthContext } from '../context/AuthContext';

/**
 * Hook to access Supabase Authentication context and session data
 */
export function useAuth() {
  return useAuthContext();
}

export default useAuth;
