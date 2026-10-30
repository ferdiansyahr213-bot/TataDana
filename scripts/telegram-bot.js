/**
 * TataDana Telegram Bot Long Polling Listener
 * 
 * Script ini mengambil pesan langsung dari Telegram API via Long Polling (getUpdates)
 * dan meneruskannya secara real-time ke backend TataDana (http://localhost:3000/api/telegram/webhook).
 * 
 * Penggunaan:
 *   node scripts/telegram-bot.js
 *   atau
 *   npm run telegram:bot
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// 1. Muat environment variables dari .env.local
function getBotToken() {
  const envPath = path.resolve(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (key === 'TELEGRAM_BOT_TOKEN') {
          return val;
        }
      }
    }
  }
  return process.env.TELEGRAM_BOT_TOKEN || '8909831540:AAF-dPsFSHtwz3soxsToyTSaF7SYpCy3RLOI';
}

let BOT_TOKEN = getBotToken();
const BACKEND_URL = process.env.WEBHOOK_BASE_URL 
  ? `${process.env.WEBHOOK_BASE_URL}/api/telegram/webhook` 
  : 'http://localhost:3000/api/telegram/webhook';

if (!BOT_TOKEN) {
  console.error('[Telegram Bot] ❌ Error: TELEGRAM_BOT_TOKEN tidak ditemukan di .env.local atau environment variables.');
  process.exit(1);
}

console.log('='.repeat(65));
console.log('🤖 TataDana Telegram Bot Long Polling Service (Admin Sync)');
console.log('='.repeat(65));
console.log(`[Config] Target Bot    : @TataDanaVinaCantikBot`);
console.log(`[Config] Token Terpasang : ${BOT_TOKEN.substring(0, 10)}...${BOT_TOKEN.substring(BOT_TOKEN.length - 4)}`);
console.log(`[Config] Akun Admin     : Administrator TataDana (ferdiansyahr213@gmail.com)`);
console.log(`[Config] Saldo Dompet   : Rp50.000.000 (Rekening Operasional Admin)`);
console.log(`[Config] Target Endpoint : ${BACKEND_URL}`);
console.log('-'.repeat(65));

// Helper HTTP/HTTPS request
function request(url, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https:');
    const client = isHttps ? https : http;
    
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

// 2. Verifikasi Token Bot (getMe)
async function verifyBot() {
  try {
    const res = await request(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    if (res.data && res.data.ok) {
      const bot = res.data.result;
      console.log(`[Telegram API] ✅ Bot Terverifikasi: ${bot.first_name} (@${bot.username}) [ID: ${bot.id}]`);
      return bot;
    } else {
      console.warn(`[Telegram API] ⚠️ Respon Telegram: ${res.data?.description || 'Status ' + res.status}`);
      console.warn(`[Telegram API] ℹ️ Daemon Long Polling tetap aktif dan siap menerima pesan.`);
      return null;
    }
  } catch (err) {
    console.warn(`[Telegram API] ⚠️ Gagal menghubungi Telegram:`, err.message);
    return null;
  }
}

// 3. Hapus Webhook jika ada (Wajib agar Long Polling / getUpdates bisa menerima update)
async function clearWebhook() {
  try {
    const res = await request(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook?drop_pending_updates=false`);
    if (res.data && res.data.ok) {
      console.log(`[Telegram API] 🔄 Mode Polling diaktifkan (Webhook dibersihkan dengan sukses)`);
    }
  } catch (err) {
    console.warn(`[Telegram API] ⚠️ Peringatan saat deleteWebhook:`, err.message);
  }
}

// 4. Teruskan update Telegram ke Next.js API (/api/telegram/webhook)
async function forwardToBackend(update) {
  try {
    const url = new URL(BACKEND_URL);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
    };

    const res = await request(BACKEND_URL, options, update);
    return res;
  } catch (err) {
    console.error(`[Backend Bridge] ❌ Gagal meneruskan ke ${BACKEND_URL}:`, err.message);
    return null;
  }
}

// 5. Loop Long Polling Utama
let isRunning = true;
let offset = 0;

async function startPolling() {
  await verifyBot();
  await clearWebhook();

  console.log(`[Telegram Bot] 🚀 Polling aktif! Siap menerima pesan dari aplikasi Telegram...`);
  console.log(`[Telegram Bot] 💡 Coba kirim pesan "/start" atau "/saldo" ke @TataDanaVinaCantikBot`);
  console.log('-'.repeat(65));

  while (isRunning) {
    try {
      const pollUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${offset}&timeout=25`;
      const res = await request(pollUrl);

      if (res.data && !res.data.ok) {
        if (res.data.error_code === 401) {
          const masked = BOT_TOKEN ? `${BOT_TOKEN.substring(0, 10)}...${BOT_TOKEN.substring(BOT_TOKEN.length - 4)}` : 'EMPTY';
          console.warn(`[Telegram Bot] ⚠️ Token bot Telegram (${masked}) tidak valid / belum aktif di @BotFather (401 Unauthorized).`);
          console.warn(`[Telegram Bot] ℹ️ Pastikan token dari @BotFather di .env.local sudah benar. Memeriksa kembali .env.local dalam 10 detik...`);
          await new Promise(r => setTimeout(r, 10000));
          const refreshedToken = getBotToken();
          if (refreshedToken !== BOT_TOKEN) {
            console.log(`[Telegram Bot] 🔄 Mendeteksi token baru dari .env.local! Mengalihkan ke token baru...`);
            BOT_TOKEN = refreshedToken;
            await verifyBot();
            await clearWebhook();
          }
        } else {
          console.warn(`[Telegram Bot] ⚠️ Status Telegram API (${res.data.error_code || res.status}): ${res.data.description || 'Menunggu token siap'}. Mencoba kembali dalam 5 detik...`);
          await new Promise(r => setTimeout(r, 5000));
        }
        continue;
      }

      if (res.data && res.data.ok && Array.isArray(res.data.result)) {
        for (const update of res.data.result) {
          offset = update.update_id + 1;

          const msg = update.message;
          if (msg) {
            const sender = msg.from?.username ? `@${msg.from.username}` : (msg.from?.first_name || 'User');
            const chatId = msg.chat?.id;
            const text = msg.text || (msg.photo ? '[Foto/Struk]' : (msg.voice ? '[Voice Note]' : '[Media]'));

            console.log(`\n[Telegram Bot] 📥 Pesan masuk dari ${sender} (Chat ID: ${chatId}): "${text}"`);

            // Teruskan ke backend Next.js
            const backendRes = await forwardToBackend(update);
            if (backendRes && backendRes.status === 200) {
              console.log(`[Telegram Bot] ✅ Respon backend (200 OK): Balasan telah dikirim ke Telegram.`);
            } else {
              console.warn(`[Telegram Bot] ⚠️ Backend merespon status: ${backendRes?.status || 'Error'}`);
            }
          }
        }
      }
    } catch (err) {
      if (!isRunning) break;
      console.warn(`[Telegram Bot] ⚠️ Koneksi polling terputus, mencoba kembali dalam 3 detik (${err.message})...`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  console.log(`[Telegram Bot] 🛑 Polling dihentikan.`);
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Telegram Bot] Menerima sinyal SIGINT, menutup polling...');
  isRunning = false;
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Telegram Bot] Menerima sinyal SIGTERM, menutup polling...');
  isRunning = false;
  process.exit(0);
});

startPolling();
