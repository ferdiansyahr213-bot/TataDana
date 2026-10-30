'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/dashboard/Header';
import { AdminTabNav } from '@/components/admin/AdminTabNav';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { 
  Users, 
  Search, 
  ExternalLink, 
  Download, 
  CheckCircle2, 
  RefreshCw, 
  Crown, 
  Zap, 
  Smartphone,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { formatWIBDateTime } from '@/lib/utils/date-wib';

export default function AdminUsersManagementPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | 'starter' | 'pro'>('all');
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/data?userId=usr_admin_999');
      const data = await res.json();
      if (data.ok) {
        const serverUsers: UserProfile[] = data.allUsers || [];
        const baseUsers: UserProfile[] = data.user ? [data.user] : [];

        // Deduplicate
        const userMap = new Map<string, UserProfile>();
        baseUsers.forEach(u => u && userMap.set(u.id, u));
        serverUsers.forEach(u => u && userMap.set(u.id, u));
        setUsers(Array.from(userMap.values()));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

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
        setTimeout(() => setFeedback(null), 3500);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleImpersonate = (user: UserProfile) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('current_user_id', user.id);
      sessionStorage.setItem('user_name', user.full_name);
      sessionStorage.setItem('user_email', user.email || '');
      sessionStorage.setItem('user_role', user.role || 'user');
      window.location.href = `/dashboard?impersonate=${user.id}`;
    }
  };

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

  const filteredUsers = users.filter((u) => {
    if (planFilter !== 'all' && u.plan !== planFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.full_name.toLowerCase().includes(q) ||
      u.phone_number.includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.telegram_username || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="Kelola Pengguna & Hak Akses"
        subtitle="Pantau akun pengguna terdaftar, konfigurasi paket langganan, dan impersonasi akun"
      />

      <AdminTabNav />

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

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Pengguna Terdaftar
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">{users.length} Akun</div>
            <p className="text-[11px] text-slate-500 mt-1">Seluruh akun aktif di database</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Paket Pro Aktif
            </span>
            <div className="text-2xl font-black text-indigo-600 mt-1">
              {users.filter((u) => u.plan === 'pro').length} Akun
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Pengguna dengan akses AI tanpa batas</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Bot Telegram Terhubung
            </span>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              {users.filter((u) => u.telegram_connected).length} Akun
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Tersinkronisasi dengan @TataDanaVinaCantikBot</p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs">
            <button
              onClick={() => setPlanFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                planFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({users.length})
            </button>
            <button
              onClick={() => setPlanFilter('pro')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                planFilter === 'pro'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-indigo-600" />
              <span>Pro ({users.filter((u) => u.plan === 'pro').length})</span>
            </button>
            <button
              onClick={() => setPlanFilter('starter')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                planFilter === 'starter'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Starter ({users.filter((u) => u.plan === 'starter').length})
            </button>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="w-full sm:w-72">
              <Input
                placeholder="Cari nama, email, no HP, telegram..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                className="bg-white border-slate-200 text-slate-800 placeholder-slate-400 text-xs rounded-xl"
              />
            </div>
            <Button
              onClick={handleExportUsers}
              variant="outline"
              size="sm"
              className="border-slate-200 hover:bg-slate-50 text-slate-700 text-xs rounded-xl shrink-0"
              leftIcon={<Download className="w-3.5 h-3.5 text-slate-500" />}
            >
              Export CSV
            </Button>
            <Button
              onClick={loadUsers}
              variant="outline"
              size="sm"
              disabled={loading}
              className="border-slate-200 hover:bg-slate-50 text-slate-700 text-xs rounded-xl shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2 text-purple-600" />
              <span>Memuat daftar akun pengguna...</span>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-4">Pengguna</th>
                    <th className="p-4">No. HP & Telegram</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Paket Langganan</th>
                    <th className="p-4">Status Akun</th>
                    <th className="p-4 text-right">Aksi Manajemen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 border border-slate-200 shrink-0">
                            {u.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              <span>{u.full_name}</span>
                              {u.role === 'admin' || u.role === 'superadmin' ? (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  ADMIN
                                </span>
                              ) : null}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-mono text-slate-700">{u.phone_number}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Smartphone className="w-3 h-3 text-slate-400" />
                          <span>{u.telegram_username ? `@${u.telegram_username}` : 'Belum sync'}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="capitalize font-semibold text-slate-700">{u.role}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            u.plan === 'pro'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {u.plan === 'pro' ? 'PRO' : 'STARTER'}
                          </span>
                          <button
                            onClick={() => handleTogglePlan(u)}
                            className="text-[11px] text-brand-600 hover:text-brand-800 font-semibold underline underline-offset-2"
                            title="Ubah paket Starter <-> Pro"
                          >
                            Ubah
                          </button>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Aktif / Approved</span>
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          onClick={() => handleImpersonate(u)}
                          size="sm"
                          variant="outline"
                          className="border-slate-200 hover:bg-purple-50 hover:text-purple-700 text-slate-700 text-xs rounded-xl py-1 px-2.5"
                          leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
                        >
                          Masuk Sebagai User
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center space-y-2">
              <Users className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="font-bold text-slate-800 text-sm">Tidak ada pengguna yang cocok dengan kriteria pencarian.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
