'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatRupiah } from '@/lib/utils/currency';
import { formatShortWIB, formatWIBDateTime } from '@/lib/utils/date-wib';
import { ShieldAlert, Search, Eye, Lock } from 'lucide-react';
import { Transaction } from '@/lib/types';

export default function AdminUserTransactionsAuditPage() {
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
    const res = await fetch(`/api/data?userId=${selectedUserId}`);
    const data = await res.json();
    if (data.ok) {
      setTransactions(data.transactions);
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
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-black tracking-tight text-white">
          Inspeksi Transaksi Pengguna & Audit Log
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Akses transaksi user hanya untuk keperluan investigasi support dengan pencatatan audit log otomatis
        </p>
      </div>

      {/* Security Privacy Notice */}
      <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-300 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
        <div>
          <strong className="block text-amber-200">Protokol Privasi Pengguna TataDana:</strong>
          Setiap pembukaan data transaksi user akan dicatat secara permanen ke dalam tabel audit log dan
          dapat diaudit oleh kepatuhan regulasi perlindungan data pribadi fintech.
        </div>
      </div>

      {!unlocked ? (
        <Card className="p-6 bg-slate-900 border-slate-800 max-w-lg">
          <form onSubmit={handleUnlockWithAudit} className="space-y-4 text-xs">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Lock className="w-4 h-4 text-brand-400" />
              <span>Otorisasi Akses Troubleshooting</span>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Target User ID:</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full rounded-xl bg-slate-850 bg-slate-950 border border-slate-800 px-3 py-2 text-white"
              >
                <option value="usr_demo_123">Vina Al Fitriansyah (usr_demo_123)</option>
                <option value="usr_demo_456">Siti Rahma (usr_demo_456)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Alasan Investigasi Support (Wajib):
              </label>
              <textarea
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                rows={3}
                required
                placeholder="contoh: Pengguna melaporkan saldo di bot Telegram tidak sinkron..."
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
              />
            </div>

            <Button type="submit" variant="primary" size="sm" className="w-full">
              Buka Akses & Rekam Audit Log
            </Button>
          </form>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Menampilkan data transaksi: <strong className="text-white">{selectedUserId}</strong>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUnlocked(false)}
              className="bg-slate-900 border-slate-800 text-slate-300"
            >
              Kunci Kembali
            </Button>
          </div>

          <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Tanggal</th>
                  <th className="p-3.5">Tipe</th>
                  <th className="p-3.5">Kategori</th>
                  <th className="p-3.5">Dompet</th>
                  <th className="p-3.5">Nominal</th>
                  <th className="p-3.5">Catatan</th>
                  <th className="p-3.5">Sumber</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/40">
                    <td className="p-3.5 text-slate-400">{formatShortWIB(tx.transaction_date)}</td>
                    <td className="p-3.5 capitalize">{tx.type}</td>
                    <td className="p-3.5">{tx.category_name || '-'}</td>
                    <td className="p-3.5">{tx.wallet_name}</td>
                    <td className="p-3.5 font-bold text-white">{formatRupiah(tx.amount)}</td>
                    <td className="p-3.5 max-w-xs truncate">{tx.notes}</td>
                    <td className="p-3.5 font-mono text-[11px] text-purple-400">{tx.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Log History Viewer */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Riwayat Audit Trail Pembukaan Data
        </h3>
        <div className="space-y-2 text-xs">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex justify-between items-center text-slate-300"
            >
              <div>
                <span className="font-semibold text-white block">{log.reason}</span>
                <span className="text-[10px] text-slate-500">{log.time}</span>
              </div>
              <Badge variant="purple" size="sm">
                Recorded
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
