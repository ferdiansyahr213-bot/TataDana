import React from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';

export const metadata = {
  title: 'Dashboard — TataDana',
  description: 'Kelola keuangan pribadi terintegrasi Telegram Bot',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface-subtle flex flex-col md:flex-row antialiased text-slate-800">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
