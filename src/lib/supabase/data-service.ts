import { supabase } from './client';
import { UserProfile, Wallet, Category, Budget, Transaction } from '../types';
import { getCurrentMonthPeriodWIB, getTodayWIB } from '../utils/date-wib';

export const DEFAULT_USER_FALLBACK: UserProfile = {
  id: 'usr_demo_123',
  email: 'ferdiansyahr213@gmail.com',
  full_name: 'Vina Al Fitriansyah',
  phone_number: '087757524542',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  currency: 'IDR',
  role: 'user',
  plan: 'pro',
  telegram_connected: true,
  reminder_enabled: true,
  reminder_frequency: 1,
  reminder_time_1: '09:00:00',
  reminder_time_2: '20:00:00',
  onboarding_completed: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * 1. Ambil data profil user dari Supabase Auth session, dengan sinkronisasi ke backend
 */
export async function getCurrentUserProfile(requestedUserId?: string | null): Promise<UserProfile> {
  let profile: UserProfile = { ...DEFAULT_USER_FALLBACK };

  // 1. Cek sesi Supabase Auth resmi
  try {
    if (supabase) {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const u = authData.user;
        const meta = u.user_metadata || {};
        profile = {
          ...profile,
          id: u.id,
          email: u.email || profile.email,
          full_name: meta.full_name || meta.name || profile.full_name,
          phone_number: meta.phone || u.phone || profile.phone_number,
          avatar_url: meta.avatar_url || profile.avatar_url,
          role: (meta.role as any) || profile.role,
        };
      }
    }
  } catch (err) {
    // Supabase auth check error handled gracefully
  }

  // 2. Cek sessionStorage client
  if (typeof window !== 'undefined') {
    const sId = requestedUserId || sessionStorage.getItem('current_user_id');
    const sName = sessionStorage.getItem('user_name');
    const sEmail = sessionStorage.getItem('user_email');
    const sPhone = sessionStorage.getItem('user_phone');
    const sRole = sessionStorage.getItem('user_role') as any;

    if (sId) profile.id = sId;
    if (sName) profile.full_name = sName;
    if (sEmail) profile.email = sEmail;
    if (sPhone) profile.phone_number = sPhone;
    if (sRole) profile.role = sRole;
  }

  // 3. Cek data backend / Supabase store
  try {
    const targetId = requestedUserId || profile.id;
    const res = await fetch(`/api/data?userId=${encodeURIComponent(targetId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.user) {
        profile = {
          ...profile,
          ...data.user,
          full_name: data.user.full_name || profile.full_name,
          phone_number: data.user.phone_number || profile.phone_number,
          email: data.user.email || profile.email,
        };
      }
    }
  } catch (err) {
    // network fallback
  }

  return profile;
}

/**
 * 2. Fetch wallets dari Supabase Postgres dengan fallback tersinkronisasi & deduplikasi ID unik
 */
export async function fetchUserWallets(userId: string): Promise<Wallet[]> {
  const sanitizeWallets = (list: Wallet[]): Wallet[] => {
    // 1. Hapus dompet duplikat wal_01
    const filtered = list.filter((w) => w.id !== 'wal_01');
    // 2. Pastikan ID unik (deduplikasi berdasarkan ID)
    const map = new Map<string, Wallet>();
    filtered.forEach((w) => map.set(w.id, w));
    return Array.from(map.values());
  };

  try {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      return sanitizeWallets(data as Wallet[]);
    }
  } catch (e) {
    // fallback below
  }

  // Fallback ke sync endpoint
  try {
    const res = await fetch(`/api/data?userId=${encodeURIComponent(userId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.ok && Array.isArray(data.wallets)) {
        return sanitizeWallets(data.wallets);
      }
    }
  } catch (e) {
    console.error('fetchUserWallets error:', e);
  }

  return [];
}

/**
 * 2b. Hapus dompet (Delete Wallet) dari Supabase Postgres & sync store
 */
export async function deleteUserWallet(userId: string, walletId: string): Promise<boolean> {
  try {
    await supabase.from('wallets').delete().eq('id', walletId).eq('user_id', userId);
  } catch (err) {
    // handled
  }

  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete_wallet',
        payload: { walletId },
        userId,
      }),
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

/**
 * 3. Fetch transactions dari Supabase Postgres diurutkan descending (terbaru di atas)
 */
export async function fetchUserTransactions(userId: string): Promise<Transaction[]> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data as Transaction[];
    }
  } catch (e) {
    // fallback below
  }

  // Fallback ke sync endpoint
  try {
    const res = await fetch(`/api/data?userId=${encodeURIComponent(userId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.ok && Array.isArray(data.transactions)) {
        return (data.transactions as Transaction[]).sort(
          (a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
        );
      }
    }
  } catch (e) {
    console.error('fetchUserTransactions error:', e);
  }

  return [];
}

/**
 * 4. Fetch Budgets dari Supabase Postgres
 */
export async function fetchUserBudgets(userId: string): Promise<Budget[]> {
  try {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId);

    if (!error && Array.isArray(data) && data.length > 0) {
      return data as Budget[];
    }
  } catch (e) {
    // fallback below
  }

  try {
    const res = await fetch(`/api/data?userId=${encodeURIComponent(userId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.ok && Array.isArray(data.budgets)) {
        return data.budgets;
      }
    }
  } catch (e) {
    console.error('fetchUserBudgets error:', e);
  }

  return [];
}

/**
 * 5. Fetch Categories dari Supabase
 */
export async function fetchUserCategories(userId: string): Promise<Category[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*');

    if (!error && Array.isArray(data) && data.length > 0) {
      return data as Category[];
    }
  } catch (e) {
    // fallback below
  }

  try {
    const res = await fetch(`/api/data?userId=${encodeURIComponent(userId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.ok && Array.isArray(data.categories)) {
        return data.categories;
      }
    }
  } catch (e) {
    console.error('fetchUserCategories error:', e);
  }

  return [];
}

/**
 * 6. Insert transaksi ke Supabase Postgres & sinkronkan saldo dompet
 */
export async function insertTransaction(
  userId: string,
  txPayload: Omit<Transaction, 'id' | 'created_at'>
): Promise<{ ok: boolean; transaction?: Transaction; error?: string }> {
  const newTx: Transaction = {
    ...txPayload,
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    user_id: userId,
    created_at: new Date().toISOString(),
  };

  // 1. Eksekusi query insert ke Supabase langsung
  try {
    await supabase.from('transactions').insert([newTx]);

    // Sinkronkan wallet di Supabase
    if (txPayload.type === 'expense' && txPayload.wallet_id) {
      const { data: w } = await supabase.from('wallets').select('balance').eq('id', txPayload.wallet_id).single();
      if (w) {
        await supabase.from('wallets').update({ balance: w.balance - txPayload.amount }).eq('id', txPayload.wallet_id);
      }
    } else if (txPayload.type === 'income' && txPayload.wallet_id) {
      const { data: w } = await supabase.from('wallets').select('balance').eq('id', txPayload.wallet_id).single();
      if (w) {
        await supabase.from('wallets').update({ balance: w.balance + txPayload.amount }).eq('id', txPayload.wallet_id);
      }
    }
  } catch (err) {
    // Handled in backend sync fallback
  }

  // 2. Sinkronkan dengan backend store (Telegram sync & memory store)
  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_transaction',
        payload: txPayload,
        userId,
      }),
    });
    const result = await res.json();
    if (result.ok && result.transaction) {
      return { ok: true, transaction: result.transaction };
    }
  } catch (e) {
    // Use created transaction
  }

  return { ok: true, transaction: newTx };
}

/**
 * 7. Realtime Subscription pada tabel `transactions`
 */
export function subscribeToTransactions(
  userId: string,
  onUpdate: (payload: any) => void
): () => void {
  try {
    const channel = supabase
      .channel(`realtime:transactions:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
        },
        (payload) => {
          onUpdate(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (e) {
    return () => {};
  }
}

/**
 * 8. Agregasi data transaksi nyata untuk metrik Budget & Laporan
 */
export function calculateAggregatedMetrics(
  transactions: Transaction[],
  wallets: Wallet[],
  budgets: Budget[]
) {
  const currentMonth = getCurrentMonthPeriodWIB();

  // 1. Total Saldo
  const totalBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);

  // 2. Transaksi Bulan Ini
  const currentMonthTx = transactions.filter((t) =>
    (t.transaction_date || '').startsWith(currentMonth)
  );

  const monthlyIncome = currentMonthTx
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpense = currentMonthTx
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // 3. Sinkronkan spent di setiap budget berdasarkan transaksi nyata
  const updatedBudgets = budgets.map((b) => {
    const spentInCat = currentMonthTx
      .filter((t) => t.type === 'expense' && t.category_id === b.category_id)
      .reduce((sum, t) => sum + t.amount, 0);

    const actualSpent = spentInCat > 0 ? spentInCat : (b.spent || 0);

    return {
      ...b,
      spent: actualSpent,
    };
  });

  const totalBudgetAmount = updatedBudgets.reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalBudgetSpent = updatedBudgets.reduce((sum, b) => sum + (b.spent || 0), 0);
  const remainingBudget = Math.max(0, totalBudgetAmount - totalBudgetSpent);

  return {
    totalBalance,
    monthlyIncome,
    monthlyExpense,
    updatedBudgets,
    totalBudgetAmount,
    totalBudgetSpent,
    remainingBudget,
  };
}
