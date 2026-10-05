import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, type Profile, type UserRole } from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: UserRole
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data as Profile | null;
  }

  async function refreshProfile() {
    if (session?.user?.id) {
      const p = await fetchProfile(session.user.id);
      setProfile(p);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      if (s?.user?.id) {
        const p = await fetchProfile(s.user.id);
        setProfile(p);
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      (event, s) => {
        (async () => {
          setSession(s);
          if (s?.user?.id) {
            const p = await fetchProfile(s.user.id);
            setProfile(p);
          } else {
            setProfile(null);
          }
          setLoading(false);
        })();
      }
    );

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { error: error.message };
    return { error: null };
  }

  async function signUp(
    email: string,
    password: string,
    fullName: string,
    role: UserRole
  ) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
      },
    });
    if (error) return { error: error.message };
    if (!data.user) return { error: "Échec de la création du compte." };
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
