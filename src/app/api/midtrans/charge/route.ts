import { NextRequest, NextResponse } from 'next/server';
import { serverStore } from '@/lib/supabase/server';
import { PLAN_LIMITS } from '@/lib/utils/plans';
import { PlanType } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { plan, paymentMethod, userId, manualReceiptUrl } = await req.json();
    const effectiveUserId = userId || 'usr_demo_123';
    const user = serverStore.users.get(effectiveUserId);

    if (!user) {
      return NextResponse.json({ ok: false, error: 'User tidak ditemukan' }, { status: 404 });
    }

    const targetPlan = (plan || 'pro') as PlanType;
    const amount = PLAN_LIMITS[targetPlan].priceIdr;
    const paymentId = `pay_${Date.now()}`;

    if (paymentMethod === 'manual_transfer') {
      const paymentRecord = {
        id: paymentId,
        user_id: effectiveUserId,
        user_name: user.full_name,
        plan: targetPlan,
        amount,
        payment_method: 'manual_transfer' as const,
        status: 'pending' as const,
        manual_receipt_url: manualReceiptUrl || 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      serverStore.payments.unshift(paymentRecord);

      return NextResponse.json({
        ok: true,
        message: 'Bukti transfer manual berhasil diunggah. Menunggu verifikasi admin.',
        payment: paymentRecord,
      });
    }

    // Midtrans Snap simulated token / transaction
    const midtransTxId = `MID-${Date.now()}`;
    const paymentRecord = {
      id: paymentId,
      user_id: effectiveUserId,
      user_name: user.full_name,
      plan: targetPlan,
      amount,
      payment_method: 'midtrans' as const,
      status: 'success' as const, // auto-settle for demo
      midtrans_transaction_id: midtransTxId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    serverStore.payments.unshift(paymentRecord);

    // Upgrade user immediately
    user.plan = targetPlan;
    user.updated_at = new Date().toISOString();

    return NextResponse.json({
      ok: true,
      message: 'Pembayaran berhasil dikonfirmasi! Akun kamu kini berstatus Pro.',
      payment: paymentRecord,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
