import { parsePurchaseIntent, formatInitiatePaymentReply } from '../lib/ai/provider-manager';
import { serverStore } from '../lib/supabase/server';

export interface TataAiTestResult {
  name: string;
  passed: boolean;
  actual?: any;
  expected?: any;
  error?: string;
}

export function runTataAiVerification(): { results: TataAiTestResult[]; summary: { total: number; passed: number; failed: number } } {
  const results: TataAiTestResult[] = [];

  const assert = (name: string, condition: boolean, actual?: any, expected?: any) => {
    results.push({
      name,
      passed: Boolean(condition),
      actual,
      expected,
    });
  };

  // Test 1: cilok 2rb entity extraction
  const cilokIntent = parsePurchaseIntent('cilok 2rb');
  assert('cilok 2rb: detected', cilokIntent !== null, Boolean(cilokIntent), true);
  assert('cilok 2rb: item is "cilok"', cilokIntent?.item_name === 'cilok', cilokIntent?.item_name, 'cilok');
  assert('cilok 2rb: amount is 2000', cilokIntent?.amount === 2000, cilokIntent?.amount, 2000);
  assert('cilok 2rb: category is Food & Beverage', cilokIntent?.category === 'Food & Beverage', cilokIntent?.category, 'Food & Beverage');

  // Test 2: kopi susu 15k entity extraction
  const kopiIntent = parsePurchaseIntent('kopi susu 15k');
  assert('kopi susu 15k: detected', kopiIntent !== null, Boolean(kopiIntent), true);
  assert('kopi susu 15k: item is "kopi susu"', kopiIntent?.item_name === 'kopi susu', kopiIntent?.item_name, 'kopi susu');
  assert('kopi susu 15k: amount is 15000', kopiIntent?.amount === 15000, kopiIntent?.amount, 15000);
  assert('kopi susu 15k: category is Food & Beverage', kopiIntent?.category === 'Food & Beverage', kopiIntent?.category, 'Food & Beverage');

  // Test 3: pulsa 50rb entity extraction
  const pulsaIntent = parsePurchaseIntent('pulsa 50rb');
  assert('pulsa 50rb: detected', pulsaIntent !== null, Boolean(pulsaIntent), true);
  assert('pulsa 50rb: item is "pulsa"', pulsaIntent?.item_name === 'pulsa', pulsaIntent?.item_name, 'pulsa');
  assert('pulsa 50rb: amount is 50000', pulsaIntent?.amount === 50000, pulsaIntent?.amount, 50000);
  assert('pulsa 50rb: category is Utilities', pulsaIntent?.category === 'Utilities', pulsaIntent?.category, 'Utilities');

  // Test 4: Response Template accuracy
  const reply = cilokIntent?.replyText || '';
  assert('Template: contains "Siap, pesanan **cilok** sebesar **Rp 2.000** sudah dicatat. Mau bayar pakai apa?"',
    reply.includes('Siap, pesanan **cilok** sebesar **Rp 2.000** sudah dicatat. Mau bayar pakai apa?'),
    reply,
    'Siap, pesanan **cilok** sebesar **Rp 2.000** sudah dicatat. Mau bayar pakai apa?'
  );

  assert('Template: contains "Pilihan metode:"', reply.includes('Pilihan metode:'), true, true);
  assert('Template: contains "1. Saldo TataDana"', reply.includes('1. Saldo TataDana'), true, true);
  assert('Template: contains "2. QRIS"', reply.includes('2. QRIS'), true, true);
  assert('Template: contains "3. Transfer Bank"', reply.includes('3. Transfer Bank'), true, true);
  assert('Template: contains "4. Tunai / Catat Manual"', reply.includes('4. Tunai / Catat Manual'), true, true);

  // Test 5: Structured Action Payload JSON
  const payload = cilokIntent?.payload;
  assert('Payload: action is INITIATE_PAYMENT', payload?.action === 'INITIATE_PAYMENT', payload?.action, 'INITIATE_PAYMENT');
  assert('Payload: data.item is cilok', payload?.data?.item === 'cilok', payload?.data?.item, 'cilok');
  assert('Payload: data.amount is 2000', payload?.data?.amount === 2000, payload?.data?.amount, 2000);
  assert('Payload: data.currency is IDR', payload?.data?.currency === 'IDR', payload?.data?.currency, 'IDR');
  assert('Payload: data.category is Food & Beverage', payload?.data?.category === 'Food & Beverage', payload?.data?.category, 'Food & Beverage');
  assert('Payload: payment_options contains all 4 methods',
    JSON.stringify(payload?.data?.payment_options) === JSON.stringify(['TATADANA_WALLET', 'QRIS', 'BANK_TRANSFER', 'CASH']),
    payload?.data?.payment_options,
    ['TATADANA_WALLET', 'QRIS', 'BANK_TRANSFER', 'CASH']
  );

  // Test 6: Dot thousands amount parsing e.g. "cilok 50.000"
  const dotIntent = parsePurchaseIntent('cilok 50.000');
  assert('Dot amount: "cilok 50.000" -> amount 50000', dotIntent?.amount === 50000, dotIntent?.amount, 50000);

  // Test 7: Plain digits parsing e.g. "cilok 2000"
  const plainIntent = parsePurchaseIntent('cilok 2000');
  assert('Plain digits: "cilok 2000" -> amount 2000', plainIntent?.amount === 2000, plainIntent?.amount, 2000);

  // Test 8: Non-purchase inputs return null (no false positives)
  assert('Negative: "gajian 5jt" is not purchase intent', parsePurchaseIntent('gajian 5jt') === null, true, true);
  assert('Negative: "transfer ke gopay 100rb" is not purchase intent', parsePurchaseIntent('transfer ke gopay 100rb') === null, true, true);
  assert('Negative: "berapa sisa budget belanjaku?" is not purchase intent', parsePurchaseIntent('berapa sisa budget belanjaku?') === null, true, true);

  // Test 9: ServerStore pending payment flow
  serverStore.setPendingPurchase('usr_demo_123', {
    item: 'cilok',
    amount: 2000,
    category: 'Food & Beverage',
    tatadanaCategoryName: 'Makanan & Minuman',
  });
  const pending = serverStore.getPendingPurchase('usr_demo_123');
  assert('Pending payment: stored and retrieved', pending !== undefined && pending.amount === 2000, pending?.amount, 2000);
  serverStore.clearPendingPurchase('usr_demo_123');
  assert('Pending payment: cleared', serverStore.getPendingPurchase('usr_demo_123') === undefined, true, true);

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  return { results, summary: { total, passed, failed } };
}
