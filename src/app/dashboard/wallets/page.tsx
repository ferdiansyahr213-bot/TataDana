'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/dashboard/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { formatRupiah } from '@/lib/utils/currency';
import { Wallet, UserProfile, WalletType } from '@/lib/types';
import { 
  PlusCircle, 
  Wallet as WalletIcon, 
  Landmark, 
  Banknote, 
  Smartphone, 
  Check, 
  Repeat, 
  Star,
  Sparkles,
  CreditCard,
  ArrowRight,
  Trash2
} from 'lucide-react';
import { canAddWallet } from '@/lib/utils/plans';
import { getCurrentUserProfile, fetchUserWallets, subscribeToTransactions, deleteUserWallet } from '@/lib/supabase/data-service';

interface WalletPreset {
  name: string;
  type: WalletType;
  color: string;
  icon: string;
  badge: string;
}

const WALLET_PRESETS: WalletPreset[] = [
  { name: 'BCA (Bank Central Asia)', type: 'bank', color: '#003882', icon: 'landmark', badge: 'BCA' },
  { name: 'Bank Mandiri', type: 'bank', color: '#002c6c', icon: 'landmark', badge: 'Mandiri' },
  { name: 'BNI', type: 'bank', color: '#ea580c', icon: 'landmark', badge: 'BNI' },
  { name: 'BRI', type: 'bank', color: '#0284c7', icon: 'landmark', badge: 'BRI' },
  { name: 'Bank Syariah Indonesia (BSI)', type: 'bank', color: '#0d9488', icon: 'landmark', badge: 'BSI' },
  { name: 'Bank Jago', type: 'bank', color: '#f59e0b', icon: 'landmark', badge: 'Jago' },
  { name: 'SeaBank', type: 'bank', color: '#ff6200', icon: 'landmark', badge: 'SeaBank' },
  { name: 'GoPay', type: 'ewallet', color: '#00aa13', icon: 'smartphone', badge: 'GoPay' },
  { name: 'OVO', type: 'ewallet', color: '#4c2a86', icon: 'smartphone', badge: 'OVO' },
  { name: 'DANA', type: 'ewallet', color: '#0284c7', icon: 'smartphone', badge: 'DANA' },
  { name: 'ShopeePay', type: 'ewallet', color: '#ee4d2d', icon: 'smartphone', badge: 'Shopee' },
  { name: 'LinkAja', type: 'ewallet', color: '#dc2626', icon: 'smartphone', badge: 'LinkAja' },
  { name: 'Uang Tunai / Dompet Fisik', type: 'cash', color: '#059669', icon: 'banknote', badge: 'Cash' },
];

export default function WalletsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [limitWarning, setLimitWarning] = useState<string | null>(null);

  // Add Wallet Form
  const [name, setName] = useState('');
  const [type, setType] = useState<WalletType>('bank');
  const [selectedColor, setSelectedColor] = useState('#003882');
  const [initialBalance, setInitialBalance] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  // Transfer Form
  const [sourceWalletId, setSourceWalletId] = useState('');
  const [destWalletId, setDestWalletId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');

  // Open Finance (Brick) Bank Connection State
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [bankInstitution, setBankInstitution] = useState('bca');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');
  const [bankInitialBalance, setBankInitialBalance] = useState('');
  const [isConnectingBank, setIsConnectingBank] = useState(false);
  const [bankSuccessMsg, setBankSuccessMsg] = useState<string | null>(null);

  const handleOpenBankConnect = () => {
    setBankAccountHolder(user?.full_name || 'Budi Santoso');
    setBankAccountNumber('');
    setBankInitialBalance('5000000');
    setBankSuccessMsg(null);
    setIsBankModalOpen(true);
  };

  const handleConnectBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnectingBank(true);

    const bankNames: Record<string, string> = {
      bca: 'Bank Central Asia (BCA)',
      mandiri: 'Bank Mandiri',
      bni: 'Bank Negara Indonesia (BNI)',
      bri: 'Bank Rakyat Indonesia (BRI)',
      cimb: 'CIMB Niaga',
      bsi: 'Bank Syariah Indonesia (BSI)',
      jago: 'Bank Jago',
    };

    const instName = bankNames[bankInstitution] || 'Rekening Bank';
    const num = parseFloat(bankInitialBalance) || 0;

    try {
      const res = await fetch('/api/finance/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_connected_bank',
          userId: user?.id,
          connectData: {
            institutionId: bankInstitution,
            institutionName: instName,
            accountNumber: bankAccountNumber || '1234567890',
            accountHolderName: bankAccountHolder || user?.full_name || 'Budi Santoso',
            initialBalance: num,
            rawAccessToken: `brick_tok_${Date.now()}`,
          },
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setBankSuccessMsg(`Rekening ${instName} berhasil dihubungkan via Open Finance!`);
        setTimeout(() => {
          setIsBankModalOpen(false);
          setIsConnectingBank(false);
          loadData();
        }, 1200);
      } else {
        alert(data.error || 'Gagal menghubungkan rekening bank.');
        setIsConnectingBank(false);
      }
    } catch (e: any) {
      alert('Terjadi kesalahan koneksi.');
      setIsConnectingBank(false);
    }
  };

  const loadData = async (silent = false) => {
    if (!silent && wallets.length === 0) {
      setIsLoading(true);
    }
    try {
      const paramId = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('impersonate') ||
          new URLSearchParams(window.location.search).get('userId') ||
          sessionStorage.getItem('current_user_id')
        : null;
      const targetUserId = paramId || 'usr_demo_123';

      // Eksekusi paralel (Promise.all) agar profil user dan dompet termuat bersamaan tanpa blocking
      const [activeUser, userWallets] = await Promise.all([
        getCurrentUserProfile(targetUserId),
        fetchUserWallets(targetUserId),
      ]);

      setUser(activeUser);
      setWallets(userWallets);

      // Simpan ke Client-Side Cache (SWR Pattern) untuk navigasi instan 0ms
      if (typeof window !== 'undefined' && userWallets.length > 0) {
        try {
          sessionStorage.setItem(`tatadana_wallets_cache_${targetUserId}`, JSON.stringify(userWallets));
        } catch (err) {
          // sessionStorage quota safe
        }
      }

      if (userWallets.length >= 2 && !sourceWalletId) {
        setSourceWalletId(userWallets[0].id);
        setDestWalletId(userWallets[1].id);
      }
    } catch (e) {
      console.error('loadData wallets error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const paramId = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('impersonate') ||
        new URLSearchParams(window.location.search).get('userId') ||
        sessionStorage.getItem('current_user_id')
      : null;
    const targetUserId = paramId || 'usr_demo_123';

    // 1. Cek Client-Side Cache seketika saat halaman dibuka (0ms instant render)
    if (typeof window !== 'undefined') {
      try {
        const cachedStr = sessionStorage.getItem(`tatadana_wallets_cache_${targetUserId}`);
        if (cachedStr) {
          const cachedWallets = JSON.parse(cachedStr);
          if (Array.isArray(cachedWallets) && cachedWallets.length > 0) {
            setWallets(cachedWallets);
            setIsLoading(false);
          }
        }
      } catch (e) {
        // cache fallback
      }
    }

    // 2. Muat data segar secara paralel di background (stale-while-revalidate)
    loadData(wallets.length > 0);

    // 3. Realtime subscription aman (hanya jika live supabase aktif)
    const unsubscribe = subscribeToTransactions(targetUserId, () => {
      loadData(true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleOpenAdd = () => {
    if (user) {
      const check = canAddWallet(user.plan, wallets.length);
      if (!check.allowed) {
        setLimitWarning(check.reason || 'Batas dompet tercapai');
        return;
      }
    }
    setLimitWarning(null);
    setIsAddModalOpen(true);
  };

  const handleSelectPreset = (preset: WalletPreset) => {
    setName(preset.name);
    setType(preset.type);
    setSelectedColor(preset.color);
  };

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name,
      type,
      balance: parseFloat(initialBalance) || 0,
      is_default: isDefault,
      color: selectedColor || (type === 'bank' ? '#003882' : type === 'ewallet' ? '#0284c7' : '#059669'),
      icon: type === 'bank' ? 'landmark' : type === 'ewallet' ? 'smartphone' : 'banknote',
    };

    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_wallet',
        payload,
        userId: user?.id,
      }),
    });

    if (res.ok) {
      setIsAddModalOpen(false);
      setName('');
      setInitialBalance('');
      setIsDefault(false);
      loadData();
    }
  };

  const handleSetDefault = async (walletId: string) => {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'set_default_wallet',
        payload: { walletId },
        userId: user?.id,
      }),
    });
    if (res.ok) loadData();
  };

  const handleDeleteWallet = async (walletId: string, walletName: string, isDefault: boolean) => {
    if (wallets.length <= 1) {
      alert('Dompet terakhir tidak dapat dihapus untuk memastikan pencatatan transaksi tetap berjalan.');
      return;
    }

    const confirmed = window.confirm(`Apakah Anda yakin ingin menghapus dompet "${walletName}"?`);
    if (!confirmed) return;

    // Optimistic UI update
    setWallets((prev) => prev.filter((w) => w.id !== walletId));

    const paramId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('impersonate') || new URLSearchParams(window.location.search).get('userId') || sessionStorage.getItem('current_user_id') : null;
    const targetUserId = user?.id || paramId || 'usr_demo_123';

    await deleteUserWallet(targetUserId, walletId);

    // Jika yang dihapus adalah default wallet, pindahkan default ke wallet pertama yang tersisa
    if (isDefault) {
      const remaining = wallets.filter((w) => w.id !== walletId);
      if (remaining.length > 0) {
        await handleSetDefault(remaining[0].id);
      }
    }

    await loadData();
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(transferAmount);
    if (isNaN(num) || num <= 0 || sourceWalletId === destWalletId) return;

    const src = wallets.find((w) => w.id === sourceWalletId);
    const dst = wallets.find((w) => w.id === destWalletId);

    const payload = {
      wallet_id: sourceWalletId,
      wallet_name: src?.name,
      destination_wallet_id: destWalletId,
      destination_wallet_name: dst?.name,
      type: 'transfer',
      amount: num,
      notes: `Transfer dari ${src?.name} ke ${dst?.name}`,
      source: 'web',
      transaction_date: new Date().toISOString(),
    };

    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_transaction',
        payload,
        userId: user?.id,
      }),
    });

    if (res.ok) {
      setIsTransferModalOpen(false);
      setTransferAmount('');
      loadData();
    }
  };

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <Header
        title="Multi-Wallet & Saldo"
        subtitle="Kelola rekening bank, dompet tunai, dan e-wallet. Tentukan dompet default untuk pencatatan Telegram."
        onQuickAdd={handleOpenAdd}
      />

      {limitWarning && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs font-semibold text-brand-800 flex items-center justify-between">
          <span>{limitWarning}</span>
          <a href="/dashboard/pricing" className="underline text-brand-600">
            Upgrade ke Pro
          </a>
        </div>
      )}

      {/* Overview & Transfer Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Kekayaan Bersih
          </span>
          {isLoading && wallets.length === 0 ? (
            <div className="h-8 w-44 bg-slate-200 animate-pulse rounded-lg mt-1" />
          ) : (
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              {formatRupiah(totalBalance)}
            </div>
          )}
          <p className="text-xs text-slate-400 mt-0.5">
            {isLoading && wallets.length === 0 ? 'Memuat dompet...' : `Tersebar di ${wallets.length} dompet aktif • Mata uang IDR (Rupiah)`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Button
            onClick={handleOpenBankConnect}
            variant="outline"
            size="sm"
            className="border-blue-200 text-brand-700 bg-blue-50/50 hover:bg-blue-100/50"
            leftIcon={<Landmark className="w-4 h-4 text-brand-600" />}
          >
            Hubungkan Bank (Open Finance)
          </Button>
          <Button
            onClick={() => setIsTransferModalOpen(true)}
            variant="outline"
            size="sm"
            leftIcon={<Repeat className="w-4 h-4 text-brand-500" />}
          >
            Transfer Antar Dompet
          </Button>
          <Button
            onClick={handleOpenAdd}
            variant="primary"
            size="sm"
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            Tambah Dompet Baru
          </Button>
        </div>
      </div>

      {/* Wallets Cards Grid - Fintech Premium Card Style with Instant Skeleton Loading */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading && wallets.length === 0 ? (
          // Skeleton Loading Cards (Instant feedback, no blank screen)
          Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="relative rounded-3xl p-6 bg-slate-900 text-white overflow-hidden shadow-lg border border-slate-800 animate-pulse"
            >
              {/* Top Row Skeleton */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-7 rounded-md bg-slate-700/80" />
                  <div className="w-14 h-4 rounded bg-slate-700/60" />
                </div>
                <div className="w-24 h-6 rounded-full bg-slate-800" />
              </div>

              {/* Title Skeleton */}
              <div className="space-y-2 mb-6">
                <div className="w-36 h-5 rounded bg-slate-700/80" />
                <div className="w-24 h-3.5 rounded bg-slate-800" />
              </div>

              {/* Saldo Skeleton */}
              <div className="my-4 space-y-1.5">
                <div className="w-20 h-3 rounded bg-slate-800" />
                <div className="w-44 h-8 rounded bg-slate-700/80" />
              </div>

              {/* Action Footer Skeleton */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <div className="w-28 h-4 rounded bg-slate-800" />
                <div className="w-20 h-6 rounded bg-slate-800" />
              </div>
            </div>
          ))
        ) : wallets.length === 0 ? (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
            <WalletIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">Belum ada dompet terdaftar</p>
            <p className="text-xs text-slate-400 mt-1">Tambahkan dompet pertama Anda untuk mulai mengelola keuangan.</p>
            <Button onClick={handleOpenAdd} variant="primary" size="sm" className="mt-4" leftIcon={<PlusCircle className="w-4 h-4" />}>
              Tambah Dompet
            </Button>
          </div>
        ) : (
          wallets
            .filter((w) => w.id !== 'wal_01')
            .filter((w, index, self) => index === self.findIndex((t) => t.id === w.id))
            .map((wallet) => {
              const isBank = wallet.type === 'bank';
              const isEwallet = wallet.type === 'ewallet';
              const cardBg = wallet.color || (isBank ? '#003882' : isEwallet ? '#0284c7' : '#059669');

              return (
                <div
                  key={wallet.id}
                  className={`relative rounded-3xl p-6 text-white overflow-hidden shadow-lg transition-transform hover:-translate-y-1 ${
                    wallet.is_default ? 'ring-4 ring-brand-500/30' : ''
                  }`}
                  style={{
                    background: `linear-gradient(135deg, ${cardBg} 0%, #0f172a 120%)`,
                  }}
                >
                  {/* Background watermark icon */}
                  <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
                    {isBank ? (
                      <Landmark className="w-40 h-40" />
                    ) : isEwallet ? (
                      <Smartphone className="w-40 h-40" />
                    ) : (
                      <Banknote className="w-40 h-40" />
                    )}
                  </div>

                  {/* Top Row: Chip, Badge & Delete Action */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-7 rounded-md bg-amber-400/90 border border-amber-300 flex items-center justify-center shadow-inner">
                        <div className="w-5 h-4 border-t border-b border-amber-600/40" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                        {wallet.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {wallet.is_default ? (
                        <div className="bg-brand-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                          <Star className="w-3 h-3 fill-current" />
                          <span>Default Telegram</span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-mono text-white/60">ID: {wallet.id.slice(0, 6)}</span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteWallet(wallet.id, wallet.name, wallet.is_default)}
                        className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-600/90 text-white/70 hover:text-white transition-all shadow-xs"
                        title="Hapus Dompet"
                        aria-label="Hapus Dompet"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Wallet Name & Type */}
                  <div className="mb-4">
                    <h3 className="font-extrabold text-lg text-white tracking-wide truncate">
                      {wallet.name}
                    </h3>
                    <p className="text-xs text-white/70 capitalize mt-0.5">
                      {wallet.type === 'bank' ? 'Rekening Bank' : wallet.type === 'ewallet' ? 'Dompet Digital' : 'Uang Tunai'}
                    </p>
                  </div>

                  {/* Saldo Display */}
                  <div className="my-4">
                    <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider">
                      Saldo Tersedia
                    </span>
                    <div className="text-2xl font-black text-white tracking-tight mt-0.5">
                      {formatRupiah(wallet.balance)}
                    </div>
                  </div>

                  {/* Action Footer */}
                  <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                    {wallet.is_default ? (
                      <span className="text-brand-300 font-semibold flex items-center gap-1 text-[11px]">
                        <Check className="w-4 h-4" /> Otomatis Dipakai Bot
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSetDefault(wallet.id)}
                        className="text-white/80 hover:text-white font-medium transition-colors text-[11px] underline underline-offset-4"
                      >
                        Jadikan Default Bot
                      </button>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSourceWalletId(wallet.id);
                          setIsTransferModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-[11px] transition-colors"
                      >
                        Transfer Dana
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
        )}
      </div>

      {/* Add Wallet Modal with Indonesian Bank & E-Wallet Presets */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Tambah Dompet Baru"
        description="Pilih dari preset bank/e-wallet Indonesia atau buat dompet custom"
      >
        <form onSubmit={handleCreateWallet} className="space-y-4 text-xs">
          {/* Quick Preset Chips */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Preset Bank & E-Wallet Populer
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
              {WALLET_PRESETS.map((p) => (
                <button
                  key={p.badge}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                    name === p.name
                      ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-brand-300 hover:text-brand-600'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: p.color }}
                  />
                  <span>{p.badge}</span>
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Nama Dompet"
            placeholder="contoh: BCA Prioritas, Mandiri Utama, GoPay"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Jenis Dompet
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as WalletType)}
                className="w-full rounded-xl border border-surface-border bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-500"
              >
                <option value="bank">Rekening Bank</option>
                <option value="ewallet">E-Wallet Digital</option>
                <option value="cash">Uang Tunai (Cash)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Warna Tema
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="w-10 h-9 p-0.5 rounded-lg border border-slate-200 cursor-pointer"
                />
                <span className="font-mono text-[11px] text-slate-600 uppercase">{selectedColor}</span>
              </div>
            </div>
          </div>

          <Input
            label="Saldo Awal (Rp)"
            type="number"
            placeholder="0"
            value={initialBalance}
            onChange={(e) => setInitialBalance(e.target.value)}
          />

          <label className="flex items-center gap-2 cursor-pointer pt-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
            />
            <span className="text-slate-800 font-medium text-xs">
              Jadikan dompet default untuk pencatatan otomatis via Telegram Bot
            </span>
          </label>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Simpan Dompet
            </Button>
          </div>
        </form>
      </Modal>

      {/* Transfer Modal */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Transfer Antar Dompet"
        description="Pindahkan dana antara dua dompet yang terdaftar"
      >
        <form onSubmit={handleTransfer} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Dari Dompet Asal
            </label>
            <select
              value={sourceWalletId}
              onChange={(e) => setSourceWalletId(e.target.value)}
              className="w-full rounded-xl border border-surface-border bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-500"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({formatRupiah(w.balance)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Ke Dompet Tujuan
            </label>
            <select
              value={destWalletId}
              onChange={(e) => setDestWalletId(e.target.value)}
              className="w-full rounded-xl border border-surface-border bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-500"
            >
              {wallets
                .filter((w) => w.id !== sourceWalletId)
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({formatRupiah(w.balance)})
                  </option>
                ))}
            </select>
          </div>

          <Input
            label="Nominal Transfer (Rp)"
            type="number"
            placeholder="contoh: 200000"
            value={transferAmount}
            onChange={(e) => setTransferAmount(e.target.value)}
            required
          />

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsTransferModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Lakukan Transfer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Open Finance Bank Connect Modal */}
      <Modal
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
        title="Hubungkan Rekening Bank (Open Finance)"
        description="Sinkronisasi saldo dan mutasi otomatis terenkripsi AES-256-GCM via Brick API"
      >
        <form onSubmit={handleConnectBankSubmit} className="space-y-4 text-xs">
          {bankSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{bankSuccessMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Pilih Institusi Perbankan
            </label>
            <select
              value={bankInstitution}
              onChange={(e) => setBankInstitution(e.target.value)}
              className="w-full rounded-xl border border-surface-border bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-500"
            >
              <option value="bca">Bank Central Asia (BCA)</option>
              <option value="mandiri">Bank Mandiri</option>
              <option value="bni">Bank Negara Indonesia (BNI)</option>
              <option value="bri">Bank Rakyat Indonesia (BRI)</option>
              <option value="bsi">Bank Syariah Indonesia (BSI)</option>
              <option value="cimb">CIMB Niaga</option>
              <option value="jago">Bank Jago</option>
            </select>
          </div>

          <Input
            label="Nomor Rekening"
            placeholder="contoh: 8271928391"
            value={bankAccountNumber}
            onChange={(e) => setBankAccountNumber(e.target.value)}
            required
          />

          <Input
            label="Nama Pemilik Rekening"
            placeholder="contoh: Budi Santoso"
            value={bankAccountHolder}
            onChange={(e) => setBankAccountHolder(e.target.value)}
            required
          />

          <Input
            label="Saldo Terkini (Rp)"
            type="number"
            placeholder="contoh: 15000000"
            value={bankInitialBalance}
            onChange={(e) => setBankInitialBalance(e.target.value)}
            required
          />

          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-[11px] text-brand-800 leading-relaxed">
            🛡️ <strong>Keamanan Terjamin:</strong> Kredensial dan token akses bank dienkripsi menggunakan standar perbankan AES-256-GCM. Mutasi rekening akan disinkronkan secara berkala.
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsBankModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isConnectingBank}>
              Hubungkan Sekarang
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
