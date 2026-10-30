'use client';

import React from 'react';
import { TrendingUp, CheckCircle2, Clock, AlertTriangle, ArrowDownLeft, Sparkles } from 'lucide-react';
import { formatRupiah } from '@/lib/utils/currency';
import { Wallet } from '@/lib/types';

export interface IncomeActionData {
  action: 'RECORD_INCOME' | string;
  data: {
    title: string;
    amount: number;
    category?: string;
    suggested_wallet_id?: string;
    suggested_wallet_name?: string;
    type?: 'income' | string;
    payment_options?: string[];
  };
}

export interface IncomeSelectionPayload {
  wallet_id: string;
  amount: number;
  description: string;
  category: string;
  type: 'income';
  wallet_name?: string;
}

interface IncomeActionCardProps {
  data: IncomeActionData;
  status?: 'pending' | 'success';
  chosenMethod?: string;
  onSelectWallet: (payload: IncomeSelectionPayload, walletId?: string) => void;
  wallets?: Wallet[];
}

export const IncomeActionCard: React.FC<IncomeActionCardProps> = ({
  data,
  status = 'pending',
  chosenMethod,
  onSelectWallet,
  wallets = [],
}) => {
  if (!data || (data.action !== 'RECORD_INCOME' && data.data?.type !== 'income') || !data.data) {
    return null;
  }

  const { title, amount, category, suggested_wallet_id } = data.data;

  // Daftar dompet aktif pengguna dari database
  const availableWallets: Wallet[] = Array.isArray(wallets) ? wallets : [];

  const getWalletBadgeConfig = (w: Wallet) => {
    let icon = '👛';
    let badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    let accentClass = 'group-hover:text-emerald-700';

    if (w.type === 'bank') {
      icon = '🏦';
      badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
      accentClass = 'group-hover:text-blue-700';
    } else if (w.type === 'ewallet') {
      icon = '📱';
      badgeClass = 'bg-sky-50 text-sky-700 border-sky-200';
      accentClass = 'group-hover:text-sky-700';
    } else if (w.type === 'cash') {
      icon = '💵';
      badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      accentClass = 'group-hover:text-emerald-700';
    } else if (w.type === 'credit') {
      icon = '💳';
      badgeClass = 'bg-purple-50 text-purple-700 border-purple-200';
      accentClass = 'group-hover:text-purple-700';
    }

    const isSuggested = suggested_wallet_id ? w.id === suggested_wallet_id : w.is_default;

    return { icon, badgeClass, accentClass, isSuggested };
  };

  const handleWalletClick = (w: Wallet) => {
    if (!w.id) {
      console.error('Wallet missing id:', w);
      return;
    }

    const payload: IncomeSelectionPayload = {
      wallet_id: w.id,
      amount: amount,
      description: title || 'Pemasukan',
      category: category || 'Gaji / Pendapatan',
      type: 'income',
      wallet_name: w.name,
    };

    onSelectWallet(payload, w.id);
  };

  return (
    <div className="w-full bg-white border border-emerald-200 rounded-2xl p-4 shadow-sm text-slate-800 space-y-3 mt-1.5 animate-fadeIn">
      {/* Header Kartu Pemasukan Khusus Hijau */}
      <div className="flex items-center justify-between pb-2.5 border-b border-emerald-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-xs">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs sm:text-sm text-slate-900">Konfirmasi Pemasukan</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-800">
                + INCOME
              </span>
            </div>
            <p className="text-[10px] text-emerald-600 font-medium">TataDana Smart Deposit</p>
          </div>
        </div>
        {status === 'success' ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Saldo Bertambah</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Clock className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>Pilih Dompet Masuk</span>
          </span>
        )}
      </div>

      {/* Rincian Pemasukan: Judul, Kategori, dan Nominal Hijau */}
      <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="space-y-0.5">
          <div className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
            Sumber / Nama Pemasukan
          </div>
          <div className="font-bold text-slate-900 text-sm capitalize">{title}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-emerald-100/80 text-emerald-800 border border-emerald-200">
              💰 {category || 'Gaji / Pendapatan'}
            </span>
          </div>
        </div>

        <div className="sm:text-right space-y-0.5 border-t sm:border-t-0 pt-2 sm:pt-0 border-emerald-200/50">
          <div className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
            Total Pemasukan Masuk
          </div>
          <div className="font-extrabold text-base sm:text-lg text-emerald-600 font-mono">
            + {formatRupiah(amount)}
          </div>
        </div>
      </div>

      {/* Pilihan Dompet Tujuan Penerimaan (BCA, GoPay, Cash, dll.) */}
      {status === 'success' ? (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs sm:text-sm flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Berhasil masuk ke <strong>{chosenMethod || 'Dompet Terpilih'}</strong>
            </span>
          </div>
          <span className="text-[11px] text-emerald-600 font-bold">+ {formatRupiah(amount)}</span>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
              Pilih Dompet Tujuan Penerimaan:
            </span>
            <span className="text-[10px] text-emerald-600 font-medium">Klik untuk tambah saldo</span>
          </div>

          {availableWallets.length === 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Memuat data dompet aktif... Silakan tunggu sejenak.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableWallets.map((w) => {
                const config = getWalletBadgeConfig(w);
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => handleWalletClick(w)}
                    data-wallet-id={w.id}
                    className="relative flex items-center gap-2.5 p-2.5 rounded-xl bg-white hover:bg-emerald-50/60 border border-slate-200/90 hover:border-emerald-400 text-left transition-all text-xs group shadow-xs hover:shadow-sm"
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${config.badgeClass}`}
                    >
                      {config.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className={`font-bold text-slate-800 ${config.accentClass} truncate`}>
                          {w.name}
                        </div>
                        {config.isSuggested && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 font-bold rounded">
                            Saran
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        Saldo: {formatRupiah(w.balance || 0)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
