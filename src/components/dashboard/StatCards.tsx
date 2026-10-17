'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { formatRupiah } from '@/lib/utils/currency';
import { 
  Wallet, 
  ArrowDownRight, 
  ArrowUpRight, 
  Target, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

interface StatCardsProps {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  remainingBudget: number;
  totalBudget?: number;
}

// Micro SVG Sparkline Component
const Sparkline: React.FC<{ data: number[]; color: string; gradientId: string }> = ({
  data,
  color,
  gradientId,
}) => {
  const width = 110;
  const height = 32;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible shrink-0 opacity-90">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradientId})`} />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End point dot */}
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1].split(',')[0]}
          cy={points[points.length - 1].split(',')[1]}
          r="3"
          fill={color}
        />
      )}
    </svg>
  );
};

export const StatCards: React.FC<StatCardsProps> = ({
  totalBalance,
  monthlyIncome,
  monthlyExpense,
  remainingBudget,
  totalBudget = 0,
}) => {
  // Calculate budget spent percentage
  const actualBudget = totalBudget > 0 ? totalBudget : monthlyExpense + remainingBudget;
  const spentPercent = actualBudget > 0 
    ? Math.min(100, Math.round((monthlyExpense / actualBudget) * 100)) 
    : 0;

  // Determine progress bar color based on percentage: green -> yellow/amber -> red
  let progressColor = 'bg-emerald-500';
  let progressTextColor = 'text-emerald-700';
  let progressBgColor = 'bg-emerald-50';
  let budgetStatus = 'Aman';

  if (spentPercent >= 90) {
    progressColor = 'bg-rose-500';
    progressTextColor = 'text-rose-700';
    progressBgColor = 'bg-rose-50';
    budgetStatus = spentPercent >= 100 ? 'Melebihi Limit' : 'Hampir Habis';
  } else if (spentPercent >= 70) {
    progressColor = 'bg-amber-500';
    progressTextColor = 'text-amber-700';
    progressBgColor = 'bg-amber-50';
    budgetStatus = 'Waspada 70%';
  }

  // Sample historical sparkline datasets for micro-visualization
  const balanceTrend = [totalBalance * 0.88, totalBalance * 0.91, totalBalance * 0.90, totalBalance * 0.94, totalBalance * 0.93, totalBalance * 0.97, totalBalance];
  const incomeTrend = [monthlyIncome * 0.65, monthlyIncome * 0.75, monthlyIncome * 0.80, monthlyIncome * 0.70, monthlyIncome * 0.95, monthlyIncome];
  const expenseTrend = [monthlyExpense * 0.35, monthlyExpense * 0.50, monthlyExpense * 0.65, monthlyExpense * 0.80, monthlyExpense * 0.75, monthlyExpense];
  const budgetTrend = [85, 78, 65, 54, 42, Math.max(5, 100 - spentPercent)];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Saldo Total */}
      <Card hoverEffect className="p-5 flex flex-col justify-between relative overflow-hidden bg-white border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Saldo Total
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Wallet className="w-4 h-4" />
            </div>
          </div>

          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatRupiah(totalBalance)}
          </div>
        </div>

        <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+12.4%</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Semua dompet aktif</p>
          </div>
          <Sparkline data={balanceTrend} color="#2563eb" gradientId="spark_balance" />
        </div>
      </Card>

      {/* 2. Pemasukan Bulan Ini */}
      <Card hoverEffect className="p-5 flex flex-col justify-between relative overflow-hidden bg-white border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pemasukan Bulan Ini
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>

          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatRupiah(monthlyIncome)}
          </div>
        </div>

        <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+18.2%</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">vs bulan lalu</p>
          </div>
          <Sparkline data={incomeTrend} color="#10b981" gradientId="spark_income" />
        </div>
      </Card>

      {/* 3. Pengeluaran Bulan Ini */}
      <Card hoverEffect className="p-5 flex flex-col justify-between relative overflow-hidden bg-white border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pengeluaran Bulan Ini
            </span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>

          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatRupiah(monthlyExpense)}
          </div>
        </div>

        <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-rose-600">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>{spentPercent}%</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">rasio belanja</p>
          </div>
          <Sparkline data={expenseTrend} color="#f43f5e" gradientId="spark_expense" />
        </div>
      </Card>

      {/* 4. Budget Tersisa with Dynamic Color Progress Bar */}
      <Card hoverEffect className="p-5 flex flex-col justify-between relative overflow-hidden bg-white border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Budget Tersisa
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${progressBgColor} ${progressTextColor}`}>
              {budgetStatus}
            </span>
          </div>

          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatRupiah(remainingBudget)}
          </div>
        </div>

        {/* Dynamic Progress Bar: Green -> Yellow -> Red */}
        <div className="pt-3 mt-3 border-t border-slate-100 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
            <span>Terpakai {spentPercent}%</span>
            <span className="text-slate-400 text-[10px]">dari {formatRupiah(actualBudget)}</span>
          </div>

          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
              style={{ width: `${Math.min(100, Math.max(5, spentPercent))}%` }}
            />
          </div>
        </div>
      </Card>
    </div>
  );
};
