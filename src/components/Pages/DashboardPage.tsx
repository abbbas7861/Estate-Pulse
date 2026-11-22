import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowRight,
  Calendar,
  CalendarCheck,
  ChevronDown,
  Contact,
  Download,
  Lock,
  MoreVertical,
  Phone,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { RevenueVelocityChart } from '../Charts/RevenueVelocityChart';
import { TodaysFollowUpsWidget } from '../Widgets/TodaysFollowUpsWidget';
import { useOrgUsers } from '../../lib/hooks/useOrgUsers';
import { useAuth } from '../../lib/useAuth';
import { supabase } from '../../lib/supabaseClient';
import { PageView } from '../../types/crm';
import { useSubscription } from '../../lib/hooks/useSubscription';
import { formatMoney, useCurrency } from '../../config/regional';

interface DashboardPageProps {
  leads: any[];
  properties: any[];
  orgId?: string | null;
  userId?: string | null;
  onNavigate: (page: PageView) => void;
  onExportReport: () => void;
  onNotify: (message: string) => void;
}

const DATE_RANGES = [
  'Last 30 Days',
  'Quarter to Date',
  'Year to Date',
];

export const DashboardPage: React.FC<DashboardPageProps> = ({
  leads,
  properties,
  orgId,
  userId,
  onNavigate,
  onExportReport,
  onNotify,
}) => {
  const { user, orgId: authOrgId, orgName } = useAuth();
  const effectiveOrgId = orgId || authOrgId;
  const { isLocked } = useSubscription(orgId ?? null);
  const locked = isLocked;
  const [currency] = useCurrency();
  const [dateRangeIdx, setDateRangeIdx] = useState(0);
  const [showingConfirmed, setShowingConfirmed] = useState(false);
  const { users: orgUsers } = useOrgUsers(orgId);

  // Business Health & Net Profit State
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalPendingRevenue, setTotalPendingRevenue] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);

  useEffect(() => {
    if (!effectiveOrgId) return;

    let isMounted = true;

    async function fetchFinancialData() {
      try {
        const [commissionsRes, expensesRes] = await Promise.all([
          supabase
            .from('commissions')
            .select('broker_share, status')
            .eq('org_id', effectiveOrgId),
          supabase
            .from('expenses')
            .select('amount')
            .eq('org_id', effectiveOrgId),
        ]);

        if (commissionsRes.data && isMounted) {
          let received = 0;
          let pending = 0;
          commissionsRes.data.forEach((row: { broker_share?: number | null; status?: string | null }) => {
            const share = Number(row.broker_share) || 0;
            const status = (row.status || '').trim().toLowerCase();
            if (status === 'received') {
              received += share;
            } else if (status === 'pending') {
              pending += share;
            }
          });
          setTotalRevenue(received);
          setTotalPendingRevenue(pending);
        }

        if (expensesRes.data && isMounted) {
          const expensesSum = expensesRes.data.reduce((sum: number, row: { amount?: number | null }) => {
            return sum + (Number(row.amount) || 0);
          }, 0);
          setTotalExpenses(expensesSum);
        }
      } catch (err) {
        console.warn('Failed to fetch financial health data:', err);
      }
    }

    fetchFinancialData();

    return () => {
      isMounted = false;
    };
  }, [effectiveOrgId]);

  const cycleDateRange = () => {
    setDateRangeIdx((prev) => (prev + 1) % DATE_RANGES.length);
  };

  const [profileName, setProfileName] = useState<string | null>(null);

  useEffect(() => {
    const activeUserId = userId || user?.id;
    if (!activeUserId) return;

    if (user?.user_metadata?.full_name) {
      setProfileName(user.user_metadata.full_name);
      return;
    }

    async function fetchUserProfile() {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', activeUserId)
          .maybeSingle();

        if (!error && data?.full_name) {
          setProfileName(data.full_name);
        }
      } catch (err) {
        console.warn('Could not fetch user profile full_name', err);
      }
    }

    fetchUserProfile();
  }, [userId, user?.id, user?.user_metadata?.full_name]);

  // Helper: returns true if the string looks like an email address
  const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

  // Resolve a display name: prefer full_name if it is NOT an email, else 'Partner'
  const resolveDisplayName = (name: string | null | undefined): string => {
    if (!name || isEmail(name)) return 'Partner';
    return name;
  };

  const greetingName =
    resolveDisplayName(profileName) !== 'Partner'
      ? resolveDisplayName(profileName)
      : resolveDisplayName(user?.user_metadata?.full_name) !== 'Partner'
      ? resolveDisplayName(user?.user_metadata?.full_name)
      : 'Partner';

  // 1. Total Pipeline Value: Sum budget of all leads regardless of stage
  const totalPipelineValue = useMemo(() => {
    return (leads || []).reduce((sum, l) => {
      const b = Number(l.budget ?? l.budgetAmount ?? 0);
      return sum + (isNaN(b) ? 0 : b);
    }, 0);
  }, [leads]);

  const totalPipelineValueFormatted = useMemo(() => {
    return formatMoney(totalPipelineValue, { compact: true, currency });
  }, [totalPipelineValue, currency]);

  // 2. Assigned Leads: Count leads where assigned_to is NOT null / empty
  const assignedLeadsCount = useMemo(() => {
    return (leads || []).filter((l) => {
      const assigned = l.assigned_to ?? l.assignedTo;
      return assigned !== null && assigned !== undefined && assigned !== '' && assigned !== 'unassigned';
    }).length;
  }, [leads]);

  // 3. Active Listings: Count properties where status is 'Active Listing'
  const activeListingsCount = useMemo(() => {
    return (properties || []).filter((p) => p.status === 'Active Listing').length;
  }, [properties]);

  // Pending Escrow computations
  const pendingEscrowProperties = useMemo(() => {
    return (properties || []).filter(
      (p) => p.status === 'Pending Escrow' || p.status === 'Pending'
    );
  }, [properties]);

  const pendingEscrowValue = useMemo(() => {
    return pendingEscrowProperties.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
  }, [pendingEscrowProperties]);

  const pendingEscrowValueFormatted = useMemo(() => {
    return formatMoney(pendingEscrowValue, { compact: true, currency });
  }, [pendingEscrowValue, currency]);

  const pendingCount = pendingEscrowProperties.length;
  const escrowVelocity =
    properties.length > 0
      ? `${((pendingCount / properties.length) * 100).toFixed(1)}%`
      : '0.0%';

  // 2. Urgent Follow-Up from real leads
  const urgentLead = useMemo(() => {
    if (!leads || leads.length === 0) return null;

    // Sort by oldest activity/creation (need follow-up most) and highest budget
    const sorted = [...leads].sort((a, b) => {
      const budgetA = Number(a.budgetAmount || a.budget) || 0;
      const budgetB = Number(b.budgetAmount || b.budget) || 0;
      const dateA = new Date(a.created_at || a.createdAt || 0).getTime();
      const dateB = new Date(b.created_at || b.createdAt || 0).getTime();

      // Highest budget first, then oldest created date
      if (budgetB !== budgetA) {
        return budgetB - budgetA;
      }
      return dateA - dateB;
    });

    return sorted[0];
  }, [leads]);

  const handleConfirmShowing = async () => {
    if (!urgentLead) return;

    try {
      if (orgId) {
        await supabase.from('tasks_meetings').insert({
          org_id: orgId,
          lead_id: urgentLead.id,
          assigned_to: userId || null,
          title: `Confirmed Showing with ${urgentLead.name}`,
          due_date: new Date().toISOString(),
          status: 'pending',
          type: 'meeting',
        });
      }
      setShowingConfirmed(true);
      onNotify(`Showing confirmed with ${urgentLead.name}`);
    } catch (err: any) {
      onNotify(`Failed to record showing: ${err.message}`);
    }
  };

  // Real leaderboard computed from leads and org users
  const leaderboard = useMemo(() => {
    return orgUsers
      .map((u) => {
        const userLeads = (leads || []).filter(
          (l) => l.assignedTo === u.id || l.assigned_to === u.id || l.brokerId === u.id
        );
        const dealsClosed = userLeads.filter((l) => {
          const s = (l.stage || l.stage_id || '').toLowerCase();
          return s === 'closing' || s === 'closed' || s === 'won';
        }).length;
        const closedVolume = userLeads
          .filter((l) => {
            const s = (l.stage || l.stage_id || '').toLowerCase();
            return s === 'closing' || s === 'closed' || s === 'won';
          })
          .reduce((sum, l) => sum + (l.budgetAmount || Number(l.budget) || 0), 0);
        const targetPct = Math.round((dealsClosed / 5) * 100);
        const volumeFormatted = formatMoney(closedVolume, { compact: true, currency });

        return {
          id: u.id,
          name: u.full_name,
          avatarUrl: u.avatar_url,
          dealsClosed,
          volumeFormatted,
          targetPct,
        };
      })
      .sort((a, b) => b.dealsClosed - a.dealsClosed || b.targetPct - a.targetPct);
  }, [orgUsers, leads]);

  return (
    <div className="p-5 sm:p-6 lg:p-8 flex flex-col gap-6 bg-[var(--bg-main)] text-[var(--text-main)]">
      {/* Top Executive Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="font-semibold text-[#005d42] tracking-wide">Executive Cockpit</span>
            <span className="text-[#bdc9c1]" aria-hidden="true">
              ·
            </span>
            <span className="text-[#3e4943]">{orgName || 'Main Office'}</span>
          </div>
          {/* FIX #8: Real Name Greeting */}
          <h1 className="font-display font-bold text-2xl sm:text-3xl lg:text-[34px] text-[var(--text-main)] tracking-tight mt-0.5 leading-tight">
            Good morning, {greetingName}
          </h1>
          <p className="text-[14px] text-[#3e4943] mt-1">
            Here is your brokerage portfolio overview and deal velocity for this month.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={cycleDateRange}
            className="flex items-center gap-2 bg-white hover:bg-[#eff4ff] px-3.5 py-2 rounded-lg border border-slate-200/80 text-[12px] font-medium text-[#0b1c30] transition-colors cursor-pointer whitespace-nowrap shadow-xs"
          >
            <Calendar className="w-4 h-4 text-[#6e7a73]" />
            <span>{DATE_RANGES[dateRangeIdx]}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#6e7a73]" />
          </button>
          <button
            type="button"
            onClick={onExportReport}
            className="flex items-center gap-2 bg-white hover:bg-[#eff4ff] text-[#0b1c30] px-4 py-2 rounded-lg border border-slate-200/80 transition-colors text-[12px] font-semibold cursor-pointer whitespace-nowrap shadow-xs"
          >
            <Download className="w-4 h-4 text-[#005d42]" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Metrics Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Inbound Leads - FIX #9: Real leads count */}
        <div className="bg-[var(--bg-card)] rounded-xl p-5 flex flex-col justify-between border border-[var(--border-color)] group shadow-xs">
          <div className="flex items-start justify-between">
            <span className="text-[12px] font-medium text-[#3e4943]">Total Inbound Leads</span>
            <div className="w-8 h-8 rounded-lg bg-[#e5eeff] flex items-center justify-center text-[#005d42]">
              <Contact className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="flex items-baseline gap-2.5">
              <span className="font-display font-bold text-[30px] text-[var(--text-main)] leading-none tabular-nums">
                {leads.length.toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#006f67] tabular-nums">
                <TrendingUp className="w-3.5 h-3.5" />
                Live CRM
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#6e7a73] tabular-nums">
            <span>{leads.length} active in CRM</span>
            <span className="text-[#005d42] font-semibold">Live sync</span>
          </div>
        </div>

        {/* KPI 2: Assigned Leads - FIX #10: Real assigned count */}
        <div className="bg-[var(--bg-card)] rounded-xl p-5 flex flex-col justify-between border border-[var(--border-color)] shadow-xs">
          <div className="flex items-start justify-between">
            <span className="text-[12px] font-medium text-[#3e4943]">Assigned Leads</span>
            <div className="w-8 h-8 rounded-lg bg-[#99efe5] text-[#006f67] flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="flex items-baseline gap-2.5">
              <span className="font-display font-bold text-[30px] text-[var(--text-main)] leading-none tabular-nums">
                {assignedLeadsCount.toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#006f67] tabular-nums">
                <TrendingUp className="w-3.5 h-3.5" />
                {leads.length > 0 ? `${Math.round((assignedLeadsCount / leads.length) * 100)}%` : '0%'}
              </span>
            </div>
            <div className="w-full bg-[#eff4ff] h-2 rounded-full overflow-hidden mt-3">
              <div
                className="bg-[#006f67] h-full rounded-full transition-all"
                style={{
                  width: `${leads.length > 0 ? Math.round((assignedLeadsCount / leads.length) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#6e7a73]">
            <span>Active brokers assigned</span>
            <span className="text-[#006f67] font-semibold">Live status</span>
          </div>
        </div>

        {/* KPI 3: Active Listings - FIX #11, #12: Real properties length & pending escrow value */}
        <div className="bg-[var(--bg-card)] rounded-xl p-5 flex flex-col justify-between border border-[var(--border-color)] shadow-xs">
          <div className="flex items-start justify-between">
            <span className="text-[12px] font-medium text-[#3e4943]">Active Listings</span>
            <div className="w-8 h-8 rounded-lg bg-[#e5eeff] text-[#005d42] flex items-center justify-center font-bold text-[13px] select-none">
              {currency === 'PKR' ? '₨' : currency === 'AED' ? 'د.إ' : '$'}
            </div>
          </div>
          <div className="my-3">
            <div className="flex items-baseline gap-2.5">
              <span className="font-display font-bold text-[30px] text-[var(--text-main)] leading-none tabular-nums">
                {properties.length}
              </span>
              <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#006f67] tabular-nums">
                <TrendingUp className="w-3.5 h-3.5" />
                {pendingCount} pending
              </span>
            </div>
            <div className="flex items-center gap-2 mt-3 text-[12px] text-[#3e4943]">
              <span className="font-mono font-semibold text-[#005d42] tabular-nums">
                {pendingEscrowValueFormatted}
              </span>
              <span>total escrow volume</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#6e7a73]">
            <span>{pendingCount} pending escrow</span>
            <span className="text-[#005d42] font-semibold">{escrowVelocity} velocity</span>
          </div>
        </div>

        {/* KPI 4: Total Pipeline Value */}
        <div className="bg-[var(--bg-card)] rounded-xl p-5 flex flex-col justify-between border border-[var(--border-color)] shadow-xs">
          <div className="flex items-start justify-between">
            <span className="text-[12px] font-medium text-[#3e4943]">Total Pipeline Value</span>
            <div className="w-8 h-8 rounded-lg bg-[#99efe5] text-[#006f67] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="flex items-baseline gap-2.5">
              <span className="font-display font-bold text-[30px] text-[var(--text-main)] leading-none tabular-nums">
                {totalPipelineValueFormatted}
              </span>
              <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#006f67] tabular-nums">
                <TrendingUp className="w-3.5 h-3.5" />
                Active
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-3">
              <span className="inline-block w-2 h-2 rounded-full bg-[#006f67]" />
              <span className="text-[12px] text-[#3e4943] font-medium">
                Total buyer purchasing power
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#6e7a73]">
            <span>Across all active leads</span>
            <span className="text-[#005d42] font-semibold">Live CRM</span>
          </div>
        </div>
      </div>

      {/* Business Health & Net Profit Banner */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-5 sm:p-6 shadow-xs flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#e5eeff] flex items-center justify-center text-[#005d42]">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display font-bold text-[18px] text-[var(--text-main)] tracking-tight">
                Business Health & Net Profit
              </h2>
              <p className="text-[12px] text-[#3e4943]">
                Consolidated financial performance tracking brokerage revenue, expenses, and retained profits
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
            <button
              type="button"
              onClick={() => onNavigate('commissions')}
              className="font-semibold text-[#005d42] hover:text-[#004d37] hover:underline cursor-pointer"
            >
              Commissions
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => onNavigate('expenses')}
              className="font-semibold text-[#005d42] hover:text-[#004d37] hover:underline cursor-pointer"
            >
              Expenses
            </button>
          </div>
        </div>

        {/* 3 Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Gross Revenue */}
          <div className="bg-[#f8fafc] rounded-xl p-4 sm:p-5 border border-slate-200/70 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[12px] font-medium text-[#3e4943]">Gross Revenue</span>
                <span className="block text-[10px] text-[#6e7a73] mt-0.5">Settled broker share</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                Received
              </span>
            </div>
            <div className="my-3">
              <div className="font-display font-bold text-[28px] text-emerald-600 leading-tight tabular-nums">
                {formatMoney(totalRevenue, { compact: true, currency })}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[12px] text-amber-700 font-medium">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>
                  Pending:{' '}
                  <span className="font-mono font-semibold">
                    {formatMoney(totalPendingRevenue, { compact: true, currency })}
                  </span>
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#6e7a73] pt-2 border-t border-slate-200/60">
              <span>Commission earnings</span>
              <span className="text-emerald-700 font-medium">Live sync</span>
            </div>
          </div>

          {/* 2. Total Expenses */}
          <div className="bg-[#f8fafc] rounded-xl p-4 sm:p-5 border border-slate-200/70 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[12px] font-medium text-[#3e4943]">Total Expenses</span>
                <span className="block text-[10px] text-[#6e7a73] mt-0.5">Operating overhead</span>
              </div>
              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60">
                Outflow
              </span>
            </div>
            <div className="my-3">
              <div className="font-display font-bold text-[28px] text-rose-600 leading-tight tabular-nums">
                {formatMoney(totalExpenses, { compact: true, currency })}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[12px] text-[#3e4943]">
                <span>Rent, payroll, bills & marketing</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#6e7a73] pt-2 border-t border-slate-200/60">
              <span>Operational costs</span>
              <span className="text-rose-700 font-medium">Recorded</span>
            </div>
          </div>

          {/* 3. Net Profit */}
          <div className="bg-emerald-50/50 rounded-xl p-4 sm:p-5 border border-emerald-200/80 flex flex-col justify-between shadow-xs">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[12px] font-semibold text-emerald-950">Net Profit</span>
                <span className="block text-[10px] text-emerald-800/80 mt-0.5">Revenue - Expenses</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full border border-emerald-300/40">
                <TrendingUp className="w-3 h-3 text-emerald-600" />
                <span>Brokerage Net</span>
              </div>
            </div>
            <div className="my-3">
              <div className="flex items-baseline gap-2.5">
                <span className="font-display font-extrabold text-[28px] text-emerald-700 leading-tight tabular-nums">
                  {formatMoney(totalRevenue - totalExpenses, { compact: true, currency })}
                </span>
                <span className="inline-flex items-center gap-1 text-[12px] font-bold text-emerald-600">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[12px] text-emerald-800 font-medium">
                <span>
                  Net Margin:{' '}
                  <span className="font-mono font-semibold">
                    {totalRevenue > 0
                      ? `${(((totalRevenue - totalExpenses) / totalRevenue) * 100).toFixed(1)}%`
                      : '0.0%'}
                  </span>
                </span>
                <span className="text-emerald-500">·</span>
                <span>Retained earnings</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-emerald-700 pt-2 border-t border-emerald-200/60">
              <span>Brokerage bottom line</span>
              <span className="font-semibold text-emerald-800">Healthy</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts & Agenda Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Chart & Portfolio — blur-gated when trial is locked */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Trial-expired blur overlay over the analytics chart */}
          <div className="relative rounded-xl overflow-hidden">
            <div
              className={locked ? 'blur-md pointer-events-none select-none brightness-75' : ''}
              aria-hidden={locked}
            >
              <RevenueVelocityChart />
            </div>
            {locked && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-amber-300 dark:border-amber-600 rounded-2xl px-8 py-7 flex flex-col items-center gap-4 shadow-2xl max-w-sm text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/40 dark:to-amber-800/20 flex items-center justify-center shadow-sm">
                    <Lock className="w-7 h-7 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-[#0b1c30] dark:text-slate-100 text-[17px] leading-snug">
                      Brokerage License Required
                    </p>
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                      Purchase a commercial plan to unlock analytics, revenue velocity charts, and deal telemetry.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('billing')}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#047857] to-[#005d42] hover:from-[#005d42] hover:to-[#004d37] text-white text-[13px] font-bold transition-all cursor-pointer shadow-md hover:shadow-lg hover:scale-[1.02]"
                  >
                    Purchase License ($49/mo)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Properties Summary Row */}
          <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold text-[18px] text-[#0b1c30]">
                  Featured Portfolio Listings
                </h3>
                <p className="text-[12px] text-[#3e4943]">Top tier active brokerage assets</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('properties')}
                className="text-xs font-semibold text-[#005d42] hover:text-[#004d37] flex items-center gap-1 cursor-pointer"
              >
                <span>View All Listings</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {properties.length > 0 ? (
                properties.slice(0, 2).map((prop) => (
                  <div
                    key={prop.id}
                    onClick={() => onNavigate('properties')}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-[#005d42]/40 transition-all cursor-pointer flex gap-3 group bg-[#f8fafc]"
                  >
                    {prop.imageUrl || prop.image_url ? (
                      <img
                        src={prop.imageUrl || prop.image_url}
                        alt={prop.title}
                        className="w-20 h-20 rounded-lg object-cover shrink-0 border border-slate-200"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-slate-200 flex items-center justify-center text-xs text-slate-400 shrink-0">
                        No photo
                      </div>
                    )}
                    <div className="flex flex-col justify-between min-w-0">
                      <div>
                        <span className="text-[10px] font-bold text-[#006f67] bg-[#99efe5]/50 px-2 py-0.5 rounded">
                          {prop.status}
                        </span>
                        <h4 className="font-display font-bold text-sm text-[#0b1c30] truncate mt-1 group-hover:text-[#005d42] transition-colors">
                          {prop.title}
                        </h4>
                        <span className="text-xs text-slate-500 truncate block">{prop.address}</span>
                      </div>
                      <span className="font-mono font-bold text-sm text-[#005d42]">
                        {prop.priceFormatted || prop.price_formatted}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center text-sm text-gray-500 py-4">
                  No properties found. Add one in the Properties section!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Today's Follow-ups Widget & Agent Leaderboard */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Today's Follow-ups Widget */}
          <TodaysFollowUpsWidget orgId={orgId ?? null} userId={userId ?? undefined} onNotify={onNotify} />

          {/* FIX #14: Urgent Follow-Up - Real Lead Data */}
          <div className="bg-white rounded-xl p-6 border border-slate-200/80 flex flex-col gap-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-[18px] text-[#0b1c30]">Urgent Follow-Up</h3>
              <span className="text-[11px] font-semibold text-[#93000a]">Priority 1</span>
            </div>

            {urgentLead ? (
              <div className="bg-[#eff4ff] rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#047857] text-white flex items-center justify-center font-display text-[13px] font-bold shrink-0">
                    {urgentLead.name ? urgentLead.name.slice(0, 2).toUpperCase() : 'LD'}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-display font-semibold text-[15px] text-[#0b1c30] leading-tight">
                      {urgentLead.name}
                    </span>
                    <span className="text-[12px] text-[#3e4943] truncate">
                      {urgentLead.targetProperty || 'General Inquiry'} (
                      {urgentLead.budgetFormatted ||
                        (urgentLead.budget ? `$${Number(urgentLead.budget).toLocaleString()}` : '$0')}
                      {' budget'})
                    </span>
                  </div>
                </div>

                <p className="text-[12px] text-[#0b1c30] bg-white p-3 rounded-lg leading-relaxed">
                  Stage: <span className="font-semibold text-[#005d42]">{urgentLead.stage || urgentLead.stage_id || 'Active'}</span>.
                  {urgentLead.note
                    ? ` “${urgentLead.note}”`
                    : ' High-priority pipeline lead pending follow-up and property tour scheduling.'}
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (urgentLead.phone) {
                        window.location.href = `tel:${urgentLead.phone}`;
                        onNotify(`Dialing ${urgentLead.name} at ${urgentLead.phone}...`);
                      } else {
                        onNotify(`No phone number on record for ${urgentLead.name}.`);
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-[#047857] hover:bg-[#005d42] text-white py-2 px-3 rounded-lg transition-colors text-[12px] font-semibold cursor-pointer whitespace-nowrap"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Client</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmShowing}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-[#dce9ff] text-[#0b1c30] py-2 px-3 rounded-lg border border-slate-200 transition-colors text-[12px] font-semibold cursor-pointer whitespace-nowrap"
                  >
                    <CalendarCheck className="w-3.5 h-3.5 text-[#005d42]" />
                    <span>{showingConfirmed ? 'Showing Confirmed' : 'Confirm Showing'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-[#eff4ff] rounded-xl p-6 text-center text-[#6e7a73] text-[13px]">
                No urgent follow-ups. You're all caught up.
              </div>
            )}

            <div className="flex flex-col gap-3 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-[#6e7a73]">Real-Time Broker Feed</span>
              {leads && leads.length > 0 ? (
                leads.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#99efe5] text-[#006f67] flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[12px] font-semibold text-[#0b1c30] truncate">{item.name}</span>
                      <p className="text-[12px] text-[#3e4943] truncate">
                        {item.targetProperty || 'General Portfolio'} •{' '}
                        <span className="font-mono font-semibold text-[#005d42] tabular-nums">
                          {item.budgetFormatted ||
                            (item.budget ? `$${Number(item.budget).toLocaleString()}` : '$0')}
                        </span>
                      </p>
                      <span className="text-[11px] text-[#6e7a73] mt-0.5">
                        {item.timeAgo || 'Recently'} {item.brokerName ? `• ${item.brokerName}` : ''}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-[#6e7a73] py-1">No recent broker activity logged.</p>
              )}
            </div>
          </div>

          {/* Agent Leaderboard */}
          <div className="bg-white rounded-xl p-6 border border-slate-200/80 flex flex-col gap-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold text-[18px] text-[#0b1c30]">
                  Agent Leaderboard
                </h3>
                <p className="text-[12px] text-[#3e4943]">Volume closed month-to-date</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('team')}
                className="p-1.5 rounded-lg text-[#6e7a73] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors cursor-pointer"
                aria-label="View team details"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {leaderboard.length === 0 ? (
                <p className="text-[12px] text-[#6e7a73] py-4 text-center">No team members registered yet.</p>
              ) : (
                leaderboard.slice(0, 3).map((broker, idx) => (
                  <div
                    key={broker.id}
                    onClick={() => onNavigate('team')}
                    className={`flex items-center justify-between p-2.5 rounded-lg transition-colors cursor-pointer ${
                      idx === 0 ? 'bg-[#eff4ff]' : 'hover:bg-[#eff4ff]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 tabular-nums ${
                          idx === 0
                            ? 'bg-[#99efe5] text-[#006f67]'
                            : 'bg-[#e5eeff] text-[#0b1c30]'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      {broker.avatarUrl ? (
                        <img
                          src={broker.avatarUrl}
                          alt={broker.name}
                          referrerPolicy="no-referrer"
                          className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#005d42] text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {broker.name ? broker.name[0] : 'A'}
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="text-[12px] font-semibold text-[#0b1c30] truncate">
                          {broker.name}
                        </span>
                        <span className="text-[11px] text-[#3e4943] tabular-nums">
                          {broker.dealsClosed} Deals Closed
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 tabular-nums">
                      <span
                        className={`font-mono font-bold text-[14px] ${
                          idx === 0 ? 'text-[#005d42]' : 'text-[#0b1c30]'
                        }`}
                      >
                        {broker.volumeFormatted}
                      </span>
                      <span
                        className={`text-[11px] ${
                          idx === 0 ? 'text-[#005d42] font-medium' : 'text-[#6e7a73]'
                        }`}
                      >
                        {broker.targetPct}% Target
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={() => onNavigate('team')}
              className="w-full py-2 text-center text-[12px] font-semibold text-[#005d42] hover:bg-[#eff4ff] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              View Full Team Performance →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};