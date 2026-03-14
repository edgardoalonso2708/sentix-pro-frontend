'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { authFetch } from '../lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  authEnabled: false,
  userId: 'default-user',
  userProfile: null,
  role: null,
  isAdmin: false,
  isTrader: false,
  isViewer: false,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  // Auth is only enabled when Supabase env vars are configured
  const authEnabled = !!supabase;

  // Fetch user profile (role, display_name) from backend
  const fetchProfile = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/api/auth/me`);
      if (res.ok) {
        const { profile } = await res.json();
        setUserProfile(profile);
        return profile;
      }
    } catch {
      // Profile fetch failed — non-blocking
    }
    return null;
  }, []);

  useEffect(() => {
    if (!supabase) {
      // No Supabase configured — skip auth, use default-user
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
      // Fetch profile if authenticated
      if (s?.user) fetchProfile();
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          fetchProfile();
        } else {
          setUserProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = useCallback(async (email, password) => {
    if (!supabase) return { error: { message: 'Auth not configured' } };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  }, []);

  const signUp = useCallback(async (email, password) => {
    if (!supabase) return { error: { message: 'Auth not configured' } };
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { data, error };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return { error: { message: 'Auth not configured' } };
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUserProfile(null);
  }, []);

  const role = userProfile?.role || null;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      authEnabled,
      userId: user?.id || 'default-user',
      userProfile,
      role,
      isAdmin: role === 'admin',
      isTrader: role === 'trader' || role === 'admin',
      isViewer: role === 'viewer',
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      refreshProfile: fetchProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
