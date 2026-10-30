/**
 * Open Finance / Bank Aggregator Service (Brick API Integration)
 * Dokumentasi: https://docs.onebrick.io/
 * Mendukung perbankan Indonesia: BCA, Bank Mandiri, BRI, BNI, CIMB Niaga, Permata, serta e-Wallet.
 */

import { encryptSensitiveToken, decryptSensitiveToken } from '../crypto/encryption';
import { supabase } from '../supabase/client';
import { serverStore } from '../supabase/server';

export interface BankAccountRecord {
  id: string;
  user_id: string;
  institution_id: string;
  institution_name: string;
  account_number: string;
  account_holder_name: string;
  balance: number;
  encrypted_access_token: string;
  token_iv: string;
  token_auth_tag: string;
  status: 'connected' | 'disconnected' | 'action_required';
  last_synced_at: string;
  created_at: string;
}

const BRICK_BASE_URL = process.env.BRICK_ENVIRONMENT === 'production'
  ? 'https://api.onebrick.io/v1'
  : 'https://sandbox.onebrick.io/v1';

const BRICK_CLIENT_ID = process.env.BRICK_CLIENT_ID || 'brick_demo_client_id';
const BRICK_CLIENT_SECRET = process.env.BRICK_CLIENT_SECRET || 'brick_demo_secret';

/**
 * Mendapatkan Public Access Token untuk Widget Otorisasi Akun Bank (Frontend Widget)
 */
export async function getBrickPublicAccessToken(userId: string): Promise<string> {
  const authHeader = Buffer.from(`${BRICK_CLIENT_ID}:${BRICK_CLIENT_SECRET}`).toString('base64');

  try {
    const res = await fetch(`${BRICK_BASE_URL}/auth/token`, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json();
    if (data.status === 200 && data.data?.access_token) {
      return data.data.access_token;
    }
  } catch (err) {
    console.error('Brick auth error:', err);
  }

  // Fallback demo public token untuk pengujian lokal
  return `pub_brick_${userId}_${Date.now()}`;
}

/**
 * Menyimpan koneksi akun bank setelah user sukses otorisasi via Brick Widget
 */
export async function connectBankAccount(params: {
  userId: string;
  institutionId: string;
  institutionName: string;
  accountNumber: string;
  accountHolderName: string;
  initialBalance: number;
  rawAccessToken: string;
}): Promise<BankAccountRecord> {
  const { encryptedData, iv, authTag } = encryptSensitiveToken(params.rawAccessToken);

  const newAccount: BankAccountRecord = {
    id: `bank_acc_${Date.now()}`,
    user_id: params.userId,
    institution_id: params.institutionId,
    institution_name: params.institutionName,
    account_number: params.accountNumber,
    account_holder_name: params.accountHolderName,
    balance: params.initialBalance,
    encrypted_access_token: encryptedData,
    token_iv: iv,
    token_auth_tag: authTag,
    status: 'connected',
    last_synced_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  // Simpan ke Supabase Postgres tabel bank_accounts
  try {
    if (supabase) {
      await supabase.from('bank_accounts').upsert({
        user_id: params.userId,
        institution_id: params.institutionId,
        institution_name: params.institutionName,
        account_number: params.accountNumber,
        account_holder_name: params.accountHolderName,
        balance: params.initialBalance,
        encrypted_access_token: encryptedData,
        token_iv: iv,
        token_auth_tag: authTag,
        status: 'connected',
        last_synced_at: new Date().toISOString(),
      });
    }
  } catch (e) {
    // Non-blocking fallback
  }

  // Sinkronkan ke tabel dompet/wallets sistem
  try {
    const currentWallets = serverStore.wallets.get(params.userId) || [];
    const existingWallet = currentWallets.find(
      (w) => w.name.toLowerCase().includes(params.institutionId.toLowerCase()) || w.name.toLowerCase().includes(params.institutionName.toLowerCase())
    );

    if (existingWallet) {
      existingWallet.balance = params.initialBalance;
      existingWallet.updated_at = new Date().toISOString();
    } else {
      const newWal = {
        id: `wal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        user_id: params.userId,
        name: params.institutionName,
        type: 'bank' as const,
        balance: params.initialBalance,
        is_default: currentWallets.length === 0,
        color: '#003882',
        icon: 'landmark',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      currentWallets.push(newWal);
      serverStore.wallets.set(params.userId, currentWallets);
    }
  } catch (err) {
    // Non-blocking
  }

  return newAccount;
}

/**
 * Mengambil Saldo Terkini Rekening Nyata dari Brick API
 */
export async function fetchLiveBankBalance(account: BankAccountRecord): Promise<number> {
  try {
    const rawToken = decryptSensitiveToken(
      account.encrypted_access_token,
      account.token_iv,
      account.token_auth_tag
    );

    const res = await fetch(`${BRICK_BASE_URL}/account/balance`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${rawToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json();
    if (data.status === 200 && data.data?.balance !== undefined) {
      return Number(data.data.balance);
    }
  } catch (e) {
    console.error('Failed to fetch live balance from Brick:', e);
  }

  return account.balance;
}

/**
 * Mengambil Riwayat Mutasi Rekening Nyata dari Brick API
 */
export async function fetchLiveBankTransactions(
  account: BankAccountRecord,
  fromIsoDate: string,
  toIsoDate: string
): Promise<any[]> {
  try {
    const rawToken = decryptSensitiveToken(
      account.encrypted_access_token,
      account.token_iv,
      account.token_auth_tag
    );

    const res = await fetch(
      `${BRICK_BASE_URL}/account/transactions?from=${fromIsoDate}&to=${toIsoDate}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${rawToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await res.json();
    if (data.status === 200 && Array.isArray(data.data)) {
      return data.data;
    }
  } catch (e) {
    console.error('Failed to fetch live transactions from Brick:', e);
  }

  return [];
}
