import React, { useState } from 'react';
import { Building2 } from 'lucide-react';
import { ProductSummaryItem } from '../../types/crm';

interface ProductPieChartProps {
  data: ProductSummaryItem[];
  loading?: boolean;
}

export const ProductPieChart: React.FC<ProductPieChartProps> = ({ data, loading }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-slate-200/80 animate-pulse">
        <div className="h-6 w-44 bg-slate-200 rounded mb-4" />
        <div className="w-48 h-48 rounded-full bg-slate-100 mx-auto" />
      </div>
    );
  }

  const totalCount = data.reduce((sum, item) => sum + item.count, 0) || 1;

  // Render SVG Pie Chart
  const size = 200;
  const radius = 90;
  const center = size / 2;

  let cumulativeAngle = 0;
  const slices = data.map((item, idx) => {
    const angle = (item.count / totalCount) * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle += angle;

    // Convert polar to cartesian
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;
    const pathData =
      angle >= 359.9
        ? `M ${center} ${center - radius} A ${radius} ${radius} 0 1 1 ${center - 0.01} ${center - radius} Z`
        : `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    return {
      ...item,
      idx,
      pathData,
      startAngle,
      endAngle,
    };
  });

  const activeItem = hoveredIdx !== null ? slices[hoveredIdx] : null;

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200/80 flex flex-col justify-between shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#005d42]">
            <Building2 className="w-3.5 h-3.5" />
            <span>ASSET ALLOCATION</span>
          </div>
          <h2 className="font-display font-semibold text-[18px] text-[#0b1c30] mt-0.5">
            Product-Wise Summary
          </h2>
          <p className="text-[13px] text-[#3e4943]">
            Target property asset classes by buyer volume
          </p>
        </div>
      </div>

      {/* Pie Chart and Stats Breakdown */}
      <div className="flex flex-col sm:flex-row items-center gap-6 my-2">
        {/* SVG Slices */}
        <div className="relative shrink-0 flex items-center justify-center">
          <svg width={size} height={size}>
            {slices.map((slice) => {
              const isHovered = hoveredIdx === slice.idx;
              return (
                <path
                  key={slice.type}
                  d={slice.pathData}
                  fill={slice.color}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="transition-transform duration-300 cursor-pointer"
                  style={{
                    transformOrigin: `${center}px ${center}px`,
                    transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                    opacity: hoveredIdx === null || isHovered ? 1 : 0.6,
                  }}
                  onMouseEnter={() => setHoveredIdx(slice.idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            })}
          </svg>
        </div>

        {/* Legend List */}
        <div className="flex flex-col gap-2 w-full">
          {slices.map((slice) => {
            const isHovered = hoveredIdx === slice.idx;
            return (
              <div
                key={slice.type}
                onMouseEnter={() => setHoveredIdx(slice.idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                  isHovered ? 'bg-[#eff4ff]' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="text-[13px] font-medium text-[#0b1c30]">
                    {slice.type}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[12px]">
                  <span className="font-semibold text-slate-800">{slice.count}</span>
                  <span className="text-slate-400">({slice.percentage}%)</span>
                  <span className="text-emerald-700 font-medium hidden md:inline">
                    {slice.totalValueFormatted}
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
