'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { formatRupiah } from '@/lib/utils/currency';
import { formatShortWIB } from '@/lib/utils/date-wib';
import { 
  Check, 
  X, 
  Eye, 
  CreditCard, 
  ExternalLink, 
  Search, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  PlusCircle,
  RotateCcw
} from 'lucide-react';
import { PaymentRecord } from '@/lib/types';

type PaymentFilterTab = 'all' | 'pending' | 'success' | 'rejected';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [filterTab, setFilterTab] = useState<PaymentFilterTab>('all');
  const [search, setSearch] = useState('');
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const loadPayments = async () => {
    try {
      const res = await fetch('/api/data?userId=usr_admin_999');
      const data = await res.json();
      if (data.ok && data.payments) {
        setPayments(data.payments);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const handleAction = async (paymentId: string, action: 'approve_payment' | 'reject_payment') => {
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          payload: { paymentId },
          userId: 'usr_admin_999',
        }),
      });
      const data = await res.json();
      if (data.ok) {
        const msg = action === 'approve_payment' 
          ? 'Pembayaran berhasil disetujui! Pengguna otomatis di-upgrade ke Paket Pro.' 
          : 'Pembayaran telah ditolak.';
        setActionFeedback(msg);
        setTimeout(() => setActionFeedback(null), 4000);
        loadPayments();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateSimulation = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_payment_simulation',
          payload: {
            targetUserId: 'usr_demo_123',
            userName: 'Vina Al Fitriansyah',
            plan: 'pro',
            amount: 99000,
            method: 'manual_transfer',
          },
          userId: 'usr_admin_999',
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setActionFeedback('Simulasi pembayaran manual Rp99.000 berhasil dibuat untuk pengujian approval admin!');
        setTimeout(() => setActionFeedback(null), 4000);
        loadPayments();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSimulating(false);
    }
  };

  const filteredPayments = payments.filter((p) => {
    if (filterTab !== 'all' && p.status !== filterTab) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (p.user_name || '').toLowerCase().includes(q) ||
      p.user_id.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      p.plan.toLowerCase().includes(q)
    );
  });

  const totalOmset = payments
    .filter((p) => p.status === 'success')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingCount = payments.filter((p) => p.status === 'pending').length;
  const approvedCount = payments.filter((p) => p.status === 'success').length;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-brand-500" />
            <span>Persetujuan Pembayaran (Approved Admin)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Verifikasi transfer manual Midtrans/Bank, setujui upgrade paket Pro secara instan, dan pantau bukti slip
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleCreateSimulation}
            disabled={isSimulating}
            variant="outline"
            size="sm"
            className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
            leftIcon={<PlusCircle className="w-4 h-4 text-brand-400" />}
          >
            {isSimulating ? 'Membuat...' : '+ Tes Pembayaran Masuk'}
          </Button>
          <Button
            onClick={loadPayments}
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {actionFeedback && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Total Omset Diterima
          </span>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {formatRupiah(totalOmset)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Dari transaksi paket yang disetujui</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Menunggu Approval
          </span>
          <div className="text-2xl font-black text-amber-400 mt-1">
            {pendingCount} Transaksi
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Perlu tindakan review admin</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Berhasil Di-Approve
          </span>
          <div className="text-2xl font-black text-white mt-1">
            {approvedCount} Pengguna
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Langsung aktif paket Pro</p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterTab === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Semua ({payments.length})
          </button>
          <button
            onClick={() => setFilterTab('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              filterTab === 'pending'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Menunggu ({pendingCount})</span>
          </button>
          <button
            onClick={() => setFilterTab('success')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              filterTab === 'success'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Check className="w-3 h-3" />
            <span>Disetujui ({approvedCount})</span>
          </button>
          <button
            onClick={() => setFilterTab('rejected')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterTab === 'rejected'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Ditolak
          </button>
        </div>

        <div className="w-full sm:w-72">
          <Input
            placeholder="Cari user, ID pembayaran..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-500" />}
            className="bg-slate-900 border-slate-800 text-white placeholder-slate-500"
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="p-3.5">ID & Waktu</th>
                <th className="p-3.5">Pengguna</th>
                <th className="p-3.5">Paket Target</th>
                <th className="p-3.5">Nominal</th>
                <th className="p-3.5">Metode Bayar</th>
                <th className="p-3.5">Bukti Transfer</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Aksi Persetujuan Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredPayments.map((p) => {
                const isPending = p.status === 'pending';

                return (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-mono text-slate-400">
                      <div className="font-semibold text-slate-300">{p.id}</div>
                      <div className="text-[10px] text-slate-500">{formatShortWIB(p.created_at)}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-white">{p.user_name || p.user_id}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{p.user_id}</div>
                    </td>
                    <td className="p-3.5">
                      <Badge variant={p.plan === 'pro' ? 'brand' : 'gray'} size="sm">
                        {p.plan.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-3.5 font-black text-white text-sm">{formatRupiah(p.amount)}</td>
                    <td className="p-3.5 capitalize font-medium">
                      {p.payment_method === 'manual_transfer' ? 'Transfer Bank Manual' : 'Midtrans Snap'}
                    </td>
                    <td className="p-3.5">
                      {p.manual_receipt_url ? (
                        <button
                          onClick={() => setViewingReceipt(p.manual_receipt_url!)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-brand-400 font-semibold inline-flex items-center gap-1.5 transition-colors border border-slate-700"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat Slip</span>
                        </button>
                      ) : (
                        <span className="text-slate-600 font-mono">Gateway Otomatis</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <Badge
                        variant={
                          p.status === 'success' ? 'green' : p.status === 'pending' ? 'blue' : 'red'
                        }
                        size="sm"
                      >
                        {p.status === 'success' ? 'DISETUJUI' : p.status === 'pending' ? 'MENUNGGU' : 'DITOLAK'}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-right">
                      {isPending ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleAction(p.id, 'approve_payment')}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition-all hover:scale-105"
                            title="Setujui dan Langsung Upgrade ke Pro"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Setujui & Pro</span>
                          </button>
                          <button
                            onClick={() => handleAction(p.id, 'reject_payment')}
                            className="p-1.5 rounded-xl bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 border border-rose-500/30 transition-colors"
                            title="Tolak Pembayaran"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px] font-medium">
                          {p.status === 'success' ? '✓ Telah Di-upgrade' : '✗ Ditolak'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slip Modal */}
      <Modal
        isOpen={Boolean(viewingReceipt)}
        onClose={() => setViewingReceipt(null)}
        title="Bukti Transfer Pembayaran Manual"
        description="Verifikasi kesesuaian nominal dan nomor rekening pengirim"
      >
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden border border-slate-200 max-h-96 flex items-center justify-center bg-slate-900">
            {viewingReceipt && (
              <img
                src={viewingReceipt}
                alt="Bukti Transfer"
                className="max-h-96 w-auto object-contain"
              />
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setViewingReceipt(null)}>
              Tutup
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
