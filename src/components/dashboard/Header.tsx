'use client';

import React, { useState } from 'react';
import { formatWIBDateTime } from '@/lib/utils/date-wib';
import { PlusCircle, Bell, Sparkles, Camera, CheckCircle2, Menu } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { UpgradeProModal } from './UpgradeProModal';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onQuickAdd?: () => void;
  onUpgradeClick?: () => void;
  userPlan?: string;
  user?: {
    id?: string;
    fullName?: string;
    email?: string;
    phone?: string;
  } | null;
}

export const Header: React.FC<HeaderProps> = ({ 
  title, 
  subtitle, 
  onQuickAdd,
  onUpgradeClick,
  userPlan,
  user,
}) => {
  const currentWib = formatWIBDateTime();
  const [isCapturing, setIsCapturing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const handleTakeScreenshot = async () => {
    try {
      setIsCapturing(true);
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        scrollX: 0,
        scrollY: 0,
        scale: 1.5,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const now = new Date();
      const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
      link.download = `tatadana-screenshot-${ts}.png`;
      link.href = dataUrl;
      link.click();
      setToastMsg('Tangkapan layar web berhasil diunduh!');
      setTimeout(() => setToastMsg(null), 3000);
    } catch (e: any) {
      console.error(e);
      alert('Gagal mengambil screenshot: ' + (e?.message || 'Error'));
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-3.5 sm:py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 sticky top-0 z-20">
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <div className="flex items-center gap-2.5">
          {/* Hamburger Menu Button (Layar Mobile) */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('open-mobile-sidebar'));
              }
            }}
            className="md:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 shadow-2xs"
            aria-label="Buka menu navigasi"
            title="Buka menu samping"
          >
            <Menu className="w-5 h-5 text-slate-700" />
          </button>

          <div>
            <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">{title}</h1>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              {subtitle || `Waktu sekarang: ${currentWib}`}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
        {toastMsg && (
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-1.5 animate-fadeIn">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{toastMsg}</span>
          </div>
        )}

        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200/60 text-xs font-medium text-brand-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Telegram Synced</span>
        </div>

        {/* Tombol Screenshot Web per permintaan user */}
        <Button
          onClick={handleTakeScreenshot}
          variant="outline"
          size="sm"
          isLoading={isCapturing}
          leftIcon={<Camera className="w-4 h-4 text-brand-600" />}
          className="text-xs border-slate-200 text-slate-700 hover:text-brand-600 hover:border-brand-300"
          title="Ambil tangkapan layar web TataDana dan unduh sebagai gambar PNG"
        >
          <span>Screenshot Web</span>
        </Button>

        {/* Tombol Upgrade ke Pro */}
        {userPlan !== 'pro' && (
          <Button
            onClick={onUpgradeClick || (() => setIsUpgradeModalOpen(true))}
            variant="outline"
            size="sm"
            leftIcon={<Sparkles className="w-4 h-4 text-amber-500 fill-amber-500/20" />}
            className="text-xs font-bold border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100 text-amber-900 hover:from-amber-100 hover:to-orange-200 shadow-xs transition-all"
            title="Upgrade ke TataDana Pro via WhatsApp Admin"
          >
            <span>Upgrade ke Pro</span>
          </Button>
        )}

        {onQuickAdd && (
          <Button
            onClick={onQuickAdd}
            variant="primary"
            size="sm"
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            Catat Cepat
          </Button>
        )}
      </div>

      <UpgradeProModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        user={user}
      />
    </header>
  );
};
