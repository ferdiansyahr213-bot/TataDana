'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  MessageSquare, 
  Wallet, 
  Target, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface OnboardingChecklistProps {
  isTelegramConnected: boolean;
  hasWallets: boolean;
  hasBudgets: boolean;
}

export const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({
  isTelegramConnected,
  hasWallets,
  hasBudgets,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDismiss = localStorage.getItem('tatadana_onboarding_dismissed');
      if (savedDismiss === 'true') {
        setIsDismissed(true);
      }
      const savedCollapse = localStorage.getItem('tatadana_onboarding_collapsed');
      if (savedCollapse === 'true') {
        setIsCollapsed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tatadana_onboarding_dismissed', 'true');
    }
  };

  const handleToggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tatadana_onboarding_collapsed', nextState ? 'true' : 'false');
    }
  };

  const handleRestore = () => {
    setIsDismissed(false);
    setIsCollapsed(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tatadana_onboarding_dismissed');
      localStorage.removeItem('tatadana_onboarding_collapsed');
    }
  };

  const steps = [
    {
      title: 'Hubungkan Bot Telegram',
      desc: 'Masukkan token bot dari @BotFather dan mulai catat transaksi lewat chat.',
      completed: isTelegramConnected,
      href: '/dashboard/settings',
      icon: MessageSquare,
      cta: 'Hubungkan Sekarang',
    },
    {
      title: 'Atur Dompet Utama',
      desc: 'Tambahkan rekening BCA, Mandiri, atau GoPay dan set sebagai default bot.',
      completed: hasWallets,
      href: '/dashboard/wallets',
      icon: Wallet,
      cta: 'Kelola Dompet',
    },
    {
      title: 'Tentukan Budget Bulanan',
      desc: 'Pasang batas anggaran per kategori agar bot bisa memberi alert 80% & 100%.',
      completed: hasBudgets,
      href: '/dashboard/budgets',
      icon: Target,
      cta: 'Atur Budget',
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const isAllCompleted = completedCount === 3;

  // If dismissed completely by user, render a small restore chip in the corner
  if (isDismissed) {
    return (
      <div className="mb-4 flex justify-end">
        <button
          onClick={handleRestore}
          className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-500 hover:text-brand-600 bg-slate-100 hover:bg-blue-50 rounded-full transition-all border border-slate-200"
          title="Tampilkan kembali panduan onboarding"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Panduan Setup ({completedCount}/3 Selesai)</span>
        </button>
      </div>
    );
  }

  // If collapsed mode
  if (isCollapsed) {
    return (
      <div className="mb-6 p-3 rounded-2xl bg-gradient-to-r from-blue-50/70 via-white to-indigo-50/60 border border-blue-200/80 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
            {completedCount}
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900">
              Setup Akun TataDana: {completedCount}/3 Selesai
            </span>
            {isAllCompleted ? (
              <span className="ml-2 text-[11px] font-bold text-emerald-600 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                🎉 Siap Digunakan
              </span>
            ) : (
              <span className="ml-2 text-[11px] text-slate-500">
                Selesaikan langkah untuk aktivasi otomatis
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleToggleCollapse}
            className="p-1 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors"
            title="Buka panduan lengkap"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
            title="Tutup panduan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <Card className="p-5 sm:p-6 bg-gradient-to-br from-blue-50/60 via-white to-indigo-50/40 border-blue-200/80 mb-6 shadow-sm transition-all relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar with Minimize & Dismiss controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600 bg-blue-100/70 px-2 py-0.5 rounded-full">
              Panduan Memulai
            </span>
            {isAllCompleted && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full shadow-sm">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>Semua Setup Lengkap</span>
              </span>
            )}
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
            Lengkapi Setup Akun TataDana Kamu ({completedCount}/3 Selesai)
          </h2>
          <p className="text-xs text-slate-500">
            {isAllCompleted
              ? 'Selamat! Akun Telegram, dompet, dan budget bulanan kamu sudah aktif secara optimal.'
              : 'Ikuti 3 langkah cepat di bawah ini agar pencatatan keuangan otomatis berjalan lancar.'}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
          {isAllCompleted && (
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all mr-1"
            >
              Selesai & Sembunyikan
            </button>
          )}
          <button
            onClick={handleToggleCollapse}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            title="Kecilkan panduan"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
            title="Tutup panduan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={idx}
              className={`p-4 rounded-xl border transition-all ${
                step.completed
                  ? 'bg-emerald-50/50 border-emerald-200/80 shadow-xs'
                  : 'bg-white border-slate-200/90 hover:border-brand-400 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`p-2 rounded-lg ${
                    step.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-brand-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                {step.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-300" />
                )}
              </div>
              <h3 className="text-sm font-bold text-slate-800">{step.title}</h3>
              <p className="text-xs text-slate-500 mt-1 mb-3 line-clamp-2 leading-relaxed">{step.desc}</p>
              {!step.completed ? (
                <Link
                  href={step.href}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 group"
                >
                  <span>{step.cta}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              ) : (
                <span className="text-[11px] font-semibold text-emerald-600 inline-flex items-center gap-1">
                  <span>✓ Sudah Dikonfigurasi</span>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};
