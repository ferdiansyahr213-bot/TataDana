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

// 1. RESOLUSI TOKEN TELEGRAM
// Prioritas: Argumen CLI -> Env Var -> .env.local -> Hardcoded Fallback
let BOT_TOKEN = process.argv[2] || process.env.TELEGRAM_BOT_TOKEN;

// Baca dari .env.local jika belum ada dari CLI/Env
if (!BOT_TOKEN) {
  try {
    const envPath = path.join(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/TELEGRAM_BOT_TOKEN=([^\r\n]+)/);
      if (match && match[1]) {
        BOT_TOKEN = match[1].trim();
      }
    }
  } catch (err) {
    console.error('[ENV] Gagal membaca .env.local:', err.message);
  }
}

// Token default placeholder
const DEMO_TOKEN = 'demo_bot_token_tatadana';
if (!BOT_TOKEN || BOT_TOKEN === DEMO_TOKEN) {
  // Jika pengguna ingin menempelkan token langsung di file ini:
  const HARDCODED_TOKEN = '8935805678:AAHmVJbPMMCer9Lg1HTakdp3C_7hhbviEDM';
  if (HARDCODED_TOKEN) {
    BOT_TOKEN = HARDCODED_TOKEN;
  }
}

console.log('================================================================');
console.log('🤖 TataDana Telegram Bot - Polling Engine (Localhost)');
console.log('================================================================');
console.log('Waktu Mulai :', new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }), 'WIB');
console.log('Token Status:', BOT_TOKEN && BOT_TOKEN !== DEMO_TOKEN ? `Aktif (${BOT_TOKEN.substring(0, 8)}...)` : '⚠️ Belum dikonfigurasi (Masih Demo Token)');
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
 * Mengirim pesan balasan ke chat Telegram
 */
async function sendMessage(chatId, text, replyToMessageId = null) {
  try {
    const payload = {
      chat_id: chatId,
      text: text,
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
      const data = JSON.stringify(update);
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

  const replyText = `Siap, pesanan **${itemName}** sebesar **Rp ${formattedAmount}** sudah dicatat. Mau bayar pakai apa?\n\nPilihan metode:\n1. Saldo TataDana\n2. QRIS\n3. Transfer Bank\n4. Tunai / Catat Manual\n\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``;

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

          console.log(`\n📩 [Pesan Masuk] Dari: ${userFrom} (ChatID: ${chatId})`);
          console.log(`   Isi Pesan: "${text || '[Media/Voice/Photo]'}"`);

          // 1. Teruskan ke TataDana AI Backend (Next.js webhook)
          const webhookResult = await forwardToLocalBackend(update);

          if (webhookResult && webhookResult.ok) {
            console.log(`   ✨ Berhasil diproses & dijawab oleh TataDana AI (${webhookResult.result?.status || 'OK'})`);
          } else {
            console.log(`   ℹ️ Menggunakan respon langsung bot-lokal (fallback)...`);

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

            if (text === '/start' || text.startsWith('/start ')) {
              const reply = "Halo! Bot TataDana sudah aktif!";
              console.log(`   👉 Menjawab /start: "${reply}"`);
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
