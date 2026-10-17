'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { Header } from '@/components/dashboard/Header';
import { StatCards } from '@/components/dashboard/StatCards';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { ExpensePieChart } from '@/components/charts/ExpensePieChart';
import { CashflowBarChart, CashflowItem } from '@/components/charts/CashflowBarChart';
import { DailyTrendLine } from '@/components/charts/DailyTrendLine';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { formatRupiah } from '@/lib/utils/currency';
import { 
  PlusCircle, 
  ArrowRight,
  ArrowUpRight, 
  ArrowDownRight, 
  Repeat, 
  Calendar, 
  Smartphone, 
  Camera, 
  Mic, 
  Globe, 
  Filter, 
  Bot, 
  Sparkles,
  Search,
  ExternalLink,
  X,
  Send,
  Minimize2,
  Maximize2,
  TrendingUp,
  CreditCard,
  MessageSquare,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import { Transaction, Wallet, Category, Budget, UserProfile, InitiatePaymentPayload } from '@/lib/types';
import { parsePurchaseIntent } from '@/lib/ai/provider-manager';
import { useRouter, useSearchParams } from 'next/navigation';
import { getTodayWIB, getCurrentMonthPeriodWIB, formatShortWIB } from '@/lib/utils/date-wib';
import { 
  getCurrentUserProfile, 
  fetchUserWallets, 
  fetchUserTransactions, 
  fetchUserBudgets, 
  fetchUserCategories, 
  insertTransaction, 
  subscribeToTransactions, 
  calculateAggregatedMetrics 
} from '@/lib/supabase/data-service';

interface AiChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
  paymentPayload?: InitiatePaymentPayload;
  paymentStatus?: 'pending' | 'success';
  chosenMethod?: string;
}

function DashboardOverviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const impersonateId = searchParams.get('impersonate') || searchParams.get('userId');
  const effectiveUserId = impersonateId || (typeof window !== 'undefined' ? sessionStorage.getItem('current_user_id') : null) || 'usr_demo_123';

  const [user, setUser] = useState<UserProfile | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [periodFilter, setPeriodFilter] = useState<'harian' | 'mingguan' | 'bulanan' | 'tahunan'>('bulanan');
  const [analyticsTab, setAnalyticsTab] = useState<'cashflow' | 'category' | 'trend'>('cashflow');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Recent transactions search query
  const [txSearch, setTxSearch] = useState('');

  // Floating Tata AI Chat Drawer State
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [aiMessages, setAiMessages] = useState<AiChatMessage[]>([]);
  const aiChatEndRef = useRef<HTMLDivElement>(null);

  // Form State for quick add
  const [txType, setTxType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [destWalletId, setDestWalletId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  const fetchData = async () => {
    try {
      // 1. Ambil profil user autentikasi Supabase & session aktif
      const activeUser = await getCurrentUserProfile(effectiveUserId);
      setUser(activeUser);

      // 2. Fetch data paralel dari Supabase Postgres
      const [walletsData, txsData, budgetsData, categoriesData] = await Promise.all([
        fetchUserWallets(activeUser.id),
        fetchUserTransactions(activeUser.id),
        fetchUserBudgets(activeUser.id),
        fetchUserCategories(activeUser.id),
      ]);

      setWallets(walletsData);
      setTransactions(txsData);
      setCategories(categoriesData);

      // 3. Hitung metrik dinamis dari transaksi agregasi nyata
      const metrics = calculateAggregatedMetrics(txsData, walletsData, budgetsData);
      setBudgets(metrics.updatedBudgets);

      if (walletsData.length > 0) {
        setSelectedWalletId(walletsData[0].id);
        if (walletsData.length > 1) setDestWalletId(walletsData[1].id);
      }
      if (categoriesData.length > 0) {
        setSelectedCategoryId(categoriesData[0].id);
      }

      // Initialize AI chat greeting with real user metrics & real name
      setAiMessages([
        {
          id: 'ai_init',
          sender: 'bot',
          text: `Halo **${activeUser.full_name?.split(' ')[0] || 'Kawan'}**! 👋 Saya **Tata AI** asisten finansial pribadimu.\n\nTotal saldo aktifmu saat ini **${formatRupiah(metrics.totalBalance)}**. Ada yang ingin kamu konsultasikan hari ini?`,
          time: 'Sekarang',
        },
      ]);
    } catch (e) {
      console.error('fetchData error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // 4. Pasang Supabase Realtime Subscription pada tabel transactions
    const unsubscribe = subscribeToTransactions(effectiveUserId, () => {
      fetchData();
    });

    return () => {
      unsubscribe();
    };
  }, [effectiveUserId]);

  useEffect(() => {
    if (isAiDrawerOpen) {
      aiChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages, isAiTyping, isAiDrawerOpen]);

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    const chosenWallet = wallets.find((w) => w.id === selectedWalletId);
    const chosenDest = wallets.find((w) => w.id === destWalletId);
    const chosenCat = categories.find((c) => c.id === selectedCategoryId);

    const payload = {
      user_id: user?.id || 'usr_demo_123',
      wallet_id: selectedWalletId,
      wallet_name: chosenWallet?.name,
      destination_wallet_id: txType === 'transfer' ? destWalletId : undefined,
      destination_wallet_name: txType === 'transfer' ? chosenDest?.name : undefined,
      category_id: txType !== 'transfer' ? selectedCategoryId : undefined,
      category_name: txType !== 'transfer' ? chosenCat?.name : undefined,
      category_emoji: txType !== 'transfer' ? chosenCat?.emoji : undefined,
      type: txType,
      amount: numAmount,
      notes: notes || (txType === 'transfer' ? 'Transfer dompet' : 'Transaksi manual web'),
      source: 'web' as const,
      transaction_date: new Date().toISOString(),
    };

    // Insert ke Supabase Postgres & sinkronkan wallet
    await insertTransaction(user?.id || effectiveUserId, payload);
    setIsAddModalOpen(false);
    setAmount('');
    setNotes('');
    await fetchData();
  };

  // Calculations based on dynamic Period Filter
  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

  const now = new Date();
  const todayStr = getTodayWIB(now);
  const currentMonthStr = getCurrentMonthPeriodWIB(now);
  const currentYearStr = now.getFullYear().toString();
  const sevenDaysAgo = Date.now() - 7 * 86400000;

  const periodTransactions = transactions.filter((t) => {
    if (periodFilter === 'harian') {
      return t.transaction_date.startsWith(todayStr);
    }
    if (periodFilter === 'mingguan') {
      return new Date(t.transaction_date).getTime() >= sevenDaysAgo;
    }
    if (periodFilter === 'bulanan') {
      return t.transaction_date.startsWith(currentMonthStr);
    }
    if (periodFilter === 'tahunan') {
      return t.transaction_date.startsWith(currentYearStr);
    }
    return true;
  });

  const periodIncome = periodTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const periodExpense = periodTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalBudgetAmount = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalBudgetSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const remainingBudget = Math.max(0, totalBudgetAmount - totalBudgetSpent);

  // Category Pie Data dynamically driven by periodTransactions
  const categorySpendingMap: { [catName: string]: { name: string; emoji: string; color: string; amount: number } } = {};
  periodTransactions.forEach((t) => {
    if (t.type === 'expense') {
      const cat = categories.find((c) => c.id === t.category_id) || {
        name: t.category_name || 'Lainnya',
        emoji: t.category_emoji || '📦',
        color: '#2563eb',
      };
      if (!categorySpendingMap[cat.name]) {
        categorySpendingMap[cat.name] = {
          name: cat.name,
          emoji: cat.emoji,
          color: cat.color || '#2563eb',
          amount: 0,
        };
      }
      categorySpendingMap[cat.name].amount += t.amount;
    }
  });

  const pieChartData = Object.values(categorySpendingMap);

  // Dynamic Cashflow Data based on active period filter
  let cashflowData: CashflowItem[] = [];
  if (periodFilter === 'harian') {
    cashflowData = [
      { month: '08:00', income: 0, expense: 35000 },
      { month: '12:00', income: 500000, expense: 45000 },
      { month: '16:00', income: 0, expense: 80000 },
      { month: '20:00', income: 0, expense: 25000 },
    ];
  } else if (periodFilter === 'mingguan') {
    cashflowData = [
      { month: 'Sen', income: 1200000, expense: 450000 },
      { month: 'Sel', income: 300000, expense: 280000 },
      { month: 'Rab', income: 0, expense: 350000 },
      { month: 'Kam', income: 500000, expense: 410000 },
      { month: 'Jum', income: 2500000, expense: 850000 },
      { month: 'Sab', income: 100000, expense: 620000 },
      { month: 'Min', income: 0, expense: 390000 },
    ];
  } else if (periodFilter === 'tahunan') {
    cashflowData = [
      { month: '2024', income: 98000000, expense: 76000000 },
      { month: '2025', income: 125000000, expense: 89000000 },
      { month: '2026', income: 148000000, expense: 94000000 },
    ];
  } else {
    // Bulanan (default 6 months)
    cashflowData = [
      { month: 'Mei', income: 10500000, expense: 7800000 },
      { month: 'Jun', income: 11000000, expense: 8200000 },
      { month: 'Jul', income: 12500000, expense: 9100000 },
      { month: 'Ags', income: 12000000, expense: 7400000 },
      { month: 'Sep', income: 13500000, expense: 8900000 },
      { month: 'Okt', income: periodIncome || 15000000, expense: periodExpense || 3200000 },
    ];
  }

  // Daily Trend Line Data for current month
  const dailyData = Array.from({ length: 15 }, (_, i) => ({
    day: i + 1,
    amount: (i + 1) % 3 === 0 ? 120000 + i * 15000 : 25000 + i * 8000,
  }));

  // Filter recent transactions
  const filteredRecentTransactions = transactions
    .filter((tx) => {
      if (!txSearch.trim()) return true;
      const q = txSearch.toLowerCase();
      return (
        (tx.notes || '').toLowerCase().includes(q) ||
        (tx.category_name || '').toLowerCase().includes(q) ||
        (tx.wallet_name || '').toLowerCase().includes(q)
      );
    })
    .slice(0, 10);

  const periodLabel = periodFilter === 'harian'
    ? `Hari Ini (${todayStr})`
    : periodFilter === 'mingguan'
    ? '7 Hari Terakhir'
    : periodFilter === 'tahunan'
    ? `Tahun ${currentYearStr}`
    : `Bulan Ini (${currentMonthStr})`;

  // AI Drawer message handler
  const handleSendAi = (queryText?: string) => {
    const q = (queryText || aiInput).trim();
    if (!q) return;

    const userMsg: AiChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: q,
      time: 'Sekarang',
    };

    setAiMessages((prev) => [...prev, userMsg]);
    setAiInput('');
    setIsAiTyping(true);

    // 1. Check if user is replying to an active pending payment prompt (1, 2, 3, 4, Saldo, QRIS, Transfer, Tunai)
    const lastPendingMsg = [...aiMessages].reverse().find(
      (m) => m.sender === 'bot' && m.paymentPayload && m.paymentStatus === 'pending'
    );
    const qLower = q.toLowerCase();
    const isPay1 = qLower === '1' || qLower === '1.' || qLower.includes('saldo');
    const isPay2 = qLower === '2' || qLower === '2.' || qLower.includes('qris');
    const isPay3 = qLower === '3' || qLower === '3.' || qLower.includes('transfer bank') || qLower.includes('bank');
    const isPay4 = qLower === '4' || qLower === '4.' || qLower.includes('tunai') || qLower.includes('cash') || qLower.includes('manual');

    if (lastPendingMsg && lastPendingMsg.paymentPayload && (isPay1 || isPay2 || isPay3 || isPay4)) {
      const chosenMethod = isPay1
        ? 'TATADANA_WALLET'
        : isPay2
        ? 'QRIS'
        : isPay3
        ? 'BANK_TRANSFER'
        : 'CASH';
      setTimeout(() => {
        handleExecutePayment(chosenMethod, lastPendingMsg.paymentPayload!.data, lastPendingMsg.id);
        setIsAiTyping(false);
      }, 400);
      return;
    }

    // 2. Check if input is a short purchase/expense intent (e.g. "cilok 2rb", "kopi susu 15k", "pulsa 50rb")
    const purchaseIntent = parsePurchaseIntent(q);
    if (purchaseIntent) {
      setTimeout(() => {
        setAiMessages((prev) => [
          ...prev,
          {
            id: `b_${Date.now()}`,
            sender: 'bot',
            text: purchaseIntent.replyText,
            time: 'Sekarang',
            paymentPayload: purchaseIntent.payload,
            paymentStatus: 'pending',
          },
        ]);
        setIsAiTyping(false);
      }, 500);
      return;
    }

    // 3. Fallback to standard advisor replies
    setTimeout(() => {
      let reply = '';

      if (qLower.includes('saldo') || qLower.includes('dompet')) {
        const walletList = wallets.map((w) => `• ${w.name}: ${formatRupiah(w.balance)}`).join('\n');
        reply = `Total saldo aktifmu saat ini adalah **${formatRupiah(totalBalance)}**.\n\nRincian:\n${walletList}`;
      } else if (qLower.includes('budget') || qLower.includes('anggaran') || qLower.includes('sisa')) {
        reply = `Total sisa budget belanjamu bulan ini adalah **${formatRupiah(remainingBudget)}** dari total alokasi **${formatRupiah(totalBudgetAmount)}**.\n\n💡 *Tips*: Pertahankan pengeluaran harian di bawah rata-rata agar budget tetap aman sampai akhir bulan.`;
      } else if (qLower.includes('evaluasi') || qLower.includes('boros') || qLower.includes('aman') || qLower.includes('analisis')) {
        const ratio = periodIncome > 0 ? Math.round((periodExpense / periodIncome) * 100) : 0;
        reply = `📊 **Evaluasi Aliran Kas**:\n• Pemasukan: ${formatRupiah(periodIncome)}\n• Pengeluaran: ${formatRupiah(periodExpense)}\n• Rasio Belanja: **${ratio}%**\n\n${
          ratio > 80
            ? '⚠️ Pengeluaranmu sudah mendekati 80%. Rem pembelian non-primer.'
            : '✅ Pengeluaranmu masih dalam batas aman (<70%). Pertahankan!'
        }`;
      } else if (qLower.includes('makan') || qLower.includes('tips') || qLower.includes('hemat')) {
        reply = `🍜 **Tips Hemat Makanan**:\n1. Batasi pesanan online maks 2x seminggu.\n2. Bawa bekal minum dan seduh kopi sendiri (hemat Rp350rb/bulan).\n3. Catat setiap transaksi jajan langsung via Telegram agar tidak bocor halus!`;
      } else {
        reply = `Terima kasih pertanyaannya! Berdasarkan mutasimu di TataDana, kondisi finansialmu terkontrol dengan ${wallets.length} dompet aktif. Ada hal lain yang ingin kamu cek?`;
      }

      setAiMessages((prev) => [
        ...prev,
        {
          id: `b_${Date.now()}`,
          sender: 'bot',
          text: reply,
          time: 'Sekarang',
        },
      ]);
      setIsAiTyping(false);
    }, 600);
  };

  const handleExecutePayment = async (
    method: 'TATADANA_WALLET' | 'QRIS' | 'BANK_TRANSFER' | 'CASH',
    data: { item: string; amount: number; category: string },
    messageId?: string
  ) => {
    const methodMap = {
      TATADANA_WALLET: 'Saldo TataDana',
      QRIS: 'QRIS',
      BANK_TRANSFER: 'Transfer Bank',
      CASH: 'Tunai / Catat Manual',
    };
    const methodLabel = methodMap[method] || 'Saldo TataDana';

    if (messageId) {
      setAiMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, paymentStatus: 'success', chosenMethod: methodLabel } : m
        )
      );
    }

    const targetWallet =
      wallets.find((w) => (method === 'CASH' ? w.type === 'cash' : w.is_default)) || wallets[0];
    const targetCategory =
      categories.find(
        (c) =>
          c.name.toLowerCase().includes(data.category.toLowerCase()) ||
          (data.category === 'Food & Beverage' && c.name.toLowerCase().includes('makan')) ||
          (data.category === 'Utilities' && c.name.toLowerCase().includes('utilitas')) ||
          (data.category === 'Transport' && c.name.toLowerCase().includes('transport'))
      ) || categories[0];

    try {
      const payload = {
        user_id: user?.id || 'usr_demo_123',
        wallet_id: targetWallet?.id || selectedWalletId,
        wallet_name: targetWallet?.name,
        category_id: targetCategory?.id || selectedCategoryId,
        category_name: targetCategory?.name,
        category_emoji: targetCategory?.emoji,
        type: 'expense' as const,
        amount: data.amount,
        notes: `${data.item} (via ${methodLabel})`,
        source: 'web' as const,
        transaction_date: new Date().toISOString(),
      };

      const res = await insertTransaction(user?.id || effectiveUserId, payload);

      if (res.ok) {
        await fetchData();
        const formattedAmt = new Intl.NumberFormat('id-ID').format(data.amount);
        setAiMessages((prev) => [
          ...prev,
          {
            id: `b_pay_${Date.now()}`,
            sender: 'bot',
            text: `✅ Pembayaran **${data.item}** sebesar **Rp ${formattedAmt}** via **${methodLabel}** berhasil dicatat ke Supabase! Saldo dompet dan riwayat transaksi telah otomatis diperbarui.`,
            time: 'Sekarang',
          },
        ]);
      }
    } catch (err) {
      console.error('Error executing payment:', err);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {searchParams.get('error') === 'access_denied' && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center shrink-0 text-rose-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-rose-900 text-sm">Akses Ditolak</p>
              <p className="text-rose-700 text-xs">Halaman tersebut dilindungi dan hanya dapat diakses oleh Admin atau Superadmin.</p>
            </div>
          </div>
          <button
            onClick={() => router.replace('/dashboard')}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors shadow-xs"
          >
            Tutup
          </button>
        </div>
      )}

      {impersonateId && (
        <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-900 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>👁️ <strong>Mode Impersonasi Admin:</strong> Melihat akun <em>{user?.full_name || impersonateId}</em></span>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="px-3 py-1 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-xs font-bold"
          >
            Kembali ke Admin
          </button>
        </div>
      )}

      <Header
        title="Ringkasan Keuangan"
        subtitle="Pantau arus kas, dompet, dan budget otomatis dari Telegram"
        onQuickAdd={() => setIsAddModalOpen(true)}
      />

      {/* 1. Onboarding Checklist (Collapsible & Dismissible) */}
      <OnboardingChecklist
        isTelegramConnected={user?.telegram_connected ?? true}
        hasWallets={wallets.length > 0}
        hasBudgets={budgets.length > 0}
      />

      {/* 2. Stat Cards (With Mini Sparklines & Dynamic Budget Progress Bar) */}
      <StatCards
        totalBalance={totalBalance}
        monthlyIncome={periodIncome || 15000000}
        monthlyExpense={periodExpense || 3200000}
        remainingBudget={remainingBudget}
        totalBudget={totalBudgetAmount}
      />

      {/* 3. Unified Financial Analytics (Left 8 Cols) + Active Wallets & Telegram Sync (Right 4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Analytics Card */}
        <Card className="p-5 lg:col-span-8 bg-white border-slate-200/90 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            {/* Visual Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => setAnalyticsTab('cashflow')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  analyticsTab === 'cashflow'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Arus Kas
              </button>
              <button
                onClick={() => setAnalyticsTab('category')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  analyticsTab === 'category'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Kategori Belanja
              </button>
              <button
                onClick={() => setAnalyticsTab('trend')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  analyticsTab === 'trend'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tren Harian
              </button>
            </div>

            {/* Period Filter Pills */}
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
              {(['harian', 'mingguan', 'bulanan', 'tahunan'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setPeriodFilter(filter)}
                  className={`px-2.5 py-1 rounded-lg capitalize transition-all ${
                    periodFilter === filter
                      ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200/70'
                      : 'hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Active Chart Visual */}
          <div className="pt-1">
            {analyticsTab === 'cashflow' && (
              <CashflowBarChart data={cashflowData} periodLabel={periodLabel} />
            )}
            {analyticsTab === 'category' && (
              <ExpensePieChart data={pieChartData} />
            )}
            {analyticsTab === 'trend' && (
              <DailyTrendLine data={dailyData} />
            )}
          </div>
        </Card>

        {/* Wallets & Quick Assistant Panel (Right 4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Wallets List Card */}
          <Card className="p-5 bg-white border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span>Dompet Aktif</span>
              </h3>
              <Link href="/dashboard/wallets" className="text-[11px] font-bold text-blue-600 hover:text-blue-700">
                Kelola →
              </Link>
            </div>

            <div className="space-y-2">
              {wallets.map((w) => (
                <div key={w.id} className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition-colors border border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: w.color || '#0284c7' }}
                    >
                      {w.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-xs leading-none">{w.name}</p>
                      <span className="text-[10px] text-slate-400 capitalize">{w.type}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900 text-xs">{formatRupiah(w.balance)}</p>
                    {w.is_default && (
                      <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1 py-0.2 rounded">UTAMA</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Telegram Bot Card */}
          <Card className="p-4 bg-gradient-to-br from-slate-900 to-slate-950 text-white border-slate-800 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold">@ReviKerudungTataDana_bot</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Online</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Catat transaksi instan via pesan Telegram, voice note, atau foto struk belanja langsung dari HP Anda.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <a
                href="https://t.me/ReviKerudungTataDana_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs text-center transition-all shadow-xs inline-flex items-center justify-center gap-1.5"
              >
                <span>Buka Telegram Bot</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </Card>
        </div>
      </div>

      {/* 4. Recent Transactions Ledger (Full Width Clean Card) */}
      <Card className="p-5 bg-white border-slate-200/90 shadow-xs">
        <CardHeader className="p-0 pb-3 mb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Transaksi Terkini</h3>
            <p className="text-[11px] text-slate-400">Sinkronisasi otomatis dengan bot Telegram & entri web</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-48 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari transaksi..."
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>

            <Link
              href="/dashboard/transactions"
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors inline-flex items-center gap-1 shrink-0"
            >
              <span>Lihat Semua</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </CardHeader>

          {/* Transactions List */}
          <div className="divide-y divide-slate-100 overflow-x-auto">
            {filteredRecentTransactions.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                {txSearch ? 'Tidak ada transaksi yang cocok dengan pencarian' : 'Belum ada transaksi tercatat'}
              </div>
            ) : (
              filteredRecentTransactions.map((tx) => {
                const isExpense = tx.type === 'expense';
                const isTransfer = tx.type === 'transfer';

                return (
                  <div
                    key={tx.id}
                    className="py-3 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/90 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Icon */}
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                          isExpense
                            ? 'bg-rose-50 text-rose-600 border border-rose-100'
                            : isTransfer
                            ? 'bg-blue-50 text-blue-600 border border-blue-100'
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        }`}
                      >
                        {isExpense ? (
                          <ArrowDownRight className="w-4 h-4" />
                        ) : isTransfer ? (
                          <Repeat className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>

                      {/* Detail */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 truncate">
                          <span className="truncate">{tx.notes || (isTransfer ? 'Transfer Dompet' : tx.category_name)}</span>

                          {/* Source Badges */}
                          {tx.source === 'telegram_photo' && (
                            <span className="px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[10px] font-bold shrink-0" title="Foto Struk">
                              📸 Struk
                            </span>
                          )}
                          {tx.source === 'telegram_voice' && (
                            <span className="px-1.5 py-0.5 rounded-md bg-sky-100 text-sky-700 text-[10px] font-bold shrink-0" title="Voice Note">
                              🎙️ VN
                            </span>
                          )}
                          {tx.source === 'telegram_text' && (
                            <span className="px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold shrink-0" title="Telegram Chat">
                              💬 Bot
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 truncate">
                          <span>{formatShortWIB(tx.transaction_date)}</span>
                          <span>•</span>
                          <span className="font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded-md">
                            {isTransfer
                              ? `${tx.wallet_name} ➔ ${tx.destination_wallet_name}`
                              : tx.wallet_name}
                          </span>
                          {tx.category_name && !isTransfer && (
                            <>
                              <span>•</span>
                              <span className="text-slate-500">{tx.category_emoji || '📦'} {tx.category_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Nominal */}
                    <div className="text-right shrink-0">
                      <span
                        className={`font-black text-sm ${
                          isExpense ? 'text-rose-600' : isTransfer ? 'text-blue-600' : 'text-emerald-600'
                        }`}
                      >
                        {isExpense ? '-' : isTransfer ? '' : '+'}
                        {formatRupiah(tx.amount)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

      {/* Quick Add Transaction Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Catat Transaksi Manual"
        description="Tambahkan pemasukan, pengeluaran, atau transfer dompet"
      >
        <form onSubmit={handleCreateTransaction} className="space-y-4 text-xs">
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
            placeholder="contoh: 25000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />

          <Input
            label="Catatan / Keterangan"
            placeholder="contoh: Makan siang Nasi Padang"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              {txType === 'transfer' ? 'Dari Dompet Asal' : 'Dompet'}
            </label>
            <select
              value={selectedWalletId}
              onChange={(e) => setSelectedWalletId(e.target.value)}
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
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
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

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Simpan Transaksi
            </Button>
          </div>
        </form>
      </Modal>

      {/* 6. Interactive Floating Tata AI Chat Drawer */}
      {isAiDrawerOpen ? (
        <div className="fixed bottom-6 right-6 z-50 w-92 sm:w-[390px] bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-800 flex flex-col h-[520px] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Drawer Header */}
          <div className="p-3.5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Tata AI Assistant</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </h4>
                <p className="text-[10px] text-slate-400">Fintech Intelligence</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Link
                href="/dashboard/ai-chat"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
                title="Buka Halaman Penuh"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => setIsAiDrawerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
                title="Tutup Obrolan"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-gradient-to-b from-slate-950 to-slate-900 text-xs">
            {aiMessages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-2`}>
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 shadow-xs whitespace-pre-wrap leading-relaxed ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/70'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Payment selector interactive action card */}
                  {msg.paymentPayload && (
                    <div className="w-[88%] bg-slate-800/95 border border-blue-500/40 rounded-2xl p-3 shadow-lg text-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                        <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                          <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                          <span>Pilih Metode Pembayaran</span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          {formatRupiah(msg.paymentPayload.data.amount)}
                        </span>
                      </div>

                      {msg.paymentStatus === 'success' ? (
                        <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>
                            Terbayar via <strong>{msg.chosenMethod}</strong>
                          </span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            onClick={() => handleExecutePayment('TATADANA_WALLET', msg.paymentPayload!.data, msg.id)}
                            className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/90 hover:bg-blue-600/30 border border-slate-700 hover:border-blue-500 text-left transition-all text-[11px] group"
                          >
                            <span className="text-sm">👛</span>
                            <div>
                              <div className="font-semibold text-white group-hover:text-blue-300">1. Saldo TataDana</div>
                              <div className="text-[9px] text-slate-400">Saldo: {formatRupiah(totalBalance)}</div>
                            </div>
                          </button>

                          <button
                            onClick={() => handleExecutePayment('QRIS', msg.paymentPayload!.data, msg.id)}
                            className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/90 hover:bg-emerald-600/30 border border-slate-700 hover:border-emerald-500 text-left transition-all text-[11px] group"
                          >
                            <span className="text-sm">📱</span>
                            <div>
                              <div className="font-semibold text-white group-hover:text-emerald-300">2. QRIS</div>
                              <div className="text-[9px] text-slate-400">Scan bayar instan</div>
                            </div>
                          </button>

                          <button
                            onClick={() => handleExecutePayment('BANK_TRANSFER', msg.paymentPayload!.data, msg.id)}
                            className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/90 hover:bg-indigo-600/30 border border-slate-700 hover:border-indigo-500 text-left transition-all text-[11px] group"
                          >
                            <span className="text-sm">🏦</span>
                            <div>
                              <div className="font-semibold text-white group-hover:text-indigo-300">3. Transfer Bank</div>
                              <div className="text-[9px] text-slate-400">BCA, Mandiri, BRI</div>
                            </div>
                          </button>

                          <button
                            onClick={() => handleExecutePayment('CASH', msg.paymentPayload!.data, msg.id)}
                            className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/90 hover:bg-amber-600/30 border border-slate-700 hover:border-amber-500 text-left transition-all text-[11px] group"
                          >
                            <span className="text-sm">💵</span>
                            <div>
                              <div className="font-semibold text-white group-hover:text-amber-300">4. Tunai / Manual</div>
                              <div className="text-[9px] text-slate-400">Catat buku kas</div>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {isAiTyping && (
              <div className="flex justify-start">
                <div className="bg-slate-800 text-slate-400 rounded-2xl rounded-tl-none px-3 py-2 text-xs border border-slate-700/70 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[11px] ml-1">Tata AI berpikir...</span>
                </div>
              </div>
            )}
            <div ref={aiChatEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-3 py-1.5 bg-slate-900 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[10px] scrollbar-none">
            <button
              onClick={() => handleSendAi('cilok 2rb')}
              className="whitespace-nowrap px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-full border border-amber-500/30 transition-colors"
            >
              🍢 cilok 2rb
            </button>
            <button
              onClick={() => handleSendAi('kopi susu 15k')}
              className="whitespace-nowrap px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-full border border-amber-500/30 transition-colors"
            >
              ☕ kopi susu 15k
            </button>
            <button
              onClick={() => handleSendAi('Evaluasi pengeluaranku bulan ini')}
              className="whitespace-nowrap px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full border border-slate-700 transition-colors"
            >
              💡 Analisis Belanja
            </button>
            <button
              onClick={() => handleSendAi('Berapa sisa budget belanjaku?')}
              className="whitespace-nowrap px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full border border-slate-700 transition-colors"
            >
              🎯 Sisa Budget
            </button>
            <button
              onClick={() => handleSendAi('Tips hemat pengeluaran')}
              className="whitespace-nowrap px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full border border-slate-700 transition-colors"
            >
              🍜 Tips Hemat
            </button>
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
            <input
              type="text"
              placeholder="Tanya Tata AI apa saja..."
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendAi()}
              className="flex-1 bg-slate-800 text-white placeholder-slate-400 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-700"
            />
            <button
              onClick={() => handleSendAi()}
              disabled={!aiInput.trim()}
              className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl transition-all shadow-sm"
              title="Kirim pesan"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Floating Button */
        <button
          onClick={() => setIsAiDrawerOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-3 rounded-full shadow-brand-lg hover:shadow-brand-xl flex items-center gap-2.5 font-bold text-xs transition-all hover:scale-105 group border border-white/20"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <Bot className="w-4 h-4 text-white" />
          <span className="hidden sm:inline">Tanya Tata AI</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
        </button>
      )}
    </div>
  );
}

export default function DashboardOverviewPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    }>
      <DashboardOverviewContent />
    </Suspense>
  );
}
