import { NextRequest, NextResponse } from 'next/server';
import { serverStore, supabaseAdmin, isServerSupabaseConfigured } from '../../../lib/supabase/server';
import { supabase, isLiveSupabaseConfigured } from '../../../lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      wallet_id,
      amount,
      description,
      notes,
      category,
      category_id,
      userId = 'usr_demo_123',
      type = 'expense',
    } = body || {};

    const effectiveUserId = userId || 'usr_demo_123';
    const txDesc = description || notes || 'Transaksi Tata AI';

    // 1. Validasi Ketat: Hilangkan fallback default dompet sepihak
    if (!wallet_id || typeof wallet_id !== 'string' || wallet_id.trim() === '') {
      return NextResponse.json(
        {
          ok: false,
          error: 'wallet_id wajib disertakan. Transaksi ditolak untuk mencegah pemotongan dompet default secara sembarangan.',
        },
        { status: 400 }
      );
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { ok: false, error: 'Nominal transaksi (amount) tidak valid' },
        { status: 400 }
      );
    }

    // 2. Verifikasi kepemilikan dompet pengguna di serverStore / Supabase
    const userWallets = serverStore.getWallets(effectiveUserId);
    const targetWallet = userWallets.find((w) => w.id === wallet_id);

    if (!targetWallet && !isLiveSupabaseConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          error: `Dompet dengan ID '${wallet_id}' tidak ditemukan pada akun Anda. Pemotongan saldo dibatalkan.`,
        },
        { status: 404 }
      );
    }

    // 3. Eksekusi query mutasi saldo ke Supabase Postgres:
    // Expense: UPDATE wallets SET balance = balance - amount WHERE id = wallet_id
    // Income : UPDATE wallets SET balance = balance + amount WHERE id = wallet_id
    if (isLiveSupabaseConfigured()) {
      try {
        const { data: w, error: wErr } = await supabase
          .from('wallets')
          .select('balance')
          .eq('id', wallet_id)
          .eq('user_id', effectiveUserId)
          .single();

        if (w && !wErr) {
          const newBalance = type === 'income' ? w.balance + amount : w.balance - amount;
          await supabase
            .from('wallets')
            .update({
              balance: newBalance,
              updated_at: new Date().toISOString(),
            })
            .eq('id', wallet_id)
            .eq('user_id', effectiveUserId);
        } else if (!targetWallet) {
          return NextResponse.json(
            {
              ok: false,
              error: `Dompet dengan ID '${wallet_id}' tidak ditemukan di database Supabase.`,
            },
            { status: 404 }
          );
        }
      } catch (dbErr) {
        console.warn('[API Transactions] Supabase query notice:', dbErr);
      }
    }

    // 4. Eksekusi query pengurangan saldo di memory / serverStore HANYA pada wallet_id yang dikirim
    const userCategories = serverStore.getCategories(effectiveUserId);
    const resolvedCategory =
      userCategories.find((c) => c.id === category_id || (category && c.name.toLowerCase().includes(category.toLowerCase()))) ||
      userCategories[0] || { id: 'cat_1', name: category || 'Lainnya', emoji: '🏷️' };

    const { transaction: newTx, budgetAlert } = serverStore.addTransaction({
      user_id: effectiveUserId,
      wallet_id, // Wajib wallet_id yang diklik
      wallet_name: targetWallet?.name || 'Dompet Terpilih',
      category_id: resolvedCategory.id,
      category_name: resolvedCategory.name,
      category_emoji: resolvedCategory.emoji,
      type: (type as 'expense' | 'income' | 'transfer') || 'expense',
      amount,
      notes: txDesc,
      source: 'web' as const,
      transaction_date: new Date().toISOString(),
    });

    const refreshedWallet = serverStore.getWallets(effectiveUserId).find((w) => w.id === wallet_id) || targetWallet;

    return NextResponse.json({
      ok: true,
      transaction: newTx,
      wallet: refreshedWallet,
      remaining_balance: refreshedWallet?.balance,
      budgetAlert,
    });
  } catch (error: any) {
    console.error('[API Transactions] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Terjadi kesalahan sistem' },
      { status: 500 }
    );
  }
}
