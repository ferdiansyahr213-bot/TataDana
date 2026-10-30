import {
  parsePurchaseIntent,
  formatInitiatePaymentReply,
  extractActionPayloadFromMessage,
  getDynamicPaymentOptions,
  buildTataAiSystemPrompt,
  TATA_AI_SYSTEM_PROMPT,
} from '../lib/ai/provider-manager';
import { serverStore } from '../lib/supabase/server';
import { Wallet } from '../lib/types';

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

  const demoWallets: Wallet[] = serverStore.getWallets('usr_demo_123');

  // Test 1: cilok 2rb entity extraction with dynamic wallets
  const cilokIntent = parsePurchaseIntent('cilok 2rb', demoWallets);
  assert('cilok 2rb: detected', cilokIntent !== null, Boolean(cilokIntent), true);
  assert('cilok 2rb: item is "cilok"', cilokIntent?.item_name === 'cilok', cilokIntent?.item_name, 'cilok');
  assert('cilok 2rb: amount is 2000', cilokIntent?.amount === 2000, cilokIntent?.amount, 2000);
  assert('cilok 2rb: category is Food & Beverage', cilokIntent?.category === 'Food & Beverage', cilokIntent?.category, 'Food & Beverage');

  // Test 2: Dynamic payment options matching real user wallets
  const dynamicOptions = cilokIntent?.payload?.data?.payment_options || [];
  assert(
    'Dynamic Options: only contains user real wallets',
    dynamicOptions.includes('BCA Utama') && dynamicOptions.includes('Dompet Tunai (Cash)') && dynamicOptions.includes('GoPay'),
    dynamicOptions,
    ['BCA Utama', 'Dompet Tunai (Cash)', 'GoPay']
  );
  assert(
    'Dynamic Options: does NOT contain hardcoded "TATADANA_WALLET"',
    !dynamicOptions.includes('TATADANA_WALLET'),
    true,
    true
  );
  assert(
    'Dynamic Options: does NOT contain hardcoded "QRIS"',
    !dynamicOptions.includes('QRIS'),
    true,
    true
  );

  // Test 3: Reply text contains real wallet names and balances
  const reply = cilokIntent?.replyText || '';
  assert(
    'Reply: contains "Siap, pesanan **cilok** sebesar **Rp 2.000** sudah dicatat"',
    reply.includes('Siap, pesanan **cilok** sebesar **Rp 2.000** sudah dicatat. Mau bayar pakai apa?'),
    true,
    true
  );
  assert('Reply: contains "1. BCA Utama"', reply.includes('1. BCA Utama'), true, true);
  assert('Reply: contains "2. Dompet Tunai (Cash)"', reply.includes('2. Dompet Tunai (Cash)'), true, true);
  assert('Reply: contains "3. GoPay"', reply.includes('3. GoPay'), true, true);

  // Test 4: kopi susu 15k entity extraction
  const kopiIntent = parsePurchaseIntent('kopi susu 15k', demoWallets);
  assert('kopi susu 15k: detected', kopiIntent !== null, Boolean(kopiIntent), true);
  assert('kopi susu 15k: item is "kopi susu"', kopiIntent?.item_name === 'kopi susu', kopiIntent?.item_name, 'kopi susu');
  assert('kopi susu 15k: amount is 15000', kopiIntent?.amount === 15000, kopiIntent?.amount, 15000);
  assert('kopi susu 15k: category is Food & Beverage', kopiIntent?.category === 'Food & Beverage', kopiIntent?.category, 'Food & Beverage');

  // Test 5: pulsa 50rb entity extraction
  const pulsaIntent = parsePurchaseIntent('pulsa 50rb', demoWallets);
  assert('pulsa 50rb: detected', pulsaIntent !== null, Boolean(pulsaIntent), true);
  assert('pulsa 50rb: item is "pulsa"', pulsaIntent?.item_name === 'pulsa', pulsaIntent?.item_name, 'pulsa');
  assert('pulsa 50rb: amount is 50000', pulsaIntent?.amount === 50000, pulsaIntent?.amount, 50000);
  assert('pulsa 50rb: category is Utilities', pulsaIntent?.category === 'Utilities', pulsaIntent?.category, 'Utilities');

  // Test 6: Dot thousands amount parsing e.g. "cilok 50.000"
  const dotIntent = parsePurchaseIntent('cilok 50.000', demoWallets);
  assert('Dot amount: "cilok 50.000" -> amount 50000', dotIntent?.amount === 50000, dotIntent?.amount, 50000);

  // Test 7: Plain digits parsing e.g. "cilok 2000"
  const plainIntent = parsePurchaseIntent('cilok 2000', demoWallets);
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

  // Test 10: extractActionPayloadFromMessage extracts payload and strips raw JSON code block & method lists
  const testMsgWithJson = cilokIntent?.replyText || '';
  const extracted = extractActionPayloadFromMessage(testMsgWithJson);
  assert('Payload extractor: cleanText does NOT contain "```json"', !extracted.cleanText.includes('```json'), true, true);
  assert('Payload extractor: cleanText does NOT contain "INITIATE_PAYMENT"', !extracted.cleanText.includes('INITIATE_PAYMENT'), true, true);
  assert('Payload extractor: cleanText does NOT contain "Pilihan metode:"', !extracted.cleanText.includes('Pilihan metode:'), true, true);
  assert('Payload extractor: action is INITIATE_PAYMENT', extracted.payload?.action === 'INITIATE_PAYMENT', extracted.payload?.action, 'INITIATE_PAYMENT');
  assert('Payload extractor: item is "cilok"', (extracted.payload?.data as any)?.item === 'cilok', (extracted.payload?.data as any)?.item, 'cilok');
  assert('Payload extractor: amount is 2000', extracted.payload?.data?.amount === 2000, extracted.payload?.data?.amount, 2000);

  // Test 11: Dynamic system prompt contains real user wallets
  const customPrompt = buildTataAiSystemPrompt(demoWallets);
  assert('System Prompt: contains "BCA Utama"', customPrompt.includes('BCA Utama'), true, true);
  assert('System Prompt: contains "Dompet Tunai (Cash)"', customPrompt.includes('Dompet Tunai (Cash)'), true, true);
  assert('System Prompt: contains "GoPay"', customPrompt.includes('GoPay'), true, true);
  assert('System Prompt: warns against hardcoded QRIS or TATADANA_WALLET', customPrompt.includes('JANGAN PERNAH menampilkan opsi default/hardcode (seperti QRIS atau TATADANA_WALLET)'), true, true);

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  return { results, summary: { total, passed, failed } };
}
