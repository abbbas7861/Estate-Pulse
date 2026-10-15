/**
 * useOrgUsers.ts – Fetches real team members & brokers from public.users
 * filtered by the active organization ID.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export interface OrgUser {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: string;
  avatar_url?: string;
  initials: string;
  created_at?: string;
}

export function useOrgUsers(orgId: string | null | undefined) {
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!orgId) {
      setUsers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchErr } = await supabase
        .from('users')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: true });

      if (fetchErr) {
        throw fetchErr;
      }

      const formatted: OrgUser[] = (data || []).map((u: any) => {
        const name = (u.full_name || u.email?.split('@')[0] || 'Broker Associate').trim();
        const initials = name
          .split(' ')
          .filter(Boolean)
          .map((n: string) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase() || 'BA';

        return {
          id: u.id,
          full_name: name,
          email: u.email || '',
          phone: u.phone || undefined,
          role: u.role || 'Senior Broker Associate',
          avatar_url: u.avatar_url || undefined,
          initials,
          created_at: u.created_at,
        };
      });

      setUsers(formatted);
    } catch (err: any) {
      console.warn('[useOrgUsers] Error fetching organization users:', err.message);
      setError(err.message || 'Failed to fetch team members');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
  };
}
