'use client';

import React from 'react';
import { CreditCard, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { formatRupiah } from '@/lib/utils/currency';
import { Wallet } from '@/lib/types';

export interface PaymentActionData {
  action: 'INITIATE_PAYMENT' | string;
  data: {
    item: string;
    amount: number;
    currency?: string;
    category?: string;
    payment_options?: string[];
  };
}

export interface PaymentSelectionPayload {
  wallet_id: string;
  amount: number;
  description: string;
  category: string;
  wallet_name?: string;
}

interface PaymentActionCardProps {
  data: PaymentActionData;
  status?: 'pending' | 'success';
  chosenMethod?: string;
  onSelectMethod: (payload: PaymentSelectionPayload, walletId?: string) => void;
  wallets?: Wallet[];
}

export const PaymentActionCard: React.FC<PaymentActionCardProps> = ({
  data,
  status = 'pending',
  chosenMethod,
  onSelectMethod,
  wallets = [],
}) => {
  if (!data || data.action !== 'INITIATE_PAYMENT' || !data.data) {
    return null;
  }

  const { item, amount, category } = data.data;

  // Siapkan daftar dompet pengguna yang memiliki wallet_id valid
  // Setiap tombol HANYA dibuat dari dompet riil yang ada di database pengguna
  const availableWallets: Wallet[] = Array.isArray(wallets) ? wallets : [];

  const getWalletBadgeConfig = (w: Wallet) => {
    let icon = '👛';
    let badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
    let accentClass = 'group-hover:text-blue-700';

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

    const isLowBalance = (w.balance ?? 0) < amount;

    return { icon, badgeClass, accentClass, isLowBalance };
  };

  const handleWalletClick = (w: Wallet) => {
    // Validasi: Wajib ada wallet_id unik
    if (!w.id) {
      console.error('Wallet missing id:', w);
      return;
    }

    // Kirim payload request terstruktur:
    // { wallet_id: "<id_dompet_yang_diklik>", amount, description, category }
    const payload: PaymentSelectionPayload = {
      wallet_id: w.id,
      amount: amount,
      description: item,
      category: category || 'Makanan & Minuman',
      wallet_name: w.name,
    };

    onSelectMethod(payload, w.id);
  };

  return (
    <div className="w-full bg-white border border-indigo-100 rounded-2xl p-4 shadow-sm text-slate-800 space-y-3 mt-1.5 animate-fadeIn">
      {/* Header Kartu & Status */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-xs sm:text-sm text-slate-900">Konfirmasi Pembayaran</span>
            <p className="text-[10px] text-slate-400">TataDana Smart Checkout</p>
          </div>
        </div>
        {status === 'success' ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Lunas</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span>Pilih Dompet</span>
          </span>
        )}
      </div>

      {/* Rincian: Item/Nama Pembelian, Nominal, dan Kategori */}
      <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="space-y-0.5">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Item Pembelian</div>
          <div className="font-bold text-slate-900 text-sm capitalize">{item}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-blue-50 text-brand-700 border border-blue-200/60">
              🏷️ {category || 'Belanja'}
            </span>
          </div>
        </div>

        <div className="sm:text-right space-y-0.5 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/60">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Tagihan</div>
          <div className="font-extrabold text-base sm:text-lg text-emerald-600 font-mono">
            {formatRupiah(amount)}
          </div>
        </div>
      </div>

      {/* Pilihan Tombol Opsi Pembayaran Sesuai Dompet Riil Pengguna */}
      {status === 'success' ? (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs sm:text-sm flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Tercatat via <strong>{chosenMethod || 'Dompet Terpilih'}</strong></span>
          </div>
          <span className="text-[11px] text-emerald-600 font-bold">Saldo Terpotong</span>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
            <span>Pilih Dompet Sumber Pembayaran:</span>
            <span className="text-[10px] text-slate-400 font-normal">Klik untuk potong saldo instan</span>
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
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white hover:bg-indigo-50/50 border border-slate-200/80 hover:border-indigo-400 text-left transition-all text-xs group shadow-xs hover:shadow-sm"
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${config.badgeClass}`}>
                      {config.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`font-bold text-slate-800 ${config.accentClass} truncate`}>
                        {w.name}
                      </div>
                      <div className={`text-[10px] truncate ${config.isLowBalance ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
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
