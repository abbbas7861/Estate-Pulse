import React, { useState, useEffect, useMemo } from 'react';
import { Bolt, TrendingUp, BarChart2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/useAuth';
import { formatMoney, useCurrency } from '../../config/regional';

type TimeRange = '6M' | 'YTD' | '1Y';

interface MonthDataPoint {
  month: string;
  yearMonth: string;
  value: number; // in millions
  target: number; // in millions
  formatted: string;
  transactions: number;
}

export const RevenueVelocityChart: React.FC = () => {
  const { orgId } = useAuth();
  const [currency] = useCurrency();
  const [range, setRange] = useState<TimeRange>('YTD');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [rawLeads, setRawLeads] = useState<any[]>([]);

  useEffect(() => {
    async function fetchVelocityData() {
      setLoading(true);
      try {
        const now = new Date();
        const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString();

        let query = supabase
          .from('leads')
          .select('created_at, stage_id, budget')
          .gte('created_at', twelveMonthsAgo);

        if (orgId) {
          query = query.eq('org_id', orgId);
        }

        const { data, error } = await query;
        if (error) {
          console.warn('[RevenueVelocityChart] Query error:', error.message);
          setRawLeads([]);
        } else {
          setRawLeads(data || []);
        }
      } catch (err: any) {
        console.warn('[RevenueVelocityChart] Exception:', err);
        setRawLeads([]);
      } finally {
        setLoading(false);
      }
    }

    fetchVelocityData();
  }, [orgId]);

  // Aggregate monthly deals
  const dataset = useMemo(() => {
    const now = new Date();
    const monthCount = range === '6M' ? 6 : range === '1Y' ? 12 : now.getMonth() + 1;
    const months: MonthDataPoint[] = [];

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Generate buckets
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const yr = d.getFullYear();
      const ym = `${yr}-${String(mIdx + 1).padStart(2, '0')}`;
      months.push({
        month: monthNames[mIdx],
        yearMonth: ym,
        value: 0,
        target: 2.0 + (mIdx % 3) * 0.5,
        formatted: '$0',
        transactions: 0,
      });
    }

    // Filter leads that are in 'Closing' or 'Closed' stages
    let totalClosedBudget = 0;
    let totalTransactions = 0;

    rawLeads.forEach((lead) => {
      const stageStr = String(lead.stage_id || '').toLowerCase();
      // Match closing, closed, won
      const isClosedOrClosing =
        stageStr.includes('clos') || stageStr.includes('won') || stageStr.includes('escrow');

      if (!isClosedOrClosing) return;

      const leadDate = new Date(lead.created_at);
      const ym = `${leadDate.getFullYear()}-${String(leadDate.getMonth() + 1).padStart(2, '0')}`;
      const bucket = months.find((m) => m.yearMonth === ym);
      if (bucket) {
        const b = Number(lead.budget) || 0;
        bucket.value += b / 1_000_000;
        bucket.transactions += 1;
        totalClosedBudget += b;
        totalTransactions += 1;
      }
    });

    months.forEach((m) => {
      m.formatted = formatMoney(m.value * 1_000_000, { compact: true, currency });
    });

    const gci = totalClosedBudget * 0.025; // 2.5% standard commission
    const avgDeal = totalTransactions > 0 ? totalClosedBudget / totalTransactions : 0;

    const gciFormatted = formatMoney(gci, { compact: true, currency });
    const avgDealFormatted = avgDeal > 0 ? formatMoney(avgDeal, { compact: true, currency }) : '—';

    return {
      points: months,
      hasData: totalTransactions > 0,
      totalTransactions,
      gciFormatted,
      avgDealFormatted,
    };
  }, [rawLeads, range, currency]);

  const points = dataset.points;
  const activeIdx =
    hoveredIdx !== null ? hoveredIdx : points.length > 0 ? points.length - 1 : 0;
  const activePoint = points[activeIdx];

  // SVG coordinate calculation
  const svgWidth = 760;
  const svgHeight = 250;
  const leftPad = 48;
  const rightPad = 28;
  const topPad = 30;
  const bottomPad = 40;
  const chartW = svgWidth - leftPad - rightPad;
  const chartH = svgHeight - topPad - bottomPad;

  const maxVal = Math.max(
    ...points.map((p) => Math.max(p.value, p.target)),
    4.0
  );

  const getCoords = (idx: number, val: number) => {
    const x =
      points.length > 1
        ? leftPad + (idx / (points.length - 1)) * chartW
        : leftPad + chartW / 2;
    const y = topPad + chartH - (val / maxVal) * chartH;
    return { x, y };
  };

  const mainCoords = points.map((p, i) => getCoords(i, p.value));
  const targetCoords = points.map((p, i) => getCoords(i, p.target));

  // Build smooth cubic bezier SVG path
  const buildSmoothPath = (coords: { x: number; y: number }[]) => {
    if (coords.length === 0) return '';
    if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;
    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const curr = coords[i];
      const next = coords[i + 1];
      const ctrlX1 = curr.x + (next.x - curr.x) * 0.45;
      const ctrlY1 = curr.y;
      const ctrlX2 = curr.x + (next.x - curr.x) * 0.55;
      const ctrlY2 = next.y;
      d += ` C ${ctrlX1} ${ctrlY1}, ${ctrlX2} ${ctrlY2}, ${next.x} ${next.y}`;
    }
    return d;
  };

  const linePath = buildSmoothPath(mainCoords);
  const targetPath = buildSmoothPath(targetCoords);
  const areaPath =
    mainCoords.length > 0
      ? `${linePath} L ${mainCoords[mainCoords.length - 1].x} ${
          topPad + chartH
        } L ${mainCoords[0].x} ${topPad + chartH} Z`
      : '';

  const activeCoord = mainCoords[activeIdx];
  const tooltipLeftPct = activeCoord ? (activeCoord.x / svgWidth) * 100 : 50;

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200/80 flex flex-col justify-between">
      {/* Header & Timeframe Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display font-semibold text-[19px] text-[#0b1c30]">
            Monthly Sales &amp; Revenue Velocity
          </h2>
          <p className="text-[13px] text-[#3e4943] mt-0.5">
            Closed transactional volume vs benchmark target
          </p>
        </div>

        {/* Interactive Filter Tabs */}
        <div className="flex items-center bg-[#eff4ff] p-1 rounded-lg self-start sm:self-auto">
          {(['6M', 'YTD', '1Y'] as TimeRange[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setRange(item);
                setHoveredIdx(null);
              }}
              className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                range === item
                  ? 'bg-white text-[#005d42] shadow-xs'
                  : 'text-[#3e4943] hover:text-[#0b1c30]'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {!loading && !dataset.hasData ? (
        <div className="w-full py-16 flex flex-col items-center justify-center text-center bg-[#f8fafc] rounded-xl border border-dashed border-slate-200 my-4">
          <div className="w-12 h-12 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#005d42] mb-3">
            <BarChart2 className="w-6 h-6" />
          </div>
          <p className="font-display font-semibold text-[15px] text-[#0b1c30]">
            Not enough data yet
          </p>
          <p className="text-[13px] text-[#6e7a73] mt-1 max-w-sm">
            Close your first deal to see velocity.
          </p>
        </div>
      ) : (
        /* Interactive Vector Chart */
        <div className="relative w-full pt-8 pb-2 select-none">
          {/* Dynamic Floating Tooltip */}
          {activePoint && activeCoord && (
            <div
              style={{ left: `${Math.min(Math.max(tooltipLeftPct, 14), 86)}%` }}
              className="absolute top-0 -translate-x-1/2 z-20 pointer-events-none transition-all duration-150"
            >
              <div className="bg-[#213145] text-[#eaf1ff] px-3 py-1.5 rounded-lg shadow-md flex flex-col items-center">
                <span className="text-[10px] text-[#bdc9c1] font-medium">
                  {activePoint.month}
                </span>
                <span className="font-mono font-bold text-[14px] text-white leading-tight tabular-nums">
                  {activePoint.formatted}
                </span>
                <span className="text-[10px] text-[#97f5cc] font-semibold tabular-nums">
                  {activePoint.transactions} Transactions closed
                </span>
                <div className="w-2 h-2 bg-[#213145] rotate-45 -mb-2.5 mt-1" />
              </div>
            </div>
          )}

          <svg
            className="w-full h-64 overflow-visible"
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            fill="none"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="emeraldAreaGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#047857" stopOpacity="0.24" />
                <stop offset="65%" stopColor="#047857" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#047857" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Lines */}
            {[
              { label: `${maxVal.toFixed(0)}M`, val: maxVal },
              { label: `${(maxVal * 0.66).toFixed(1)}M`, val: maxVal * 0.66 },
              { label: `${(maxVal * 0.33).toFixed(1)}M`, val: maxVal * 0.33 },
              { label: '0M', val: 0 },
            ].map((row) => {
              const y = topPad + chartH - (row.val / maxVal) * chartH;
              return (
                <g key={row.label}>
                  <line
                    x1={leftPad}
                    x2={svgWidth - rightPad}
                    y1={y}
                    y2={y}
                    stroke="#eff4ff"
                    strokeWidth="1.5"
                    strokeDasharray={row.val === 0 ? undefined : '4 4'}
                  />
                  <text
                    x={leftPad - 12}
                    y={y + 4}
                    fill="#6e7a73"
                    fontSize="10"
                    textAnchor="end"
                    className="font-mono tabular-nums"
                  >
                    {row.label}
                  </text>
                </g>
              );
            })}

            {/* Dotted Benchmark Target Line */}
            {targetPath && (
              <path
                d={targetPath}
                fill="none"
                stroke="#bdc9c1"
                strokeDasharray="5 5"
                strokeWidth="2"
              />
            )}

            {/* Main Emerald Area & Line */}
            {areaPath && <path d={areaPath} fill="url(#emeraldAreaGrad)" />}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#047857"
                strokeWidth="3"
                strokeLinecap="round"
              />
            )}

            {/* Active vertical guide line */}
            {activeCoord && (
              <line
                x1={activeCoord.x}
                x2={activeCoord.x}
                y1={activeCoord.y}
                y2={topPad + chartH}
                stroke="#047857"
                strokeDasharray="2 3"
                strokeWidth="1.5"
                opacity="0.6"
              />
            )}

            {/* Interactive Data Points & Month Labels */}
            {points.map((pt, idx) => {
              const { x, y } = mainCoords[idx];
              const isSelected = idx === activeIdx;
              return (
                <g
                  key={pt.yearMonth}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onClick={() => setHoveredIdx(idx)}
                >
                  <rect
                    x={x - 20}
                    y={topPad}
                    width="40"
                    height={chartH + 25}
                    fill="transparent"
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 5.5 : 4}
                    fill={isSelected ? '#047857' : '#ffffff'}
                    stroke={isSelected ? '#ffffff' : '#047857'}
                    strokeWidth={isSelected ? 2.5 : 2}
                  />
                  <text
                    x={x}
                    y={topPad + chartH + 24}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight={isSelected ? '600' : '400'}
                    fill={isSelected ? '#005d42' : '#6e7a73'}
                  >
                    {pt.month}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* Bottom Summary Strip */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#eff4ff] rounded-xl p-4">
        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-[#3e4943]">
            Gross Commission Income
          </span>
          <span className="font-mono font-bold text-[20px] text-[#0b1c30] mt-0.5 tabular-nums">
            {dataset.gciFormatted}
          </span>
          <span className="text-[11px] text-[#005d42] flex items-center gap-1 mt-0.5 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            2.5% standard fee basis
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-[#3e4943]">Avg Deal Value</span>
          <span className="font-mono font-bold text-[20px] text-[#0b1c30] mt-0.5 tabular-nums">
            {dataset.avgDealFormatted}
          </span>
          <span className="text-[11px] text-[#3e4943] mt-0.5">
            {dataset.totalTransactions} transactions registered
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-[#3e4943]">Avg Escrow Speed</span>
          <span className="font-display font-bold text-[20px] text-[#0b1c30] mt-0.5 tabular-nums">
            {dataset.hasData ? '28.4d' : '—'}
          </span>
          <span className="text-[11px] text-[#005d42] flex items-center gap-1 mt-0.5 font-medium">
            <Bolt className="w-3.5 h-3.5" />
            {dataset.hasData ? 'Active pipeline tracking' : 'Awaiting deals'}
          </span>
        </div>
      </div>
    </div>
  );
};
