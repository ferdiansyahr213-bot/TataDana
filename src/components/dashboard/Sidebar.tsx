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
  ExternalLink,
  Zap,
  Smartphone
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { supabase } from '@/lib/supabase/client';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = React.useState<boolean>(false);
  const [userProfile, setUserProfile] = React.useState<{
    fullName: string;
    email: string;
    phone: string;
    avatarUrl?: string;
  }>({
    fullName: 'Vina Al Fitriansyah',
    email: 'ferdiansyahr213@gmail.com',
    phone: '087757524542',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
  });

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = sessionStorage.getItem('user_role');
      const userId = sessionStorage.getItem('current_user_id');
      if (role === 'admin' || role === 'superadmin' || userId === 'usr_admin_999') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }

      // Check session storage first for immediate dynamic UI response
      const sessionName = sessionStorage.getItem('user_name');
      const sessionEmail = sessionStorage.getItem('user_email');
      const sessionPhone = sessionStorage.getItem('user_phone');

      if (sessionName || sessionEmail || sessionPhone) {
        setUserProfile((prev) => ({
          ...prev,
          fullName: sessionName || prev.fullName,
          email: sessionEmail || prev.email,
          phone: sessionPhone || prev.phone,
        }));
      }

      // Dynamic load from Supabase Auth & Backend Profile
      const fetchUserData = async () => {
        try {
          // Check Supabase Auth session if active
          if (supabase) {
            const { data: authData } = await supabase.auth.getUser();
            if (authData?.user) {
              const u = authData.user;
              const meta = u.user_metadata || {};
              setUserProfile((prev) => ({
                ...prev,
                fullName: meta.full_name || meta.name || prev.fullName,
                email: u.email || prev.email,
                phone: u.phone || meta.phone || prev.phone,
              }));
            }
          }

          // Fetch from internal profile endpoint
          const targetUserId = userId || (role === 'admin' || role === 'superadmin' ? 'usr_admin_999' : 'usr_demo_123');
          const res = await fetch(`/api/data?userId=${encodeURIComponent(targetUserId)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.ok && data.user) {
              setUserProfile({
                fullName: data.user.full_name || 'Vina Al Fitriansyah',
                email: data.user.email || 'ferdiansyahr213@gmail.com',
                phone: data.user.phone_number || '087757524542',
                avatarUrl: data.user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
              });
            }
          }
        } catch (err) {
          // Fallback to Vina Al Fitriansyah defaults if network error
        }
      };

      fetchUserData();
    }
  }, []);

  const primaryNavItems = [
    { label: 'Beranda', href: '/dashboard', icon: Home },
    { label: 'Multi-Wallet', href: '/dashboard/wallets', icon: WalletIcon },
    { label: 'Transaksi', href: '/dashboard/transactions', icon: CreditCard },
    { label: 'Laporan', href: '/dashboard/reports', icon: BarChart3 },
    { label: 'Budget', href: '/dashboard/budgets', icon: Target },
    { label: 'Setelan', href: '/dashboard/settings', icon: Settings },
    ...(isAdmin ? [{ label: 'Panel Admin', href: '/admin', icon: ShieldAlert, badge: 'SUPER' }] : []),
  ];

  const featureNavItems = [
    { label: 'Tata AI Bot', href: '/dashboard/ai-chat', icon: Bot, badge: 'PRO' },
    { label: 'Fitur Kalender', href: '/dashboard/calendar', icon: Calendar },
    ...(isAdmin ? [{ label: 'Bot Simulator', href: '/dashboard/simulator', icon: Smartphone, badge: 'ADMIN' }] : []),
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
        <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Menu Utama
        </div>
        {primaryNavItems.map((item) => {
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
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-blue-50 text-brand-700 border border-blue-200/60">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        <div className="pt-3 px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Fitur Cerdas & Bot
        </div>
        {featureNavItems.map((item) => {
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
      </nav>

      {/* Plan Card Upgrade Prompt - Clean Minimalist Card */}
      <div className="p-3.5 border-t border-slate-100 bg-white">
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 mb-2.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">Paket Starter</span>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full">
              Aktif
            </span>
          </div>

          <Link
            href="/dashboard/pricing"
            className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Upgrade ke Pro</span>
          </Link>
        </div>

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
    </aside>
  );
};
