'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Mail, Smartphone, Lock, LogIn, AlertCircle, Eye, EyeOff, HelpCircle, MessageCircle } from 'lucide-react';
import { PendingVerificationModal } from '@/components/auth/PendingVerificationModal';

export default function LoginPage() {
  const router = useRouter();
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // State to hold user info when account is pending admin approval
  const [pendingApprovalUser, setPendingApprovalUser] = useState<{
    id: string;
    fullName?: string;
    email: string;
    phone?: string;
  } | null>(null);

  // State untuk Fitur Lupa Kata Sandi
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [adminWaNumber, setAdminWaNumber] = useState<string>(
    process.env.NEXT_PUBLIC_ADMIN_WA_NUMBER || '087730370324'
  );

  useEffect(() => {
    fetch('/api/data?userId=usr_demo_123')
      .then((res) => res.json())
      .then((data) => {
        if (data?.settings?.admin_wa_number) {
          setAdminWaNumber(data.settings.admin_wa_number);
        }
      })
      .catch(() => {});
  }, []);

  const handleOpenForgotPassword = () => {
    const currentInput = loginMethod === 'email' ? email.trim() : phone.trim();
    if (currentInput) {
      setForgotIdentifier(currentInput);
    }
    setShowForgotPasswordModal(true);
  };

  const handleContactAdminWA = () => {
    const cleanId = forgotIdentifier.trim() || (loginMethod === 'email' ? email.trim() : phone.trim()) || '-';
    const cleanPhone = (adminWaNumber || '087730370324').replace(/\D/g, '');
    const standardPhone = cleanPhone.startsWith('0')
      ? '62' + cleanPhone.slice(1)
      : cleanPhone.startsWith('62')
      ? cleanPhone
      : '62' + cleanPhone;

    const message = `Halo Admin *TataDana*,\n\nSaya mengalami kendala lupa kata sandi dan mohon bantuan untuk reset kata sandi akun saya.\n\n*Detail Akun Pengguna:*\n• Email / No. HP: ${cleanId}\n• Keperluan: Reset Kata Sandi\n\nMohon informasi kata sandi baru untuk akun saya. Terima kasih!`;

    const waUrl = `https://wa.me/${standardPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setPendingApprovalUser(null);

    const activeIdentifier = loginMethod === 'email' ? email.trim() : phone.trim();

    if (!activeIdentifier) {
      setIsLoading(false);
      setErrorMessage(
        loginMethod === 'email'
          ? 'Silakan masukkan alamat email Anda.'
          : 'Silakan masukkan nomor handphone Anda.'
      );
      return;
    }

    try {
      // 1. Verifikasi dan otentikasi login melalui endpoint /api/auth/login
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: activeIdentifier,
          email: loginMethod === 'email' ? activeIdentifier : undefined,
          phone: loginMethod === 'phone' ? activeIdentifier : undefined,
          loginType: loginMethod,
          password,
        }),
      });

      const data = await res.json();

      // Check if user is pending admin approval
      if (
        data.status === 'pending' ||
        (data.user &&
          data.user.verification_status === 'pending' &&
          data.user.role !== 'admin' &&
          data.user.role !== 'superadmin')
      ) {
        setIsLoading(false);
        setPendingApprovalUser({
          id: data.user?.id || '',
          fullName: data.user?.full_name,
          email: data.user?.email || (activeIdentifier.includes('@') ? activeIdentifier : ''),
          phone: data.user?.phone_number || (!activeIdentifier.includes('@') ? activeIdentifier : ''),
        });
        return;
      }

      if (!data.ok) {
        setIsLoading(false);
        setErrorMessage(data.error || 'Email / Nomor Handphone atau kata sandi salah');
        return;
      }

      const user = data.user;

      // Double-check verification status before storing session or redirecting
      if (
        user.verification_status === 'pending' &&
        user.role !== 'admin' &&
        user.role !== 'superadmin'
      ) {
        setIsLoading(false);
        setPendingApprovalUser({
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          phone: user.phone_number,
        });
        return;
      }

      // Login berhasil untuk akun terverifikasi / admin
      sessionStorage.setItem('current_user_id', user.id);
      sessionStorage.setItem('user_role', user.role || 'user');
      sessionStorage.setItem('user_email', user.email || '');
      sessionStorage.setItem('user_name', user.full_name || 'Pengguna TataDana');
      sessionStorage.setItem('user_phone', user.phone_number || '');
      sessionStorage.setItem('user_verification_status', user.verification_status || 'verified');
      if (user.avatar_url) sessionStorage.setItem('user_avatar', user.avatar_url);

      localStorage.setItem('current_user_id', user.id);
      localStorage.setItem('user_email', user.email || '');

      setIsLoading(false);
      if (user.role === 'superadmin' || user.role === 'admin') {
        router.push('/dashboard/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Terjadi kesalahan jaringan.');
    }
  };

  return (
    <div className="min-h-screen flex bg-white text-slate-900">
      {/* Kiri (40%): Branding Panel (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-brand-600 via-brand-500 to-indigo-600 text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Decorative Rings */}
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
            Fintech Indonesia
          </span>
          <h2 className="text-4xl font-black leading-tight tracking-tight">
            Keuanganmu. <br />Terkontrol.
          </h2>
          <p className="text-blue-100 text-sm leading-relaxed max-w-sm">
            Catat setiap pemasukan dan pengeluaran semudah mengirim pesan di Telegram. Terintegrasi langsung dengan dashboard pintar.
          </p>
        </div>

        <div className="relative z-10 text-xs text-blue-200/80">
          © 2026 TataDana Fintech • Didukung Supabase &amp; Telegram Bot
        </div>
      </div>

      {/* Kanan (60%): Form Login (Full Screen on Mobile) */}
      <div className="w-full lg:w-3/5 flex items-center justify-center p-6 sm:p-12 lg:p-20">
        <div className="w-full max-w-md space-y-7">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Selamat Datang Kembali
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Pilih metode masuk untuk mengakses dashboard akun Anda
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Opsi Tab Pilihan Metode Login */}
          <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setLoginMethod('email');
                setErrorMessage(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 ${
                loginMethod === 'email'
                  ? 'bg-white text-brand-600 shadow-sm border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Masuk dengan Email</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMethod('phone');
                setErrorMessage(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 ${
                loginMethod === 'phone'
                  ? 'bg-white text-brand-600 shadow-sm border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Masuk dengan No. HP</span>
            </button>
          </div>

          {/* Form Login Dinamis Berdasarkan Tab */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {loginMethod === 'email' ? (
              <Input
                label="Alamat Email"
                type="text"
                placeholder="nama@email.com"
                leftIcon={<Mail className="w-4 h-4" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            ) : (
              <Input
                label="Nomor Handphone"
                type="tel"
                placeholder="Contoh: 08123456789 atau +62812..."
                helperText="Format nomor diawali dengan 08 atau +62"
                leftIcon={<Smartphone className="w-4 h-4" />}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                required
              />
            )}

            <div className="relative">
              <Input
                label="Kata Sandi"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                leftIcon={<Lock className="w-4 h-4" />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-8 text-slate-400 hover:text-slate-600 transition-colors"
                title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex justify-end -mt-2">
              <button
                type="button"
                onClick={handleOpenForgotPassword}
                className="text-[11px] font-semibold text-brand-600 hover:text-brand-800 hover:underline transition-colors"
              >
                Lupa Kata Sandi?
              </button>
            </div>

            <Button type="submit" variant="primary" className="w-full mt-2" isLoading={isLoading}>
              <LogIn className="w-4 h-4 mr-1.5" />
              <span>
                {loginMethod === 'email' ? 'Masuk dengan Email' : 'Masuk dengan Nomor HP'}
              </span>
            </Button>
          </form>

          {/* Quick Demo Login Option */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-semibold">Atau masuk dengan</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem('current_user_id', 'usr_demo_123');
              sessionStorage.setItem('user_role', 'user');
              sessionStorage.setItem('user_email', 'ferdiansyahr213@gmail.com');
              sessionStorage.setItem('user_name', 'Vina Al Fitriansyah');
              sessionStorage.setItem('user_phone', '087757524542');
              sessionStorage.setItem('user_verification_status', 'verified');
              router.push('/dashboard');
            }}
            className="w-full py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Masuk dengan Google (Akun Demo)</span>
          </button>

          <p className="text-center text-xs text-slate-500 pt-1">
            Belum punya akun TataDana?{' '}
            <Link href="/register" className="font-bold text-brand-600 hover:underline">
              Daftar sekarang gratis
            </Link>
          </p>
        </div>
      </div>

      {/* Modal Menunggu Persetujuan Admin jika Akun Berstatus Pending */}
      {pendingApprovalUser && (
        <PendingVerificationModal
          fullName={pendingApprovalUser.fullName}
          email={pendingApprovalUser.email}
          phone={pendingApprovalUser.phone}
          userId={pendingApprovalUser.id}
          onClose={() => setPendingApprovalUser(null)}
          onVerified={() => {
            router.push('/dashboard');
          }}
        />
      )}

      {/* Modal Bantuan Lupa Kata Sandi */}
      {showForgotPasswordModal && (
        <Modal
          isOpen={showForgotPasswordModal}
          onClose={() => setShowForgotPasswordModal(false)}
          title="Bantuan Lupa Kata Sandi"
          description="Kirim permohonan reset kata sandi langsung ke Admin TataDana via WhatsApp resmi."
          maxWidth="md"
        >
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email atau Nomor Handphone Akun Anda
              </label>
              <Input
                type="text"
                placeholder="Contoh: user@email.com atau 08123456789"
                value={forgotIdentifier}
                onChange={(e) => setForgotIdentifier(e.target.value)}
                leftIcon={<HelpCircle className="w-4 h-4 text-slate-400" />}
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Data ini akan otomatis tercantum pada format pesan WhatsApp ke Admin.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs leading-relaxed space-y-1.5">
              <span className="font-bold text-slate-800 block text-xs">Preview Pesan WhatsApp ke Admin:</span>
              <div className="font-mono text-[11px] bg-white p-3 rounded-lg border border-slate-200 whitespace-pre-wrap text-slate-700 select-all leading-normal">
{`Halo Admin *TataDana*,

Saya mengalami kendala lupa kata sandi dan mohon bantuan untuk reset kata sandi akun saya.

*Detail Akun Pengguna:*
• Email / No. HP: ${forgotIdentifier.trim() || '[Isi otomatis dari input user]'}
• Keperluan: Reset Kata Sandi

Mohon informasi kata sandi baru untuk akun saya. Terima kasih!`}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowForgotPasswordModal(false)}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="primary"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleContactAdminWA}
                leftIcon={<MessageCircle className="w-4 h-4" />}
              >
                Hubungi Admin via WhatsApp
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
