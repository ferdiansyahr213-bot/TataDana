import fs from 'fs';
import path from 'path';
import { 
  UserProfile, Wallet, Category, Budget, Transaction, 
  PaymentRecord, AILog, AIProvider, AISettings, ExportRecord 
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
function getSqliteDb(): any {
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
    `);

    cachedSqliteDb = db;
    return db;
  } catch (err: any) {
    console.warn('[Local Persistence] ℹ️ SQLite native module notice:', err.message);
    return null;
  }
}

/**
 * Load persistent data from local storage (JSON file & SQLite).
 * Returns null if no previous persistent storage file exists.
 */
export function loadLocalDatabase(): PersistentDataSnapshot | null {
  try {
    const jsonPath = getJsonFilePath();
    if (fs.existsSync(jsonPath)) {
      const content = fs.readFileSync(jsonPath, 'utf8');
      if (content && content.trim()) {
        const parsed = JSON.parse(content) as PersistentDataSnapshot;
        console.log(`[Local Persistence] 💾 Berhasil memuat data persisten dari: ${jsonPath}`);
        return parsed;
      }
    }
  } catch (err: any) {
    console.error('[Local Persistence] ⚠️ Gagal membaca tatadana-local-db.json:', err.message);
  }
  return null;
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

        // Sync users
        const usrStmt = db.prepare(`
          INSERT OR REPLACE INTO users (
            id, email, full_name, phone_number, role, plan, verification_status,
            telegram_chat_id, telegram_username, telegram_connected, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            u.updated_at || new Date().toISOString()
          );
        }
      } catch (sqlErr: any) {
        console.warn('[Local Persistence] ⚠️ SQLite sync warning:', sqlErr.message);
      }
    }
  } catch (err: any) {
    console.error('[Local Persistence] ❌ Gagal menyimpan database lokal:', err.message);
  }
}
