import * as XLSX from 'xlsx';
import { Transaction } from '../types';
import { formatWIBDateTime } from '../utils/date-wib';

export function generateTransactionsExcelBuffer(transactions: Transaction[], userName: string): Uint8Array {
  // 1. Transaction sheet data
  const rows = transactions.map((t, idx) => ({
    No: idx + 1,
    Tanggal: formatWIBDateTime(t.transaction_date),
    Tipe: t.type === 'expense' ? 'Pengeluaran' : t.type === 'income' ? 'Pemasukan' : 'Transfer',
    Kategori: t.category_name || '-',
    Dompet: t.wallet_name || '-',
    Nominal: t.amount,
    Catatan: t.notes || '-',
    Sumber: t.source,
    Merchant: t.merchant_name || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 30 }, // Tanggal
    { wch: 15 }, // Tipe
    { wch: 22 }, // Kategori
    { wch: 18 }, // Dompet
    { wch: 16 }, // Nominal
    { wch: 35 }, // Catatan
    { wch: 15 }, // Sumber
    { wch: 22 }, // Merchant
  ];

  // 2. Summary Sheet
  let totalIncome = 0;
  let totalExpense = 0;
  const categoryMap: { [cat: string]: number } = {};

  transactions.forEach((t) => {
    if (t.type === 'income') totalIncome += t.amount;
    if (t.type === 'expense') {
      totalExpense += t.amount;
      const cat = t.category_name || 'Lainnya';
      categoryMap[cat] = (categoryMap[cat] || 0) + t.amount;
    }
  });

  const summaryRows = [
    { Ringkasan: 'Nama Pengguna', Nilai: userName },
    { Ringkasan: 'Tanggal Export', Nilai: formatWIBDateTime() },
    { Ringkasan: 'Total Transaksi', Nilai: transactions.length },
    { Ringkasan: 'Total Pemasukan', Nilai: totalIncome },
    { Ringkasan: 'Total Pengeluaran', Nilai: totalExpense },
    { Ringkasan: 'Net Cashflow', Nilai: totalIncome - totalExpense },
    { Ringkasan: '', Nilai: '' },
    { Ringkasan: '--- TOP KATEGORI PENGELUARAN ---', Nilai: '' },
    ...Object.entries(categoryMap).map(([cat, amt]) => ({
      Ringkasan: cat,
      Nilai: amt,
    })),
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  summarySheet['!cols'] = [{ wch: 35 }, { wch: 25 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan');
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Transaksi');

  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return excelBuffer;
}
