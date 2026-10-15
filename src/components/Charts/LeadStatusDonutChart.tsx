import React, { useState } from 'react';
import { PieChart as PieIcon } from 'lucide-react';
import { LeadFunnelStage } from '../../types/crm';

interface LeadStatusDonutChartProps {
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

export const LeadStatusDonutChart: React.FC<LeadStatusDonutChartProps> = ({ data, loading }) => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-slate-200/80 animate-pulse">
        <div className="h-6 w-44 bg-slate-200 rounded mb-4" />
        <div className="w-48 h-48 rounded-full bg-slate-100 mx-auto" />
      </div>
    );
  }

  const totalLeads = data.reduce((acc, cur) => acc + cur.count, 0) || 1;

  // SVG dimensions
  const size = 220;
  const strokeWidth = 28;
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate cumulative slice offsets
  let cumulativeOffset = 0;
  const slices = data.map((item, idx) => {
    const fraction = item.count / totalLeads;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -cumulativeOffset;
    cumulativeOffset += fraction * circumference;
    const color = STAGE_COLORS[item.stage] || '#005d42';
    const pct = Math.round((item.count / totalLeads) * 100);

    return {
      ...item,
      color,
      fraction,
      percentage: pct,
      strokeDasharray,
      strokeDashoffset,
      idx,
    };
  });

  const activeItem = activeIdx !== null ? slices[activeIdx] : null;

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200/80 flex flex-col justify-between shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#005d42]">
            <PieIcon className="w-3.5 h-3.5" />
            <span>PIPELINE HEALTH</span>
          </div>
          <h2 className="font-display font-semibold text-[18px] text-[#0b1c30] mt-0.5">
            Lead Status-Wise Report
          </h2>
          <p className="text-[13px] text-[#3e4943]">
            Active distribution across acquisition stages
          </p>
        </div>
      </div>

      {/* Donut and Legend Layout */}
      <div className="flex flex-col md:flex-row items-center gap-6 my-2">
        {/* SVG Donut */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg width={size} height={size} className="transform -rotate-90">
            {slices.map((slice) => {
              const isSelected = activeIdx === slice.idx;
              return (
                <circle
                  key={slice.stage}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={isSelected ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={slice.strokeDasharray}
                  strokeDashoffset={slice.strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 cursor-pointer"
                  style={{
                    opacity: activeIdx === null || isSelected ? 1 : 0.4,
                  }}
                  onMouseEnter={() => setActiveIdx(slice.idx)}
                  onMouseLeave={() => setActiveIdx(null)}
                />
              );
            })}
          </svg>

          {/* Center Stat */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            {activeItem ? (
              <>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {activeItem.stage}
                </span>
                <span className="font-display font-bold text-[24px] text-[#0b1c30] tabular-nums leading-tight">
                  {activeItem.count}
                </span>
                <span className="text-[11px] font-mono text-[#005d42] font-semibold">
                  {activeItem.percentage}%
                </span>
              </>
            ) : (
              <>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Total Leads
                </span>
                <span className="font-display font-bold text-[28px] text-[#0b1c30] tabular-nums leading-tight">
                  {totalLeads}
                </span>
                <span className="text-[11px] text-slate-500">
                  {data.length} Stages
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full text-[12px]">
          {slices.map((slice) => {
            const isSelected = activeIdx === slice.idx;
            return (
              <div
                key={slice.stage}
                onMouseEnter={() => setActiveIdx(slice.idx)}
                onMouseLeave={() => setActiveIdx(null)}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                  isSelected ? 'bg-slate-100 shadow-xs' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="text-slate-700 truncate font-medium">{slice.stage}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                  <span className="font-bold text-slate-900">{slice.count}</span>
                  <span className="text-slate-400">({slice.percentage}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
