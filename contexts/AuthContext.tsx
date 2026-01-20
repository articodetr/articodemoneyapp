import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/lib/database.types';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (username: string, fullName: string, password: string) => Promise<{ error: any }>;
  signIn: (username: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isPinSet: boolean;
  checkPin: (pin: string) => Promise<boolean>;
  setPin: (pin: string) => Promise<void>;
  isPinVerified: boolean;
  clearPinVerification: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PIN_STORAGE_KEY = 'app_pin';
const PIN_VERIFIED_KEY = 'pin_verified';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPinSet, setIsPinSet] = useState(false);
  const [isPinVerified, setIsPinVerified] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Session:', session ? 'Found' : 'Not found');

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);

          if (session?.user) {
            console.log('Fetching profile for user:', session.user.id);
            await fetchProfile(session.user.id);
          }

          await checkPinStatus();
          console.log('Auth initialization complete');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
        return;
      }

      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  };

  const checkPinStatus = async () => {
    const pin = await AsyncStorage.getItem(PIN_STORAGE_KEY);
    setIsPinSet(!!pin);
  };

  const signUp = async (username: string, fullName: string, password: string) => {
    const email = `${username}@ledger.local`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signIn = async (username: string, password: string) => {
    const email = `${username}@ledger.local`;
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    await AsyncStorage.removeItem(PIN_VERIFIED_KEY);
    setIsPinVerified(false);
  };

  const setPin = async (pin: string) => {
    await AsyncStorage.setItem(PIN_STORAGE_KEY, pin);
    setIsPinSet(true);
  };

  const checkPin = async (pin: string): Promise<boolean> => {
    const storedPin = await AsyncStorage.getItem(PIN_STORAGE_KEY);
    const isCorrect = storedPin === pin;
    if (isCorrect) {
      setIsPinVerified(true);
      await AsyncStorage.setItem(PIN_VERIFIED_KEY, 'true');
    }
    return isCorrect;
  };

  const clearPinVerification = () => {
    setIsPinVerified(false);
    AsyncStorage.removeItem(PIN_VERIFIED_KEY);
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
        isPinSet,
        checkPin,
        setPin,
        isPinVerified,
        clearPinVerification,
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
