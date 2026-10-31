import {
  ParsedTransactionResult,
  Wallet,
  InitiatePaymentPayload,
  RecordIncomePayload,
} from '../types';
import { parseIndonesianCurrency } from '../utils/currency';

/**
 * Mendapatkan daftar opsi pembayaran dinamis berdasarkan dompet riil pengguna.
 * Menghilangkan opsi hardcoded seperti 'TATADANA_WALLET' atau 'QRIS' yang tidak dimiliki user.
 */
export function getDynamicPaymentOptions(wallets?: Wallet[]): string[] {
  if (!wallets || wallets.length === 0) {
    return ['Dompet Utama', 'Tunai / Catat Manual'];
  }
  const options = wallets.map((w) => w.name);
  const hasCash = wallets.some(
    (w) => w.type === 'cash' || /tunai|cash|kas/i.test(w.name)
  );
  if (!hasCash) {
    options.push('Tunai / Kas Kecil');
  }
  return options;
}

/**
 * Intelligent Indonesian Text Parsing Fallback (Pure Client & Server Safe)
 * Analyzes natural Indonesian phrases for expenses, incomes, and wallet transfers.
 */
export function heuristicParseIndonesian(text: string, userWallets?: Wallet[]): ParsedTransactionResult | null {
  const clean = text.trim();
  const lower = clean.toLowerCase();

  // 1. Determine type: transfer vs income vs expense
  const isTransfer = /\b(?:transfer|tf|kirim(?:\s+uang)?)\b/i.test(lower) && /\b(?:ke|dari)\b/i.test(lower);
  const isIncome = !isTransfer && /\b(?:gaji|gajian|dapat\s+uang|penghasilan|transfer\s+masuk|cair|terima|bonus|freelance|dividen|uang\s+jajan\s+masuk)\b/i.test(lower);
  const jenis: 'pemasukan' | 'pengeluaran' | 'transfer' = isTransfer ? 'transfer' : isIncome ? 'pemasukan' : 'pengeluaran';

  // 2. Extract amount with smart priority:
  // Priority 1: Number with explicit unit suffix (e.g. "20rb", "15ribu", "500k", "1.5jt", "2 miliar")
  // Priority 2: Number with explicit "Rp" prefix (e.g. "Rp 50.000", "Rp15000")
  // Priority 3: Formatted thousands with dots/commas (e.g. "45.000", "150.000")
  // Priority 4: Standalone 4+ digit number (e.g. "25000", "50000")
  // Priority 5: Fallback standalone number

  let matchedAmountText: string | null = null;

  const unitRegex = /(?:rp\.?\s*)?(\d+(?:[.,]\d+)?\s*(?:rb|ribu|k|jt|juta|mio|milyar|miliar))\b/i;
  const rpRegex = /(?:rp\.?\s*)(\d{1,3}(?:[.,]\d{3})+|\d+)/i;
  const thousandsRegex = /\b(\d{1,3}(?:\.\d{3})+)\b/;
  const fourDigitRegex = /\b(\d{4,9})\b/;
  const anyDigitRegex = /\b(\d+)\b/;

  const m1 = lower.match(unitRegex);
  if (m1) {
    matchedAmountText = m1[0];
  } else {
    const m2 = lower.match(rpRegex);
    if (m2) {
      matchedAmountText = m2[0];
    } else {
      const m3 = lower.match(thousandsRegex);
      if (m3) {
        matchedAmountText = m3[0];
      } else {
        const m4 = lower.match(fourDigitRegex);
        if (m4) {
          matchedAmountText = m4[0];
        } else {
          const m5 = lower.match(anyDigitRegex);
          if (m5) {
            matchedAmountText = m5[0];
          }
        }
      }
    }
  }

  if (!matchedAmountText) {
    return null;
  }

  const nominal = parseIndonesianCurrency(matchedAmountText);
  if (!nominal || nominal <= 0) {
    return null;
  }

  // 3. Clean notes by removing the matched amount and command keywords
  let notes = clean.replace(new RegExp(matchedAmountText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '').trim();
  notes = notes
    .replace(/^beli\s+/i, '')
    .replace(/^bayar\s+/i, '')
    .replace(/^untuk\s+/i, '')
    .replace(/^isi\s+/i, '')
    .trim();
  if (!notes) notes = clean;

  // 4. Resolve Category & Destination
  let kategori = 'Lainnya';
  let destWalletName: string | undefined;

  if (isTransfer) {
    kategori = 'Transfer';
    const destMatch = lower.match(/(?:ke|menuju)\s+([a-zA-Z0-9_\s-]+)/i);
    if (destMatch) {
      destWalletName = destMatch[1].trim();
    }
  } else if (isIncome) {
    kategori = 'Pemasukan';
    if (/gaji|gajian/i.test(lower)) kategori = 'Gaji';
    else if (/bonus|thr/i.test(lower)) kategori = 'Bonus';
    else if (/freelance|proyek|side\s*job/i.test(lower)) kategori = 'Freelance';
    else if (/dividen|investasi|profit/i.test(lower)) kategori = 'Investasi';
  } else {
    // Expense Categories heuristics
    if (/makan|minum|kopi|nasi|bakso|ayam|mie|sate|jus|teh|snack|jajan|lunch|dinner|breakfast|sarapan/i.test(lower)) {
      kategori = 'Makanan & Minuman';
    } else if (/bensin|spbu|pertamax|pertalite|ojek|grab|gojek|taksi|tol|parkir|kereta|bus|mrt|krl/i.test(lower)) {
      kategori = 'Transportasi';
    } else if (/belanja|indomaret|alfamart|superindo|baju|celana|sepatu|tokopedia|shopee|lazada/i.test(lower)) {
      kategori = 'Belanja';
    } else if (/listrik|pln|pdam|air|wifi|indihome|pulsa|paket\s*data|kuota|iuran|bpjs/i.test(lower)) {
      kategori = 'Tagihan';
    } else if (/nonton|bioskop|game|steam|netflix|spotify|hiburan|karaoke|liburan/i.test(lower)) {
      kategori = 'Hiburan';
    } else if (/dokter|obat|apotek|klinik|rumah\s*sakit|vitamin|sehat/i.test(lower)) {
      kategori = 'Kesehatan';
    } else if (/buku|kursus|kuliah|sekolah|udemy|seminar/i.test(lower)) {
      kategori = 'Pendidikan';
    }
  }

  let purchasePayload: InitiatePaymentPayload | undefined;
  if (jenis === 'pengeluaran' && nominal > 0) {
    let catEnglish = 'Other';
    if (kategori === 'Makanan & Minuman') catEnglish = 'Food & Beverage';
    else if (kategori === 'Tagihan & Utilitas') catEnglish = 'Utilities';
    else if (kategori === 'Transportasi') catEnglish = 'Transport';
    else if (kategori === 'Belanja') catEnglish = 'Shopping';
    else if (kategori === 'Hiburan') catEnglish = 'Entertainment';
    else if (kategori === 'Kesehatan') catEnglish = 'Health';
    else if (kategori === 'Pendidikan') catEnglish = 'Education';

    const dynamicOptions = getDynamicPaymentOptions(userWallets);
    purchasePayload = {
      action: 'INITIATE_PAYMENT',
      data: {
        item: notes,
        amount: nominal,
        currency: 'IDR',
        category: catEnglish,
        payment_options: dynamicOptions,
      },
    };
  }

  let incomePayload: RecordIncomePayload | undefined;
  if (jenis === 'pemasukan' && nominal > 0) {
    const suggested = userWallets?.find((w) => w.is_default) || userWallets?.[0];
    incomePayload = {
      action: 'RECORD_INCOME',
      data: {
        title: notes || 'Pemasukan',
        amount: nominal,
        category: kategori || 'Gaji / Pendapatan',
        suggested_wallet_id: suggested?.id,
        suggested_wallet_name: suggested?.name,
        type: 'income',
        payment_options: getDynamicPaymentOptions(userWallets),
      },
    };
  }

  return {
    jenis,
    nominal,
    kategori,
    catatan: notes,
    destWalletName,
    purchasePayload,
    incomePayload,
    actionPayload: purchasePayload || incomePayload,
  };
}
