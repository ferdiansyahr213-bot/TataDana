# TataDana — Catat Keuangan Semudah Chat Langsung dari Telegram

TataDana adalah aplikasi SaaS manajemen keuangan pribadi premium Indonesia yang terintegrasi langsung dengan Telegram Bot. User bisa mencatat pemasukan dan pengeluaran langsung dari chat Telegram dengan bahasa natural atau foto struk, dan setiap transaksi otomatis tersimpan rapi di Supabase (Postgres) serta dapat diakses kapan saja lewat dashboard web laporan.

---

## 🚀 Fitur Utama

1. **Integrasi Telegram Bot End-to-End**:
   - Parsing bahasa natural Indonesia: *"beli bakso 15rb"*, *"gajian 5jt"*, *"isi bensin 30k"*, *"kopi 28.000"*.
   - Input foto struk belanja dengan AI Vision OCR (Multi-item breakdown yang dapat di-expand di dashboard).
   - Input voice note (maksimal 60 detik) dengan Speech-to-Text otomatis.
   - Format balasan resmi dalam timezone **WIB (Asia/Jakarta)** lengkap dengan progress bar visual (`██████░░░░`).
   - Perintah bot: `/saldo`, `/hari ini`, `/minggu ini`, `/bulan ini`, `/budget`, `/sheet`, `/bantuan`.
   - Idempotency checking pada webhook untuk mencegah transaksi ganda akibat retry Telegram.

2. **Dashboard Web App Modern (Orange + Putih)**:
   - **Beranda Overview**: 4 stats card (Saldo Total, Pemasukan Bulan Ini, Pengeluaran Bulan Ini, Budget Tersisa), Pie Chart kategori, Bar Chart 6 bulan, Daily Trend line, dan 10 transaksi terbaru.
   - **Transaksi**: Filter kategori, dompet, jenis, dan fitur expand rincian multi-item struk belanja.
   - **Laporan & Ekspor Native**: Tabel transaksi sortable per kolom, pagination, dan generate on-demand ke **PDF** & **Excel (.xlsx)** yang tersimpan di riwayat ekspor.
   - **Budgeting**: Budget per kategori dengan visual progress bar dan alert otomatis 80% & 100% via Telegram.
   - **Multi-Wallet**: Dukungan rekening Bank (BCA, Mandiri), E-Wallet (GoPay, OVO), dan Tunai (Cash). Pengaturan default wallet untuk Telegram.
   - **Settings**: Tab Profil, Tab Telegram Bot (dengan panduan BotFather & uji koneksi fungsional `getMe` + `setWebhook`), Tab Reminder harian (maks 2x/hari), dan Tab Kategori custom.

3. **Admin Dashboard (Superadmin)**:
   - Manajemen pengguna, status plan aktif, dan koneksi Telegram.
   - **Fitur Impersonasi**: Masuk ke tampilan akun user tanpa perlu re-login.
   - **Kelola AI Multi-Provider**: Tambah/hapus provider (Google Gemini, OpenAI GPT, DeepSeek AI), mode failover vs single provider, dan penyimpanan kunci API terenkripsi.
   - **Log Pemanggilan AI**: Monitoring token, latensi, dan estimasi biaya per request.
   - **Verifikasi Pembayaran**: Approval / reject pembayaran manual Midtrans dan transfer bank.
   - **Audit Trail Akses Data**: Pencatatan log permanen setiap kali admin menginspeksi data transaksi user demi kepatuhan privasi finansial.

4. **Sistem Autentikasi & Verifikasi Nomor HP**:
   - Split layout premium orange-putih.
   - Login via Email+Password, Google OAuth, dan Nomor HP.
   - Verifikasi OTP nomor HP (dengan dukungan kode dev bypass `123456`).
   - Otomatis membuat struktur data awal user (dompet default, kategori rekomendasi AI).

---

## 🛠️ Tech Stack & Arsitektur

- **Framework**: Next.js 14 (App Router, TypeScript, React 18, Tailwind CSS, Lucide Icons)
- **Database & Auth**: Supabase (PostgreSQL + RLS + Supabase Auth + Supabase Storage)
- **AI Providers**: Google Gemini 1.5 Flash (default multimodal), OpenAI GPT-4o-mini, DeepSeek Chat
- **Export Engine**: `jspdf` + `jspdf-autotable` untuk PDF resmi, `xlsx` untuk spreadsheet
- **Payment Gateway**: Midtrans Snap + Manual Bank Transfer Approval

---

## 📂 Struktur Direktori

```
tatadana/
├── .env.example
├── .env.local
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── next.config.js
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── public/
│   ├── logo.svg
│   └── favicon.ico
└── src/
    ├── app/
    │   ├── page.tsx (Landing Page 15 section lengkap)
    │   ├── login/page.tsx
    │   ├── register/page.tsx
    │   ├── verify-otp/page.tsx
    │   ├── privacy/page.tsx
    │   ├── terms/page.tsx
    │   ├── dashboard/
    │   │   ├── page.tsx (Beranda)
    │   │   ├── transactions/page.tsx
    │   │   ├── reports/page.tsx (Laporan & Export)
    │   │   ├── budgets/page.tsx
    │   │   ├── wallets/page.tsx
    │   │   ├── settings/page.tsx
    │   │   └── pricing/page.tsx
    │   ├── admin/
    │   │   ├── page.tsx (Kelola Pengguna)
    │   │   ├── ai-providers/page.tsx
    │   │   ├── ai-logs/page.tsx
    │   │   ├── payments/page.tsx
    │   │   └── transactions/page.tsx (Audit log)
    │   └── api/
    │       ├── telegram/webhook/route.ts
    │       ├── telegram/test-connection/route.ts
    │       ├── reports/export/route.ts
    │       ├── reports/download/route.ts
    │       ├── midtrans/charge/route.ts
    │       ├── admin/providers/route.ts
    │       ├── data/route.ts
    │       └── verify/route.ts
    ├── components/
    │   ├── ui/
    │   ├── charts/
    │   ├── telegram-preview/
    │   ├── dashboard/
    │   └── admin/
    ├── lib/
    │   ├── supabase/
    │   ├── telegram/
    │   ├── ai/
    │   ├── export/
    │   ├── utils/
    │   └── types/
    └── test/
        └── verify-engine.ts
```

---

## ⚙️ Menjalankan Aplikasi

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Jalankan Database Migrations di Supabase**:
   Buka SQL Editor di project Supabase Anda, lalu jalankan script di file:
   `supabase/migrations/001_initial_schema.sql`

3. **Jalankan Development Server**:
   ```bash
   npm run dev
   ```
   Akses di browser: `http://localhost:3000`

4. **Uji Validasi Internal**:
   Buka `http://localhost:3000/api/verify` untuk melihat hasil eksekusi unit test assertion secara real-time.
