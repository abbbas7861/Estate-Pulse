/**
 * useAuth.ts – Supabase Auth listener and Multi-Tenant Context for EstatePulse.
 * Provides session, user, and org_id state across the application.
 *
 * Secure Multi-Tenancy:
 *   - Fetches org_id for the authenticated user from public.users table.
 *   - Never falls back to arbitrary existing organizations (.limit(1)).
 *   - Auto-provisions user's own organization via `ensure_my_org` RPC if user profile is pending.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  orgId: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  orgId: null,
  loading: true,
  signOut: async () => {},
});

/**
 * Hook to access current authentication state and active organization ID.
 */
export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}

/**
 * Resolves the authenticated user's organization ID from public.users table.
 * If user profile does not exist yet (e.g., signup trigger latency), provisions
 * a dedicated organization safely via the `ensure_my_org` RPC.
 */
export async function fetchOrgId(userId: string): Promise<string | null> {
  try {
    // 1. Fetch user profile row from public.users table
    const { data, error } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data?.org_id) {
      return data.org_id as string;
    }

    // 2. Fallback: provision dedicated organization for this user
    const userRes = await supabase.auth.getUser();
    const currentUser = userRes.data.user;
    if (!currentUser) return null;

    const brokerageName =
      currentUser.user_metadata?.brokerage_name ||
      currentUser.user_metadata?.org_name ||
      'My Brokerage';

    const { data: orgId, error: rpcErr } = await supabase.rpc('ensure_my_org', {
      p_brokerage_name: brokerageName,
    });

    if (rpcErr || !orgId) {
      console.error('[useAuth] ensure_my_org RPC failed:', rpcErr?.message);
      return null;
    }

    return orgId as string;
  } catch (err) {
    console.warn('[useAuth] fetchOrgId warning:', err);
    return null;
  }
}

export interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Standalone AuthProvider component that listens to Supabase auth state changes.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Hydrate existing session
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const oid = await fetchOrgId(s.user.id);
        setOrgId(oid);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const oid = await fetchOrgId(s.user.id);
        setOrgId(oid);
      } else {
        setOrgId(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setOrgId(null);
  };

  return React.createElement(
    AuthContext.Provider,
    { value: { session, user, orgId, loading, signOut } },
    children
  );
}
