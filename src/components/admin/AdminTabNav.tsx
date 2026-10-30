'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Sparkles, 
  Users, 
  Cpu, 
  Activity, 
  Eye 
} from 'lucide-react';

export const AdminTabNav: React.FC<{
  counts?: {
    pendingApprovals?: number;
    pendingPayments?: number;
  };
}> = ({ counts }) => {
  const pathname = usePathname();

  const tabs = [
    { label: 'Overview', href: '/dashboard/admin', icon: ShieldAlert },
    { 
      label: 'Approval User', 
      href: '/dashboard/admin/approvals', 
      icon: ShieldCheck, 
      count: counts?.pendingApprovals 
    },
    { 
      label: 'Persetujuan Pro', 
      href: '/dashboard/admin/payments', 
      icon: Sparkles, 
      count: counts?.pendingPayments 
    },
    { label: 'Kelola User', href: '/dashboard/admin/users', icon: Users },
    { label: 'AI Provider', href: '/dashboard/admin/ai-providers', icon: Cpu },
    { label: 'Log AI', href: '/dashboard/admin/ai-logs', icon: Activity },
    { label: 'Audit Transaksi', href: '/dashboard/admin/transactions', icon: Eye },
  ];

  return (
    <div className="border-b border-slate-200/80 bg-white px-6 sm:px-8">
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-purple-50 text-purple-700 shadow-xs border border-purple-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-purple-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>

              {typeof tab.count === 'number' && tab.count > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  {tab.count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
};
