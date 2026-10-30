'use client';

import React, { useState } from 'react';
import { ShieldAlert, RefreshCw, MessageSquare, ExternalLink, CheckCircle2, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getAdminApprovalWaUrl, getAdminWaDisplayNumber } from '@/lib/utils/whatsapp';

export interface PendingVerificationModalProps {
  fullName?: string;
  email?: string;
  phone?: string;
  userId?: string;
  onVerified?: () => void;
  onClose?: () => void;
}

export const PendingVerificationModal: React.FC<PendingVerificationModalProps> = ({
  fullName,
  email,
  phone,
  userId,
  onVerified,
  onClose,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'info' | 'warning' } | null>(null);

  // Generates link: https://wa.me/<NOMOR_ADMIN>?text=Halo%20Admin%20TataDana,%20saya%20ingin%20mengajukan%20persetujuan%20akun%20atas%20nama%20[Nama]%20-%20[Email]
  const waUrl = getAdminApprovalWaUrl({
    fullName,
    email,
    phone,
  });

  const adminDisplayNumber = getAdminWaDisplayNumber();

  const handleCheckStatus = async () => {
    setIsChecking(true);
    setStatusMessage(null);

    try {
      const queryParam = userId
        ? `userId=${encodeURIComponent(userId)}`
        : email
        ? `email=${encodeURIComponent(email)}`
        : '';
      const res = await fetch(`/api/data?${queryParam}`);
      const data = await res.json();

      let targetUser = data.user;
      if (!targetUser && Array.isArray(data.allUsers)) {
        targetUser = data.allUsers.find(
          (u: any) =>
            (userId && u.id === userId) ||
            (email && u.email?.toLowerCase() === email.toLowerCase()) ||
            (phone && u.phone_number === phone)
        );
      }

      if (targetUser && targetUser.verification_status === 'verified') {
        sessionStorage.setItem('user_verification_status', 'verified');
        sessionStorage.setItem('current_user_id', targetUser.id);
        setStatusMessage({
          text: 'Selamat! Akun Anda telah disetujui & diverifikasi oleh Admin. Membuka akses...',
          type: 'success',
        });
        setTimeout(() => {
          if (onVerified) {
            onVerified();
          } else {
            window.location.href = '/dashboard';
          }
        }, 1200);
        return;
      }

      setStatusMessage({
        text: 'Akun Anda masih dalam status pending (menunggu persetujuan admin). Silakan hubungi admin via WhatsApp di bawah.',
        type: 'warning',
      });
    } catch (err) {
      setStatusMessage({
        text: 'Gagal mengecek status persetujuan. Silakan coba lagi.',
        type: 'warning',
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 text-center space-y-6 relative overflow-hidden">
        {/* Top Accent Ring */}
        <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-amber-400/20 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 rounded-full bg-brand-500/10 blur-2xl pointer-events-none" />

        {/* Close Button if provided */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Warning Icon Badge */}
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Menunggu Persetujuan Admin</span>
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Persetujuan Akun TataDana
          </h2>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm font-semibold leading-relaxed">
            Akun Anda sedang menunggu persetujuan admin sebelum dapat digunakan.
          </div>
        </div>

        {/* User Identity Preview */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-left space-y-1.5">
          {fullName && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Nama:</span>
              <span className="font-bold text-slate-800 text-xs">{fullName}</span>
            </div>
          )}
          {email && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Email:</span>
              <span className="font-mono font-semibold text-slate-800 text-xs truncate max-w-[220px]">
                {email}
              </span>
            </div>
          )}
          {phone && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">WhatsApp / HP:</span>
              <span className="font-mono font-semibold text-slate-800 text-xs">{phone}</span>
            </div>
          )}
        </div>

        {/* Status Message Notification */}
        {statusMessage && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 text-left ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border border-amber-200 text-amber-800'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <p className="text-[11px] leading-relaxed">{statusMessage.text}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          {/* Main WhatsApp CTA Button */}
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/25 transition-all transform hover:-translate-y-0.5"
          >
            <MessageSquare className="w-4 h-4 fill-white" />
            <span>Hubungi Admin via WhatsApp</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </a>

          {/* Check Verification Status Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full border-slate-200 hover:bg-slate-100 text-slate-700 text-xs py-2.5"
            onClick={handleCheckStatus}
            isLoading={isChecking}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />}
          >
            <span>Cek Status Persetujuan</span>
          </Button>
        </div>

        <p className="text-[11px] text-slate-400">
          Nomor WhatsApp Admin: <span className="font-mono font-semibold text-slate-600">{adminDisplayNumber}</span>.
          Admin akan segera menyetujui akun Anda setelah pesan dikonfirmasi.
        </p>
      </div>
    </div>
  );
};
