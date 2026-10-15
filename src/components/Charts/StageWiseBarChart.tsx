import React, { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { StageWiseDistribution } from '../../types/crm';

interface StageWiseBarChartProps {
  data: StageWiseDistribution[];
  stages: string[];
  loading?: boolean;
}

const STAGE_COLORS: Record<string, string> = {
  Assigned: '#005d42',
  Awareness: '#007555',
  Contacted: '#0284c7',
  Interest: '#0369a1',
  Touring: '#7c3aed',
  'Private Touring': '#7c3aed',
  Conversion: '#9333ea',
  Qualification: '#a855f7',
  Negotiation: '#d97706',
  'Offer & Escrow': '#d97706',
  Closing: '#f59e0b',
  Rejected: '#e11d48',
};

export const StageWiseBarChart: React.FC<StageWiseBarChartProps> = ({
  data,
  stages,
  loading,
}) => {
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-slate-200/80 animate-pulse">
        <div className="h-6 w-52 bg-slate-200 rounded mb-4" />
        <div className="h-64 bg-slate-100 rounded-lg" />
      </div>
    );
  }

  // Find max total count for scale
  const maxTotal = Math.max(...data.map((d) => d.total), 1);
  const chartHeight = 220;

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200/80 flex flex-col justify-between shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#005d42]">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>AGENT ASSIGNMENT ALLOCATION</span>
          </div>
          <h2 className="font-display font-semibold text-[18px] text-[#0b1c30] mt-0.5">
            Stage-Wise Agent Allocation Report
          </h2>
          <p className="text-[13px] text-[#3e4943]">
            Lead volume distribution across agents grouped by current pipeline stage
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2">
          {stages.slice(0, 5).map((s) => (
            <div key={s} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
              <span
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: STAGE_COLORS[s] || '#005d42' }}
              />
              <span>{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative pt-6 pb-2">
        {/* Horizontal grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
          <div className="border-b border-slate-300 w-full" />
          <div className="border-b border-slate-300 w-full" />
          <div className="border-b border-slate-300 w-full" />
          <div className="border-b border-slate-300 w-full" />
        </div>

        {/* Bar Columns Container */}
        <div className="flex items-end justify-around gap-4 sm:gap-8 min-h-[220px]">
          {data.map((agent) => {
            const isHovered = hoveredAgent === agent.agentName;

            return (
              <div
                key={agent.agentName}
                className="flex-1 flex flex-col items-center group cursor-pointer max-w-[140px]"
                onMouseEnter={() => setHoveredAgent(agent.agentName)}
                onMouseLeave={() => setHoveredAgent(null)}
              >
                {/* Total badge above bar */}
                <span
                  className={`text-[12px] font-mono font-bold mb-2 transition-all ${
                    isHovered ? 'text-[#005d42] scale-110' : 'text-slate-600'
                  }`}
                >
                  {agent.total} leads
                </span>

                {/* Stacked Bar */}
                <div
                  className="w-full sm:w-16 rounded-t-lg overflow-hidden flex flex-col-reverse shadow-xs transition-transform duration-300 group-hover:scale-105"
                  style={{
                    height: `${Math.max(30, (agent.total / maxTotal) * chartHeight)}px`,
                  }}
                >
                  {stages.map((st) => {
                    const count = agent.stages[st] || 0;
                    if (count === 0) return null;
                    const heightPct = (count / agent.total) * 100;
                    const color = STAGE_COLORS[st] || '#005d42';

                    return (
                      <div
                        key={st}
                        style={{
                          height: `${heightPct}%`,
                          backgroundColor: color,
                        }}
                        title={`${agent.agentName}: ${count} ${st}`}
                        className="w-full relative transition-opacity group-hover:opacity-90"
                      />
                    );
                  })}
                </div>

                {/* Agent Name label on X-axis */}
                <div className="mt-3 text-center">
                  <p className="text-[12px] font-semibold text-[#0b1c30] truncate max-w-[110px]">
                    {agent.agentName}
                  </p>
                  <span className="text-[10px] text-slate-400">
                    {stages.length} stages active
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
