const DAYS_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Returns Date object in WIB (UTC+7)
 */
export function getWIBDate(dateInput?: string | number | Date): Date {
  const d = dateInput ? new Date(dateInput) : new Date();
  return d;
}

/**
 * Format to standard Indonesian WIB: e.g. "Sabtu, 10 Oktober 2026 — 14:30 WIB"
 */
export function formatWIBDateTime(dateInput?: string | number | Date): string {
  const date = dateInput ? new Date(dateInput) : new Date();
  
  // Convert to Asia/Jakarta timezone
  const formatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  let dayName = '';
  let day = '';
  let month = '';
  let year = '';
  let hour = '';
  let minute = '';

  for (const part of parts) {
    if (part.type === 'weekday') dayName = part.value;
    if (part.type === 'day') day = part.value;
    if (part.type === 'month') month = part.value;
    if (part.type === 'year') year = part.value;
    if (part.type === 'hour') hour = part.value;
    if (part.type === 'minute') minute = part.value;
  }

  // Ensure 2 digits for hour and minute
  const hourPadded = hour.padStart(2, '0');
  const minPadded = minute.padStart(2, '0');

  return `${dayName}, ${day} ${month} ${year} — ${hourPadded}:${minPadded} WIB`;
}

/**
 * Format date for table & cards: "10 Okt 2026, 14:30"
 */
export function formatShortWIB(dateInput: string | number | Date): string {
  const date = new Date(dateInput);
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

/**
 * Get current year-month in WIB e.g. "2026-10"
 */
export function getCurrentMonthPeriodWIB(dateInput?: string | number | Date): string {
  const date = dateInput ? new Date(dateInput) : new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value || '2026';
  const month = parts.find((p) => p.type === 'month')?.value || '10';
  return `${year}-${month}`;
}

/**
 * Get current date string in WIB e.g. "2026-10-10"
 */
export function getTodayWIB(dateInput?: string | number | Date): string {
  const date = dateInput ? new Date(dateInput) : new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value || '2026';
  const month = parts.find((p) => p.type === 'month')?.value || '10';
  const day = parts.find((p) => p.type === 'day')?.value || '10';
  return `${year}-${month}-${day}`;
}

