import { NextRequest, NextResponse } from 'next/server';
import {
  parseTransactionIntent,
  parsePurchaseIntent,
  parseIncomeIntent,
  buildTataAiSystemPrompt,
  TATA_AI_SYSTEM_PROMPT,
} from '../../../../lib/ai/provider-manager';
import { serverStore, supabaseAdmin, isServerSupabaseConfigured } from '../../../../lib/supabase/server';
import { formatRupiah } from '../../../../lib/utils/currency';
import { Wallet } from '../../../../lib/types';

/**
 * Mengambil dompet aktif pengguna dari Supabase Postgres atau backend serverStore
 */
async function fetchActiveUserWallets(userId: string, clientWallets?: Wallet[]): Promise<Wallet[]> {
  // 1. Coba ambil dari Supabase live jika terkonfigurasi
  if (isServerSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseAdmin
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data as Wallet[];
      }
    } catch (e) {
      console.warn('[API AI Chat] Supabase query notice, fallback to serverStore:', e);
    }
  }

  // 2. Ambil dari serverStore
  const storeWallets = serverStore.getWallets(userId);
  if (storeWallets && storeWallets.length > 0) {
    return storeWallets;
  }

  // 3. Fallback jika dikirimkan oleh client
  if (clientWallets && Array.isArray(clientWallets) && clientWallets.length > 0) {
    return clientWallets;
  }

  // 4. Default fallback jika belum ada dompet sama sekali
  return [
    {
      id: 'wal_default',
      user_id: userId,
      name: 'Dompet Utama',
      type: 'bank',
      balance: 0,
      is_default: true,
      color: '#0284c7',
      icon: 'landmark',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, userId = 'usr_demo_123', wallets: clientWallets } = body || {};

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ ok: false, error: 'Pesan tidak boleh kosong' }, { status: 400 });
    }

    const cleanInput = message.trim();
    const qLower = cleanInput.toLowerCase();

    // 1. Ambil Data Dompet Pengguna (Real Wallets) dari Supabase / Server
    const userWallets = await fetchActiveUserWallets(userId, clientWallets);
    const totalBalance = userWallets.reduce((s, w) => s + (w.balance || 0), 0);

    // Format string konteks dompet riil untuk AI System Prompt:
    // Contoh: 'Daftar dompet pengguna yang tersedia: [BCA (Saldo: Rp...), GoPay (Saldo: Rp...), Dompet Utama (Saldo: Rp...)]'
    const walletSummary = userWallets
      .map((w) => `${w.name} (Saldo: ${formatRupiah(w.balance)})`)
      .join(', ');
    const systemContextString = `Daftar dompet pengguna yang tersedia: [${walletSummary}]`;

    // Buat system prompt dinamis dengan konteks dompet riil pengguna
    const dynamicSystemPrompt = buildTataAiSystemPrompt(userWallets);

    // 2. Periksa apakah pesan merupakan transaksi pemasukan atau pengeluaran
    // (misal: "gajian 5jt", "bonus 2jt", "terima transfer 500k", "kopi 15k", "cilok 2rb")
    const txIntent = parseTransactionIntent(cleanInput, userWallets);
    if (txIntent) {
      return NextResponse.json({
        ok: true,
        reply: txIntent.replyText,
        actionPayload: txIntent.payload,
        transactionType: txIntent.type,
        systemContext: systemContextString,
      });
    }

    // 3. Respon konsultasi finansial umum (tanpa blok JSON)
    let replyText = `Halo! Saya Tata AI, asisten keuangan pribadimu.\n\n${systemContextString}.\nTotal saldo aktifmu saat ini adalah **${formatRupiah(totalBalance)}**.\n\nKamu bisa mencatat transaksi kapan saja cukup dengan mengetik:\n• Pengeluaran: *nama barang* dan *nominal* (contoh: *"kopi 15k"* atau *"cilok 2rb"*)\n• Pemasukan: *sumber dana* dan *nominal* (contoh: *"gajian 5jt"* atau *"bonus 2jt"*).`;

    if (qLower.includes('saldo') || qLower.includes('dompet')) {
      const list = userWallets.map((w) => `• **${w.name}**: ${formatRupiah(w.balance)}`).join('\n');
      replyText = `Total saldo aktif di seluruh dompetmu saat ini adalah **${formatRupiah(totalBalance)}**.\n\nRincian dompet aktif:\n${list}`;
    } else if (qLower.includes('boros') || qLower.includes('aman') || qLower.includes('analisis') || qLower.includes('evaluasi')) {
      replyText = `📊 **Evaluasi Finansial Tata AI**:\n\nKondisi keuanganmu saat ini berada dalam rentang sehat dengan ${userWallets.length} dompet aktif.\nPastikan rasio pengeluaran tetap berada di bawah 70% dari pemasukan bulanan untuk menjaga stabilitas arus kas.`;
    } else if (qLower.includes('tips') || qLower.includes('hemat')) {
      replyText = `💡 **Tips Finansial dari Tata AI**:\n\n1. Selalu catat pengeluaran kecil secara rutin agar tidak menumpuk tanpa disadari.\n2. Alokasikan 20% pemasukan awal untuk tabungan darurat sebelum belanja keinginan.\n3. Gunakan fitur Budget untuk memantau batas pengeluaran kategori setiap minggu.`;
    } else if (qLower.includes('laptop') || qLower.includes('nabung') || qLower.includes('target')) {
      replyText = `🎯 **Simulasi Target Finansial**:\n\nUntuk mencapai target tabungan, sisihkan dana secara konsisten di dompet khusus dan evaluasi mutasi saldo setiap akhir pekan.`;
    }

    return NextResponse.json({
      ok: true,
      reply: replyText,
      systemContext: systemContextString,
    });
  } catch (error: any) {
    console.error('[API AI Chat] Error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}
