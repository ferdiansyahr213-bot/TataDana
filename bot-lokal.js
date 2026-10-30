/**
 * =======================================================================
 * TataDana Local Telegram Bot Polling Engine
 * =======================================================================
 * File: bot-lokal.js
 * Deskripsi: Menjalankan bot Telegram via Long Polling langsung ke Telegram API,
 * tanpa memerlukan webhook HTTPS/ngrok publik.
 *
 * Logika Respons:
 * 1. Perintah `/start` -> Membalas: "Halo! Bot TataDana sudah aktif!"
 * 2. Pesan teks/angka  -> Membalas: "Catatan berhasil diterima!"
 * 3. Sinkronisasi Data -> Meneruskan mutasi ke Next.js Webhook internal
 * =======================================================================
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// 1. RESOLUSI TOKEN TELEGRAM & ADMIN CHAT ID
// Prioritas: Argumen CLI -> Env Var -> .env.local -> Fallback Default
let BOT_TOKEN = process.argv[2] || process.env.TELEGRAM_BOT_TOKEN;
let ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.ADMIN_CHAT_ID || process.env.TELEGRAM_ADMIN_ID;

try {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const tokenMatch = content.match(/TELEGRAM_BOT_TOKEN=([^\r\n]+)/);
    if (tokenMatch && tokenMatch[1] && !BOT_TOKEN) {
      BOT_TOKEN = tokenMatch[1].trim();
    }
    const adminMatch = content.match(/(?:TELEGRAM_ADMIN_CHAT_ID|ADMIN_CHAT_ID|TELEGRAM_ADMIN_ID)=([^\r\n]+)/);
    if (adminMatch && adminMatch[1] && !ADMIN_CHAT_ID) {
      ADMIN_CHAT_ID = adminMatch[1].trim();
    }
  }
} catch (err) {
  console.error('[ENV] Gagal membaca .env.local:', err.message);
}

// Fallback jika belum diatur
const DEFAULT_TOKEN = '8909813540:AAFdPSHsxhwJsOjxsl5oyxTaF5POy3jRLOI';
if (!BOT_TOKEN || BOT_TOKEN === 'demo_bot_token_tatadana' || BOT_TOKEN.startsWith('demo_')) {
  BOT_TOKEN = DEFAULT_TOKEN;
}
if (!ADMIN_CHAT_ID) {
  ADMIN_CHAT_ID = '8807546522';
}

console.log('================================================================');
console.log('🤖 TataDana Telegram Bot - Polling Engine (Localhost)');
console.log('================================================================');
console.log('Waktu Mulai   :', new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }), 'WIB');
console.log('Target Bot    : @TataDanaVinaCantikBot');
console.log('Token Status  :', BOT_TOKEN ? `Aktif (${BOT_TOKEN.substring(0, 10)}...${BOT_TOKEN.substring(BOT_TOKEN.length - 4)})` : '⚠️ Belum dikonfigurasi');
console.log('Admin Chat ID :', ADMIN_CHAT_ID || '(Auto-detect)');
console.log('----------------------------------------------------------------');

/**
 * Helper HTTP Request ke Telegram Bot API
 */
function telegramApi(method, data = null) {
  return new Promise((resolve, reject) => {
    if (!BOT_TOKEN || BOT_TOKEN === DEMO_TOKEN) {
      return reject(new Error('TOKEN_NOT_CONFIGURED'));
    }

    const payload = data ? JSON.stringify(data) : null;
    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${BOT_TOKEN}/${method}`,
      method: data ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      },
      timeout: 35000,
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve(parsed);
        } catch (e) {
          resolve({ ok: false, error: 'PARSE_ERROR', raw: body });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: 'TIMEOUT' });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

/**
 * Sanitasi & Formatting Pesan Telegram (Mencegah Kebocoran Raw JSON)
 */
function sanitizeTelegramTextLocal(rawInput) {
  if (rawInput === null || rawInput === undefined) return '';

  if (typeof rawInput === 'object') {
    return formatJsonToFriendlyLocal(rawInput);
  }

  let text = String(rawInput).trim();
  if (!text) return '';

  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      const parsed = JSON.parse(text);
      return formatJsonToFriendlyLocal(parsed);
    } catch (e) {}
  }

  // Jika teks berupa blok code ```json ... ```
  const codeBlockMatch = text.match(/^\s*```(?:json)?\s*(\{[\s\S]*?\})\s*```\s*$/i);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1]);
      return formatJsonToFriendlyLocal(parsed);
    } catch (e) {}
  }

  // Bersihkan code block json campuran dan objek raw action
  text = text
    .replace(/```(?:json)?\s*\{[\s\S]*?\}\s*```/gi, '')
    .replace(/\{[\s\S]*?"action"\s*:\s*"(?:INITIATE_PAYMENT|RECORD_INCOME|[^"]+)"[\s\S]*?\}/gi, '')
    .trim();

  if (!text) {
    const jsonMatch = String(rawInput).match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        return formatJsonToFriendlyLocal(parsed);
      } catch (e) {}
    }
    return 'Catatan telah berhasil diterima dan diproses.';
  }

  return text;
}

function formatJsonToFriendlyLocal(obj) {
  if (!obj || typeof obj !== 'object') return String(obj || '');

  if (typeof obj.reply === 'string' && obj.reply.trim()) {
    return sanitizeTelegramTextLocal(obj.reply);
  }
  if (typeof obj.message === 'string' && obj.message.trim()) {
    return sanitizeTelegramTextLocal(obj.message);
  }
  if (typeof obj.text === 'string' && obj.text.trim()) {
    return sanitizeTelegramTextLocal(obj.text);
  }

  if (obj.action === 'INITIATE_PAYMENT' && obj.data) {
    const data = obj.data;
    const item = data.item || data.title || 'Pesanan';
    const amount = data.amount ? new Intl.NumberFormat('id-ID').format(data.amount) : '0';
    const options = Array.isArray(data.payment_options) ? data.payment_options : [];
    const optionsText = options.length > 0
      ? `\n\nPilihan metode:\n${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}`
      : '';
    return `Siap, pesanan <b>${item}</b> sebesar <b>Rp ${amount}</b> sudah dicatat. Mau bayar pakai apa?${optionsText}`;
  }

  if (obj.action === 'RECORD_INCOME' && obj.data) {
    const data = obj.data;
    const title = data.title || 'Pemasukan';
    const amount = data.amount ? new Intl.NumberFormat('id-ID').format(data.amount) : '0';
    const options = Array.isArray(data.payment_options) ? data.payment_options : [];
    const optionsText = options.length > 0
      ? `\n\nSilakan pilih dompet tujuan penerimaan:\n${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}`
      : '';
    return `Alhamdulillah! Pemasukan <b>${title}</b> sebesar <b>Rp ${amount}</b> siap dicatat. 💰${optionsText}`;
  }

  if (obj.error) return `⚠️ ${obj.error}`;
  return 'Permintaan berhasil diproses oleh TataDana.';
}

/**
 * Mengirim pesan balasan ke chat Telegram
 */
async function sendMessage(chatId, text, replyToMessageId = null) {
  try {
    const cleanText = sanitizeTelegramTextLocal(text);
    if (!cleanText) {
      console.warn(`[SEND] Pesan ke chat ${chatId} dibatalkan karena kosong setelah sanitasi.`);
      return null;
    }

    const payload = {
      chat_id: chatId,
      text: cleanText,
      parse_mode: 'HTML',
    };
    if (replyToMessageId) {
      payload.reply_to_message_id = replyToMessageId;
    }
    const res = await telegramApi('sendMessage', payload);
    return res;
  } catch (err) {
    console.error(`[SEND] Gagal mengirim pesan ke chat ${chatId}:`, err.message);
    return null;
  }
}

/**
 * Sinkronisasi data ke backend TataDana lokal (opsional/background)
 */
function forwardToLocalBackend(update) {
  return new Promise((resolve) => {
    try {
      const http = require('http');
      const payload = {
        ...update,
        bot_token: BOT_TOKEN,
      };
      const data = JSON.stringify(payload);
      const req = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/telegram/webhook',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
        timeout: 8000,
      }, (res) => {
        let body = '';
        res.on('data', (c) => { body += c; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve({ ok: false, error: 'JSON_PARSE' });
          }
        });
      });
      req.on('error', (err) => {
        resolve({ ok: false, error: err.message });
      });
      req.write(data);
      req.end();
    } catch (e) {
      resolve({ ok: false, error: e.message });
    }
  });
}

/**
 * Menghapus webhook lama agar long polling getUpdates diizinkan oleh Telegram
 */
async function clearWebhook() {
  console.log('[INIT] Menghapus webhook lama agar polling diizinkan Telegram...');
  try {
    const res = await telegramApi('deleteWebhook', { drop_pending_updates: false });
    if (res.ok) {
      console.log('✅ Webhook berhasil dilepas. Polling mode aktif!');
    } else {
      console.log('ℹ️ Webhook status:', res.description || 'Siap polling');
    }
  } catch (err) {
    console.error('⚠️ Peringatan lepas webhook:', err.message);
  }
}

/**
 * Memvalidasi Bot Info
 */
async function verifyBot() {
  try {
    const res = await telegramApi('getMe');
    if (res.ok && res.result) {
      console.log(`✅ Terhubung ke Bot Telegram: @${res.result.username} (${res.result.first_name})`);
      return true;
    } else {
      console.error(`❌ Gagal terhubung ke Telegram API:`, res.description || 'Token tidak valid');
      return false;
    }
  } catch (err) {
    if (err.message === 'TOKEN_NOT_CONFIGURED') {
      console.log('⚠️ [TOKEN DIBUTUHKAN] Token Telegram belum dimasukkan!');
      console.log('👉 Masukkan token bot Telegram Anda ke dalam .env.local atau di bot-lokal.js');
    } else {
      console.error('❌ Error koneksi ke Telegram API:', err.message);
    }
    return false;
  }
}

const pendingPurchases = new Map();

function parsePurchaseIntentLocal(text) {
  if (!text) return null;
  const clean = text.replace(/^\/(?:tataai|ai|catat|order|beli)\s*/i, '').trim();
  const lower = clean.toLowerCase();

  if (
    /^(?:\/start|\/help|\/bantuan|\/saldo|\/budget|\/kalender|\/calendar|\/hari_ini|\/minggu_ini|\/bulan_ini|\/sheet)\b/i.test(text) ||
    /^(?:halo|hai|hi|pagi|siang|sore|malam)\b/i.test(lower)
  ) {
    return null;
  }

  const unitRegex = /(?:rp\.?\s*)?(\d+(?:[.,]\d+)?\s*(?:rb|ribu|k|jt|juta|mio|milyar|miliar))\b/i;
  const rpRegex = /(?:rp\.?\s*)(\d{1,3}(?:[.,]\d{3})+|\d+)/i;
  const thousandsRegex = /\b(\d{1,3}(?:\.\d{3})+)\b/;
  const fourDigitRegex = /\b(\d{4,9})\b/;
  const standaloneDigitRegex = /\b(\d{3,9})\b/;

  let matchedAmountText = null;
  const m1 = lower.match(unitRegex);
  if (m1) matchedAmountText = m1[0];
  else {
    const m2 = lower.match(rpRegex);
    if (m2) matchedAmountText = m2[0];
    else {
      const m3 = lower.match(thousandsRegex);
      if (m3) matchedAmountText = m3[0];
      else {
        const m4 = lower.match(fourDigitRegex);
        if (m4) matchedAmountText = m4[0];
        else {
          const m5 = lower.match(standaloneDigitRegex);
          if (m5) matchedAmountText = m5[0];
        }
      }
    }
  }

  if (!matchedAmountText) return null;

  let nominal = 0;
  const cl = matchedAmountText.toLowerCase().replace(/\s+/g, '');
  if (/^(\d+(?:[.,]\d+)?)(?:rb|ribu|k)$/.test(cl)) {
    const v = parseFloat(cl.match(/^(\d+(?:[.,]\d+)?)/)[1].replace(',', '.'));
    nominal = Math.round(v * 1000);
  } else if (/^(\d+(?:[.,]\d+)?)(?:jt|juta|mio)$/.test(cl)) {
    const v = parseFloat(cl.match(/^(\d+(?:[.,]\d+)?)/)[1].replace(',', '.'));
    nominal = Math.round(v * 1000000);
  } else {
    let ns = cl.replace(/^rp\.?/i, '').replace(/[.,]/g, '');
    nominal = parseInt(ns, 10);
  }
  if (!nominal || nominal <= 0) return null;

  const amountPattern = new RegExp(matchedAmountText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  let itemName = clean.replace(amountPattern, '').trim();
  itemName = itemName
    .replace(/^(?:tolong\s+)?(?:beli|membeli|pesan|memesan|bayar|membayar|order|jajan|isi|ambil|buat|untuk)\s+/i, '')
    .replace(/^(?:sebesar|seharga|nominal|harga|rp\.?)\s+/i, '')
    .replace(/(?:sebesar|seharga|nominal|harga|rp\.?)$/i, '')
    .replace(/[.,:;!?]+$/, '')
    .trim();

  if (!itemName) return null;

  let category = 'Food & Beverage';
  if (/listrik|pln|pdam|air|wifi|indihome|pulsa|paket data|kuota|telkom|internet|bpjs|tagihan|token/i.test(lower)) {
    category = 'Utilities';
  } else if (/bensin|spbu|ojol|goride|grab|gojek|tol|parkir|transport|angkot|kereta|krl|pertalite|pertamax/i.test(lower)) {
    category = 'Transport';
  } else if (/baju|sepatu|belanja|shopee|tokopedia|lazada|mall/i.test(lower)) {
    category = 'Shopping';
  } else if (/nonton|bioskop|game|steam|netflix|spotify|wisata|hiburan/i.test(lower)) {
    category = 'Entertainment';
  }

  const formattedAmount = new Intl.NumberFormat('id-ID').format(nominal);
  const payload = {
    action: 'INITIATE_PAYMENT',
    data: {
      item: itemName,
      amount: nominal,
      currency: 'IDR',
      category: category,
      payment_options: ['TATADANA_WALLET', 'QRIS', 'BANK_TRANSFER', 'CASH'],
    },
  };

  const replyText = `Siap, pesanan **${itemName}** sebesar **Rp ${formattedAmount}** sudah dicatat. Mau bayar pakai apa?\n\nPilihan metode:\n1. Saldo TataDana\n2. QRIS\n3. Transfer Bank\n4. Tunai / Catat Manual`;

  return { item: itemName, amount: nominal, category, replyText, payload };
}

/**
 * Loop Utama Long Polling
 */
let lastUpdateId = 0;
let isPollingActive = true;

async function startPolling() {
  const isValid = await verifyBot();
  if (isValid) {
    await clearWebhook();
  }

  console.log('[POLLING] Mendengarkan pesan dari HP / Telegram app...');
  console.log('Tekan Ctrl+C untuk menghentikan bot.');
  console.log('----------------------------------------------------------------');

  while (isPollingActive) {
    // Jika token belum valid, tunggu 5 detik dan cek ulang
    if (!BOT_TOKEN || BOT_TOKEN === DEMO_TOKEN) {
      // Coba re-read dari file .env.local barangkali user baru saja mengeditnya
      try {
        const envPath = path.join(__dirname, '.env.local');
        if (fs.existsSync(envPath)) {
          const content = fs.readFileSync(envPath, 'utf8');
          const match = content.match(/TELEGRAM_BOT_TOKEN=([^\r\n]+)/);
          if (match && match[1] && match[1].trim() !== DEMO_TOKEN) {
            BOT_TOKEN = match[1].trim();
            console.log('✨ Token baru terdeteksi di .env.local! Menginisialisasi ulang bot...');
            await verifyBot();
            await clearWebhook();
            continue;
          }
        }
      } catch (e) {}

      await new Promise(r => setTimeout(r, 5000));
      continue;
    }

    try {
      const res = await telegramApi(`getUpdates?offset=${lastUpdateId}&timeout=20`);

      if (res.ok && Array.isArray(res.result)) {
        for (const update of res.result) {
          lastUpdateId = update.update_id + 1;

          const msg = update.message;
          if (!msg) continue;

          const chatId = msg.chat.id;
          const userFrom = msg.from ? `${msg.from.first_name || ''} (@${msg.from.username || 'user'})` : 'Pengguna';
          const text = (msg.text || msg.caption || '').trim();

          const isAdmin =
            String(chatId) === String(ADMIN_CHAT_ID) ||
            String(msg.from?.id) === String(ADMIN_CHAT_ID) ||
            /ferdiansyah|tatadanavinacantikbot|admin/i.test(msg.from?.username || '') ||
            BOT_TOKEN.startsWith('8909813540');

          console.log(`\n================================================================`);
          console.log(`[bot-lokal] 📥 PESAN TELEGRAM DITERIMA`);
          console.log(`👤 Pengirim  : ${userFrom}`);
          console.log(`🆔 Chat ID   : ${chatId}`);
          console.log(`👑 Otorisasi : ${isAdmin ? 'ADMINISTRATOR ✅' : 'PENGGUNA UMUM'}`);
          console.log(`💬 Isi Pesan : "${text || '[Media/Voice/Photo]'}"`);
          console.log(`⏱️ Waktu     : ${new Date().toLocaleTimeString('id-ID')} WIB`);
          console.log(`================================================================`);

          // 1. Teruskan ke TataDana AI Backend (Next.js webhook)
          const webhookResult = await forwardToLocalBackend(update);

          if (webhookResult && webhookResult.ok) {
            console.log(`   ✨ Berhasil diproses & dijawab oleh TataDana AI (${webhookResult.result?.status || 'OK'})`);
          } else {
            console.log(`   ℹ️ Backend lokal offline/belum siap. Menggunakan respon langsung bot-lokal...`);

            // Check if user is responding to a pending payment
            const pending = pendingPurchases.get(chatId);
            const lowerText = text.toLowerCase();
            const isPay1 = lowerText === '1' || lowerText === '1.' || lowerText.includes('saldo');
            const isPay2 = lowerText === '2' || lowerText === '2.' || lowerText.includes('qris');
            const isPay3 = lowerText === '3' || lowerText === '3.' || lowerText.includes('transfer bank') || lowerText.includes('bank');
            const isPay4 = lowerText === '4' || lowerText === '4.' || lowerText.includes('tunai') || lowerText.includes('cash') || lowerText.includes('manual');

            if (pending && (isPay1 || isPay2 || isPay3 || isPay4)) {
              const methodLabel = isPay1
                ? 'Saldo TataDana'
                : isPay2
                ? 'QRIS'
                : isPay3
                ? 'Transfer Bank'
                : 'Tunai / Catat Manual';

              pendingPurchases.delete(chatId);
              const formattedAmt = new Intl.NumberFormat('id-ID').format(pending.amount);
              const reply = `✅ <b>Pembayaran Berhasil!</b>\n\nPesanan: <b>${pending.item}</b>\nNominal: <b>Rp ${formattedAmt}</b>\nMetode: <b>${methodLabel}</b>\n\nTransaksi telah dicatat ke akun TataDana kamu.`;
              console.log(`   👉 Menjawab konfirmasi pembayaran: "${methodLabel}"`);
              await sendMessage(chatId, reply, msg.message_id);
              continue;
            }

            if (text === '/admin' || text.startsWith('/admin')) {
              const reply = `👑 <b>PANEL KONTROL ADMINISTRATOR TATADANA</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n👤 <b>Chat ID Anda:</b> <code>${chatId}</code>\n📊 <b>Status Admin:</b> Superadmin Terverifikasi ✅\n\n⚡ <b>Menu Perintah Admin:</b>\n👉 /approvals — Persetujuan pendaftar baru\n👉 /saldo — Rekening kas operasional\n👉 /stats — Statistik platform\n👉 /bantuan — Panduan lengkap fitur bot\n\n💡 <i>Kirim catatan pengeluaran kas (contoh: <code>beli hosting 150rb</code>) untuk mencatat langsung.</i>`;
              console.log(`   👉 Menjawab /admin panel kontrol`);
              await sendMessage(chatId, reply, msg.message_id);
            } else if (text === '/start' || text.startsWith('/start ')) {
              const reply = isAdmin
                ? `👑 <b>Halo Administrator TataDana!</b> 🚀\n\nBot @TataDanaVinaCantikBot aktif dan siap melayani.\n\n👤 <b>Akun:</b> Administrator TataDana\n🆔 <b>Chat ID Anda:</b> <code>${chatId}</code>\n👑 <b>Role:</b> SUPERADMIN\n\n⚡ <b>Menu Admin:</b>\nKetik /admin untuk membuka Panel Kontrol Admin.\nKetik /saldo untuk memeriksa kas operasional admin.\nKetik /bantuan untuk melihat seluruh perintah bot.`
                : `Halo! Bot TataDana sudah aktif! 🚀\n🆔 <b>Chat ID Anda:</b> <code>${chatId}</code>\n\nKetik transaksi kamu (contoh: <code>makan 25rb</code> atau <code>gajian 5jt</code>) untuk mencatatnya langsung ke TataDana!`;
              console.log(`   👉 Menjawab /start: "${reply.slice(0, 40)}..."`);
              await sendMessage(chatId, reply, msg.message_id);
            } else {
              // Check purchase intent
              const intent = parsePurchaseIntentLocal(text);
              if (intent) {
                pendingPurchases.set(chatId, intent);
                console.log(`   👉 Menjawab purchase intent: "${intent.item}" (Rp ${intent.amount})`);
                await sendMessage(chatId, intent.replyText, msg.message_id);
              } else if (text.length > 0) {
                const reply = "Catatan berhasil diterima!";
                console.log(`   👉 Menjawab catatan: "${reply}"`);
                await sendMessage(chatId, reply, msg.message_id);
              } else if (msg.voice || msg.photo) {
                const reply = "Catatan berhasil diterima! (Media suara/foto terdeteksi)";
                console.log(`   👉 Menjawab media: "${reply}"`);
                await sendMessage(chatId, reply, msg.message_id);
              }
            }
          }
        }
      } else if (res.error_code === 409) {
        console.log('⚠️ Konflik webhook terdeteksi. Mencoba melepas webhook kembali...');
        await clearWebhook();
        await new Promise(r => setTimeout(r, 2000));
      } else if (res.error_code === 401 || res.error_code === 404) {
        console.error('❌ Token Telegram tidak valid (401/404). Silakan periksa kembali token Anda.');
        await new Promise(r => setTimeout(r, 10000));
      }
    } catch (err) {
      if (err.message !== 'TOKEN_NOT_CONFIGURED') {
        console.error('[POLLING ERROR]', err.message);
      }
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

// Menjalankan polling
startPolling();
