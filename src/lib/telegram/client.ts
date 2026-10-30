import { sanitizeTelegramMessageText, convertMarkdownToTelegramHtml } from './formatter';

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
  // 1. Sanitize text first: never let raw JSON, code blocks, or raw action objects leak to users
  const cleanText = sanitizeTelegramMessageText(text);

  if (!cleanText) {
    console.warn(`[Telegram API] ⚠️ Pesan ke chat_id ${chatId} dibatalkan karena kosong setelah sanitasi.`);
    return { ok: true, skipped: true };
  }

  // 2. Default parseMode: gunakan 'HTML' (lebih kebal karakter spesial dan mendukung <b>teks</b>)
  const effectiveParseMode: 'Markdown' | 'HTML' = parseMode || 'HTML';

  // 3. Normalisasi formatting: konversi **teks** dan *teks* menjadi <b>teks</b> Telegram HTML yang valid
  let formattedText = cleanText;
  if (effectiveParseMode === 'HTML') {
    formattedText = convertMarkdownToTelegramHtml(cleanText);
  } else if (effectiveParseMode === 'Markdown') {
    formattedText = cleanText.replace(/\*\*(.+?)\*\*/gs, '*$1*');
  }

  // Always log for simulator capture
  simulatorMessageLog.push({
    id: `sim_msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    chatId,
    text: formattedText,
    timestamp: Date.now(),
    parseMode: effectiveParseMode,
  });

  // If using demo or mock bot token in local development/simulator mode
  if (!token || token.startsWith('demo_') || token === 'simulator' || token.includes('mock')) {
    return {
      ok: true,
      result: {
        message_id: Date.now(),
        chat: { id: chatId },
        date: Math.floor(Date.now() / 1000),
        text: formattedText,
      },
    };
  }

  try {
    console.log(`[Telegram API] 📤 Mengirim balasan ke chat_id ${chatId} (parse_mode: ${effectiveParseMode})...`);
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: formattedText,
        parse_mode: effectiveParseMode,
      }),
    });
    const result = await res.json();

    // Fallback otomatis: Jika Telegram gagal parse formatting (error 400 Bad Request), kirim ulang sebagai plain text
    if (!result.ok && (result.error_code === 400 || /can't parse|entities|markdown|html/i.test(result.description || ''))) {
      console.warn(`[Telegram API] ⚠️ Gagal mengirim dengan parse_mode ${effectiveParseMode} (${result.description}). Mencoba kirim ulang sebagai teks biasa tanpa parse_mode...`);
      const plainText = cleanText
        .replace(/<[^>]*>/g, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1');

      const retryRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: plainText,
        }),
      });
      const retryResult = await retryRes.json();
      if (retryResult.ok) {
        console.log(`[Telegram API] ✅ Berhasil terkirim via fallback teks biasa ke chat_id ${chatId}`);
      } else {
        console.error(`[Telegram API] ❌ Gagal kirim pesan ke chat_id ${chatId}:`, retryResult.description);
      }
      return retryResult;
    }

    if (result.ok) {
      console.log(`[Telegram API] ✅ Pesan berhasil terkirim ke chat_id ${chatId} (message_id: ${result.result?.message_id})`);
    } else if (result.error_code === 401) {
      console.warn(`[Telegram API] ⚠️ Telegram Bot Token tidak valid / 401 Unauthorized (${result.description}). Pesan balasan tetap tersimpan di Simulator & Transaksi Store.`);
    } else {
      console.error(`[Telegram API] ❌ Telegram API error (${result.error_code || 'unknown'}):`, result.description);
    }

    return result;
  } catch (error) {
    console.error('[Telegram API] ❌ Network error sending Telegram message:', error);
    try {
      const plainFallback = cleanText.replace(/<[^>]*>/g, '').replace(/\*\*(.*?)\*\*/g, '$1');
      const fallbackRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: plainFallback,
        }),
      });
      return await fallbackRes.json();
    } catch {
      return { ok: false, error };
    }
  }
}
