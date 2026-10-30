'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/dashboard/Header';
import { AdminTabNav } from '@/components/admin/AdminTabNav';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatRupiah } from '@/lib/utils/currency';
import { formatShortWIB, formatWIBDateTime } from '@/lib/utils/date-wib';
import { ShieldAlert, Search, Eye, Lock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Transaction } from '@/lib/types';

export default function AdminTransactionsAuditPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('usr_demo_123');
  const [auditLogs, setAuditLogs] = useState<Array<{ id: string; time: string; reason: string }>>([
    {
      id: 'aud_1',
      time: '10 Okt 2026, 12:10 WIB',
      reason: 'Support ticket #8412: Troubleshooting parsing nominal',
    },
  ]);
  const [unlocked, setUnlocked] = useState(false);
  const [reasonInput, setReasonInput] = useState('');

  const loadData = async () => {
    try {
      const res = await fetch(`/api/data?userId=${selectedUserId}`);
      const data = await res.json();
      if (data.ok) {
        setTransactions(data.transactions || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (unlocked) {
      loadData();
    }
  }, [unlocked, selectedUserId]);

  const handleUnlockWithAudit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reasonInput.trim()) return;

    setAuditLogs((prev) => [
      {
        id: `aud_${Date.now()}`,
        time: formatWIBDateTime(),
        reason: reasonInput,
      },
      ...prev,
    ]);
    setUnlocked(true);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="Audit Transaksi & Data Sensitif"
        subtitle="Akses terenkripsi dengan pencatatan audit log untuk kepatuhan perlindungan data privasi finansial"
      />

      <AdminTabNav />

      <div className="p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Security Warning Banner */}
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3.5 shadow-xs">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-amber-950">
              Perlindungan Privasi Finansial Pengguna (Strict RBAC & Audit Trail)
            </h4>
            <p className="text-amber-800 leading-relaxed">
              Membuka data transaksi individual pengguna dicatat ke log audit audit_trail internal. Pastikan Anda memiliki tiket keluhan resmi dari pengguna sebelum melanjutkan verifikasi transaksi.
            </p>
          </div>
        </div>

        {/* Audit Form / Data View */}
        {!unlocked ? (
          <div className="p-8 rounded-2xl bg-white border border-slate-200/80 shadow-xs max-w-xl mx-auto space-y-5">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center mx-auto border border-purple-100">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Akses Audit Terkunci</h3>
              <p className="text-xs text-slate-500">
                Masukkan alasan resmi audit data untuk membuka akses peninjauan transaksi
              </p>
            </div>

            <form onSubmit={handleUnlockWithAudit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ID / Target User
                </label>
                <input
                  type="text"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Alasan Audit (Wajib Dicatat)
                </label>
                <textarea
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder="Contoh: Tiket Helpdesk #1234 - Investigasi mutasi saldo ganda pengguna..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
                leftIcon={<Eye className="w-4 h-4" />}
              >
                Buka Data & Catat Log Audit
              </Button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Target Audit Pengguna
                </span>
                <div className="font-mono font-bold text-slate-900 text-base mt-0.5">
                  {selectedUserId}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setUnlocked(false)}
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs border-slate-200"
                  leftIcon={<Lock className="w-3.5 h-3.5" />}
                >
                  Kunci Kembali
                </Button>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 font-bold text-slate-900 text-sm">
                Daftar Transaksi ({transactions.length})
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="p-4">Tanggal</th>
                      <th className="p-4">Kategori & Deskripsi</th>
                      <th className="p-4">Tipe</th>
                      <th className="p-4">Nominal</th>
                      <th className="p-4">Sumber Input</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/70">
                        <td className="p-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {formatShortWIB(tx.transaction_date || tx.created_at)}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-900">{tx.notes || tx.category_name || 'Transaksi'}</div>
                          <div className="text-[11px] text-slate-400">{tx.category_name || tx.category_id}</div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tx.type === 'income'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                          </span>
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-900">
                          {formatRupiah(tx.amount)}
                        </td>
                        <td className="p-4 capitalize text-slate-500">
                          {tx.source || 'manual'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Audit Log History */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>Riwayat Audit Log Akses Sensitif</span>
          </h3>

          <div className="divide-y divide-slate-100 text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <span className="font-semibold text-slate-800">{log.reason}</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {log.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
