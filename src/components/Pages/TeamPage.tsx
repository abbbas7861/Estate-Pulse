import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Award,
  Mail,
  Phone,
  TrendingUp,
  Users,
  Download,
  UserPlus,
  Search,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Shield,
  Copy,
  Check,
} from 'lucide-react';
import { EmployeeSummaryItem, Lead, PageView, TeamInvite } from '../../types/crm';
import { useOrgUsers } from '../../lib/hooks/useOrgUsers';
import { useSubscription } from '../../lib/hooks/useSubscription';
import { useAuth } from '../../lib/useAuth';
import { supabase } from '../../lib/supabaseClient';
import { AgentDetailModal } from '../Modals/AgentDetailModal';
import { InviteAgentModal } from '../Modals/InviteAgentModal';
import { formatMoney, useCurrency } from '../../config/regional';

interface TeamPageProps {
  orgId: string | null;
  leads?: Lead[];
  onNavigate?: (page: PageView) => void;
  onNotify?: (msg: string) => void;
}

export const TeamPage: React.FC<TeamPageProps> = ({
  orgId: propOrgId,
  leads = [],
  onNavigate,
  onNotify,
}) => {
  // ── 1. Auth & Organization Resolution ───────────────────────────────────────
  const { orgId: authOrgId, user } = useAuth();
  const effectiveOrgId = propOrgId || authOrgId;
  const [resolvedOrgId, setResolvedOrgId] = useState<string | null>(effectiveOrgId);

  // Fallback: If neither prop nor context has orgId yet, fetch it directly from public.users
  useEffect(() => {
    if (effectiveOrgId) {
      setResolvedOrgId(effectiveOrgId);
    } else if (user?.id) {
      supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.org_id) {
            setResolvedOrgId(data.org_id);
          }
        });
    }
  }, [effectiveOrgId, user?.id]);

  const activeOrgId = resolvedOrgId || effectiveOrgId;

  // ── 2. All Hooks at Top (Unconditionally Called) ───────────────────────────
  const [currency] = useCurrency();
  const { users: orgUsers, loading: usersLoading, refetch: refetchUsers } = useOrgUsers(activeOrgId);
  const { limits, isLocked, effectiveTier } = useSubscription(activeOrgId);

  const [pendingInvites, setPendingInvites] = useState<TeamInvite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'name' | 'dealsClosed' | 'monthlyTargetPct' | 'totalLeads'>('monthlyTargetPct');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals state
  const [selectedAgent, setSelectedAgent] = useState<EmployeeSummaryItem | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  // Fetch pending invites for the active organization
  const fetchPendingInvites = useCallback(async () => {
    if (!activeOrgId) {
      setPendingInvites([]);
      return;
    }
    setInvitesLoading(true);
    try {
      const { data, error } = await supabase
        .from('team_invites')
        .select('*')
        .eq('org_id', activeOrgId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      setPendingInvites(data || []);
    } catch (err: any) {
      console.warn('[TeamPage] Error fetching invites:', err.message);
    } finally {
      setInvitesLoading(false);
    }
  }, [activeOrgId]);

  useEffect(() => {
    fetchPendingInvites();
  }, [fetchPendingInvites]);

  // Plan limits check
  const maxAllowedUsers = limits?.maxUsers ?? 5;
  const totalOccupiedSeats = orgUsers.length + pendingInvites.length;
  const hasReachedSeatLimit = !isLocked && totalOccupiedSeats >= maxAllowedUsers;

  // Real calculations computed strictly from the Supabase leads table and users
  const agents: EmployeeSummaryItem[] = useMemo(() => {
    return orgUsers.map((userItem) => {
      const userLeads = leads.filter(
        (l: any) =>
          l.assignedTo === userItem.id ||
          l.assigned_to === userItem.id ||
          l.brokerId === userItem.id ||
          (l.brokerName && l.brokerName.toLowerCase() === userItem.full_name.toLowerCase())
      );

      const activePipelineLeads = userLeads.filter((l: any) => {
        const s = (l.stage || l.stageId || l.stage_id || '').toLowerCase();
        return s !== 'closing' && s !== 'rejected' && s !== 'closed' && s !== 'lost';
      });

      const pipelineVal = activePipelineLeads.reduce(
        (acc: number, cur: any) => acc + (cur.budgetAmount || Number(cur.budget) || 0),
        0
      );

      const closedLeads = userLeads.filter((l: any) => {
        const s = (l.stage || l.stageId || l.stage_id || '').toLowerCase();
        return s === 'closing' || s === 'closed' || s === 'won';
      });

      const dealsClosed = closedLeads.length;
      const monthlyTarget = 5;
      const monthlyTargetPct = Math.round((dealsClosed / monthlyTarget) * 100);

      const formatCurrency = (val: number): string => {
        return formatMoney(val, { compact: true, currency });
      };

      return {
        id: userItem.id,
        name: userItem.full_name,
        email: userItem.email,
        phone: userItem.phone || '—',
        role: userItem.role,
        avatarUrl: userItem.avatar_url || '',
        initials: userItem.initials,
        totalLeads: userLeads.length,
        assigned: activePipelineLeads.length,
        won: dealsClosed,
        lost: userLeads.filter((l: any) => ['rejected', 'lost'].includes((l.stage || l.stageId || l.stage_id || '').toLowerCase())).length,
        conversionPct: userLeads.length > 0 ? Math.round((dealsClosed / userLeads.length) * 100) : 0,
        avgResponseTime: '—',
        pipelineValue: pipelineVal,
        pipelineValueFormatted: formatCurrency(pipelineVal),
        dealsClosed,
        monthlyTargetPct,
        quotaTarget: monthlyTarget,
      };
    });
  }, [orgUsers, leads, currency]);

  // Filtering & Sorting
  const filteredAgents = useMemo(() => {
    return agents
      .filter((ag) => {
        return (
          ag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ag.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ag.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === 'name') cmp = a.name.localeCompare(b.name);
        else if (sortField === 'dealsClosed') cmp = a.dealsClosed - b.dealsClosed;
        else if (sortField === 'monthlyTargetPct') cmp = a.monthlyTargetPct - b.monthlyTargetPct;
        else if (sortField === 'totalLeads') cmp = a.totalLeads - b.totalLeads;
        return sortOrder === 'desc' ? -cmp : cmp;
      });
  }, [agents, searchQuery, sortField, sortOrder]);

  // Combined totals
  const totalPipeline = useMemo(() => {
    return agents.reduce((acc, cur) => acc + cur.pipelineValue, 0);
  }, [agents]);

  const totalDealsClosed = useMemo(() => {
    return agents.reduce((acc, cur) => acc + cur.dealsClosed, 0);
  }, [agents]);

  // CSV Export for Team Performance
  const handleExportTeamCsv = () => {
    const headers = [
      'Agent Name',
      'Specialty Role',
      'Email',
      'Phone',
      'Assigned Active Leads',
      'Deals Closed',
      'Pipeline Value',
      'Monthly Quota %',
      'Avg Response Time',
    ];
    const rows = agents.map((a) => [
      a.name,
      a.role,
      a.email,
      a.phone,
      String(a.assigned),
      String(a.dealsClosed),
      a.pipelineValueFormatted,
      `${a.monthlyTargetPct}%`,
      a.avgResponseTime,
    ]);

    const csvContent = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'estatepulse-team-performance.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onNotify?.('Exported Team Performance CSV (estatepulse-team-performance.csv).');
  };

  // Copy invite link state
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const handleCopyInviteLink = async (email: string) => {
    const link = `${window.location.origin}/?invite=${encodeURIComponent(email)}`;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = link;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedEmail(email);
      onNotify?.(`Invite link for ${email} copied to clipboard!`);
      setTimeout(() => {
        setCopiedEmail(null);
      }, 2500);
    } catch (err) {
      console.warn('[TeamPage] Copy invite link failed:', err);
      onNotify?.('Failed to copy link to clipboard.');
    }
  };

  // Revoke / Cancel pending invite
  const handleRevokeInvite = async (inviteId: string, email: string) => {
    try {
      const { error: delErr } = await supabase
        .from('team_invites')
        .delete()
        .eq('id', inviteId);

      if (delErr) throw delErr;

      onNotify?.(`Revoked invitation for ${email}.`);
      await fetchPendingInvites();
    } catch (err: any) {
      onNotify?.(`Failed to revoke invite: ${err.message}`);
    }
  };

  const handleOpenInviteModal = () => {
    if (hasReachedSeatLimit) {
      onNotify?.(
        `Seat limit reached (${totalOccupiedSeats}/${maxAllowedUsers}). Upgrade to Enterprise for unlimited seats.`
      );
      return;
    }
    setInviteModalOpen(true);
  };

  return (
    <div className="p-5 sm:p-6 lg:p-8 flex flex-col gap-8 max-w-7xl mx-auto w-full">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#005d42]">
            <span>BROKERAGE ROSTER &amp; TEAMS</span>
            <span className="text-[#bdc9c1]">·</span>
            <span className="text-[#3e4943]">Multi-User Workspace</span>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#0b1c30] tracking-tight mt-0.5">
            Senior Advisory &amp; Brokerage Team
          </h1>
          <p className="text-[14px] text-[#3e4943] mt-1">
            Real-time quota attainment, active listing allocations, and inbound lead pipeline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportTeamCsv}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#eff4ff] text-[#0b1c30] border border-slate-200/80 text-[13px] font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4 text-[#005d42]" />
            <span>Export Team CSV</span>
          </button>

          <button
            type="button"
            onClick={handleOpenInviteModal}
            className="px-4 py-2.5 rounded-xl bg-[#047857] hover:bg-[#005d42] text-white text-[13px] font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Agent</span>
            <span className="ml-1 text-[11px] font-mono opacity-80">
              ({totalOccupiedSeats}/{maxAllowedUsers >= 99999 ? '∞' : maxAllowedUsers})
            </span>
          </button>
        </div>
      </div>

      {/* ── Team Summary Metric Strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[12px] font-medium text-[#3e4943]">Active Brokers on Roster</span>
            <p className="font-display font-bold text-[28px] text-[#0b1c30] mt-1 tabular-nums">
              {orgUsers.length}
            </p>
            <span className="text-[11px] text-[#005d42] font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verified Team Members
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#eff4ff] flex items-center justify-center text-[#005d42]">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[12px] font-medium text-[#3e4943]">Active Pipeline Volume</span>
            <p className="font-display font-bold text-[28px] text-[#0b1c30] mt-1 tabular-nums">
              {formatMoney(totalPipeline, { compact: true, currency })}
            </p>
            <span className="text-[11px] text-[#005d42] font-medium flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              {totalDealsClosed} deals closed
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#99efe5] flex items-center justify-center text-[#006f67]">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[12px] font-medium text-[#3e4943]">Plan Seats Allocated</span>
            <p className="font-display font-bold text-[28px] text-[#0b1c30] mt-1 tabular-nums">
              {totalOccupiedSeats} <span className="text-base text-slate-400 font-normal">/ {maxAllowedUsers >= 99999 ? 'Unlimited' : maxAllowedUsers}</span>
            </p>
            <span className="text-[11px] text-slate-500 capitalize">
              {effectiveTier} Plan · {pendingInvites.length} pending
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#eff4ff] flex items-center justify-center text-[#005d42]">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── Filter and Search Bar ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search broker by name or specialty…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[#005d42]/20 focus:border-[#005d42] text-[#0b1c30]"
          />
        </div>

        {/* Sorting controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto text-[12px]">
          <span className="text-slate-500 font-medium">Sort by:</span>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as any)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-medium text-slate-700 focus:outline-none"
          >
            <option value="monthlyTargetPct">Quota Attainment %</option>
            <option value="dealsClosed">Deals Closed</option>
            <option value="totalLeads">Lead Pipeline</option>
            <option value="name">Agent Name</option>
          </select>
          <button
            type="button"
            onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
            className="p-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 cursor-pointer"
            title="Toggle sort direction"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Grid of Active Agent Cards ── */}
      {usersLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200/80 animate-pulse space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-slate-200 mx-auto" />
              <div className="h-4 bg-slate-200 rounded w-3/4 mx-auto" />
              <div className="h-3 bg-slate-100 rounded w-1/2 mx-auto" />
              <div className="h-10 bg-slate-100 rounded-lg" />
            </div>
          ))}
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center shadow-xs">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-display font-semibold text-lg text-slate-700">No agents found</h3>
          <p className="text-slate-500 text-sm mt-1">
            Invite a new team member to your brokerage or adjust your search filter.
          </p>
          <button
            type="button"
            onClick={handleOpenInviteModal}
            className="mt-4 px-4 py-2 rounded-xl bg-[#047857] hover:bg-[#005d42] text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Invite First Agent</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredAgents.map((agent) => {
            return (
              <div
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col justify-between hover:shadow-md hover:border-[#005d42]/40 transition-all duration-200 cursor-pointer group"
              >
                <div>
                  {/* Avatar & Badges */}
                  <div className="flex items-start justify-between">
                    {agent.avatarUrl ? (
                      <img
                        src={agent.avatarUrl}
                        alt={agent.name}
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500/20 group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-[#005d42] text-white flex items-center justify-center font-display font-bold text-xl uppercase border-2 border-emerald-500/20 group-hover:scale-105 transition-transform shadow-xs">
                        {agent.name ? agent.name[0] : 'A'}
                      </div>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                        agent.monthlyTargetPct >= 100
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {agent.monthlyTargetPct}% Quota
                    </span>
                  </div>

                  {/* Name & Specialty */}
                  <div className="mt-4">
                    <h3 className="font-display font-bold text-[16px] text-[#0b1c30] group-hover:text-[#005d42] transition-colors">
                      {agent.name}
                    </h3>
                    <p className="text-[12px] text-slate-500 line-clamp-1 mt-0.5">
                      {agent.role}
                    </p>
                  </div>

                  {/* Contact info */}
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-[11px] text-slate-600">
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{agent.email || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{agent.phone || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Metrics Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div className="bg-[#eff4ff]/60 p-2 rounded-xl">
                    <span className="text-slate-400 block text-[10px]">Open Leads</span>
                    <span className="font-mono font-bold text-[#0b1c30] text-[13px]">
                      {agent.assigned}
                    </span>
                  </div>
                  <div className="bg-[#eff4ff]/60 p-2 rounded-xl">
                    <span className="text-slate-400 block text-[10px]">Closed MTD</span>
                    <span className="font-mono font-bold text-[#005d42] text-[13px]">
                      {agent.dealsClosed}
                    </span>
                  </div>
                  <div className="bg-[#eff4ff]/60 p-2 rounded-xl">
                    <span className="text-slate-400 block text-[10px]">Response</span>
                    <span className="font-mono font-bold text-slate-700 text-[13px]">
                      {agent.avgResponseTime}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pending Invites Section ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-lg text-[#0b1c30]">
                Pending Agent Invitations
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#eff4ff] text-[#005d42]">
                {pendingInvites.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Agents who have been invited to join this brokerage but haven't signed up yet.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              Capacity: <b>{totalOccupiedSeats}</b> / {maxAllowedUsers >= 99999 ? 'Unlimited' : maxAllowedUsers} seats
            </span>
            <button
              type="button"
              onClick={handleOpenInviteModal}
              className="px-3 py-1.5 rounded-lg bg-[#eff4ff] hover:bg-[#e2edff] text-[#005d42] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite Another</span>
            </button>
          </div>
        </div>

        {invitesLoading ? (
          <div className="py-12 text-center text-slate-400">
            <div className="w-6 h-6 border-2 border-[#005d42] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span className="text-xs font-medium">Checking pending invitations…</span>
          </div>
        ) : pendingInvites.length === 0 ? (
          <div className="py-10 text-center text-slate-400">
            <Mail className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700 text-sm">No pending invitations</p>
            <p className="text-xs text-slate-400 mt-0.5">
              All invited agents have signed up or no invitations are outstanding.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-5">Agent Email</th>
                  <th className="py-3 px-5">Assigned Role</th>
                  <th className="py-3 px-5">Invitation Status</th>
                  <th className="py-3 px-5">Sent At</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px]">
                {pendingInvites.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#eff4ff] text-[#005d42] flex items-center justify-center shrink-0">
                          <Mail className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-[#0b1c30]">{inv.email}</span>
                      </div>
                    </td>

                    <td className="py-4 px-5 text-slate-600 capitalize">
                      <span className="inline-flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-slate-400" />
                        {inv.role === 'admin' ? 'Broker Admin' : 'Agent / Broker Associate'}
                      </span>
                    </td>

                    <td className="py-4 px-5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-500" />
                        Pending Signup
                      </span>
                    </td>

                    <td className="py-4 px-5 text-slate-500 text-xs">
                      {inv.created_at
                        ? new Date(inv.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>

                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyInviteLink(inv.email)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#005d42] bg-[#005d42]/10 hover:bg-[#005d42]/20 transition-colors cursor-pointer border border-[#005d42]/20 flex items-center gap-1.5"
                          title="Copy shareable invite link"
                        >
                          {copiedEmail === inv.email ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Link</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRevokeInvite(inv.id, inv.email)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer border border-red-200"
                          title="Cancel this invitation"
                        >
                          Revoke
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Agent Detail Modal ── */}
      <AgentDetailModal
        agent={selectedAgent}
        leads={leads}
        isOpen={!!selectedAgent}
        onClose={() => setSelectedAgent(null)}
      />

      {/* ── Invite Agent Modal ── */}
      <InviteAgentModal
        isOpen={inviteModalOpen}
        orgId={activeOrgId}
        onClose={() => setInviteModalOpen(false)}
        onInviteSent={() => {
          fetchPendingInvites();
          refetchUsers();
        }}
        onNotify={onNotify}
      />
    </div>
  );
};
