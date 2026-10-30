import React from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';

export const metadata = {
  title: 'Panel Admin — TataDana',
  description: 'Panel administrasi dan persetujuan akun TataDana',
};

export default function DashboardAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <div className="flex-1 flex flex-col min-w-0 bg-surface-subtle">
        {children}
      </div>
    </AdminGuard>
  );
}
