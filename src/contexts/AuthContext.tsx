import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

interface User {
  id: string;
  phone: string;
  name: string;
  email?: string;
  role: 'BUYER' | 'SELLER' | 'ADMIN';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (phone: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: { phone: string; name: string; email?: string; role?: string; otp: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  requestOTP: (phone: string, purpose: 'LOGIN' | 'REGISTRATION') => Promise<{ success: boolean; error?: string; otp?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Legacy provider kept for backwards compatibility.
  // The app now uses SupabaseAuthProvider globally; this provider simply passes children through.
  return <AuthContext.Provider value={null}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  // Prefer legacy context if present, otherwise adapt SupabaseAuthContext.
  const legacy = useContext(AuthContext);
  const supa = useSupabaseAuth();

  return useMemo<AuthContextType>(() => {
    if (legacy) return legacy;

    const roleUpper = (supa.user?.role || 'buyer').toUpperCase() as User['role'];
    const adaptedUser: User | null = supa.user
      ? {
          id: supa.user.id,
          phone: supa.user.phone || '',
          name: supa.user.name,
          email: supa.user.email,
          role: roleUpper,
        }
      : null;

    return {
      user: adaptedUser,
      isLoading: supa.isLoading,
      isAuthenticated: supa.isAuthenticated,
      login: supa.login,
      register: supa.register,
      logout: supa.logout,
      requestOTP: supa.requestOTP,
    };
  }, [legacy, supa]);
}