import { serverStore } from '../supabase/server';
import { sendTelegramMessage } from './client';
import { 
  formatExpenseReply, 
  formatIncomeReply, 
  formatHelpReply, 
  formatSaldoReply, 
  formatBudgetListReply, 
  formatAmbiguousErrorReply, 
  formatStarterLimitReply, 
  formatProOnlyReceiptReply,
  formatFinancialAdvisorReply,
  formatCalendarReply,
  sanitizeTelegramMessageText
} from './formatter';
import { parseTransactionWithAI, parseReceiptWithAI, transcribeVoiceNote, parsePurchaseIntent, parseIncomeIntent } from '../ai/provider-manager';
import { canAddTransaction, canUseReceiptOCR } from '../utils/plans';
import { formatRupiah } from '../utils/currency';
import { getCurrentMonthPeriodWIB, formatWIBDateTime } from '../utils/date-wib';
import { UserProfile, Category, Budget, Transaction, Wallet } from '../types';

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      first_name?: string;
      username?: string;
      type: string;
    };
    date: number;
    text?: string;
    photo?: Array<{ file_id: string; file_unique_id: string; file_size?: number; width: number; height: number }>;
    voice?: { file_id: string; duration: number; mime_type?: string; file_size?: number };
    audio?: { file_id: string; duration: number; mime_type?: string; file_size?: number; file_name?: string };
    caption?: string;
  };
}

/**
 * AI Financial Advisor Helper - checks all 3 triggers per Part 4.7
 */
function evaluateFinancialAdvisorTriggers(
  user: UserProfile,
  category: Category,
  amount: number,
  userTransactions: Transaction[],
  categoryBudget?: Budget
): string | null {
  if (user.plan !== 'pro') return null;

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 86400000;
  const fourteenDaysAgo = now - 14 * 86400000;

  // Trigger 1: Pengeluaran satu kategori naik >50% dibanding minggu lalu
  const thisWeekCategoryExpense = userTransactions
    .filter(t => t.type === 'expense' && t.category_id === category.id && new Date(t.transaction_date || Date.now()).getTime() >= sevenDaysAgo)
    .reduce((sum, t) => sum + t.amount, 0) + amount;

  const lastWeekCategoryExpense = userTransactions
    .filter(t => t.type === 'expense' && t.category_id === category.id)
    .filter(t => {
      const time = new Date(t.transaction_date || 0).getTime();
      return time >= fourteenDaysAgo && time < sevenDaysAgo;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  if (lastWeekCategoryExpense > 50000 && thisWeekCategoryExpense > lastWeekCategoryExpense * 1.5) {
    const percentRise = Math.round(((thisWeekCategoryExpense - lastWeekCategoryExpense) / lastWeekCategoryExpense) * 100);
    return formatFinancialAdvisorReply(
      user.full_name,
      `Pengeluaran untuk kategori ${category.name} melonjak ${percentRise}% minggu ini dibanding minggu lalu (${formatRupiah(thisWeekCategoryExpense)} vs ${formatRupiah(lastWeekCategoryExpense)}).`,
      `Pertimbangkan untuk mengerem belanja ${category.name} selama beberapa hari agar sisa cashflow bulan ini tidak defisit.`
    );
  }

  // Trigger 2: Total pengeluaran sudah >80% dari total pemasukan bulan ini
  const currentMonth = getCurrentMonthPeriodWIB();
  const currentMonthTx = userTransactions.filter(t => (t.transaction_date || '').startsWith(currentMonth));
  const monthIncome = currentMonthTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const monthExpense = currentMonthTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) + amount;

  if (monthIncome > 0 && monthExpense > monthIncome * 0.8) {
    const percentSpent = Math.round((monthExpense / monthIncome) * 100);
    return formatFinancialAdvisorReply(
      user.full_name,
      `Total belanjaanmu bulan ini sudah mencapai ${percentSpent}% dari total pemasukan (${formatRupiah(monthExpense)} dari ${formatRupiah(monthIncome)}).`,
      `Sisihkan tabungan darurat terlebih dahulu dan batasi transaksi non-esensial sampai tanggal gajian berikutnya.`
    );
  }

  // Trigger 3: Pengeluaran besar (>20% budget kategori sekaligus)
  if (categoryBudget && categoryBudget.amount > 0 && amount > categoryBudget.amount * 0.2) {
    const percentOfBudget = Math.round((amount / categoryBudget.amount) * 100);
    return formatFinancialAdvisorReply(
      user.full_name,
      `Transaksi ${category.name} sebesar ${formatRupiah(amount)} baru saja memakan ${percentOfBudget}% dari seluruh budget bulanan kategori ini!`,
      `Pastikan sisa budget (${formatRupiah(Math.max(0, categoryBudget.amount - categoryBudget.spent - amount))}) cukup untuk kebutuhan sehari-hari sampai akhir bulan.`
    );
  }

  return null;
}

export async function processTelegramUpdate(
  update: TelegramUpdate,
  botToken: string
): Promise<{ success: boolean; status: string; error?: string }> {
  try {
    const { update_id, message } = update;

    // 1. Idempotency Check
    if (serverStore.isUpdateProcessed(update_id)) {
      return { success: true, status: 'already_processed' };
    }
    serverStore.markUpdateProcessed(update_id);

    if (!message) {
      return { success: true, status: 'no_message' };
    }

    const chatId = message.chat.id;

    // 2. Handle Account Linking commands before user lookup
    if (message.text) {
      const trimmed = message.text.trim();

      // Matches: /link_admin or /auth_admin
      if (/^\/(?:link_admin|auth_admin|admin_link)(?:\s+.*)?$/i.test(trimmed)) {
        const adminUser = serverStore.users.get('usr_admin_999') || serverStore.getUserByEmail('ferdiansyahr213@gmail.com');
        if (adminUser) {
          adminUser.telegram_chat_id = chatId;
          adminUser.telegram_connected = true;
          adminUser.telegram_bot_token = botToken;
          if (message.from?.username) adminUser.telegram_username = message.from.username;
          await sendTelegramMessage(
            botToken,
            chatId,
            `👑 *Otentikasi Administrator Berhasil!*\n\nChat ID *${chatId}* sekarang resmi terhubung ke akun *Administrator TataDana* (\`${adminUser.email}\`).\n\nKetik /admin untuk membuka Panel Kontrol Admin.`
          );
          return { success: true, status: 'admin_linked_success' };
        }
      }

      // Matches: /link 081234567890 or /hubungkan 081234567890 or /start 081234567890
      const linkMatch = trimmed.match(/^\/(?:link|hubungkan|start)\s+([0-9+\s-]+)$/i);
      if (linkMatch) {
        const cleanPhone = linkMatch[1].replace(/\D/g, '');
        const linkedUser = serverStore.linkUserByPhone(cleanPhone, chatId, message.from?.username);
        if (linkedUser) {
          await sendTelegramMessage(
            botToken,
            chatId,
            `✅ *Akun Berhasil Terhubung!*\n\nHalo *${linkedUser.full_name}*! Akun TataDana kamu (${linkedUser.phone_number}) sekarang resmi terhubung dengan Telegram ini.\n\nKamu sudah bisa langsung mencatat transaksi:\n• Ketik: "beli bakso 15rb"\n• Ketik: "gajian 5jt"\n• Kirim rekaman suara (voice note)\n• Atau kirim foto struk belanja!`
          );
          return { success: true, status: 'account_linked_success' };
        } else {
          await sendTelegramMessage(
            botToken,
            chatId,
            `❌ Nomor HP *${linkMatch[1]}* tidak ditemukan di database TataDana.\n\nSilakan pastikan kamu sudah mendaftar di web TataDana terlebih dahulu: https://tatadana.id/register`
          );
          return { success: true, status: 'link_phone_not_found' };
        }
      }
    }

    // 3. User Lookup (dengan auto-link cerdas khusus untuk bot admin & superadmin)
    let user = serverStore.getUserByTelegramChatId(chatId, botToken);
    const adminUser = serverStore.users.get('usr_admin_999') || serverStore.getUserByEmail('ferdiansyahr213@gmail.com');

    // Cek TELEGRAM_ADMIN_CHAT_ID dari variabel lingkungan
    const envAdminChatId = (
      process.env.TELEGRAM_ADMIN_CHAT_ID ||
      process.env.ADMIN_CHAT_ID ||
      process.env.TELEGRAM_ADMIN_ID ||
      ''
    ).trim();

    const isEnvAdminChatIdMatch = Boolean(
      envAdminChatId && (
        String(chatId) === String(envAdminChatId) ||
        String(message.from?.id) === String(envAdminChatId)
      )
    );

    // Cek apakah bot adalah @TataDanaVinaCantikBot (Token 8909813540... / 8909831540...)
    const activeEnvToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
    const isVinaCantikAdminBot =
      botToken.startsWith('8909813540') ||
      botToken.startsWith('8909831540') ||
      botToken.includes('AAFdPSHs') ||
      botToken.includes('AAF-dPsF') ||
      (Boolean(activeEnvToken) && botToken === activeEnvToken);

    const isSenderAdminMatch =
      adminUser &&
      (isEnvAdminChatIdMatch ||
        adminUser.telegram_chat_id === chatId ||
        message.from?.id === adminUser.telegram_chat_id ||
        (message.from?.username && /ferdiansyah|tatadanavinacantikbot|admin/i.test(message.from.username)));

    if (adminUser && (isEnvAdminChatIdMatch || isVinaCantikAdminBot || isSenderAdminMatch || (!user && isVinaCantikAdminBot))) {
      adminUser.telegram_chat_id = chatId;
      adminUser.telegram_connected = true;
      adminUser.telegram_bot_token = botToken;
      if (message.from?.username) adminUser.telegram_username = message.from.username;
      user = adminUser;
      serverStore.persist();
      console.log(`[Telegram Handler] 👑 Admin Terotentikasi: ${adminUser.full_name} (${adminUser.email}) - Chat ID: ${chatId}`);
    }

    if (!user) {
      const allUsers = Array.from(serverStore.users.values());
      const candidateUser = allUsers.find((u) => u.telegram_bot_token === botToken) || allUsers[0];
      if (candidateUser) {
        candidateUser.telegram_chat_id = chatId;
        candidateUser.telegram_connected = true;
        if (message.from?.username) candidateUser.telegram_username = message.from.username;
        user = candidateUser;
        console.log(`[Telegram Handler] 🔗 Auto-linked chat_id ${chatId} ke akun TataDana: ${user.full_name} (${user.id})`);
      }
    }

    // If user is still not connected
    if (!user) {
      await sendTelegramMessage(
        botToken,
        chatId,
        `👋 *Halo, pencatatan transaksi TataDana aktif!*\n\nAkun Telegram kamu belum terhubung dengan TataDana.\nHubungkan akunmu dengan cara ketik:\n👉 \`/link <nomor_hp_kamu>\`\n(Contoh: \`/link 081234567890\`)\n\nAtau buka menu Pengaturan -> Telegram Bot di dashboard TataDana.`
      );
      return { success: true, status: 'user_not_connected' };
    }

    let userWallets = serverStore.getWallets(user.id);
    if (!userWallets || userWallets.length === 0) {
      const isSuper = user.role === 'superadmin';
      const fallbackWallet: Wallet = {
        id: isSuper ? 'wal_admin_1' : `wal_${user.id}_def`,
        user_id: user.id,
        name: isSuper ? 'Rekening Operasional Admin' : 'Dompet Utama',
        type: 'bank',
        balance: isSuper ? 50000000 : 1000000,
        is_default: true,
        color: isSuper ? '#4f46e5' : '#0284c7',
        icon: isSuper ? 'shield' : 'wallet',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      serverStore.wallets.set(user.id, [fallbackWallet]);
      userWallets = [fallbackWallet];
    }

    const defaultWallet = serverStore.getDefaultWallet(user.id) || userWallets[0];
    const userTransactions = serverStore.getTransactions(user.id) || [];
    const currentMonthTransactions = userTransactions.filter((t) => t.transaction_date?.startsWith(getCurrentMonthPeriodWIB()));

  // 4. Handle Text Messages & Bot Commands
  if (message.text) {
    const text = message.text.trim();
    const lower = text.toLowerCase();

    // Sapaan ramah umum (Greeting handler)
    const greetings = ['halo', 'hai', 'hello', 'tes', 'test', 'ping', 'p', 'pagi', 'siang', 'sore', 'malam', 'assalamualaikum'];
    if (greetings.includes(lower) || lower.startsWith('halo ') || lower.startsWith('hai ') || lower === 'tes bot' || lower === 'test bot') {
      const greetReply = `Halo, pencatatan transaksi TataDana aktif! 🚀\n\nSilakan kirim catatan pengeluaran atau pemasukanmu (contoh: "makan siang 35rb" atau "gajian 5jt") untuk langsung mencatatnya ke dompet kamu.\n\nKetik /saldo untuk cek saldo atau /bantuan untuk melihat daftar perintah.`;
      await sendTelegramMessage(botToken, chatId, greetReply);
      return { success: true, status: 'handled_greeting' };
    }

    // Check if user is responding to pending payment
    const pendingPurchase = serverStore.getPendingPurchase(user.id);
    const cleanInput = lower.trim();

    if (pendingPurchase) {
      let targetWallet: any = undefined;
      let methodLabel = '';

      // Check number (1, 2, 3...)
      const numMatch = cleanInput.match(/^([1-9]\d*)\.?$/);
      if (numMatch) {
        const idx = parseInt(numMatch[1], 10) - 1;
        if (idx >= 0 && idx < userWallets.length) {
          targetWallet = userWallets[idx];
          methodLabel = targetWallet.name;
        }
      }

      // Check if text matches wallet name
      if (!targetWallet) {
        targetWallet = userWallets.find(
          (w) => cleanInput.includes(w.name.toLowerCase()) || w.name.toLowerCase().includes(cleanInput)
        );
        if (targetWallet) methodLabel = targetWallet.name;
      }

      // Check cash / tunai keywords
      if (!targetWallet && (cleanInput.includes('tunai') || cleanInput.includes('cash') || cleanInput.includes('manual'))) {
        targetWallet = userWallets.find((w) => w.type === 'cash' || /tunai|cash|kas/i.test(w.name));
        if (targetWallet) methodLabel = targetWallet.name;
      }

      // Check if user explicitly replied "1" or "saldo"
      if (!targetWallet && (cleanInput === '1' || cleanInput === '1.' || cleanInput.includes('saldo'))) {
        targetWallet = userWallets[0];
        if (targetWallet) methodLabel = targetWallet.name;
      }

      if (!targetWallet) {
        const optionsList = userWallets.map((w, idx) => `${idx + 1}. *${w.name}* (${formatRupiah(w.balance)})`).join('\n');
        await sendTelegramMessage(
          botToken,
          chatId,
          `⚠️ Pilihan dompet "${text}" belum cocok dengan daftar dompet aktifmu.\n\nKetik nomor atau nama dompet berikut:\n${optionsList}`
        );
        return { success: true, status: 'awaiting_valid_wallet' };
      }

      if (targetWallet) {
        const isIncome = pendingPurchase.type === 'income';
        const userCategories = serverStore.getCategories(user.id);
        const cat =
          userCategories.find((c) => c.name.toLowerCase() === pendingPurchase.tatadanaCategoryName.toLowerCase()) ||
          userCategories.find((c) => c.type === (isIncome ? 'income' : 'expense')) ||
          userCategories[0];

        serverStore.addTransaction({
          user_id: user.id,
          wallet_id: targetWallet.id,
          wallet_name: targetWallet.name,
          category_id: cat.id,
          category_name: cat.name,
          category_emoji: cat.emoji || (isIncome ? '💰' : '🏷️'),
          type: isIncome ? 'income' : 'expense',
          amount: pendingPurchase.amount,
          notes: isIncome
            ? `${pendingPurchase.item} (masuk ke ${methodLabel})`
            : `${pendingPurchase.item} (via ${methodLabel})`,
          source: 'telegram_text',
          telegram_message_id: message.message_id,
          transaction_date: new Date().toISOString(),
        });

        serverStore.clearPendingPurchase(user.id);
        const refreshedWallet = serverStore.getWallets(user.id).find((w) => w.id === targetWallet.id) || targetWallet;

        const replySuccess = isIncome
          ? `🎉 *Pemasukan Berhasil Dicatat!*
Sumber: *${pendingPurchase.item}*
Nominal: *${formatRupiah(pendingPurchase.amount)}*
Tujuan: *${methodLabel}*
Dompet: 👛 ${refreshedWallet.name} (Saldo Baru: ${formatRupiah(refreshedWallet.balance)})

Pemasukan telah otomatis dicatat ke akun TataDana kamu.`
          : `✅ *Pembayaran Berhasil!*
Pesanan: *${pendingPurchase.item}*
Nominal: *${formatRupiah(pendingPurchase.amount)}*
Metode: *${methodLabel}*
Dompet: 👛 ${refreshedWallet.name} (Sisa: ${formatRupiah(refreshedWallet.balance)})

Transaksi telah otomatis dicatat ke akun TataDana kamu.`;

        await sendTelegramMessage(botToken, chatId, replySuccess);
        return { success: true, status: 'handled_pending_purchase' };
      }
    }

    const isAdmin =
      user.role === 'superadmin' ||
      user.role === 'admin' ||
      user.email === 'ferdiansyahr213@gmail.com' ||
      user.email === 'ferdiansyahrz13@gmail.com' ||
      user.id === 'usr_admin_999';

    // ==========================================
    // 👑 PANEL ADMIN & ADMIN COMMAND HANDLERS
    // ==========================================
    if (
      lower === '/admin' ||
      lower === '/panel_admin' ||
      lower === '/superadmin' ||
      lower === 'menu admin' ||
      lower === 'panel admin'
    ) {
      if (!isAdmin) {
        await sendTelegramMessage(
          botToken,
          chatId,
          `⛔ *Akses Ditolak*\n\nPerintah ini khusus untuk Administrator TataDana. Akun kamu (*${user.full_name}*) tidak memiliki hak akses Superadmin.`
        );
        return { success: true, status: 'admin_forbidden' };
      }

      const allUsers = Array.from(serverStore.users.values());
      const pendingUsers = allUsers.filter((u) => u.verification_status === 'pending');
      const pendingPayments = serverStore.payments.filter((p) => p.status === 'pending');
      const adminWallets = serverStore.getWallets(user.id);
      const operationalBalance = adminWallets.reduce((s, w) => s + w.balance, 0);

      const reply = `👑 *PANEL KONTROL ADMINISTRATOR TATADANA*
━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *Administrator*: ${user.full_name}
📧 *Email*: \`${user.email}\`
🏦 *Kas Operasional*: *${formatRupiah(operationalBalance)}*

📊 *Ringkasan Sistem:*
• Total Pengguna: *${allUsers.length}* pengguna
• Antrean Persetujuan User: *${pendingUsers.length}* menunggu
• Antrean Pembayaran Pro: *${pendingPayments.length}* invoice pending

⚡ *Menu Perintah Admin:*
👉 /approvals — Lihat pendaftar baru yang menunggu persetujuan
👉 /approve <id_user> — Setujui akun pengguna tertentu
👉 /approve_all — Setujui semua pendaftar baru sekaligus
👉 /pembayaran — Lihat antrean konfirmasi pembayaran Pro
👉 /approve_pro <id_pay> — Konfirmasi & aktifkan paket Pro
👉 /users — Daftar seluruh pengguna TataDana
👉 /saldo_admin — Rincian rekening kas operasional
👉 /stats — Statistik platform & volume transaksi

💡 *Mencatat Pengeluaran/Kas Admin*:
Ketik langsung pengeluaran operasional (contoh: \`beli hosting 150rb\` atau \`gajian freelance 2jt\`) untuk memotong kas operasional.`;

      await sendTelegramMessage(botToken, chatId, reply);
      return { success: true, status: 'handled_admin_panel' };
    }

    if (
      lower === '/approvals' ||
      lower === '/persetujuan' ||
      lower === '/antrean_user' ||
      lower === 'cek approval' ||
      lower === 'persetujuan user' ||
      lower === 'approval user'
    ) {
      if (!isAdmin) {
        await sendTelegramMessage(botToken, chatId, `⛔ Akses khusus Administrator TataDana.`);
        return { success: true, status: 'admin_forbidden' };
      }

      const allUsers = Array.from(serverStore.users.values());
      const pendingUsers = allUsers.filter((u) => u.verification_status === 'pending');

      if (pendingUsers.length === 0) {
        await sendTelegramMessage(
          botToken,
          chatId,
          `✅ *Tidak Ada Antrean Persetujuan Pengguna*\n\nSemua pendaftar baru telah diverifikasi.\n\nKetik /admin untuk kembali ke Panel Admin.`
        );
        return { success: true, status: 'handled_approvals_empty' };
      }

      let listText = `⏳ *Antrean Persetujuan Pengguna Baru (${pendingUsers.length}):*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      pendingUsers.forEach((pu, idx) => {
        listText += `${idx + 1}. *${pu.full_name}*\n   • ID: \`${pu.id}\`\n   • Email: \`${pu.email}\`\n   • No HP: \`${pu.phone_number || '-'}\`\n   • Paket: *${pu.plan.toUpperCase()}*\n   👉 Setujui: \`/approve ${pu.id}\`\n\n`;
      });
      listText += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n💡 Ketik \`/approve_all\` untuk menyetujui seluruh pendaftar di atas sekaligus.`;

      await sendTelegramMessage(botToken, chatId, listText);
      return { success: true, status: 'handled_approvals_list' };
    }

    if (lower.startsWith('/approve ') && !lower.startsWith('/approve_pro') && !lower.startsWith('/approve_all')) {
      if (!isAdmin) {
        await sendTelegramMessage(botToken, chatId, `⛔ Akses khusus Administrator TataDana.`);
        return { success: true, status: 'admin_forbidden' };
      }

      const targetId = text.replace(/^\/approve\s+/i, '').trim();
      const allUsers = Array.from(serverStore.users.values());
      const targetUser =
        serverStore.users.get(targetId) ||
        allUsers.find(
          (u) =>
            u.id === targetId ||
            u.email?.toLowerCase() === targetId.toLowerCase() ||
            u.phone_number?.replace(/\D/g, '') === targetId.replace(/\D/g, '')
        );

      if (!targetUser) {
        await sendTelegramMessage(
          botToken,
          chatId,
          `❌ Pengguna dengan ID atau email \`${targetId}\` tidak ditemukan.\n\nKetik /approvals untuk melihat daftar ID yang valid.`
        );
        return { success: true, status: 'approve_user_not_found' };
      }

      targetUser.verification_status = 'verified';
      targetUser.updated_at = new Date().toISOString();

      await sendTelegramMessage(
        botToken,
        chatId,
        `✅ *Pengguna Berhasil Disetujui!* 🎉\n\n• Nama: *${targetUser.full_name}*\n• Email: \`${targetUser.email}\`\n• Status: *VERIFIED (Aktif)*\n• Paket: *${targetUser.plan.toUpperCase()}*\n\nAkun pengguna telah aktif dan siap mencatat transaksi di TataDana.`
      );
      return { success: true, status: 'handled_approve_user' };
    }

    if (lower === '/approve_all' || lower === '/setujui_semua') {
      if (!isAdmin) {
        await sendTelegramMessage(botToken, chatId, `⛔ Akses khusus Administrator TataDana.`);
        return { success: true, status: 'admin_forbidden' };
      }

      const allUsers = Array.from(serverStore.users.values());
      const pendingUsers = allUsers.filter((u) => u.verification_status === 'pending');

      if (pendingUsers.length === 0) {
        await sendTelegramMessage(botToken, chatId, `ℹ️ Tidak ada antrean pengguna pending untuk disetujui.`);
        return { success: true, status: 'handled_approve_all_none' };
      }

      pendingUsers.forEach((u) => {
        u.verification_status = 'verified';
        u.updated_at = new Date().toISOString();
      });

      await sendTelegramMessage(
        botToken,
        chatId,
        `🎉 *Berhasil Menyetujui ${pendingUsers.length} Pengguna Baru!*\n\nSemua akun dalam antrean sekarang berstatus *VERIFIED* dan aktif.`
      );
      return { success: true, status: 'handled_approve_all' };
    }

    if (
      lower === '/pembayaran' ||
      lower === '/pro_queue' ||
      lower === '/persetujuan_pro' ||
      lower === 'cek pembayaran' ||
      lower === 'persetujuan pro' ||
      lower === 'approval pro'
    ) {
      if (!isAdmin) {
        await sendTelegramMessage(botToken, chatId, `⛔ Akses khusus Administrator TataDana.`);
        return { success: true, status: 'admin_forbidden' };
      }

      const pendingPayments = serverStore.payments.filter((p) => p.status === 'pending');

      if (pendingPayments.length === 0) {
        await sendTelegramMessage(
          botToken,
          chatId,
          `✅ *Tidak Ada Antrean Pembayaran Pro*\n\nSemua transaksi pembayaran telah diproses.`
        );
        return { success: true, status: 'handled_payments_empty' };
      }

      let listText = `💳 *Antrean Verifikasi Pembayaran Pro (${pendingPayments.length}):*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      pendingPayments.forEach((p, idx) => {
        listText += `${idx + 1}. *${p.user_name}*\n   • ID Tagihan: \`${p.id}\`\n   • Nominal: *${formatRupiah(p.amount)}*\n   • Metode: *${p.payment_method.toUpperCase()}*\n   • Paket: *${p.plan.toUpperCase()}*\n   👉 Verifikasi: \`/approve_pro ${p.id}\`\n\n`;
      });

      await sendTelegramMessage(botToken, chatId, listText);
      return { success: true, status: 'handled_payments_list' };
    }

    if (lower.startsWith('/approve_pro ')) {
      if (!isAdmin) {
        await sendTelegramMessage(botToken, chatId, `⛔ Akses khusus Administrator TataDana.`);
        return { success: true, status: 'admin_forbidden' };
      }

      const payId = text.replace(/^\/approve_pro\s+/i, '').trim();
      const payment = serverStore.payments.find((p) => p.id === payId);

      if (!payment) {
        await sendTelegramMessage(
          botToken,
          chatId,
          `❌ Tagihan pembayaran dengan ID \`${payId}\` tidak ditemukan.\n\nKetik /pembayaran untuk melihat daftar tagihan pending.`
        );
        return { success: true, status: 'payment_not_found' };
      }

      payment.status = 'success';
      payment.updated_at = new Date().toISOString();

      // Upgrade user plan to pro
      const targetUser =
        serverStore.users.get(payment.user_id) ||
        Array.from(serverStore.users.values()).find((u) => u.full_name === payment.user_name);
      if (targetUser) {
        targetUser.plan = 'pro';
        targetUser.updated_at = new Date().toISOString();
      }

      await sendTelegramMessage(
        botToken,
        chatId,
        `🎉 *Pembayaran Pro Berhasil Diverifikasi!* ✅\n\n• ID: \`${payment.id}\`\n• Pengguna: *${payment.user_name}*\n• Nominal: *${formatRupiah(payment.amount)}*\n• Status Baru: *SUCCESS*\n• Paket Akun: *PRO (Unlimited)*`
      );
      return { success: true, status: 'handled_approve_pro' };
    }

    if (
      lower === '/users' ||
      lower === '/kelola_user' ||
      lower === '/daftar_user' ||
      lower === 'kelola user' ||
      lower === 'daftar user' ||
      lower === 'cek user'
    ) {
      if (!isAdmin) {
        await sendTelegramMessage(botToken, chatId, `⛔ Akses khusus Administrator TataDana.`);
        return { success: true, status: 'admin_forbidden' };
      }

      const allUsers = Array.from(serverStore.users.values());
      let userText = `👥 *Daftar Pengguna TataDana (${allUsers.length}):*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      allUsers.forEach((u, idx) => {
        const statusEmoji = u.verification_status === 'verified' ? '🟢' : '🟡';
        const planEmoji = u.plan === 'pro' ? '💎' : '🌱';
        userText += `${idx + 1}. *${u.full_name}* ${u.role === 'superadmin' ? '👑' : ''}\n   • Email: \`${u.email}\`\n   • HP: \`${u.phone_number || '-'}\`\n   • Status: ${statusEmoji} ${u.verification_status}\n   • Plan: ${planEmoji} ${u.plan}\n\n`;
      });
      userText += `━━━━━━━━━━━━━━━━━━━━━━━━━━\nKetik /admin untuk kembali ke Panel Admin.`;

      await sendTelegramMessage(botToken, chatId, userText);
      return { success: true, status: 'handled_users_list' };
    }

    if (
      lower === '/saldo_admin' ||
      lower === '/rekening_admin' ||
      lower === 'saldo admin' ||
      lower === 'saldo operasional' ||
      lower === 'kas operasional'
    ) {
      if (!isAdmin) {
        await sendTelegramMessage(botToken, chatId, `⛔ Akses khusus Administrator TataDana.`);
        return { success: true, status: 'admin_forbidden' };
      }

      const adminWallets = serverStore.getWallets(user.id);
      const totalBalance = adminWallets.reduce((s, w) => s + w.balance, 0);

      let walletDetails = '';
      adminWallets.forEach((w) => {
        walletDetails += `• 👛 *${w.name}*: *${formatRupiah(w.balance)}*\n  (ID: \`${w.id}\` | Tipe: ${w.type})\n`;
      });

      const reply = `🏦 *Rekening Operasional Administrator TataDana*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n💰 *Total Saldo Kas Admin*: *${formatRupiah(totalBalance)}*\n\nRincian Dompet:\n${walletDetails || '• Rekening Operasional: ' + formatRupiah(50000000)}\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n💡 Catatan pengeluaran operasional yang Anda kirimkan ke bot akan memotong kas ini.`;

      await sendTelegramMessage(botToken, chatId, reply);
      return { success: true, status: 'handled_saldo_admin' };
    }

    if (
      lower === '/stats' ||
      lower === '/ringkasan_admin' ||
      lower === '/overview' ||
      lower === 'stats admin'
    ) {
      if (!isAdmin) {
        await sendTelegramMessage(botToken, chatId, `⛔ Akses khusus Administrator TataDana.`);
        return { success: true, status: 'admin_forbidden' };
      }

      const allUsers = Array.from(serverStore.users.values());
      const pendingUsers = allUsers.filter((u) => u.verification_status === 'pending').length;
      const verifiedUsers = allUsers.filter((u) => u.verification_status === 'verified').length;
      const proUsers = allUsers.filter((u) => u.plan === 'pro').length;

      let totalTxCount = 0;
      let totalTxVolume = 0;
      for (const txList of serverStore.transactions.values()) {
        totalTxCount += txList.length;
        txList.forEach((t) => (totalTxVolume += t.amount));
      }

      const pendingPayments = serverStore.payments.filter((p) => p.status === 'pending').length;
      const adminBalance = serverStore.getWallets(user.id).reduce((s, w) => s + w.balance, 0);

      const reply = `📊 *Statistik Sistem TataDana*
━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 *Metrik Pengguna:*
• Total Akun: *${allUsers.length}*
• Terverifikasi: *${verifiedUsers}*
• Menunggu Persetujuan: *${pendingUsers}*
• Pengguna Pro: *${proUsers}*

💳 *Metrik Pembayaran & Transaksi:*
• Total Transaksi Dicatat: *${totalTxCount}* kali
• Total Perputaran Uang: *${formatRupiah(totalTxVolume)}*
• Antrean Pembayaran Pro: *${pendingPayments}* pending

🏦 *Keuangan Operasional Admin:*
• Saldo Kas Operasional: *${formatRupiah(adminBalance)}*
• Status Backend: 🟢 Normal (Asia/Jakarta WIB)
━━━━━━━━━━━━━━━━━━━━━━━━━━
Ketik /admin untuk membuka Panel Kontrol Admin.`;

      await sendTelegramMessage(botToken, chatId, reply);
      return { success: true, status: 'handled_stats' };
    }

    // Check commands
    if (lower === '/start') {
      const adminBalance = userWallets.reduce((s, w) => s + w.balance, 0) || 50000000;
      const adminHeader = isAdmin
        ? `👑 *Halo Administrator TataDana!* (@${message.from?.username || 'admin'})\nAkun Admin terhubung: \`${user.email}\`\nSaldo Operasional: *${formatRupiah(adminBalance)}*\n\n`
        : '';

      const adminCommandsNotice = isAdmin
        ? `\n\n👑 *Perintah Khusus Superadmin:*\n• /admin — Buka Panel Kontrol Admin\n• /approvals — Persetujuan pendaftar baru\n• /pembayaran — Antrean pembayaran Pro\n• /users — Kelola pengguna terdaftar\n• /saldo_admin — Rekening kas operasional\n• /stats — Statistik lengkap sistem`
        : '';

      const welcomeMsg = `👋 *Halo, pencatatan transaksi TataDana aktif!* 🚀\n\n${adminHeader}Selamat datang di *TataDana Bot*, asisten keuangan cerdasmu.\nCatat pemasukan dan pengeluaran semudah kirim pesan chat.\n\n📝 *Contoh Catat Transaksi Cepat:*\n• \`beli kopi 18rb\`\n• \`makan siang padang 25rb\`\n• \`gajian freelance 2.5jt\`\n• \`bensin motor 30k\`\n\n⚡ *Menu & Perintah:*\n/saldo — Cek saldo semua dompet (Rp50.000.000)\n/budget — Cek sisa anggaran belanja\n/hari_ini — Rekap transaksi hari ini\n/bulan_ini — Rekap pengeluaran bulan ini\n/bantuan — Panduan lengkap fitur bot${adminCommandsNotice}\n\nKetik transaksi pertamamu sekarang!`;
      await sendTelegramMessage(botToken, chatId, welcomeMsg);
      return { success: true, status: 'handled_start' };
    }

    if (lower === '/bantuan' || lower.startsWith('/help')) {
      let helpText = formatHelpReply();
      if (isAdmin) {
        helpText += `\n\n👑 *Panel Administrator TataDana:*\n• /admin — Panel Kontrol Superadmin\n• /approvals — Antrean persetujuan pendaftar\n• /approve <id> — Setujui pengguna baru\n• /approve_all — Setujui semua pendaftar\n• /pembayaran — Antrean pembayaran Pro\n• /approve_pro <id> — Setujui pembayaran Pro\n• /users — Daftar seluruh pengguna\n• /saldo_admin — Saldo kas operasional\n• /stats — Statistik platform`;
      }
      await sendTelegramMessage(botToken, chatId, helpText);
      return { success: true, status: 'handled_help' };
    }

    if (lower === '/saldo') {
      await sendTelegramMessage(botToken, chatId, formatSaldoReply(userWallets));
      return { success: true, status: 'handled_saldo' };
    }

    if (lower === '/budget') {
      const budgets = serverStore.getBudgets(user.id);
      await sendTelegramMessage(botToken, chatId, formatBudgetListReply(budgets));
      return { success: true, status: 'handled_budget' };
    }

    if (lower === '/kalender' || lower === '/calendar') {
      await sendTelegramMessage(botToken, chatId, formatCalendarReply(userTransactions, user));
      return { success: true, status: 'handled_kalender' };
    }

    if (lower === '/tataai' || lower.startsWith('/tataai ') || lower === '/ai' || lower.startsWith('/ai ')) {
      const prompt = text.replace(/^\/(?:tataai|ai)\s*/i, '').trim();

      // Check if prompt is a purchase/order intent
      if (prompt) {
        const purchaseIntent = parsePurchaseIntent(prompt, userWallets);
        if (purchaseIntent) {
          serverStore.setPendingPurchase(user.id, {
            item: purchaseIntent.item_name,
            amount: purchaseIntent.amount,
            category: purchaseIntent.category,
            tatadanaCategoryName: purchaseIntent.tatadanaCategoryName,
          });

          await sendTelegramMessage(botToken, chatId, sanitizeTelegramMessageText(purchaseIntent.replyText));
          return { success: true, status: 'handled_tataai_purchase_intent' };
        }
      }

      let aiResponse = '';

      const totalBalance = userWallets.reduce((s, w) => s + w.balance, 0);
      const totalExpense = currentMonthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const totalIncome = currentMonthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const ratio = totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : 0;

      if (!prompt) {
        aiResponse = `🤖 *Tata AI Bot Financial Assistant*\n\nHalo *${user.full_name}*! Berikut ringkasan finansialmu saat ini:\n\n• Saldo Total: ${formatRupiah(totalBalance)}\n• Pemasukan Bulan Ini: ${formatRupiah(totalIncome)}\n• Pengeluaran Bulan Ini: ${formatRupiah(totalExpense)} (${ratio}% dari pemasukan)\n\n💡 *Tips*: Kamu bisa berkonsultasi langsung dengan mengetik:\n👉 \`/tataai apakah keuangan saya aman?\`\n👉 \`/tataai tips hemat kategori makanan\`\n👉 \`/tataai simulasi tabungan motor 20jt\``;
      } else {
        const pLower = prompt.toLowerCase();
        if (pLower.includes('aman') || pLower.includes('boros') || pLower.includes('analisis') || pLower.includes('evaluasi')) {
          aiResponse = `🤖 *Analisis Tata AI*:\n\nRasio pengeluaranmu bulan ini adalah *${ratio}%* dari total pemasukan (${formatRupiah(totalExpense)} dari ${formatRupiah(totalIncome)}).\n\n${
            ratio > 80
              ? '⚠️ *Status*: Waspada! Pengeluaranmu sudah mendekati 80%. Kurangi belanja sekunder sampai tanggal gajian.'
              : '✅ *Status*: Keuanganmu dalam kondisi aman (<70%). Pertahankan konsistensi pencatatanmu!'
          }\n\n💡 *Saran*: Alokasikan minimal 20% pemasukan (${formatRupiah(Math.round(totalIncome * 0.2))}) ke tabungan darurat.`;
        } else if (pLower.includes('tips') || pLower.includes('makan') || pLower.includes('hemat')) {
          aiResponse = `🤖 *Tips Finansial dari Tata AI*:\n\n1. Batasi pesanan makanan online maksimal 2-3 kali seminggu.\n2. Alihkan pembelian kopi harian ke seduh mandiri untuk hemat hingga Rp400rb/bulan.\n3. Jangan lupa selalu catat pengeluaran kecil (parkir, air galon, cemilan) langsung lewat bot ini!`;
        } else if (pLower.includes('tabung') || pLower.includes('simulasi') || pLower.includes('beli') || pLower.includes('target')) {
          aiResponse = `🤖 *Simulasi Target Finansial Tata AI*:\n\nUntuk mencapai impianmu:\n1. Hitung total target biaya dibagi jumlah bulan target.\n2. Sisihkan otomatis di awal bulan (pay yourself first) ke dompet rekening tabungan terpisah.\n3. Evaluasi mutasi setiap minggu melalui perintah /minggu_ini di bot ini!`;
        } else {
          aiResponse = `🤖 *Tata AI*: Terima kasih atas pertanyaannya!\n\nBerdasarkan data keuanganmu di TataDana, kamu memiliki ${userWallets.length} dompet dengan saldo total ${formatRupiah(totalBalance)}. Kunci stabilitas finansial adalah memastikan pengeluaran operasional di bawah 70% dari pemasukan dan rutin mencatat setiap transaksi.\n\nKetik transaksi baru kapan saja untuk mulai mencatat!`;
        }
      }

      await sendTelegramMessage(botToken, chatId, aiResponse);
      return { success: true, status: 'handled_tataai' };
    }

    if (lower === '/hari ini' || lower === '/hari_ini' || lower === '/hariini') {
      const todayPrefix = new Date().toISOString().split('T')[0];
      const todayTx = userTransactions.filter(t => (t.transaction_date || '').startsWith(todayPrefix));
      let expense = 0;
      let income = 0;
      todayTx.forEach(t => {
        if (t.type === 'expense') expense += t.amount;
        if (t.type === 'income') income += t.amount;
      });

      const reply = `📅 Rekap Transaksi Hari Ini:\n\n💸 Total Pengeluaran: ${formatRupiah(expense)}\n💰 Total Pemasukan: ${formatRupiah(income)}\n📊 Jumlah Transaksi: ${todayTx.length} kali`;
      await sendTelegramMessage(botToken, chatId, reply);
      return { success: true, status: 'handled_today' };
    }

    if (lower === '/minggu ini' || lower === '/minggu_ini' || lower === '/mingguini') {
      const sevenDaysAgo = Date.now() - 7 * 86400000;
      const weekTx = userTransactions.filter(t => new Date(t.transaction_date || 0).getTime() >= sevenDaysAgo);
      let expense = 0;
      let income = 0;
      weekTx.forEach(t => {
        if (t.type === 'expense') expense += t.amount;
        if (t.type === 'income') income += t.amount;
      });

      const reply = `📅 Rekap 7 Hari Terakhir:\n\n💸 Pengeluaran: ${formatRupiah(expense)}\n💰 Pemasukan: ${formatRupiah(income)}\n📊 Transaksi: ${weekTx.length} kali`;
      await sendTelegramMessage(botToken, chatId, reply);
      return { success: true, status: 'handled_week' };
    }

    if (lower === '/bulan ini' || lower === '/bulan_ini' || lower === '/bulanini') {
      let expense = 0;
      let income = 0;
      const catMap = new Map<string, number>();

      currentMonthTransactions.forEach(t => {
        if (t.type === 'expense') {
          expense += t.amount;
          const cat = t.category_name || 'Lainnya';
          catMap.set(cat, (catMap.get(cat) || 0) + t.amount);
        }
        if (t.type === 'income') income += t.amount;
      });

      let breakdown = '';
      catMap.forEach((amt, name) => {
        breakdown += `• ${name}: ${formatRupiah(amt)}\n`;
      });

      const reply = `📊 Rekap Bulan Ini (${getCurrentMonthPeriodWIB()}):\n\n💸 Total Pengeluaran: ${formatRupiah(expense)}\n💰 Total Pemasukan: ${formatRupiah(income)}\n\nKategori Pengeluaran:\n${breakdown || 'Belum ada pengeluaran'}`;
      await sendTelegramMessage(botToken, chatId, reply);
      return { success: true, status: 'handled_month' };
    }

    if (lower === '/sheet') {
      await sendTelegramMessage(
        botToken,
        chatId,
        `📊 Dashboard & Laporan Keuangan Kamu:\n\nBuka laporan lengkap, grafik, dan export PDF/Excel di:\nhttps://tatadana.id/dashboard/reports`
      );
      return { success: true, status: 'handled_sheet' };
    }

    // Natural Language Input: Check Monthly Limit first (Exempt Superadmin & Admin)
    if (user.role !== 'superadmin' && user.role !== 'admin' && user.id !== 'usr_admin_999') {
      const limitCheck = canAddTransaction(user.plan, currentMonthTransactions.length);
      if (!limitCheck.allowed) {
        await sendTelegramMessage(botToken, chatId, formatStarterLimitReply(50));
        return { success: true, status: 'limit_reached' };
      }
    }

    // Check for income intent flow (e.g. "gajian 5jt", "bonus 2jt", "terima transfer 500k")
    const incomeIntent = parseIncomeIntent(text, userWallets);
    if (incomeIntent) {
      serverStore.setPendingPurchase(user.id, {
        item: incomeIntent.title,
        amount: incomeIntent.amount,
        category: incomeIntent.category,
        tatadanaCategoryName: incomeIntent.category,
        type: 'income',
      });

      await sendTelegramMessage(botToken, chatId, sanitizeTelegramMessageText(incomeIntent.replyText));
      return { success: true, status: 'handled_income_intent' };
    }

    // Check for purchase intent flow (e.g. "cilok 2rb", "kopi susu 15k", "pulsa 50rb")
    const purchaseIntent = parsePurchaseIntent(text, userWallets);
    if (purchaseIntent) {
      serverStore.setPendingPurchase(user.id, {
        item: purchaseIntent.item_name,
        amount: purchaseIntent.amount,
        category: purchaseIntent.category,
        tatadanaCategoryName: purchaseIntent.tatadanaCategoryName,
      });

      await sendTelegramMessage(botToken, chatId, sanitizeTelegramMessageText(purchaseIntent.replyText));
      return { success: true, status: 'handled_purchase_intent' };
    }

    // Parse natural language
    const parsed = await parseTransactionWithAI(text, user.id);
    if (!parsed) {
      const fallbackReply = `Halo, pencatatan transaksi TataDana aktif! 👋\n\nPesan "${text}" belum memuat nominal transaksi yang jelas.\n\n💡 *Tips Mencatat Cepat:*\n• Pengeluaran: \`kopi 20rb\` atau \`makan siang 35.000\`\n• Pemasukan: \`gajian 5jt\` atau \`freelance 500k\`\n\nKetik /saldo untuk melihat saldo saat ini atau /bantuan untuk panduan lengkap.`;
      await sendTelegramMessage(botToken, chatId, fallbackReply);
      return { success: true, status: 'unparsed' };
    }

    // Handle Transfer between wallets
    if (parsed.jenis === 'transfer') {
      let destWallet = userWallets.find(w => w.id !== defaultWallet.id && (parsed.destWalletName ? w.name.toLowerCase().includes(parsed.destWalletName.toLowerCase()) : true));
      if (!destWallet && userWallets.length > 1) {
        destWallet = userWallets.find(w => w.id !== defaultWallet.id);
      }

      if (destWallet) {
        serverStore.addTransaction({
          user_id: user.id,
          wallet_id: defaultWallet.id,
          wallet_name: defaultWallet.name,
          destination_wallet_id: destWallet.id,
          destination_wallet_name: destWallet.name,
          type: 'transfer',
          amount: parsed.nominal,
          notes: parsed.catatan || `Transfer ke ${destWallet.name}`,
          source: 'telegram_text',
          telegram_message_id: message.message_id,
          transaction_date: new Date().toISOString(),
        });

        const refreshedDef = serverStore.getWallets(user.id).find(w => w.id === defaultWallet.id) || defaultWallet;
        const refreshedDst = serverStore.getWallets(user.id).find(w => w.id === destWallet.id) || destWallet;
        const reply = `📅 ${formatWIBDateTime()}
🔄 Transfer antar dompet berhasil!
├ Dari : 👛 ${defaultWallet.name} (Sisa: ${formatRupiah(refreshedDef.balance)})
├ Ke : 👛 ${destWallet.name} (Saldo: ${formatRupiah(refreshedDst.balance)})
└ Nominal : ${formatRupiah(parsed.nominal)}`;

        await sendTelegramMessage(botToken, chatId, reply);
        return { success: true, status: 'processed_transfer' };
      }
    }

    // Resolve Category
    const userCategories = serverStore.getCategories(user.id);
    let category = userCategories.find(c => c.name.toLowerCase() === parsed.kategori.toLowerCase());
    if (!category) {
      category = userCategories.find(c => c.type === (parsed.jenis === 'pengeluaran' ? 'expense' : 'income')) || userCategories[0];
    }

    // Insert Transaction & Check Budget Alerts
    const { transaction: newTx, budgetAlert } = serverStore.addTransaction({
      user_id: user.id,
      wallet_id: defaultWallet.id,
      wallet_name: defaultWallet.name,
      category_id: category.id,
      category_name: category.name,
      category_emoji: category.emoji,
      type: parsed.jenis === 'pengeluaran' ? 'expense' : 'income',
      amount: parsed.nominal,
      notes: parsed.catatan || text,
      source: 'telegram_text',
      telegram_message_id: message.message_id,
      transaction_date: new Date().toISOString(),
    });

    // Refresh wallet and budget
    const refreshedWallet = serverStore.getWallets(user.id).find(w => w.id === defaultWallet.id) || defaultWallet;
    const userBudgets = serverStore.getBudgets(user.id);
    const categoryBudget = userBudgets.find(b => b.category_id === category?.id);

    // Format & Send Reply
    let replyMessage = '';
    if (parsed.jenis === 'pengeluaran') {
      replyMessage = formatExpenseReply({
        amount: parsed.nominal,
        category: category,
        wallet: refreshedWallet,
        notes: parsed.catatan || text,
        remainingBalance: refreshedWallet.balance,
        budget: categoryBudget,
      });
    } else {
      replyMessage = formatIncomeReply({
        amount: parsed.nominal,
        wallet: refreshedWallet,
        categoryName: category.name,
      });
    }

    await sendTelegramMessage(botToken, chatId, replyMessage);

    // Automatic Budget Alert Thresholds (Part 3)
    if (budgetAlert) {
      if (budgetAlert.is100) {
        await sendTelegramMessage(
          botToken,
          chatId,
          `🚨 *ALERT BUDGET 100%!*\n\nPengeluaran untuk kategori *${category.name}* telah mencapai 100% (${budgetAlert.percent}%) dari budget bulanan!\n💰 Terpakai: ${formatRupiah(budgetAlert.budget.spent)} / ${formatRupiah(budgetAlert.budget.amount)}\n⚠️ Rem dulu belanja kategori ini ya!`
        );
      } else if (budgetAlert.is80) {
        await sendTelegramMessage(
          botToken,
          chatId,
          `⚡ *ALERT BUDGET 80%!*\n\nPengeluaran kategori *${category.name}* sudah mencapai 80% (${budgetAlert.percent}%) dari budget bulanan!\n💰 Terpakai: ${formatRupiah(budgetAlert.budget.spent)} / ${formatRupiah(budgetAlert.budget.amount)}\n💡 Tetap kendalikan pengeluaranmu ya!`
        );
      }
    }

    // AI Financial Advisor Pro check (all 3 triggers per Part 4.7)
    if (parsed.jenis === 'pengeluaran') {
      const advisorMessage = evaluateFinancialAdvisorTriggers(user, category, parsed.nominal, userTransactions, categoryBudget);
      if (advisorMessage) {
        await sendTelegramMessage(botToken, chatId, advisorMessage);
      }
    }

    return { success: true, status: 'processed_text_transaction' };
  }

  // 5. Handle Photo Message (Receipt OCR)
  if (message.photo && message.photo.length > 0) {
    const ocrCheck = canUseReceiptOCR(user.plan);
    if (!ocrCheck.allowed) {
      await sendTelegramMessage(botToken, chatId, formatProOnlyReceiptReply());
      return { success: true, status: 'receipt_ocr_restricted' };
    }

    const largestPhoto = message.photo[message.photo.length - 1];
    const parsedReceipt = await parseReceiptWithAI({ url: largestPhoto.file_id }, user.id);

    const userCategories = serverStore.getCategories(user.id);
    const category = userCategories.find(c => c.name.toLowerCase() === parsedReceipt.kategori.toLowerCase()) || userCategories[0];

    // Record as single main transaction with items
    const { transaction: newTx, budgetAlert } = serverStore.addTransaction({
      user_id: user.id,
      wallet_id: defaultWallet.id,
      wallet_name: defaultWallet.name,
      category_id: category.id,
      category_name: category.name,
      category_emoji: category.emoji,
      type: 'expense',
      amount: parsedReceipt.nominal,
      notes: parsedReceipt.catatan,
      source: 'telegram_photo',
      merchant_name: parsedReceipt.merchant,
      items: (parsedReceipt.items || []).map((it, idx) => ({
        id: `item_${Date.now()}_${idx}`,
        transaction_id: '',
        item_name: it.name,
        price: it.price,
        quantity: it.quantity,
        category_name: it.category || category.name,
      })),
      telegram_message_id: message.message_id,
      transaction_date: new Date().toISOString(),
    });

    const refreshedWallet = serverStore.getWallets(user.id).find(w => w.id === defaultWallet.id) || defaultWallet;
    const categoryBudget = serverStore.getBudgets(user.id).find(b => b.category_id === category?.id);

    let reply = formatExpenseReply({
      amount: parsedReceipt.nominal,
      category: category,
      wallet: refreshedWallet,
      notes: `${parsedReceipt.merchant || 'Struk Belanja'} (${parsedReceipt.items?.length || 0} items)`,
      remainingBalance: refreshedWallet.balance,
      budget: categoryBudget,
    });

    if (parsedReceipt.items && parsedReceipt.items.length > 0) {
      reply += '\n\n📋 Rincian Item:';
      parsedReceipt.items.forEach(it => {
        reply += `\n• ${it.name} (${it.quantity}x) — ${formatRupiah(it.price * it.quantity)}`;
      });
    }

    await sendTelegramMessage(botToken, chatId, reply);

    if (budgetAlert) {
      if (budgetAlert.is100) {
        await sendTelegramMessage(botToken, chatId, `🚨 *ALERT BUDGET 100%!* Belanja di ${parsedReceipt.merchant || 'merchant'} membuat anggaran ${category.name} mencapai 100%!`);
      } else if (budgetAlert.is80) {
        await sendTelegramMessage(botToken, chatId, `⚡ *ALERT BUDGET 80%!* Anggaran kategori ${category.name} sudah menyentuh 80%!`);
      }
    }

    return { success: true, status: 'processed_receipt_photo' };
  }

  // 6. Handle Voice Note / Audio (All Plans - Part 4.3)
  if (message.voice || message.audio) {
    // Enforcement monthly limit for voice note (Exempt Superadmin & Admin)
    if (user.role !== 'superadmin' && user.role !== 'admin' && user.id !== 'usr_admin_999') {
      const limitCheck = canAddTransaction(user.plan, currentMonthTransactions.length);
      if (!limitCheck.allowed) {
        await sendTelegramMessage(botToken, chatId, formatStarterLimitReply(50));
        return { success: true, status: 'limit_reached' };
      }
    }

    const audioObj = message.voice || message.audio;
    const duration = audioObj?.duration || 0;
    if (duration > 60) {
      await sendTelegramMessage(
        botToken,
        chatId,
        '⏱️ Durasi voice note terlalu panjang (maksimal 60 detik). Silakan kirim rekaman yang lebih singkat ya!'
      );
      return { success: true, status: 'voice_duration_exceeded' };
    }

    const transcript = await transcribeVoiceNote(audioObj!.file_id, duration, user.id);
    const parsed = await parseTransactionWithAI(transcript, user.id);

    if (!parsed) {
      await sendTelegramMessage(
        botToken,
        chatId,
        `🎙️ Transkrip: "${transcript}"\n\n🤔 Suara berhasil ditranskrip tapi belum dapat dipahami sebagai transaksi. Silakan ulangi dengan menyebut nominal jelas, contoh: "beli makan 25 ribu".`
      );
      return { success: true, status: 'voice_unparsed' };
    }

    const userCategories = serverStore.getCategories(user.id);
    let category = userCategories.find(c => c.name.toLowerCase() === parsed.kategori.toLowerCase());
    if (!category) {
      category = userCategories.find(c => c.type === (parsed.jenis === 'pengeluaran' ? 'expense' : 'income')) || userCategories[0];
    }

    const { transaction: newTx, budgetAlert } = serverStore.addTransaction({
      user_id: user.id,
      wallet_id: defaultWallet.id,
      wallet_name: defaultWallet.name,
      category_id: category.id,
      category_name: category.name,
      category_emoji: category.emoji,
      type: parsed.jenis === 'pengeluaran' ? 'expense' : 'income',
      amount: parsed.nominal,
      notes: parsed.catatan || transcript,
      source: 'telegram_voice',
      telegram_message_id: message.message_id,
      transaction_date: new Date().toISOString(),
    });

    const refreshedWallet = serverStore.getWallets(user.id).find(w => w.id === defaultWallet.id) || defaultWallet;
    const categoryBudget = serverStore.getBudgets(user.id).find(b => b.category_id === category?.id);

    let reply = '';
    if (parsed.jenis === 'pengeluaran') {
      reply = formatExpenseReply({
        amount: parsed.nominal,
        category: category,
        wallet: refreshedWallet,
        notes: parsed.catatan,
        remainingBalance: refreshedWallet.balance,
        budget: categoryBudget,
        transcript: transcript,
      });
    } else {
      reply = formatIncomeReply({
        amount: parsed.nominal,
        wallet: refreshedWallet,
        categoryName: category.name,
        transcript: transcript,
      });
    }

    await sendTelegramMessage(botToken, chatId, reply);

    if (budgetAlert) {
      if (budgetAlert.is100) {
        await sendTelegramMessage(botToken, chatId, `🚨 *ALERT BUDGET 100%!* Transaksi suara ini membuat budget ${category.name} mencapai 100%!`);
      } else if (budgetAlert.is80) {
        await sendTelegramMessage(botToken, chatId, `⚡ *ALERT BUDGET 80%!* Budget kategori ${category.name} telah mencapai 80%!`);
      }
    }

    return { success: true, status: 'processed_voice_note' };
  }

    return { success: true, status: 'unsupported_message_type' };
  } catch (error: any) {
    console.error('[Telegram Handler] ❌ Critical Error during update processing:', error);
    try {
      if (update.message?.chat?.id) {
        await sendTelegramMessage(
          botToken,
          update.message.chat.id,
          `⚠️ Terjadi kendala teknis saat memproses pesan: ${error?.message || 'Internal error'}.\nData Anda tetap aman.`
        );
      }
    } catch (notifyErr) {
      console.error('[Telegram Handler] ❌ Failed to send fallback error message:', notifyErr);
    }
    return { success: false, status: 'internal_error', error: error?.message || 'Unknown error' };
  }
}
