import { NextRequest, NextResponse } from 'next/server';
import { processTelegramUpdate } from '@/lib/telegram/handler';

export async function POST(req: NextRequest) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN || '8909831540:AAF-dPsFSHtwz3soxsToyTSaF7SYpCy3RLOI';
    const body = await req.json();

    if (!body || typeof body.update_id === 'undefined') {
      console.warn('[Telegram Webhook] ⚠️ Menerima request tanpa update_id valid:', body);
      return NextResponse.json({ ok: false, error: 'Invalid update payload' }, { status: 400 });
    }

    const msg = body.message;
    const sender = msg?.from?.username ? `@${msg.from.username}` : (msg?.from?.first_name || 'Unknown');
    const chatId = msg?.chat?.id;
    const textPreview = msg?.text ? `"${msg.text}"` : (msg?.photo ? '[Foto Struk]' : (msg?.voice ? '[Voice Note]' : '[Lainnya]'));

    console.log(`[Telegram Webhook] 📥 Pesan masuk dari ${sender} (Chat ID: ${chatId}) [Update #${body.update_id}]: ${textPreview}`);

    const result = await processTelegramUpdate(body, botToken);
    console.log(`[Telegram Webhook] ✅ Update #${body.update_id} berhasil diproses dengan status: ${result.status}`);

    // Selalu kembalikan 200 OK ke Telegram agar tidak dilakukan retry berulang
    return NextResponse.json({ ok: true, result });
  } catch (error: any) {
    console.error('[Telegram Webhook] ❌ Error saat memproses update webhook:', error);
    // Kembalikan 200 OK dengan status error internal agar Telegram menganggap request sudah diterima
    return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
  }
}

export async function GET() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN || '8909831540:AAF-dPsFSHtwz3soxsToyTSaF7SYpCy3RLOI';
  const maskedToken = botToken ? `${botToken.substring(0, 10)}...${botToken.substring(botToken.length - 4)}` : 'NOT_CONFIGURED';

  return NextResponse.json({
    status: 'online',
    service: 'TataDana Telegram Webhook Endpoint',
    configuredToken: maskedToken,
    timezone: 'Asia/Jakarta (WIB)',
    timestamp: new Date().toISOString(),
  });
}
