import crypto from 'crypto';
import { supabase } from '../supabase/client';

export interface OtpRecord {
  id: string;
  identifier: string; // phone number or email
  otp_hash: string;
  attempts: number;
  max_attempts: number;
  status: 'pending' | 'verified' | 'expired';
  expires_at: string;
  created_at: string;
}

// In-memory fallback store for serverless/local development when DB connection is offline
const inMemoryOtpStore = new Map<string, OtpRecord>();

const OTP_SECRET = process.env.OTP_SECRET || 'tatadana_production_otp_secret_key_2026';
const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 3;
const COOLDOWN_SECONDS = 60;

/**
 * Hash kode OTP menggunakan HMAC-SHA256 untuk keamanan cryptographic
 */
export function hashOtp(otp: string, salt: string = OTP_SECRET): string {
  return crypto.createHmac('sha256', salt).update(otp).digest('hex');
}

/**
 * Generate 6-digit OTP acak kriptografis
 */
export function generateCryptographicOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Format nomor telepon Indonesia ke format internasional (E.164 / 62)
 */
export function formatIndonesianPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

/**
 * Integrasi Provider Pengiriman WhatsApp / SMS asli: Fonnte (Indonesia-friendly)
 * Endpoint: https://api.fonnte.com/send
 */
export async function sendOtpViaProvider(
  phoneOrEmail: string,
  otpCode: string
): Promise<{ success: boolean; message: string; provider: string }> {
  const isEmail = phoneOrEmail.includes('@');
  const fonnteToken = process.env.FONNTE_API_TOKEN;
  const resendApiKey = process.env.RESEND_API_KEY;
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;

  const otpMessage = `*TataDana* - Kode Verifikasi Anda adalah: *${otpCode}*\n\nKode berlaku selama ${OTP_EXPIRY_MINUTES} menit. JANGAN bagikan kode ini kepada siapapun demi keamanan akun keuangan Anda.`;

  // 1. WhatsApp Delivery via Fonnte API (Sangat ramah developer di Indonesia)
  if (!isEmail && fonnteToken) {
    try {
      const formattedPhone = formatIndonesianPhone(phoneOrEmail);
      const res = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          Authorization: fonnteToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: formattedPhone,
          message: otpMessage,
          countryCode: '62',
        }),
      });

      const data = await res.json();
      if (data.status) {
        return { success: true, message: 'OTP terkirim via WhatsApp Fonnte', provider: 'fonnte' };
      }
      console.warn('Fonnte warning:', data);
    } catch (e: any) {
      console.error('Fonnte API error:', e);
    }
  }

  // 2. Email Delivery via Resend API (Jika pengguna mendaftar via email)
  if (isEmail && resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'TataDana Auth <auth@tatadana.id>',
          to: phoneOrEmail,
          subject: `${otpCode} adalah Kode Verifikasi TataDana Anda`,
          html: `<div style="font-family:sans-serif;padding:24px;border:1px solid #e2e8f0;border-radius:16px;">
            <h2 style="color:#0284c7;">TataDana Keuangan</h2>
            <p>Kode OTP verifikasi akun Anda:</p>
            <h1 style="font-size:32px;letter-spacing:4px;color:#0f172a;">${otpCode}</h1>
            <p style="color:#64748b;font-size:12px;">Berlaku selama ${OTP_EXPIRY_MINUTES} menit. Abaikan jika Anda tidak meminta kode ini.</p>
          </div>`,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        return { success: true, message: 'OTP terkirim via Email Resend', provider: 'resend' };
      }
      console.warn('Resend warning:', data);
    } catch (e: any) {
      console.error('Resend API error:', e);
    }
  }

  // 3. SMS Delivery via Twilio API (Fallback alternatif internasional)
  if (!isEmail && twilioAccountSid && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    try {
      const formattedPhone = '+' + formatIndonesianPhone(phoneOrEmail);
      const authHeader = Buffer.from(`${twilioAccountSid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
      const params = new URLSearchParams();
      params.append('To', formattedPhone);
      params.append('From', process.env.TWILIO_PHONE_NUMBER);
      params.append('Body', `TataDana OTP: ${otpCode}. Berlaku ${OTP_EXPIRY_MINUTES} menit.`);

      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (res.ok) {
        return { success: true, message: 'OTP terkirim via Twilio SMS', provider: 'twilio' };
      }
    } catch (e: any) {
      console.error('Twilio API error:', e);
    }
  }

  // 4. Secure Development Fallback (Ketika API token pihak ketiga belum diisi di .env lokal)
  console.log(`\n========================================`);
  console.log(`[SECURE OTP SERVICE] Penerima: ${phoneOrEmail}`);
  console.log(`[SECURE OTP SERVICE] Kode OTP Terbuat: >>> ${otpCode} <<<`);
  console.log(`[SECURE OTP SERVICE] Kadaluarsa: ${OTP_EXPIRY_MINUTES} menit`);
  console.log(`========================================\n`);

  return {
    success: true,
    message: 'OTP berhasil digenerate (Mode simulasi aktif jika API keys belum diset)',
    provider: 'local_dev',
  };
}

/**
 * Menyimpan OTP baru ke Database dan memeriksa Rate Limiting Cooldown
 */
export async function createAndStoreOtp(identifier: string): Promise<{
  ok: boolean;
  error?: string;
  cooldownSeconds?: number;
  otpCode?: string;
  expiresAt?: string;
}> {
  const cleanId = identifier.trim().toLowerCase();
  const now = new Date();

  // Cek Cooldown (minimal 60 detik sebelum kirim ulang)
  const existing = inMemoryOtpStore.get(cleanId);
  if (existing && existing.status === 'pending') {
    const timeSinceCreated = (now.getTime() - new Date(existing.created_at).getTime()) / 1000;
    if (timeSinceCreated < COOLDOWN_SECONDS) {
      const waitTime = Math.ceil(COOLDOWN_SECONDS - timeSinceCreated);
      return {
        ok: false,
        error: `Harap tunggu ${waitTime} detik sebelum meminta kode OTP baru.`,
        cooldownSeconds: waitTime,
      };
    }
  }

  // Buat kode OTP acak 6 digit
  const otpCode = generateCryptographicOtp();
  const otpHash = hashOtp(otpCode);
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

  const newRecord: OtpRecord = {
    id: `otp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    identifier: cleanId,
    otp_hash: otpHash,
    attempts: 0,
    max_attempts: MAX_ATTEMPTS,
    status: 'pending',
    expires_at: expiresAt,
    created_at: now.toISOString(),
  };

  // Simpan ke in-memory store
  inMemoryOtpStore.set(cleanId, newRecord);

  // Simpan ke Supabase jika terkonfigurasi
  try {
    if (supabase) {
      await supabase.from('otps').insert({
        identifier: cleanId,
        otp_hash: otpHash,
        attempts: 0,
        max_attempts: MAX_ATTEMPTS,
        status: 'pending',
        expires_at: expiresAt,
      });
    }
  } catch (err) {
    // Non-blocking fallback to in-memory
  }

  // Kirim via Provider asli (Fonnte / Resend / Twilio)
  await sendOtpViaProvider(cleanId, otpCode);

  return {
    ok: true,
    otpCode,
    expiresAt,
    cooldownSeconds: COOLDOWN_SECONDS,
  };
}

/**
 * Memverifikasi kode OTP yang dimasukkan pengguna
 */
export async function verifyUserOtp(
  identifier: string,
  userEnteredOtp: string
): Promise<{ ok: boolean; error?: string; remainingAttempts?: number }> {
  const cleanId = identifier.trim().toLowerCase();
  const enteredClean = userEnteredOtp.trim();
  const now = new Date();

  const record = inMemoryOtpStore.get(cleanId);

  if (!record || record.status !== 'pending') {
    return { ok: false, error: 'Tidak ada kode OTP aktif untuk akun ini. Silakan minta kode baru.' };
  }

  // 1. Cek masa kedaluwarsa (3-5 menit)
  if (now > new Date(record.expires_at)) {
    record.status = 'expired';
    return { ok: false, error: 'Kode OTP telah kedaluwarsa. Silakan minta kode baru.' };
  }

  // 2. Cek batas percobaan (Rate Limiting Max 3 Attempts)
  if (record.attempts >= record.max_attempts) {
    record.status = 'expired';
    return { ok: false, error: 'Batas percobaan OTP terlampaui. Silakan minta kode OTP baru.' };
  }

  // 3. Verifikasi hash menggunakan timing-safe comparison
  const calculatedHash = hashOtp(enteredClean);
  const isValid = crypto.timingSafeEqual(
    Buffer.from(calculatedHash, 'hex'),
    Buffer.from(record.otp_hash, 'hex')
  );

  if (!isValid) {
    record.attempts += 1;
    const remaining = record.max_attempts - record.attempts;
    if (remaining <= 0) {
      record.status = 'expired';
      return { ok: false, error: 'Kode OTP salah. Batas percobaan habis. Silakan minta kode baru.' };
    }
    return {
      ok: false,
      error: `Kode OTP salah. Sisa kesempatan mencoba: ${remaining} kali.`,
      remainingAttempts: remaining,
    };
  }

  // Validasi Berhasil
  record.status = 'verified';

  // Update status di Supabase
  try {
    if (supabase) {
      await supabase
        .from('otps')
        .update({ status: 'verified', updated_at: now.toISOString() })
        .eq('identifier', cleanId)
        .eq('status', 'pending');
    }
  } catch (e) {
    // Graceful fallback
  }

  return { ok: true };
}
