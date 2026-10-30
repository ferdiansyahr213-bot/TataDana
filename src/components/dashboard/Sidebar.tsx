'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  CreditCard, 
  BarChart3, 
  Target, 
  Wallet as WalletIcon, 
  Calendar,
  Bot,
  Settings, 
  Sparkles, 
  LogOut, 
  ShieldAlert, 
  ShieldCheck,
  Users,
  ExternalLink,
  Zap,
  Smartphone
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { supabase } from '@/lib/supabase/client';
import { UpgradeProModal } from './UpgradeProModal';
import { sanitizeUserDisplayName, sanitizeUserId } from '@/lib/auth/user-sanitize';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = React.useState<boolean>(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = React.useState<boolean>(false);
  const [userProfile, setUserProfile] = React.useState<{
    id?: string;
    fullName: string;
    email: string;
    phone: string;
    avatarUrl?: string;
    plan?: string;
  }>({
    id: '',
    fullName: '',
    email: '',
    phone: '',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    plan: 'starter',
  });

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = sessionStorage.getItem('user_role');
      const userId = sessionStorage.getItem('current_user_id') || sessionStorage.getItem('user_id');
      if (role === 'admin' || role === 'superadmin' || userId === 'usr_admin_999') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }

      // Check session storage first for immediate dynamic UI response
      const sessionName = sessionStorage.getItem('user_name') || '';
      const sessionEmail = sessionStorage.getItem('user_email') || '';
      const sessionPhone = sessionStorage.getItem('user_phone') || '';
      const sessionPlan = sessionStorage.getItem('user_plan') || 'starter';

      if (sessionName || sessionEmail || sessionPhone) {
        setUserProfile((prev) => ({
          ...prev,
          id: userId || prev.id,
          fullName: sanitizeUserDisplayName(sessionName, sessionEmail),
          email: sessionEmail || prev.email,
          phone: sessionPhone || prev.phone,
          plan: sessionPlan || prev.plan,
        }));
      }

      // Dynamic load from Supabase Auth & Backend Profile
      const fetchUserData = async () => {
        try {
          let currentId = userId || '';
          let currentEmail = sessionEmail;
          let currentName = sessionName;
          let currentPlan = sessionPlan;

          // Check Supabase Auth session if active
          if (supabase) {
            const { data: authData } = await supabase.auth.getUser();
            if (authData?.user) {
              const u = authData.user;
              const meta = u.user_metadata || {};
              currentId = currentId || u.id;
              currentEmail = currentEmail || u.email || '';
              currentName = currentName || meta.full_name || meta.name || '';
              if (meta.plan) currentPlan = meta.plan;
            }
          }

          // Fetch from internal profile endpoint if we have an ID
          if (currentId) {
            const res = await fetch(`/api/data?userId=${encodeURIComponent(currentId)}`);
            if (res.ok) {
              const data = await res.json();
              if (data.ok && data.user) {
                setUserProfile({
                  id: data.user.id || currentId,
                  fullName: sanitizeUserDisplayName(data.user.full_name || currentName, data.user.email || currentEmail),
                  email: data.user.email || currentEmail,
                  phone: data.user.phone_number || sessionPhone,
                  avatarUrl: data.user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
                  plan: data.user.plan || currentPlan || 'starter',
                });
                return;
              }
            }
          }

          setUserProfile((prev) => ({
            ...prev,
            id: currentId || (currentEmail || ''),
            fullName: sanitizeUserDisplayName(currentName, currentEmail),
            email: currentEmail,
            plan: currentPlan || prev.plan,
          }));
        } catch (err) {
          // Fallback to neutral defaults if network error
        }
      };

      fetchUserData();
    }
  }, []);

  // 1. Menu Fitur Pengguna (Bisa diakses langsung oleh semua user di kelompok atas)
  const userNavItems = [
    { label: 'Beranda', href: '/dashboard', icon: Home },
    { label: 'Multi-Wallet', href: '/dashboard/wallets', icon: WalletIcon },
    { label: 'Transaksi', href: '/dashboard/transactions', icon: CreditCard },
    { label: 'Fitur Kalender', href: '/dashboard/calendar', icon: Calendar },
    { label: 'Budget', href: '/dashboard/budgets', icon: Target },
    { label: 'Laporan', href: '/dashboard/reports', icon: BarChart3 },
    { label: 'Tata AI Bot', href: '/dashboard/ai-chat', icon: Bot, badge: 'PRO' },
    { label: 'Setelan', href: '/dashboard/settings', icon: Settings },
  ];

  // 2. Menu Administrasi Khusus (Hanya tampil untuk akun Admin / Superadmin di kelompok bawah)
  const adminNavItems = [
    { label: 'Overview Admin', href: '/dashboard/admin', icon: ShieldAlert, badge: 'SUPER' },
    { label: 'Approval User', href: '/dashboard/admin/approvals', icon: ShieldCheck, badge: 'Persetujuan' },
    { label: 'Persetujuan Pro', href: '/dashboard/admin/payments', icon: Sparkles, badge: 'Pembayaran' },
    { label: 'Kelola User', href: '/dashboard/admin/users', icon: Users },
    { label: 'Bot Simulator', href: '/dashboard/simulator', icon: Smartphone, badge: 'ADMIN' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col h-screen sticky top-0 shrink-0 select-none z-30 shadow-xs">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-brand-sm transition-transform group-hover:scale-105">
            T
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900 tracking-tight text-lg">TataDana</span>
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Fintech Personal Assistant</p>
          </div>
        </Link>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto">
        {/* Kelompok Menu Utama / Fitur Pengguna (Bisa Diakses Semua User) */}
        <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Fitur & Menu Utama
        </div>
        {userNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-blue-50 text-brand-600 font-bold shadow-xs border border-blue-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>

              {item.badge && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        {/* Kelompok PANEL ADMIN - Terproteksi Hak Akses (Hanya Tampil Jika Role Admin / Superadmin) */}
        {isAdmin && (
          <div className="pt-4 mt-3 border-t border-slate-200/80 space-y-1">
            <div className="px-3 py-1.5 flex items-center justify-between">
              <span className="text-[11px] font-black text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
                <span>Panel Admin</span>
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200/80">
                ADMIN
              </span>
            </div>

            {adminNavItems.map((item) => {
              const cleanHref = item.href.split('#')[0];
              const isActive = pathname === cleanHref;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-purple-50 text-purple-700 font-bold shadow-xs border border-purple-200/80'
                      : 'text-slate-600 hover:text-purple-900 hover:bg-purple-50/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-purple-600' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>

                  {item.badge && (
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-purple-100 text-purple-700 border border-purple-200/60">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* Plan Card Upgrade Prompt - Clean Minimalist Card */}
      <div className="p-3.5 border-t border-slate-100 bg-white">
        {userProfile.plan === 'pro' ? (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/80 border border-blue-200/80 rounded-2xl p-3 mb-2.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-blue-900 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>TataDana Pro</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full">
                Aktif
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsUpgradeModalOpen(true)}
              className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white hover:bg-slate-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold transition-all shadow-2xs"
            >
              <span>Lihat Benefit Pro</span>
            </button>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 mb-2.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Paket Starter</span>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full">
                Aktif
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsUpgradeModalOpen(true)}
              className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs"
              title="Upgrade ke Pro via WhatsApp Admin"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Upgrade ke Pro</span>
            </button>
          </div>
        )}

        {/* User profile snippet */}
        <div className="flex items-center justify-between pt-1 px-1">
          <div className="flex items-center gap-2 truncate">
            <div className="w-7 h-7 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-300">
              <img
                src={userProfile.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
                alt={userProfile.fullName}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-800 truncate" title={userProfile.fullName}>
                {userProfile.fullName}
              </p>
              <p className="text-[10px] text-slate-400 truncate" title={userProfile.phone || userProfile.email}>
                {userProfile.phone || userProfile.email}
              </p>
            </div>
          </div>
          <Link
            href="/login"
            onClick={() => {
              if (typeof window !== 'undefined') {
                sessionStorage.clear();
              }
            }}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors"
            title="Keluar"
          >
            <LogOut className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <UpgradeProModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        user={{
          id: userProfile.id,
          fullName: userProfile.fullName,
          email: userProfile.email,
          phone: userProfile.phone,
        }}
      />
    </aside>
  );
};
