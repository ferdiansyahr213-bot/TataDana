'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/dashboard/Header';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { formatRupiah } from '@/lib/utils/currency';
import { formatWIBDateTime, formatShortWIB } from '@/lib/utils/date-wib';
import { 
  PlusCircle, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight, 
  Repeat, 
  ChevronDown, 
  ChevronUp, 
  Camera, 
  Mic, 
  Smartphone, 
  Receipt 
} from 'lucide-react';
import { Transaction, Wallet, Category } from '@/lib/types';
import { 
  getCurrentUserProfile, 
  fetchUserTransactions, 
  fetchUserWallets, 
  fetchUserCategories, 
  insertTransaction, 
  subscribeToTransactions 
} from '@/lib/supabase/data-service';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedWallet, setSelectedWallet] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all');
  const [expandedTxIds, setExpandedTxIds] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [txType, setTxType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [walletId, setWalletId] = useState('');
  const [destWalletId, setDestWalletId] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const loadData = async () => {
    try {
      const paramId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('impersonate') || new URLSearchParams(window.location.search).get('userId') || sessionStorage.getItem('current_user_id') : null;
      const activeUser = await getCurrentUserProfile(paramId);

      // Fetch transaksi, wallets, dan kategori langsung dari Supabase
      const [txs, wls, cats] = await Promise.all([
        fetchUserTransactions(activeUser.id),
        fetchUserWallets(activeUser.id),
        fetchUserCategories(activeUser.id),
      ]);

      setTransactions(txs);
      setWallets(wls);
      setCategories(cats);

      if (wls.length > 0 && !walletId) {
        setWalletId(wls[0].id);
        if (wls.length > 1 && !destWalletId) setDestWalletId(wls[1].id);
      }
      if (cats.length > 0 && !categoryId) {
        setCategoryId(cats[0].id);
      }
    } catch (e) {
      console.error('loadData transactions error:', e);
    }
  };

  useEffect(() => {
    loadData();

    // Supabase Realtime Subscription untuk tabel transactions
    const paramId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('impersonate') || new URLSearchParams(window.location.search).get('userId') || sessionStorage.getItem('current_user_id') : null;
    const targetUserId = paramId || 'usr_demo_123';

    const unsubscribe = subscribeToTransactions(targetUserId, () => {
      loadData();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedTxIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateTx = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    const chosenWallet = wallets.find((w) => w.id === walletId);
    const chosenDest = wallets.find((w) => w.id === destWalletId);
    const chosenCat = categories.find((c) => c.id === categoryId);

    const paramId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('impersonate') || new URLSearchParams(window.location.search).get('userId') || sessionStorage.getItem('current_user_id') : null;
    const targetUserId = paramId || 'usr_demo_123';

    const payload = {
      user_id: user?.id || 'usr_demo_123',
      wallet_id: walletId,
      wallet_name: chosenWallet?.name,
      destination_wallet_id: txType === 'transfer' ? destWalletId : undefined,
      destination_wallet_name: txType === 'transfer' ? chosenDest?.name : undefined,
      category_id: txType !== 'transfer' ? categoryId : undefined,
      category_name: txType !== 'transfer' ? chosenCat?.name : undefined,
      category_emoji: txType !== 'transfer' ? chosenCat?.emoji : undefined,
      type: txType,
      amount: numAmount,
      notes: notes || (txType === 'transfer' ? 'Transfer dompet' : 'Pencatatan manual'),
      source: 'web' as const,
      transaction_date: new Date().toISOString(),
    };

    // Insert ke Supabase Postgres & sinkronkan saldo dompet
    await insertTransaction(targetUserId, payload);
    setIsModalOpen(false);
    setAmount('');
    setNotes('');
    await loadData();
  };

  // Filtering
  const filteredTransactions = transactions.filter((tx) => {
    if (selectedType !== 'all' && tx.type !== selectedType) return false;
    if (selectedWallet !== 'all' && tx.wallet_id !== selectedWallet) return false;
    if (selectedCategory !== 'all' && tx.category_id !== selectedCategory) return false;

    // Period filter
    const txTime = new Date(tx.transaction_date).getTime();
    const now = Date.now();
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthPrefix = todayStr.substring(0, 7);

    if (selectedPeriod === 'daily') {
      if (!tx.transaction_date.startsWith(todayStr)) return false;
    } else if (selectedPeriod === 'weekly') {
      if (txTime < now - 7 * 86400000) return false;
    } else if (selectedPeriod === 'monthly') {
      if (!tx.transaction_date.startsWith(currentMonthPrefix)) return false;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchNotes = (tx.notes || '').toLowerCase().includes(q);
      const matchCat = (tx.category_name || '').toLowerCase().includes(q);
      const matchMerchant = (tx.merchant_name || '').toLowerCase().includes(q);
      if (!matchNotes && !matchCat && !matchMerchant) return false;
    }
    return true;
  });

  const periodExpense = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const periodIncome = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <Header
        title="Daftar Transaksi"
        subtitle="Semua mutasi pemasukan, pengeluaran, transfer, dan struk belanja"
        onQuickAdd={() => setIsModalOpen(true)}
      />

      {/* Period Tabs & Quick Metrics Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Period Selector Tabs */}
        <div className="lg:col-span-2 flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => setSelectedPeriod('all')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedPeriod === 'all'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => setSelectedPeriod('daily')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
              selectedPeriod === 'daily'
                ? 'bg-white text-brand-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Harian</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedPeriod('weekly')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
              selectedPeriod === 'weekly'
                ? 'bg-white text-brand-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Mingguan</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedPeriod('monthly')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
              selectedPeriod === 'monthly'
                ? 'bg-white text-brand-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Bulanan</span>
          </button>
        </div>

        {/* Period Summary Stats */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Pengeluaran ({selectedPeriod === 'all' ? 'Semua' : selectedPeriod === 'daily' ? 'Hari Ini' : selectedPeriod === 'weekly' ? '7 Hari' : 'Bulan Ini'})
            </span>
            <div className="text-sm font-black text-rose-600 mt-0.5">
              -{formatRupiah(periodExpense)}
            </div>
          </div>
          <span className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-xs font-bold">
            💸
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Pemasukan ({selectedPeriod === 'all' ? 'Semua' : selectedPeriod === 'daily' ? 'Hari Ini' : selectedPeriod === 'weekly' ? '7 Hari' : 'Bulan Ini'})
            </span>
            <div className="text-sm font-black text-emerald-600 mt-0.5">
              +{formatRupiah(periodIncome)}
            </div>
          </div>
          <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold">
            💰
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="w-full md:w-80">
            <Input
              placeholder="Cari transaksi atau merchant..."
              leftIcon={<Search className="w-4 h-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-xs rounded-xl border border-surface-border px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-brand-500"
            >
              <option value="all">Semua Tipe</option>
              <option value="expense">Pengeluaran</option>
              <option value="income">Pemasukan</option>
              <option value="transfer">Transfer</option>
            </select>

            {/* Wallet Filter */}
            <select
              value={selectedWallet}
              onChange={(e) => setSelectedWallet(e.target.value)}
              className="text-xs rounded-xl border border-surface-border px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-brand-500"
            >
              <option value="all">Semua Dompet</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs rounded-xl border border-surface-border px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-brand-500"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Transactions List with Multi-item Accordion */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Daftar ({filteredTransactions.length} Transaksi)
          </span>
          <span className="text-[11px] text-slate-400">Diurutkan berdasarkan waktu terbaru</span>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredTransactions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Tidak ada transaksi yang cocok dengan filter
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const isExpense = tx.type === 'expense';
              const isTransfer = tx.type === 'transfer';
              const hasItems = tx.items && tx.items.length > 0;
              const isExpanded = expandedTxIds.has(tx.id);

              return (
                <div key={tx.id} className="transition-colors hover:bg-slate-50/60">
                  <div
                    className="p-4 flex items-center justify-between gap-4 cursor-pointer"
                    onClick={() => hasItems && toggleExpand(tx.id)}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isExpense
                            ? 'bg-rose-50 text-rose-600'
                            : isTransfer
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        {isExpense ? (
                          <ArrowDownRight className="w-5 h-5" />
                        ) : isTransfer ? (
                          <Repeat className="w-5 h-5" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">
                            {tx.notes || (isTransfer ? 'Transfer Dompet' : tx.category_name)}
                          </span>
                          {hasItems && (
                            <Badge variant="purple" size="sm">
                              {tx.items!.length} Items Struk
                            </Badge>
                          )}
                          {tx.source === 'telegram_photo' && (
                            <span className="p-1 rounded-md bg-purple-100 text-purple-700 text-[10px] flex items-center gap-1 font-medium">
                              <Camera className="w-3 h-3" /> Foto Struk AI
                            </span>
                          )}
                          {tx.source === 'telegram_voice' && (
                            <span className="p-1 rounded-md bg-sky-100 text-sky-700 text-[10px] flex items-center gap-1 font-medium">
                              <Mic className="w-3 h-3" /> Voice Note
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                          <span>{formatShortWIB(tx.transaction_date)}</span>
                          <span>•</span>
                          <span className="font-medium text-slate-700">
                            {isTransfer
                              ? `${tx.wallet_name} ➔ ${tx.destination_wallet_name}`
                              : tx.wallet_name}
                          </span>
                          {!isTransfer && tx.category_name && (
                            <>
                              <span>•</span>
                              <span>
                                {tx.category_emoji} {tx.category_name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span
                          className={`font-black text-sm sm:text-base ${
                            isExpense
                              ? 'text-rose-600'
                              : isTransfer
                              ? 'text-blue-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {isExpense ? '-' : isTransfer ? '' : '+'}
                          {formatRupiah(tx.amount)}
                        </span>
                        {tx.merchant_name && (
                          <p className="text-[10px] text-slate-400 mt-0.5">{tx.merchant_name}</p>
                        )}
                      </div>

                      {hasItems && (
                        <button
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                          title="Lihat rincian item"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Items Breakdown */}
                  {hasItems && isExpanded && (
                    <div className="px-6 py-4 bg-slate-50/90 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-2">
                        <span>Rincian Item Struk Belanja ({tx.merchant_name || 'Merchant'}):</span>
                        <span>Total: {formatRupiah(tx.amount)}</span>
                      </div>
                      <div className="divide-y divide-slate-200/60 bg-white rounded-xl border border-slate-200 p-2">
                        {tx.items!.map((it, idx) => (
                          <div key={idx} className="py-2 px-2 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-semibold text-slate-800">{it.item_name}</span>
                              <span className="text-slate-400 ml-2">({it.quantity}x @ {formatRupiah(it.price)})</span>
                            </div>
                            <span className="font-bold text-slate-900">{formatRupiah(it.price * it.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Add Transaction Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Catat Transaksi"
        description="Masukkan detail transaksi keuangan kamu"
      >
        <form onSubmit={handleCreateTx} className="space-y-4 text-xs">
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
            {(['expense', 'income', 'transfer'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTxType(t)}
                className={`py-2 text-xs font-semibold rounded-lg capitalize transition-all ${
                  txType === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t === 'expense' ? 'Pengeluaran' : t === 'income' ? 'Pemasukan' : 'Transfer'}
              </button>
            ))}
          </div>

          <Input
            label="Nominal (Rp)"
            type="number"
            placeholder="contoh: 50000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />

          <Input
            label="Catatan / Keterangan"
            placeholder="contoh: Makan siang, belanja bulanan"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              {txType === 'transfer' ? 'Dari Dompet Asal' : 'Dompet'}
            </label>
            <select
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              className="w-full rounded-xl border border-surface-border bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-500"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({formatRupiah(w.balance)})
                </option>
              ))}
            </select>
          </div>

          {txType === 'transfer' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Ke Dompet Tujuan
              </label>
              <select
                value={destWalletId}
                onChange={(e) => setDestWalletId(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-500"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({formatRupiah(w.balance)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {txType !== 'transfer' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Kategori
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-500"
              >
                {categories
                  .filter((c) => c.type === (txType === 'expense' ? 'expense' : 'income'))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji} {c.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="pt-3 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Simpan Transaksi
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
