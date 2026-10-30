-- ====================================================================
-- SKEMA BASIS DATA PRODUKSI TATADANA FINTECH (SUPABASE / POSTGRESQL)
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABEL: USERS (PENGGUNA & AUTENTIKASI)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(30) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    password_hash TEXT,
    avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
    currency VARCHAR(10) DEFAULT 'IDR',
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin')),
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    plan VARCHAR(20) DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'enterprise')),
    telegram_chat_id BIGINT,
    telegram_username VARCHAR(100),
    telegram_connected BOOLEAN DEFAULT false,
    telegram_bot_token TEXT,
    reminder_enabled BOOLEAN DEFAULT true,
    reminder_frequency INT DEFAULT 1,
    reminder_time_1 TIME DEFAULT '09:00:00',
    reminder_time_2 TIME DEFAULT '20:00:00',
    onboarding_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_verification ON public.users(verification_status);

-- 3. TABEL: OTPS (SISTEM AUTENTIKASI KODE 6-DIGIT KRIPTOGRAFIS)
CREATE TABLE IF NOT EXISTS public.otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier VARCHAR(255) NOT NULL, -- Nomor HP atau Email
    otp_hash TEXT NOT NULL,          -- HMAC-SHA256 Hash
    attempts INT DEFAULT 0,          -- Counter percobaan salah
    max_attempts INT DEFAULT 3,      -- Batas toleransi rate-limiting
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL, -- Berlaku 5 menit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otps_identifier_status ON public.otps(identifier, status);

-- 4. TABEL: BANK_ACCOUNTS (OPEN FINANCE / AGREGATOR BANK BRICK / FINVERSE)
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    institution_id VARCHAR(50) NOT NULL,    -- bca, mandiri, bri, bni, gopay, ovo
    institution_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_holder_name VARCHAR(150) NOT NULL,
    balance NUMERIC(15, 2) DEFAULT 0.00,
    encrypted_access_token TEXT NOT NULL,   -- AES-256-GCM ciphertext
    token_iv VARCHAR(64) NOT NULL,          -- Initialization Vector (Hex)
    token_auth_tag VARCHAR(64) NOT NULL,    -- GCM Authentication Tag (Hex)
    status VARCHAR(30) DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'action_required')),
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, institution_id, account_number)
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_user ON public.bank_accounts(user_id);

-- 5. TABEL: WALLETS (DOMPET KEUANGAN & SALDO AKTIF)
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('cash', 'bank', 'ewallet', 'investment')),
    balance NUMERIC(15, 2) DEFAULT 0.00,
    is_default BOOLEAN DEFAULT false,
    color VARCHAR(20) DEFAULT '#0284c7',
    icon VARCHAR(30) DEFAULT 'wallet',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON public.wallets(user_id);

-- 6. TABEL: TRANSACTIONS (MUTASI PEMASUKAN & PENGELUARAN REAL-TIME)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    destination_wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
    category_id VARCHAR(50),
    category_name VARCHAR(100),
    category_emoji VARCHAR(10),
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    amount NUMERIC(15, 2) NOT NULL,
    notes TEXT,
    source VARCHAR(30) DEFAULT 'web' CHECK (source IN ('web', 'telegram', 'bank_sync', 'ai_assistant')),
    external_reference_id VARCHAR(100), -- ID referensi dari Brick Bank Mutasi
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON public.transactions(wallet_id);

-- 7. TABEL: AUDIT_LOGS & SECURITY EVENTS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otps ENABLE ROW LEVEL SECURITY;

-- Pengguna hanya boleh melihat dan memodifikasi data miliknya sendiri
CREATE POLICY "Users can only read own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can only update own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can manage own wallets" ON public.wallets
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own transactions" ON public.transactions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own bank accounts" ON public.bank_accounts
    FOR SELECT USING (auth.uid() = user_id);

-- Service Role (Backend Server API) memiliki hak bypass penuh
CREATE POLICY "Service Role Full Access Users" ON public.users
    FOR ALL TO service_role USING (true);

CREATE POLICY "Service Role Full Access Otps" ON public.otps
    FOR ALL TO service_role USING (true);

CREATE POLICY "Service Role Full Access Transactions" ON public.transactions
    FOR ALL TO service_role USING (true);

-- 9. TRIGGER FUNGSI: AUTO UPDATE TIMESTAMP
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

CREATE TRIGGER trg_wallets_updated_at BEFORE UPDATE ON public.wallets
    FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

CREATE TRIGGER trg_transactions_updated_at BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
