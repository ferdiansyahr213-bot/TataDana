'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  ArrowRight, 
  Play, 
  CheckCircle2, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Bot, 
  Camera, 
  BarChart3, 
  ShieldCheck, 
  FileSpreadsheet, 
  FileText, 
  Zap, 
  Check 
} from 'lucide-react';
import { TelegramChatMock } from '@/components/telegram-preview/TelegramChatMock';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

export default function LandingPage() {
  const [pricingCycle, setPricingCycle] = useState<'monthly' | 'lifetime'>('lifetime');
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setOpenFaqIdx(openFaqIdx === idx ? null : idx);
  };

  const faqs = [
    {
      q: 'Bagaimana cara kerja TataDana dengan Telegram Bot?',
      a: 'Setelah mendaftar, kamu cukup menghubungkan akun Telegram melalui panduan @BotFather kami. Kamu bisa langsung mengetik pesan seperti "beli bakso 15rb" atau mengirim foto struk belanja — AI TataDana otomatis mencatatnya ke database dalam hitungan detik.',
    },
    {
      q: 'Apakah bisa menggunakan fitur foto struk di paket Starter?',
      a: 'Fitur input via foto struk belanja menggunakan AI Vision OCR hanya tersedia secara eksklusif di paket Pro. Pengguna Starter tetap bisa mencatat dengan sangat mudah lewat teks natural dan voice note.',
    },
    {
      q: 'Bagaimana keamanan data keuangan saya di TataDana?',
      a: 'Data transaksi kamu 100% tersimpan aman di database PostgreSQL Supabase dengan enkripsi standar enterprise dan Row Level Security (RLS). Token bot Telegram dan kredensial kamu dienkripsi menggunakan standar militer AES-256.',
    },
    {
      q: 'Apakah saya perlu menginstal aplikasi tambahan di handphone?',
      a: 'Tidak perlu sama sekali! Kamu cukup menggunakan aplikasi Telegram yang sudah kamu miliki di handphone atau laptop. Dashboard lengkap juga bisa diakses langsung via web browser di hp maupun desktop.',
    },
    {
      q: 'Berapa batas voice note yang bisa dikirim ke bot?',
      a: 'Durasi maksimal voice note adalah 60 detik per rekaman. AI speech-to-text kami akan mentranskrip suara kamu menjadi teks dan mencatat transaksi secara otomatis.',
    },
    {
      q: 'Apakah ada biaya langganan bulanan tersembunyi untuk paket Pro?',
      a: 'Tidak ada biaya bulanan! Paket Pro adalah Rp99.000 Sekali Bayar (Lifetime Access). Kamu mendapatkan akses seumur hidup tanpa tagihan perpanjangan otomatis.',
    },
    {
      q: 'Bisakah saya mengunduh laporan transaksi ke Excel dan PDF?',
      a: 'Bisa! Di paket Pro, kamu dapat melakukan export tak terbatas kapan saja langsung dari dashboard web ke format Excel (.xlsx) dan PDF resmi lengkap dengan ringkasan arus kas.',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-brand-500 selection:text-white">
      {/* 1. NAVBAR (Sticky) */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white font-black text-xl shadow-brand-sm">
              T
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900">TataDana</span>
              <span className="inline-block w-2 h-2 rounded-full bg-brand-500 ml-1" />
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#fitur" className="hover:text-brand-600 transition-colors">Fitur</a>
            <a href="#demo" className="hover:text-brand-600 transition-colors">Cara Kerja</a>
            <a href="#harga" className="hover:text-brand-600 transition-colors">Harga</a>
            <a href="#faq" className="hover:text-brand-600 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-semibold text-slate-700 hover:text-brand-600 px-4 py-2 transition-colors"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl shadow-brand-sm hover:shadow-brand transition-all active:scale-95"
            >
              Coba Gratis
            </Link>
          </div>
        </div>
      </header>

      {/* 2 & 3 & 4 & 5 & 6. HERO SECTION */}
      <section className="pt-16 pb-20 px-6 max-w-7xl mx-auto text-center">
        {/* 2. Pre-headline badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-brand-700 text-xs sm:text-sm font-bold mb-6 animate-fadeIn">
          <Sparkles className="w-4 h-4 text-brand-500" />
          <span>✨ Catat keuangan langsung dari Telegram</span>
        </div>

        {/* 3. Headline (H1) */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight leading-[1.1] max-w-5xl mx-auto mb-6">
          Gaji habis sebelum akhir bulan? Sudah saatnya kamu tahu{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-amber-500">
            ke mana uangmu pergi.
          </span>
        </h1>

        {/* 4. Sub-headline */}
        <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
          TataDana mencatat setiap pengeluaranmu langsung dari chat Telegram atau foto struk — sisanya kami yang urus.
        </p>

        {/* 6. CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl font-bold text-base shadow-brand hover:shadow-brand-sm transition-all transform active:scale-95"
          >
            <span>Mulai Gratis Sekarang</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <a
            href="#demo"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl font-semibold text-base border border-slate-200 transition-all"
          >
            <span>Lihat cara kerjanya →</span>
          </a>
        </div>

        {/* 5. Hero section video placeholder */}
        {/* TODO: ganti dengan video asli demo TataDana */}
        <div className="max-w-4xl mx-auto rounded-3xl overflow-hidden border-2 border-slate-200/80 shadow-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-2 sm:p-4 relative group">
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900 flex flex-col items-center justify-center text-center p-6 border border-slate-800">
            <div className="w-20 h-20 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-brand-400 mb-4 group-hover:scale-110 transition-transform cursor-pointer shadow-brand">
              <Play className="w-8 h-8 fill-brand-400 translate-x-0.5" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-1">
              Video Demo: Dari Chat Telegram ke Dashboard Laporan
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md">
              (Video Placeholder — Klik untuk melihat kemudahan mencatat hanya dalam 2 detik)
            </p>
            <span className="text-[10px] text-slate-500 mt-4 uppercase tracking-wider font-mono">
              // TODO: Ganti dengan video produk interaktif final
            </span>
          </div>
        </div>
      </section>

      {/* 7 & 8. PROBLEM AWARE BULLET POINTS & SOLUTION TRANSITION */}
      <section className="py-20 bg-slate-50 border-y border-slate-150 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Badge variant="brand" size="md" className="mb-3">
              Keresahan Finansial
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Pernah Mengalami Hal Ini Setiap Tanggal Tua?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <Card className="p-8 border-slate-200 hover:border-brand-300 transition-all shadow-card hover:shadow-card-hover">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xl mb-6">
                ⏳
              </div>
              <h3 className="font-bold text-base text-slate-900 mb-2">
                "Buka aplikasi keuangan? Nanti dulu deh..."
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Aplikasi yang rumit, penuh menu, dan lambat bikin kamu malas mencatat. Akhirnya tidak pernah dicatat sama sekali.
              </p>
            </Card>

            <Card className="p-8 border-slate-200 hover:border-brand-300 transition-all shadow-card hover:shadow-card-hover">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xl mb-6">
                💸
              </div>
              <h3 className="font-bold text-base text-slate-900 mb-2">
                "Kok uangnya habis ya? Padahal kayak tidak beli apa-apa"
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Pengeluaran kecil seperti kopi, jajan, ojek, dan transfer tanpa sadar menyedot 40% penghasilan bulananmu tanpa jejak.
              </p>
            </Card>

            <Card className="p-8 border-slate-200 hover:border-brand-300 transition-all shadow-card hover:shadow-card-hover">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xl mb-6">
                🎯
              </div>
              <h3 className="font-bold text-base text-slate-900 mb-2">
                "Udah niat bikin budget, tapi seminggu lupa"
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Budget yang dibuat di awal bulan tidak pernah dipantau secara berkala, sama saja seperti tidak punya budget sama sekali.
              </p>
            </Card>
          </div>

          {/* 8. Solution Transition */}
          <div className="text-center p-8 sm:p-12 rounded-3xl bg-white border border-brand-200 shadow-brand-sm max-w-3xl mx-auto">
            <span className="text-xs uppercase font-extrabold text-brand-600 tracking-wider">
              Solusi Praktis
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 mb-3">
              Bagaimana kalau mencatat keuangan semudah kirim pesan ke teman?
            </h3>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-6">
              Tanpa form berbelit-belit. Cukup ketik seperti biasa di Telegram, dan teknologi AI TataDana langsung merapikannya untukmu.
            </p>
            <div className="inline-flex items-center gap-2 text-brand-600 font-extrabold text-lg">
              <span>Introducing TataDana ✨</span>
            </div>
          </div>
        </div>
      </section>

      {/* 9. INTERACTIVE DASHBOARD PREVIEW & BOT CHAT MOCK */}
      <section id="demo" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <Badge variant="brand" size="md" className="mb-3">
            Coba Interaktif
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Coba Chat Bot Telegram TataDana Sekarang
          </h2>
          <p className="text-slate-600 text-sm sm:text-base mt-3">
            Klik tombol contoh atau ketik sendiri format transaksi natural Indonesia pada pratinjau interaktif di bawah ini.
          </p>
        </div>

        <TelegramChatMock />
      </section>

      {/* 10. FITUR SECTION (3 Alternating Layout Features) */}
      <section id="fitur" className="py-20 bg-slate-50 border-y border-slate-100 px-6">
        <div className="max-w-7xl mx-auto space-y-24">
          {/* Fitur 1 */}
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="w-full lg:w-1/2 space-y-4">
              <Badge variant="brand" size="sm">
                01. Kemudahan Input
              </Badge>
              <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Catat via Telegram — Teks Slang, Suara, hingga Foto Struk
              </h3>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                Cukup ketik dengan bahasa santai sehari-hari seperti <em>"beli boba 25rb"</em>, <em>"gajian 8jt"</em>, kirim voice note 30 detik saat berkendara, atau foto struk Indomaret saat belanja bulanan.
              </p>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 pt-2 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-500" />
                  <span>Mengenali format nominal Indonesia (15rb, 500k, 1.5jt)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-500" />
                  <span>AI OCR Vision membaca struk kasir multi-item otomatis</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-500" />
                  <span>1 bot digunakan bersama, link akun instan via nomor HP</span>
                </li>
              </ul>
            </div>
            <div className="w-full lg:w-1/2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-card">
              <div className="bg-slate-900 rounded-2xl p-4 text-xs font-mono text-slate-200 space-y-2 border border-slate-800">
                <div className="text-brand-400 font-bold">User: "beli bakso 15rb"</div>
                <div className="text-emerald-400 font-bold">Bot: 💸 Pengeluaran tercatat!</div>
                <div className="text-slate-400">├ Nominal : Rp15.000</div>
                <div className="text-slate-400">├ Kategori : 🍜 Makanan & Minuman</div>
                <div className="text-slate-400">├ Dompet : 👛 BCA Utama</div>
                <div className="text-slate-400">└ Saldo : Rp8.485.000</div>
              </div>
            </div>
          </div>

          {/* Fitur 2 */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-12">
            <div className="w-full lg:w-1/2 space-y-4">
              <Badge variant="blue" size="sm">
                02. Laporan & Ekspor
              </Badge>
              <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Laporan Native & Export Otomatis ke PDF / Excel
              </h3>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                Tidak perlu pusing membuat rumus spreadsheet sendiri. Dashboard web TataDana menyajikan tabel sortable, filter mendalam, dan tombol unduh laporan siap pakai kapan saja.
              </p>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 pt-2 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-500" />
                  <span>Tabel transaksi lengkap dengan search & column sorting</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-500" />
                  <span>Generate file PDF & Excel (.xlsx) on-demand</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-500" />
                  <span>Riwayat ekspor tersimpan aman di Supabase Storage</span>
                </li>
              </ul>
            </div>
            <div className="w-full lg:w-1/2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-card">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs font-bold text-brand-700">
                  <span>Export On-Demand TataDana</span>
                  <Badge variant="blue" size="sm">Pro Feature</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl border border-slate-200 text-center">
                    <FileText className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                    <span className="font-bold text-xs block text-slate-800">Laporan Resmi PDF</span>
                    <span className="text-[10px] text-slate-400">Layout A4 Siap Cetak</span>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-200 text-center">
                    <FileSpreadsheet className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <span className="font-bold text-xs block text-slate-800">Spreadsheet Excel (.xlsx)</span>
                    <span className="text-[10px] text-slate-400">Formula & Sheet Ringkasan</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fitur 3 */}
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="w-full lg:w-1/2 space-y-4">
              <Badge variant="purple" size="sm">
                03. Asisten Finansial
              </Badge>
              <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                AI Financial Advisor — Peringatan Dini Kebiasaan Boros
              </h3>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                Bukan cuma mencatat angka, AI TataDana proaktif memantau kesehatan finansialmu. Bot akan otomatis mengingatkan jika ada lonjakan pengeluaran kategori di atas 50% atau jika belanjaan mengambil porsi besar budget bulanan.
              </p>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 pt-2 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-500" />
                  <span>Deteksi anomali pengeluaran otomatis tanpa command</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-500" />
                  <span>Saran keuangan actionable yang dipersonalisasi</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-500" />
                  <span>Peringatan saat total belanja sudah &gt;80% gaji</span>
                </li>
              </ul>
            </div>
            <div className="w-full lg:w-1/2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-card">
              <div className="bg-slate-900 rounded-2xl p-4 text-xs font-mono text-slate-200 space-y-2 border border-slate-800">
                <div className="text-purple-400 font-bold flex items-center gap-1.5">
                  <Bot className="w-4 h-4" />
                  <span>AI Financial Advisor</span>
                </div>
                <div className="text-slate-300">
                  "Hei Budi! Pengeluaran Makanan & Minuman kamu minggu ini naik 62% dibanding minggu lalu (Rp850.000 vs Rp520.000)."
                </div>
                <div className="text-amber-400 font-semibold">
                  💡 Saran: Pertahankan sisa budget dengan masak di rumah selama 3 hari ke depan agar tidak defisit!
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 11. TESTIMONIALS (Masonry Grid Placeholder) */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Badge variant="brand" size="md" className="mb-3">
            Pengalaman Pengguna
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Dipercaya Para Profesional & Mahasiswa Indonesia
          </h2>
          <p className="text-slate-500 text-xs mt-2">
            // TODO: ganti dengan testimoni asli dari beta user setelah peluncuran publik
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              name: 'Dimas Prasetyo',
              role: 'Software Engineer, 26 thn',
              city: 'Jakarta Selatan',
              text: 'Dulu selalu malas buka aplikasi budgeting yang berat. Sekarang tinggal chat bot di Telegram sambil jalan, langsung beres. Uang tabungan akhir bulan akhirnya bertambah!',
            },
            {
              name: 'Nadia Safitri',
              role: 'UI Designer & Freelancer, 24 thn',
              city: 'Bandung',
              text: 'Fitur foto struk Indomaret di paket Pro luar biasa membantu! Gak perlu input satu-satu lagi, AI-nya langsung pisah item belanjaan rapi di dashboard.',
            },
            {
              name: 'Reza Mahendra',
              role: 'Mahasiswa Tingkat Akhir, 22 thn',
              city: 'Surabaya',
              text: 'Reminder jam 8 malam dari TataDana bikin saya gak pernah lupa catat pengeluaran harian. Tampilan webnya juga sangat bersih dan enak dilihat.',
            },
          ].map((t, idx) => (
            <Card key={idx} className="p-6 border-slate-200 hover:border-brand-300 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-brand-600 font-bold flex items-center justify-center text-sm">
                  {t.name[0]}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{t.name}</h4>
                  <p className="text-[11px] text-slate-400">
                    {t.role} • {t.city}
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed italic">"{t.text}"</p>
            </Card>
          ))}
        </div>
      </section>

      {/* 12. PRICING SECTION (2 Columns: Starter & Pro) */}
      <section id="harga" className="py-20 bg-slate-50 border-y border-slate-100 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Badge variant="brand" size="md" className="mb-3">
              Investasi Finansial
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
              Pilih Paket yang Sesuai dengan Kebutuhanmu
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-3">
              Mulai kendalikan keuanganmu hari ini. Transparan tanpa biaya tersembunyi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Starter Column */}
            <Card className="p-8 border-slate-200 bg-white flex flex-col justify-between shadow-card">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-500">Starter</span>
                  <Badge variant="gray" size="sm">Langganan</Badge>
                </div>
                <div className="text-3xl font-black text-slate-900 mb-1">
                  Rp49.000 <span className="text-sm font-semibold text-slate-400">/ bulan</span>
                </div>
                <p className="text-xs text-slate-500 mb-6">
                  Untuk pencatatan dasar teks dan voice note Telegram.
                </p>

                <ul className="space-y-3 text-xs text-slate-700 mb-8">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>Catat via teks &amp; voice note Telegram</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>Maksimal 50 transaksi / bulan</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>Maksimal 3 dompet &amp; 5 kategori budget</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>Dashboard web &amp; ringkasan bulanan</span>
                  </li>
                  <li className="flex items-center gap-2 text-slate-400 line-through">
                    <span>Input foto struk AI OCR</span>
                  </li>
                  <li className="flex items-center gap-2 text-slate-400 line-through">
                    <span>AI Financial Advisor otomatis</span>
                  </li>
                  <li className="flex items-center gap-2 text-slate-400 line-through">
                    <span>Export laporan PDF &amp; Excel</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/register"
                className="w-full text-center py-3 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:border-brand-500 hover:text-brand-600 transition-colors"
              >
                Mulai Paket Starter
              </Link>
            </Card>

            {/* Pro Column */}
            <Card className="p-8 border-brand-400 ring-2 ring-brand-500/20 bg-gradient-to-br from-white via-blue-50/20 to-indigo-50/30 flex flex-col justify-between shadow-brand relative">
              <div className="absolute -top-3 right-6 bg-brand-500 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Rekomendasi</span>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-xs uppercase tracking-wider text-brand-600">Pro Lifetime</span>
                  <Badge variant="blue" size="sm">Sekali Bayar</Badge>
                </div>
                <div className="text-3xl font-black text-slate-900 mb-1">
                  Rp99.000 <span className="text-sm font-semibold text-brand-600">Sekali Bayar</span>
                </div>
                <p className="text-xs text-slate-500 mb-6">
                  Akses seumur hidup tanpa tagihan berulang per bulan.
                </p>

                <ul className="space-y-3 text-xs text-slate-800 font-medium mb-8">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-500" />
                    <span><strong>Unlimited</strong> transaksi bulanan</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-500" />
                    <span><strong>Unlimited</strong> dompet &amp; kategori budget</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-500" />
                    <span><strong>Foto Struk AI Vision</strong> (multi-item)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-500" />
                    <span><strong>AI Financial Advisor</strong> analisis kebiasaan boros</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-500" />
                    <span><strong>Export Unlimited</strong> ke PDF &amp; Excel (.xlsx)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-500" />
                    <span>Pengingat custom hingga 2x sehari &amp; Prioritas support</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/register"
                className="w-full text-center py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-brand transition-all transform active:scale-95"
              >
                Pilih Pro Sekali Bayar (Rp99.000)
              </Link>
            </Card>
          </div>
        </div>
      </section>

      {/* 13. FAQ SECTION (>=7 Pertanyaan Relevan) */}
      <section id="faq" className="py-20 px-6 max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <Badge variant="brand" size="md" className="mb-3">
            Pertanyaan Umum
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Kerap Ditanyakan Seputar TataDana
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIdx === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 overflow-hidden bg-white transition-all"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-slate-900 hover:text-brand-600 transition-colors"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-brand-500 shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="p-5 pt-0 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 14. FINAL CTA (Background Gradient Blue) */}
      <section className="py-20 px-6 bg-gradient-to-r from-brand-600 via-brand-500 to-indigo-600 text-white text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
            Mulai Kendalikan Keuanganmu Hari Ini
          </h2>
          <p className="text-base sm:text-lg text-blue-100 max-w-2xl mx-auto font-medium leading-relaxed">
            Bergabunglah dengan ribuan pengguna yang berhenti menebak ke mana uang mereka pergi. Catat semudah kirim chat di Telegram.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="px-8 py-4 bg-white text-brand-600 hover:bg-blue-50 font-black rounded-2xl shadow-xl transition-all active:scale-95 text-base"
            >
              Daftar Gratis Sekarang
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 bg-brand-700/60 hover:bg-brand-700 text-white font-bold rounded-2xl border border-white/20 transition-all text-base"
            >
              Masuk ke Akun
            </Link>
          </div>
        </div>
      </section>

      {/* 15. FOOTER (4 Columns) */}
      <footer className="bg-slate-900 text-slate-400 py-16 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 text-xs">
          {/* Kolom 1 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-brand-500 text-white font-black flex items-center justify-center text-base">
                T
              </div>
              <span className="text-lg font-bold text-white tracking-tight">TataDana</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Catat keuangan semudah chat — langsung dari Telegram kamu. Terintegrasi penuh dengan Supabase Postgres.
            </p>
            <p className="text-[11px] text-slate-500">© 2026 TataDana Indonesia. All rights reserved.</p>
          </div>

          {/* Kolom 2: Produk */}
          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Produk</h4>
            <ul className="space-y-2">
              <li><a href="#fitur" className="hover:text-white transition-colors">Telegram Bot Finansial</a></li>
              <li><a href="#fitur" className="hover:text-white transition-colors">AI OCR Struk Belanja</a></li>
              <li><a href="#fitur" className="hover:text-white transition-colors">AI Financial Advisor</a></li>
              <li><a href="#fitur" className="hover:text-white transition-colors">Export Laporan PDF & Excel</a></li>
              <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard Overview</Link></li>
            </ul>
          </div>

          {/* Kolom 3: Perusahaan */}
          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Perusahaan</h4>
            <ul className="space-y-2">
              <li><Link href="/" className="hover:text-white transition-colors">Tentang TataDana</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">Karir & Rekrutmen</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">Press Kit Fintech</Link></li>
              <li><Link href="/admin" className="hover:text-white transition-colors">Portal Admin Internal</Link></li>
            </ul>
          </div>

          {/* Kolom 4: Legal & Kontak */}
          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Legal & Bantuan</h4>
            <ul className="space-y-2">
              <li><Link href="/privacy" className="hover:text-white transition-colors">Kebijakan Privasi</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Syarat & Ketentuan</Link></li>
              <li><a href="mailto:support@tatadana.id" className="hover:text-white transition-colors">Kontak: support@tatadana.id</a></li>
              <li><span className="text-slate-500 block">WIB (Asia/Jakarta) Support Hours</span></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
