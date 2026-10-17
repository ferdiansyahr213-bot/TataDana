'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/dashboard/Header';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { formatRupiah } from '@/lib/utils/currency';
import { formatWIBDateTime, formatShortWIB } from '@/lib/utils/date-wib';
import { 
  FileSpreadsheet, 
  FileText, 
  Download, 
  ArrowUpDown, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  History, 
  Filter, 
  Sparkles,
  Calendar
} from 'lucide-react';
import { Transaction, Wallet, Category, ExportRecord, UserProfile } from '@/lib/types';
import { 
  getCurrentUserProfile, 
  fetchUserTransactions, 
  fetchUserWallets, 
  fetchUserCategories, 
  subscribeToTransactions 
} from '@/lib/supabase/data-service';

export default function ReportsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [exports, setExports] = useState<ExportRecord[]>([]);

  // Filters & sorting
  const [searchNotes, setSearchNotes] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterWallet, setFilterWallet] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortField, setSortField] = useState<'date' | 'amount' | 'category' | 'wallet'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [expandedTxIds, setExpandedTxIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const paramId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('impersonate') || new URLSearchParams(window.location.search).get('userId') || sessionStorage.getItem('current_user_id') : null;
      const activeUser = await getCurrentUserProfile(paramId);
      setUser(activeUser);

      // Fetch transaksi, wallets, dan kategori langsung dari Supabase
      const [txs, wls, cats] = await Promise.all([
        fetchUserTransactions(activeUser.id),
        fetchUserWallets(activeUser.id),
        fetchUserCategories(activeUser.id),
      ]);

      setTransactions(txs);
      setWallets(wls);
      setCategories(cats);

      // Sinkronkan riwayat ekspor
      const res = await fetch(`/api/data?userId=${encodeURIComponent(activeUser.id)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.exports)) {
          setExports(data.exports);
        }
      }
    } catch (e) {
      console.error('loadData reports error:', e);
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

  const handleSort = (field: 'date' | 'amount' | 'category' | 'wallet') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Filtered & Sorted Trans
  const processedTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        if (filterType !== 'all' && t.type !== filterType) return false;
        if (filterWallet !== 'all' && t.wallet_id !== filterWallet) return false;
        if (filterCategory !== 'all' && t.category_id !== filterCategory) return false;
        if (searchNotes) {
          const q = searchNotes.toLowerCase();
          const matchNote = (t.notes || '').toLowerCase().includes(q);
          const matchCat = (t.category_name || '').toLowerCase().includes(q);
          const matchMerc = (t.merchant_name || '').toLowerCase().includes(q);
          if (!matchNote && !matchCat && !matchMerc) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === 'date') {
          diff = new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime();
        } else if (sortField === 'amount') {
          diff = b.amount - a.amount;
        } else if (sortField === 'category') {
          diff = (a.category_name || '').localeCompare(b.category_name || '');
        } else if (sortField === 'wallet') {
          diff = (a.wallet_name || '').localeCompare(b.wallet_name || '');
        }
        return sortOrder === 'asc' ? -diff : diff;
      });
  }, [transactions, filterType, filterWallet, filterCategory, searchNotes, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(processedTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = processedTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Summary Metrics
  const totalIncome = processedTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = processedTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netCashflow = totalIncome - totalExpense;

  // Top 5 Expense Categories
  const categoryMap: { [name: string]: { name: string; amount: number; emoji?: string } } = {};
  processedTransactions.forEach((t) => {
    if (t.type === 'expense') {
      const cName = t.category_name || 'Lainnya';
      if (!categoryMap[cName]) {
        categoryMap[cName] = { name: cName, amount: 0, emoji: t.category_emoji || '📦' };
      }
      categoryMap[cName].amount += t.amount;
    }
  });

  const top5Categories = Object.values(categoryMap)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Export Trigger
  const handleExport = async (fileType: 'pdf' | 'excel') => {
    setIsExporting(true);
    setExportMessage(null);
    try {
      const res = await fetch('/api/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileType,
          periodRange: 'Bulan Berjalan & Filter Aktif',
          userId: user?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.isRestricted) {
          setExportMessage('⚠️ Fitur export khusus paket Pro. Upgrade akun untuk mendownload PDF/Excel.');
        } else {
          setExportMessage(`Gagal export: ${data.error}`);
        }
      } else {
        setExportMessage(`✅ Laporan ${fileType.toUpperCase()} berhasil dibuat!`);
        // Trigger download
        window.open(data.downloadUrl, '_blank');
        loadData();
      }
    } catch (e: any) {
      setExportMessage(`Error export: ${e.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <Header
        title="Laporan & Ekspor Keuangan"
        subtitle="Analisis arus kas mendalam, tabel sortable, dan export resmi PDF / Excel"
      />

      {exportMessage && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs font-semibold text-brand-800 flex items-center justify-between">
          <span>{exportMessage}</span>
          <button onClick={() => setExportMessage(null)} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Total Pemasukan
          </span>
          <div className="text-xl font-black text-emerald-600 mt-1">
            {formatRupiah(totalIncome)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Sesuai data terfilter</p>
        </Card>

        <Card className="p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Total Pengeluaran
          </span>
          <div className="text-xl font-black text-rose-600 mt-1">
            {formatRupiah(totalExpense)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Sesuai data terfilter</p>
        </Card>

        <Card className="p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Net Cashflow
          </span>
          <div
            className={`text-xl font-black mt-1 ${
              netCashflow >= 0 ? 'text-brand-600' : 'text-rose-600'
            }`}
          >
            {formatRupiah(netCashflow)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {netCashflow >= 0 ? 'Surplus keuangan' : 'Defisit keuangan'}
          </p>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-blue-50/60 to-indigo-50/30 border-blue-200/80">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-700">
              Download Laporan
            </span>
            <Sparkles className="w-4 h-4 text-brand-500" />
          </div>
          <div className="flex gap-2 mt-2">
            <Button
              onClick={() => handleExport('pdf')}
              isLoading={isExporting}
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              leftIcon={<FileText className="w-3.5 h-3.5 text-rose-500" />}
            >
              PDF
            </Button>
            <Button
              onClick={() => handleExport('excel')}
              isLoading={isExporting}
              variant="primary"
              size="sm"
              className="flex-1 text-xs"
              leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-white" />}
            >
              Excel
            </Button>
          </div>
        </Card>
      </div>

      {/* Top 5 Categories & Filter Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 5 Categories Widget */}
        <Card className="p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
            Top 5 Kategori Pengeluaran
          </h3>
          <div className="space-y-2.5">
            {top5Categories.length === 0 ? (
              <p className="text-xs text-slate-400">Belum ada pengeluaran</p>
            ) : (
              top5Categories.map((c, idx) => {
                const percent = totalExpense > 0 ? Math.round((c.amount / totalExpense) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1 text-xs">
                    <div className="flex justify-between items-center text-slate-700 font-medium">
                      <span>
                        {c.emoji} {c.name}
                      </span>
                      <span className="font-bold text-slate-900">{formatRupiah(c.amount)}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-brand-500 h-1.5 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Filter controls */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
            Filter & Pencarian Laporan
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <Input
              placeholder="Cari catatan/toko..."
              leftIcon={<Search className="w-4 h-4" />}
              value={searchNotes}
              onChange={(e) => setSearchNotes(e.target.value)}
            />

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-xl border border-surface-border px-3 py-2 text-xs bg-white text-slate-700 focus:outline-none focus:border-brand-500"
            >
              <option value="all">Semua Jenis</option>
              <option value="expense">Pengeluaran</option>
              <option value="income">Pemasukan</option>
              <option value="transfer">Transfer</option>
            </select>

            <select
              value={filterWallet}
              onChange={(e) => setFilterWallet(e.target.value)}
              className="rounded-xl border border-surface-border px-3 py-2 text-xs bg-white text-slate-700 focus:outline-none focus:border-brand-500"
            >
              <option value="all">Semua Dompet</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded-xl border border-surface-border px-3 py-2 text-xs bg-white text-slate-700 focus:outline-none focus:border-brand-500"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>
          </div>
        </Card>
      </div>

      {/* Main Table with Pagination & Column Sorting */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Tabel Transaksi ({processedTransactions.length} baris)
          </span>
          <span className="text-[11px] text-slate-400">
            Halaman {currentPage} dari {totalPages}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th
                  className="p-3 cursor-pointer hover:text-brand-600 transition-colors"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    <span>Tanggal</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th>Jenis</th>
                <th
                  className="p-3 cursor-pointer hover:text-brand-600 transition-colors"
                  onClick={() => handleSort('category')}
                >
                  <div className="flex items-center gap-1">
                    <span>Kategori</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="p-3 cursor-pointer hover:text-brand-600 transition-colors"
                  onClick={() => handleSort('wallet')}
                >
                  <div className="flex items-center gap-1">
                    <span>Dompet</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="p-3 text-right cursor-pointer hover:text-brand-600 transition-colors"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Nominal</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-3">Catatan</th>
                <th className="p-3 text-center">Rincian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Tidak ada transaksi yang cocok
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx) => {
                  const isExpense = tx.type === 'expense';
                  const isTransfer = tx.type === 'transfer';
                  const hasItems = tx.items && tx.items.length > 0;
                  const isExpanded = expandedTxIds.has(tx.id);

                  return (
                    <React.Fragment key={tx.id}>
                      <tr className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 whitespace-nowrap text-slate-600">
                          {formatShortWIB(tx.transaction_date)}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={isExpense ? 'red' : isTransfer ? 'blue' : 'green'}
                            size="sm"
                          >
                            {isExpense ? 'Pengeluaran' : isTransfer ? 'Transfer' : 'Pemasukan'}
                          </Badge>
                        </td>
                        <td className="p-3 font-medium text-slate-800">
                          {tx.category_emoji} {tx.category_name || '-'}
                        </td>
                        <td className="p-3 text-slate-600">
                          {isTransfer ? `${tx.wallet_name} ➔ ${tx.destination_wallet_name}` : tx.wallet_name}
                        </td>
                        <td
                          className={`p-3 text-right font-black ${
                            isExpense
                              ? 'text-rose-600'
                              : isTransfer
                              ? 'text-blue-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {isExpense ? '-' : isTransfer ? '' : '+'}
                          {formatRupiah(tx.amount)}
                        </td>
                        <td className="p-3 text-slate-600 max-w-xs truncate">
                          {tx.notes || '-'}
                        </td>
                        <td className="p-3 text-center">
                          {hasItems ? (
                            <button
                              onClick={() => toggleExpand(tx.id)}
                              className="px-2 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1"
                            >
                              <span>{tx.items!.length} item</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      </tr>

                      {/* Expanded Struk items */}
                      {hasItems && isExpanded && (
                        <tr className="bg-slate-50/90">
                          <td colSpan={7} className="p-4 pl-12">
                            <div className="bg-white p-3 rounded-xl border border-slate-200">
                              <span className="font-bold text-slate-700 block mb-2">
                                Item Belanja Struk: {tx.merchant_name}
                              </span>
                              <div className="space-y-1">
                                {tx.items!.map((it, idx) => (
                                  <div
                                    key={idx}
                                    className="flex justify-between text-[11px] text-slate-600 py-1 border-b border-slate-100 last:border-none"
                                  >
                                    <span>
                                      {it.item_name} ({it.quantity}x @ {formatRupiah(it.price)})
                                    </span>
                                    <span className="font-semibold text-slate-900">
                                      {formatRupiah(it.price * it.quantity)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <Button
            size="sm"
            variant="outline"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            Sebelumnya
          </Button>

          <span className="text-xs text-slate-600 font-medium">
            Halaman {currentPage} dari {totalPages}
          </span>

          <Button
            size="sm"
            variant="outline"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            Berikutnya
          </Button>
        </div>
      </Card>

      {/* Saved Export History */}
      <Card className="p-6">
        <CardHeader className="p-0 pb-4 mb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-brand-500" />
            <h3 className="text-sm font-bold text-slate-900">Riwayat File Ekspor Tersimpan</h3>
          </div>
          <span className="text-[11px] text-slate-400">File tersimpan aman di Supabase Storage</span>
        </CardHeader>

        <div className="divide-y divide-slate-100">
          {exports.length === 0 ? (
            <p className="text-xs text-slate-400 py-3">Belum ada riwayat ekspor laporan</p>
          ) : (
            exports.map((exp) => (
              <div key={exp.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-xl ${
                      exp.file_type === 'pdf' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    {exp.file_type === 'pdf' ? <FileText className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{exp.file_name}</h4>
                    <p className="text-[11px] text-slate-400">
                      Periode: {exp.period_range} • Dibuat: {formatShortWIB(exp.created_at)}
                    </p>
                  </div>
                </div>

                <a
                  href={`/api/reports/download?id=${exp.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:text-brand-600 hover:border-brand-400 transition-colors font-medium"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Ulang</span>
                </a>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
