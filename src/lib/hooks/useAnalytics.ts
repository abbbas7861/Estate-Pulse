/**
 * useAnalytics.ts – High-Performance Analytics & Executive Telemetry Hooks
 * Step 5: Executive Cockpit Layer for EstatePulse Brokerage Pro.
 * Provides views-backed queries with client-side computation from real database rows.
 * 
 * FIX #21, #22, #23, #24:
 *   - Purged all fake seed data, hardcoded percentages, and fallback arrays.
 *   - Fetches real team members from public.users for stage-wise distribution (#21).
 *   - Computes real lead funnel counts with 0 counts when empty (#22).
 *   - Computes real deal size buckets from leads (#23).
 *   - Computes real product summary from properties (#24).
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import {
  AnalyticsDateRange,
  LeadFunnelStage,
  EmployeeSummaryItem,
  DealSizeSummaryItem,
  ProductSummaryItem,
  MonthlyTrendItem,
  StageWiseDistribution,
} from '../../types/crm';

// Standard 8-stage funnel order as required
export const FUNNEL_STAGES = [
  'Assigned',
  'Awareness',
  'Contacted',
  'Interest',
  'Conversion',
  'Qualification',
  'Closing',
  'Rejected',
] as const;

function getDateRangeBoundary(dateRange: AnalyticsDateRange): Date {
  const now = new Date();
  if (dateRange === '30d') {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return d;
  }
  if (dateRange === 'qtd') {
    const quarter = Math.floor(now.getMonth() / 3);
    return new Date(now.getFullYear(), quarter * 3, 1);
  }
  // ytd
  return new Date(now.getFullYear(), 0, 1);
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return `$${amount.toLocaleString('en-US')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. useLeadFunnel (FIX #22)
// ─────────────────────────────────────────────────────────────────────────────

export function useLeadFunnel(orgId: string | null, dateRange: AnalyticsDateRange = '30d') {
  const [data, setData] = useState<LeadFunnelStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFunnel = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const boundary = getDateRangeBoundary(dateRange);

      // Attempt view query first
      let viewQuery = supabase
        .from('v_lead_funnel')
        .select('*')
        .order('stage_order', { ascending: true });

      if (orgId) {
        viewQuery = viewQuery.eq('org_id', orgId);
      }

      const { data: viewData, error: viewError } = await viewQuery;

      if (!viewError && viewData && viewData.length > 0) {
        // Map from SQL view
        const totalFirst = Number(viewData[0]?.lead_count) || 1;
        const mapped: LeadFunnelStage[] = FUNNEL_STAGES.map((st, idx) => {
          const row = viewData.find((r: any) => r.stage_name?.toLowerCase() === st.toLowerCase());
          const count = Number(row?.lead_count) || 0;
          const val = Number(row?.total_pipeline_value) || 0;
          return {
            stage: st,
            order: idx + 1,
            count,
            conversionPct: totalFirst > 0 ? Math.round((count / totalFirst) * 100) : 0,
            pipelineValue: val,
            pipelineValueFormatted: formatCurrency(val),
          };
        });
        setData(mapped);
        setLoading(false);
        return;
      }

      // Fallback: Query public.leads directly
      let leadsQuery = supabase
        .from('leads')
        .select('stage, stage_id, budget, created_at')
        .gte('created_at', boundary.toISOString());

      if (orgId) {
        leadsQuery = leadsQuery.eq('org_id', orgId);
      }

      const { data: leadsData, error: leadsError } = await leadsQuery;

      if (leadsError) {
        throw leadsError;
      }

      // Aggregate client-side with 0 initialized counts
      const counts: Record<string, { count: number; value: number }> = {};
      FUNNEL_STAGES.forEach((s) => {
        counts[s] = { count: 0, value: 0 };
      });

      if (leadsData && leadsData.length > 0) {
        leadsData.forEach((l: any) => {
          const s = (l.stage || l.stage_id || '').toLowerCase();
          let target = 'Assigned';
          if (s.includes('aware')) target = 'Awareness';
          else if (s.includes('contact')) target = 'Contacted';
          else if (s.includes('tour') || s.includes('interest')) target = 'Interest';
          else if (s.includes('meet') || s.includes('convert') || s.includes('schedul')) target = 'Conversion';
          else if (s.includes('qualif') || s.includes('underwrit')) target = 'Qualification';
          else if (s.includes('negotiat') || s.includes('clos') || s.includes('escrow') || s.includes('won')) target = 'Closing';
          else if (s.includes('reject') || s.includes('lost')) target = 'Rejected';
          else target = 'Assigned';

          counts[target].count += 1;
          counts[target].value += Number(l.budget) || 0;
        });
      }

      const topCount = counts['Assigned'].count || 1;
      const result: LeadFunnelStage[] = FUNNEL_STAGES.map((st, idx) => {
        const item = counts[st];
        return {
          stage: st,
          order: idx + 1,
          count: item.count,
          conversionPct: counts['Assigned'].count > 0 ? Math.round((item.count / topCount) * 100) : 0,
          pipelineValue: item.value,
          pipelineValueFormatted: formatCurrency(item.value),
        };
      });

      setData(result);
    } catch (err: any) {
      console.warn('[useLeadFunnel] Error fetching lead funnel:', err.message);
      // Empty zero-state when error or no data
      const emptyRes: LeadFunnelStage[] = FUNNEL_STAGES.map((st, idx) => ({
        stage: st,
        order: idx + 1,
        count: 0,
        conversionPct: 0,
        pipelineValue: 0,
        pipelineValueFormatted: '$0',
      }));
      setData(emptyRes);
      setError(err?.message || null);
    } finally {
      setLoading(false);
    }
  }, [orgId, dateRange]);

  useEffect(() => {
    fetchFunnel();
  }, [fetchFunnel]);

  return { data, loading, error, refetch: fetchFunnel };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. useEmployeeSummary
// ─────────────────────────────────────────────────────────────────────────────

export function useEmployeeSummary(orgId: string | null, dateRange: AnalyticsDateRange = '30d') {
  const [data, setData] = useState<EmployeeSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Try view
      let viewQuery = supabase.from('v_employee_summary').select('*');
      if (orgId) {
        viewQuery = viewQuery.eq('org_id', orgId);
      }
      const { data: viewData, error: viewError } = await viewQuery;

      if (!viewError && viewData && viewData.length > 0) {
        const mapped: EmployeeSummaryItem[] = viewData.map((row: any) => ({
          id: row.user_id,
          name: row.agent_name || 'Agent',
          email: row.agent_email || '',
          phone: row.agent_phone || '—',
          role: row.agent_role || 'Senior Broker Associate',
          avatarUrl: row.avatar_url || '',
          initials: (row.agent_name || 'AG').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
          totalLeads: Number(row.total_leads) || 0,
          assigned: Number(row.assigned_active) || 0,
          won: Number(row.won_count) || 0,
          lost: Number(row.lost_count) || 0,
          conversionPct: Number(row.conversion_pct) || 0,
          avgResponseTime: '—',
          pipelineValue: Number(row.pipeline_value) || 0,
          pipelineValueFormatted: formatCurrency(Number(row.pipeline_value) || 0),
          dealsClosed: Number(row.won_count) || 0,
          monthlyTargetPct: Number(row.target_achievement_pct) || 0,
          quotaTarget: Number(row.quota_target) || 5,
        }));
        setData(mapped);
        setLoading(false);
        return;
      }

      // Query public.users and public.leads
      let usersQuery = supabase.from('users').select('*');
      if (orgId) {
        usersQuery = usersQuery.eq('org_id', orgId);
      }
      const { data: usersData } = await usersQuery;

      let leadsQuery = supabase.from('leads').select('*');
      if (orgId) {
        leadsQuery = leadsQuery.eq('org_id', orgId);
      }
      const { data: leadsData } = await leadsQuery;

      const leadsList = leadsData || [];
      const agentsList = usersData && usersData.length > 0 ? usersData : [];

      const calculated: EmployeeSummaryItem[] = agentsList.map((ag: any) => {
        const agName = ag.full_name || ag.email?.split('@')[0] || 'Broker Associate';
        const agId = ag.id;
        const agentLeads = leadsList.filter(
          (l: any) =>
            l.assigned_to === agId ||
            l.broker_id === agId ||
            (l.broker_name && l.broker_name.toLowerCase() === agName.toLowerCase())
        );

        const won = agentLeads.filter((l: any) =>
          ['closing', 'negotiation', 'offer & escrow', 'won', 'closed'].includes((l.stage || l.stage_id || '').toLowerCase())
        ).length;

        const lost = agentLeads.filter((l: any) =>
          ['rejected', 'lost'].includes((l.stage || l.stage_id || '').toLowerCase())
        ).length;

        const assigned = agentLeads.length - won - lost;
        const total = agentLeads.length;
        const conv = total > 0 ? Math.round((won / total) * 100) : 0;
        const pipelineVal = agentLeads.reduce((acc: number, cur: any) => acc + (Number(cur.budget) || 0), 0);

        return {
          id: ag.id,
          name: agName,
          email: ag.email || '',
          phone: ag.phone || '—',
          role: ag.role || 'Senior Broker Associate',
          avatarUrl: ag.avatar_url || '',
          initials: agName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'BA',
          totalLeads: total,
          assigned: assigned > 0 ? assigned : 0,
          won,
          lost,
          conversionPct: conv,
          avgResponseTime: '—',
          pipelineValue: pipelineVal,
          pipelineValueFormatted: formatCurrency(pipelineVal),
          dealsClosed: won,
          monthlyTargetPct: Math.round((won / 5) * 100),
          quotaTarget: 5,
        };
      });

      setData(calculated);
    } catch (err: any) {
      console.warn('[useEmployeeSummary] error loading summary:', err.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, dateRange]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  return { data, loading, error, refetch: fetchEmployees };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. useDealSizeSummary (FIX #23)
// ─────────────────────────────────────────────────────────────────────────────

const BUCKET_ORDER = ['<$500K', '$500K–$1M', '$1M–$5M', '$5M–$10M', '>$10M'] as const;

export function useDealSizeSummary(orgId: string | null) {
  const [data, setData] = useState<DealSizeSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBuckets = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('v_deal_size_summary').select('*').order('bucket_order');
      if (orgId) {
        query = query.eq('org_id', orgId);
      }
      const { data: viewData, error: viewError } = await query;

      if (!viewError && viewData && viewData.length > 0) {
        const totalCount = viewData.reduce((sum: number, r: any) => sum + (Number(r.lead_count) || 0), 0) || 1;
        const mapped = viewData.map((r: any, idx: number) => ({
          bucket: r.bucket_label,
          order: r.bucket_order || idx + 1,
          count: Number(r.lead_count) || 0,
          percentage: Math.round(((Number(r.lead_count) || 0) / totalCount) * 100),
          totalValue: Number(r.total_value) || 0,
          totalValueFormatted: formatCurrency(Number(r.total_value) || 0),
        }));
        setData(mapped);
        setLoading(false);
        return;
      }

      // Direct calculation from leads
      let leadsQuery = supabase.from('leads').select('budget');
      if (orgId) leadsQuery = leadsQuery.eq('org_id', orgId);
      const { data: leadsData } = await leadsQuery;

      const buckets: Record<string, { count: number; totalVal: number }> = {
        '<$500K': { count: 0, totalVal: 0 },
        '$500K–$1M': { count: 0, totalVal: 0 },
        '$1M–$5M': { count: 0, totalVal: 0 },
        '$5M–$10M': { count: 0, totalVal: 0 },
        '>$10M': { count: 0, totalVal: 0 },
      };

      if (leadsData && leadsData.length > 0) {
        leadsData.forEach((l: any) => {
          const b = Number(l.budget) || 0;
          if (b < 500_000) {
            buckets['<$500K'].count += 1;
            buckets['<$500K'].totalVal += b;
          } else if (b < 1_000_000) {
            buckets['$500K–$1M'].count += 1;
            buckets['$500K–$1M'].totalVal += b;
          } else if (b < 5_000_000) {
            buckets['$1M–$5M'].count += 1;
            buckets['$1M–$5M'].totalVal += b;
          } else if (b <= 10_000_000) {
            buckets['$5M–$10M'].count += 1;
            buckets['$5M–$10M'].totalVal += b;
          } else {
            buckets['>$10M'].count += 1;
            buckets['>$10M'].totalVal += b;
          }
        });
      }

      const totalAll = Object.values(buckets).reduce((sum, b) => sum + b.count, 0);
      const res: DealSizeSummaryItem[] = BUCKET_ORDER.map((lbl, idx) => ({
        bucket: lbl,
        order: idx + 1,
        count: buckets[lbl].count,
        percentage: totalAll > 0 ? Math.round((buckets[lbl].count / totalAll) * 100) : 0,
        totalValue: buckets[lbl].totalVal,
        totalValueFormatted: formatCurrency(buckets[lbl].totalVal),
      }));

      setData(res);
    } catch {
      // Empty zero-state
      const zeroDefaults: DealSizeSummaryItem[] = BUCKET_ORDER.map((b, idx) => ({
        bucket: b,
        order: idx + 1,
        count: 0,
        percentage: 0,
        totalValue: 0,
        totalValueFormatted: '$0',
      }));
      setData(zeroDefaults);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchBuckets();
  }, [fetchBuckets]);

  return { data, loading, refetch: fetchBuckets };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. useProductSummary (FIX #24)
// ─────────────────────────────────────────────────────────────────────────────

const PRODUCT_PALETTE: Record<string, string> = {
  Residential: '#005d42',
  Commercial: '#0284c7',
  Plot: '#7c3aed',
  Shop: '#d97706',
  Building: '#006f67',
  Penthouse: '#e11d48',
};

export function useProductSummary(orgId: string | null) {
  const [data, setData] = useState<ProductSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('v_product_summary').select('*');
      if (orgId) query = query.eq('org_id', orgId);
      const { data: viewData, error: viewError } = await query;

      if (!viewError && viewData && viewData.length > 0) {
        const total = viewData.reduce((s: number, r: any) => s + (Number(r.lead_count) || 0), 0) || 1;
        const mapped = viewData.map((r: any) => ({
          type: r.product_type,
          count: Number(r.lead_count) || 0,
          percentage: Math.round(((Number(r.lead_count) || 0) / total) * 100),
          totalValue: Number(r.total_value) || 0,
          totalValueFormatted: formatCurrency(Number(r.total_value) || 0),
          color: PRODUCT_PALETTE[r.product_type] || '#64748b',
        }));
        setData(mapped);
        setLoading(false);
        return;
      }

      // Query real properties
      let propQuery = supabase.from('properties').select('type, price');
      if (orgId) propQuery = propQuery.eq('org_id', orgId);
      const { data: propData } = await propQuery;

      const tally: Record<string, { count: number; val: number }> = {
        Residential: { count: 0, val: 0 },
        Commercial: { count: 0, val: 0 },
        Plot: { count: 0, val: 0 },
        Shop: { count: 0, val: 0 },
        Building: { count: 0, val: 0 },
      };

      if (propData && propData.length > 0) {
        propData.forEach((p: any) => {
          const t = p.type || 'Residential';
          const matchedKey =
            Object.keys(tally).find((k) => k.toLowerCase() === t.toLowerCase()) || 'Residential';
          tally[matchedKey].count += 1;
          tally[matchedKey].val += Number(p.price) || 0;
        });
      }

      const totalCount = Object.values(tally).reduce((s, item) => s + item.count, 0);
      const res: ProductSummaryItem[] = Object.entries(tally).map(([type, stats]) => ({
        type,
        count: stats.count,
        percentage: totalCount > 0 ? Math.round((stats.count / totalCount) * 100) : 0,
        totalValue: stats.val,
        totalValueFormatted: formatCurrency(stats.val),
        color: PRODUCT_PALETTE[type] || '#005d42',
      }));

      setData(res);
    } catch {
      // Empty zero-state
      const zeroList: ProductSummaryItem[] = Object.keys(PRODUCT_PALETTE).slice(0, 5).map((type) => ({
        type,
        count: 0,
        percentage: 0,
        totalValue: 0,
        totalValueFormatted: '$0',
        color: PRODUCT_PALETTE[type],
      }));
      setData(zeroList);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { data, loading, refetch: fetchProducts };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. useMonthlyTrend
// ─────────────────────────────────────────────────────────────────────────────

export function useMonthlyTrend(orgId: string | null) {
  const [data, setData] = useState<MonthlyTrendItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMonthly = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('v_manager_monthly_trend').select('*').order('month_date');
      if (orgId) query = query.eq('org_id', orgId);
      const { data: viewData, error: viewError } = await query;

      if (!viewError && viewData && viewData.length > 0) {
        const mapped = viewData.map((r: any) => ({
          month: r.month_label,
          monthShort: r.month_short,
          leadsCreated: Number(r.leads_created) || 0,
          closedWon: Number(r.closed_won) || 0,
          closedLost: Number(r.closed_lost) || 0,
          wonVolume: Number(r.won_volume) || 0,
          wonVolumeFormatted: formatCurrency(Number(r.won_volume) || 0),
        }));
        setData(mapped);
        setLoading(false);
        return;
      }

      // Query real leads for the past 12 months
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const now = new Date();
      const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

      let leadsQuery = supabase
        .from('leads')
        .select('created_at, stage, stage_id, budget')
        .gte('created_at', twelveMonthsAgo.toISOString());

      if (orgId) leadsQuery = leadsQuery.eq('org_id', orgId);
      const { data: leadsData } = await leadsQuery;

      const monthlyMap: Record<string, { leads: number; won: number; lost: number; vol: number }> = {};
      const currentMonthIdx = now.getMonth();

      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), currentMonthIdx - i, 1);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap[ym] = { leads: 0, won: 0, lost: 0, vol: 0 };
      }

      (leadsData || []).forEach((lead: any) => {
        const ld = new Date(lead.created_at);
        const ym = `${ld.getFullYear()}-${String(ld.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyMap[ym]) {
          monthlyMap[ym].leads += 1;
          const s = (lead.stage || lead.stage_id || '').toLowerCase();
          const b = Number(lead.budget) || 0;
          if (s.includes('clos') || s.includes('won')) {
            monthlyMap[ym].won += 1;
            monthlyMap[ym].vol += b;
          } else if (s.includes('lost') || s.includes('reject')) {
            monthlyMap[ym].lost += 1;
          }
        }
      });

      const past12: MonthlyTrendItem[] = Object.entries(monthlyMap).map(([ym, stats]) => {
        const [yearStr, monthStr] = ym.split('-');
        const mIdx = parseInt(monthStr, 10) - 1;
        const mShort = months[mIdx];
        const mLabel = `${mShort} ${yearStr}`;
        return {
          month: mLabel,
          monthShort: mShort,
          leadsCreated: stats.leads,
          closedWon: stats.won,
          closedLost: stats.lost,
          wonVolume: stats.vol,
          wonVolumeFormatted: formatCurrency(stats.vol),
        };
      });

      setData(past12);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchMonthly();
  }, [fetchMonthly]);

  return { data, loading, refetch: fetchMonthly };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. useStageWiseDistribution (FIX #21)
// ─────────────────────────────────────────────────────────────────────────────

export function useStageWiseDistribution(orgId: string | null) {
  const [data, setData] = useState<StageWiseDistribution[]>([]);
  const [stages, setStages] = useState<string[]>(['Assigned', 'Awareness', 'Contacted', 'Touring', 'Closing']);
  const [loading, setLoading] = useState(true);

  const fetchDistribution = useCallback(async () => {
    setLoading(true);
    try {
      // FIX #21: Fetch real team members from public.users
      let usersQuery = supabase.from('users').select('id, full_name, email');
      if (orgId) usersQuery = usersQuery.eq('org_id', orgId);
      const { data: teamMembers } = await usersQuery;

      let query = supabase.from('leads').select('broker_name, stage, stage_id, assigned_to');
      if (orgId) query = query.eq('org_id', orgId);
      const { data: leads } = await query;

      const stageSet = new Set<string>(['Assigned', 'Awareness', 'Contacted', 'Touring', 'Closing']);

      // Build agent map with real team members
      const agentMap: Record<string, { id: string; stages: Record<string, number> }> = {};

      (teamMembers || []).forEach((tm: any) => {
        const name = tm.full_name || tm.email?.split('@')[0] || 'Broker';
        agentMap[name] = { id: tm.id, stages: {} };
      });

      (leads || []).forEach((l: any) => {
        const name = l.broker_name || 'Unassigned';
        const st = l.stage || l.stage_id || 'Assigned';
        stageSet.add(st);

        if (!agentMap[name]) {
          agentMap[name] = { id: l.assigned_to || name, stages: {} };
        }
        agentMap[name].stages[st] = (agentMap[name].stages[st] || 0) + 1;
      });

      const stageArray = Array.from(stageSet);
      setStages(stageArray);

      const result: StageWiseDistribution[] = Object.entries(agentMap).map(([name, info]) => {
        const total = Object.values(info.stages).reduce((a, b) => a + b, 0);
        return {
          agentName: name,
          agentId: info.id,
          stages: info.stages,
          total,
        };
      });

      setData(result);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchDistribution();
  }, [fetchDistribution]);

  return { data, stages, loading, refetch: fetchDistribution };
}
