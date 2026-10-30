import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { serverStore } from '@/lib/supabase/server';

const BRICK_WEBHOOK_SECRET = process.env.BRICK_WEBHOOK_SECRET || 'brick_webhook_secret_key';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-brick-signature');

    // 1. Verifikasi tanda tangan HMAC webhook untuk mencegah spoofing
    if (signature && process.env.NODE_ENV === 'production') {
      const expectedSignature = crypto
        .createHmac('sha256', BRICK_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

      if (signature !== expectedSignature) {
        return NextResponse.json({ ok: false, error: 'Invalid webhook signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    const { event, data } = payload;

    console.log(`[BRICK WEBHOOK] Event diterima: ${event}`);

    // 2. Tangani event sinkronisasi mutasi dan saldo rekening
    if (event === 'transactions.synced' || event === 'account.balance.updated') {
      const { user_id, account_id, balance, transactions } = data || {};

      // Sinkronkan mutasi transaksi baru ke sistem
      if (Array.isArray(transactions) && user_id) {
        const userTxs = serverStore.getTransactions(user_id);

        transactions.forEach((tx: any) => {
          const isExpense = tx.type === 'debit' || tx.amount < 0;
          const absAmount = Math.abs(tx.amount || 0);

          userTxs.unshift({
            id: `tx_brick_${tx.id || Date.now()}`,
            user_id,
            wallet_id: account_id || 'wal_demo_1',
            wallet_name: tx.institution_name || 'Rekening Bank',
            category_name: tx.category || 'Mutasi Bank',
            category_emoji: isExpense ? '💸' : '💰',
            type: isExpense ? 'expense' : 'income',
            amount: absAmount,
            notes: tx.description || 'Mutasi Rekening Real-Time',
            source: 'web',
            transaction_date: tx.date || new Date().toISOString(),
            created_at: new Date().toISOString(),
          });
        });

        serverStore.transactions.set(user_id, userTxs);
      }

      // Sinkronkan saldo dompet/wallet terkait
      if (balance !== undefined && user_id) {
        const wallets = serverStore.getWallets(user_id);
        const targetWallet = wallets.find((w) => w.id === account_id) || wallets[0];
        if (targetWallet) {
          targetWallet.balance = balance;
          targetWallet.updated_at = new Date().toISOString();
        }
      }
    }

    return NextResponse.json({ ok: true, received: true });
  } catch (err: any) {
    console.error('Error handling Brick webhook:', err);
    return NextResponse.json(
      { ok: false, error: err.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
