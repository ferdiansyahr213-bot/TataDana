import { createClient } from '@supabase/supabase-js';
import { 
  UserProfile, Wallet, Category, Budget, Transaction, 
  AIProvider, AISettings, AILog, PaymentRecord, ExportRecord, UserApproval 
} from '../types';
import { 
  INITIAL_USER, INITIAL_ADMIN, INITIAL_WALLETS, INITIAL_CATEGORIES, 
  INITIAL_BUDGETS, INITIAL_TRANSACTIONS, INITIAL_AI_PROVIDERS, 
  INITIAL_AI_SETTINGS, INITIAL_AI_LOGS, INITIAL_PAYMENTS, INITIAL_EXPORTS 
} from './dev-storage';
import { 
  loadLocalDatabase, saveLocalDatabase, PersistentDataSnapshot, 
  setAppSetting, normalizePhoneNumber, checkUserDuplicateInDb 
} from '../storage/local-db';

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
  settings: Map<string, string> = new Map();
  userApprovals: Map<string, UserApproval> = new Map();
  pendingPurchases: Map<
    string,
    { item: string; amount: number; category: string; tatadanaCategoryName: string; type?: 'expense' | 'income'; createdAt: number }
  > = new Map();

  constructor() {
    const defaultAdminWA = process.env.NEXT_PUBLIC_ADMIN_WA_NUMBER || process.env.NEXT_PUBLIC_ADMIN_WA || '087730370324';
    this.settings.set('admin_wa_number', defaultAdminWA);
    this.settings.set('admin_phone_number', defaultAdminWA);
    this.settings.set('admin_email', 'ferdiansyahr213@gmail.com');

    // 1. PRIORITAS UTAMA: Muat database persisten (SQLite & JSON) terlebih dahulu
    const persisted = loadLocalDatabase();
    if (persisted && persisted.users && persisted.users.length > 0) {
      this.users = new Map(persisted.users);
      if (persisted.wallets) this.wallets = new Map(persisted.wallets);
      if (persisted.categories) this.categories = new Map(persisted.categories);
      if (persisted.budgets) this.budgets = new Map(persisted.budgets);
      if (persisted.transactions) this.transactions = new Map(persisted.transactions);
      if (persisted.payments) this.payments = [...persisted.payments];
      if (persisted.aiLogs) this.aiLogs = [...persisted.aiLogs];
      if (persisted.aiProviders) this.aiProviders = [...persisted.aiProviders];
      if (persisted.aiSettings) this.aiSettings = { ...persisted.aiSettings };
      if (persisted.exports) this.exports = [...persisted.exports];
      if (persisted.settings) {
        for (const [k, v] of persisted.settings) {
          this.settings.set(k, v);
        }
      }
      if (persisted.userApprovals) {
        for (const a of persisted.userApprovals) {
          this.userApprovals.set(a.id, a);
        }
      }

      // Pastikan akun admin utama tetap ada tanpa menimpa nomor WA atau data pengguna yang telah diedit
      if (!this.users.has(INITIAL_ADMIN.id)) {
        this.users.set(INITIAL_ADMIN.id, {
          ...INITIAL_ADMIN,
          phone_number: this.settings.get('admin_wa_number') || defaultAdminWA,
        });
      } else {
        const currentAdmin = this.users.get(INITIAL_ADMIN.id)!;
        const savedSetting = this.settings.get('admin_wa_number') || this.settings.get('admin_phone_number');
        if (savedSetting && currentAdmin.phone_number !== savedSetting) {
          currentAdmin.phone_number = savedSetting;
        }
      }

      // Pastikan dompet admin operasional ada
      if (!this.wallets.has(INITIAL_ADMIN.id) || (this.wallets.get(INITIAL_ADMIN.id)?.length || 0) === 0) {
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

      // Sinkronkan userApprovals untuk setiap pengguna non-admin yang belum ada di daftar approvals
      for (const u of this.users.values()) {
        if (u.role !== 'admin' && u.role !== 'superadmin') {
          const apprId = `appr_${u.id}`;
          if (!this.userApprovals.has(apprId) && !this.userApprovals.has(u.id)) {
            this.userApprovals.set(apprId, {
              id: apprId,
              full_name: u.full_name,
              email: u.email || '',
              phone_number: u.phone_number || '',
              status: (u.verification_status === 'verified' ? 'approved' : 'pending') as any,
              created_at: u.created_at,
              updated_at: u.updated_at,
            });
          }
        }
      }

      const totalTx = Array.from(this.transactions.values()).reduce((sum, list) => sum + list.length, 0);
      console.log(`[ServerStore] 💾 Database persisten aktif! Memuat ${totalTx} transaksi, ${this.users.size} pengguna, ${this.userApprovals.size} approval, dan saldo dompet tanpa reset.`);
    } else {
      // 2. HANYA JIKA DATABASE 100% KOSONG (Fresh Install Pertama Kali):
      this.users.set(INITIAL_USER.id, { ...INITIAL_USER });
      this.users.set(INITIAL_ADMIN.id, { ...INITIAL_ADMIN, phone_number: defaultAdminWA });
      this.wallets.set(INITIAL_USER.id, [...INITIAL_WALLETS]);
      this.categories.set(INITIAL_USER.id, [...INITIAL_CATEGORIES]);
      this.budgets.set(INITIAL_USER.id, [...INITIAL_BUDGETS]);
      this.transactions.set(INITIAL_USER.id, [...INITIAL_TRANSACTIONS]);

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

      this.persist();
      console.log(`[ServerStore] 📁 Database pertama kali diinisialisasi & disimpan permanen ke data/tatadana-local-db.json dan data/tatadana.db`);
    }
  }

  // Persist snapshot to disk (JSON & SQLite) dan Supabase
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
        settings: Array.from(this.settings.entries()),
        userApprovals: Array.from(this.userApprovals.values()),
      };
      saveLocalDatabase(snapshot);

      // Sinkronkan ke Supabase jika kredensial aktif
      if (isServerSupabaseConfigured()) {
        this.syncToSupabase(snapshot).catch((err: any) => {
          console.warn('[ServerStore] Supabase async sync notice:', err.message);
        });
      }
    } catch (err: any) {
      console.error('[ServerStore] ⚠️ Gagal persist database:', err.message);
    }
  }

  async syncToSupabase(snapshot: PersistentDataSnapshot): Promise<void> {
    if (!isServerSupabaseConfigured()) return;
    try {
      if (snapshot.settings && snapshot.settings.length > 0) {
        const rows = snapshot.settings.map(([k, v]) => ({
          key: k,
          value: v,
          updated_at: new Date().toISOString(),
        }));
        await supabaseAdmin.from('app_settings').upsert(rows);
      }
      if (snapshot.userApprovals && snapshot.userApprovals.length > 0) {
        await supabaseAdmin.from('user_approvals').upsert(snapshot.userApprovals);
      }
      if (snapshot.users && snapshot.users.length > 0) {
        const userRows = snapshot.users.map(([, u]) => ({
          id: u.id,
          email: u.email,
          full_name: u.full_name,
          phone_number: u.phone_number,
          role: u.role,
          plan: u.plan,
          verification_status: u.verification_status,
          currency: u.currency,
          telegram_chat_id: u.telegram_chat_id,
          telegram_username: u.telegram_username,
          telegram_connected: u.telegram_connected,
          onboarding_completed: u.onboarding_completed,
          created_at: u.created_at,
          updated_at: u.updated_at,
        }));
        await supabaseAdmin.from('users').upsert(userRows);
      }
      if (snapshot.wallets && snapshot.wallets.length > 0) {
        const allWallets: Wallet[] = [];
        for (const [, list] of snapshot.wallets) allWallets.push(...list);
        if (allWallets.length > 0) {
          await supabaseAdmin.from('wallets').upsert(allWallets);
        }
      }
      if (snapshot.transactions && snapshot.transactions.length > 0) {
        const allTx: Transaction[] = [];
        for (const [, list] of snapshot.transactions) allTx.push(...list);
        if (allTx.length > 0) {
          await supabaseAdmin.from('transactions').upsert(allTx);
        }
      }
    } catch (e: any) {
      console.warn('[ServerStore] syncToSupabase error:', e.message);
    }
  }

  getSetting(key: string, defaultValue?: string): string {
    return this.settings.get(key) || defaultValue || '';
  }

  setSetting(key: string, value: string): void {
    this.settings.set(key, value);
    setAppSetting(key, value);
    this.persist();
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

  // Register or create new user profile with strict duplicate prevention
  registerNewUser(params: { fullName: string; phone: string; email?: string; password?: string }): UserProfile {
    const stdPhone = normalizePhoneNumber(params.phone);
    const cleanEmail = params.email ? params.email.trim().toLowerCase() : (stdPhone ? `${stdPhone}@tatadana.id` : '');

    if (!cleanEmail) {
      throw new Error('Email wajib diisi untuk pendaftaran akun.');
    }
    if (!stdPhone) {
      throw new Error('Nomor handphone wajib diisi untuk pendaftaran akun.');
    }

    // 1. Strict duplicate validation on Email
    const emailDup = this.getUserByEmail(cleanEmail) || checkUserDuplicateInDb(cleanEmail, undefined).isDuplicate;
    if (emailDup) {
      throw new Error('Email ini sudah terdaftar. Silakan gunakan email lain atau masuk ke akun Anda.');
    }

    // 2. Strict duplicate validation on Phone
    const phoneDup = this.getUserByPhone(stdPhone) || checkUserDuplicateInDb(undefined, stdPhone).isDuplicate;
    if (phoneDup) {
      throw new Error('Nomor handphone ini sudah terdaftar. Silakan gunakan nomor lain atau masuk ke akun Anda.');
    }

    const newUserId = `usr_${Date.now()}`;
    const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'ferdiansyahr213@gmail.com').toLowerCase();
    const isSuper = cleanEmail === adminEmail;

    const newUser: UserProfile = {
      id: newUserId,
      full_name: params.fullName,
      phone_number: stdPhone,
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

    // Synchronize to userApprovals
    const approval: UserApproval = {
      id: `appr_${newUserId}`,
      full_name: newUser.full_name,
      email: newUser.email || '',
      phone_number: newUser.phone_number || '',
      status: isSuper ? 'approved' : 'pending',
      created_at: newUser.created_at,
      updated_at: newUser.updated_at,
    };
    this.userApprovals.set(approval.id, approval);

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

  // Update approval and user status safely
  updateApprovalStatus(idOrEmailOrUserId: string, status: 'approved' | 'rejected'): { user?: UserProfile; approval?: UserApproval } {
    let targetUser: UserProfile | undefined;
    let targetApproval: UserApproval | undefined;

    // Search user by id, appr_id, or email
    for (const u of this.users.values()) {
      if (
        u.id === idOrEmailOrUserId || 
        `appr_${u.id}` === idOrEmailOrUserId || 
        (u.email && u.email.toLowerCase() === idOrEmailOrUserId.toLowerCase())
      ) {
        targetUser = u;
        break;
      }
    }

    // Search approval by id or email
    for (const a of this.userApprovals.values()) {
      if (
        a.id === idOrEmailOrUserId || 
        (a.email && a.email.toLowerCase() === idOrEmailOrUserId.toLowerCase()) ||
        (targetUser && a.id === `appr_${targetUser.id}`)
      ) {
        targetApproval = a;
        break;
      }
    }

    if (targetUser) {
      targetUser.verification_status = status === 'approved' ? 'verified' : 'pending';
      targetUser.updated_at = new Date().toISOString();
    }

    if (targetApproval) {
      targetApproval.status = status;
      targetApproval.updated_at = new Date().toISOString();
    } else if (targetUser) {
      targetApproval = {
        id: `appr_${targetUser.id}`,
        full_name: targetUser.full_name,
        email: targetUser.email || '',
        phone_number: targetUser.phone_number || '',
        status,
        created_at: targetUser.created_at,
        updated_at: new Date().toISOString(),
      };
      this.userApprovals.set(targetApproval.id, targetApproval);
    }

    this.persist();
    return { user: targetUser, approval: targetApproval };
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

  // Find user by phone number (with Indonesian phone prefix normalization)
  getUserByPhone(phone: string): UserProfile | undefined {
    const raw = (phone || '').trim();
    if (!raw) return undefined;
    const cleanDigits = raw.replace(/\D/g, '');
    if (!cleanDigits) return undefined;

    // Normalisasi variasi awalan: 08xxx <-> 628xxx
    const variants = new Set<string>();
    variants.add(cleanDigits);
    if (cleanDigits.startsWith('62')) {
      variants.add('0' + cleanDigits.slice(2));
    } else if (cleanDigits.startsWith('0')) {
      variants.add('62' + cleanDigits.slice(1));
    }

    for (const user of this.users.values()) {
      if (!user.phone_number) continue;
      const userDigits = user.phone_number.replace(/\D/g, '');
      if (variants.has(userDigits)) return user;
    }

    // Admin phone aliases
    const adminWA = this.settings.get('admin_wa_number') || this.settings.get('admin_phone_number');
    if (adminWA && variants.has(adminWA.replace(/\D/g, ''))) {
      return this.users.get('usr_admin_999') || Array.from(this.users.values()).find(u => u.role === 'superadmin');
    }

    if (variants.has('081234567890')) {
      return this.users.get('usr_demo_123');
    }
    return undefined;
  }

  // Find user by either email or phone number
  getUserByIdentifier(identifier: string): UserProfile | undefined {
    if (!identifier) return undefined;
    const clean = identifier.trim();

    // 1. Cek langsung jika identifier adalah ID user
    if (this.users.has(clean)) {
      return this.users.get(clean);
    }

    // 2. Prioritaskan email jika mengandung '@'
    if (clean.includes('@')) {
      return this.getUserByEmail(clean);
    }

    // 3. Jika mengandung deretan nomor handphone, cari berdasarkan nomor telepon
    const digitsOnly = clean.replace(/\D/g, '');
    if (digitsOnly.length >= 8) {
      const byPhone = this.getUserByPhone(clean);
      if (byPhone) return byPhone;
    }

    // 4. Fallback pencarian fleksibel
    return this.getUserByEmail(clean) || this.getUserByPhone(clean);
  }

  // User Wallets
  getWallets(userId: string): Wallet[] {
    let list = this.wallets.get(userId);
    if (!list || list.length === 0) {
      const resolvedUser = this.users.get(userId) || this.getUserByIdentifier(userId);
      if (resolvedUser && resolvedUser.id !== userId) {
        list = this.wallets.get(resolvedUser.id);
      }
    }
    if (!list || list.length === 0) {
      const user = this.users.get(userId) || this.getUserByIdentifier(userId);
      const isSuper = user?.role === 'superadmin' || user?.role === 'admin' || userId === 'usr_admin_999' || user?.id === 'usr_admin_999';
      const canonicalId = user?.id || userId;
      const fallbackWallet: Wallet = {
        id: isSuper ? 'wal_admin_1' : `wal_${canonicalId}_1`,
        user_id: canonicalId,
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
      this.wallets.set(canonicalId, list);
      this.persist();
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
    let list = this.transactions.get(userId);
    if (!list || list.length === 0) {
      const resolvedUser = this.users.get(userId) || this.getUserByIdentifier(userId);
      if (resolvedUser && resolvedUser.id !== userId) {
        list = this.transactions.get(resolvedUser.id);
      }
    }
    return list || [];
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
    let list = this.budgets.get(userId);
    if (!list || list.length === 0) {
      const resolvedUser = this.users.get(userId) || this.getUserByIdentifier(userId);
      if (resolvedUser && resolvedUser.id !== userId) {
        list = this.budgets.get(resolvedUser.id);
      }
    }
    return list || [];
  }

  setBudgets(userId: string, budgets: Budget[]): void {
    this.budgets.set(userId, budgets);
    this.persist();
  }

  // Categories
  getCategories(userId: string): Category[] {
    let list = this.categories.get(userId);
    if (!list || list.length === 0) {
      const resolvedUser = this.users.get(userId) || this.getUserByIdentifier(userId);
      if (resolvedUser && resolvedUser.id !== userId) {
        list = this.categories.get(resolvedUser.id);
      }
    }
    if (!list || list.length === 0) {
      list = [...INITIAL_CATEGORIES];
      this.categories.set(userId, list);
      this.persist();
    }
    return list;
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
