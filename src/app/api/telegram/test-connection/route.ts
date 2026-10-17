import { NextRequest, NextResponse } from 'next/server';
import { testTelegramToken, setTelegramWebhook } from '@/lib/telegram/client';
import { serverStore } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { token, userId } = await req.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ ok: false, error: 'Token bot Telegram tidak boleh kosong.' }, { status: 400 });
    }

    const trimmedToken = token.trim();

    // 1. Verify uniqueness among existing users
    for (const [id, user] of Array.from(serverStore.users.entries())) {
      if (user.telegram_bot_token === trimmedToken && id !== userId) {
        return NextResponse.json(
          { ok: false, error: 'Token ini sudah digunakan oleh akun TataDana lain. Gunakan bot token yang unik.' },
          { status: 409 }
        );
      }
    }

    // 2. Test getMe against Telegram API
    // If it's the demo token, return simulated success
    let getMeRes;
    if (trimmedToken.startsWith('demo_')) {
      getMeRes = {
        ok: true,
        result: {
          id: 123456789,
          is_bot: true,
          first_name: 'TataDana Test Bot',
          username: 'tatadana_test_bot',
        },
      };
    } else {
      getMeRes = await testTelegramToken(trimmedToken);
    }

    if (!getMeRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: getMeRes.description || 'Token tidak valid. Pastikan token yang di-copy dari @BotFather sudah benar.',
          error_code: getMeRes.error_code,
        },
        { status: 400 }
      );
    }

    // 3. Set Webhook to WEBHOOK_BASE_URL
    const baseUrl = process.env.WEBHOOK_BASE_URL || 'http://localhost:3000';
    const webhookUrl = `${baseUrl}/api/telegram/webhook`;

    let webhookRes;
    if (trimmedToken.startsWith('demo_')) {
      webhookRes = { ok: true, result: true, description: 'Webhook was set (Demo Simulated)' };
    } else {
      webhookRes = await setTelegramWebhook(trimmedToken, webhookUrl);
    }

    // 4. Update user state in database
    const user = serverStore.users.get(userId || 'usr_demo_123');
    if (user) {
      user.telegram_bot_token = trimmedToken;
      user.telegram_connected = true;
      user.telegram_connected_at = new Date().toISOString();
      if (getMeRes.result?.username) {
        user.telegram_username = getMeRes.result.username;
      }
    }

    return NextResponse.json({
      ok: true,
      bot: getMeRes.result,
      webhook: webhookRes,
      message: 'Koneksi bot Telegram berhasil terhubung dan webhook aktif!',
    });
  } catch (error: any) {
    console.error('Test connection error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Terjadi kesalahan internal server' }, { status: 500 });
  }
}
