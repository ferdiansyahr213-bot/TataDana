import { NextRequest, NextResponse } from 'next/server';
import { processTelegramUpdate } from '@/lib/telegram/handler';

export async function POST(req: NextRequest) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN || 'demo_bot_token_tatadana';
    const body = await req.json();

    if (!body || typeof body.update_id === 'undefined') {
      return NextResponse.json({ ok: false, error: 'Invalid update payload' }, { status: 400 });
    }

    const result = await processTelegramUpdate(body, botToken);
    return NextResponse.json({ ok: true, result });
  } catch (error: any) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    service: 'TataDana Telegram Webhook Endpoint',
    timezone: 'Asia/Jakarta (WIB)',
    timestamp: new Date().toISOString(),
  });
}
