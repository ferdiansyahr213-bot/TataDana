export function formatRupiah(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'Rp0';
  }
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(amount);
  return `Rp${formatted}`;
}

export function parseIndonesianCurrency(text: string): number | null {
  if (!text) return null;
  const clean = text.toLowerCase().trim().replace(/\s+/g, '');

  // Handle formats like: 15rb, 15ribu, 15k
  const rbMatch = clean.match(/^(\d+(?:[.,]\d+)?)\s*(?:rb|ribu|k)$/i);
  if (rbMatch) {
    const val = parseFloat(rbMatch[1].replace(',', '.'));
    return Math.round(val * 1000);
  }

  // Handle formats like: 1.5jt, 1,5juta, 5jt
  const jtMatch = clean.match(/^(\d+(?:[.,]\d+)?)\s*(?:jt|juta|mio)$/i);
  if (jtMatch) {
    const val = parseFloat(jtMatch[1].replace(',', '.'));
    return Math.round(val * 1000000);
  }

  // Handle formats like: 1.5m, 1,5milyar, 2 miliar
  const milyarMatch = clean.match(/^(\d+(?:[.,]\d+)?)\s*(?:milyar|miliar|b)$/i);
  if (milyarMatch) {
    const val = parseFloat(milyarMatch[1].replace(',', '.'));
    return Math.round(val * 1000000000);
  }

  // Strip Rp prefix
  let numStr = clean.replace(/^rp\.?/i, '');

  // Handle thousand separators: 15.000 or 15,000
  if (/^\d{1,3}(?:[.,]\d{3})+$/.test(numStr)) {
    numStr = numStr.replace(/[.,]/g, '');
    const num = parseInt(numStr, 10);
    return isNaN(num) ? null : num;
  }

  // Handle standard decimal or plain numbers
  numStr = numStr.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(numStr);
  return isNaN(num) ? null : Math.round(num);
}
