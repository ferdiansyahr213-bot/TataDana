import { NextRequest, NextResponse } from 'next/server';
import { serverStore } from '@/lib/supabase/server';
import { getCurrentMonthPeriodWIB } from '@/lib/utils/date-wib';
import type { Category } from '@/lib/types';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId') || 'usr_demo_123';
  const user = serverStore.users.get(userId) || serverStore.users.get('usr_demo_123')!;

  return NextResponse.json({
    ok: true,
    user,
    wallets: serverStore.getWallets(user.id),
    categories: serverStore.getCategories(user.id),
    budgets: serverStore.getBudgets(user.id),
    transactions: serverStore.getTransactions(user.id),
    exports: serverStore.exports.filter(e => e.user_id === user.id),
    aiLogs: serverStore.aiLogs,
    aiProviders: serverStore.aiProviders,
    aiSettings: serverStore.aiSettings,
    payments: serverStore.payments,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload, userId } = body;
    const effectiveUserId = userId || 'usr_demo_123';
    const user = serverStore.users.get(effectiveUserId);

    if (action === 'register_user') {
      const newUser = serverStore.registerNewUser(payload);
      return NextResponse.json({ ok: true, user: newUser });
    }

    if (!user) {
      return NextResponse.json({ ok: false, error: 'User tidak ditemukan' }, { status: 404 });
    }

    if (action === 'create_transaction') {
      const { transaction: newTx, budgetAlert } = serverStore.addTransaction({
        ...payload,
        user_id: effectiveUserId,
      });

      // If budget threshold 80% or 100% was crossed, trigger telegram notification
      if (budgetAlert && user.telegram_chat_id) {
        try {
          const { sendTelegramMessage } = await import('@/lib/telegram/client');
          const botToken = user.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN || 'demo_bot_token_tatadana';
          const alertEmoji = budgetAlert.is100 ? '🚨' : '⚡';
          const alertTitle = budgetAlert.is100 ? 'ALERT BUDGET 100%!' : 'ALERT BUDGET 80%!';
          const alertMsg = `${alertEmoji} *${alertTitle}*\n\nPengeluaran untuk kategori *${budgetAlert.budget.category_name}* telah mencapai *${budgetAlert.percent}%* dari anggaran bulanan!\n\n📊 Terpakai: Rp${budgetAlert.budget.spent.toLocaleString('id-ID')} / Rp${budgetAlert.budget.amount.toLocaleString('id-ID')}\n💡 ${budgetAlert.is100 ? 'Rem pengeluaran untuk kategori ini agar keuangan tetap aman sampai akhir bulan!' : 'Hati-hati, kendalikan pengeluaranmu!'}`;
          await sendTelegramMessage(botToken, user.telegram_chat_id, alertMsg);
        } catch (e) {
          console.warn('Failed to dispatch budget alert to telegram:', e);
        }
      }

      return NextResponse.json({ ok: true, transaction: newTx, budgetAlert });
    }

    if (action === 'complete_onboarding') {
      const persona = payload.persona || 'karyawan';
      let customCats: Category[] = [];

      if (persona === 'mahasiswa') {
        customCats = [
          { id: `cat_m1_${Date.now()}`, name: 'Makan & Minum', type: 'expense', emoji: '🍜', color: '#2563eb', is_custom: false },
          { id: `cat_m2_${Date.now()}`, name: 'Kosan & Tagihan', type: 'expense', emoji: '🏠', color: '#ef4444', is_custom: false },
          { id: `cat_m3_${Date.now()}`, name: 'Fotokopi & Buku Kuliah', type: 'expense', emoji: '📚', color: '#f59e0b', is_custom: false },
          { id: `cat_m4_${Date.now()}`, name: 'Nongkrong & Kafe', type: 'expense', emoji: '☕', color: '#8b5cf6', is_custom: false },
          { id: `cat_m5_${Date.now()}`, name: 'Bensin & Ojol', type: 'expense', emoji: '🛵', color: '#0284c7', is_custom: false },
          { id: `cat_m6_${Date.now()}`, name: 'Uang Saku & Kiriman', type: 'income', emoji: '💰', color: '#10b981', is_custom: false },
          { id: `cat_m7_${Date.now()}`, name: 'Beasiswa & Part-Time', type: 'income', emoji: '🎓', color: '#6366f1', is_custom: false },
        ];
      } else if (persona === 'freelancer') {
        customCats = [
          { id: `cat_f1_${Date.now()}`, name: 'Makan Harian', type: 'expense', emoji: '🍜', color: '#2563eb', is_custom: false },
          { id: `cat_f2_${Date.now()}`, name: 'Internet & Co-Working', type: 'expense', emoji: '💻', color: '#0284c7', is_custom: false },
          { id: `cat_f3_${Date.now()}`, name: 'Langganan Software & Tools', type: 'expense', emoji: '⚡', color: '#8b5cf6', is_custom: false },
          { id: `cat_f4_${Date.now()}`, name: 'Transportasi Meeting', type: 'expense', emoji: '🚗', color: '#10b981', is_custom: false },
          { id: `cat_f5_${Date.now()}`, name: 'Fee Project Klien', type: 'income', emoji: '💰', color: '#10b981', is_custom: false },
          { id: `cat_f6_${Date.now()}`, name: 'Royalti & Digital Product', type: 'income', emoji: '📈', color: '#f59e0b', is_custom: false },
        ];
      } else if (persona === 'bisnis') {
        customCats = [
          { id: `cat_b1_${Date.now()}`, name: 'Belanja Bahan & Stok', type: 'expense', emoji: '📦', color: '#2563eb', is_custom: false },
          { id: `cat_b2_${Date.now()}`, name: 'Operasional & Toko', type: 'expense', emoji: '🏬', color: '#ef4444', is_custom: false },
          { id: `cat_b3_${Date.now()}`, name: 'Ongkir & Logistik', type: 'expense', emoji: '🚚', color: '#0284c7', is_custom: false },
          { id: `cat_b4_${Date.now()}`, name: 'Iklan & Promosi', type: 'expense', emoji: '📣', color: '#8b5cf6', is_custom: false },
          { id: `cat_b5_${Date.now()}`, name: 'Omset Penjualan', type: 'income', emoji: '💰', color: '#10b981', is_custom: false },
          { id: `cat_b6_${Date.now()}`, name: 'Pemasukan Lainnya', type: 'income', emoji: '💼', color: '#10b981', is_custom: false },
        ];
      } else {
        // Default Karyawan
        customCats = [
          { id: `cat_k1_${Date.now()}`, name: 'Makanan & Makan Siang', type: 'expense', emoji: '🍜', color: '#2563eb', is_custom: false },
          { id: `cat_k2_${Date.now()}`, name: 'Transportasi & Bensin', type: 'expense', emoji: '🚗', color: '#0284c7', is_custom: false },
          { id: `cat_k3_${Date.now()}`, name: 'Tagihan Listrik & Wifi', type: 'expense', emoji: '🏠', color: '#ef4444', is_custom: false },
          { id: `cat_k4_${Date.now()}`, name: 'Hiburan Akhir Pekan', type: 'expense', emoji: '🎮', color: '#8b5cf6', is_custom: false },
          { id: `cat_k5_${Date.now()}`, name: 'Kesehatan & Vitamin', type: 'expense', emoji: '💊', color: '#10b981', is_custom: false },
          { id: `cat_k6_${Date.now()}`, name: 'Belanja Keperluan', type: 'expense', emoji: '👕', color: '#ec4899', is_custom: false },
          { id: `cat_k7_${Date.now()}`, name: 'Gaji Pokok', type: 'income', emoji: '💼', color: '#10b981', is_custom: false },
          { id: `cat_k8_${Date.now()}`, name: 'Bonus & Insentif', type: 'income', emoji: '💰', color: '#2563eb', is_custom: false },
        ];
      }

      serverStore.categories.set(effectiveUserId, customCats);
      user.onboarding_completed = true;
      user.updated_at = new Date().toISOString();

      return NextResponse.json({ ok: true, user, categories: customCats });
    }

    if (action === 'create_wallet') {
      const wallets = serverStore.getWallets(effectiveUserId);
      const newWallet = {
        ...payload,
        id: `wal_${Date.now()}`,
        user_id: effectiveUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (newWallet.is_default) {
        wallets.forEach(w => (w.is_default = false));
      }
      wallets.push(newWallet);
      serverStore.wallets.set(effectiveUserId, wallets);
      return NextResponse.json({ ok: true, wallet: newWallet });
    }

    if (action === 'set_default_wallet') {
      const wallets = serverStore.getWallets(effectiveUserId);
      wallets.forEach(w => {
        w.is_default = w.id === payload.walletId;
      });
      return NextResponse.json({ ok: true, wallets });
    }

    if (action === 'delete_wallet') {
      let wallets = serverStore.getWallets(effectiveUserId);
      wallets = wallets.filter(w => w.id !== payload.walletId && w.id !== 'wal_01');
      serverStore.wallets.set(effectiveUserId, wallets);
      return NextResponse.json({ ok: true, wallets });
    }

    if (action === 'save_budget') {
      const budgets = serverStore.getBudgets(effectiveUserId);
      const targetPeriod = payload.period_type || 'monthly';
      const existingIdx = budgets.findIndex(
        b => b.category_id === payload.category_id && (b.period_type || 'monthly') === targetPeriod
      );
      if (existingIdx !== -1) {
        budgets[existingIdx].amount = payload.amount;
        budgets[existingIdx].period_type = targetPeriod;
      } else {
        budgets.push({
          id: `bud_${Date.now()}`,
          user_id: effectiveUserId,
          category_id: payload.category_id,
          category_name: payload.category_name,
          category_emoji: payload.category_emoji,
          category_color: payload.category_color,
          month_period: payload.month_period || getCurrentMonthPeriodWIB(),
          period_type: targetPeriod,
          amount: payload.amount,
          spent: payload.spent || 0,
        });
      }
      serverStore.budgets.set(effectiveUserId, budgets);
      return NextResponse.json({ ok: true, budgets });
    }

    if (action === 'update_user_plan') {
      const targetUser = serverStore.users.get(payload.targetUserId);
      if (targetUser) {
        targetUser.plan = payload.plan;
        targetUser.updated_at = new Date().toISOString();
        return NextResponse.json({ ok: true, user: targetUser });
      }
      return NextResponse.json({ ok: false, error: 'User tidak ditemukan' }, { status: 404 });
    }

    if (action === 'create_payment_simulation') {
      const newPay = {
        id: `pay_sim_${Date.now()}`,
        user_id: payload.targetUserId || 'usr_demo_123',
        user_name: payload.userName || 'Vina Al Fitriansyah',
        plan: payload.plan || 'pro',
        amount: payload.amount || 99000,
        payment_method: payload.method || 'manual_transfer',
        status: 'pending' as const,
        manual_receipt_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      serverStore.payments.unshift(newPay);
      return NextResponse.json({ ok: true, payment: newPay, payments: serverStore.payments });
    }

    if (action === 'save_category') {
      const categories = serverStore.getCategories(effectiveUserId);
      const newCat = {
        ...payload,
        id: `cat_${Date.now()}`,
        user_id: effectiveUserId,
        is_custom: true,
      };
      categories.push(newCat);
      serverStore.categories.set(effectiveUserId, categories);
      return NextResponse.json({ ok: true, category: newCat });
    }

    if (action === 'update_profile') {
      Object.assign(user, payload);
      user.updated_at = new Date().toISOString();
      return NextResponse.json({ ok: true, user });
    }

    if (action === 'approve_payment') {
      const payIdx = serverStore.payments.findIndex(p => p.id === payload.paymentId);
      if (payIdx !== -1) {
        serverStore.payments[payIdx].status = 'success';
        const targetUser = serverStore.users.get(serverStore.payments[payIdx].user_id);
        if (targetUser) targetUser.plan = serverStore.payments[payIdx].plan;
      }
      return NextResponse.json({ ok: true, payments: serverStore.payments });
    }

    if (action === 'reject_payment') {
      const payIdx = serverStore.payments.findIndex(p => p.id === payload.paymentId);
      if (payIdx !== -1) {
        serverStore.payments[payIdx].status = 'rejected';
      }
      return NextResponse.json({ ok: true, payments: serverStore.payments });
    }

    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
