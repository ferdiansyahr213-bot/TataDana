'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, ArrowRight, CheckCircle2, Briefcase, GraduationCap, Laptop, Store, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId') || 'usr_demo_123';

  const [selectedPersona, setSelectedPersona] = useState<'karyawan' | 'mahasiswa' | 'freelancer' | 'bisnis'>('karyawan');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const personas = [
    {
      id: 'karyawan',
      title: 'Karyawan Swasta',
      subtitle: 'Gaji tetap bulanan, makan siang kantor, bensin/ojol, tagihan rumah & utilitas',
      icon: Briefcase,
      recommended: [
        { emoji: '🍜', name: 'Makanan & Makan Siang', color: '#f97316' },
        { emoji: '🚗', name: 'Transportasi & Bensin', color: '#0284c7' },
        { emoji: '🏠', name: 'Tagihan Listrik & Wifi', color: '#ef4444' },
        { emoji: '🎮', name: 'Hiburan Akhir Pekan', color: '#8b5cf6' },
        { emoji: '💊', name: 'Kesehatan & Vitamin', color: '#10b981' },
        { emoji: '👕', name: 'Belanja Keperluan', color: '#ec4899' },
        { emoji: '💼', name: 'Gaji Pokok', color: '#10b981' },
        { emoji: '💰', name: 'Bonus & Insentif', color: '#f97316' },
      ],
    },
    {
      id: 'mahasiswa',
      title: 'Mahasiswa / Pelajar',
      subtitle: 'Uang saku bulanan, kosan, makan harian, fotokopi/kuliah, nongkrong kafe',
      icon: GraduationCap,
      recommended: [
        { emoji: '🍜', name: 'Makan & Minum Harian', color: '#f97316' },
        { emoji: '🏠', name: 'Kosan & Tagihan Air', color: '#ef4444' },
        { emoji: '📚', name: 'Fotokopi & Buku Kuliah', color: '#f59e0b' },
        { emoji: '☕', name: 'Nongkrong & Kafe', color: '#8b5cf6' },
        { emoji: '🛵', name: 'Bensin & Ojol Kampus', color: '#0284c7' },
        { emoji: '💰', name: 'Uang Saku & Kiriman', color: '#10b981' },
        { emoji: '🎓', name: 'Beasiswa & Part-Time', color: '#6366f1' },
      ],
    },
    {
      id: 'freelancer',
      title: 'Freelancer & Kreator',
      subtitle: 'Penghasilan project tidak tetap, kuota internet, co-working space, langganan tools',
      icon: Laptop,
      recommended: [
        { emoji: '🍜', name: 'Makan Harian', color: '#f97316' },
        { emoji: '💻', name: 'Internet & Co-Working', color: '#0284c7' },
        { emoji: '⚡', name: 'Langganan Software & Tools', color: '#8b5cf6' },
        { emoji: '🚗', name: 'Transportasi Meeting Klien', color: '#10b981' },
        { emoji: '💰', name: 'Fee Project Klien', color: '#10b981' },
        { emoji: '📈', name: 'Royalti & Digital Product', color: '#f59e0b' },
      ],
    },
    {
      id: 'bisnis',
      title: 'Wirausaha / UMKM',
      subtitle: 'Omzet harian, belanja modal bahan baku, operasional toko, ongkir & logistik',
      icon: Store,
      recommended: [
        { emoji: '📦', name: 'Belanja Bahan & Stok', color: '#f97316' },
        { emoji: '🏬', name: 'Operasional & Toko', color: '#ef4444' },
        { emoji: '🚚', name: 'Ongkir & Logistik', color: '#0284c7' },
        { emoji: '📣', name: 'Iklan & Promosi Digital', color: '#8b5cf6' },
        { emoji: '💰', name: 'Omset Penjualan Harian', color: '#10b981' },
        { emoji: '💼', name: 'Pemasukan Lainnya', color: '#10b981' },
      ],
    },
  ];

  const currentPersona = personas.find((p) => p.id === selectedPersona) || personas[0];

  const handleApplyOnboarding = async () => {
    setIsSubmitting(true);
    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete_onboarding',
          payload: { persona: selectedPersona },
          userId,
        }),
      });

      setTimeout(() => {
        router.push(`/dashboard?userId=${encodeURIComponent(userId)}`);
      }, 800);
    } catch (e) {
      console.error(e);
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-900">
      <div className="w-full max-w-3xl space-y-8 my-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 text-brand-700 font-bold text-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Category Recommendation</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Personalisasi Kategori Keuanganmu
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
            AI TataDana menyesuaikan kategori pencatatan transaksi secara pintar berdasarkan aktivitas utamamu.
          </p>
        </div>

        {/* Persona Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {personas.map((p) => {
            const Icon = p.icon;
            const isSelected = selectedPersona === p.id;
            return (
              <div
                key={p.id}
                onClick={() => setSelectedPersona(p.id as any)}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-brand-500 bg-white ring-4 ring-brand-500/10 shadow-brand-sm'
                    : 'border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-blue-100 text-brand-700' : 'bg-slate-100 text-slate-600'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-brand-500" />}
                  </div>
                  <h3 className="font-bold text-sm text-slate-900">{p.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{p.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Output Preview Card */}
        <Card className="p-6 bg-white border-slate-200 shadow-card">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Rekomendasi AI untuk {currentPersona.title}:
              </span>
            </div>
            <Badge variant="blue" size="sm">
              {currentPersona.recommended.length} Kategori Otomatis
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {currentPersona.recommended.map((cat, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 text-xs flex items-center gap-2 font-medium text-slate-700"
              >
                <span className="text-base shrink-0">{cat.emoji}</span>
                <span className="truncate">{cat.name}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-[11px] text-slate-400">
              *Kamu tetap bisa menambah atau mengedit kategori custom kapan saja di menu Pengaturan.
            </span>

            <Button
              onClick={handleApplyOnboarding}
              isLoading={isSubmitting}
              variant="primary"
              size="md"
              className="w-full sm:w-auto px-6"
            >
              <span>Terapkan &amp; Masuk Dashboard</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}
