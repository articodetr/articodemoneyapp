import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface Profile {
  id: string;
  username: string;
  full_name: string;
  account_number: number;
  role: string;
  created_at: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (username: string, fullName: string, password: string) => Promise<{ error: any }>;
  signIn: (username: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('[Auth] Initializing...');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[Auth] Error getting session:', error);
        }

        console.log('[Auth] Session:', session ? 'Found' : 'Not found');

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);

          if (session?.user) {
            console.log('[Auth] Fetching profile...');
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();

            if (profileData) {
              console.log('[Auth] Profile loaded');
              setProfile(profileData);
            }
          }

          console.log('[Auth] Setting loading to false');
          setLoading(false);
        }
      } catch (error) {
        console.error('[Auth] Error initializing:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const timeout = setTimeout(() => {
      if (mounted) {
        console.log('[Auth] Timeout - forcing loading to false');
        setLoading(false);
      }
    }, 2000);

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('[Auth] State change:', _event);
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);

          if (session?.user) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();

            if (profileData) {
              setProfile(profileData);
            }
          } else {
            setProfile(null);
          }
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (username: string, fullName: string, password: string) => {
    try {
      const email = `${username.toLowerCase()}@ledger.local`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username.toLowerCase(),
            full_name: fullName,
          },
        },
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signIn = async (username: string, password: string) => {
    try {
      const email = `${username.toLowerCase()}@ledger.local`;
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
