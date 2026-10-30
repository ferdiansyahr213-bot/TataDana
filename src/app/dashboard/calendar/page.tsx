'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/dashboard/Header';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { formatRupiah } from '@/lib/utils/currency';
import { formatShortWIB, formatWIBDateTime } from '@/lib/utils/date-wib';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet as WalletIcon, 
  Clock, 
  PlusCircle, 
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  FileText,
  Tag,
  Sparkles
} from 'lucide-react';
import { Transaction, UserProfile, Wallet as WalletType, Category } from '@/lib/types';
import { insertTransaction, fetchUserWallets, fetchUserCategories } from '@/lib/supabase/data-service';
import Link from 'next/link';

export default function FinancialCalendarPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(''); // YYYY-MM-DD
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth()); // 0-indexed
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Note Form Modal State
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteDate, setNoteDate] = useState('');
  const [noteType, setNoteType] = useState<'expense' | 'income'>('expense');
  const [noteAmount, setNoteAmount] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteWalletId, setNoteWalletId] = useState('');
  const [noteCategoryId, setNoteCategoryId] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [noteFeedback, setNoteFeedback] = useState<string | null>(null);

  // Set today as default selected date on client mount
  useEffect(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const dateFormatted = `${y}-${m}-${d}`;
    setSelectedDateStr(dateFormatted);
    setNoteDate(dateFormatted);
  }, []);

  const loadData = async () => {
    try {
      const activeUserId = (typeof window !== 'undefined' ? sessionStorage.getItem('current_user_id') : null) || 'usr_demo_123';
      const [dataRes, walletsData, categoriesData] = await Promise.all([
        fetch(`/api/data?userId=${encodeURIComponent(activeUserId)}`),
        fetchUserWallets(activeUserId),
        fetchUserCategories(activeUserId),
      ]);

      const data = await dataRes.json();
      if (data.ok) {
        setTransactions(data.transactions || []);
      }
      setWallets(walletsData);
      setCategories(categoriesData);

      if (walletsData.length > 0 && !noteWalletId) {
        setNoteWalletId(walletsData[0].id);
      }
      if (categoriesData.length > 0 && !noteCategoryId) {
        setNoteCategoryId(categoriesData[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenNoteModal = (dateStr?: string) => {
    const targetDate = dateStr || selectedDateStr || (() => {
      const today = new Date();
      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    })();
    setNoteDate(targetDate);
    setSelectedDateStr(targetDate);
    setNoteAmount('');
    setNoteTitle('');
    setNoteFeedback(null);
    setIsNoteModalOpen(true);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(noteAmount);
    if (isNaN(num) || num <= 0) return;

    setIsSubmittingNote(true);
    setNoteFeedback(null);

    const activeUserId = (typeof window !== 'undefined' ? sessionStorage.getItem('current_user_id') : null) || 'usr_demo_123';
    const chosenWallet = wallets.find((w) => w.id === noteWalletId) || wallets[0];
    const chosenCat = categories.find((c) => c.id === noteCategoryId) || categories[0];

    const isoDate = new Date(`${noteDate}T12:00:00Z`).toISOString();

    const payload = {
      user_id: activeUserId,
      wallet_id: chosenWallet?.id || 'wal_demo_1',
      wallet_name: chosenWallet?.name || 'Dompet Utama',
      category_id: chosenCat?.id,
      category_name: chosenCat?.name || (noteType === 'expense' ? 'Pengeluaran Lainnya' : 'Pemasukan Lainnya'),
      category_emoji: chosenCat?.emoji || (noteType === 'expense' ? '💸' : '💰'),
      type: noteType,
      amount: num,
      notes: noteTitle.trim() || `Catatan tanggal ${noteDate}`,
      source: 'web' as const,
      transaction_date: isoDate,
    };

    try {
      await insertTransaction(activeUserId, payload);
      setNoteFeedback('✅ Catatan transaksi berhasil disimpan ke kalender!');
      await loadData();
      setTimeout(() => {
        setIsNoteModalOpen(false);
        setIsSubmittingNote(false);
        setNoteFeedback(null);
      }, 1000);
    } catch (err: any) {
      setIsSubmittingNote(false);
      setNoteFeedback('Gagal menyimpan: ' + (err.message || 'Error'));
    }
  };

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    setSelectedDateStr(`${y}-${m}-${d}`);
  };

  // Generate calendar days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sun
  // Convert so Monday is 0: (day + 6) % 7
  const startOffset = (firstDayOfMonth + 6) % 7;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Aggregate transactions by date (YYYY-MM-DD)
  const txByDate = new Map<string, { income: number; expense: number; count: number; items: Transaction[] }>();
  let monthTotalIncome = 0;
  let monthTotalExpense = 0;

  transactions.forEach((tx) => {
    const d = new Date(tx.transaction_date);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
      if (tx.type === 'income') monthTotalIncome += tx.amount;
      if (tx.type === 'expense') monthTotalExpense += tx.amount;
    }

    const cur = txByDate.get(dateKey) || { income: 0, expense: 0, count: 0, items: [] };
    if (tx.type === 'income') cur.income += tx.amount;
    if (tx.type === 'expense') cur.expense += tx.amount;
    cur.count += 1;
    cur.items.push(tx);
    txByDate.set(dateKey, cur);
  });

  const selectedDayData = txByDate.get(selectedDateStr);
  const selectedDayTransactions = selectedDayData?.items || [];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <Header
        title="Kalender Keuangan (WIB)"
        subtitle="Visualisasikan arus kas masuk dan keluar harian dalam format kalender interaktif"
      />

      {/* Top Controls & Month Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Month Navigator */}
        <Card className="p-4 flex items-center justify-between border-slate-200">
          <Button variant="ghost" size="sm" onClick={handlePrevMonth}>
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </Button>
          <div className="text-center">
            <h2 className="text-base font-extrabold text-slate-900">
              {monthNames[currentMonth]} {currentYear}
            </h2>
            <button
              onClick={handleCurrentMonth}
              className="text-[11px] text-brand-600 hover:underline font-semibold mt-0.5 inline-block"
            >
              Kembali ke Hari Ini
            </button>
          </div>
          <Button variant="ghost" size="sm" onClick={handleNextMonth}>
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </Button>
        </Card>

        {/* Month Cashflow Stats */}
        <Card className="p-4 col-span-1 lg:col-span-2 border-slate-200 flex flex-wrap items-center justify-around gap-4 bg-gradient-to-r from-blue-50/50 via-white to-indigo-50/40">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
              Pemasukan Bulan Ini
            </span>
            <div className="flex items-center gap-1.5 text-emerald-600 font-extrabold text-lg mt-0.5">
              <TrendingUp className="w-4 h-4" />
              <span>{formatRupiah(monthTotalIncome)}</span>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden sm:block" />
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
              Pengeluaran Bulan Ini
            </span>
            <div className="flex items-center gap-1.5 text-brand-600 font-extrabold text-lg mt-0.5">
              <TrendingDown className="w-4 h-4" />
              <span>{formatRupiah(monthTotalExpense)}</span>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden sm:block" />
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
              Net Cashflow
            </span>
            <div
              className={`font-black text-lg mt-0.5 ${
                monthTotalIncome >= monthTotalExpense ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {monthTotalIncome >= monthTotalExpense ? '+' : ''}
              {formatRupiah(monthTotalIncome - monthTotalExpense)}
            </div>
          </div>
        </Card>
      </div>

      {/* Main Grid: Calendar (Left 2 cols) + Selected Date Details (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Calendar View */}
        <Card className="lg:col-span-2 p-5 border-slate-200/90 shadow-sm">
          {/* Day of Week Header */}
          <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
            <div>Sen</div>
            <div>Sel</div>
            <div>Rab</div>
            <div>Kam</div>
            <div>Jum</div>
            <div className="text-brand-600">Sab</div>
            <div className="text-rose-600">Min</div>
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-2">
            {/* Empty slots before first day */}
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[72px] sm:min-h-[88px] rounded-xl bg-slate-50/50 border border-transparent" />
            ))}

            {/* Days in month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayData = txByDate.get(dateKey);
              const isSelected = selectedDateStr === dateKey;

              const todayStr = (() => {
                const now = new Date();
                return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
              })();
              const isToday = todayStr === dateKey;

              return (
                <div
                  key={dateKey}
                  onClick={() => setSelectedDateStr(dateKey)}
                  className={`min-h-[72px] sm:min-h-[88px] p-2 rounded-xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-brand-500 bg-blue-50/60 ring-2 ring-brand-400/40 shadow-sm'
                      : isToday
                      ? 'border-brand-300 bg-blue-50/30 hover:border-brand-400'
                      : 'border-slate-100 hover:border-slate-300 bg-white hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday
                          ? 'bg-brand-500 text-white font-black'
                          : isSelected
                          ? 'bg-blue-100 text-brand-900 font-extrabold'
                          : 'text-slate-700'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {dayData && dayData.count > 0 && (
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1 py-0.2 rounded font-mono font-medium">
                        {dayData.count}tx
                      </span>
                    )}
                  </div>

                  {/* Day Badges */}
                  <div className="space-y-1 mt-1 text-[10px] font-semibold leading-tight">
                    {dayData && dayData.income > 0 && (
                      <div className="truncate text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100">
                        +{formatRupiah(dayData.income)}
                      </div>
                    )}
                    {dayData && dayData.expense > 0 && (
                      <div className="truncate text-brand-700 bg-blue-50 px-1 py-0.5 rounded border border-blue-200/60">
                        -{formatRupiah(dayData.expense)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Selected Date Details Panel */}
        <Card className="p-5 border-slate-200 shadow-sm sticky top-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-brand-600 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-full">
                Rincian Tanggal
              </span>
              <h3 className="text-base font-extrabold text-slate-900 mt-1">
                {selectedDateStr || 'Pilih Tanggal'}
              </h3>
            </div>
            <Button
              onClick={() => handleOpenNoteModal(selectedDateStr)}
              variant="primary"
              size="sm"
              className="gap-1 text-xs shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Catat Transaksi</span>
            </Button>
          </div>

          {/* Daily Totals */}
          {selectedDayData && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <span className="text-[10px] font-bold text-emerald-600 uppercase">Masuk</span>
                <p className="text-sm font-black text-emerald-700">
                  {formatRupiah(selectedDayData.income)}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100">
                <span className="text-[10px] font-bold text-brand-600 uppercase">Keluar</span>
                <p className="text-sm font-black text-brand-700">
                  {formatRupiah(selectedDayData.expense)}
                </p>
              </div>
            </div>
          )}

          {/* List Transactions on Date */}
          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {selectedDayTransactions.length === 0 ? (
              <div className="text-center py-10 px-4">
                <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">Tidak ada transaksi</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Belum ada catatan mutasi keuangan pada tanggal ini.
                </p>
                <Button
                  onClick={() => handleOpenNoteModal(selectedDateStr)}
                  variant="outline"
                  size="sm"
                  className="mt-3 text-xs gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-brand-500" />
                  <span>Catat Catatan / Transaksi Pertama</span>
                </Button>
              </div>
            ) : (
              selectedDayTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-blue-200 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl shrink-0">{tx.category_emoji || '💰'}</span>
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {tx.notes || tx.category_name}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span>👛 {tx.wallet_name || 'Dompet'}</span>
                        <span>•</span>
                        <span>{formatShortWIB(tx.transaction_date)}</span>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`text-xs font-black shrink-0 ${
                      tx.type === 'income' ? 'text-emerald-600' : 'text-brand-600'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {formatRupiah(tx.amount)}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Note Form Modal per specification */}
      <Modal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        title="Catat Transaksi & Catatan Keuangan"
        description="Form pencatatan keuangan yang terintegrasi otomatis dengan kalender"
      >
        <form onSubmit={handleSaveNote} className="space-y-4 text-xs p-1">
          {/* Tanggal ter-set otomatis */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Tanggal Transaksi (Otomatis Terisi Sesuai Pilihan Kalender)
            </label>
            <input
              type="date"
              value={noteDate}
              onChange={(e) => setNoteDate(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-500 font-medium"
            />
          </div>

          {/* Type Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Jenis Transaksi
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setNoteType('expense')}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  noteType === 'expense'
                    ? 'bg-brand-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pengeluaran
              </button>
              <button
                type="button"
                onClick={() => setNoteType('income')}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  noteType === 'income'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pemasukan
              </button>
            </div>
          </div>

          {/* Nominal */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Nominal (Rp)
            </label>
            <input
              type="number"
              placeholder="contoh: 25000"
              value={noteAmount}
              onChange={(e) => setNoteAmount(e.target.value)}
              required
              min={1}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Judul / Catatan (Note) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Catatan / Keperluan (Note)
            </label>
            <input
              type="text"
              placeholder="contoh: Makan siang soto, beli bensin, fee project..."
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Pilihan Dompet & Kategori */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Sumber Dompet
              </label>
              <select
                value={noteWalletId}
                onChange={(e) => setNoteWalletId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-500"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({formatRupiah(w.balance)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Kategori
              </label>
              <select
                value={noteCategoryId}
                onChange={(e) => setNoteCategoryId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Feedback Message */}
          {noteFeedback && (
            <div
              className={`p-3 rounded-xl text-xs font-bold ${
                noteFeedback.includes('✅')
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {noteFeedback}
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsNoteModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmittingNote}
            >
              Simpan ke Kalender
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
