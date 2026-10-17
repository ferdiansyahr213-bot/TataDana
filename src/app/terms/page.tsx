import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Syarat & Ketentuan — TataDana',
  description: 'Syarat dan ketentuan layanan manajemen keuangan TataDana',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-16 px-6 text-slate-800">
      <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-card space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </Link>

        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Syarat &amp; Ketentuan</h1>
        <p className="text-xs text-slate-400">Terakhir diperbarui: 10 Oktober 2026</p>

        <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <p>
            Selamat datang di TataDana. Dengan mengakses atau menggunakan aplikasi kami melalui web dashboard atau integrasi Telegram Bot, Anda menyetujui ketentuan berikut.
          </p>

          <h2 className="text-base font-bold text-slate-900 pt-2">1. Penggunaan Layanan &amp; Batasan Paket</h2>
          <p>
            Pengguna paket Starter dibatasi maksimal 50 transaksi per bulan dan 3 dompet aktif. Pengguna paket Pro menikmati kuota transaksi tak terbatas, fitur OCR struk belanja, dan asisten finansial AI.
          </p>

          <h2 className="text-base font-bold text-slate-900 pt-2">2. Integrasi Telegram Bot</h2>
          <p>
            TataDana menyediakan 1 bot Telegram bersama. Pengguna bertanggung jawab menjaga kerahasiaan nomor telepon dan akun Telegram mereka sendiri.
          </p>

          <h2 className="text-base font-bold text-slate-900 pt-2">3. Pembayaran &amp; Pengembalian Dana</h2>
          <p>
            Pembayaran diproses melalui payment gateway Midtrans atau transfer bank manual yang disetujui tim admin. Layanan Pro Lifetime berlaku seumur hidup tanpa biaya langganan bulanan berulang.
          </p>
        </div>
      </div>
    </div>
  );
}
