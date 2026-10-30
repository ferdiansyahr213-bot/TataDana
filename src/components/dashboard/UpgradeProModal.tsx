'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { getAdminUpgradeProWaUrl, getAdminWaDisplayNumber } from '@/lib/utils/whatsapp';
import { supabase } from '@/lib/supabase/client';
import { getCurrentUserProfile } from '@/lib/supabase/data-service';
import { sanitizeUserDisplayName, sanitizeUserId } from '@/lib/auth/user-sanitize';
import { 
  Sparkles, 
  Check, 
  Zap, 
  Infinity as InfinityIcon, 
  Bot, 
  Clock, 
  ShieldCheck,
  MessageCircle,
  ExternalLink,
  User,
  Mail,
  Fingerprint
} from 'lucide-react';

interface UpgradeProModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: {
    id?: string;
    fullName?: string;
    email?: string;
    phone?: string;
  } | null;
}

export const UpgradeProModal: React.FC<UpgradeProModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  const [userInfo, setUserInfo] = React.useState({
    fullName: '',
    email: '',
    id: '',
  });

  // Resolve active logged-in user dynamically without hardcoded dummy fallbacks
  React.useEffect(() => {
    let isCancelled = false;

    async function resolveActiveUser() {
      let rawName = user?.fullName || '';
      let rawEmail = user?.email || '';
      let rawId = user?.id || '';

      // 1. Cek Supabase Auth jika ada nilai yang belum lengkap
      if (!rawEmail || !rawId) {
        try {
          if (supabase) {
            const { data } = await supabase.auth.getUser();
            if (data?.user) {
              const u = data.user;
              if (!rawEmail) rawEmail = u.email || '';
              if (!rawId) rawId = u.id || '';
              const meta = u.user_metadata || {};
              if (!rawName) rawName = meta.full_name || meta.name || '';
            }
          }
        } catch {
          // ignore
        }
      }

      // 2. Cek SessionStorage & URL impersonate/userId
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const queryId = params.get('userId') || params.get('impersonate');

        if (!rawId) rawId = queryId || sessionStorage.getItem('current_user_id') || sessionStorage.getItem('user_id') || '';
        if (!rawEmail) rawEmail = sessionStorage.getItem('user_email') || '';
        if (!rawName) rawName = sessionStorage.getItem('user_name') || '';
      }

      // 3. Jika ada ID, ambil profil backend terkini untuk sinkronisasi data terbaru
      if (rawId && (!rawName || !rawEmail)) {
        try {
          const profile = await getCurrentUserProfile(rawId);
          if (profile) {
            if (!rawEmail && profile.email) rawEmail = profile.email;
            if (!rawName && profile.full_name) rawName = profile.full_name;
          }
        } catch {
          // ignore
        }
      }

      // 4. Terapkan fallback aman sesuai instruksi:
      // Gunakan email user yang sedang login atau nilai valid (bukan nama contoh orang lain)
      const resolvedName = sanitizeUserDisplayName(rawName, rawEmail);
      const resolvedId = sanitizeUserId(rawId, rawEmail) || (rawEmail || '-');

      if (!isCancelled) {
        setUserInfo({
          fullName: resolvedName,
          email: rawEmail || '',
          id: resolvedId,
        });
      }
    }

    if (isOpen) {
      resolveActiveUser();
    }

    return () => {
      isCancelled = true;
    };
  }, [user, isOpen]);

  const waUrl = getAdminUpgradeProWaUrl({
    fullName: userInfo.fullName,
    email: userInfo.email,
    userId: userInfo.id,
  });

  const adminDisplayNumber = getAdminWaDisplayNumber();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upgrade ke TataDana Pro"
      description="Nikmati pencatatan keuangan tanpa batas dan fitur asisten AI pintar"
      maxWidth="md"
    >
      <div className="space-y-5 p-1">
        {/* Banner Harga & Badge */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-brand-700 p-5 text-white shadow-lg">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-28 w-28 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Paket Langganan Rekomendasi</span>
              </div>
              <h4 className="text-xl font-black tracking-tight">TataDana Pro Bulanan</h4>
              <p className="text-xs text-blue-100 mt-0.5">
                Investasi terbaik untuk kendali finansial pribadi dan bisnis Anda.
              </p>
            </div>
            <div className="text-left sm:text-right bg-white/10 sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none">
              <span className="text-xs text-blue-200 block font-medium">Biaya Berlangganan</span>
              <div className="text-2xl sm:text-3xl font-black text-white">
                Rp49.000 <span className="text-xs font-normal text-blue-200">/ bulan</span>
              </div>
            </div>
          </div>
        </div>

        {/* Keuntungan Pro */}
        <div className="space-y-3">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
            Keuntungan Eksklusif Akun Pro:
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Benefit 1 */}
            <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-blue-300 transition-all space-y-1.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <InfinityIcon className="w-4 h-4" />
              </div>
              <h6 className="text-xs font-bold text-slate-900 leading-snug">
                Limit & Dompet Unlimited
              </h6>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Bebas catat transaksi tanpa batas kuota bulanan. Tambah dompet & kategori budget sepuasnya.
              </p>
            </div>

            {/* Benefit 2 */}
            <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-indigo-300 transition-all space-y-1.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <Bot className="w-4 h-4" />
              </div>
              <h6 className="text-xs font-bold text-slate-900 leading-snug">
                Fitur Tata AI Lengkap
              </h6>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Analisis pengeluaran cerdas, financial advisor otomatis, dan integrasi penuh Telegram Bot.
              </p>
            </div>

            {/* Benefit 3 */}
            <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-emerald-300 transition-all space-y-1.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Zap className="w-4 h-4" />
              </div>
              <h6 className="text-xs font-bold text-slate-900 leading-snug">
                Proses Prioritas Cepat
              </h6>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Jalur pemrosesan prioritas tanpa antrean, sinkronisasi instan, dan dukungan pelanggan cepat.
              </p>
            </div>
          </div>
        </div>

        {/* Ringkasan Data Akun Pengguna */}
        <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Detail Akun Pemohon (Otomatis Masuk ke Pesan WhatsApp):</span>
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <div className="truncate">
                <span className="text-[10px] text-slate-400 block">Nama</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {userInfo.fullName}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <div className="truncate">
                <span className="text-[10px] text-slate-400 block">Email</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {userInfo.email || '-'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
              <Fingerprint className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <div className="truncate">
                <span className="text-[10px] text-slate-400 block">ID Akun</span>
                <span className="font-mono font-semibold text-slate-800 truncate block">
                  {userInfo.id}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tombol Aksi WhatsApp Hijau */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-1/3 order-2 sm:order-1 text-slate-600 border-slate-200 hover:bg-slate-50 text-xs"
          >
            Batal
          </Button>

          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-2/3 order-1 sm:order-2 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-md shadow-emerald-600/25 transition-all transform hover:-translate-y-0.5"
            onClick={() => {
              // Optional callback or close
              setTimeout(onClose, 500);
            }}
          >
            <MessageCircle className="w-5 h-5 fill-current" />
            <span>Chat Admin WhatsApp untuk Aktivasi</span>
            <ExternalLink className="w-4 h-4 opacity-80" />
          </a>
        </div>

        <p className="text-[11px] text-center text-slate-400">
          Admin WhatsApp aktif di <strong className="text-slate-600">{adminDisplayNumber}</strong>. Pesan konfirmasi pembayaran akan otomatis terisi saat WhatsApp terbuka.
        </p>
      </div>
    </Modal>
  );
};
