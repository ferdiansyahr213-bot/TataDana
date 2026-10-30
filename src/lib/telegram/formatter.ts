import { formatRupiah } from '../utils/currency';
import { formatWIBDateTime } from '../utils/date-wib';
import { Wallet, Category, Budget, Transaction, UserProfile } from '../types';

/**
 * Generate visual progress bar: e.g. ██████░░░░ 60%
 */
export function generateProgressBar(percent: number, totalBlocks: number = 10): string {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const filledBlocks = Math.round((clamped / 100) * totalBlocks);
  const emptyBlocks = totalBlocks - filledBlocks;
  return '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
}

export function formatExpenseReply(params: {
  amount: number;
  category: Category;
  wallet: Wallet;
  notes: string;
  remainingBalance: number;
  budget?: Budget;
  transcript?: string;
}): string {
  const nowWib = formatWIBDateTime();
  const transcriptLine = params.transcript ? `🎙️ Transkrip: "${params.transcript}"\n\n` : '';

  let budgetSection = '';
  if (params.budget && params.budget.amount > 0) {
    const totalSpent = params.budget.spent;
    const percent = Math.min(100, Math.round((totalSpent / params.budget.amount) * 100));
    const sisa = Math.max(0, params.budget.amount - totalSpent);
    const bar = generateProgressBar(percent);

    let motivational = 'Tetap hemat dan bijak ya! 👍';
    if (percent >= 100) {
      motivational = '⚠️ Perhatian! Budget kategori ini sudah melebihi 100%! Rem dulu pengeluaranmu ya.';
    } else if (percent >= 80) {
      motivational = '⚡ Hati-hati! Budget sudah mencapai 80%, pertahankan sampai akhir bulan!';
    }

    budgetSection = `\n\n📊 Budget ${params.category.name} bulan ini:\n${bar} ${percent}% — sisa ${formatRupiah(sisa)}\n${motivational}`;
  }

  return `${transcriptLine}📅 ${nowWib}
💸 Pengeluaran tercatat!
├ Nominal : ${formatRupiah(params.amount)}
├ Kategori : ${params.category.emoji} ${params.category.name}
├ Dompet : 👛 ${params.wallet.name}
├ Catatan : ${params.notes}
└ Saldo : ${formatRupiah(params.remainingBalance)}${budgetSection}`;
}

export function formatIncomeReply(params: {
  amount: number;
  wallet: Wallet;
  categoryName?: string;
  transcript?: string;
}): string {
  const nowWib = formatWIBDateTime();
  const transcriptLine = params.transcript ? `🎙️ Transkrip: "${params.transcript}"\n\n` : '';

  return `${transcriptLine}📅 ${nowWib}
💰 Pemasukan tercatat!
├ Nominal : ${formatRupiah(params.amount)}
├ Kategori : 💼 ${params.categoryName || 'Pemasukan'}
├ Dompet : 👛 ${params.wallet.name}
└ Saldo baru : ${formatRupiah(params.wallet.balance)}

💪 Semangat terus! Jangan lupa sisihkan untuk tabungan ya.`;
}

export function formatHelpReply(): string {
  return `🤖 Selamat datang di TataDana Bot!
Catat keuangan semudah chat.

📝 Contoh input cepat:
• "beli bakso 15rb"
• "gajian 5jt"
• "bensin spbu 30k"
• "kopi kenangan 28.000"
• "terima freelance 1.5jt"

📸 Foto Struk (Paket Pro):
Kirim foto struk belanja, AI akan otomatis mencatat item dan harganya!

🎙️ Voice Note (Semua Paket):
Kirim rekaman suara singkat (maks 60s), bot akan otomatis mencatatnya.

⚡ Perintah Bot:
/saldo — Cek saldo semua dompet
/kalender — Rekap mutasi & jadwal hari ini
/tataai <pertanyaan> — Konsultasi keuangan pintar
/hari_ini — Rekap transaksi hari ini
/minggu_ini — Rekap 7 hari terakhir
/bulan_ini — Rekap pengeluaran bulan ini
/budget — Cek status budget kategori
/sheet — Akses dashboard & data transaksi
/bantuan — Panduan penggunaan bot`;
}

export function formatCalendarReply(transactions: Transaction[], user: UserProfile): string {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const todayTx = transactions.filter(t => (t.transaction_date || '').startsWith(todayStr));
  
  let incomeToday = 0;
  let expenseToday = 0;
  todayTx.forEach(t => {
    if (t.type === 'income') incomeToday += t.amount;
    if (t.type === 'expense') expenseToday += t.amount;
  });

  const netCashflow = incomeToday - expenseToday;
  const netSign = netCashflow >= 0 ? '+' : '';

  let txListText = '';
  if (todayTx.length === 0) {
    txListText = '• Belum ada transaksi tercatat hari ini.\n';
  } else {
    todayTx.slice(0, 5).forEach(t => {
      const icon = t.type === 'income' ? '🟢' : '🔴';
      txListText += `${icon} ${t.category_emoji || '•'} ${t.category_name || t.type}: ${formatRupiah(t.amount)} (${t.notes || '-'})\n`;
    });
    if (todayTx.length > 5) {
      txListText += `... dan ${todayTx.length - 5} transaksi lainnya.\n`;
    }
  }

  const reminderInfo = user.reminder_enabled
    ? `⏰ Reminder: Aktif (${user.reminder_frequency}x/hari pada ${user.reminder_time_1.slice(0, 5)}${user.reminder_frequency === 2 ? ' & ' + user.reminder_time_2.slice(0, 5) : ''} WIB)`
    : '⏰ Reminder: Nonaktif';

  return `📅 Kalender Keuangan Hari Ini:

💰 Pemasukan : ${formatRupiah(incomeToday)}
💸 Pengeluaran: ${formatRupiah(expenseToday)}
📊 Net Cashflow : ${netSign}${formatRupiah(netCashflow)}

📝 Transaksi Hari Ini:
${txListText}
${reminderInfo}

💡 Buka web TataDana: https://tatadana.id/dashboard/calendar untuk visual kalender interaktif.`;
}

export function formatSaldoReply(wallets: Wallet[]): string {
  if (!wallets.length) {
    return 'Belum ada dompet terdaftar. Silakan atur dompet di Dashboard TataDana.';
  }
  let total = 0;
  let text = '👛 Saldo Dompet Kamu:\n\n';
  for (const w of wallets) {
    total += w.balance;
    const isDef = w.is_default ? ' (Default)' : '';
    text += `• ${w.name}${isDef}: ${formatRupiah(w.balance)}\n`;
  }
  text += `\n💵 Total Saldo: ${formatRupiah(total)}`;
  return text;
}

export function formatBudgetListReply(budgets: Budget[]): string {
  if (!budgets.length) {
    return 'Belum ada budget yang diset untuk bulan ini. Buka Dashboard TataDana untuk mulai mengatur budget.';
  }
  let text = '🎯 Status Budget Bulan Ini:\n\n';
  for (const b of budgets) {
    const percent = b.amount > 0 ? Math.round((b.spent / b.amount) * 100) : 0;
    const bar = generateProgressBar(percent, 8);
    const sisa = Math.max(0, b.amount - b.spent);
    text += `${b.category_emoji || '📦'} ${b.category_name}\n`;
    text += `${bar} ${percent}%\n`;
    text += `Terpakai: ${formatRupiah(b.spent)} / ${formatRupiah(b.amount)} (Sisa: ${formatRupiah(sisa)})\n\n`;
  }
  return text.trim();
}

export function formatAmbiguousErrorReply(rawText: string): string {
  return `🤔 Maaf, TataDana belum bisa memahami: "${rawText}"

💡 Coba ketik dengan format seperti ini:
• "beli makan siang 25rb"
• "isi bensin motor 30k"
• "gaji kantor 6.5jt"
• "jajan boba 18.000"

Atau ketik /bantuan untuk melihat panduan lengkap.`;
}

export function formatStarterLimitReply(limit: number): string {
  return `⚠️ Batas Transaksi Bulanan Tercapai!

Kamu telah mencapai limit paket Starter (${limit} transaksi/bulan).
Untuk melanjutkan pencatatan tanpa batas + fitur Foto Struk AI & AI Financial Advisor, yuk upgrade ke paket Pro!

👉 Buka TataDana Dashboard: https://tatadana.id/dashboard/pricing`;
}

export function formatProOnlyReceiptReply(): string {
  return `📸 Fitur Catat via Foto Struk Khusus Pengguna Pro!

Dengan paket Pro, kamu cukup foto struk belanja (Indomaret, restoran, dll) dan AI otomatis membaca setiap itemnya.

👉 Upgrade sekarang di https://tatadana.id/dashboard/pricing (Hanya Rp99.000 sekali bayar seumur hidup!)`;
}

export function formatDailyReminderReply(): string {
  return `⏰ Reminder Keuangan!
Jangan lupa catat pengeluaran hari ini ya 📝
Pencatatan rutin = keuangan lebih terkontrol 💪
Ketik transaksimu sekarang!`;
}

export function formatFinancialAdvisorReply(userName: string, analysis: string, advice: string): string {
  return `🤖 Financial Advisor
Hei ${userName}! ${analysis}
💡 Saran: ${advice}`;
}

/**
 * Sanitasi pesan Telegram:
 * 1. Mencegah kebocoran raw JSON atau blok ```json ... ``` ke pengguna Telegram
 * 2. Mengurai pesan jika AI mengembalikan objek/teks JSON murni
 * 3. Menghapus tag kode dan mengubah action payload menjadi kalimat teks rapi
 */
export function sanitizeTelegramMessageText(rawInput: any): string {
  if (rawInput === null || rawInput === undefined) return '';

  // 1. Jika input berupa objek JS
  if (typeof rawInput === 'object') {
    return formatJsonPayloadToFriendlyText(rawInput);
  }

  let text = String(rawInput).trim();
  if (!text) return '';

  // 2. Jika seluruh string merupakan JSON murni: { ... }
  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      const parsed = JSON.parse(text);
      return formatJsonPayloadToFriendlyText(parsed);
    } catch {
      // bukan JSON murni yang valid, lanjutkan ke pembersihan regex
    }
  }

  // 3. Jika teks hanya berupa blok markdown ```json ... ``` tanpa teks pengantar
  const pureCodeBlockMatch = text.match(/^\s*```(?:json)?\s*(\{[\s\S]*?\})\s*```\s*$/i);
  if (pureCodeBlockMatch) {
    try {
      const parsed = JSON.parse(pureCodeBlockMatch[1]);
      return formatJsonPayloadToFriendlyText(parsed);
    } catch {
      // Abaikan jika bukan JSON valid
    }
  }

  // 4. Bersihkan blok ```json ... ``` dari teks campuran (seperti replyText yang memiliki pengantar + code block JSON)
  text = text
    .replace(/```(?:json)?\s*\{[\s\S]*?\}\s*```/gi, '')
    // Bersihkan bila ada raw JSON object bertanda action di akhir pesan
    .replace(/\{[\s\S]*?"action"\s*:\s*"(?:INITIATE_PAYMENT|RECORD_INCOME|[^"]+)"[\s\S]*?\}/gi, '')
    .trim();

  // 5. Jika setelah dibersihkan teks menjadi kosong (misal karena awalnya berisi code block JSON)
  if (!text) {
    const jsonMatch = String(rawInput).match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        return formatJsonPayloadToFriendlyText(parsed);
      } catch {}
    }
    return 'Catatan telah berhasil diterima dan diproses.';
  }

  return text;
}

/**
 * Mengubah objek payload JSON menjadi teks informatif yang ramah pengguna
 */
export function formatJsonPayloadToFriendlyText(obj: any): string {
  if (!obj || typeof obj !== 'object') return String(obj || '');

  // A. Jika ada field teks siap pakai
  if (typeof obj.reply === 'string' && obj.reply.trim()) {
    return sanitizeTelegramMessageText(obj.reply);
  }
  if (typeof obj.message === 'string' && obj.message.trim()) {
    return sanitizeTelegramMessageText(obj.message);
  }
  if (typeof obj.text === 'string' && obj.text.trim()) {
    return sanitizeTelegramMessageText(obj.text);
  }

  // B. Jika berupa action INITIATE_PAYMENT
  if (obj.action === 'INITIATE_PAYMENT' && obj.data) {
    const data = obj.data;
    const item = data.item || data.title || 'Pesanan';
    const amount = data.amount ? formatRupiah(data.amount) : '0';
    const options = Array.isArray(data.payment_options) ? data.payment_options : [];
    const optionsText = options.length > 0
      ? `\n\nPilihan metode:\n${options.map((opt: string, i: number) => `${i + 1}. ${opt}`).join('\n')}`
      : '';
    return `Siap, pesanan *${item}* sebesar *${amount}* sudah dicatat. Mau bayar pakai apa?${optionsText}`;
  }

  // C. Jika berupa action RECORD_INCOME
  if (obj.action === 'RECORD_INCOME' && obj.data) {
    const data = obj.data;
    const title = data.title || 'Pemasukan';
    const amount = data.amount ? formatRupiah(data.amount) : '0';
    const options = Array.isArray(data.payment_options) ? data.payment_options : [];
    const optionsText = options.length > 0
      ? `\n\nSilakan pilih dompet tujuan penerimaan:\n${options.map((opt: string, i: number) => `${i + 1}. ${opt}`).join('\n')}`
      : '';
    return `Alhamdulillah! Pemasukan *${title}* sebesar *${amount}* siap dicatat. 💰${optionsText}`;
  }

  // D. Jika ada field status/error
  if (obj.error) {
    return `⚠️ ${obj.error}`;
  }
  if (obj.status === 'success' || obj.success) {
    return '✅ Permintaan Anda berhasil diproses.';
  }

  // Fallback aman: jangan pernah dump JSON mentah
  return 'Catatan Anda telah berhasil diproses oleh TataDana.';
}
