import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { EmployeeSummaryItem, Lead, PageView } from '../../types/crm';
import { useOrgUsers } from '../../lib/hooks/useOrgUsers';
import { AgentDetailModal } from '../Modals/AgentDetailModal';
import { InviteAgentModal } from '../Modals/InviteAgentModal';

interface TeamPageProps {
  orgId: string | null;
  leads?: Lead[];
  onNavigate?: (page: PageView) => void;
  onNotify?: (msg: string) => void;
}

export const TeamPage: React.FC<TeamPageProps> = ({
  orgId,
  leads = [],
  onNavigate,
  onNotify,
}) => {
  const { users: orgUsers, loading, refetch } = useOrgUsers(orgId);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'name' | 'dealsClosed' | 'monthlyTargetPct' | 'totalLeads'>('monthlyTargetPct');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals state
  const [selectedAgent, setSelectedAgent] = useState<EmployeeSummaryItem | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  // Real calculations computed strictly from the Supabase leads table and users:
  // FIX #27: Uses real phone column from public.users or '—' if null.
  const agents: EmployeeSummaryItem[] = useMemo(() => {
    return orgUsers.map((user) => {
      const userLeads = leads.filter(
        (l: any) =>
          l.assignedTo === user.id ||
          l.assigned_to === user.id ||
          l.brokerId === user.id ||
          (l.brokerName && l.brokerName.toLowerCase() === user.full_name.toLowerCase())
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
        if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
        if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}k`;
        return `$${val.toLocaleString('en-US')}`;
      };

      return {
        id: user.id,
        name: user.full_name,
        email: user.email,
        phone: user.phone || '—', // FIX #27: Real phone column from public.users or '—' if null
        role: user.role,
        avatarUrl: user.avatar_url || '',
        initials: user.initials,
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
  }, [orgUsers, leads]);

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

  const handleAgentInvited = () => {
    refetch();
    onNotify?.('Agent invitation dispatched.');
  };

  return (
    <div className="p-5 sm:p-6 lg:p-8 flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#005d42]">
            <span>BROKERAGE ROSTER &amp; TEAMS</span>
            <span className="text-[#bdc9c1]">·</span>
            <span className="text-[#3e4943]">Organization Team Members</span>
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
            className="px-4 py-2.5 rounded-lg bg-white hover:bg-[#eff4ff] text-[#0b1c30] border border-slate-200/80 text-[13px] font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4 text-[#005d42]" />
            <span>Export Team CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setInviteModalOpen(true)}
            className="px-4 py-2.5 rounded-lg bg-[#047857] hover:bg-[#005d42] text-white text-[13px] font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Agent</span>
          </button>
        </div>
      </div>

      {/* Team Summary Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 flex items-center justify-between shadow-xs">
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

        <div className="bg-white rounded-xl p-5 border border-slate-200/80 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[12px] font-medium text-[#3e4943]">Active Pipeline Volume</span>
            <p className="font-display font-bold text-[28px] text-[#0b1c30] mt-1 tabular-nums">
              ${(totalPipeline / 1_000_000).toFixed(1)}M
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

        <div className="bg-white rounded-xl p-5 border border-slate-200/80 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[12px] font-medium text-[#3e4943]">Average Response SLA</span>
            <p className="font-display font-bold text-[28px] text-[#0b1c30] mt-1 tabular-nums">
              —
            </p>
            <span className="text-[11px] text-[#3e4943]">Tracking in progress</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#eff4ff] flex items-center justify-center text-[#005d42]">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search broker by name or specialty…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[#005d42]"
          />
        </div>

        {/* Sorting controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto text-[12px]">
          <span className="text-slate-500 font-medium">Sort by:</span>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as any)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-medium text-slate-700 focus:outline-none"
          >
            <option value="monthlyTargetPct">Quota Attainment %</option>
            <option value="dealsClosed">Deals Closed</option>
            <option value="totalLeads">Lead Pipeline</option>
            <option value="name">Agent Name</option>
          </select>
          <button
            type="button"
            onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 cursor-pointer"
            title="Toggle sort direction"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid of Agent Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 border border-slate-200/80 animate-pulse space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-200 mx-auto" />
              <div className="h-4 bg-slate-200 rounded w-3/4 mx-auto" />
              <div className="h-3 bg-slate-100 rounded w-1/2 mx-auto" />
              <div className="h-10 bg-slate-100 rounded-lg" />
            </div>
          ))}
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-display font-semibold text-lg text-slate-700">No agents found</h3>
          <p className="text-slate-500 text-sm mt-1">
            Invite a new team member or adjust your search filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredAgents.map((agent) => {
            return (
              <div
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className="bg-white rounded-xl border border-slate-200/80 p-5 flex flex-col justify-between hover:shadow-md hover:border-[#005d42]/40 transition-all duration-200 cursor-pointer group"
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
                  <div className="bg-[#eff4ff]/60 p-2 rounded-lg">
                    <span className="text-slate-400 block text-[10px]">Open Leads</span>
                    <span className="font-mono font-bold text-[#0b1c30] text-[13px]">
                      {agent.assigned}
                    </span>
                  </div>
                  <div className="bg-[#eff4ff]/60 p-2 rounded-lg">
                    <span className="text-slate-400 block text-[10px]">Closed MTD</span>
                    <span className="font-mono font-bold text-[#005d42] text-[13px]">
                      {agent.dealsClosed}
                    </span>
                  </div>
                  <div className="bg-[#eff4ff]/60 p-2 rounded-lg">
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

      {/* Modals */}
      <AgentDetailModal
        agent={selectedAgent}
        leads={leads}
        isOpen={!!selectedAgent}
        onClose={() => setSelectedAgent(null)}
      />

      <InviteAgentModal
        isOpen={inviteModalOpen}
        orgId={orgId}
        onClose={() => setInviteModalOpen(false)}
        onAgentInvited={handleAgentInvited}
      />
    </div>
  );
};
