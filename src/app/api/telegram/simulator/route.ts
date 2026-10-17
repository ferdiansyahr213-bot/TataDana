import { NextRequest, NextResponse } from 'next/server';
import { processTelegramUpdate, TelegramUpdate } from '@/lib/telegram/handler';
import { serverStore } from '@/lib/supabase/server';
import { getSimulatorMessages, clearSimulatorMessages } from '@/lib/telegram/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      userId = 'usr_demo_123', 
      text, 
      actionType = 'text',
      voiceText, 
      receiptMerchant = 'Indomaret Point',
      receiptAmount = 154000
    } = body;

    const user = serverStore.users.get(userId) || serverStore.users.get('usr_demo_123')!;
    const chatId = user.telegram_chat_id || 8807546522;
    const botToken = user.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN || 'demo_bot_token_tatadana';

    // Ensure user has telegram connected for smooth simulation
    if (!user.telegram_connected) {
      user.telegram_chat_id = chatId;
      user.telegram_connected = true;
      user.telegram_username = user.telegram_username || 'Revi';
    }

    const timestampNow = Date.now();
    const updateId = Math.floor(timestampNow / 1000) * 1000 + Math.floor(Math.random() * 999);

    let update: TelegramUpdate;

    if (actionType === 'voice') {
      update = {
        update_id: updateId,
        message: {
          message_id: timestampNow,
          from: {
            id: chatId,
            is_bot: false,
            first_name: user.full_name,
            username: user.telegram_username,
          },
          chat: {
            id: chatId,
            first_name: user.full_name,
            type: 'private',
          },
          date: Math.floor(timestampNow / 1000),
          voice: {
            file_id: `voice_${timestampNow}`,
            duration: 4,
            mime_type: 'audio/ogg',
          },
          text: voiceText || 'Beli makan siang nasi padang dan es teh 25 ribu',
        },
      };
    } else if (actionType === 'photo') {
      update = {
        update_id: updateId,
        message: {
          message_id: timestampNow,
          from: {
            id: chatId,
            is_bot: false,
            first_name: user.full_name,
            username: user.telegram_username,
          },
          chat: {
            id: chatId,
            first_name: user.full_name,
            type: 'private',
          },
          date: Math.floor(timestampNow / 1000),
          photo: [
            {
              file_id: `receipt_${timestampNow}`,
              file_unique_id: `u_${timestampNow}`,
              width: 800,
              height: 1200,
            },
          ],
          caption: `Foto struk belanja di ${receiptMerchant}`,
        },
      };
    } else {
      update = {
        update_id: updateId,
        message: {
          message_id: timestampNow,
          from: {
            id: chatId,
            is_bot: false,
            first_name: user.full_name,
            username: user.telegram_username,
          },
          chat: {
            id: chatId,
            first_name: user.full_name,
            type: 'private',
          },
          date: Math.floor(timestampNow / 1000),
          text: (text || '').trim(),
        },
      };
    }

    // Process update through real Telegram pipeline
    const handlerResult = await processTelegramUpdate(update, botToken);

    // Retrieve generated replies
    const newReplies = getSimulatorMessages(chatId, timestampNow);

    return NextResponse.json({
      ok: true,
      result: handlerResult,
      replies: newReplies.map((r) => r.text),
      user: {
        id: user.id,
        name: user.full_name,
        plan: user.plan,
        chatId,
      },
      wallets: serverStore.getWallets(user.id),
      transactionsCount: serverStore.getTransactions(user.id).length,
    });
  } catch (error: any) {
    console.error('Simulator API error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const chatId = url.searchParams.get('chatId') || 8807546522;
  const history = getSimulatorMessages(Number(chatId));

  return NextResponse.json({
    ok: true,
    chatId,
    totalMessages: history.length,
    messages: history,
  });
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const chatId = url.searchParams.get('chatId');
  clearSimulatorMessages(chatId ? Number(chatId) : undefined);
  return NextResponse.json({ ok: true, message: 'Simulator chat buffer cleared' });
}
