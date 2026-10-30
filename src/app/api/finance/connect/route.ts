import { NextRequest, NextResponse } from 'next/server';
import { getBrickPublicAccessToken, connectBankAccount } from '@/lib/finance/brick-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, userId, connectData } = body;

    const targetUserId = userId || 'usr_demo_123';

    // 1. Minta Public Access Token untuk Widget Otorisasi Akun Bank (Frontend Widget)
    if (action === 'get_widget_token') {
      const publicAccessToken = await getBrickPublicAccessToken(targetUserId);
      return NextResponse.json({
        ok: true,
        publicAccessToken,
        environment: process.env.BRICK_ENVIRONMENT || 'sandbox',
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://tatadana.id'}/dashboard/wallets`,
      });
    }

    // 2. Hubungkan akun bank setelah user sukses otorisasi di widget
    if (action === 'save_connected_bank') {
      const {
        institutionId,
        institutionName,
        accountNumber,
        accountHolderName,
        initialBalance,
        rawAccessToken,
      } = connectData || {};

      const account = await connectBankAccount({
        userId: targetUserId,
        institutionId: institutionId || 'bca',
        institutionName: institutionName || 'Bank Central Asia (BCA)',
        accountNumber: accountNumber || '8271928391',
        accountHolderName: accountHolderName || 'Pengguna TataDana',
        initialBalance: initialBalance || 25000000,
        rawAccessToken: rawAccessToken || `tok_live_${Date.now()}`,
      });

      return NextResponse.json({ ok: true, account });
    }

    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in /api/finance/connect:', err);
    return NextResponse.json(
      { ok: false, error: err.message || 'Gagal memproses koneksi akun bank' },
      { status: 500 }
    );
  }
}
