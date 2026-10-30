import { supabase, isLiveSupabaseConfigured } from './client';
import { UserProfile, Wallet, Category, Budget, Transaction, UserApproval } from '../types';
import { getCurrentMonthPeriodWIB, getTodayWIB } from '../utils/date-wib';

// Helper timeout untuk mencegah blocking network hang pada query Supabase
async function withQueryTimeout<T>(promise: PromiseLike<T> | Promise<T>, timeoutMs = 2500): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Network query timeout')), timeoutMs)
  );
  return Promise.race([Promise.resolve(promise), timeoutPromise]);
}

export const DEFAULT_USER_FALLBACK: UserProfile = {
  id: '',
  email: '',
  full_name: '',
  phone_number: '',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  currency: 'IDR',
  role: 'user',
  plan: 'starter',
  telegram_connected: false,
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
    const authResult = await withQueryTimeout(supabase.auth.getUser(), 2000);
    if (authResult?.data?.user) {
      const u = authResult.data.user;
      const meta = u.user_metadata || {};
      profile = {
        ...profile,
        id: u.id,
        email: u.email || profile.email,
        full_name: meta.full_name || meta.name || profile.full_name,
        phone_number: meta.phone || u.phone || profile.phone_number,
        avatar_url: meta.avatar_url || profile.avatar_url,
        role: (meta.role as any) || profile.role,
        plan: (meta.plan as any) || profile.plan,
      };
    }
  } catch (err) {
    // Supabase auth check error handled gracefully
  }

  // 2. Cek sessionStorage client (Instan 0ms)
  if (typeof window !== 'undefined') {
    const sId = requestedUserId || sessionStorage.getItem('current_user_id') || sessionStorage.getItem('user_id');
    const sName = sessionStorage.getItem('user_name');
    const sEmail = sessionStorage.getItem('user_email');
    const sPhone = sessionStorage.getItem('user_phone');
    const sRole = sessionStorage.getItem('user_role') as any;
    const sPlan = sessionStorage.getItem('user_plan') as any;
    const sStatus = sessionStorage.getItem('user_verification_status') as any;
    const sAvatar = sessionStorage.getItem('user_avatar');

    if (sId) profile.id = sId;
    if (sName) profile.full_name = sName;
    if (sEmail) profile.email = sEmail;
    if (sPhone) profile.phone_number = sPhone;
    if (sRole) profile.role = sRole;
    if (sPlan) profile.plan = sPlan;
    if (sStatus) profile.verification_status = sStatus;
    if (sAvatar) profile.avatar_url = sAvatar;
  }

  // 3. Cek data backend / Supabase store
  try {
    const targetId = requestedUserId || profile.id;
    if (targetId) {
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
            avatar_url: data.user.avatar_url || profile.avatar_url,
            verification_status: data.user.verification_status || profile.verification_status,
          };
        }
      }
    }
  } catch (err) {
    // network fallback
  }

  // 4. Safe Display Name & ID fallback
  if (
    !profile.full_name ||
    !profile.full_name.trim() ||
    profile.full_name === 'Vina Al Fitriansyah' ||
    profile.full_name === 'Pengguna TataDana' ||
    profile.full_name === 'Budi Santoso' ||
    profile.full_name === 'Test Pending User'
  ) {
    if (profile.email && profile.email.includes('@')) {
      const prefix = profile.email.split('@')[0];
      profile.full_name = prefix ? (prefix.charAt(0).toUpperCase() + prefix.slice(1)) : profile.email;
    } else {
      profile.full_name = 'Pengguna';
    }
  }

  if (profile.id === 'usr_demo_123' || profile.id === 'usr_demo_456') {
    if (profile.email) {
      profile.id = profile.email;
    }
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

  // Jika Live Supabase aktif, jalankan query langsung dengan timeout pengaman (maks 2.5s)
  if (isLiveSupabaseConfigured()) {
    try {
      const query = supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      const { data, error } = await withQueryTimeout(query, 2500);

      if (!error && Array.isArray(data) && data.length > 0) {
        return sanitizeWallets(data as Wallet[]);
      }
    } catch (e) {
      // fallback instan ke endpoint data
    }
  }

  // Fallback ke sync endpoint (cepat, < 80ms)
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
  // 1. Validasi Ketat: Hilangkan fallback default dompet sepihak
  if (!txPayload.wallet_id || typeof txPayload.wallet_id !== 'string' || txPayload.wallet_id.trim() === '') {
    return {
      ok: false,
      error: 'wallet_id wajib disertakan. Transaksi ditolak untuk mencegah pemotongan dompet default secara sembarangan.',
    };
  }

  if (!txPayload.amount || txPayload.amount <= 0) {
    return {
      ok: false,
      error: 'Nominal transaksi (amount) tidak valid',
    };
  }

  const newTx: Transaction = {
    ...txPayload,
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    user_id: userId,
    created_at: new Date().toISOString(),
  };

  // 1. Eksekusi query pengurangan saldo ke Supabase langsung:
  // UPDATE wallets SET balance = balance - amount WHERE id = wallet_id AND user_id = userId
  try {
    await supabase.from('transactions').insert([newTx]);

    // Sinkronkan saldo dompet spesifik di Supabase
    if (txPayload.type === 'expense' && txPayload.wallet_id) {
      const { data: w } = await supabase
        .from('wallets')
        .select('balance')
        .eq('id', txPayload.wallet_id)
        .eq('user_id', userId)
        .single();
      if (w) {
        await supabase
          .from('wallets')
          .update({
            balance: w.balance - txPayload.amount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', txPayload.wallet_id)
          .eq('user_id', userId);
      }
    } else if (txPayload.type === 'income' && txPayload.wallet_id) {
      const { data: w } = await supabase
        .from('wallets')
        .select('balance')
        .eq('id', txPayload.wallet_id)
        .eq('user_id', userId)
        .single();
      if (w) {
        await supabase
          .from('wallets')
          .update({
            balance: w.balance + txPayload.amount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', txPayload.wallet_id)
          .eq('user_id', userId);
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
        payload: {
          ...txPayload,
          wallet_id: txPayload.wallet_id, // Pastikan wallet_id dikirim secara eksplisit
        },
        userId,
      }),
    });
    const result = await res.json();
    if (!result.ok) {
      return { ok: false, error: result.error || 'Gagal memproses transaksi di backend' };
    }
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
  // Hanya aktifkan WebSocket jika live Supabase terkonfigurasi (cegah WebSocket loop retry di localhost)
  if (!isLiveSupabaseConfigured()) {
    return () => {};
  }

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

/**
 * 9. Simpan pendaftar baru ke tabel `user_approvals` via Supabase Client
 */
export async function insertUserApproval(params: {
  full_name: string;
  email: string;
  phone_number: string;
  password?: string;
}): Promise<{ ok: boolean; data?: UserApproval; error?: string }> {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanPhone = params.phone_number.trim();
  const cleanName = params.full_name.trim();

  try {
    // 1. Insert ke tabel user_approvals Supabase Client secara langsung
    const { data, error } = await supabase
      .from('user_approvals')
      .insert([
        {
          full_name: cleanName,
          email: cleanEmail,
          phone_number: cleanPhone,
          status: 'pending',
        },
      ])
      .select()
      .maybeSingle();

    if (error) {
      console.warn('Supabase user_approvals insert notice:', error.message);
    }

    // 2. Sinkronkan juga ke backend data route agar akun & wallet tersiapkan
    const syncRes = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'register_user',
        payload: {
          fullName: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          password: params.password || 'tatadana_default_pwd',
        },
      }),
    });
    const syncData = await syncRes.json();

    const resultApproval: UserApproval = data || {
      id: syncData.user?.id || `appr_${Date.now()}`,
      full_name: cleanName,
      email: cleanEmail,
      phone_number: cleanPhone,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    return { ok: true, data: resultApproval };
  } catch (err: any) {
    console.error('Failed to insert user approval:', err);
    return { ok: false, error: err.message || 'Gagal menyimpan pendaftaran ke database' };
  }
}

/**
 * 10. Fetch data pendaftar dari tabel `user_approvals` di Supabase secara langsung
 */
export async function fetchUserApprovals(statusFilter?: 'pending' | 'approved' | 'rejected' | 'all'): Promise<UserApproval[]> {
  try {
    let query = supabase
      .from('user_approvals')
      .select('*')
      .order('created_at', { ascending: false });

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (!error && Array.isArray(data) && data.length > 0) {
      return data as UserApproval[];
    }
  } catch (err) {
    console.warn('Supabase fetchUserApprovals direct notice:', err);
  }

  // Fallback sinkronisasi dari serverStore jika Supabase offline/mock lokal
  try {
    const res = await fetch('/api/data?userId=usr_admin_999');
    const json = await res.json();
    if (json.ok && Array.isArray(json.allUsers)) {
      const mapped: UserApproval[] = json.allUsers
        .filter((u: any) => u.role !== 'admin' && u.role !== 'superadmin')
        .map((u: any) => ({
          id: u.id,
          full_name: u.full_name,
          email: u.email || '',
          phone_number: u.phone_number || '',
          status: (u.verification_status === 'verified' ? 'approved' : u.verification_status || 'pending') as any,
          created_at: u.created_at || new Date().toISOString(),
        }));

      if (statusFilter && statusFilter !== 'all') {
        return mapped.filter(item => item.status === statusFilter);
      }
      return mapped;
    }
  } catch (e) {
    // ignore
  }

  return [];
}

/**
 * 11. Perbarui status persetujuan di tabel `user_approvals` (approved / rejected)
 */
export async function updateUserApprovalStatus(
  id: string,
  status: 'approved' | 'rejected',
  email?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    // 1. Update tabel user_approvals di Supabase secara langsung
    const { error } = await supabase
      .from('user_approvals')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.warn('Supabase update user_approvals notice:', error.message);
    }

    // 2. Sinkronkan ke status akun backend jika approved
    if (status === 'approved') {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_user',
          payload: { targetUserId: id, email },
          userId: 'usr_admin_999',
        }),
      });
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Gagal memperbarui status persetujuan' };
  }
}

