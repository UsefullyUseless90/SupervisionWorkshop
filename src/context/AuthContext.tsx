import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, type Profile } from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (matricule: string, password: string) => Promise<{ error: string | null }>;
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

  async function signIn(identifier: string, password: string) {
    const value = identifier.trim();
    const email = value.includes('@') ? value : `${value}@workshop.local`;
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { error: 'Utilisateur ou mot de passe incorrect' };
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
