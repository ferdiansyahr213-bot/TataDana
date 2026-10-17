import { NextRequest, NextResponse } from 'next/server';
import { serverStore } from '@/lib/supabase/server';
import { canExportReports } from '@/lib/utils/plans';
import { generateTransactionsExcelBuffer } from '@/lib/export/excel';
import { generateTransactionsPDFBuffer } from '@/lib/export/pdf';
import { setCachedFile } from '@/lib/export/cache';

export async function POST(req: NextRequest) {
  try {
    const { fileType, periodRange, userId } = await req.json();
    const effectiveUserId = userId || 'usr_demo_123';
    const user = serverStore.users.get(effectiveUserId);

    if (!user) {
      return NextResponse.json({ ok: false, error: 'User tidak ditemukan' }, { status: 404 });
    }

    // Check Plan Permission (Pro only)
    const exportCheck = canExportReports(user.plan);
    if (!exportCheck.allowed) {
      return NextResponse.json({ ok: false, error: exportCheck.reason, isRestricted: true }, { status: 403 });
    }

    const transactions = serverStore.getTransactions(effectiveUserId);
    const dateStamp = new Date().toISOString().split('T')[0];
    const id = `exp_${Date.now()}`;

    let buffer: Uint8Array;
    let mime: string;
    let fileName: string;

    if (fileType === 'excel') {
      buffer = generateTransactionsExcelBuffer(transactions, user.full_name);
      mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      fileName = `TataDana-Laporan-${dateStamp}.xlsx`;
    } else {
      buffer = generateTransactionsPDFBuffer(transactions, user.full_name, periodRange || 'Semua Periode');
      mime = 'application/pdf';
      fileName = `TataDana-Laporan-${dateStamp}.pdf`;
    }

    // Cache in-memory for download
    setCachedFile(id, { buffer, mime, fileName });

    // Save record to export history
    const record = {
      id,
      user_id: effectiveUserId,
      file_type: fileType as 'pdf' | 'excel',
      period_range: periodRange || 'Semua Waktu',
      file_name: fileName,
      storage_path: `exports/${effectiveUserId}/${fileName}`,
      signed_url: `/api/reports/download?id=${id}`,
      expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
      created_at: new Date().toISOString(),
    };
    serverStore.exports.unshift(record);

    return NextResponse.json({
      ok: true,
      exportRecord: record,
      downloadUrl: `/api/reports/download?id=${id}`,
    });
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
