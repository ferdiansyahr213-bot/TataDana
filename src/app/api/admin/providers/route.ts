import { NextRequest, NextResponse } from 'next/server';
import { serverStore } from '@/lib/supabase/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    providers: serverStore.aiProviders,
    settings: serverStore.aiSettings,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { providers, settings } = await req.json();

    if (providers && Array.isArray(providers)) {
      serverStore.aiProviders = providers;
    }

    if (settings) {
      serverStore.aiSettings = settings;
    }

    return NextResponse.json({
      ok: true,
      message: 'Pengaturan AI multi-provider berhasil diperbarui',
      providers: serverStore.aiProviders,
      settings: serverStore.aiSettings,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
