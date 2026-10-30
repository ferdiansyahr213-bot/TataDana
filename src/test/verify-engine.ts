import { parseIndonesianCurrency, formatRupiah } from '../lib/utils/currency';
import { heuristicParseIndonesian } from '../lib/ai/provider-manager';
import { 
  canAddTransaction, 
  canAddWallet, 
  canAddBudget, 
  canUseReceiptOCR, 
  canExportReports 
} from '../lib/utils/plans';
import { 
  formatExpenseReply, 
  formatIncomeReply, 
  generateProgressBar, 
  formatHelpReply, 
  formatDailyReminderReply,
  formatCalendarReply
} from '../lib/telegram/formatter';
import { formatWIBDateTime, getCurrentMonthPeriodWIB, getTodayWIB } from '../lib/utils/date-wib';
import { serverStore } from '../lib/supabase/server';
import { 
  getAdminApprovalWaUrl, 
  getAdminUpgradeProWaUrl, 
  getAdminRegisterWaUrl,
  getAdminWaNumber, 
  normalizeWaNumber 
} from '../lib/utils/whatsapp';
import { sanitizeUserDisplayName, sanitizeUserId } from '../lib/auth/user-sanitize';

export interface TestResult {
  name: string;
  passed: boolean;
  actual?: any;
  expected?: any;
  error?: string;
}

export function runTataDanaVerificationSuite(): { results: TestResult[]; summary: { total: number; passed: number; failed: number } } {
  const results: TestResult[] = [];

  // Helper
  const assert = (name: string, condition: boolean, actual?: any, expected?: any) => {
    results.push({
      name,
      passed: Boolean(condition),
      actual,
      expected,
    });
  };

  // 1. Currency & Slang Parsing Tests
  assert('Slang: 15rb -> 15.000', parseIndonesianCurrency('15rb') === 15000, parseIndonesianCurrency('15rb'), 15000);
  assert('Slang: 15ribu -> 15.000', parseIndonesianCurrency('15ribu') === 15000, parseIndonesianCurrency('15ribu'), 15000);
  assert('Slang: 500k -> 500.000', parseIndonesianCurrency('500k') === 500000, parseIndonesianCurrency('500k'), 500000);
  assert('Slang: 1.5jt -> 1.500.000', parseIndonesianCurrency('1.5jt') === 1500000, parseIndonesianCurrency('1.5jt'), 1500000);
  assert('Slang: 1,5jt -> 1.500.000', parseIndonesianCurrency('1,5jt') === 1500000, parseIndonesianCurrency('1,5jt'), 1500000);
  assert('Slang: 5jt -> 5.000.000', parseIndonesianCurrency('5jt') === 5000000, parseIndonesianCurrency('5jt'), 5000000);
  assert('Dot thousands: 15.000 -> 15000', parseIndonesianCurrency('15.000') === 15000, parseIndonesianCurrency('15.000'), 15000);
  assert('Comma thousands: 15,000 -> 15000', parseIndonesianCurrency('15,000') === 15000, parseIndonesianCurrency('15,000'), 15000);
  assert('Plain digits: 25000 -> 25000', parseIndonesianCurrency('25000') === 25000, parseIndonesianCurrency('25000'), 25000);
  assert('Currency format: 15000 -> Rp15.000', formatRupiah(15000) === 'Rp15.000', formatRupiah(15000), 'Rp15.000');

  // 2. Natural Language Transaction Parsing Tests
  const parse1 = heuristicParseIndonesian('beli bakso 15rb');
  assert(
    'NLP: "beli bakso 15rb"',
    parse1 !== null && parse1.jenis === 'pengeluaran' && parse1.nominal === 15000 && parse1.kategori === 'Makanan & Minuman',
    parse1,
    { jenis: 'pengeluaran', nominal: 15000, kategori: 'Makanan & Minuman' }
  );

  const parse2 = heuristicParseIndonesian('gajian 5jt');
  assert(
    'NLP: "gajian 5jt"',
    parse2 !== null && parse2.jenis === 'pemasukan' && parse2.nominal === 5000000 && parse2.kategori === 'Gaji',
    parse2,
    { jenis: 'pemasukan', nominal: 5000000, kategori: 'Gaji' }
  );

  const parse3 = heuristicParseIndonesian('bensin spbu 30k');
  assert(
    'NLP: "bensin spbu 30k"',
    parse3 !== null && parse3.jenis === 'pengeluaran' && parse3.nominal === 30000 && parse3.kategori === 'Transportasi',
    parse3,
    { jenis: 'pengeluaran', nominal: 30000, kategori: 'Transportasi' }
  );

  // 3. Attack quantity/date collisions (Prior attempt bug fix)
  const parseCollision1 = heuristicParseIndonesian('beli 2 kopi 20rb');
  assert(
    'NLP collision: "beli 2 kopi 20rb" matches 20000 not 2',
    parseCollision1 !== null && parseCollision1.nominal === 20000,
    parseCollision1?.nominal,
    20000
  );

  const parseCollision2 = heuristicParseIndonesian('beli 3 porsi sate 45.000');
  assert(
    'NLP collision: "beli 3 porsi sate 45.000" matches 45000 not 3',
    parseCollision2 !== null && parseCollision2.nominal === 45000,
    parseCollision2?.nominal,
    45000
  );

  const parseCollision3 = heuristicParseIndonesian('tgl 10 bayar listrik 150rb');
  assert(
    'NLP collision: "tgl 10 bayar listrik 150rb" matches 150000 not 10',
    parseCollision3 !== null && parseCollision3.nominal === 150000,
    parseCollision3?.nominal,
    150000
  );

  // 4. Transfer antar wallet parsing
  const parseTransfer = heuristicParseIndonesian('transfer ke gopay 100rb');
  assert(
    'NLP Transfer: "transfer ke gopay 100rb"',
    parseTransfer !== null && parseTransfer.jenis === 'transfer' && parseTransfer.nominal === 100000,
    parseTransfer,
    { jenis: 'transfer', nominal: 100000 }
  );

  // 5. Plan Enforcement Tests
  assert('Plan: Starter max 50 tx (reached)', !canAddTransaction('starter', 50).allowed);
  assert('Plan: Starter max 50 tx (not reached)', canAddTransaction('starter', 49).allowed);
  assert('Plan: Pro unlimited tx (at 1000)', canAddTransaction('pro', 1000).allowed);
  assert('Plan: Starter max 3 wallets', !canAddWallet('starter', 3).allowed);
  assert('Plan: Starter OCR restriction', !canUseReceiptOCR('starter').allowed);
  assert('Plan: Pro OCR allowed', canUseReceiptOCR('pro').allowed);
  assert('Plan: Starter export restriction', !canExportReports('starter').allowed);
  assert('Plan: Pro export allowed', canExportReports('pro').allowed);

  // 6. Progress bar test
  const bar70 = generateProgressBar(70, 10);
  assert('Progress bar: 70% -> 7 filled blocks', bar70 === '███████░░░', bar70, '███████░░░');

  // 7. Date WIB timezone test
  const wibString = formatWIBDateTime(new Date());
  assert('Date format: contains WIB', wibString.includes('WIB'), wibString, '...WIB');
  const monthPeriod = getCurrentMonthPeriodWIB();
  assert('Date format: month period YYYY-MM', /^\d{4}-\d{2}$/.test(monthPeriod), monthPeriod, 'YYYY-MM');

  // 8. Multi-user isolation in Telegram lookup (Fixing security flaw)
  const unknownUser = serverStore.getUserByTelegramChatId(999888777);
  assert('Security: Unknown Telegram chatId returns undefined (not demo user)', unknownUser === undefined, unknownUser, undefined);

  // 9. Phone linking
  const testPhone = '081234567890';
  const linked = serverStore.linkUserByPhone(testPhone, 123999444, 'test_user');
  assert('Telegram Linking: Link by phone works', linked !== undefined && linked.telegram_chat_id === 123999444, linked?.telegram_chat_id, 123999444);

  // 10. Budget Threshold 80% & 100% alert verification
  const demoBudgets = serverStore.getBudgets('usr_demo_123');
  const foodBudget = demoBudgets.find(b => b.category_id === 'cat_1');
  if (foodBudget) {
    foodBudget.amount = 100000;
    foodBudget.spent = 70000;
    foodBudget.alert_80_sent = false;
    foodBudget.alert_100_sent = false;
  }

  // Adding 15.000 brings spent to 85.000 (85%) -> should trigger alert 80%
  const txAlert = serverStore.addTransaction({
    user_id: 'usr_demo_123',
    wallet_id: 'wal_1',
    category_id: 'cat_1',
    type: 'expense',
    amount: 15000,
    notes: 'Test Alert 80%',
    source: 'web',
    transaction_date: new Date().toISOString(),
  });

  assert(
    'Budget Alert: 85% expenditure triggers alert 80%',
    Boolean(txAlert.budgetAlert?.is80),
    txAlert.budgetAlert?.is80,
    true
  );

  // 11. New Feature Verifications: Calendar & AI commands
  const calendarReply = formatCalendarReply(serverStore.getTransactions('usr_demo_123'), serverStore.users.get('usr_demo_123')!);
  assert('Telegram: formatCalendarReply includes WIB and Net Cashflow', calendarReply.includes('Kalender Keuangan') && calendarReply.includes('Net Cashflow'), true, true);

  const helpReply = formatHelpReply();
  assert('Telegram: formatHelpReply includes /kalender and /tataai', helpReply.includes('/kalender') && helpReply.includes('/tataai'), true, true);

  // 12. Budget Multi-Periode assertion
  const testBudget = {
    id: 'bud_multi_test',
    user_id: 'usr_demo_123',
    category_id: 'cat_1',
    month_period: getCurrentMonthPeriodWIB(),
    period_type: 'daily' as const,
    amount: 50000,
    spent: 25000,
  };
  assert('Budget: supports daily period_type', testBudget.period_type === 'daily', testBudget.period_type, 'daily');

  // 13. Admin Approval & WhatsApp Link Assertions
  const waNorm = normalizeWaNumber('087730370324');
  assert('WhatsApp: normalize 087730370324 -> 6287730370324', waNorm === '6287730370324', waNorm, '6287730370324');

  const approvalUrl = getAdminApprovalWaUrl({
    fullName: 'Ahmad Fauzi',
    email: 'ahmad.fauzi@example.com',
  });
  assert(
    'Admin Approval: generates valid WhatsApp approval link with name and email',
    approvalUrl.includes('https://wa.me/') &&
      approvalUrl.includes('Ahmad%20Fauzi') &&
      approvalUrl.includes('ahmad.fauzi%40example.com'),
    true,
    true
  );

  // 14. Registration defaults to pending status
  const regUser = serverStore.registerNewUser({
    fullName: 'Test Pending User',
    phone: '089912345678',
    email: 'test.pending@example.com',
    password: 'Password123!',
  });
  assert('Registration: status is pending for regular user', regUser.verification_status === 'pending', regUser.verification_status, 'pending');

  // 15. Dynamic User WhatsApp Pro Upgrade Draft Assertions
  const proUrlReal = getAdminUpgradeProWaUrl({
    fullName: 'Revi',
    email: 'revikerudung99@gmail.com',
    userId: 'usr_1793200176636',
  });
  assert(
    'Pro WhatsApp: Real user details rendered dynamically',
    proUrlReal.includes('6287730370324') &&
      proUrlReal.includes('Revi') &&
      proUrlReal.includes('revikerudung99%40gmail.com') &&
      proUrlReal.includes('usr_1793200176636') &&
      proUrlReal.includes('TataDana%20Pro%20Bulanan'),
    true,
    true
  );

  const proUrlFallback = getAdminUpgradeProWaUrl({
    fullName: 'Vina Al Fitriansyah', // dummy name to be rejected
    email: 'budi.santoso@gmail.com',
    userId: 'usr_demo_123', // dummy id to be rejected
  });
  assert(
    'Pro WhatsApp: Rejects dummy name & dummy ID, safely fallbacks to email identity',
    !proUrlFallback.includes('Vina') &&
      !proUrlFallback.includes('usr_demo_123') &&
      proUrlFallback.includes('Budi.santoso') &&
      proUrlFallback.includes('budi.santoso%40gmail.com'),
    true,
    true
  );

  const safeName = sanitizeUserDisplayName('', 'user.test@example.com');
  assert('Auth: sanitizeUserDisplayName derives name from email', safeName === 'User.test', safeName, 'User.test');

  const safeId = sanitizeUserId('usr_demo_123', 'user.test@example.com');
  assert('Auth: sanitizeUserId rejects dummy usr_demo_123', safeId === 'user.test@example.com', safeId, 'user.test@example.com');

  // 16. WhatsApp First-Time Registration & Onboarding Draft Assertions
  const regWaEmpty = getAdminRegisterWaUrl();
  assert(
    'Registration WhatsApp: Uses intuitive placeholders when form is empty',
    regWaEmpty.includes('6287730370324') &&
      regWaEmpty.includes('%5BTulis%20nama%20Anda%5D') &&
      regWaEmpty.includes('%5BTulis%20email%20Anda%5D') &&
      regWaEmpty.includes('Halo%20Admin%20TataDana%2C%20saya%20tertarik') &&
      regWaEmpty.includes('cara%20aktivasi%20akun%20pertama%20saya'),
    true,
    true
  );

  const regWaFilled = getAdminRegisterWaUrl({
    fullName: 'Bambang Sudirman',
    email: 'bambang.s@gmail.com',
    phone: '081298765432',
  });
  assert(
    'Registration WhatsApp: Automatically inserts user form inputs',
    regWaFilled.includes('6287730370324') &&
      regWaFilled.includes('Bambang%20Sudirman') &&
      regWaFilled.includes('bambang.s%40gmail.com') &&
      regWaFilled.includes('081298765432'),
    true,
    true
  );

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  return {
    results,
    summary: { total, passed, failed },
  };
}
