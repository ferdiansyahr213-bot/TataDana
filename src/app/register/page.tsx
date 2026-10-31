'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Smartphone, Mail, Lock, User, UserPlus, AlertCircle, ArrowRight } from 'lucide-react';
import { PendingVerificationModal } from '@/components/auth/PendingVerificationModal';
import { supabase } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // State to hold registered user data when waiting for approval
  const [pendingUser, setPendingUser] = useState<{
    id: string;
    fullName: string;
    email: string;
    phone: string;
  } | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    try {
      // 1. Simpan nama lengkap, email, dan nomor HP ke tabel user_approvals menggunakan Supabase client
      let approvalId = `appr_${Date.now()}`;
      try {
        const { data: insertedApproval, error: supabaseError } = await supabase
          .from('user_approvals')
          .insert([
            {
              full_name: cleanName,
              email: cleanEmail,
              phone_number: cleanPhone,
              status: 'pending',
            },
          ])
          .select()
          .maybeSingle();

        if (insertedApproval?.id) {
          approvalId = insertedApproval.id;
        }

        if (supabaseError) {
          console.warn('Supabase client insert to user_approvals notice:', supabaseError.message);
        }
      } catch (sbErr) {
        console.warn('Supabase direct insert handled:', sbErr);
      }

      // 2. Sinkronkan pembuatan akun dengan status pending ke backend
      try {
        const res = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'register_user',
            payload: {
              fullName: cleanName,
              phone: cleanPhone,
              email: cleanEmail,
              password: password,
            },
          }),
        });
        const data = await res.json();
        if (data.ok && data.user?.id) {
          approvalId = data.user.id;
        }
      } catch (syncErr) {
        console.warn('Backend sync notice:', syncErr);
      }

      setIsLoading(false);

      // 3. Arahkan pengguna ke tampilan menunggu persetujuan yang berisi tautan WhatsApp ke admin
      setPendingUser({
        id: approvalId,
        fullName: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
      });
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Gagal menyimpan pendaftaran.');
    }
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
            Setelah pendaftaran diajukan, akun Anda akan diverifikasi oleh Admin. Nikmati pencatatan cerdas terintegrasi Telegram dan AI asisten.
          </p>
        </div>

        <div className="relative z-10 text-xs text-blue-200/80">
          © 2026 TataDana Fintech • Sistem Persetujuan Admin Manual
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
              Daftar gratis untuk mulai mencatat keuangan terintegrasi bot Telegram
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4 text-xs">
            <Input
              label="Nama Lengkap"
              placeholder="contoh: Budi Santoso"
              leftIcon={<User className="w-4 h-4" />}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <Input
              label="Nomor Handphone (WhatsApp)"
              type="tel"
              placeholder="contoh: 081234567890"
              leftIcon={<Smartphone className="w-4 h-4" />}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              helperText="Digunakan untuk konfirmasi persetujuan admin & integrasi Telegram."
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
              <span>Lanjut / Daftar Akun TataDana</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>

          <p className="text-center text-xs text-slate-500 pt-2">
            Sudah memiliki akun?{' '}
            <Link href="/login" className="font-bold text-brand-600 hover:underline">
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>

      {/* Modal Menunggu Persetujuan Admin setelah pendaftaran */}
      {pendingUser && (
        <PendingVerificationModal
          fullName={pendingUser.fullName}
          email={pendingUser.email}
          phone={pendingUser.phone}
          userId={pendingUser.id}
          onClose={() => setPendingUser(null)}
          onVerified={() => {
            router.push('/dashboard');
          }}
        />
      )}
    </div>
  );
}
