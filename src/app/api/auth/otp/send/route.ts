import { NextRequest, NextResponse } from 'next/server';
import { createAndStoreOtp } from '@/lib/auth/otp-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, email } = body;
    const identifier = (phone || email || '').trim();

    if (!identifier) {
      return NextResponse.json(
        { ok: false, error: 'Nomor handphone atau email wajib diisi.' },
        { status: 400 }
      );
    }

    const result = await createAndStoreOtp(identifier);

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error, cooldownSeconds: result.cooldownSeconds },
        { status: 429 } // Rate Limited
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'Kode OTP 6-digit berhasil dikirimkan ke kontak Anda.',
      expiresAt: result.expiresAt,
      cooldownSeconds: result.cooldownSeconds,
      // Di dev environment, kita juga sediakan petunjuk aman jika SMS gateway belum terpasang
      devHint: process.env.NODE_ENV !== 'production' ? result.otpCode : undefined,
    });
  } catch (error: any) {
    console.error('Error in /api/auth/otp/send:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Terjadi kesalahan pada server saat mengirim OTP.' },
      { status: 500 }
    );
  }
}
