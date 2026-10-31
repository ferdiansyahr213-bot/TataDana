'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/dashboard/Header';
import { AdminTabNav } from '@/components/admin/AdminTabNav';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Sparkles, 
  Users, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  RefreshCw, 
  CreditCard, 
  Smartphone,
  Cpu,
  Activity,
  Eye,
  AlertTriangle,
  Crown
} from 'lucide-react';
import { UserProfile, UserApproval, PaymentRecord } from '@/lib/types';
import { supabase, isLiveSupabaseConfigured } from '@/lib/supabase/client';
import { fetchUserApprovals } from '@/lib/supabase/data-service';
import { formatRupiah } from '@/lib/utils/currency';
import { formatWIBDateTime, formatShortWIB } from '@/lib/utils/date-wib';

export default function AdminOverviewPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [approvals, setApprovals] = useState<UserApproval[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch approvals
      if (isLiveSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('user_approvals')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          setApprovals(data);
        } else {
          const fallback = await fetchUserApprovals();
          setApprovals(fallback);
        }
      } else {
        const fallback = await fetchUserApprovals();
        setApprovals(fallback);
      }

      // 2. Fetch users and payments from API
      const res = await fetch('/api/data?userId=usr_admin_999');
      const data = await res.json();
      if (data.ok) {
        if (data.payments) setPayments(data.payments);
        const serverUsers: UserProfile[] = data.allUsers || [];
        const baseUsers: UserProfile[] = data.user ? [data.user] : [];
        const userMap = new Map<string, UserProfile>();
        baseUsers.forEach(u => u && userMap.set(u.id, u));
        serverUsers.forEach(u => u && userMap.set(u.id, u));
        setUsers(Array.from(userMap.values()));
      }
    } catch (e) {
      console.error('Error loading admin overview:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApproveRegistration = async (item: UserApproval) => {
    try {
      if (isLiveSupabaseConfigured()) {
        await supabase
          .from('user_approvals')
          .update({ status: 'approved' })
          .eq('id', item.id);
      }
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_user',
          payload: { targetUserId: item.id, email: item.email },
          userId: 'usr_admin_999',
        }),
      });

      setApprovals(prev =>
        prev.map(a => (a.id === item.id ? { ...a, status: 'approved' } : a))
      );
      setFeedback(`Pendaftaran ${item.full_name} berhasil disetujui!`);
      setTimeout(() => setFeedback(null), 3500);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleApprovePayment = async (paymentId: string) => {
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_payment',
          payload: { paymentId },
          userId: 'usr_admin_999',
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedback('Pembayaran disetujui! Akun pengguna berhasil di-upgrade ke Pro.');
        setTimeout(() => setFeedback(null), 3500);
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const pendingApprovals = approvals.filter(a => a.status === 'pending');
  const pendingPayments = payments.filter(p => p.status === 'pending');
  const proUsers = users.filter(u => u.plan === 'pro');

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="Overview Panel Admin"
        subtitle="Pusat kendali operasional, verifikasi pendaftar baru, antrean pembayaran Pro, dan statistik akun"
      />

      <AdminTabNav counts={{ 
        pendingApprovals: pendingApprovals.length, 
        pendingPayments: pendingPayments.length 
      }} />

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

        {/* Top Notification Banner if there are pending queues */}
        {(pendingApprovals.length > 0 || pendingPayments.length > 0) && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50 via-amber-50/60 to-purple-50 border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-700 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Perhatian: Terdapat Antrean yang Memerlukan Tindakan Admin
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  {pendingApprovals.length > 0 && `${pendingApprovals.length} pendaftar baru menunggu persetujuan. `}
                  {pendingPayments.length > 0 && `${pendingPayments.length} bukti transfer menunggu verifikasi upgrade Pro.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {pendingApprovals.length > 0 && (
                <Link
                  href="/dashboard/admin/approvals"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Review Pendaftar ({pendingApprovals.length})</span>
                </Link>
              )}
              {pendingPayments.length > 0 && (
                <Link
                  href="/dashboard/admin/payments"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Review Pembayaran ({pendingPayments.length})</span>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/dashboard/admin/approvals"
            className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-amber-300 hover:shadow-sm transition-all group shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Pendaftar Pending
              </span>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            </div>
            <div className="text-2xl font-black text-amber-600 mt-2">
              {pendingApprovals.length} Akun
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
              <span>Menunggu approval</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          <Link
            href="/dashboard/admin/payments"
            className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-purple-300 hover:shadow-sm transition-all group shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Pembayaran Pending
              </span>
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            </div>
            <div className="text-2xl font-black text-purple-600 mt-2">
              {pendingPayments.length} Bukti
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
              <span>Antrean paket Pro</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          <Link
            href="/dashboard/admin/users"
            className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-300 hover:shadow-sm transition-all group shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Akun Pengguna
              </span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">
              {users.length} Akun
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
              <span>Kelola & Impersonasi</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Pengguna Paket Pro
              </span>
              <Crown className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-black text-indigo-600 mt-2">
              {proUsers.length} Akun
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
              <span>{Math.round((proUsers.length / (users.length || 1)) * 100)}% konversi</span>
              <span className="text-indigo-600 font-semibold">Aktif</span>
            </div>
          </div>
        </div>

        {/* Dual Panels: Recent Approvals & Recent Payments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel 1: Antrean Pendaftar Baru Terkini */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-sm">Pendaftar Baru (user_approvals)</h3>
              </div>
              <Link
                href="/dashboard/admin/approvals"
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <span>Lihat Semua</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="flex-1 mt-3">
              {pendingApprovals.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {pendingApprovals.slice(0, 4).map((item) => (
                    <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{item.full_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{item.email}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {item.created_at ? formatWIBDateTime(item.created_at) : '-'}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          onClick={() => handleApproveRegistration(item)}
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] py-1 px-2.5 shadow-xs"
                          leftIcon={<CheckCircle2 className="w-3 h-3" />}
                        >
                          Setujui
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs space-y-1">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                  <p className="font-semibold text-slate-700">Semua pendaftar telah disetujui</p>
                  <p className="text-[11px] text-slate-400">Tidak ada antrean pending saat ini.</p>
                </div>
              )}
            </div>
          </div>

          {/* Panel 2: Antrean Pembayaran Pro Terkini */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-slate-900 text-sm">Antrean Pembayaran Pro</h3>
              </div>
              <Link
                href="/dashboard/admin/payments"
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <span>Lihat Semua</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="flex-1 mt-3">
              {pendingPayments.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {pendingPayments.slice(0, 4).map((p) => (
                    <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>{p.user_name}</span>
                          <span className="font-bold text-purple-700 font-mono text-[11px]">
                            {formatRupiah(p.amount)}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 capitalize">{(p.payment_method || 'transfer').replace('_', ' ')}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {formatShortWIB(p.created_at)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          onClick={() => handleApprovePayment(p.id)}
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] py-1 px-2.5 shadow-xs"
                          leftIcon={<CheckCircle2 className="w-3 h-3" />}
                        >
                          Setujui
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs space-y-1">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                  <p className="font-semibold text-slate-700">Semua pembayaran telah tuntas</p>
                  <p className="text-[11px] text-slate-400">0 antrean verifikasi pembayaran pending.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Tools & Diagnostics Grid */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <h3 className="font-bold text-slate-900 text-sm mb-3">Pintasan Fitur Administrasi & Audit</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link
              href="/dashboard/admin/users"
              className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 hover:bg-blue-50/50 hover:border-blue-200 transition-all flex items-center gap-3 group"
            >
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-brand-600 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-slate-800 text-xs group-hover:text-brand-700 truncate">Kelola Pengguna</div>
                <div className="text-[10px] text-slate-400 truncate">Manajemen role & impersonasi</div>
              </div>
            </Link>

            <Link
              href="/dashboard/admin/ai-providers"
              className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 hover:bg-purple-50/50 hover:border-purple-200 transition-all flex items-center gap-3 group"
            >
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-purple-600 shrink-0">
                <Cpu className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-slate-800 text-xs group-hover:text-purple-700 truncate">AI Multi-Provider</div>
                <div className="text-[10px] text-slate-400 truncate">Gemini, GPT & DeepSeek failover</div>
              </div>
            </Link>

            <Link
              href="/dashboard/admin/ai-logs"
              className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 hover:bg-emerald-50/50 hover:border-emerald-200 transition-all flex items-center gap-3 group"
            >
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-emerald-600 shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-slate-800 text-xs group-hover:text-emerald-700 truncate">Log Pemanggilan AI</div>
                <div className="text-[10px] text-slate-400 truncate">Latensi, token & biaya Rupiah</div>
              </div>
            </Link>

            <Link
              href="/dashboard/admin/transactions"
              className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 hover:bg-amber-50/50 hover:border-amber-200 transition-all flex items-center gap-3 group"
            >
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-amber-600 shrink-0">
                <Eye className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-slate-800 text-xs group-hover:text-amber-700 truncate">Audit Transaksi User</div>
                <div className="text-[10px] text-slate-400 truncate">Akses audit support berizin</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
