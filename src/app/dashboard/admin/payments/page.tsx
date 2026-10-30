'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/dashboard/Header';
import { AdminTabNav } from '@/components/admin/AdminTabNav';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { formatRupiah } from '@/lib/utils/currency';
import { formatShortWIB, formatWIBDateTime } from '@/lib/utils/date-wib';
import { 
  Check, 
  X, 
  Eye, 
  CreditCard, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  PlusCircle, 
  RefreshCw,
  Search,
  AlertCircle
} from 'lucide-react';
import { PaymentRecord } from '@/lib/types';

type PaymentFilterTab = 'all' | 'pending' | 'success' | 'rejected';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<PaymentFilterTab>('all');
  const [search, setSearch] = useState('');
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/data?userId=usr_admin_999');
      const data = await res.json();
      if (data.ok && data.payments) {
        setPayments(data.payments);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
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
            userName: 'Budi Santoso',
            plan: 'pro',
            amount: 99000,
            method: 'manual_transfer',
          },
          userId: 'usr_admin_999',
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setActionFeedback('Simulasi pembayaran transfer manual Rp99.000 berhasil dibuat untuk testing approval!');
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
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.id.toLowerCase().includes(q) ||
      (p.user_name || '').toLowerCase().includes(q) ||
      (p.user_id && p.user_id.toLowerCase().includes(q))
    );
  });

  const pendingCount = payments.filter((p) => p.status === 'pending').length;
  const successCount = payments.filter((p) => p.status === 'success').length;
  const rejectedCount = payments.filter((p) => p.status === 'rejected').length;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="Persetujuan Pembayaran & Paket Pro"
        subtitle="Validasi bukti transfer manual, konfirmasi aktivasi paket langganan Pro pengguna"
      />

      <AdminTabNav counts={{ pendingPayments: pendingCount }} />

      <div className="p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Feedback Alert */}
        {actionFeedback && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionFeedback}</span>
            </div>
            <button
              onClick={() => setActionFeedback(null)}
              className="text-emerald-600 hover:text-emerald-900 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Top Summary & Actions Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Antrean Verifikasi Pembayaran Pro
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  {pendingCount} Menunggu Konfirmasi
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Persetujuan langsung mengaktifkan fitur PRO (AI Bot tanpa batas, Multi-Wallet, dsb.) pada akun user.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              onClick={handleCreateSimulation}
              disabled={isSimulating}
              size="sm"
              variant="outline"
              className="border-slate-200 hover:bg-slate-50 text-slate-700 text-xs rounded-xl"
              leftIcon={<PlusCircle className="w-3.5 h-3.5 text-brand-600" />}
            >
              Simulasi Transfer Masuk
            </Button>
            <Button
              onClick={loadPayments}
              disabled={loading}
              variant="outline"
              size="sm"
              className="border-slate-200 hover:bg-slate-50 text-slate-700 text-xs rounded-xl"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />}
            >
              Segarkan
            </Button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filterTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({payments.length})
            </button>
            <button
              onClick={() => setFilterTab('pending')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filterTab === 'pending'
                  ? 'bg-white text-amber-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setFilterTab('success')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filterTab === 'success'
                  ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Berhasil ({successCount})
            </button>
            <button
              onClick={() => setFilterTab('rejected')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filterTab === 'rejected'
                  ? 'bg-white text-rose-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ditolak ({rejectedCount})
            </button>
          </div>

          {/* Search Input */}
          <div className="w-full sm:w-72">
            <Input
              placeholder="Cari ID transaksi, nama pengguna..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              className="bg-white border-slate-200 text-slate-800 placeholder-slate-400 text-xs rounded-xl"
            />
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2 text-purple-600" />
              <span>Memuat data transaksi pembayaran...</span>
            </div>
          ) : filteredPayments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-4">Pengguna</th>
                    <th className="p-4">Paket & Nominal</th>
                    <th className="p-4">Metode Bayar</th>
                    <th className="p-4">Waktu Transaksi</th>
                    <th className="p-4">Bukti Transfer</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Aksi Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-900 text-sm">{p.user_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">ID: {p.id}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                          <span>{formatRupiah(p.amount)}</span>
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {p.plan.toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                          <span className="capitalize">{(p.payment_method || 'transfer').replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-500 text-[11px]">
                        {formatShortWIB(p.created_at)}
                      </td>
                      <td className="p-4">
                        {p.manual_receipt_url ? (
                          <button
                            onClick={() => setViewingReceipt(p.manual_receipt_url!)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Lihat Bukti</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Tanpa Lampiran</span>
                        )}
                      </td>
                      <td className="p-4">
                        {p.status === 'success' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Berhasil</span>
                          </span>
                        ) : p.status === 'rejected' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <X className="w-3.5 h-3.5 text-rose-600" />
                            <span>Ditolak</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {p.status === 'pending' ? (
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <Button
                              onClick={() => handleAction(p.id, 'approve_payment')}
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs py-1 px-2.5 shadow-xs"
                              leftIcon={<Check className="w-3.5 h-3.5" />}
                            >
                              Setujui
                            </Button>
                            <Button
                              onClick={() => handleAction(p.id, 'reject_payment')}
                              size="sm"
                              variant="outline"
                              className="border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs py-1 px-2.5"
                              leftIcon={<X className="w-3.5 h-3.5" />}
                            >
                              Tolak
                            </Button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Selesai</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="font-bold text-slate-800 text-sm">
                Tidak ada data pembayaran dengan filter {filterTab}.
              </p>
              <p className="text-slate-500 text-xs">
                Klik tombol "Simulasi Transfer Masuk" di atas untuk membuat contoh pembayaran uji coba.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Bukti Transfer */}
      {viewingReceipt && (
        <Modal
          isOpen={true}
          onClose={() => setViewingReceipt(null)}
          title="Bukti Transfer Pengguna"
        >
          <div className="space-y-4">
            <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2 flex items-center justify-center">
              <img
                src={viewingReceipt}
                alt="Bukti Transfer"
                className="max-h-80 object-contain rounded-lg shadow-sm"
              />
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingReceipt(null)}
                className="rounded-xl"
              >
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
