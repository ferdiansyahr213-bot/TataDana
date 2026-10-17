import React from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminGuard } from '@/components/admin/AdminGuard';

export const metadata = {
  title: 'Admin Control Center — TataDana',
  description: 'Panel administrasi internal TataDana Fintech',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row antialiased text-slate-100">
        <AdminSidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </AdminGuard>
  );
}
