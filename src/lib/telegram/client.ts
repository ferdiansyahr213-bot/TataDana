export interface TelegramGetMeResponse {
  ok: boolean;
  result?: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username: string;
    can_join_groups?: boolean;
    can_read_all_group_messages?: boolean;
    supports_inline_queries?: boolean;
  };
  description?: string;
  error_code?: number;
}

export interface TelegramSetWebhookResponse {
  ok: boolean;
  result?: boolean;
  description?: string;
  error_code?: number;
}

/**
 * Validate token with Telegram getMe API
 */
export async function testTelegramToken(token: string): Promise<TelegramGetMeResponse> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    const data = await res.json();
    return data;
  } catch (error: any) {
    return {
      ok: false,
      description: error.message || 'Koneksi ke Telegram API gagal.',
      error_code: 500,
    };
  }
}

/**
 * Register public Webhook to Telegram
 */
export async function setTelegramWebhook(token: string, webhookUrl: string): Promise<TelegramSetWebhookResponse> {
  try {
    const endpoint = `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    const data = await res.json();
    return data;
  } catch (error: any) {
    return {
      ok: false,
      description: error.message || 'Gagal mengatur webhook Telegram.',
      error_code: 500,
    };
  }
}

export interface SimulatorLogEntry {
  id: string;
  chatId: number | string;
  text: string;
  timestamp: number;
  parseMode?: string;
}

export const simulatorMessageLog: SimulatorLogEntry[] = [];

export function getSimulatorMessages(chatId?: number | string, sinceTimestamp?: number): SimulatorLogEntry[] {
  return simulatorMessageLog.filter(m => {
    if (chatId && String(m.chatId) !== String(chatId)) return false;
    if (sinceTimestamp && m.timestamp < sinceTimestamp) return false;
    return true;
  });
}

export function clearSimulatorMessages(chatId?: number | string): void {
  if (!chatId) {
    simulatorMessageLog.length = 0;
  } else {
    const remaining = simulatorMessageLog.filter(m => String(m.chatId) !== String(chatId));
    simulatorMessageLog.length = 0;
    simulatorMessageLog.push(...remaining);
  }
}

/**
 * Send Message to Telegram Chat
 */
export async function sendTelegramMessage(
  token: string,
  chatId: number | string,
  text: string,
  parseMode?: 'Markdown' | 'HTML'
): Promise<any> {
  // Always log for simulator capture
  simulatorMessageLog.push({
    id: `sim_msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    chatId,
    text,
    timestamp: Date.now(),
    parseMode,
  });

  // If using demo or mock bot token in local development/simulator mode
  if (!token || token.startsWith('demo_') || token === 'simulator' || token.includes('mock')) {
    return {
      ok: true,
      result: {
        message_id: Date.now(),
        chat: { id: chatId },
        date: Math.floor(Date.now() / 1000),
        text: text,
      },
    };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: parseMode,
      }),
    });
    return await res.json();
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return { ok: false, error };
  }
}
