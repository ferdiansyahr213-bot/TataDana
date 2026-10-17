import { NextRequest, NextResponse } from 'next/server';
import { getCachedFile } from '@/lib/export/cache';
import { generateTransactionsPDFBuffer } from '@/lib/export/pdf';
import { generateTransactionsExcelBuffer } from '@/lib/export/excel';
import { serverStore } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing export id' }, { status: 400 });
  }

  const cached = getCachedFile(id);
  if (cached) {
    return new NextResponse(Buffer.from(cached.buffer), {
      status: 200,
      headers: {
        'Content-Type': cached.mime,
        'Content-Disposition': `attachment; filename="${cached.fileName}"`,
      },
    });
  }

  // If not in ephemeral cache, regenerate on demand
  const record = serverStore.exports.find(e => e.id === id);
  if (record) {
    const user = serverStore.users.get(record.user_id) || serverStore.users.get('usr_demo_123')!;
    const transactions = serverStore.getTransactions(user.id);
    let buffer: Uint8Array;
    let mime: string;

    if (record.file_type === 'excel') {
      buffer = generateTransactionsExcelBuffer(transactions, user.full_name);
      mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
      buffer = generateTransactionsPDFBuffer(transactions, user.full_name, record.period_range);
      mime = 'application/pdf';
    }

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `attachment; filename="${record.file_name}"`,
      },
    });
  }

  return NextResponse.json({ error: 'File export tidak ditemukan atau sudah kadaluarsa' }, { status: 404 });
}
