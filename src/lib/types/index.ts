export type UserRole = 'user' | 'admin' | 'superadmin';
export type PlanType = 'starter' | 'pro';
export type WalletType = 'cash' | 'bank' | 'ewallet';
export type TransactionType = 'expense' | 'income' | 'transfer';
export type TransactionSource = 'web' | 'telegram_text' | 'telegram_photo' | 'telegram_voice';

export interface UserProfile {
  id: string;
  email?: string;
  full_name: string;
  phone_number: string;
  avatar_url?: string;
  currency: string;
  role: UserRole;
  plan: PlanType;
  plan_expires_at?: string;
  telegram_chat_id?: number;
  telegram_username?: string;
  telegram_bot_token?: string;
  telegram_connected: boolean;
  telegram_connected_at?: string;
  reminder_enabled: boolean;
  reminder_frequency: 1 | 2;
  reminder_time_1: string; // HH:mm:ss
  reminder_time_2: string; // HH:mm:ss
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  name: string;
  type: WalletType;
  balance: number;
  is_default: boolean;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id?: string | null;
  name: string;
  type: 'expense' | 'income';
  emoji: string;
  color: string;
  is_custom: boolean;
  created_at?: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  category_name?: string;
  category_emoji?: string;
  category_color?: string;
  month_period: string; // YYYY-MM
  period_type?: 'daily' | 'weekly' | 'monthly';
  amount: number;
  spent: number;
  alert_80_sent?: boolean;
  alert_100_sent?: boolean;
  created_at?: string;
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  item_name: string;
  price: number;
  quantity: number;
  category_id?: string;
  category_name?: string;
  created_at?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  wallet_id: string;
  wallet_name?: string;
  destination_wallet_id?: string;
  destination_wallet_name?: string;
  category_id?: string;
  category_name?: string;
  category_emoji?: string;
  type: TransactionType;
  amount: number;
  transaction_date: string;
  notes?: string;
  source: TransactionSource;
  receipt_image_url?: string;
  merchant_name?: string;
  telegram_message_id?: number;
  items?: TransactionItem[];
  created_at: string;
  updated_at?: string;
}

export interface AIProvider {
  id: string;
  name: 'gemini' | 'openai' | 'deepseek';
  display_name: string;
  api_key_encrypted?: string;
  model_name: string;
  is_active: boolean;
  priority: number;
  created_at?: string;
}

export interface AISettings {
  mode: 'single' | 'failover';
  active_single_provider: string;
}

export interface AILog {
  id: string;
  user_id?: string;
  provider: string;
  model: string;
  action_type: 'parse_text' | 'receipt_ocr' | 'voice_stt' | 'financial_advisor';
  prompt_tokens: number;
  completion_tokens: number;
  cost_idr: number;
  latency_ms: number;
  status: 'success' | 'failed';
  error_message?: string;
  created_at: string;
}

export interface PaymentRecord {
  id: string;
  user_id: string;
  user_name?: string;
  plan: PlanType;
  amount: number;
  payment_method: 'midtrans' | 'manual_transfer';
  status: 'pending' | 'success' | 'failed' | 'rejected';
  midtrans_transaction_id?: string;
  manual_receipt_url?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ExportRecord {
  id: string;
  user_id: string;
  file_type: 'pdf' | 'excel';
  period_range: string;
  file_name: string;
  storage_path: string;
  signed_url?: string;
  expires_at: string;
  created_at: string;
}

export interface ParsedTransactionResult {
  jenis: 'pemasukan' | 'pengeluaran' | 'transfer';
  nominal: number;
  kategori: string;
  catatan: string;
  merchant?: string;
  sourceWalletName?: string;
  destWalletName?: string;
  items?: Array<{ name: string; price: number; quantity: number; category?: string }>;
  purchasePayload?: InitiatePaymentPayload;
}

export type PaymentOption = 'TATADANA_WALLET' | 'QRIS' | 'BANK_TRANSFER' | 'CASH';

export interface InitiatePaymentData {
  item: string;
  amount: number;
  currency: 'IDR';
  category: string;
  payment_options: PaymentOption[];
}

export interface InitiatePaymentPayload {
  action: 'INITIATE_PAYMENT';
  data: InitiatePaymentData;
}


