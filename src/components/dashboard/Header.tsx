'use client';

import React from 'react';
import { formatWIBDateTime } from '@/lib/utils/date-wib';
import { PlusCircle, Bell, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onQuickAdd?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onQuickAdd }) => {
  const currentWib = formatWIBDateTime();

  return (
    <header className="bg-white border-b border-slate-200/80 px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-0 z-20">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{title}</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {subtitle || `Waktu sekarang: ${currentWib}`}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200/60 text-xs font-medium text-brand-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Telegram Synced</span>
        </div>

        {onQuickAdd && (
          <Button
            onClick={onQuickAdd}
            variant="primary"
            size="sm"
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            Catat Cepat
          </Button>
        )}
      </div>
    </header>
  );
};
