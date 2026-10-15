import React, { useState } from 'react';
import { ArrowRight, Filter, TrendingDown, Users } from 'lucide-react';
import { LeadFunnelStage } from '../../types/crm';

interface LeadFunnelChartProps {
  data: LeadFunnelStage[];
  loading?: boolean;
}

const STAGE_COLORS: Record<string, string> = {
  Assigned: '#005d42',
  Awareness: '#007555',
  Contacted: '#0284c7',
  Interest: '#0369a1',
  Conversion: '#7c3aed',
  Qualification: '#9333ea',
  Closing: '#d97706',
  Rejected: '#e11d48',
};

export const LeadFunnelChart: React.FC<LeadFunnelChartProps> = ({ data, loading }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-slate-200/80 animate-pulse">
        <div className="h-6 w-48 bg-slate-200 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-9 bg-slate-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const totalLeads = data[0]?.count || 0;
  const closedLeads = data.find((d) => d.stage === 'Closing')?.count || 0;
  const overallConversion = totalLeads > 0 ? Math.round((closedLeads / totalLeads) * 100) : 0;

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200/80 flex flex-col justify-between shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display font-semibold text-[18px] text-[#0b1c30]">
              Lead Funnel Progression Report
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#eff4ff] text-[#005d42]">
              8 Pipeline Stages
            </span>
          </div>
          <p className="text-[13px] text-[#3e4943] mt-0.5">
            Stage-to-stage conversion efficiency, drop-off rate, and active deal velocity
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#eff4ff] px-3 py-1.5 rounded-lg border border-slate-200/60 flex items-center gap-2">
            <span className="text-[11px] text-[#3e4943] font-medium">Top-to-Close Rate</span>
            <span className="font-mono font-bold text-[14px] text-[#005d42]">
              {overallConversion}%
            </span>
          </div>
        </div>
      </div>

      {/* Funnel Stage Bars */}
      <div className="space-y-2.5">
        {data.map((stageItem, idx) => {
          const widthPct = Math.max(12, Math.round((stageItem.count / maxCount) * 100));
          const prevCount = idx > 0 ? data[idx - 1].count : stageItem.count;
          const stepConversion = prevCount > 0 ? Math.round((stageItem.count / prevCount) * 100) : 100;
          const dropoffPct = 100 - stepConversion;
          const color = STAGE_COLORS[stageItem.stage] || '#005d42';
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={stageItem.stage}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="group relative cursor-pointer"
            >
              <div className="flex items-center text-[12px] mb-1 justify-between font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-5 font-mono text-[11px] text-slate-400 font-bold">
                    0{stageItem.order}
                  </span>
                  <span
                    className={`font-semibold transition-colors ${
                      isHovered ? 'text-[#005d42]' : 'text-[#0b1c30]'
                    }`}
                  >
                    {stageItem.stage}
                  </span>
                  {idx > 0 && stageItem.stage !== 'Rejected' && (
                    <span className="text-[10px] text-slate-500 font-mono hidden sm:inline-flex items-center gap-0.5">
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      {stepConversion}% from {data[idx - 1].stage}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 font-mono">
                  <span className="text-[12px] text-slate-500">
                    {stageItem.pipelineValueFormatted}
                  </span>
                  <span className="text-[13px] font-bold text-[#0b1c30] tabular-nums min-w-[36px] text-right">
                    {stageItem.count}
                  </span>
                </div>
              </div>

              {/* Progress Bar Container */}
              <div className="h-7 w-full bg-slate-100 rounded-lg overflow-hidden p-0.5 relative flex items-center">
                <div
                  className="h-full rounded-md transition-all duration-500 ease-out flex items-center justify-between px-3"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: color,
                    opacity: hoveredIdx !== null && !isHovered ? 0.7 : 1,
                  }}
                >
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider hidden sm:inline">
                    {stageItem.conversionPct}% cumulative
                  </span>
                </div>

                {/* Dropoff marker */}
                {idx > 0 && dropoffPct > 0 && stageItem.stage !== 'Rejected' && (
                  <div className="absolute right-3 text-[11px] font-mono text-slate-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <TrendingDown className="w-3 h-3 text-rose-500" />
                    <span>-{dropoffPct}% drop-off</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Notes */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#005d42]" />
            Acquisition Engine
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#7c3aed]" />
            Advisory &amp; Escrow
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#e11d48]" />
            Disqualified
          </span>
        </div>
        <span className="font-mono text-slate-400">
          Total Inquiries: {totalLeads} | Active Escrows: {closedLeads}
        </span>
      </div>
    </div>
  );
};
