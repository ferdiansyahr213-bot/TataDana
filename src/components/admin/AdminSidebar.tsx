'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, 
  Cpu, 
  Activity, 
  CreditCard, 
  ShieldAlert, 
  ArrowLeft, 
  FileText, 
  Eye 
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export const AdminSidebar: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    { label: 'Kelola Pengguna', href: '/admin', icon: Users },
    { label: 'Persetujuan Admin (Approval)', href: '/admin/payments', icon: ShieldAlert, badge: 'Verifikasi' },
    { label: 'AI Multi-Provider', href: '/admin/ai-providers', icon: Cpu },
    { label: 'Log Pemanggilan AI', href: '/admin/ai-logs', icon: Activity },
    { label: 'Audit Transaksi User', href: '/admin/transactions', icon: Eye },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-200 flex flex-col h-screen sticky top-0 shrink-0 select-none z-30">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
            🛡️
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white tracking-tight text-lg">TataDana</span>
              <Badge variant="purple" size="sm">
                Admin
              </Badge>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Superadmin Control Center</p>
          </div>
        </Link>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto text-xs">
        <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Superadmin Console
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-purple-600/20 text-purple-400 font-semibold border border-purple-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Back to User View / Impersonation */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <Link
          href="/dashboard"
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors border border-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Mode User</span>
        </Link>
      </div>
    </aside>
  );
};
