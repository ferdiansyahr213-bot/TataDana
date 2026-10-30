'use client';

import React, { useState } from 'react';
import { formatRupiah } from '@/lib/utils/currency';
import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';

export interface CashflowItem {
  month: string;
  income: number;
  expense: number;
}

interface CashflowBarChartProps {
  data: CashflowItem[];
  periodLabel?: string;
}

export const CashflowBarChart: React.FC<CashflowBarChartProps> = ({ data, periodLabel = 'Bulanan' }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const totalIncome = data?.reduce((s, d) => s + d.income, 0) || 0;
  const totalExpense = data?.reduce((s, d) => s + d.expense, 0) || 0;
  const hasData = totalIncome > 0 || totalExpense > 0;

  if (!data || data.length === 0 || !hasData) {
    return (
      <div className="h-64 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 p-6 text-center">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
          <TrendingUp className="w-5 h-5" />
        </div>
        <p className="text-xs font-bold text-slate-700">Belum ada transaksi pada periode ini</p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Catat pemasukan atau pengeluaran untuk melihat grafik arus kas.
        </p>
      </div>
    );
  }

  // Find maximum value to normalize bar heights
  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.income, d.expense)),
    1000000
  );

  const netCashflow = totalIncome - totalExpense;

  return (
    <div className="w-full">
      {/* Legend & Summary Metrics */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4 text-xs pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-500 shadow-xs" />
            <span className="text-slate-600 font-semibold">Pemasukan ({formatRupiah(totalIncome)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-blue-600 shadow-xs" />
            <span className="text-slate-600 font-semibold">Pengeluaran ({formatRupiah(totalExpense)})</span>
          </div>
        </div>

        <div className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] inline-flex items-center gap-1 ${
          netCashflow >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
        }`}>
          <TrendingUp className="w-3 h-3" />
          <span>Net: {netCashflow >= 0 ? '+' : ''}{formatRupiah(netCashflow)}</span>
        </div>
      </div>

      {/* Bars Chart Area */}
      <div className="h-56 flex items-end justify-between gap-2 sm:gap-4 pt-8 pb-2 border-b border-slate-100">
        {data.map((item, idx) => {
          const incomeHeight = item.income > 0 ? Math.max(6, (item.income / maxVal) * 100) : 0;
          const expenseHeight = item.expense > 0 ? Math.max(6, (item.expense / maxVal) * 100) : 0;
          const isHovered = hoveredIdx === idx;
          const diff = item.income - item.expense;

          return (
            <div
              key={idx}
              className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Floating Tooltip */}
              <div
                className={`absolute -top-14 transition-all duration-200 bg-slate-900 text-white text-[10px] rounded-xl p-2 z-30 pointer-events-none whitespace-nowrap shadow-xl border border-slate-800 ${
                  isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                }`}
              >
                <div className="font-bold text-slate-300 pb-0.5 border-b border-slate-800 mb-1">{item.month}</div>
                <div className="text-emerald-400 font-medium">Pemasukan: {formatRupiah(item.income)}</div>
                <div className="text-rose-400 font-medium">Pengeluaran: {formatRupiah(item.expense)}</div>
                <div className={`pt-0.5 font-bold ${diff >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  Net: {diff >= 0 ? '+' : ''}{formatRupiah(diff)}
                </div>
              </div>

              {/* Bars container */}
              <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-full">
                {/* Income Bar (Emerald) */}
                <div
                  className={`w-1/2 max-w-[18px] bg-emerald-500 rounded-t-md transition-all duration-300 ${
                    incomeHeight === 0 ? 'opacity-0' : isHovered ? 'bg-emerald-400 shadow-sm brightness-110' : 'hover:bg-emerald-400'
                  }`}
                  style={{ height: `${incomeHeight}%` }}
                />
                {/* Expense Bar (Blue) */}
                <div
                  className={`w-1/2 max-w-[18px] bg-blue-600 rounded-t-md transition-all duration-300 ${
                    expenseHeight === 0 ? 'opacity-0' : isHovered ? 'bg-blue-500 shadow-sm brightness-110' : 'hover:bg-blue-500'
                  }`}
                  style={{ height: `${expenseHeight}%` }}
                />
              </div>

              {/* Month label */}
              <span
                className={`text-[11px] mt-2 truncate w-full text-center transition-colors ${
                  isHovered ? 'font-bold text-slate-900' : 'text-slate-500 font-medium'
                }`}
              >
                {item.month}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
