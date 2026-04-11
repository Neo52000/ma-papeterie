import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { usePriceModeStore } from './priceModeStore';

interface RolesState {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isPro: boolean;
}

interface AuthState extends RolesState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  _initialized: boolean;
  signUp: (email: string, password: string) => Promise<{ error: unknown }>;
  signIn: (email: string, password: string) => Promise<{ error: unknown }>;
  signOut: () => Promise<void>;
  /** Called internally — initializes auth listener + fetches initial session. */
  init: () => () => void;
}

const defaultRoles: RolesState = { isAdmin: false, isSuperAdmin: false, isPro: false };

async function checkUserRoles(userId: string): Promise<RolesState> {
  try {
    // Parallel fetch: roles and B2B link are both keyed on userId
    const [{ data }, { data: b2bLink }] = await Promise.all([
      supabase.from('user_roles').select('role').eq('user_id', userId),
      supabase.from('b2b_company_users').select('account_id').eq('user_id', userId).limit(1).maybeSingle(),
    ]);

    if (!data) return defaultRoles;

    const roleList = data.map(r => r.role) as string[];
    const roles: RolesState = {
      isSuperAdmin: roleList.includes('super_admin'),
      isAdmin: roleList.includes('admin') || roleList.includes('super_admin'),
      isPro: roleList.includes('pro') || roleList.includes('admin') || roleList.includes('super_admin'),
    };

    // Auto-switch to HT for B2B accounts with a VAT number
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

    return roles;
  } catch {
    return defaultRoles;
  }
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  _initialized: false,
  ...defaultRoles,

  signUp: async (email, password) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    return { error };
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  },

  signOut: async () => {
    usePriceModeStore.getState().setMode('ttc');
    await supabase.auth.signOut();
  },

  init: () => {
    if (get()._initialized) return () => {};
    set({ _initialized: true });

    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        if (!mounted) return;

        set({ session: currentSession, user: currentSession?.user ?? null });

        if (currentSession?.user) {
          queueMicrotask(() => {
            if (!mounted) return;
            checkUserRoles(currentSession.user.id).then(roles => {
              if (mounted) set({ ...roles, isLoading: false });
            });
          });
        } else {
          set({ ...defaultRoles, isLoading: false });
        }
      },
    );

    // Fetch initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!mounted) return;
      set({ session: initialSession, user: initialSession?.user ?? null });

      if (initialSession?.user) {
        const roles = await checkUserRoles(initialSession.user.id);
        if (mounted) set({ ...roles, isLoading: false });
      } else {
        if (mounted) set({ isLoading: false });
      }
    }).catch(() => {
      if (mounted) set({ isLoading: false });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  },
}));

/**
 * Drop-in replacement for the legacy useAuth() from AuthContext.
 * Same API shape so existing consumers don't need refactoring.
 */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);
  const isLoading = useAuthStore((s) => s.isLoading);
  const signUp = useAuthStore((s) => s.signUp);
  const signIn = useAuthStore((s) => s.signIn);
  const signOut = useAuthStore((s) => s.signOut);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin);
  const isPro = useAuthStore((s) => s.isPro);

  return { user, session, isLoading, signUp, signIn, signOut, isAdmin, isSuperAdmin, isPro };
}
