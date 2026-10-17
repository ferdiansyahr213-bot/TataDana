import { PlanType } from '../types';

export const PLAN_LIMITS = {
  starter: {
    maxMonthlyTransactions: 50,
    maxWallets: 3,
    maxBudgetCategories: 5,
    allowReceiptOCR: false,
    allowVoiceInput: true,
    allowAiAdvisor: false,
    allowExport: false,
    allowAdvancedFilters: false,
    priceIdr: 49000,
    billing: 'per bulan',
  },
  pro: {
    maxMonthlyTransactions: Infinity,
    maxWallets: Infinity,
    maxBudgetCategories: Infinity,
    allowReceiptOCR: true,
    allowVoiceInput: true,
    allowAiAdvisor: true,
    allowExport: true,
    allowAdvancedFilters: true,
    priceIdr: 99000,
    billing: 'sekali bayar',
  },
};

export function canAddTransaction(plan: PlanType, currentMonthlyCount: number): { allowed: boolean; reason?: string } {
  const limit = PLAN_LIMITS[plan].maxMonthlyTransactions;
  if (currentMonthlyCount >= limit) {
    return {
      allowed: false,
      reason: `Batas transaksi bulanan paket Starter (${limit} transaksi) telah tercapai. Upgrade ke Pro untuk transaksi unlimited!`,
    };
  }
  return { allowed: true };
}

export function canAddWallet(plan: PlanType, currentWalletCount: number): { allowed: boolean; reason?: string } {
  const limit = PLAN_LIMITS[plan].maxWallets;
  if (currentWalletCount >= limit) {
    return {
      allowed: false,
      reason: `Batas dompet paket Starter (${limit} dompet) telah tercapai. Upgrade ke Pro untuk menambah dompet tanpa batas!`,
    };
  }
  return { allowed: true };
}

export function canAddBudget(plan: PlanType, currentBudgetCount: number): { allowed: boolean; reason?: string } {
  const limit = PLAN_LIMITS[plan].maxBudgetCategories;
  if (currentBudgetCount >= limit) {
    return {
      allowed: false,
      reason: `Batas anggaran kategori paket Starter (${limit} kategori) telah tercapai. Upgrade ke Pro untuk membuat anggaran tak terbatas!`,
    };
  }
  return { allowed: true };
}

export function canUseReceiptOCR(plan: PlanType): { allowed: boolean; reason?: string } {
  if (!PLAN_LIMITS[plan].allowReceiptOCR) {
    return {
      allowed: false,
      reason: 'Fitur catat via foto struk khusus untuk pengguna paket Pro. Upgrade sekarang untuk mengaktifkan AI Vision!',
    };
  }
  return { allowed: true };
}

export function canExportReports(plan: PlanType): { allowed: boolean; reason?: string } {
  if (!PLAN_LIMITS[plan].allowExport) {
    return {
      allowed: false,
      reason: 'Fitur export laporan PDF & Excel hanya tersedia di paket Pro. Upgrade untuk download laporan tanpa batas!',
    };
  }
  return { allowed: true };
}
