'use client';

import React, { useState } from 'react';
import { formatRupiah } from '@/lib/utils/currency';
import { PieChart as PieIcon } from 'lucide-react';

interface CategoryData {
  name: string;
  emoji?: string;
  amount: number;
  color: string;
}

interface ExpensePieChartProps {
  data: CategoryData[];
}

export const ExpensePieChart: React.FC<ExpensePieChartProps> = ({ data }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const total = data.reduce((sum, item) => sum + item.amount, 0);

  if (!data.length || total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-52 text-slate-400 gap-2">
        <PieIcon className="w-8 h-8 text-slate-300 stroke-[1.5]" />
        <p className="text-xs">Belum ada data pengeluaran pada periode ini</p>
      </div>
    );
  }

  // Calculate slice angles for SVG donut
  let cumulativeAngle = 0;
  const radius = 70;
  const cx = 100;
  const cy = 100;

  const slices = data.map((item, idx) => {
    const percentage = item.amount / total;
    const angle = percentage * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle += angle;

    // SVG arc math
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    const largeArcFlag = angle > 180 ? 1 : 0;
    const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

    return {
      ...item,
      percentage: Math.round(percentage * 100),
      pathData,
      idx,
    };
  });

  const activeItem = hoveredIdx !== null ? slices[hoveredIdx] : null;

  return (
    <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
      {/* SVG Donut */}
      <div className="relative w-48 h-48 shrink-0">
        <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-0 filter drop-shadow-sm">
          {slices.map((slice) => (
            <path
              key={slice.idx}
              d={slice.pathData}
              fill={slice.color}
              className="cursor-pointer transition-all duration-200"
              style={{
                transform: hoveredIdx === slice.idx ? 'scale(1.05)' : 'scale(1)',
                transformOrigin: '100px 100px',
                opacity: hoveredIdx === null || hoveredIdx === slice.idx ? 1 : 0.6,
              }}
              onMouseEnter={() => setHoveredIdx(slice.idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          ))}
          {/* Inner cutout for Donut style */}
          <circle cx={cx} cy={cy} r={46} fill="white" className="filter drop-shadow-xs" />
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate max-w-[80px]">
            {activeItem ? activeItem.name : 'Total'}
          </span>
          <span className="text-xs font-black text-slate-900 mt-0.5">
            {activeItem ? formatRupiah(activeItem.amount) : formatRupiah(total)}
          </span>
          {activeItem ? (
            <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.2 rounded-full mt-0.5">
              {activeItem.percentage}%
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 font-medium">{slices.length} Kategori</span>
          )}
        </div>
      </div>

      {/* Legend list */}
      <div className="w-full space-y-1.5 max-h-52 overflow-y-auto pr-1">
        {slices.map((slice) => {
          const isSelected = hoveredIdx === slice.idx;
          return (
            <div
              key={slice.idx}
              className={`flex items-center justify-between text-xs p-2 rounded-xl transition-all cursor-pointer border ${
                isSelected
                  ? 'bg-blue-50/80 border-blue-200 shadow-xs font-semibold'
                  : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-100'
              }`}
              onMouseEnter={() => setHoveredIdx(slice.idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div className="flex items-center gap-2 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="truncate text-slate-700">
                  {slice.emoji ? `${slice.emoji} ` : ''}
                  {slice.name}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-bold text-slate-800">{formatRupiah(slice.amount)}</span>
                <span className="text-slate-400 text-[11px] font-medium w-9 text-right">
                  {slice.percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
