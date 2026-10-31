import fs from 'fs';
import path from 'path';
import { 
  UserProfile, Wallet, Category, Budget, Transaction, 
  PaymentRecord, AILog, AIProvider, AISettings, ExportRecord,
  UserApproval
} from '../types';

export interface PersistentDataSnapshot {
  version: number;
  last_updated: string;
  users: [string, UserProfile][];
  wallets: [string, Wallet[]][];
  categories: [string, Category[]][];
  budgets: [string, Budget[]][];
  transactions: [string, Transaction[]][];
  payments: PaymentRecord[];
  aiLogs: AILog[];
  aiProviders: AIProvider[];
  aiSettings: AISettings;
  exports: ExportRecord[];
  settings?: [string, string][];
  userApprovals?: UserApproval[];
}

function getDataDirectory(): string {
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getJsonFilePath(): string {
  return path.join(getDataDirectory(), 'tatadana-local-db.json');
}

function getSqliteFilePath(): string {
  return path.join(getDataDirectory(), 'tatadana.db');
}

// Helper to safely obtain node:sqlite DatabaseSync without triggering webpack static bundling errors
let cachedSqliteDb: any = null;
export function getSqliteDb(): any {
  if (cachedSqliteDb) return cachedSqliteDb;
  try {
    const req = typeof module !== 'undefined' && module.require ? module.require.bind(module) : eval('require');
    const { DatabaseSync } = req('node:sqlite');
    if (!DatabaseSync) return null;

    const dbPath = getSqliteFilePath();
    const db = new DatabaseSync(dbPath);

    // Initialize SQLite tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        wallet_id TEXT NOT NULL,
        wallet_name TEXT,
        category_id TEXT,
        category_name TEXT,
        category_emoji TEXT,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        notes TEXT,
        source TEXT,
        merchant_name TEXT,
        destination_wallet_id TEXT,
        destination_wallet_name TEXT,
        telegram_message_id INTEGER,
        transaction_date TEXT,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS wallets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        balance REAL NOT NULL,
        is_default INTEGER DEFAULT 0,
        color TEXT,
        icon TEXT,
        created_at TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT,
        full_name TEXT NOT NULL,
        phone_number TEXT,
        role TEXT,
        plan TEXT,
        verification_status TEXT,
        telegram_chat_id INTEGER,
        telegram_username TEXT,
        telegram_connected INTEGER DEFAULT 0,
        created_at TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        category_id TEXT NOT NULL,
        category_name TEXT,
        amount REAL NOT NULL,
        spent REAL DEFAULT 0,
        month_period TEXT,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_name TEXT,
        plan TEXT,
        amount REAL NOT NULL,
        payment_method TEXT,
        status TEXT,
        created_at TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS user_approvals (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TEXT,
        updated_at TEXT
      );
    `);

    // Ensure all user columns exist
    const existingCols = db.prepare("PRAGMA table_info(users)").all().map((c: any) => c.name);
    const requiredCols = [
      ['password', 'TEXT'],
      ['avatar_url', 'TEXT'],
      ['currency', 'TEXT DEFAULT "IDR"'],
      ['plan_expires_at', 'TEXT'],
      ['telegram_bot_token', 'TEXT'],
      ['telegram_connected_at', 'TEXT'],
      ['reminder_enabled', 'INTEGER DEFAULT 1'],
      ['reminder_frequency', 'INTEGER DEFAULT 1'],
      ['reminder_time_1', 'TEXT DEFAULT "09:00:00"'],
      ['reminder_time_2', 'TEXT DEFAULT "20:00:00"'],
      ['onboarding_completed', 'INTEGER DEFAULT 1']
    ];

    for (const [col, type] of requiredCols) {
      if (!existingCols.includes(col)) {
        try {
          db.exec(`ALTER TABLE users ADD COLUMN ${col} ${type};`);
        } catch {
          // ignore
        }
      }
    }

    // Ensure UNIQUE indexes exist on email and phone_number
    try {
      db.exec(`
        DELETE FROM users 
        WHERE rowid NOT IN (
          SELECT MIN(rowid) FROM users GROUP BY email
        ) AND email IS NOT NULL AND email != '';

        DELETE FROM users 
        WHERE rowid NOT IN (
          SELECT MIN(rowid) FROM users GROUP BY phone_number
        ) AND phone_number IS NOT NULL AND phone_number != '';

        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email IS NOT NULL AND email != '';
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique ON users(phone_number) WHERE phone_number IS NOT NULL AND phone_number != '';
      `);
    } catch (idxErr: any) {
      console.warn('[Local Persistence] Index creation notice:', idxErr.message);
    }

    cachedSqliteDb = db;
    return db;
  } catch (err: any) {
    console.warn('[Local Persistence] ℹ️ SQLite native module notice:', err.message);
    return null;
  }
}

/**
 * Normalisasi format nomor handphone standar Indonesia (awalan 08...)
 */
export function normalizePhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  let clean = phone.replace(/\D/g, '');
  if (!clean) return '';
  if (clean.startsWith('62')) {
    clean = '0' + clean.slice(2);
  } else if (!clean.startsWith('0')) {
    clean = '0' + clean;
  }
  return clean;
}

/**
 * Pengecekan duplikasi email dan nomor handphone langsung di SQLite
 */
export function checkUserDuplicateInDb(email?: string, phone?: string): { isDuplicate: boolean; field?: 'email' | 'phone'; message?: string } {
  try {
    const db = getSqliteDb();
    if (db) {
      if (email && email.trim()) {
        const cleanEmail = email.trim().toLowerCase();
        const row = db.prepare('SELECT id FROM users WHERE LOWER(TRIM(email)) = ?').get(cleanEmail);
        if (row) {
          return {
            isDuplicate: true,
            field: 'email',
            message: 'Email ini sudah terdaftar. Silakan gunakan email lain atau masuk ke akun Anda.',
          };
        }
      }

      if (phone && phone.trim()) {
        const stdPhone = normalizePhoneNumber(phone);
        const rawDigits = phone.replace(/\D/g, '');
        const rows = db.prepare("SELECT id, phone_number FROM users WHERE phone_number IS NOT NULL AND phone_number != ''").all() as any[];
        for (const r of rows) {
          const userStd = normalizePhoneNumber(r.phone_number);
          if (userStd === stdPhone || (rawDigits.length >= 8 && r.phone_number.replace(/\D/g, '').endsWith(rawDigits.slice(-9)))) {
            return {
              isDuplicate: true,
              field: 'phone',
              message: 'Nomor handphone ini sudah terdaftar. Silakan gunakan nomor lain atau masuk ke akun Anda.',
            };
          }
        }
      }
    }
  } catch (e: any) {
    console.warn('[Local Persistence] Duplicate check notice:', e.message);
  }

  return { isDuplicate: false };
}

/**
 * Settings helpers
 */
export function getAppSetting(key: string, defaultValue?: string): string {
  try {
    const db = getSqliteDb();
    if (db) {
      const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value: string } | undefined;
      if (row && row.value !== undefined && row.value !== null) return row.value;
    }
  } catch (e) {
    // fallback
  }
  return defaultValue || '';
}

export function setAppSetting(key: string, value: string): void {
  try {
    const db = getSqliteDb();
    if (db) {
      db.prepare(`
        INSERT OR REPLACE INTO app_settings (key, value, updated_at)
        VALUES (?, ?, ?)
      `).run(key, value, new Date().toISOString());
    }
  } catch (e: any) {
    console.warn('[Local Persistence] Failed to set app_setting in SQLite:', e.message);
  }
}

export function getAllAppSettings(): Record<string, string> {
  const result: Record<string, string> = {};
  try {
    const db = getSqliteDb();
    if (db) {
      const rows = db.prepare('SELECT key, value FROM app_settings').all() as { key: string; value: string }[];
      for (const row of rows) {
        result[row.key] = row.value;
      }
    }
  } catch (e) {
    // ignore
  }
  return result;
}

/**
 * User approvals helpers
 */
export function getUserApprovalsFromDb(): UserApproval[] {
  try {
    const db = getSqliteDb();
    if (db) {
      const rows = db.prepare('SELECT * FROM user_approvals ORDER BY created_at DESC').all() as any[];
      return rows.map(r => ({
        id: r.id,
        user_id: r.user_id,
        full_name: r.full_name,
        email: r.email,
        phone_number: r.phone_number,
        status: r.status as any,
        created_at: r.created_at,
        updated_at: r.updated_at,
      }));
    }
  } catch (e) {
    // ignore
  }
  return [];
}

export function saveUserApprovalToDb(approval: UserApproval): void {
  try {
    const db = getSqliteDb();
    if (db) {
      db.prepare(`
        INSERT OR REPLACE INTO user_approvals (id, user_id, full_name, email, phone_number, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        approval.id,
        (approval as any).user_id || approval.id,
        approval.full_name,
        approval.email,
        approval.phone_number,
        approval.status || 'pending',
        approval.created_at || new Date().toISOString(),
        approval.updated_at || new Date().toISOString()
      );
    }
  } catch (e: any) {
    console.warn('[Local Persistence] Failed to save user_approval in SQLite:', e.message);
  }
}

/**
 * Load persistent data from local storage (JSON file & SQLite).
 * Returns null if no previous persistent storage file exists.
 */
export function loadLocalDatabase(): PersistentDataSnapshot | null {
  let parsed: PersistentDataSnapshot | null = null;
  const jsonPath = getJsonFilePath();

  try {
    if (fs.existsSync(jsonPath)) {
      const content = fs.readFileSync(jsonPath, 'utf8');
      if (content && content.trim()) {
        parsed = JSON.parse(content) as PersistentDataSnapshot;
        console.log(`[Local Persistence] 💾 Berhasil memuat data persisten dari: ${jsonPath}`);
      }
    }
  } catch (err: any) {
    console.error('[Local Persistence] ⚠️ Gagal membaca tatadana-local-db.json:', err.message);
  }

  // Load and merge SQLite data
  try {
    const db = getSqliteDb();
    if (db) {
      // 1. Settings from SQLite
      const settingRows = db.prepare('SELECT key, value FROM app_settings').all() as { key: string; value: string }[];
      const settingsMap = new Map<string, string>();
      if (parsed?.settings) {
        for (const [k, v] of parsed.settings) settingsMap.set(k, v);
      }
      for (const row of settingRows) {
        settingsMap.set(row.key, row.value);
      }

      // 2. Approvals from SQLite
      const approvalRows = db.prepare('SELECT * FROM user_approvals ORDER BY created_at DESC').all() as any[];
      const approvalMap = new Map<string, UserApproval>();
      if (parsed?.userApprovals) {
        for (const a of parsed.userApprovals) approvalMap.set(a.id, a);
      }
      for (const r of approvalRows) {
        approvalMap.set(r.id, {
          id: r.id,
          full_name: r.full_name,
          email: r.email,
          phone_number: r.phone_number,
          status: r.status as any,
          created_at: r.created_at,
          updated_at: r.updated_at,
        });
      }

      // 3. Users from SQLite
      const userRows = db.prepare('SELECT * FROM users').all() as any[];
      const usersMap = new Map<string, UserProfile>();
      if (parsed?.users) {
        for (const [k, u] of parsed.users) usersMap.set(k, u);
      }
      for (const r of userRows) {
        const existing = usersMap.get(r.id);
        const mergedUser: UserProfile = {
          id: r.id,
          email: r.email || existing?.email || '',
          full_name: r.full_name || existing?.full_name || '',
          phone_number: r.phone_number || existing?.phone_number || '',
          role: r.role || existing?.role || 'user',
          plan: r.plan || existing?.plan || 'starter',
          verification_status: r.verification_status || existing?.verification_status || 'verified',
          password: r.password || existing?.password,
          avatar_url: r.avatar_url || existing?.avatar_url,
          currency: r.currency || existing?.currency || 'IDR',
          plan_expires_at: r.plan_expires_at || existing?.plan_expires_at,
          telegram_chat_id: r.telegram_chat_id || existing?.telegram_chat_id,
          telegram_username: r.telegram_username || existing?.telegram_username,
          telegram_bot_token: r.telegram_bot_token || existing?.telegram_bot_token,
          telegram_connected: r.telegram_connected === 1 || Boolean(existing?.telegram_connected),
          telegram_connected_at: r.telegram_connected_at || existing?.telegram_connected_at,
          reminder_enabled: r.reminder_enabled !== 0,
          reminder_frequency: (r.reminder_frequency === 2 ? 2 : 1) as 1 | 2,
          reminder_time_1: r.reminder_time_1 || existing?.reminder_time_1 || '09:00:00',
          reminder_time_2: r.reminder_time_2 || existing?.reminder_time_2 || '20:00:00',
          onboarding_completed: r.onboarding_completed !== 0,
          created_at: r.created_at || existing?.created_at || new Date().toISOString(),
          updated_at: r.updated_at || existing?.updated_at || new Date().toISOString(),
        };
        usersMap.set(r.id, mergedUser);
      }

      if (!parsed && usersMap.size > 0) {
        parsed = {
          version: 1,
          last_updated: new Date().toISOString(),
          users: Array.from(usersMap.entries()),
          wallets: [],
          categories: [],
          budgets: [],
          transactions: [],
          payments: [],
          aiLogs: [],
          aiProviders: [],
          aiSettings: { mode: 'single', active_single_provider: 'gemini' },
          exports: [],
        };
      }

      if (parsed) {
        parsed.users = Array.from(usersMap.entries());
        parsed.settings = Array.from(settingsMap.entries());
        parsed.userApprovals = Array.from(approvalMap.values());
      }
    }
  } catch (sqlErr: any) {
    console.warn('[Local Persistence] ⚠️ SQLite load merge warning:', sqlErr.message);
  }

  return parsed;
}

/**
 * Save complete persistent data atomically to disk (JSON snapshot and SQLite tables).
 */
export function saveLocalDatabase(snapshot: PersistentDataSnapshot): void {
  try {
    const dir = getDataDirectory();
    const jsonPath = getJsonFilePath();
    const tempPath = path.join(dir, 'tatadana-local-db.json.tmp');

    // 1. Atomic write to JSON
    fs.writeFileSync(tempPath, JSON.stringify(snapshot, null, 2), 'utf8');
    fs.renameSync(tempPath, jsonPath);

    // 2. Sync to SQLite database tables
    const db = getSqliteDb();
    if (db) {
      try {
        // Sync transactions
        const txStmt = db.prepare(`
          INSERT OR REPLACE INTO transactions (
            id, user_id, wallet_id, wallet_name, category_id, category_name, category_emoji,
            type, amount, notes, source, merchant_name, destination_wallet_id, destination_wallet_name,
            telegram_message_id, transaction_date, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const [, txList] of snapshot.transactions) {
          for (const tx of txList) {
            txStmt.run(
              tx.id,
              tx.user_id,
              tx.wallet_id,
              tx.wallet_name || '',
              tx.category_id || '',
              tx.category_name || '',
              tx.category_emoji || '',
              tx.type,
              tx.amount,
              tx.notes || '',
              tx.source || 'web',
              tx.merchant_name || '',
              tx.destination_wallet_id || '',
              tx.destination_wallet_name || '',
              tx.telegram_message_id || null,
              tx.transaction_date || new Date().toISOString(),
              tx.created_at || new Date().toISOString()
            );
          }
        }

        // Sync wallets
        const walStmt = db.prepare(`
          INSERT OR REPLACE INTO wallets (
            id, user_id, name, type, balance, is_default, color, icon, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const [, walList] of snapshot.wallets) {
          for (const w of walList) {
            walStmt.run(
              w.id,
              w.user_id,
              w.name,
              w.type,
              w.balance,
              w.is_default ? 1 : 0,
              w.color || '',
              w.icon || '',
              w.created_at || new Date().toISOString(),
              w.updated_at || new Date().toISOString()
            );
          }
        }

        // Sync users with full schema
        const usrStmt = db.prepare(`
          INSERT OR REPLACE INTO users (
            id, email, full_name, phone_number, role, plan, verification_status,
            telegram_chat_id, telegram_username, telegram_connected, created_at, updated_at,
            password, avatar_url, currency, plan_expires_at, telegram_bot_token, telegram_connected_at,
            reminder_enabled, reminder_frequency, reminder_time_1, reminder_time_2, onboarding_completed
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const [, u] of snapshot.users) {
          usrStmt.run(
            u.id,
            u.email || '',
            u.full_name,
            u.phone_number || '',
            u.role,
            u.plan,
            u.verification_status || 'verified',
            u.telegram_chat_id || null,
            u.telegram_username || '',
            u.telegram_connected ? 1 : 0,
            u.created_at || new Date().toISOString(),
            u.updated_at || new Date().toISOString(),
            u.password || null,
            u.avatar_url || null,
            u.currency || 'IDR',
            u.plan_expires_at || null,
            u.telegram_bot_token || null,
            u.telegram_connected_at || null,
            u.reminder_enabled ? 1 : 0,
            u.reminder_frequency || 1,
            u.reminder_time_1 || '09:00:00',
            u.reminder_time_2 || '20:00:00',
            u.onboarding_completed ? 1 : 0
          );
        }

        // Sync budgets
        const budStmt = db.prepare(`
          INSERT OR REPLACE INTO budgets (
            id, user_id, category_id, category_name, amount, spent, month_period, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const [, bList] of snapshot.budgets) {
          for (const b of bList) {
            budStmt.run(
              b.id,
              b.user_id,
              b.category_id,
              b.category_name || '',
              b.amount,
              b.spent || 0,
              b.month_period || '',
              b.created_at || new Date().toISOString()
            );
          }
        }

        // Sync payments
        const payStmt = db.prepare(`
          INSERT OR REPLACE INTO payments (
            id, user_id, user_name, plan, amount, payment_method, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const p of snapshot.payments) {
          payStmt.run(
            p.id,
            p.user_id,
            p.user_name || '',
            p.plan,
            p.amount,
            p.payment_method,
            p.status,
            p.created_at || new Date().toISOString(),
            p.updated_at || new Date().toISOString()
          );
        }

        // Sync settings
        if (snapshot.settings && snapshot.settings.length > 0) {
          const setStmt = db.prepare(`
            INSERT OR REPLACE INTO app_settings (key, value, updated_at)
            VALUES (?, ?, ?)
          `);
          for (const [k, v] of snapshot.settings) {
            setStmt.run(k, v, new Date().toISOString());
          }
        }

        // Sync user_approvals
        if (snapshot.userApprovals && snapshot.userApprovals.length > 0) {
          const apprStmt = db.prepare(`
            INSERT OR REPLACE INTO user_approvals (
              id, user_id, full_name, email, phone_number, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const a of snapshot.userApprovals) {
            apprStmt.run(
              a.id,
              (a as any).user_id || a.id,
              a.full_name,
              a.email,
              a.phone_number,
              a.status || 'pending',
              a.created_at || new Date().toISOString(),
              a.updated_at || new Date().toISOString()
            );
          }
        }
      } catch (sqlErr: any) {
        console.warn('[Local Persistence] ⚠️ SQLite sync warning:', sqlErr.message);
      }
    }
  } catch (err: any) {
    console.error('[Local Persistence] ❌ Gagal menyimpan database lokal:', err.message);
  }
}
