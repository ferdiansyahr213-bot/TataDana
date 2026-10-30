'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Clock, MessageSquare, ArrowLeft } from 'lucide-react';
import { getAdminRegisterWaUrl, getAdminApprovalWaUrl, getAdminWaDisplayNumber } from '@/lib/utils/whatsapp';

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';

  const waUrl = getAdminRegisterWaUrl({ phone });
  const adminWaDisplay = getAdminWaDisplayNumber();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
          <Clock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
            Sistem Persetujuan Manual
          </span>
          <h1 className="text-xl font-black text-slate-900">
            Verifikasi OTP Telah Diganti
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Akun Anda sedang menunggu persetujuan admin sebelum dapat digunakan. Verifikasi OTP kini digantikan dengan konfirmasi langsung ke Admin.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all"
          >
            <MessageSquare className="w-4 h-4 fill-white" />
            <span>Hubungi Admin via WhatsApp ({adminWaDisplay})</span>
          </a>

          <Link
            href="/login"
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Halaman Masuk</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <VerifyOtpContent />
    </Suspense>
  );
}
