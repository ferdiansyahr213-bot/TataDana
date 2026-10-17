'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/dashboard/Header';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';
import { formatRupiah } from '@/lib/utils/currency';
import { getCurrentMonthPeriodWIB } from '@/lib/utils/date-wib';
import { 
  PlusCircle, 
  Target, 
  BellRing, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar,
  Clock,
  CalendarDays,
  Filter
} from 'lucide-react';
import { Budget, Category, UserProfile, Transaction } from '@/lib/types';
import { canAddBudget } from '@/lib/utils/plans';
import { 
  getCurrentUserProfile, 
  fetchUserBudgets, 
  fetchUserTransactions, 
  fetchUserCategories, 
  fetchUserWallets, 
  calculateAggregatedMetrics, 
  subscribeToTransactions 
} from '@/lib/supabase/data-service';

type BudgetFilterPeriod = 'all' | 'monthly' | 'weekly' | 'daily';

export default function BudgetsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<BudgetFilterPeriod>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [limitWarning, setLimitWarning] = useState<string | null>(null);

  // Form State
  const [selectedCatId, setSelectedCatId] = useState('');
  const [periodType, setPeriodType] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [amount, setAmount] = useState('');

  const loadData = async () => {
    try {
      const paramId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('impersonate') || new URLSearchParams(window.location.search).get('userId') || sessionStorage.getItem('current_user_id') : null;
      const activeUser = await getCurrentUserProfile(paramId);
      setUser(activeUser);

      // Fetch Budgets, Transaksi, Dompet, dan Kategori langsung dari Supabase
      const [bgts, txs, wls, cats] = await Promise.all([
        fetchUserBudgets(activeUser.id),
        fetchUserTransactions(activeUser.id),
        fetchUserWallets(activeUser.id),
        fetchUserCategories(activeUser.id),
      ]);

      setTransactions(txs);
      const expenseCats = cats.filter((c: Category) => c.type === 'expense');
      setCategories(expenseCats);

      // Agregasi pengeluaran dari transaksi nyata Supabase
      const metrics = calculateAggregatedMetrics(txs, wls, bgts);
      setBudgets(metrics.updatedBudgets);

      if (expenseCats.length > 0 && !selectedCatId) {
        setSelectedCatId(expenseCats[0].id);
      }
    } catch (e) {
      console.error('loadData budgets error:', e);
    }
  };

  useEffect(() => {
    loadData();

    // Pasang Supabase Realtime Subscription pada tabel transactions
    const paramId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('impersonate') || new URLSearchParams(window.location.search).get('userId') || sessionStorage.getItem('current_user_id') : null;
    const targetUserId = paramId || 'usr_demo_123';

    const unsubscribe = subscribeToTransactions(targetUserId, () => {
      loadData();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleOpenAddModal = () => {
    if (user) {
      const check = canAddBudget(user.plan, budgets.length);
      if (!check.allowed) {
        setLimitWarning(check.reason || 'Batas budget tercapai');
        return;
      }
    }
    setLimitWarning(null);
    setAmount('');
    setIsModalOpen(true);
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    const chosenCat = categories.find((c) => c.id === selectedCatId);

    const payload = {
      category_id: selectedCatId,
      category_name: chosenCat?.name,
      category_emoji: chosenCat?.emoji,
      category_color: chosenCat?.color,
      month_period: getCurrentMonthPeriodWIB(),
      period_type: periodType,
      amount: numAmount,
    };

    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_budget',
        payload,
        userId: user?.id,
      }),
    });

    if (res.ok) {
      setIsModalOpen(false);
      setAmount('');
      loadData();
    }
  };

  // Calculate actual spending for a budget based on period_type
  const getBudgetSpent = (budget: Budget): number => {
    const pType = budget.period_type || 'monthly';
    const now = Date.now();
    const todayStr = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = now - 7 * 86400000;
    const currentMonthPrefix = getCurrentMonthPeriodWIB();

    const matchingTx = transactions.filter(
      (t) => t.type === 'expense' && (t.category_id === budget.category_id || t.category_name === budget.category_name)
    );

    if (pType === 'daily') {
      return matchingTx
        .filter((t) => t.transaction_date.startsWith(todayStr))
        .reduce((sum, t) => sum + t.amount, 0);
    }

    if (pType === 'weekly') {
      return matchingTx
        .filter((t) => new Date(t.transaction_date).getTime() >= sevenDaysAgo)
        .reduce((sum, t) => sum + t.amount, 0);
    }

    // Default monthly
    const monthSpent = matchingTx
      .filter((t) => t.transaction_date.startsWith(currentMonthPrefix))
      .reduce((sum, t) => sum + t.amount, 0);

    return monthSpent > 0 ? monthSpent : budget.spent || 0;
  };

  const filteredBudgets = budgets.filter((b) => {
    if (activeTab === 'all') return true;
    return (b.period_type || 'monthly') === activeTab;
  });

  const totalBudget = filteredBudgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = filteredBudgets.reduce((sum, b) => sum + getBudgetSpent(b), 0);
  const overallPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <Header
        title="Anggaran (Budget) Multi-Periode"
        subtitle="Tetapkan batas aman pengeluaran Harian, Mingguan, dan Bulanan dengan peringatan Telegram"
        onQuickAdd={handleOpenAddModal}
      />

      {limitWarning && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs font-semibold text-brand-800 flex items-center justify-between">
          <span>{limitWarning}</span>
          <a href="/dashboard/pricing" className="underline text-brand-600">
            Upgrade ke Pro
          </a>
        </div>
      )}

      {/* Period Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua ({budgets.length})
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'monthly'
                ? 'bg-white text-brand-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Bulanan</span>
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'weekly'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Mingguan</span>
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'daily'
                ? 'bg-white text-amber-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Harian</span>
          </button>
        </div>

        <Button
          onClick={handleOpenAddModal}
          variant="primary"
          size="sm"
          leftIcon={<PlusCircle className="w-4 h-4" />}
        >
          Atur Budget Baru
        </Button>
      </div>

      {/* Overview Card */}
      <Card className="p-6 bg-gradient-to-br from-blue-50/60 via-white to-indigo-50/40 border-blue-200/80 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600">
                Ringkasan Anggaran ({activeTab === 'all' ? 'Semua Periode' : activeTab === 'monthly' ? 'Bulan Ini' : activeTab === 'weekly' ? '7 Hari Terakhir' : 'Hari Ini'})
              </span>
              <Badge variant="blue" size="sm">
                Real-time WIB
              </Badge>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {formatRupiah(totalSpent)}{' '}
              <span className="text-sm font-semibold text-slate-400">
                / {formatRupiah(totalBudget)}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Sisa batas aman belanja:{' '}
              <strong className="text-slate-800">
                {formatRupiah(Math.max(0, totalBudget - totalSpent))}
              </strong>
            </p>
          </div>

          <div className="w-full md:w-64 space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-slate-700">
              <span>Terpakai ({overallPercentage}%)</span>
              <span className={overallPercentage >= 80 ? 'text-amber-600' : 'text-emerald-600'}>
                {overallPercentage >= 100 ? 'Melebihi Limit' : overallPercentage >= 80 ? 'Waspada' : 'Aman'}
              </span>
            </div>
            <ProgressBar percentage={overallPercentage} size="lg" />
          </div>
        </div>
      </Card>

      {/* Grid of Category Budgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBudgets.map((budget) => {
          const spent = getBudgetSpent(budget);
          const percent = budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0;
          const remaining = Math.max(0, budget.amount - spent);
          const isOver = percent >= 100;
          const isWarning = percent >= 80 && percent < 100;
          const pType = budget.period_type || 'monthly';

          return (
            <Card key={budget.id} hoverEffect className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{budget.category_emoji || '📦'}</span>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{budget.category_name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          pType === 'daily'
                            ? 'bg-amber-100 text-amber-800'
                            : pType === 'weekly'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}>
                          {pType === 'daily' ? 'Harian' : pType === 'weekly' ? 'Mingguan' : 'Bulanan'}
                        </span>
                        <span className="text-[11px] text-slate-400">Limit: {formatRupiah(budget.amount)}</span>
                      </div>
                    </div>
                  </div>

                  {isOver ? (
                    <Badge variant="red" size="sm">
                      100% Lewat
                    </Badge>
                  ) : isWarning ? (
                    <Badge variant="blue" size="sm">
                      80% Alert
                    </Badge>
                  ) : (
                    <Badge variant="green" size="sm">
                      Aman
                    </Badge>
                  )}
                </div>

                <div className="space-y-2 my-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Terpakai:</span>
                    <span className="font-bold text-slate-900">{formatRupiah(spent)}</span>
                  </div>
                  <ProgressBar percentage={percent} size="md" />
                  <div className="flex justify-between items-center text-[11px] text-slate-400">
                    <span>Sisa: {formatRupiah(remaining)}</span>
                    <span className="font-semibold">{percent}%</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1 text-slate-500">
                  <BellRing className="w-3.5 h-3.5 text-brand-500" />
                  <span>Alert 80% & 100% Aktif</span>
                </div>
                <button
                  onClick={() => {
                    setSelectedCatId(budget.category_id);
                    setPeriodType(budget.period_type || 'monthly');
                    setAmount(budget.amount.toString());
                    setIsModalOpen(true);
                  }}
                  className="font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                >
                  Edit Batas
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add / Edit Budget Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Atur Budget Pengeluaran"
        description="Tentukan batas anggaran harian, mingguan, atau bulanan untuk kategori pengeluaran"
      >
        <form onSubmit={handleSaveBudget} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Pilih Kategori Pengeluaran
            </label>
            <select
              value={selectedCatId}
              onChange={(e) => setSelectedCatId(e.target.value)}
              className="w-full rounded-xl border border-surface-border bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-500"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Jenis Periode Anggaran
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPeriodType('monthly')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition-all ${
                  periodType === 'monthly'
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                📅 Bulanan
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('weekly')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition-all ${
                  periodType === 'weekly'
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                🗓️ Mingguan
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('daily')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition-all ${
                  periodType === 'daily'
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                ⏰ Harian
              </button>
            </div>
          </div>

          <Input
            label="Batas Nominal Anggaran (Rp)"
            type="number"
            placeholder={periodType === 'daily' ? 'contoh: 50000' : periodType === 'weekly' ? 'contoh: 350000' : 'contoh: 1500000'}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            helperText="Bot Telegram akan otomatis mengirim notifikasi peringatan saat belanja mencapai 80% dan 100% dari batas ini."
          />

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Simpan Budget
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
