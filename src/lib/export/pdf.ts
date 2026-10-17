import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction } from '../types';
import { formatRupiah } from '../utils/currency';
import { formatWIBDateTime } from '../utils/date-wib';

export function generateTransactionsPDFBuffer(
  transactions: Transaction[],
  userName: string,
  periodRange: string
): Uint8Array {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Calculate stats
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

  const netCashflow = totalIncome - totalExpense;

  // Header Branding (Fintech Blue)
  doc.setFillColor(37, 99, 235); // Blue primary #2563eb
  doc.rect(0, 0, 210, 25, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('TataDana — Laporan Keuangan Pribadi', 14, 16);

  // Subheader info
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nama Akun: ${userName}`, 14, 34);
  doc.text(`Periode: ${periodRange}`, 14, 40);
  doc.text(`Tanggal Export: ${formatWIBDateTime()}`, 14, 46);

  // Summary box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 52, 182, 24, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 52, 182, 24, 3, 3, 'S');

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL PEMASUKAN', 20, 60);
  doc.text('TOTAL PENGELUARAN', 80, 60);
  doc.text('NET CASHFLOW', 140, 60);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // Green
  doc.text(formatRupiah(totalIncome), 20, 69);

  doc.setTextColor(239, 68, 68); // Red
  doc.text(formatRupiah(totalExpense), 80, 69);

  doc.setTextColor(netCashflow >= 0 ? 16 : 239, netCashflow >= 0 ? 185 : 68, netCashflow >= 0 ? 129 : 68);
  doc.text(formatRupiah(netCashflow), 140, 69);

  // Transactions Table
  const tableRows = transactions.map((t, idx) => [
    idx + 1,
    formatWIBDateTime(t.transaction_date).split('—')[0].trim(),
    t.type === 'expense' ? 'Pengeluaran' : t.type === 'income' ? 'Pemasukan' : 'Transfer',
    t.category_name || '-',
    t.wallet_name || '-',
    formatRupiah(t.amount),
    t.notes || '-',
  ]);

  autoTable(doc, {
    startY: 84,
    head: [['No', 'Tanggal', 'Tipe', 'Kategori', 'Dompet', 'Nominal', 'Catatan']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 32 },
      2: { cellWidth: 22 },
      3: { cellWidth: 30 },
      4: { cellWidth: 24 },
      5: { cellWidth: 26, fontStyle: 'bold' },
      6: { cellWidth: 'auto' },
    },
    foot: [
      ['', '', '', '', 'Total Pengeluaran', formatRupiah(totalExpense), ''],
      ['', '', '', '', 'Total Pemasukan', formatRupiah(totalIncome), ''],
    ],
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8,
    },
  });

  const arrayBuffer = doc.output('arraybuffer');
  return new Uint8Array(arrayBuffer);
}
