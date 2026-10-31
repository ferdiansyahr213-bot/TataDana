'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/dashboard/Header';
import { AdminTabNav } from '@/components/admin/AdminTabNav';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RefreshCw, 
  Search, 
  MessageCircle, 
  ExternalLink,
  Users,
  AlertCircle
} from 'lucide-react';
import { UserApproval } from '@/lib/types';
import { supabase, isLiveSupabaseConfigured } from '@/lib/supabase/client';
import { fetchUserApprovals } from '@/lib/supabase/data-service';
import { formatWIBDateTime } from '@/lib/utils/date-wib';
import { normalizeWaNumber } from '@/lib/utils/whatsapp';

export default function AdminApprovalsPage() {
  const [approvals, setApprovals] = useState<UserApproval[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterTab, setFilterTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [search, setSearch] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const loadApprovals = async () => {
    setLoading(true);
    try {
      if (isLiveSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('user_approvals')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          setApprovals(data);
          setLoading(false);
          return;
        }
      }
      const fallbackList = await fetchUserApprovals();
      setApprovals(fallbackList);
    } catch (err) {
      console.warn('Approvals fetch error:', err);
      const fallbackList = await fetchUserApprovals();
      setApprovals(fallbackList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, []);

  const handleUpdateStatus = async (item: UserApproval, newStatus: 'approved' | 'rejected') => {
    setIsUpdating(item.id);
    try {
      // 1. Direct update to Supabase if live
      if (isLiveSupabaseConfigured()) {
        await supabase
          .from('user_approvals')
          .update({ status: newStatus })
          .eq('id', item.id);
      }

      // 2. Synchronize to backend users system (SQLite & JSON)
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: newStatus === 'approved' ? 'approve_user' : 'reject_user',
          payload: { targetUserId: item.id, email: item.email },
          userId: 'usr_admin_999',
        }),
      });

      // Optimistic state update
      setApprovals((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, status: newStatus } : a))
      );

      setFeedback(
        newStatus === 'approved'
          ? `Pendaftaran ${item.full_name} (${item.email}) berhasil DISETUJUI!`
          : `Pendaftaran ${item.full_name} (${item.email}) telah DITOLAK.`
      );
      setTimeout(() => setFeedback(null), 4000);

      loadApprovals();
    } catch (err) {
      console.error('Update status failed:', err);
    } finally {
      setIsUpdating(null);
    }
  };

  const filteredApprovals = approvals.filter((item) => {
    if (filterTab !== 'all' && item.status !== filterTab) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.full_name.toLowerCase().includes(q) ||
      item.email.toLowerCase().includes(q) ||
      item.phone_number.includes(q)
    );
  });

  const pendingCount = approvals.filter((a) => a.status === 'pending').length;
  const approvedCount = approvals.filter((a) => a.status === 'approved').length;
  const rejectedCount = approvals.filter((a) => a.status === 'rejected').length;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="Persetujuan Pendaftar Baru"
        subtitle="Verifikasi akun pendaftaran pengguna langsung tersinkronisasi dengan tabel Supabase (user_approvals)"
      />

      <AdminTabNav counts={{ pendingApprovals: pendingCount }} />

      <div className="p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Feedback Alert */}
        {feedback && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedback}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-emerald-600 hover:text-emerald-900 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Top Summary & Actions Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-100">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Antrean Verifikasi Registrasi
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  {pendingCount} Menunggu Persetujuan
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengguna dengan status <strong>Pending</strong> belum dapat mengakses dashboard sebelum admin menyetujuinya.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              onClick={loadApprovals}
              variant="outline"
              size="sm"
              disabled={loading}
              className="border-slate-200 hover:bg-slate-50 text-slate-700 text-xs rounded-xl"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />}
            >
              Segarkan Data
            </Button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs">
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
              onClick={() => setFilterTab('approved')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filterTab === 'approved'
                  ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Disetujui ({approvedCount})
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
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filterTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({approvals.length})
            </button>
          </div>

          {/* Search Input */}
          <div className="w-full sm:w-72">
            <Input
              placeholder="Cari nama, email, nomor HP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              className="bg-white border-slate-200 text-slate-800 placeholder-slate-400 text-xs rounded-xl"
            />
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2 text-purple-600" />
              <span>Memuat data pendaftar dari Supabase...</span>
            </div>
          ) : filteredApprovals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-4">Nama Pendaftar</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Nomor WhatsApp / HP</th>
                    <th className="p-4">Waktu Pendaftaran</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Aksi Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredApprovals.map((item) => {
                    const waClean = normalizeWaNumber(item.phone_number);
                    const waMessage = encodeURIComponent(
                      `Halo ${item.full_name}, akun TataDana Anda telah kami tinjau.`
                    );
                    const waLink = `https://wa.me/${waClean}?text=${waMessage}`;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-slate-900 text-sm">{item.full_name}</div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">ID: {item.id}</div>
                        </td>
                        <td className="p-4 font-mono text-slate-600 text-xs">
                          {item.email}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-700 text-xs">{item.phone_number}</span>
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-[10px] font-semibold transition-colors"
                              title="Hubungi via WhatsApp"
                            >
                              <MessageCircle className="w-3 h-3 text-emerald-600" />
                              <span>WhatsApp</span>
                            </a>
                          </div>
                        </td>
                        <td className="p-4 text-slate-500 text-[11px]">
                          {item.created_at ? formatWIBDateTime(item.created_at) : '-'}
                        </td>
                        <td className="p-4">
                          {item.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Disetujui</span>
                            </span>
                          ) : item.status === 'rejected' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Ditolak</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                              <span>Pending</span>
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {/* Tombol Setujui */}
                            <Button
                              onClick={() => handleUpdateStatus(item, 'approved')}
                              disabled={isUpdating === item.id || item.status === 'approved'}
                              size="sm"
                              className={`rounded-xl text-xs py-1 px-2.5 ${
                                item.status === 'approved'
                                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                              }`}
                              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                            >
                              Setujui
                            </Button>

                            {/* Tombol Tolak */}
                            <Button
                              onClick={() => handleUpdateStatus(item, 'rejected')}
                              disabled={isUpdating === item.id || item.status === 'rejected'}
                              size="sm"
                              variant="outline"
                              className={`rounded-xl text-xs py-1 px-2.5 ${
                                item.status === 'rejected'
                                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                  : 'border-rose-200 text-rose-600 hover:bg-rose-50'
                              }`}
                              leftIcon={<XCircle className="w-3.5 h-3.5" />}
                            >
                              Tolak
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="font-bold text-slate-800 text-sm">
                {filterTab === 'pending'
                  ? 'Tidak ada antrean pendaftar yang menunggu persetujuan.'
                  : `Tidak ada data pendaftar dengan filter ${filterTab}.`}
              </p>
              <p className="text-slate-500 text-xs max-w-md mx-auto">
                Setiap kali pengguna baru mendaftar di form registrasi, data dari tabel Supabase <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono">user_approvals</code> akan otomatis muncul di sini.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
