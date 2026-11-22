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
  orgName?: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  orgId: null,
  orgName: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
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

    // Try RPC if available
    try {
      const { data: orgId, error: rpcErr } = await supabase.rpc('ensure_my_org', {
        p_brokerage_name: brokerageName,
      });

      if (!rpcErr && orgId) {
        return orgId as string;
      }
    } catch {
      // RPC may not be present in database, proceed to standard queries
    }

    // 3. Fallback: Check if user profile exists by email in public.users
    if (currentUser.email) {
      const { data: userByEmail } = await supabase
        .from('users')
        .select('org_id')
        .eq('email', currentUser.email)
        .maybeSingle();

      if (userByEmail?.org_id) {
        return userByEmail.org_id as string;
      }
    }

    // 4. Fallback: Create new organization and user link (removed random-org assignment)
    const { data: newOrg } = await supabase
      .from('organizations')
      .insert({ name: brokerageName })
      .select('id')
      .single();

    if (newOrg?.id) {
      await supabase.from('users').upsert({
        id: userId,
        org_id: newOrg.id,
        email: currentUser.email || '',
        full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User',
      });
      return newOrg.id as string;
    }

    return null;
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
  const [orgName, setOrgName] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const resolveOrgName = async (oid: string | null, currentUser: User | null): Promise<string | null> => {
    if (oid) {
      try {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', oid)
          .maybeSingle();

        if (orgData?.name) {
          return orgData.name;
        }
      } catch (err) {
        console.warn('[useAuth] failed to fetch org name:', err);
      }
    }

    return (
      currentUser?.user_metadata?.brokerage_name ||
      currentUser?.user_metadata?.org_name ||
      null
    );
  };

  useEffect(() => {
    // Hydrate existing session
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const oid = await fetchOrgId(s.user.id);
        setOrgId(oid);
        const name = await resolveOrgName(oid, s.user);
        setOrgName(name);
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
        const name = await resolveOrgName(oid, s.user);
        setOrgName(name);
      } else {
        setOrgId(null);
        setOrgName(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refreshUser = async () => {
    try {
      const { data: { user: refreshedUser } } = await supabase.auth.getUser();
      if (refreshedUser) {
        try {
          const { data: profile } = await supabase
            .from('users')
            .select('full_name, phone, avatar_url')
            .eq('id', refreshedUser.id)
            .maybeSingle();

          if (profile) {
            refreshedUser.user_metadata = {
              ...refreshedUser.user_metadata,
              full_name: profile.full_name || refreshedUser.user_metadata?.full_name,
              phone: profile.phone || refreshedUser.user_metadata?.phone,
              avatar_url: profile.avatar_url || refreshedUser.user_metadata?.avatar_url,
            };
          }
        } catch (dbErr) {
          console.warn('[useAuth] profile sync error:', dbErr);
        }
        setUser({ ...refreshedUser });
      }
    } catch (err) {
      console.warn('[useAuth] failed to refresh user:', err);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setOrgId(null);
    setOrgName(null);
  };

  return React.createElement(
    AuthContext.Provider,
    { value: { session, user, orgId, orgName, loading, signOut, refreshUser } },
    children
  );
}
