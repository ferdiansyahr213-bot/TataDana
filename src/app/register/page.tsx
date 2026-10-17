'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Smartphone, Mail, Lock, User, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Save temporary registration data to session storage
    sessionStorage.setItem(
      'new_user_reg',
      JSON.stringify({
        fullName,
        phone,
        email,
      })
    );

    setTimeout(() => {
      setIsLoading(false);
      router.push(`/verify-otp?phone=${encodeURIComponent(phone)}`);
    }, 600);
  };

  return (
    <div className="min-h-screen flex bg-white text-slate-900">
      {/* Kiri (40%): Branding Panel */}
      <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-brand-600 via-brand-500 to-indigo-600 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-brand-700/30 blur-2xl" />

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white text-brand-600 flex items-center justify-center font-black text-xl shadow-lg">
              T
            </div>
            <span className="text-2xl font-black tracking-tight">TataDana</span>
          </Link>
        </div>

        <div className="relative z-10 space-y-4">
          <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
            Mulai Bebas Cemas
          </span>
          <h2 className="text-4xl font-black leading-tight tracking-tight">
            Keuanganmu. <br />Terkontrol.
          </h2>
          <p className="text-blue-100 text-sm leading-relaxed max-w-sm">
            Setelah registrasi, bot Telegram TataDana langsung siap mencatat transaksi harianmu dengan rekomendasi AI cerdas.
          </p>
        </div>

        <div className="relative z-10 text-xs text-blue-200/80">
          © 2026 TataDana Fintech • Setup Akun Instan
        </div>
      </div>

      {/* Kanan (60%): Form Register */}
      <div className="w-full lg:w-3/5 flex items-center justify-center p-6 sm:p-12 lg:p-20">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Buat Akun TataDana
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Daftar gratis dan nikmati pencatatan keuangan termudah langsung dari Telegram
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4 text-xs">
            <Input
              label="Nama Lengkap"
              placeholder="contoh: Vina Al Fitriansyah"
              leftIcon={<User className="w-4 h-4" />}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <Input
              label="Nomor Handphone (Wajib Verifikasi OTP)"
              type="tel"
              placeholder="087757524542"
              leftIcon={<Smartphone className="w-4 h-4" />}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              helperText="Kunci utama untuk menghubungkan akun kamu ke Telegram bot."
            />

            <Input
              label="Alamat Email"
              type="email"
              placeholder="nama@email.com"
              leftIcon={<Mail className="w-4 h-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Kata Sandi"
              type="password"
              placeholder="Minimal 8 karakter"
              leftIcon={<Lock className="w-4 h-4" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button type="submit" variant="primary" className="w-full mt-2" isLoading={isLoading}>
              <span>Lanjut ke Verifikasi OTP</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          <p className="text-center text-xs text-slate-500">
            Sudah memiliki akun?{' '}
            <Link href="/login" className="font-bold text-brand-600 hover:underline">
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
