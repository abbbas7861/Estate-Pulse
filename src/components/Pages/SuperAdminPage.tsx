import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Building2,
  CheckCircle2,
  Lock,
  Zap,
  Shield,
  Loader2,
  AlertCircle,
  Calendar,
} from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  created_at: string;
  subscription_tier: string | null;
}

interface SuperAdminPageProps {
  onNotify?: (msg: string) => void;
}

export const SuperAdminPage: React.FC<SuperAdminPageProps> = ({ onNotify }) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('organizations')
        .select('id, name, created_at, subscription_tier')
        .order('created_at', { ascending: false });

      if (fetchErr) {
        throw fetchErr;
      }

      setOrganizations(data || []);
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to fetch organizations';
      setError(errMsg);
      onNotify?.(`Error: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const handleUpdateTier = async (
    orgId: string,
    orgName: string,
    newTier: 'locked' | 'pro' | 'enterprise'
  ) => {
    setUpdatingId(orgId);
    try {
      const { error: updateErr } = await supabase
        .from('organizations')
        .update({ subscription_tier: newTier })
        .eq('id', orgId);

      if (updateErr) {
        throw updateErr;
      }

      const tierLabels: Record<string, string> = {
        pro: 'Pro',
        enterprise: 'Enterprise',
        locked: 'Locked',
      };

      onNotify?.(`Successfully updated "${orgName}" to ${tierLabels[newTier]}.`);
      await fetchOrganizations();
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to update subscription tier';
      onNotify?.(`Error: ${errMsg}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrgs = organizations.filter((org) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (org.name && org.name.toLowerCase().includes(q)) ||
      (org.id && org.id.toLowerCase().includes(q)) ||
      (org.subscription_tier && org.subscription_tier.toLowerCase().includes(q))
    );
  });

  const totalCount = organizations.length;
  const proCount = organizations.filter(
    (o) => (o.subscription_tier || '').toLowerCase() === 'pro'
  ).length;
  const enterpriseCount = organizations.filter(
    (o) => (o.subscription_tier || '').toLowerCase() === 'enterprise'
  ).length;
  const lockedCount = organizations.filter((o) => {
    const t = (o.subscription_tier || '').toLowerCase();
    return t !== 'pro' && t !== 'enterprise';
  }).length;

  return (
    <div className="p-5 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[#005d42] uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 text-[#005d42]" />
            <span>Platform Owner Panel</span>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#0b1c30] tracking-tight mt-1">
            Super Admin: Organization Subscriptions
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Manually unlock or lock client workspaces following Bank/Raqami or Crypto verification.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchOrganizations}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-[13px] font-semibold text-[#0b1c30] shadow-xs transition-colors cursor-pointer disabled:opacity-60 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#005d42]' : 'text-slate-500'}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* ── Telemetry Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Workspaces</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-display text-[#0b1c30]">{totalCount}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Pro</span>
            <Zap className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-display text-emerald-700">{proCount}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-purple-700 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Enterprise</span>
            <Shield className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold font-display text-purple-700">{enterpriseCount}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Locked / Awaiting</span>
            <Lock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-display text-amber-700">{lockedCount}</div>
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by organization name or ID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-[13px] text-[#0b1c30] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#005d42]/20 focus:border-[#005d42] transition-all"
            />
          </div>
          <span className="text-xs text-slate-400">
            Showing <b>{filteredOrgs.length}</b> of {organizations.length} organizations
          </span>
        </div>

        {error && (
          <div className="m-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-5">Organization Name</th>
                <th className="py-3 px-5">Created At</th>
                <th className="py-3 px-5">Current Subscription Tier</th>
                <th className="py-3 px-5 text-right">Action Buttons</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#005d42] mb-2" />
                    <span>Loading organizations…</span>
                  </td>
                </tr>
              ) : filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-medium text-slate-600">No organizations found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try searching with a different term.</p>
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((org) => {
                  const rawTier = (org.subscription_tier || 'locked').toLowerCase();
                  const isUpdating = updatingId === org.id;

                  const isPro = rawTier === 'pro';
                  const isEnterprise = rawTier === 'enterprise';
                  const isLocked = !isPro && !isEnterprise;

                  return (
                    <tr key={org.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Organization Name & ID */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#005d42]/10 text-[#005d42] flex items-center justify-center font-bold text-xs shrink-0">
                            {org.name ? org.name.slice(0, 2).toUpperCase() : 'EP'}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-[#0b1c30] block truncate">
                              {org.name || 'Unnamed Organization'}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400 block truncate">
                              ID: {org.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Created At */}
                      <td className="py-4 px-5 whitespace-nowrap text-slate-600">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {org.created_at
                              ? new Date(org.created_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : '—'}
                          </span>
                        </div>
                      </td>

                      {/* Current Subscription Tier */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        {isPro && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Pro Tier
                          </span>
                        )}
                        {isEnterprise && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200 uppercase">
                            <Shield className="w-3 h-3 text-purple-600" />
                            Enterprise
                          </span>
                        )}
                        {isLocked && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                            <Lock className="w-3 h-3 text-amber-600" />
                            Locked
                          </span>
                        )}
                      </td>

                      {/* Action Buttons: Unlock Pro, Unlock Enterprise, Lock Workspace */}
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2 justify-end">
                          {/* Unlock Pro */}
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleUpdateTier(org.id, org.name, 'pro')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 ${
                              isPro
                                ? 'bg-emerald-600 text-white ring-2 ring-emerald-400/50'
                                : 'bg-[#047857] hover:bg-[#005d42] text-white hover:shadow-xs'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            title="Unlock Pro workspace access"
                          >
                            {isUpdating && updatingId === org.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Zap className="w-3.5 h-3.5" />
                            )}
                            <span>Unlock Pro</span>
                          </button>

                          {/* Unlock Enterprise */}
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleUpdateTier(org.id, org.name, 'enterprise')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 ${
                              isEnterprise
                                ? 'bg-purple-700 text-white ring-2 ring-purple-400/50'
                                : 'bg-purple-600 hover:bg-purple-700 text-white hover:shadow-xs'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            title="Unlock Enterprise workspace access"
                          >
                            <Shield className="w-3.5 h-3.5" />
                            <span>Unlock Enterprise</span>
                          </button>

                          {/* Lock Workspace */}
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleUpdateTier(org.id, org.name, 'locked')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border shadow-2xs flex items-center gap-1.5 ${
                              isLocked
                                ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-300/50'
                                : 'bg-white hover:bg-red-50 text-red-600 border-red-200 hover:border-red-300'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            title="Lock workspace"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Lock Workspace</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
