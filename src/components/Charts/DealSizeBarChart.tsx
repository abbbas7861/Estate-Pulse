import React, { useState } from 'react';
import { DollarSign } from 'lucide-react';
import { DealSizeSummaryItem } from '../../types/crm';

interface DealSizeBarChartProps {
  data: DealSizeSummaryItem[];
  loading?: boolean;
}

export const DealSizeBarChart: React.FC<DealSizeBarChartProps> = ({ data, loading }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-slate-200/80 animate-pulse">
        <div className="h-6 w-48 bg-slate-200 rounded mb-4" />
        <div className="h-56 bg-slate-100 rounded-lg" />
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const totalVolume = data.reduce((acc, cur) => acc + cur.totalValue, 0);

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200/80 flex flex-col justify-between shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#005d42]">
            <DollarSign className="w-3.5 h-3.5" />
            <span>TRANSACTION BRACKETS</span>
          </div>
          <h2 className="font-display font-semibold text-[18px] text-[#0b1c30] mt-0.5">
            Deal Size-Wise Summary
          </h2>
          <p className="text-[13px] text-[#3e4943]">
            Purchaser budget distribution across capital tiers
          </p>
        </div>

        <div className="bg-[#eff4ff] px-3 py-1.5 rounded-lg border border-slate-200/60 self-start sm:self-auto">
          <span className="text-[11px] text-[#3e4943] font-medium mr-2">Total Inquired Pipeline:</span>
          <span className="font-mono font-bold text-[14px] text-[#005d42]">
            ${(totalVolume / 1_000_000).toFixed(1)}M
          </span>
        </div>
      </div>

      {/* Vertical Bars Container */}
      <div className="flex items-end justify-between gap-3 sm:gap-6 pt-6 pb-2 min-h-[220px]">
        {data.map((item, idx) => {
          const isHovered = hoveredIdx === idx;
          const heightPct = Math.max(15, Math.round((item.count / maxCount) * 100));

          return (
            <div
              key={item.bucket}
              className="flex-1 flex flex-col items-center group cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Floating Value Tooltip on hover */}
              <div
                className={`text-center mb-2 transition-all duration-200 ${
                  isHovered ? 'scale-105 opacity-100' : 'opacity-80'
                }`}
              >
                <span className="text-[12px] font-mono font-bold text-[#0b1c30] block">
                  {item.count} leads
                </span>
                <span className="text-[10px] font-mono text-emerald-700 block">
                  {item.totalValueFormatted}
                </span>
              </div>

              {/* Bar */}
              <div className="w-full bg-slate-100 rounded-t-lg h-[160px] flex items-end p-1">
                <div
                  className="w-full rounded-t-md transition-all duration-500 ease-out flex flex-col justify-between items-center py-2"
                  style={{
                    height: `${heightPct}%`,
                    background: isHovered
                      ? 'linear-gradient(180deg, #005d42 0%, #003e2c 100%)'
                      : 'linear-gradient(180deg, #007555 0%, #005d42 100%)',
                  }}
                >
                  <span className="text-[10px] font-mono text-white font-bold">
                    {item.percentage}%
                  </span>
                </div>
              </div>

              {/* Label */}
              <span className="mt-3 text-[11px] sm:text-[12px] font-semibold text-[#0b1c30] text-center whitespace-nowrap">
                {item.bucket}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
