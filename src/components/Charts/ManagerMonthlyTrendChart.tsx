import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { MonthlyTrendItem } from '../../types/crm';

interface ManagerMonthlyTrendChartProps {
  data: MonthlyTrendItem[];
  loading?: boolean;
}

export const ManagerMonthlyTrendChart: React.FC<ManagerMonthlyTrendChartProps> = ({
  data,
  loading,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-slate-200/80 animate-pulse">
        <div className="h-6 w-52 bg-slate-200 rounded mb-4" />
        <div className="h-64 bg-slate-100 rounded-lg" />
      </div>
    );
  }

  // Fallback if data is empty
  const points = data.length > 0 ? data : [];
  const maxVal = Math.max(
    ...points.map((p) => Math.max(p.leadsCreated, p.closedWon, p.closedLost)),
    10
  );

  // SVG Coordinates
  const svgWidth = 760;
  const svgHeight = 260;
  const leftPad = 40;
  const rightPad = 30;
  const topPad = 30;
  const bottomPad = 45;
  const chartW = svgWidth - leftPad - rightPad;
  const chartH = svgHeight - topPad - bottomPad;

  const getX = (idx: number) => {
    return points.length > 1
      ? leftPad + (idx / (points.length - 1)) * chartW
      : leftPad + chartW / 2;
  };

  const getY = (val: number) => {
    return topPad + chartH - (val / (maxVal * 1.15)) * chartH;
  };

  const buildPath = (vals: number[]) => {
    if (vals.length === 0) return '';
    return vals
      .map((val, idx) => {
        const x = getX(idx);
        const y = getY(val);
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  const leadsPath = buildPath(points.map((p) => p.leadsCreated));
  const wonPath = buildPath(points.map((p) => p.closedWon));
  const lostPath = buildPath(points.map((p) => p.closedLost));

  const activeIdx = hoveredIdx !== null ? hoveredIdx : points.length - 1;
  const activePoint = points[activeIdx];

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200/80 flex flex-col justify-between shadow-xs">
      {/* Header & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#005d42]">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>EXECUTIVE TRAJECTORY</span>
          </div>
          <h2 className="font-display font-semibold text-[18px] text-[#0b1c30] mt-0.5">
            Manager Monthly Velocity Summary
          </h2>
          <p className="text-[13px] text-[#3e4943]">
            Leads created vs Closed Won vs Closed Lost (Trailing 12 Months)
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-[12px] font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#0284c7] rounded" />
            <span className="text-slate-700">Leads Created</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#005d42] rounded" />
            <span className="text-[#005d42] font-semibold">Closed Won</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#e11d48] rounded" />
            <span className="text-rose-600">Closed Lost</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[600px] select-none"
        >
          {/* Horizontal gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = topPad + chartH * (1 - pct);
            const val = Math.round(maxVal * 1.15 * pct);
            return (
              <g key={i}>
                <line
                  x1={leftPad}
                  y1={y}
                  x2={svgWidth - rightPad}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={leftPad - 10}
                  y={y + 4}
                  fill="#94a3b8"
                  fontSize="10"
                  textAnchor="end"
                  className="font-mono"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Series Lines */}
          <path
            d={leadsPath}
            fill="none"
            stroke="#0284c7"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={wonPath}
            fill="none"
            stroke="#005d42"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={lostPath}
            fill="none"
            stroke="#e11d48"
            strokeWidth="2"
            strokeDasharray="5 3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((p, idx) => {
            const x = getX(idx);
            const yWon = getY(p.closedWon);
            const yLeads = getY(p.leadsCreated);
            const isHovered = activeIdx === idx;

            return (
              <g
                key={p.month}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Vertical hover crosshair */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={topPad}
                    x2={x}
                    y2={topPad + chartH}
                    stroke="#cbd5e1"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}

                {/* Circles */}
                <circle
                  cx={x}
                  cy={yLeads}
                  r={isHovered ? 5 : 3.5}
                  fill="#0284c7"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                <circle
                  cx={x}
                  cy={yWon}
                  r={isHovered ? 6 : 4}
                  fill="#005d42"
                  stroke="#ffffff"
                  strokeWidth="2"
                />

                {/* X-axis labels */}
                <text
                  x={x}
                  y={topPad + chartH + 20}
                  fill={isHovered ? '#0b1c30' : '#64748b'}
                  fontSize="11"
                  fontWeight={isHovered ? 'bold' : 'normal'}
                  textAnchor="middle"
                >
                  {p.monthShort}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip Summary */}
        {activePoint && (
          <div className="mt-3 p-3 bg-[#eff4ff] rounded-lg border border-slate-200/80 flex flex-wrap items-center justify-between gap-4 text-[12px]">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#0b1c30]">
                {activePoint.month}:
              </span>
              <span className="font-mono text-slate-600">
                Created: <b className="text-[#0284c7]">{activePoint.leadsCreated}</b>
              </span>
              <span className="text-slate-300">|</span>
              <span className="font-mono text-slate-600">
                Won: <b className="text-[#005d42]">{activePoint.closedWon}</b>
              </span>
              <span className="text-slate-300">|</span>
              <span className="font-mono text-slate-600">
                Lost: <b className="text-rose-600">{activePoint.closedLost}</b>
              </span>
            </div>
            <div className="font-mono font-semibold text-[#005d42]">
              Volume: {activePoint.wonVolumeFormatted}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
