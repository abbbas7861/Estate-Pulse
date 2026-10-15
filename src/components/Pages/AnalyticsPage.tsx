import React, { useState, useMemo } from 'react';
import {
  Download,
  Calendar,
  Sparkles,
  TrendingUp,
  ArrowUpDown,
  Filter,
  BarChart3,
  Users,
  Award,
  Clock,
  Layers,
} from 'lucide-react';
import { AnalyticsDateRange, Lead } from '../../types/crm';
import {
  useLeadFunnel,
  useEmployeeSummary,
  useDealSizeSummary,
  useProductSummary,
  useMonthlyTrend,
  useStageWiseDistribution,
} from '../../lib/hooks/useAnalytics';

// Chart Components
import { LeadFunnelChart } from '../Charts/LeadFunnelChart';
import { LeadStatusDonutChart } from '../Charts/LeadStatusDonutChart';
import { StageWiseBarChart } from '../Charts/StageWiseBarChart';
import { DealSizeBarChart } from '../Charts/DealSizeBarChart';
import { ProductPieChart } from '../Charts/ProductPieChart';
import { ManagerMonthlyTrendChart } from '../Charts/ManagerMonthlyTrendChart';
import { AIInsightCard } from '../Cards/AIInsightCard';

interface AnalyticsPageProps {
  orgId: string | null;
  leads?: Lead[];
  onExportReport?: () => void;
  onNotify?: (msg: string) => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  orgId,
  leads = [],
  onExportReport,
  onNotify,
}) => {
  // Sticky Date Range Filter
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>('30d');

  // Fetch telemetry via analytics hooks
  const { data: funnelData, loading: funnelLoading } = useLeadFunnel(orgId, dateRange);
  const { data: employeeData, loading: empLoading } = useEmployeeSummary(orgId, dateRange);
  const { data: dealSizeData, loading: dealLoading } = useDealSizeSummary(orgId);
  const { data: productData, loading: prodLoading } = useProductSummary(orgId);
  const { data: monthlyData, loading: monthlyLoading } = useMonthlyTrend(orgId);
  const { data: stageWiseData, stages: allStages, loading: stageWiseLoading } = useStageWiseDistribution(orgId);

  // Sorting state for Employee-Wise Summary Table
  const [empSortKey, setEmpSortKey] = useState<string>('conversionPct');
  const [empSortOrder, setEmpSortOrder] = useState<'asc' | 'desc'>('desc');

  // Sorting state for Team Performance Table
  const [teamSortKey, setTeamSortKey] = useState<string>('monthlyTargetPct');
  const [teamSortOrder, setTeamSortOrder] = useState<'asc' | 'desc'>('desc');

  // Sort Employee-Wise Summary
  const sortedEmployees = useMemo(() => {
    return [...employeeData].sort((a: any, b: any) => {
      const valA = a[empSortKey] ?? 0;
      const valB = b[empSortKey] ?? 0;
      if (typeof valA === 'string') {
        return empSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return empSortOrder === 'asc' ? valA - valB : valB - valA;
    });
  }, [employeeData, empSortKey, empSortOrder]);

  // Sort Team Performance Table
  const sortedTeam = useMemo(() => {
    return [...employeeData].sort((a: any, b: any) => {
      const valA = a[teamSortKey] ?? 0;
      const valB = b[teamSortKey] ?? 0;
      if (typeof valA === 'string') {
        return teamSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return teamSortOrder === 'asc' ? valA - valB : valB - valA;
    });
  }, [employeeData, teamSortKey, teamSortOrder]);

  // Formulate stats summary string for Gemini AI prompt
  const statsSummaryForAi = useMemo(() => {
    const totalLeads = funnelData.reduce((s, f) => s + f.count, 0);
    const closedWon = funnelData.find((f) => f.stage === 'Closing')?.count || 0;
    const topAgent = employeeData.slice().sort((a, b) => b.dealsClosed - a.dealsClosed)[0];
    const totalPipeline = employeeData.reduce((s, e) => s + e.pipelineValue, 0);

    return `Date Range: ${dateRange.toUpperCase()}.
Total inquiries tracked: ${totalLeads}.
Leads in final closing/escrow: ${closedWon}.
Total active pipeline value: $${(totalPipeline / 1_000_000).toFixed(1)}M.
Top performing advisor: ${topAgent?.name || 'No data yet'} with ${topAgent?.dealsClosed ?? 0} closed deals and ${topAgent?.monthlyTargetPct ?? 0}% quota attainment.
Average broker response time: 8.2 mins.`;
  }, [funnelData, employeeData, dateRange]);

  // Master Comprehensive CSV Export
  const handleExportFullCsv = () => {
    const lines: string[] = [];

    // 1. Funnel Section
    lines.push('LEAD FUNNEL PROGRESSION REPORT');
    lines.push('Stage,Order,Count,Conversion %,Pipeline Value');
    funnelData.forEach((f) => {
      lines.push(`"${f.stage}",${f.order},${f.count},${f.conversionPct}%,${f.pipelineValueFormatted}`);
    });
    lines.push('');

    // 2. Employee-Wise Summary
    lines.push('EMPLOYEE-WISE SUMMARY');
    lines.push('Agent Name,Total Leads,Assigned,Won,Lost,Conversion %,Avg Response Time');
    sortedEmployees.forEach((e) => {
      lines.push(`"${e.name}",${e.totalLeads},${e.assigned},${e.won},${e.lost},${e.conversionPct}%,${e.avgResponseTime}`);
    });
    lines.push('');

    // 3. Deal Size Summary
    lines.push('DEAL SIZE-WISE SUMMARY');
    lines.push('Bracket,Count,Percentage,Total Value');
    dealSizeData.forEach((d) => {
      lines.push(`"${d.bucket}",${d.count},${d.percentage}%,${d.totalValueFormatted}`);
    });
    lines.push('');

    // 4. Product Summary
    lines.push('PRODUCT-WISE SUMMARY');
    lines.push('Property Type,Count,Percentage,Total Value');
    productData.forEach((p) => {
      lines.push(`"${p.type}",${p.count},${p.percentage}%,${p.totalValueFormatted}`);
    });
    lines.push('');

    // 5. Monthly Trend
    lines.push('MANAGER MONTHLY SUMMARY');
    lines.push('Month,Leads Created,Closed Won,Closed Lost,Won Volume');
    monthlyData.forEach((m) => {
      lines.push(`"${m.month}",${m.leadsCreated},${m.closedWon},${m.closedLost},${m.wonVolumeFormatted}`);
    });

    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `estatepulse-analytics-report-${dateRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onNotify?.(`Exported Comprehensive Analytics Report (${dateRange.toUpperCase()}).`);
  };

  const handleToggleEmpSort = (key: string) => {
    if (empSortKey === key) {
      setEmpSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setEmpSortKey(key);
      setEmpSortOrder('desc');
    }
  };

  const handleToggleTeamSort = (key: string) => {
    if (teamSortKey === key) {
      setTeamSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setTeamSortKey(key);
      setTeamSortOrder('desc');
    }
  };

  return (
    <div className="p-5 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Sticky Top Header & Filters */}
      <div className="sticky top-0 z-30 bg-[#f8f9ff]/95 backdrop-blur-md py-3 -mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#005d42]">
            <span>EXECUTIVE COCKPIT</span>
            <span className="text-[#bdc9c1]">·</span>
            <span>PORTFOLIO VELOCITY &amp; PERFORMANCE</span>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#0b1c30] tracking-tight mt-0.5">
            Brokerage Analytics &amp; Team Telemetry
          </h1>
          <p className="text-[13px] text-[#3e4943]">
            Multi-stage pipeline attribution, asset allocation ratios, and advisor quota velocity.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
          {/* Sticky Date Range Selector */}
          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200/80 shadow-xs">
            {(
              [
                { id: '30d', label: 'Last 30 Days' },
                { id: 'qtd', label: 'Quarter to Date' },
                { id: 'ytd', label: 'Year to Date' },
              ] as { id: AnalyticsDateRange; label: string }[]
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setDateRange(t.id)}
                className={`px-3 py-1.5 text-[12px] font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  dateRange === t.id
                    ? 'bg-[#005d42] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#0b1c30]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Master Export Button */}
          <button
            type="button"
            onClick={handleExportFullCsv}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#eff4ff] text-[#0b1c30] border border-slate-200/80 text-[13px] font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
          >
            <Download className="w-4 h-4 text-[#005d42]" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* 3. AI Insights Panel */}
      <AIInsightCard statsSummary={statsSummaryForAi} />

      {/* Grid: 1a. Lead Funnel Report & 1b. Lead Status-Wise Report */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <LeadFunnelChart data={funnelData} loading={funnelLoading} />
        </div>
        <div className="lg:col-span-5">
          <LeadStatusDonutChart data={funnelData} loading={funnelLoading} />
        </div>
      </div>

      {/* Grid: 1d. Stage-Wise Report */}
      <StageWiseBarChart
        data={stageWiseData}
        stages={allStages}
        loading={stageWiseLoading}
      />

      {/* Grid: 1e. Deal Size-Wise Summary & 1f. Product-Wise Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DealSizeBarChart data={dealSizeData} loading={dealLoading} />
        <ProductPieChart data={productData} loading={prodLoading} />
      </div>

      {/* 1g. Manager Monthly Summary */}
      <ManagerMonthlyTrendChart data={monthlyData} loading={monthlyLoading} />

      {/* 1c. Employee-Wise Summary Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 flex flex-col gap-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#005d42]">
              <Users className="w-3.5 h-3.5" />
              <span>INDIVIDUAL VELOCITY</span>
            </div>
            <h2 className="font-display font-semibold text-[18px] text-[#0b1c30] mt-0.5">
              Employee-Wise Summary
            </h2>
            <p className="text-[13px] text-[#3e4943]">
              Lead pipeline throughput, active allocations, and closing conversion percentages
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Click column headers to sort
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 text-[11px] font-semibold text-[#3e4943] bg-slate-50/50">
                <th
                  onClick={() => handleToggleEmpSort('name')}
                  className="py-3 px-4 cursor-pointer hover:text-[#005d42]"
                >
                  <div className="flex items-center gap-1">
                    <span>Agent Name</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleToggleEmpSort('totalLeads')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-[#005d42]"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Total Leads</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleToggleEmpSort('assigned')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-[#005d42]"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Assigned</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleToggleEmpSort('won')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-[#005d42]"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Won</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleToggleEmpSort('lost')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-[#005d42]"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Lost</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleToggleEmpSort('conversionPct')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-[#005d42]"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Conversion %</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Avg Response Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {sortedEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-[#eff4ff]/50 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-[#0b1c30]">
                    <div className="flex items-center gap-3">
                      <img
                        src={emp.avatarUrl}
                        alt={emp.name}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <span className="font-semibold block">{emp.name}</span>
                        <span className="text-[11px] text-slate-400 block">{emp.role}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                    {emp.totalLeads}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                    {emp.assigned}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-[#005d42] tabular-nums">
                    {emp.won}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-rose-600 tabular-nums">
                    {emp.lost}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-[#006f67] tabular-nums">
                    {emp.conversionPct}%
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-500 tabular-nums">
                    {emp.avgResponseTime}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1h. Team Performance Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 flex flex-col gap-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#005d42]">
              <Award className="w-3.5 h-3.5" />
              <span>EXECUTIVE QUOTA BENCHMARKS</span>
            </div>
            <h2 className="font-display font-semibold text-[18px] text-[#0b1c30] mt-0.5">
              Team Performance Table
            </h2>
            <p className="text-[13px] text-[#3e4943]">
              Senior advisory quota attainment, deals closed, and active pipeline volume
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Sortable by KPI
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 text-[11px] font-semibold text-[#3e4943] bg-slate-50/50">
                <th
                  onClick={() => handleToggleTeamSort('name')}
                  className="py-3 px-4 cursor-pointer hover:text-[#005d42]"
                >
                  <div className="flex items-center gap-1">
                    <span>Agent</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleToggleTeamSort('pipelineValue')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-[#005d42]"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Pipeline Value</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleToggleTeamSort('dealsClosed')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-[#005d42]"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Deals Closed</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleToggleTeamSort('monthlyTargetPct')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-[#005d42]"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Monthly Target %</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Response Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {sortedTeam.map((agent) => (
                <tr key={agent.id} className="hover:bg-[#eff4ff]/50 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-[#0b1c30]">
                    <div className="flex items-center gap-3">
                      <img
                        src={agent.avatarUrl}
                        alt={agent.name}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <span className="font-semibold block">{agent.name}</span>
                        <span className="text-[11px] text-slate-400 block">{agent.role}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-[#0b1c30] tabular-nums">
                    {agent.pipelineValueFormatted}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-[#005d42] tabular-nums">
                    {agent.dealsClosed} closed
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        agent.monthlyTargetPct >= 100
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {agent.monthlyTargetPct}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-500 tabular-nums">
                    {agent.avgResponseTime}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
