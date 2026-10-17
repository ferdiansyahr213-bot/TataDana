'use client';

import React, { useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Check, Sparkles, ShieldCheck, Zap, UploadCloud } from 'lucide-react';
import { PLAN_LIMITS } from '@/lib/utils/plans';

export default function PricingUpgradePage() {
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'pro'>('pro');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'midtrans' | 'manual_transfer'>('midtrans');
  const [manualReceiptUrl, setManualReceiptUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [activeUserId, setActiveUserId] = useState<string>('usr_demo_123');
  const [currentUserPlan, setCurrentUserPlan] = useState<string>('starter');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const paramId = new URLSearchParams(window.location.search).get('impersonate') || new URLSearchParams(window.location.search).get('userId') || sessionStorage.getItem('current_user_id');
      const targetId = paramId || 'usr_demo_123';
      setActiveUserId(targetId);

      fetch(`/api/data?userId=${encodeURIComponent(targetId)}`)
        .then(res => res.json())
        .then(data => {
          if (data.ok && data.user) {
            setCurrentUserPlan(data.user.plan);
          }
        })
        .catch(console.error);
    }
  }, []);

  const handlePay = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/midtrans/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          paymentMethod,
          manualReceiptUrl: paymentMethod === 'manual_transfer' ? manualReceiptUrl : undefined,
          userId: activeUserId,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setPaymentSuccess(data.message);
        setTimeout(() => {
          setIsPaymentModalOpen(false);
          setPaymentSuccess(null);
          window.location.reload();
        }, 1500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl mx-auto w-full">
      <Header
        title="Pilihan Paket Berlangganan"
        subtitle="Tingkatkan kapasitas pencatatan keuangan dan nikmati kemudahan AI OCR struk belanja"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
        {/* Starter Plan */}
        <Card className="p-8 border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Starter</span>
              <Badge variant="gray" size="sm">
                Paket Dasar
              </Badge>
            </div>
            <div className="text-3xl font-black text-slate-900 mb-1">
              Rp49.000 <span className="text-sm font-semibold text-slate-400">/ bulan</span>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              Cocok untuk pemula yang ingin mulai disiplin mencatat transaksi harian.
            </p>

            <ul className="space-y-3 text-xs text-slate-600 mb-8">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Catat via teks & voice note Telegram</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Maksimal 50 transaksi / bulan</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Maksimal 3 dompet & 5 kategori budget</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Dashboard web & ringkasan bulanan</span>
              </li>
              <li className="flex items-center gap-2.5 text-slate-400 line-through">
                <span>Input foto struk AI OCR</span>
              </li>
              <li className="flex items-center gap-2.5 text-slate-400 line-through">
                <span>AI Financial Advisor otomatis</span>
              </li>
              <li className="flex items-center gap-2.5 text-slate-400 line-through">
                <span>Export laporan PDF & Excel</span>
              </li>
            </ul>
          </div>

          <Button
            onClick={() => {
              setSelectedPlan('starter');
              setIsPaymentModalOpen(true);
            }}
            variant="outline"
            className="w-full"
          >
            Pilih Starter (Rp49rb/bln)
          </Button>
        </Card>

        {/* Pro Plan */}
        <Card className="p-8 border-brand-400 ring-2 ring-brand-500/20 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/20 flex flex-col justify-between relative shadow-brand">
          <div className="absolute -top-3 right-6 bg-brand-500 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Paling Populer</span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-600">Pro Lifetime</span>
              <Badge variant="blue" size="sm">
                Akses Penuh
              </Badge>
            </div>
            <div className="text-3xl font-black text-slate-900 mb-1">
              Rp99.000 <span className="text-sm font-semibold text-brand-600">Sekali Bayar</span>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              Akses seumur hidup tanpa tagihan berulang. Semua fitur AI aktif.
            </p>

            <ul className="space-y-3 text-xs text-slate-700 mb-8 font-medium">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-brand-500 shrink-0" />
                <span>
                  <strong>Unlimited</strong> transaksi bulanan
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-brand-500 shrink-0" />
                <span>
                  <strong>Unlimited</strong> dompet & kategori budget
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-brand-500 shrink-0" />
                <span>
                  <strong>Foto Struk AI Vision</strong> (baca item & harga otomatis)
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-brand-500 shrink-0" />
                <span>
                  <strong>AI Financial Advisor</strong> analisis kebiasaan boros
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-brand-500 shrink-0" />
                <span>
                  <strong>Export Laporan Unlimited</strong> ke PDF & Excel (.xlsx)
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-brand-500 shrink-0" />
                <span>Pengingat custom hingga 2x sehari</span>
              </li>
            </ul>
          </div>

          <Button
            onClick={() => {
              if (currentUserPlan !== 'pro') {
                setSelectedPlan('pro');
                setIsPaymentModalOpen(true);
              }
            }}
            variant="primary"
            className="w-full shadow-brand"
            disabled={currentUserPlan === 'pro'}
          >
            {currentUserPlan === 'pro' ? '✅ Paket Pro Aktif' : 'Upgrade ke Pro Sekarang (Rp99.000)'}
          </Button>
        </Card>
      </div>

      {/* Payment Checkout Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={`Konfirmasi Upgrade Paket ${selectedPlan.toUpperCase()}`}
        description="Pilih metode pembayaran aman via Midtrans atau transfer bank manual"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex justify-between items-center">
            <div>
              <span className="font-bold text-slate-900 block">
                Paket {selectedPlan === 'pro' ? 'Pro Lifetime' : 'Starter Bulanan'}
              </span>
              <span className="text-[11px] text-slate-500">
                {selectedPlan === 'pro' ? 'Akses seumur hidup' : 'Berlangganan per bulan'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-base font-black text-brand-600">
                {selectedPlan === 'pro' ? 'Rp99.000' : 'Rp49.000'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Pilih Metode Pembayaran:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('midtrans')}
                className={`p-3 rounded-xl border text-left font-semibold transition-all ${
                  paymentMethod === 'midtrans'
                    ? 'border-brand-500 bg-blue-50 text-brand-700 ring-2 ring-brand-500/20'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap className="w-4 h-4 text-brand-500" />
                  <span>Midtrans</span>
                </div>
                <p className="text-[10px] text-slate-400 font-normal">
                  QRIS, GoPay, Virtual Account (Otomatis)
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('manual_transfer')}
                className={`p-3 rounded-xl border text-left font-semibold transition-all ${
                  paymentMethod === 'manual_transfer'
                    ? 'border-brand-500 bg-blue-50 text-brand-700 ring-2 ring-brand-500/20'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <UploadCloud className="w-4 h-4 text-brand-500" />
                  <span>Transfer Manual</span>
                </div>
                <p className="text-[10px] text-slate-400 font-normal">
                  Upload bukti transfer, approval admin
                </p>
              </button>
            </div>
          </div>

          {paymentMethod === 'manual_transfer' && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <p className="text-slate-600">
                Silakan transfer ke <strong>BCA 8820-192-332 (PT TataDana Fintech)</strong>
              </p>
              <Input
                label="URL Bukti Transfer"
                placeholder="https://..."
                value={manualReceiptUrl}
                onChange={(e) => setManualReceiptUrl(e.target.value)}
                helperText="Upload foto bukti transfer pembayaran"
              />
            </div>
          )}

          {paymentSuccess && (
            <p className="text-emerald-600 font-bold text-center py-2">{paymentSuccess}</p>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsPaymentModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" size="sm" isLoading={isProcessing} onClick={handlePay}>
              Bayar Sekarang
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
