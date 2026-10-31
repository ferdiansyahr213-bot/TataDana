import { NextRequest, NextResponse } from 'next/server';
import { serverStore } from '@/lib/supabase/server';
import { supabase, isLiveSupabaseConfigured } from '@/lib/supabase/client';
import { normalizePhoneNumber, checkUserDuplicateInDb } from '@/lib/storage/local-db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, phone, email, password } = body || {};

    const cleanName = (fullName || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const stdPhone = normalizePhoneNumber(phone);

    if (!cleanName || !password || !cleanEmail || !stdPhone) {
      return NextResponse.json(
        { ok: false, error: 'Semua kolom pendaftaran (nama lengkap, no. HP, email, kata sandi) wajib diisi.' },
        { status: 400 }
      );
    }

    // 1. Pengecekan Duplikasi Email
    const emailDup = serverStore.getUserByEmail(cleanEmail) || checkUserDuplicateInDb(cleanEmail, undefined).isDuplicate;
    if (emailDup) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Email ini sudah terdaftar. Silakan gunakan email lain atau masuk ke akun Anda.',
          field: 'email',
        },
        { status: 409 }
      );
    }

    // 2. Pengecekan Duplikasi Nomor Handphone (Format 08... dan +628...)
    const phoneDup = serverStore.getUserByPhone(stdPhone) || checkUserDuplicateInDb(undefined, stdPhone).isDuplicate;
    if (phoneDup) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Nomor handphone ini sudah terdaftar. Silakan gunakan nomor lain atau masuk ke akun Anda.',
          field: 'phone',
        },
        { status: 409 }
      );
    }

    // 3. Simpan akun baru secara permanen di SQLite & ServerStore
    const newUser = serverStore.registerNewUser({
      fullName: cleanName,
      phone: stdPhone,
      email: cleanEmail,
      password,
    });

    // Mirror ke live Supabase jika kredensial aktif
    if (isLiveSupabaseConfigured()) {
      try {
        await supabase.from('user_approvals').insert([
          {
            full_name: newUser.full_name,
            email: newUser.email,
            phone_number: newUser.phone_number,
            status: newUser.verification_status === 'verified' ? 'approved' : 'pending',
          },
        ]);
      } catch (sbErr) {
        console.warn('[Auth Register] Supabase live mirror notice:', sbErr);
      }
    }

    return NextResponse.json(
      {
        ok: true,
        status: newUser.verification_status,
        message: newUser.verification_status === 'pending'
          ? 'Akun Anda sedang menunggu persetujuan admin sebelum dapat digunakan.'
          : 'Pendaftaran akun berhasil!',
        user: newUser,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[Auth Register] Exception:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Terjadi kesalahan sistem saat registrasi.' },
      { status: 409 }
    );
  }
}
