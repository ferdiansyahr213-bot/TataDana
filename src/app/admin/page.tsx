'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { 
  Users, 
  Search, 
  ExternalLink, 
  Download, 
  Send, 
  ShieldCheck, 
  UserCheck,
  Sparkles,
  Zap,
  CheckCircle2,
  RefreshCw,
  Crown,
  AlertTriangle,
  ArrowRight,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { UserProfile } from '@/lib/types';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | 'starter' | 'pro'>('all');
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/data?userId=usr_admin_999');
      const data = await res.json();
      if (data.ok) {
        if (data.payments) {
          setPayments(data.payments);
        }
        // Fetch all known demo users
        const userList: UserProfile[] = [
          data.user,
          {
            id: 'usr_demo_123',
            email: 'ferdiansyahr213@gmail.com',
            full_name: 'Vina Al Fitriansyah',
            phone_number: '087757524542',
            currency: 'IDR',
            role: 'user',
            plan: 'starter',
            telegram_chat_id: 987654321,
            telegram_username: 'vina_dev',
            telegram_connected: true,
            reminder_enabled: true,
            reminder_frequency: 1,
            reminder_time_1: '09:00:00',
            reminder_time_2: '20:00:00',
            onboarding_completed: true,
            created_at: '2026-09-10T10:00:00Z',
            updated_at: '2026-10-10T10:00:00Z',
          },
          {
            id: 'usr_demo_456',
            email: 'siti.rahma@yahoo.com',
            full_name: 'Siti Rahma',
            phone_number: '085712349988',
            currency: 'IDR',
            role: 'user',
            plan: 'pro',
            telegram_chat_id: 887654321,
            telegram_username: 'sitirahma_fin',
            telegram_connected: true,
            reminder_enabled: true,
            reminder_frequency: 2,
            reminder_time_1: '08:00:00',
            reminder_time_2: '19:00:00',
            onboarding_completed: true,
            created_at: '2026-09-15T11:00:00Z',
            updated_at: '2026-10-09T14:00:00Z',
          },
        ];

        // Deduplicate
        const unique = Array.from(new Map(userList.map(u => [u.id, u])).values());
        setUsers(unique);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleQuickApproveUser = async (user: UserProfile) => {
    const userPayment = payments.find((p: any) => p.user_id === user.id && p.status === 'pending');
    try {
      if (userPayment) {
        await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'approve_payment',
            payload: { paymentId: userPayment.id },
            userId: 'usr_admin_999',
          }),
        });
      } else {
        await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_user_plan',
            payload: { targetUserId: user.id, plan: 'pro' },
            userId: 'usr_admin_999',
          }),
        });
      }
      setFeedback(`Persetujuan berhasil! ${user.full_name} kini berstatus PRO & Approved by Admin.`);
      setTimeout(() => setFeedback(null), 3500);
      loadUsers();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTogglePlan = async (user: UserProfile) => {
    const newPlan = user.plan === 'pro' ? 'starter' : 'pro';
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_user_plan',
          payload: { targetUserId: user.id, plan: newPlan },
          userId: 'usr_admin_999',
        }),
      });

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, plan: newPlan } : u))
        );
        setFeedback(`Paket ${user.full_name} berhasil diubah ke ${newPlan.toUpperCase()}!`);
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleImpersonate = (user: UserProfile) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('current_user_id', user.id);
      window.location.href = `/dashboard?impersonate=${user.id}`;
    }
  };

  const filteredUsers = users.filter((u) => {
    if (planFilter !== 'all' && u.plan !== planFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.full_name.toLowerCase().includes(q) ||
      u.phone_number.includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.telegram_username || '').toLowerCase().includes(q)
    );
  });

  const handleExportUsers = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['ID,Nama,Email,NoHP,Role,Plan,TelegramStatus']
        .concat(
          users.map(
            (u) =>
              `${u.id},"${u.full_name}",${u.email},${u.phone_number},${u.role},${u.plan},${
                u.telegram_connected ? 'Connected' : 'Disconnected'
              }`
          )
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TataDana-Users-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-500" />
            <span>Panel Admin: Kelola Pengguna</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Pantau akun pengguna, ubah paket langganan secara instan, dan masuk sebagai user (impersonasi)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportUsers}
            variant="outline"
            size="sm"
            className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
            leftIcon={<Download className="w-4 h-4 text-brand-400" />}
          >
            Export CSV
          </Button>
          <Button
            onClick={loadUsers}
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Approval Queue Banner */}
      {payments.filter((p: any) => p.status === 'pending').length > 0 ? (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-blue-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">Antrean Persetujuan Admin (Approved Admin)</h4>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {payments.filter((p: any) => p.status === 'pending').length} Menunggu Persetujuan
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Terdapat pembayaran transfer manual dan permintaan upgrade paket Pro yang memerlukan review & persetujuan admin.
              </p>
            </div>
          </div>
          <Link
            href="/admin/payments"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md shrink-0"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Buka Antrean Approval</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Semua permohonan pembayaran & upgrade berstatus <strong>Disetujui Admin</strong> (0 antrean pending).</span>
          </div>
          <Link href="/admin/payments" className="text-brand-400 hover:text-brand-300 font-semibold inline-flex items-center gap-1">
            <span>Lihat Log Approval</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Total Pengguna
          </span>
          <div className="text-2xl font-black text-white mt-1">{users.length} Akun</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Paket Pro Aktif
          </span>
          <div className="text-2xl font-black text-brand-400 mt-1">
            {users.filter((u) => u.plan === 'pro').length} Akun
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Telegram Terhubung
          </span>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {users.filter((u) => u.telegram_connected).length} Akun
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Antrean Approval
          </span>
          <div className="text-2xl font-black text-amber-400 mt-1">
            {payments.filter((p: any) => p.status === 'pending').length} Pending
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            onClick={() => setPlanFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              planFilter === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Semua ({users.length})
          </button>
          <button
            onClick={() => setPlanFilter('pro')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              planFilter === 'pro'
                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Pro ({users.filter((u) => u.plan === 'pro').length})</span>
          </button>
          <button
            onClick={() => setPlanFilter('starter')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              planFilter === 'starter'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Starter ({users.filter((u) => u.plan === 'starter').length})
          </button>
        </div>

        <div className="w-full sm:w-80">
          <Input
            placeholder="Cari nama, email, no HP, atau @telegram..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-500" />}
            className="bg-slate-900 border-slate-800 text-white placeholder-slate-500"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="p-3.5">Nama & Kontak</th>
                <th className="p-3.5">No. HP</th>
                <th className="p-3.5">Paket (Plan)</th>
                <th className="p-3.5">Status Persetujuan</th>
                <th className="p-3.5">Koneksi Telegram</th>
                <th className="p-3.5">Aksi Admin</th>
                <th className="p-3.5 text-right">Aksi Impersonasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredUsers.map((u) => {
                const userHasPending = payments.some((p: any) => p.user_id === u.id && p.status === 'pending');

                return (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-white">{u.full_name}</div>
                      <div className="text-[11px] text-slate-500">{u.email}</div>
                    </td>
                    <td className="p-3.5 font-mono text-slate-400">{u.phone_number}</td>
                    <td className="p-3.5">
                      <Badge variant={u.plan === 'pro' ? 'brand' : 'gray'} size="sm">
                        {u.plan.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-3.5">
                      {userHasPending ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <Clock className="w-3 h-3 text-amber-400 animate-spin" />
                          <span>Menunggu Approval</span>
                        </span>
                      ) : u.plan === 'pro' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          <span>Approved by Admin</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Aktif Standar</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      {u.telegram_connected ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>@{u.telegram_username || 'Terkoneksi'}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">Belum Terhubung</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        {userHasPending ? (
                          <button
                            onClick={() => handleQuickApproveUser(u)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all flex items-center gap-1"
                            title="Setujui pembayaran dan aktifkan Paket Pro"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            <span>Setujui Pro</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleTogglePlan(u)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                              u.plan === 'pro'
                                ? 'bg-slate-800 text-slate-300 border-slate-700 hover:text-rose-400 hover:border-rose-500/30'
                                : 'bg-brand-500/20 text-brand-400 border-brand-500/30 hover:bg-brand-500/30'
                            }`}
                            title={u.plan === 'pro' ? 'Downgrade ke Starter' : 'Upgrade instan ke Pro'}
                          >
                            {u.plan === 'pro' ? 'Downgrade' : '⚡ Jadikan Pro'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleImpersonate(u)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-colors"
                        title="Masuk ke akun pengguna ini tanpa perlu password"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Masuk Akun</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
