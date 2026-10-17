import { createClient } from '@supabase/supabase-js';
import { 
  UserProfile, Wallet, Category, Budget, Transaction, 
  AIProvider, AISettings, AILog, PaymentRecord, ExportRecord 
} from '../types';
import { 
  INITIAL_USER, INITIAL_ADMIN, INITIAL_WALLETS, INITIAL_CATEGORIES, 
  INITIAL_BUDGETS, INITIAL_TRANSACTIONS, INITIAL_AI_PROVIDERS, 
  INITIAL_AI_SETTINGS, INITIAL_AI_LOGS, INITIAL_PAYMENTS, INITIAL_EXPORTS 
} from './dev-storage';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock-tatadana.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-service-role';

export const isServerSupabaseConfigured = () => {
  return (
    process.env.SUPABASE_URL &&
    !process.env.SUPABASE_URL.includes('tatadana-local') &&
    !process.env.SUPABASE_URL.includes('mock') &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('mock')
  );
};

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// In-memory fallback server store for dev/testing
class ServerStore {
  users: Map<string, UserProfile> = new Map();
  wallets: Map<string, Wallet[]> = new Map();
  categories: Map<string, Category[]> = new Map();
  budgets: Map<string, Budget[]> = new Map();
  transactions: Map<string, Transaction[]> = new Map();
  processedUpdates: Set<number> = new Set();
  aiProviders: AIProvider[] = [...INITIAL_AI_PROVIDERS];
  aiSettings: AISettings = { ...INITIAL_AI_SETTINGS };
  aiLogs: AILog[] = [...INITIAL_AI_LOGS];
  payments: PaymentRecord[] = [...INITIAL_PAYMENTS];
  exports: ExportRecord[] = [...INITIAL_EXPORTS];
  pendingPurchases: Map<
    string,
    { item: string; amount: number; category: string; tatadanaCategoryName: string; createdAt: number }
  > = new Map();

  constructor() {
    this.users.set(INITIAL_USER.id, { ...INITIAL_USER });
    this.users.set(INITIAL_ADMIN.id, { ...INITIAL_ADMIN });
    this.wallets.set(INITIAL_USER.id, [...INITIAL_WALLETS]);
    this.categories.set(INITIAL_USER.id, [...INITIAL_CATEGORIES]);
    this.budgets.set(INITIAL_USER.id, [...INITIAL_BUDGETS]);
    this.transactions.set(INITIAL_USER.id, [...INITIAL_TRANSACTIONS]);

    // Admin operational wallet & categories
    this.wallets.set(INITIAL_ADMIN.id, [{
      id: 'wal_admin_1',
      user_id: INITIAL_ADMIN.id,
      name: 'Rekening Operasional Admin',
      type: 'bank',
      balance: 50000000,
      is_default: true,
      color: '#4f46e5',
      icon: 'shield',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }]);
    this.categories.set(INITIAL_ADMIN.id, [...INITIAL_CATEGORIES]);
    this.transactions.set(INITIAL_ADMIN.id, []);
  }

  setPendingPurchase(
    userId: string,
    data: { item: string; amount: number; category: string; tatadanaCategoryName: string }
  ) {
    this.pendingPurchases.set(userId, { ...data, createdAt: Date.now() });
  }

  getPendingPurchase(userId: string) {
    const p = this.pendingPurchases.get(userId);
    if (!p) return undefined;
    if (Date.now() - p.createdAt > 15 * 60 * 1000) {
      this.pendingPurchases.delete(userId);
      return undefined;
    }
    return p;
  }

  clearPendingPurchase(userId: string) {
    this.pendingPurchases.delete(userId);
  }

  // Idempotency check
  isUpdateProcessed(updateId: number): boolean {
    return this.processedUpdates.has(updateId);
  }

  markUpdateProcessed(updateId: number): void {
    this.processedUpdates.add(updateId);
  }

  // Find user by Telegram chat ID
  getUserByTelegramChatId(chatId: number, botToken?: string): UserProfile | undefined {
    for (const user of this.users.values()) {
      if (user.telegram_chat_id === chatId) return user;
    }
    // Check if user has registered custom bot token
    if (botToken && !botToken.startsWith('demo_')) {
      for (const user of this.users.values()) {
        if (user.telegram_bot_token === botToken) return user;
      }
    }
    return undefined;
  }

  // Link user by phone number
  linkUserByPhone(phone: string, chatId: number, username?: string): UserProfile | undefined {
    const user = this.getUserByPhone(phone);
    if (user) {
      user.telegram_chat_id = chatId;
      user.telegram_connected = true;
      if (username) user.telegram_username = username;
      user.telegram_connected_at = new Date().toISOString();
      user.updated_at = new Date().toISOString();
      return user;
    }
    return undefined;
  }

  // Register or create new user profile with initial structure
  registerNewUser(params: { fullName: string; phone: string; email?: string }): UserProfile {
    const cleanPhone = params.phone.replace(/\D/g, '');
    const existing = this.getUserByPhone(cleanPhone);
    if (existing) {
      existing.full_name = params.fullName;
      if (params.email) existing.email = params.email;
      existing.updated_at = new Date().toISOString();
      return existing;
    }

    const newUserId = `usr_${Date.now()}`;
    const newUser: UserProfile = {
      id: newUserId,
      full_name: params.fullName,
      phone_number: params.phone,
      email: params.email || `${cleanPhone}@tatadana.id`,
      currency: 'IDR',
      role: 'user',
      plan: 'starter',
      telegram_connected: false,
      reminder_enabled: true,
      reminder_frequency: 1,
      reminder_time_1: '09:00:00',
      reminder_time_2: '20:00:00',
      onboarding_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.users.set(newUserId, newUser);

    const defaultWallet: Wallet = {
      id: `wal_${Date.now()}_1`,
      user_id: newUserId,
      name: 'Dompet Utama (BCA)',
      type: 'bank',
      balance: 1000000,
      is_default: true,
      color: '#0284c7',
      icon: 'landmark',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.wallets.set(newUserId, [defaultWallet]);
    this.categories.set(newUserId, [...INITIAL_CATEGORIES]);
    this.transactions.set(newUserId, []);
    this.budgets.set(newUserId, []);

    return newUser;
  }

  // Find user by phone number
  getUserByPhone(phone: string): UserProfile | undefined {
    const cleanPhone = phone.replace(/\D/g, '');
    for (const user of this.users.values()) {
      if (user.phone_number.replace(/\D/g, '') === cleanPhone) return user;
    }
    if (cleanPhone === '081234567890') {
      return this.users.get('usr_demo_123');
    }
    return undefined;
  }

  // User Wallets
  getWallets(userId: string): Wallet[] {
    return this.wallets.get(userId) || [];
  }

  getDefaultWallet(userId: string): Wallet | undefined {
    const userWallets = this.getWallets(userId);
    return userWallets.find(w => w.is_default) || userWallets[0];
  }

  updateWalletBalance(walletId: string, delta: number): Wallet | undefined {
    for (const [userId, list] of this.wallets.entries()) {
      const idx = list.findIndex(w => w.id === walletId);
      if (idx !== -1) {
        list[idx].balance += delta;
        list[idx].updated_at = new Date().toISOString();
        return list[idx];
      }
    }
    return undefined;
  }

  // Transactions
  getTransactions(userId: string): Transaction[] {
    return this.transactions.get(userId) || [];
  }

  addTransaction(tx: Omit<Transaction, 'id' | 'created_at'>): {
    transaction: Transaction;
    budgetAlert?: { percent: number; is100: boolean; is80: boolean; budget: Budget };
  } {
    const newTx: Transaction = {
      ...tx,
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
    };

    const currentList = this.transactions.get(tx.user_id) || [];
    currentList.unshift(newTx);
    this.transactions.set(tx.user_id, currentList);

    // Update wallet balance
    if (tx.type === 'expense') {
      this.updateWalletBalance(tx.wallet_id, -tx.amount);
    } else if (tx.type === 'income') {
      this.updateWalletBalance(tx.wallet_id, tx.amount);
    } else if (tx.type === 'transfer' && tx.destination_wallet_id) {
      this.updateWalletBalance(tx.wallet_id, -tx.amount);
      this.updateWalletBalance(tx.destination_wallet_id, tx.amount);
    }

    // Update budget spent if expense and monitor 80% / 100% threshold
    let budgetAlert: { percent: number; is100: boolean; is80: boolean; budget: Budget } | undefined;
    if (tx.type === 'expense' && tx.category_id) {
      const userBudgets = this.budgets.get(tx.user_id) || [];
      const budget = userBudgets.find(b => b.category_id === tx.category_id);
      if (budget && budget.amount > 0) {
        budget.spent += tx.amount;
        const percent = Math.round((budget.spent / budget.amount) * 100);
        if (percent >= 100 && !budget.alert_100_sent) {
          budget.alert_100_sent = true;
          budget.alert_80_sent = true;
          budgetAlert = { percent, is100: true, is80: false, budget };
        } else if (percent >= 80 && !budget.alert_80_sent) {
          budget.alert_80_sent = true;
          budgetAlert = { percent, is100: false, is80: true, budget };
        }
      }
    }

    return { transaction: newTx, budgetAlert };
  }

  // Budgets
  getBudgets(userId: string): Budget[] {
    return this.budgets.get(userId) || [];
  }

  // Categories
  getCategories(userId: string): Category[] {
    return this.categories.get(userId) || INITIAL_CATEGORIES;
  }

  // AI Logs
  addAILog(log: Omit<AILog, 'id' | 'created_at'>): AILog {
    const newLog: AILog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
    };
    this.aiLogs.unshift(newLog);
    return newLog;
  }
}

// Global singleton instance across Next.js API reloads
const globalForServerStore = globalThis as unknown as { serverStore?: ServerStore };
export const serverStore = globalForServerStore.serverStore ?? new ServerStore();
if (process.env.NODE_ENV !== 'production') globalForServerStore.serverStore = serverStore;
