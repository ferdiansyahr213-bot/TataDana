import { NextRequest, NextResponse } from 'next/server';
import { verifyUserOtp } from '@/lib/auth/otp-service';
import { serverStore } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, email, otp, registrationData } = body;
    const identifier = (phone || email || '').trim();

    if (!identifier || !otp) {
      return NextResponse.json(
        { ok: false, error: 'Kontak dan kode OTP 6-digit wajib diisi.' },
        { status: 400 }
      );
    }

    // 1. Verifikasi kode OTP secara kriptografis & rate-limited
    const verifyResult = await verifyUserOtp(identifier, otp);

    if (!verifyResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: verifyResult.error,
          remainingAttempts: verifyResult.remainingAttempts,
        },
        { status: 400 }
      );
    }

    // 2. Kode valid! Daftarkan atau ambil profil user
    let user = serverStore.getUserByPhone(identifier);
    const cleanEmail = (registrationData?.email || email || '').trim().toLowerCase();
    const isSuperadmin = cleanEmail === 'ferdiansyahr213@gmail.com';

    if (!user && registrationData) {
      user = serverStore.registerNewUser({
        fullName: registrationData.fullName || 'Pengguna TataDana',
        phone: identifier,
        email: cleanEmail || `${identifier}@tatadana.id`,
      });
    }

    if (!user) {
      user = serverStore.users.get('usr_demo_123');
    }

    // Pastikan status verifikasi email sesuai aturan:
    // Admin langsung 'verified', user biasa 'pending'
    if (user) {
      user.verification_status = isSuperadmin ? 'verified' : (user.verification_status || 'pending');
      user.role = isSuperadmin ? 'superadmin' : (user.role || 'user');
    }

    return NextResponse.json({
      ok: true,
      message: 'Verifikasi kode OTP berhasil!',
      user,
      sessionToken: `tk_${Date.now()}_${Buffer.from(identifier).toString('base64')}`,
    });
  } catch (error: any) {
    console.error('Error in /api/auth/otp/verify:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Terjadi kesalahan pada server saat verifikasi OTP.' },
      { status: 500 }
    );
  }
}
