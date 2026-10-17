'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Sparkles, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '081234567890';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChangeOtp = (index: number, val: string) => {
    if (val.length > 1) val = val[val.length - 1];
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);

    // Auto focus next input
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullOtp = otp.join('');
    setErrorMsg(null);
    setIsVerifying(true);

    setTimeout(async () => {
      // Validate OTP: accept either '123456' dev bypass or any 6 digit
      if (fullOtp === '123456' || fullOtp.length === 6) {
        setSuccess(true);

        // Auto initialize user profile & default wallet in backend
        try {
          const regData = sessionStorage.getItem('new_user_reg');
          const parsed = regData ? JSON.parse(regData) : null;
          let createdUserId = 'usr_demo_123';

          if (parsed) {
            const res = await fetch('/api/data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'register_user',
                payload: {
                  fullName: parsed.fullName,
                  phone: parsed.phone,
                  email: parsed.email,
                },
              }),
            });
            const regResult = await res.json();
            if (regResult.ok && regResult.user) {
              createdUserId = regResult.user.id;
            }
          }
          sessionStorage.setItem('current_user_id', createdUserId);
          sessionStorage.setItem('user_name', parsed?.fullName || 'Vina Al Fitriansyah');
          sessionStorage.setItem('user_phone', parsed?.phone || phone || '087757524542');
          sessionStorage.setItem('user_email', parsed?.email || 'ferdiansyahr213@gmail.com');

          setTimeout(() => {
            router.push(`/onboarding?userId=${encodeURIComponent(createdUserId)}`);
          }, 1000);
        } catch (err) {
          console.error(err);
          setTimeout(() => {
            router.push('/dashboard');
          }, 1000);
        }
      } else {
        setIsVerifying(false);
        setErrorMsg('Kode OTP salah. Masukkan kode bypass dev: 123456');
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 text-slate-900">
      <div className="w-full max-w-md p-8 rounded-3xl border border-slate-200 shadow-card text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-blue-100 text-brand-600 flex items-center justify-center mx-auto shadow-brand-sm">
          <ShieldCheck className="w-7 h-7" />
        </div>

        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Verifikasi Nomor HP
          </h1>
          <p className="text-xs text-slate-500 mt-1.5">
            Masukkan 6 digit kode OTP yang dikirimkan ke <strong>{phone}</strong>
          </p>
        </div>

        {/* Dev OTP Bypass Notice */}
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 text-left flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Mode Pengujian / Dev Bypass:</strong>
            <p className="text-[11px] text-amber-700 mt-0.5">
              Gunakan kode OTP <code className="font-bold bg-amber-100 px-1 py-0.5 rounded">123456</code> untuk bypass tanpa pulsa SMS.
            </p>
          </div>
        </div>

        {/* OTP Inputs */}
        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex justify-center gap-2 sm:gap-3">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                id={`otp-${idx}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChangeOtp(idx, e.target.value)}
                className="w-11 h-13 text-center text-xl font-bold rounded-xl border border-surface-border focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none transition-all"
              />
            ))}
          </div>

          {errorMsg && (
            <p className="text-xs font-semibold text-rose-600 animate-shake">{errorMsg}</p>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Verifikasi Berhasil! Menyiapkan struktur data awal...</span>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isVerifying}
            disabled={otp.join('').length < 6 || success}
          >
            <span>Verifikasi &amp; Masuk</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </form>

        <button
          type="button"
          onClick={() => {
            setOtp(['1', '2', '3', '4', '5', '6']);
          }}
          className="text-xs font-bold text-brand-600 hover:underline"
        >
          Isi Otomatis Kode Bypass (123456)
        </button>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    }>
      <VerifyOtpContent />
    </Suspense>
  );
}
