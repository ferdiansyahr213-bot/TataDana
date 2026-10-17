'use client';

import React, { useState } from 'react';
import { formatRupiah } from '@/lib/utils/currency';

interface DailySpending {
  day: number;
  amount: number;
}

interface DailyTrendLineProps {
  data: DailySpending[];
}

export const DailyTrendLine: React.FC<DailyTrendLineProps> = ({ data }) => {
  const [hoveredDay, setHoveredDay] = useState<DailySpending | null>(null);

  if (!data.length) {
    return <div className="h-44 flex items-center justify-center text-slate-400 text-xs">Belum ada data harian</div>;
  }

  const maxAmount = Math.max(...data.map((d) => d.amount), 50000);
  const width = 500;
  const height = 140;
  const paddingX = 15;
  const paddingY = 20;

  // Calculate points for SVG line
  const points = data.map((d, idx) => {
    const x = paddingX + (idx / (data.length - 1 || 1)) * (width - 2 * paddingX);
    const y = height - paddingY - (d.amount / maxAmount) * (height - 2 * paddingY);
    return { x, y, day: d.day, amount: d.amount };
  });

  const pathD = points.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
        <span>Awal Bulan (Tgl 1)</span>
        {hoveredDay ? (
          <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            Tgl {hoveredDay.day}: {formatRupiah(hoveredDay.amount)}
          </span>
        ) : (
          <span className="text-[11px] text-slate-400 font-medium">Arahkan kursor ke titik grafik</span>
        )}
      </div>

      <div className="relative h-44 w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="brandBlueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Shaded Area under line */}
          <path d={areaD} fill="url(#brandBlueGradient)" />

          {/* Smooth Line */}
          <path
            d={pathD}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive circles */}
          {points.map((pt, idx) => (
            <circle
              key={idx}
              cx={pt.x}
              cy={pt.y}
              r={hoveredDay?.day === pt.day ? 5 : 3}
              fill={hoveredDay?.day === pt.day ? '#1d4ed8' : '#ffffff'}
              stroke="#2563eb"
              strokeWidth="2"
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={() => setHoveredDay({ day: pt.day, amount: pt.amount })}
              onMouseLeave={() => setHoveredDay(null)}
            />
          ))}
        </svg>
      </div>
    </div>
  );
};
