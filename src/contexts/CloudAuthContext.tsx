/**
 * Cloud Auth Context
 * Uses Lovable Cloud (Supabase Auth) directly instead of external Express backend
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { cloudApi, User } from '@/services/cloudApi';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';

interface CloudAuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: { email: string; password: string; name: string; role?: string; phone?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  sendOtp: (phone: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (phone: string, token: string) => Promise<{ success: boolean; error?: string }>;
}

const CloudAuthContext = createContext<CloudAuthContextType | null>(null);

export function CloudAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user profile from database
  const loadUserProfile = useCallback(async (userId: string, email?: string, phone?: string) => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      // Get user role from user_roles table
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (profile) {
        const userData: User = {
          id: userId,
          email: email || profile.email || undefined,
          name: profile.name,
          role: (roleData?.role as "BUYER" | "SELLER" | "ADMIN") || "BUYER",
          phone: phone || profile.phone || undefined,
        };
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  }, []);

  // Set up auth state listener
  useEffect(() => {
    // Set up auth state change listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, currentSession: Session | null) => {
        setSession(currentSession);
        
        if (currentSession?.user) {
          // Defer profile loading to avoid blocking auth state
          setTimeout(() => {
            loadUserProfile(
              currentSession.user.id, 
              currentSession.user.email,
              currentSession.user.phone
            );
          }, 0);
        } else {
          setUser(null);
          localStorage.removeItem('user');
        }
        
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      if (existingSession?.user) {
        loadUserProfile(
          existingSession.user.id, 
          existingSession.user.email,
          existingSession.user.phone
        );
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUserProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await cloudApi.loginWithEmail(email, password);
    if (response.success && response.data) {
      setUser(response.data.user);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      return { success: true };
    }
    return { success: false, error: response.error || 'Login failed' };
  }, []);

  const register = useCallback(async (data: { email: string; password: string; name: string; role?: string; phone?: string }) => {
    const response = await cloudApi.registerWithEmail(data);
    if (response.success && response.data) {
      setUser(response.data.user);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      return { success: true };
    }
    return { success: false, error: response.error || 'Registration failed' };
  }, []);

  const logout = useCallback(async () => {
    await cloudApi.logout();
    setUser(null);
    setSession(null);
    localStorage.removeItem('user');
  }, []);

  const sendOtp = useCallback(async (phone: string) => {
    const response = await cloudApi.sendPhoneOtp(phone);
    return response;
  }, []);

  const verifyOtp = useCallback(async (phone: string, token: string) => {
    const response = await cloudApi.verifyPhoneOtp(phone, token);
    if (response.success && response.data) {
      setUser(response.data.user);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      return { success: true };
    }
    return { success: false, error: response.error || 'OTP verification failed' };
  }, []);

  return (
    <CloudAuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated: !!user && !!session,
        login,
        register,
        logout,
        sendOtp,
        verifyOtp,
      }}
    >
      {children}
    </CloudAuthContext.Provider>
  );
}

export function useCloudAuth() {
  const context = useContext(CloudAuthContext);
  if (!context) {
    throw new Error('useCloudAuth must be used within a CloudAuthProvider');
  }
  return context;
}
