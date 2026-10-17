-- TataDana Database Schema Migration: 001_initial_schema.sql
-- Production schema for Supabase Postgres

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone_number TEXT UNIQUE,
    avatar_url TEXT,
    currency TEXT DEFAULT 'IDR',
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin')),
    plan TEXT DEFAULT 'starter' CHECK (plan IN ('starter', 'pro')),
    plan_expires_at TIMESTAMPTZ,
    telegram_chat_id BIGINT UNIQUE,
    telegram_username TEXT,
    telegram_bot_token TEXT,
    telegram_connected BOOLEAN DEFAULT false,
    telegram_connected_at TIMESTAMPTZ,
    reminder_enabled BOOLEAN DEFAULT true,
    reminder_frequency INT DEFAULT 1 CHECK (reminder_frequency IN (1, 2)),
    reminder_time_1 TIME DEFAULT '09:00:00',
    reminder_time_2 TIME DEFAULT '20:00:00',
    onboarding_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Wallets Table
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'bank' CHECK (type IN ('cash', 'bank', 'ewallet')),
    balance NUMERIC(15, 2) DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    color TEXT DEFAULT '#f97316',
    icon TEXT DEFAULT 'wallet',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
    emoji TEXT DEFAULT '📦',
    color TEXT DEFAULT '#f97316',
    is_custom BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Budgets Table
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    month_period TEXT NOT NULL, -- Format: YYYY-MM
    amount NUMERIC(15, 2) NOT NULL,
    alert_80_sent BOOLEAN DEFAULT false,
    alert_100_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_category_month UNIQUE(user_id, category_id, month_period)
);

-- 5. Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
    destination_wallet_id UUID REFERENCES public.wallets(id) ON DELETE RESTRICT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
    amount NUMERIC(15, 2) NOT NULL,
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    source TEXT DEFAULT 'web' CHECK (source IN ('web', 'telegram_text', 'telegram_photo', 'telegram_voice')),
    receipt_image_url TEXT,
    merchant_name TEXT,
    telegram_message_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Transaction Items Table (Multi-item receipt breakdown)
CREATE TABLE IF NOT EXISTS public.transaction_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    price NUMERIC(15, 2) NOT NULL,
    quantity INT DEFAULT 1,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Telegram Updates (Idempotency check table)
CREATE TABLE IF NOT EXISTS public.telegram_updates (
    update_id BIGINT PRIMARY KEY,
    chat_id BIGINT,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'success'
);

-- 8. AI Providers Config Table
CREATE TABLE IF NOT EXISTS public.ai_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE, -- 'gemini', 'openai', 'deepseek'
    display_name TEXT NOT NULL,
    api_key_encrypted TEXT,
    model_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    priority INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. AI Provider Global Settings
CREATE TABLE IF NOT EXISTS public.ai_provider_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mode TEXT DEFAULT 'failover' CHECK (mode IN ('single', 'failover')),
    active_single_provider TEXT DEFAULT 'gemini',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. AI Call Logs Table
CREATE TABLE IF NOT EXISTS public.ai_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('parse_text', 'receipt_ocr', 'voice_stt', 'financial_advisor')),
    prompt_tokens INT DEFAULT 0,
    completion_tokens INT DEFAULT 0,
    cost_idr NUMERIC(10, 4) DEFAULT 0,
    latency_ms INT DEFAULT 0,
    status TEXT DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan TEXT NOT NULL CHECK (plan IN ('starter', 'pro')),
    amount NUMERIC(15, 2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('midtrans', 'manual_transfer')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'rejected')),
    midtrans_transaction_id TEXT,
    manual_receipt_url TEXT,
    approved_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Export History Table
CREATE TABLE IF NOT EXISTS public.export_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'excel')),
    period_range TEXT NOT NULL,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    signed_url TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Audit Logs Table (Admin user inspection privacy)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for high-performance querying
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON public.budgets(user_id, month_period);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_user ON public.ai_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_chat ON public.profiles(telegram_chat_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_history ENABLE ROW LEVEL SECURITY;

-- Policies for Profiles
CREATE POLICY "Users can view and update own profile" ON public.profiles
    FOR ALL USING (auth.uid() = id);

-- Policies for Wallets
CREATE POLICY "Users can manage own wallets" ON public.wallets
    FOR ALL USING (auth.uid() = user_id);

-- Policies for Categories
CREATE POLICY "Users can manage own categories or view system categories" ON public.categories
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- Policies for Budgets
CREATE POLICY "Users can manage own budgets" ON public.budgets
    FOR ALL USING (auth.uid() = user_id);

-- Policies for Transactions
CREATE POLICY "Users can manage own transactions" ON public.transactions
    FOR ALL USING (auth.uid() = user_id);

-- Policies for Transaction Items
CREATE POLICY "Users can view own transaction items" ON public.transaction_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.transactions 
            WHERE transactions.id = transaction_items.transaction_id 
            AND transactions.user_id = auth.uid()
        )
    );

-- Seed System Default Categories
INSERT INTO public.categories (id, user_id, name, type, emoji, color, is_custom) VALUES
    ('00000000-0000-0000-0000-000000000001', NULL, 'Makanan & Minuman', 'expense', '🍜', '#2563eb', false),
    ('00000000-0000-0000-0000-000000000002', NULL, 'Transportasi', 'expense', '🚗', '#0284c7', false),
    ('00000000-0000-0000-0000-000000000003', NULL, 'Hiburan', 'expense', '🎮', '#8b5cf6', false),
    ('00000000-0000-0000-0000-000000000004', NULL, 'Tagihan & Utilitas', 'expense', '🏠', '#ef4444', false),
    ('00000000-0000-0000-0000-000000000005', NULL, 'Kesehatan', 'expense', '💊', '#10b981', false),
    ('00000000-0000-0000-0000-000000000006', NULL, 'Belanja', 'expense', '👕', '#ec4899', false),
    ('00000000-0000-0000-0000-000000000007', NULL, 'Pendidikan', 'expense', '📚', '#f59e0b', false),
    ('00000000-0000-0000-0000-000000000008', NULL, 'Gaji', 'income', '💼', '#10b981', false),
    ('00000000-0000-0000-0000-000000000009', NULL, 'Bonus & Freelance', 'income', '💰', '#2563eb', false),
    ('00000000-0000-0000-0000-000000000010', NULL, 'Investasi & Dividen', 'income', '📈', '#6366f1', false)
ON CONFLICT DO NOTHING;

-- Seed Superadmin Profile
INSERT INTO public.profiles (id, full_name, phone_number, role, plan, onboarding_completed)
VALUES (
    '00000000-0000-0000-0000-000000000999',
    'Ferdiansyah R (Admin)',
    '081199887766',
    'superadmin',
    'pro',
    true
)
ON CONFLICT DO NOTHING;

-- Seed Default AI Providers
INSERT INTO public.ai_providers (name, display_name, model_name, is_active, priority) VALUES
    ('gemini', 'Google Gemini', 'gemini-1.5-flash', true, 1),
    ('openai', 'OpenAI GPT', 'gpt-4o-mini', true, 2),
    ('deepseek', 'DeepSeek AI', 'deepseek-chat', true, 3)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.ai_provider_settings (mode, active_single_provider) VALUES
    ('failover', 'gemini')
ON CONFLICT DO NOTHING;
