import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { usePriceModeStore } from '@/stores/priceModeStore';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: unknown }>;
  signIn: (email: string, password: string) => Promise<{ error: unknown }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isPro: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

interface RolesState {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isPro: boolean;
}

const defaultRoles: RolesState = { isAdmin: false, isSuperAdmin: false, isPro: false };

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [roles, setRoles] = useState<RolesState>(defaultRoles);

  // Single setState for all roles instead of 3 separate calls
  const checkUserRoles = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (data) {
        const roleList = data.map(r => r.role) as string[];
        setRoles({
          isSuperAdmin: roleList.includes('super_admin'),
          isAdmin: roleList.includes('admin') || roleList.includes('super_admin'),
          isPro: roleList.includes('pro') || roleList.includes('admin') || roleList.includes('super_admin'),
        });
      } else {
        setRoles(defaultRoles);
      }

      // Auto-switch to HT for B2B accounts with a VAT number
      const { data: b2bLink } = await supabase
        .from('b2b_company_users')
        .select('account_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (b2bLink?.account_id) {
        const { data: account } = await supabase
          .from('b2b_accounts')
          .select('vat_number')
          .eq('id', b2bLink.account_id)
          .maybeSingle();

        if (account?.vat_number) {
          usePriceModeStore.getState().setMode('ht');
        }
      }
    } catch {
      setRoles(defaultRoles);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        if (!mounted) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Defer role check to avoid Supabase auth deadlock
          queueMicrotask(() => {
            if (!mounted) return;
            checkUserRoles(currentSession.user.id).finally(() => {
              if (mounted) setIsLoading(false);
            });
          });
        } else {
          setRoles(defaultRoles);
          setIsLoading(false);
        }
      }
    );

    // Check for existing session
    const getInitialSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (!mounted) return;

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          await checkUserRoles(initialSession.user.id);
        }
        if (mounted) setIsLoading(false);
      } catch (error) {
        if (!mounted) return;
        console.error('Error getting initial session:', error);
        setIsLoading(false);
      }
    };

    getInitialSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    usePriceModeStore.getState().setMode('ttc');
    await supabase.auth.signOut();
  };

  // Session timeout : 30 min B2C, 2h B2B/Pro
  useSessionTimeout({
    isPro: roles.isPro,
    enabled: !!user,
  });

  const value = {
    user,
    session,
    isLoading,
    signUp,
    signIn,
    signOut,
    isAdmin: roles.isAdmin,
    isSuperAdmin: roles.isSuperAdmin,
    isPro: roles.isPro,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
