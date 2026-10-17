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
  formatCalendarReply
} from './formatter';
import { parseTransactionWithAI, parseReceiptWithAI, transcribeVoiceNote, parsePurchaseIntent } from '../ai/provider-manager';
import { canAddTransaction, canUseReceiptOCR } from '../utils/plans';
import { formatRupiah } from '../utils/currency';
import { getCurrentMonthPeriodWIB, formatWIBDateTime } from '../utils/date-wib';
import { UserProfile, Category, Budget, Transaction } from '../types';

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
    .filter(t => t.type === 'expense' && t.category_id === category.id && new Date(t.transaction_date).getTime() >= sevenDaysAgo)
    .reduce((sum, t) => sum + t.amount, 0) + amount;

  const lastWeekCategoryExpense = userTransactions
    .filter(t => t.type === 'expense' && t.category_id === category.id)
    .filter(t => {
      const time = new Date(t.transaction_date).getTime();
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
  const currentMonthTx = userTransactions.filter(t => t.transaction_date.startsWith(currentMonth));
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

export async function processTelegramUpdate(update: TelegramUpdate, botToken: string): Promise<{ success: boolean; status: string }> {
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

  // 3. User Lookup
  const user = serverStore.getUserByTelegramChatId(chatId, botToken);

  // If user is not yet connected to TataDana
  if (!user) {
    await sendTelegramMessage(
      botToken,
      chatId,
      `👋 Halo ${message.from?.first_name || 'Teman'}! Akun Telegram kamu belum terhubung dengan TataDana.\n\nHubungkan akunmu dengan cara ketik:\n👉 \`/link <nomor_hp_kamu>\`\n(Contoh: \`/link 081234567890\`)\n\nAtau buka menu Pengaturan -> Telegram Bot di dashboard TataDana (https://tatadana.id/dashboard/settings).`
    );
    return { success: true, status: 'user_not_connected' };
  }

  const userWallets = serverStore.getWallets(user.id);
  const defaultWallet = serverStore.getDefaultWallet(user.id) || userWallets[0];
  const userTransactions = serverStore.getTransactions(user.id);
  const currentMonthTransactions = userTransactions.filter(t => t.transaction_date.startsWith(getCurrentMonthPeriodWIB()));

  // 4. Handle Text Messages & Bot Commands
  if (message.text) {
    const text = message.text.trim();
    const lower = text.toLowerCase();

    // Check if user is responding to pending payment (1: Saldo TataDana, 2: QRIS, 3: Transfer Bank, 4: Tunai)
    const pendingPurchase = serverStore.getPendingPurchase(user.id);
    const cleanInput = lower;
    const isPay1 = cleanInput === '1' || cleanInput === '1.' || cleanInput.includes('saldo');
    const isPay2 = cleanInput === '2' || cleanInput === '2.' || cleanInput.includes('qris');
    const isPay3 = cleanInput === '3' || cleanInput === '3.' || cleanInput.includes('transfer bank') || cleanInput.includes('bank');
    const isPay4 = cleanInput === '4' || cleanInput === '4.' || cleanInput.includes('tunai') || cleanInput.includes('cash') || cleanInput.includes('manual');

    if (pendingPurchase && (isPay1 || isPay2 || isPay3 || isPay4)) {
      const methodLabel = isPay1
        ? 'Saldo TataDana'
        : isPay2
        ? 'QRIS'
        : isPay3
        ? 'Transfer Bank'
        : 'Tunai / Catat Manual';

      const userCategories = serverStore.getCategories(user.id);
      const cat = userCategories.find(c => c.name.toLowerCase() === pendingPurchase.tatadanaCategoryName.toLowerCase()) || userCategories[0];
      const targetWallet = isPay4
        ? (userWallets.find(w => w.type === 'cash') || defaultWallet)
        : defaultWallet;

      serverStore.addTransaction({
        user_id: user.id,
        wallet_id: targetWallet.id,
        wallet_name: targetWallet.name,
        category_id: cat.id,
        category_name: cat.name,
        category_emoji: cat.emoji,
        type: 'expense',
        amount: pendingPurchase.amount,
        notes: `${pendingPurchase.item} (via ${methodLabel})`,
        source: 'telegram_text',
        telegram_message_id: message.message_id,
        transaction_date: new Date().toISOString(),
      });

      serverStore.clearPendingPurchase(user.id);
      const refreshedWallet = serverStore.getWallets(user.id).find(w => w.id === targetWallet.id) || targetWallet;

      const replySuccess = `✅ *Pembayaran Berhasil!*
Pesanan: *${pendingPurchase.item}*
Nominal: *${formatRupiah(pendingPurchase.amount)}*
Metode: *${methodLabel}*
Dompet: 👛 ${refreshedWallet.name} (Sisa: ${formatRupiah(refreshedWallet.balance)})

Transaksi telah otomatis dicatat ke akun TataDana kamu.`;

      await sendTelegramMessage(botToken, chatId, replySuccess);
      return { success: true, status: 'payment_completed' };
    }

    // Check commands
    if (lower === '/start' || lower === '/bantuan' || lower.startsWith('/help')) {
      await sendTelegramMessage(botToken, chatId, formatHelpReply());
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
        const purchaseIntent = parsePurchaseIntent(prompt);
        if (purchaseIntent) {
          serverStore.setPendingPurchase(user.id, {
            item: purchaseIntent.item_name,
            amount: purchaseIntent.amount,
            category: purchaseIntent.category,
            tatadanaCategoryName: purchaseIntent.tatadanaCategoryName,
          });

          await sendTelegramMessage(botToken, chatId, purchaseIntent.replyText);
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
      const todayTx = userTransactions.filter(t => t.transaction_date.startsWith(todayPrefix));
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
      const weekTx = userTransactions.filter(t => new Date(t.transaction_date).getTime() >= sevenDaysAgo);
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

    // Natural Language Input: Check Monthly Limit first
    const limitCheck = canAddTransaction(user.plan, currentMonthTransactions.length);
    if (!limitCheck.allowed) {
      await sendTelegramMessage(botToken, chatId, formatStarterLimitReply(50));
      return { success: true, status: 'limit_reached' };
    }

    // Check for purchase intent flow (e.g. "cilok 2rb", "kopi susu 15k", "pulsa 50rb")
    const purchaseIntent = parsePurchaseIntent(text);
    if (purchaseIntent) {
      serverStore.setPendingPurchase(user.id, {
        item: purchaseIntent.item_name,
        amount: purchaseIntent.amount,
        category: purchaseIntent.category,
        tatadanaCategoryName: purchaseIntent.tatadanaCategoryName,
      });

      await sendTelegramMessage(botToken, chatId, purchaseIntent.replyText);
      return { success: true, status: 'handled_purchase_intent' };
    }

    // Parse natural language
    const parsed = await parseTransactionWithAI(text, user.id);
    if (!parsed) {
      await sendTelegramMessage(botToken, chatId, formatAmbiguousErrorReply(text));
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
    // Enforcement monthly limit for voice note (Part 4.3 & 4.9)
    const limitCheck = canAddTransaction(user.plan, currentMonthTransactions.length);
    if (!limitCheck.allowed) {
      await sendTelegramMessage(botToken, chatId, formatStarterLimitReply(50));
      return { success: true, status: 'limit_reached' };
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
}
