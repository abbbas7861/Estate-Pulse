/**
 * useAuth – Supabase Auth state listener for EstatePulse.
 * Provides the current session, user, and org_id via context.
 *
 * FIX #1 (Multi-Tenant Leak):
 *   - Removed the dangerous .limit(1) fallback that assigned new users to the
 *     first existing organization, causing cross-tenant data exposure.
 *   - New users now get a brand-new org provisioned via the
 *     `provision_new_organization` Postgres RPC, guaranteeing true isolation.
 *   - full_name is now populated from user_metadata.full_name; the email prefix
 *     is only used as a last resort when no real name is present.
 */
import { createContext, useContext } from 'react';
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

export function useAuth() {
  return useContext(AuthContext);
}

export async function fetchOrgId(userId: string): Promise<string | null> {
  try {
    // ── 1. Happy path: user profile row already exists ──────────────────────
    const { data, error } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data?.org_id) {
      return data.org_id as string;
    }

    // ── 2. New user: provision a brand-new, isolated organization via RPC ───
    //    NEVER fall back to an existing org row — that would cause cross-tenant
    //    data leaks. Every new auth user gets their own org_id.
    const userRes = await supabase.auth.getUser();
    const currentUser = userRes.data.user;

    if (!currentUser) return null;

    // Resolve a meaningful brokerage name from metadata, falling back gracefully.
    const brokerageName =
      currentUser.user_metadata?.brokerage_name ||
      currentUser.user_metadata?.org_name ||
      'My Brokerage';

    // Resolve the user's real full name — prefer metadata over email prefix.
    const fullName =
      currentUser.user_metadata?.full_name ||
      currentUser.user_metadata?.name ||
      null; // do NOT default to email prefix; let the DB store null

    const { data: rpcData, error: rpcErr } = await supabase.rpc(
      'provision_new_organization',
      { p_brokerage_name: brokerageName }
    );

    if (rpcErr || !rpcData) {
      console.error('[useAuth] provision_new_organization RPC failed:', rpcErr?.message);
      return null;
    }

    const newOrgId = rpcData as string;

    // Insert the users profile row linking auth.uid() → new org_id.
    const { error: upsertErr } = await supabase.from('users').upsert({
      id: userId,
      org_id: newOrgId,
      email: currentUser.email || '',
      // Only set full_name when we actually have a real name from metadata.
      full_name: fullName,
      role: 'agent',
    });

    if (upsertErr) {
      console.warn('[useAuth] users upsert warning:', upsertErr.message);
    }

    return newOrgId;
  } catch (err) {
    console.warn('[useAuth] fetchOrgId warning:', err);
    return null;
  }
}

