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
import { loadLocalDatabase, saveLocalDatabase, PersistentDataSnapshot } from '../storage/local-db';

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
    { item: string; amount: number; category: string; tatadanaCategoryName: string; type?: 'expense' | 'income'; createdAt: number }
  > = new Map();

  constructor() {
    this.users.set(INITIAL_USER.id, { ...INITIAL_USER });
    this.users.set(INITIAL_ADMIN.id, { ...INITIAL_ADMIN });

    // Pending demo user for testing approval workflows
    this.users.set('usr_demo_456', {
      id: 'usr_demo_456',
      email: 'siti.rahma@tatadana.id',
      full_name: 'Siti Rahma',
      phone_number: '081987654321',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      currency: 'IDR',
      role: 'user',
      plan: 'starter',
      verification_status: 'pending',
      telegram_connected: false,
      reminder_enabled: true,
      reminder_frequency: 1,
      reminder_time_1: '09:00:00',
      reminder_time_2: '20:00:00',
      onboarding_completed: true,
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      updated_at: new Date().toISOString(),
    });

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
    this.budgets.set(INITIAL_ADMIN.id, []);

    // Restore from persistent storage (JSON & SQLite) if available
    const persisted = loadLocalDatabase();
    if (persisted) {
      if (persisted.users && persisted.users.length > 0) this.users = new Map(persisted.users);
      if (persisted.wallets && persisted.wallets.length > 0) this.wallets = new Map(persisted.wallets);
      if (persisted.categories && persisted.categories.length > 0) this.categories = new Map(persisted.categories);
      if (persisted.budgets && persisted.budgets.length > 0) this.budgets = new Map(persisted.budgets);
      if (persisted.transactions && persisted.transactions.length > 0) this.transactions = new Map(persisted.transactions);
      if (persisted.payments && persisted.payments.length > 0) this.payments = [...persisted.payments];
      if (persisted.aiLogs && persisted.aiLogs.length > 0) this.aiLogs = [...persisted.aiLogs];
      if (persisted.aiProviders && persisted.aiProviders.length > 0) this.aiProviders = [...persisted.aiProviders];
      if (persisted.aiSettings) this.aiSettings = { ...persisted.aiSettings };
      if (persisted.exports && persisted.exports.length > 0) this.exports = [...persisted.exports];

      // Ensure admin & initial user exist if somehow omitted
      if (!this.users.has(INITIAL_USER.id)) this.users.set(INITIAL_USER.id, { ...INITIAL_USER });
      if (!this.users.has(INITIAL_ADMIN.id)) this.users.set(INITIAL_ADMIN.id, { ...INITIAL_ADMIN });
      if (!this.wallets.has(INITIAL_ADMIN.id)) {
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
      }

      const totalTx = Array.from(this.transactions.values()).reduce((sum, list) => sum + list.length, 0);
      console.log(`[ServerStore] 💾 Database lokal aktif! Memuat ${totalTx} transaksi, ${this.users.size} pengguna, dan saldo dompet.`);
    } else {
      // First run: persist baseline data so files exist
      this.persist();
      console.log(`[ServerStore] 📁 Database lokal pertama kali diinisialisasi & disimpan ke data/tatadana-local-db.json dan data/tatadana.db`);
    }
  }

  // Persist snapshot to disk (JSON & SQLite)
  persist(): void {
    try {
      const snapshot: PersistentDataSnapshot = {
        version: 1,
        last_updated: new Date().toISOString(),
        users: Array.from(this.users.entries()),
        wallets: Array.from(this.wallets.entries()),
        categories: Array.from(this.categories.entries()),
        budgets: Array.from(this.budgets.entries()),
        transactions: Array.from(this.transactions.entries()),
        payments: this.payments,
        aiLogs: this.aiLogs,
        aiProviders: this.aiProviders,
        aiSettings: this.aiSettings,
        exports: this.exports,
      };
      saveLocalDatabase(snapshot);
    } catch (err: any) {
      console.error('[ServerStore] ⚠️ Gagal persist database:', err.message);
    }
  }

  setPendingPurchase(
    userId: string,
    data: { item: string; amount: number; category: string; tatadanaCategoryName: string; type?: 'expense' | 'income' }
  ) {
    this.pendingPurchases.set(userId, { type: 'expense', ...data, createdAt: Date.now() });
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
    // 1. Khusus bot admin @TataDanaVinaCantikBot (Token 8909831540...) kaitkan langsung ke Administrator TataDana
    if (botToken && (botToken.startsWith('8909831540') || botToken.includes('AAF-dPsFSHtwz3soxsToyTSaF7SYpCy3RLOI'))) {
      const admin = this.users.get('usr_admin_999') || this.getUserByEmail('ferdiansyahr213@gmail.com');
      if (admin) {
        admin.telegram_chat_id = chatId;
        admin.telegram_connected = true;
        admin.telegram_bot_token = botToken;
        admin.telegram_username = 'TataDanaVinaCantikBot';
        return admin;
      }
    }

    for (const user of this.users.values()) {
      if (user.telegram_chat_id === chatId) return user;
    }

    // Check if user has registered custom bot token
    if (botToken && !botToken.startsWith('demo_')) {
      for (const user of this.users.values()) {
        if (user.telegram_bot_token === botToken) {
          user.telegram_chat_id = chatId;
          user.telegram_connected = true;
          return user;
        }
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
      this.persist();
      return user;
    }
    return undefined;
  }

  // Register or create new user profile with initial structure
  registerNewUser(params: { fullName: string; phone: string; email?: string; password?: string }): UserProfile {
    const cleanPhone = (params.phone || '').replace(/\D/g, '');
    const cleanEmail = params.email ? params.email.trim().toLowerCase() : `${cleanPhone}@tatadana.id`;

    // Check existing by email or phone
    const existing = this.getUserByEmail(cleanEmail) || (cleanPhone ? this.getUserByPhone(cleanPhone) : undefined);
    if (existing) {
      existing.full_name = params.fullName || existing.full_name;
      if (params.email) existing.email = cleanEmail;
      if (params.password) existing.password = params.password;
      existing.updated_at = new Date().toISOString();
      this.persist();
      return existing;
    }

    const newUserId = `usr_${Date.now()}`;
    const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'ferdiansyahr213@gmail.com').toLowerCase();
    const isSuper = cleanEmail === adminEmail;

    const newUser: UserProfile = {
      id: newUserId,
      full_name: params.fullName,
      phone_number: params.phone,
      email: cleanEmail,
      password: params.password,
      currency: 'IDR',
      role: isSuper ? 'superadmin' : 'user',
      verification_status: isSuper ? 'verified' : 'pending',
      plan: isSuper ? 'pro' : 'starter',
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

    this.persist();
    return newUser;
  }

  // Find user by email
  getUserByEmail(email: string): UserProfile | undefined {
    if (!email) return undefined;
    const cleanEmail = email.trim().toLowerCase();
    // Alias email admin
    if (cleanEmail === 'ferdiansyahrz13@gmail.com' || cleanEmail === 'ferdiansyahr213@gmail.com') {
      return this.users.get('usr_admin_999') || Array.from(this.users.values()).find(u => u.role === 'superadmin');
    }
    for (const user of this.users.values()) {
      if (user.email?.trim().toLowerCase() === cleanEmail) return user;
    }
    return undefined;
  }

  // Find user by phone number
  getUserByPhone(phone: string): UserProfile | undefined {
    const cleanPhone = (phone || '').replace(/\D/g, '');
    for (const user of this.users.values()) {
      if (user.phone_number?.replace(/\D/g, '') === cleanPhone) return user;
    }
    if (cleanPhone === '081234567890') {
      return this.users.get('usr_demo_123');
    }
    return undefined;
  }

  // User Wallets
  getWallets(userId: string): Wallet[] {
    let list = this.wallets.get(userId);
    if (!list || list.length === 0) {
      const user = this.users.get(userId);
      const isSuper = user?.role === 'superadmin' || user?.role === 'admin' || userId === 'usr_admin_999';
      const fallbackWallet: Wallet = {
        id: isSuper ? 'wal_admin_1' : `wal_${userId}_1`,
        user_id: userId,
        name: isSuper ? 'Rekening Operasional Admin' : 'Dompet Utama',
        type: 'bank',
        balance: isSuper ? 50000000 : 1000000,
        is_default: true,
        color: isSuper ? '#4f46e5' : '#0284c7',
        icon: isSuper ? 'shield' : 'landmark',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      list = [fallbackWallet];
      this.wallets.set(userId, list);
    }
    return list;
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
        this.persist();
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
    if (!tx.wallet_id || typeof tx.wallet_id !== 'string' || tx.wallet_id.trim() === '') {
      throw new Error('wallet_id wajib disertakan untuk memotong saldo dompet yang dipilih');
    }

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

    this.persist();
    return { transaction: newTx, budgetAlert };
  }

  // Budgets
  getBudgets(userId: string): Budget[] {
    return this.budgets.get(userId) || [];
  }

  setBudgets(userId: string, budgets: Budget[]): void {
    this.budgets.set(userId, budgets);
    this.persist();
  }

  // Categories
  getCategories(userId: string): Category[] {
    return this.categories.get(userId) || INITIAL_CATEGORIES;
  }

  setCategories(userId: string, categories: Category[]): void {
    this.categories.set(userId, categories);
    this.persist();
  }

  setWallets(userId: string, wallets: Wallet[]): void {
    this.wallets.set(userId, wallets);
    this.persist();
  }

  setUser(userId: string, user: UserProfile): void {
    this.users.set(userId, user);
    this.persist();
  }

  // AI Logs
  addAILog(log: Omit<AILog, 'id' | 'created_at'>): AILog {
    const newLog: AILog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
    };
    this.aiLogs.unshift(newLog);
    this.persist();
    return newLog;
  }
}

// Global singleton instance across Next.js API reloads
const globalForServerStore = globalThis as unknown as { serverStore?: ServerStore };
export const serverStore = globalForServerStore.serverStore ?? new ServerStore();
if (process.env.NODE_ENV !== 'production') globalForServerStore.serverStore = serverStore;
