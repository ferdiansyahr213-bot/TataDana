/**
 * WhatsApp Helper Utilities for TataDana
 * Handles normalization and URL creation for Admin approval and communications.
 */

export function normalizeWaNumber(phone?: string | null): string {
  if (!phone) return '6287730370324';
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  } else if (!clean.startsWith('62') && clean.length > 0) {
    clean = '62' + clean;
  }
  return clean || '6287730370324';
}

export function getAdminWaNumber(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('admin_wa_number') || sessionStorage.getItem('admin_wa_number');
    if (stored && stored.trim()) return normalizeWaNumber(stored);
  }
  const envNumber =
    process.env.NEXT_PUBLIC_ADMIN_WA_NUMBER ||
    process.env.NEXT_PUBLIC_ADMIN_WA ||
    '087730370324';
  return normalizeWaNumber(envNumber);
}

export function getAdminWaDisplayNumber(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('admin_wa_number') || sessionStorage.getItem('admin_wa_number');
    if (stored && stored.trim()) return stored.trim();
  }
  const raw =
    process.env.NEXT_PUBLIC_ADMIN_WA_NUMBER ||
    process.env.NEXT_PUBLIC_ADMIN_WA ||
    '087730370324';
  return raw.trim();
}

/**
 * Creates WhatsApp registration / onboarding inquiry URL for prospective or first-time users:
 * https://wa.me/<NOMOR_ADMIN>?text=...
 */
export function getAdminRegisterWaUrl(params?: {
  fullName?: string;
  email?: string;
  phone?: string;
}): string {
  return getAdminApprovalWaUrl({
    fullName: params?.fullName,
    email: params?.email,
    phone: params?.phone,
  });
}

/**
 * Creates WhatsApp approval URL for newly registered users requesting activation:
 * https://wa.me/<NOMOR_ADMIN>?text=...
 */
export function getAdminApprovalWaUrl(params: {
  fullName?: string;
  email?: string;
  phone?: string;
}): string {
  const adminNumber = getAdminWaNumber();
  const name = params.fullName?.trim() || '-';
  const email = params.email?.trim() || '-';
  const phone = params.phone?.trim() || '-';

  const message = `Halo Admin *TataDana*,

Saya telah melakukan pendaftaran akun dan mohon bantuan untuk persetujuan (aktivasi) akun saya.

*Detail Akun Pengguna:*
• Nama: ${name}
• Email: ${email}
• No. HP: ${phone}
• Keperluan: Persetujuan & Aktivasi Akun

Mohon konfirmasinya apabila akun saya sudah disetujui. Terima kasih!`;

  return `https://wa.me/${adminNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * Creates WhatsApp Pro Upgrade URL matching the required pattern:
 * https://wa.me/<NOMOR_ADMIN>?text=...
 */
export function getAdminUpgradeProWaUrl(params: {
  fullName?: string;
  email?: string;
  userId?: string;
}): string {
  const adminNumber = getAdminWaNumber();
  
  let rawName = params.fullName?.trim() || '';
  let rawEmail = params.email?.trim() || '';
  let rawUserId = params.userId?.trim() || '';

  // Filter out third-party dummy placeholder names
  if (
    rawName === 'Vina Al Fitriansyah' ||
    rawName === 'Pengguna TataDana' ||
    rawName === 'Budi Santoso' ||
    rawName === 'Test Pending User'
  ) {
    rawName = '';
  }

  // Filter out dummy IDs
  if (
    rawUserId === 'usr_demo_123' ||
    rawUserId === 'usr_demo_456' ||
    rawUserId === 'usr_admin_999'
  ) {
    rawUserId = '';
  }

  // Safe fallback for Name: derive from email if full name is missing
  let name = rawName;
  if (!name && rawEmail && rawEmail.includes('@')) {
    const prefix = rawEmail.split('@')[0];
    name = prefix ? (prefix.charAt(0).toUpperCase() + prefix.slice(1)) : rawEmail;
  }
  if (!name) {
    name = 'Pengguna';
  }

  // Safe fallback for Email
  const email = rawEmail || '-';

  // Safe fallback for User ID
  let userId = rawUserId;
  if (!userId && rawEmail && rawEmail !== '-') {
    userId = rawEmail;
  } else if (!userId) {
    userId = '-';
  }

  const message = `Halo Admin TataDana, saya ingin upgrade akun ke paket Pro.

Detail Akun:
- Nama: ${name}
- Email: ${email}
- ID Akun: ${userId}
- Paket: TataDana Pro Bulanan

Mohon informasi instruksi pembayaran / nomor rekening untuk aktivasi. Terima kasih!`;

  return `https://wa.me/${adminNumber}?text=${encodeURIComponent(message)}`;
}
