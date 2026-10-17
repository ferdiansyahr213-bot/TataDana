'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = sessionStorage.getItem('user_role');
      const userId = sessionStorage.getItem('current_user_id');

      // Admin access granted only for role 'admin' or 'superadmin' or admin user id
      if (role === 'admin' || role === 'superadmin' || userId === 'usr_admin_999') {
        setIsAuthorized(true);
      } else {
        // Access Denied for regular users: redirect to /dashboard with error message
        setIsAuthorized(false);
        router.replace('/dashboard?error=access_denied');
      }
    }
  }, [router]);

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-400 text-xs">
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mb-3" />
        <p className="font-semibold text-slate-300">Memverifikasi Otorisasi Role Admin...</p>
        <p className="text-[11px] text-slate-500 mt-1">Sistem RBAC TataDana sedang memeriksa hak akses akun Anda</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
