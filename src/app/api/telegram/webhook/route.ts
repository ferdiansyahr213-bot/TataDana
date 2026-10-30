import { NextRequest, NextResponse } from 'next/server';
import { processTelegramUpdate } from '@/lib/telegram/handler';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const botToken = body?.bot_token || req.headers.get('x-telegram-bot-token') || process.env.TELEGRAM_BOT_TOKEN || '8909813540:AAFdPSHsxhwJsOjxsl5oyxTaF5POy3jRLOI';

    if (!body || typeof body.update_id === 'undefined') {
      console.warn('[Telegram Webhook] ⚠️ Menerima request tanpa update_id valid:', body);
      return NextResponse.json({ ok: false, error: 'Invalid update payload' }, { status: 400 });
    }

    const msg = body.message;
    const sender = msg?.from?.username ? `@${msg.from.username}` : (msg?.from?.first_name || 'Unknown');
    const chatId = msg?.chat?.id;
    const textPreview = msg?.text ? `"${msg.text}"` : (msg?.photo ? '[Foto Struk]' : (msg?.voice ? '[Voice Note]' : '[Lainnya]'));
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.ADMIN_CHAT_ID || process.env.TELEGRAM_ADMIN_ID;
    const isFromAdmin = String(chatId) === String(adminChatId) || String(msg?.from?.id) === String(adminChatId);

    console.log(`\n================================================================`);
    console.log(`[Telegram Webhook] 📥 PESAN TELEGRAM DITERIMA`);
    console.log(`👤 Pengirim : ${sender}`);
    console.log(`🆔 Chat ID  : ${chatId}`);
    console.log(`👑 Otorisasi: ${isFromAdmin ? 'ADMINISTRATOR ✅' : 'PENGGUNA / AUTO-MATCH'}`);
    console.log(`💬 Isi Pesan: ${textPreview} (Update #${body.update_id})`);
    console.log(`================================================================`);

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
  const botToken = process.env.TELEGRAM_BOT_TOKEN || '8909813540:AAFdPSHsxhwJsOjxsl5oyxTaF5POy3jRLOI';
  const maskedToken = botToken ? `${botToken.substring(0, 10)}...${botToken.substring(botToken.length - 4)}` : 'NOT_CONFIGURED';

  return NextResponse.json({
    status: 'online',
    service: 'TataDana Telegram Webhook Endpoint',
    configuredToken: maskedToken,
    timezone: 'Asia/Jakarta (WIB)',
    timestamp: new Date().toISOString(),
  });
}
