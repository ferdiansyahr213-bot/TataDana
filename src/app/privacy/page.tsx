import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Kebijakan Privasi — TataDana',
  description: 'Kebijakan privasi perlindungan data pengguna TataDana Fintech',
};

export default function PrivacyPage() {
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

        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Kebijakan Privasi</h1>
        <p className="text-xs text-slate-400">Terakhir diperbarui: 10 Oktober 2026</p>

        <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <p>
            TataDana berkomitmen untuk melindungi data dan privasi keuangan seluruh pengguna kami di Indonesia.
            Kebijakan ini menjelaskan bagaimana kami mengumpulkan, menyimpan, dan mengamankan data transaksi Anda.
          </p>

          <h2 className="text-base font-bold text-slate-900 pt-2">1. Data yang Kami Kumpulkan</h2>
          <p>
            Kami hanya mengumpulkan data yang diperlukan untuk pencatatan keuangan Anda: nama lengkap, alamat email, nomor telepon terverifikasi, dan rincian transaksi yang Anda kirimkan melalui pesan Telegram Bot atau dashboard web.
          </p>

          <h2 className="text-base font-bold text-slate-900 pt-2">2. Keamanan Database &amp; Enkripsi</h2>
          <p>
            Semua data transaksi disimpan di Supabase (PostgreSQL) dengan Row Level Security (RLS) aktif, memastikan hanya Anda yang memiliki akses ke buku kas pribadi Anda. Kunci API eksternal dan token bot Telegram disimpan menggunakan enkripsi tingkat militer.
          </p>

          <h2 className="text-base font-bold text-slate-900 pt-2">3. Audit Trail Akses Admin</h2>
          <p>
            Tim support TataDana tidak dapat melihat data transaksi Anda tanpa izin dan pencatatan audit log yang tidak dapat diubah (immutable audit trail).
          </p>
        </div>
      </div>
    </div>
  );
}
