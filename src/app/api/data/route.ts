import { NextRequest, NextResponse } from 'next/server';
import { serverStore } from '@/lib/supabase/server';
import { getCurrentMonthPeriodWIB } from '@/lib/utils/date-wib';
import { supabase, isLiveSupabaseConfigured } from '@/lib/supabase/client';
import { normalizePhoneNumber, checkUserDuplicateInDb, getSqliteDb } from '@/lib/storage/local-db';
import type { Category } from '@/lib/types';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const requestedId = url.searchParams.get('userId');

  let user = requestedId 
    ? (serverStore.users.get(requestedId) || serverStore.getUserByIdentifier(requestedId))
    : undefined;

  if (!user) {
    user = serverStore.users.get('usr_demo_123') || Array.from(serverStore.users.values())[0];
  }

  return NextResponse.json({
    ok: true,
    user,
    wallets: serverStore.getWallets(user.id),
    categories: serverStore.getCategories(user.id),
    budgets: serverStore.getBudgets(user.id),
    transactions: serverStore.getTransactions(user.id),
    exports: serverStore.exports.filter(e => e.user_id === user.id),
    aiLogs: serverStore.aiLogs,
    aiProviders: serverStore.aiProviders,
    aiSettings: serverStore.aiSettings,
    payments: serverStore.payments,
    allUsers: Array.from(serverStore.users.values()),
    settings: Object.fromEntries(serverStore.settings.entries()),
    userApprovals: Array.from(serverStore.userApprovals.values()),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload, userId } = body;
    const effectiveUserId = userId || 'usr_demo_123';
    let user = serverStore.users.get(effectiveUserId) || serverStore.getUserByIdentifier(effectiveUserId);

    if (action === 'register_user') {
      const { fullName, phone, email, password } = payload || {};
      const cleanName = (fullName || '').trim();
      const cleanEmail = (email || '').trim().toLowerCase();
      const stdPhone = normalizePhoneNumber(phone);

      if (!cleanName || !password || !cleanEmail || !stdPhone) {
        return NextResponse.json({ ok: false, error: 'Semua kolom pendaftaran wajib diisi' }, { status: 400 });
      }

      // 1. Pengecekan Duplikasi Email
      const emailDup = serverStore.getUserByEmail(cleanEmail) || checkUserDuplicateInDb(cleanEmail, undefined).isDuplicate;
      if (emailDup) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Email ini sudah terdaftar. Silakan gunakan email lain atau masuk ke akun Anda.',
            field: 'email',
          },
          { status: 409 }
        );
      }

      // 2. Pengecekan Duplikasi Nomor Handphone (Format 08... dan +628...)
      const phoneDup = serverStore.getUserByPhone(stdPhone) || checkUserDuplicateInDb(undefined, stdPhone).isDuplicate;
      if (phoneDup) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Nomor handphone ini sudah terdaftar. Silakan gunakan nomor lain atau masuk ke akun Anda.',
            field: 'phone',
          },
          { status: 409 }
        );
      }

      // 3. Simpan akun baru
      try {
        const newUser = serverStore.registerNewUser({
          fullName: cleanName,
          phone: stdPhone,
          email: cleanEmail,
          password,
        });

        // If live Supabase is active, mirror to Supabase
        if (isLiveSupabaseConfigured()) {
          try {
            await supabase.from('user_approvals').insert([
              {
                full_name: newUser.full_name,
                email: newUser.email,
                phone_number: newUser.phone_number,
                status: newUser.verification_status === 'verified' ? 'approved' : 'pending',
              },
            ]);
          } catch (sbErr) {
            console.warn('[API Data] Live Supabase mirror notice:', sbErr);
          }
        }

        return NextResponse.json({
          ok: true,
          status: newUser.verification_status,
          message: newUser.verification_status === 'pending'
            ? 'Akun Anda sedang menunggu persetujuan admin sebelum dapat digunakan.'
            : 'Pendaftaran akun berhasil!',
          user: newUser,
          approvals: Array.from(serverStore.userApprovals.values()),
        });
      } catch (err: any) {
        return NextResponse.json(
          { ok: false, error: err.message || 'Gagal menyimpan pendaftaran.' },
          { status: 409 }
        );
      }
    }

    if (!user) {
      return NextResponse.json({ ok: false, error: 'User tidak ditemukan' }, { status: 404 });
    }

    if (action === 'create_transaction') {
      const { wallet_id, amount, type = 'expense' } = payload || {};

      // 1. Validasi Ketat: Hilangkan fallback default dompet sepihak
      if (!wallet_id || typeof wallet_id !== 'string' || wallet_id.trim() === '') {
        return NextResponse.json(
          {
            ok: false,
            error: 'wallet_id wajib disertakan. Transaksi ditolak untuk mencegah pemotongan dompet default secara sembarangan.',
          },
          { status: 400 }
        );
      }

      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return NextResponse.json(
          { ok: false, error: 'Nominal transaksi (amount) tidak valid' },
          { status: 400 }
        );
      }

      // 2. Verifikasi kepemilikan dompet pengguna
      const userWallets = serverStore.getWallets(effectiveUserId);
      const targetWallet = userWallets.find((w) => w.id === wallet_id);

      if (!targetWallet && !isLiveSupabaseConfigured()) {
        return NextResponse.json(
          {
            ok: false,
            error: `Dompet dengan ID '${wallet_id}' tidak ditemukan pada akun Anda. Pemotongan saldo dibatalkan.`,
          },
          { status: 404 }
        );
      }

      // 3. Jika live Supabase aktif, jalankan query UPDATE spesifik pada wallet_id tersebut
      if (isLiveSupabaseConfigured()) {
        try {
          const { data: w } = await supabase
            .from('wallets')
            .select('balance')
            .eq('id', wallet_id)
            .eq('user_id', effectiveUserId)
            .single();

          if (w) {
            const newBalance = type === 'income' ? w.balance + amount : w.balance - amount;
            await supabase
              .from('wallets')
              .update({ balance: newBalance, updated_at: new Date().toISOString() })
              .eq('id', wallet_id)
              .eq('user_id', effectiveUserId);
          } else if (!targetWallet) {
            return NextResponse.json(
              {
                ok: false,
                error: `Dompet dengan ID '${wallet_id}' tidak ditemukan di database Supabase.`,
              },
              { status: 404 }
            );
          }
        } catch (dbErr) {
          console.warn('[API Data] Supabase balance update notice:', dbErr);
        }
      }

      // 4. Eksekusi pemotongan saldo di backend serverStore HANYA pada target wallet_id
      const { transaction: newTx, budgetAlert } = serverStore.addTransaction({
        ...payload,
        wallet_id,
        wallet_name: targetWallet?.name || payload.wallet_name || 'Dompet Terpilih',
        user_id: effectiveUserId,
      });

      // If budget threshold 80% or 100% was crossed, trigger telegram notification
      if (budgetAlert && user.telegram_chat_id) {
        try {
          const { sendTelegramMessage } = await import('@/lib/telegram/client');
          const botToken = user.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN || 'demo_bot_token_tatadana';
          const alertEmoji = budgetAlert.is100 ? '🚨' : '⚡';
          const alertTitle = budgetAlert.is100 ? 'ALERT BUDGET 100%!' : 'ALERT BUDGET 80%!';
          const alertMsg = `${alertEmoji} *${alertTitle}*\n\nPengeluaran untuk kategori *${budgetAlert.budget.category_name}* telah mencapai *${budgetAlert.percent}%* dari anggaran bulanan!\n\n📊 Terpakai: Rp${budgetAlert.budget.spent.toLocaleString('id-ID')} / Rp${budgetAlert.budget.amount.toLocaleString('id-ID')}\n💡 ${budgetAlert.is100 ? 'Rem pengeluaran untuk kategori ini agar keuangan tetap aman sampai akhir bulan!' : 'Hati-hati, kendalikan pengeluaranmu!'}`;
          await sendTelegramMessage(botToken, user.telegram_chat_id, alertMsg);
        } catch (e) {
          console.warn('Failed to dispatch budget alert to telegram:', e);
        }
      }

      return NextResponse.json({ ok: true, transaction: newTx, budgetAlert });
    }

    if (action === 'complete_onboarding') {
      const persona = payload.persona || 'karyawan';
      let customCats: Category[] = [];

      if (persona === 'mahasiswa') {
        customCats = [
          { id: `cat_m1_${Date.now()}`, name: 'Makan & Minum', type: 'expense', emoji: '🍜', color: '#2563eb', is_custom: false },
          { id: `cat_m2_${Date.now()}`, name: 'Kosan & Tagihan', type: 'expense', emoji: '🏠', color: '#ef4444', is_custom: false },
          { id: `cat_m3_${Date.now()}`, name: 'Fotokopi & Buku Kuliah', type: 'expense', emoji: '📚', color: '#f59e0b', is_custom: false },
          { id: `cat_m4_${Date.now()}`, name: 'Nongkrong & Kafe', type: 'expense', emoji: '☕', color: '#8b5cf6', is_custom: false },
          { id: `cat_m5_${Date.now()}`, name: 'Bensin & Ojol', type: 'expense', emoji: '🛵', color: '#0284c7', is_custom: false },
          { id: `cat_m6_${Date.now()}`, name: 'Uang Saku & Kiriman', type: 'income', emoji: '💰', color: '#10b981', is_custom: false },
          { id: `cat_m7_${Date.now()}`, name: 'Beasiswa & Part-Time', type: 'income', emoji: '🎓', color: '#6366f1', is_custom: false },
        ];
      } else if (persona === 'freelancer') {
        customCats = [
          { id: `cat_f1_${Date.now()}`, name: 'Makan Harian', type: 'expense', emoji: '🍜', color: '#2563eb', is_custom: false },
          { id: `cat_f2_${Date.now()}`, name: 'Internet & Co-Working', type: 'expense', emoji: '💻', color: '#0284c7', is_custom: false },
          { id: `cat_f3_${Date.now()}`, name: 'Langganan Software & Tools', type: 'expense', emoji: '⚡', color: '#8b5cf6', is_custom: false },
          { id: `cat_f4_${Date.now()}`, name: 'Transportasi Meeting', type: 'expense', emoji: '🚗', color: '#10b981', is_custom: false },
          { id: `cat_f5_${Date.now()}`, name: 'Fee Project Klien', type: 'income', emoji: '💰', color: '#10b981', is_custom: false },
          { id: `cat_f6_${Date.now()}`, name: 'Royalti & Digital Product', type: 'income', emoji: '📈', color: '#f59e0b', is_custom: false },
        ];
      } else if (persona === 'bisnis') {
        customCats = [
          { id: `cat_b1_${Date.now()}`, name: 'Belanja Bahan & Stok', type: 'expense', emoji: '📦', color: '#2563eb', is_custom: false },
          { id: `cat_b2_${Date.now()}`, name: 'Operasional & Toko', type: 'expense', emoji: '🏬', color: '#ef4444', is_custom: false },
          { id: `cat_b3_${Date.now()}`, name: 'Ongkir & Logistik', type: 'expense', emoji: '🚚', color: '#0284c7', is_custom: false },
          { id: `cat_b4_${Date.now()}`, name: 'Iklan & Promosi', type: 'expense', emoji: '📣', color: '#8b5cf6', is_custom: false },
          { id: `cat_b5_${Date.now()}`, name: 'Omset Penjualan', type: 'income', emoji: '💰', color: '#10b981', is_custom: false },
          { id: `cat_b6_${Date.now()}`, name: 'Pemasukan Lainnya', type: 'income', emoji: '💼', color: '#10b981', is_custom: false },
        ];
      } else {
        // Default Karyawan
        customCats = [
          { id: `cat_k1_${Date.now()}`, name: 'Makanan & Makan Siang', type: 'expense', emoji: '🍜', color: '#2563eb', is_custom: false },
          { id: `cat_k2_${Date.now()}`, name: 'Transportasi & Bensin', type: 'expense', emoji: '🚗', color: '#0284c7', is_custom: false },
          { id: `cat_k3_${Date.now()}`, name: 'Tagihan Listrik & Wifi', type: 'expense', emoji: '🏠', color: '#ef4444', is_custom: false },
          { id: `cat_k4_${Date.now()}`, name: 'Hiburan Akhir Pekan', type: 'expense', emoji: '🎮', color: '#8b5cf6', is_custom: false },
          { id: `cat_k5_${Date.now()}`, name: 'Kesehatan & Vitamin', type: 'expense', emoji: '💊', color: '#10b981', is_custom: false },
          { id: `cat_k6_${Date.now()}`, name: 'Belanja Keperluan', type: 'expense', emoji: '👕', color: '#ec4899', is_custom: false },
          { id: `cat_k7_${Date.now()}`, name: 'Gaji Pokok', type: 'income', emoji: '💼', color: '#10b981', is_custom: false },
          { id: `cat_k8_${Date.now()}`, name: 'Bonus & Insentif', type: 'income', emoji: '💰', color: '#2563eb', is_custom: false },
        ];
      }

      serverStore.categories.set(effectiveUserId, customCats);
      user.onboarding_completed = true;
      user.updated_at = new Date().toISOString();
      serverStore.persist();

      return NextResponse.json({ ok: true, user, categories: customCats });
    }

    if (action === 'create_wallet') {
      const wallets = serverStore.getWallets(effectiveUserId);
      const newWallet = {
        ...payload,
        id: `wal_${Date.now()}`,
        user_id: effectiveUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (newWallet.is_default) {
        wallets.forEach(w => (w.is_default = false));
      }
      wallets.push(newWallet);
      serverStore.wallets.set(effectiveUserId, wallets);
      serverStore.persist();
      return NextResponse.json({ ok: true, wallet: newWallet });
    }

    if (action === 'set_default_wallet') {
      const wallets = serverStore.getWallets(effectiveUserId);
      wallets.forEach(w => {
        w.is_default = w.id === payload.walletId;
      });
      serverStore.wallets.set(effectiveUserId, wallets);
      serverStore.persist();
      return NextResponse.json({ ok: true, wallets });
    }

    if (action === 'delete_wallet') {
      let wallets = serverStore.getWallets(effectiveUserId);
      wallets = wallets.filter(w => w.id !== payload.walletId && w.id !== 'wal_01');
      serverStore.wallets.set(effectiveUserId, wallets);
      serverStore.persist();
      return NextResponse.json({ ok: true, wallets });
    }

    if (action === 'save_budget') {
      const budgets = serverStore.getBudgets(effectiveUserId);
      const targetPeriod = payload.period_type || 'monthly';
      const existingIdx = budgets.findIndex(
        b => b.category_id === payload.category_id && (b.period_type || 'monthly') === targetPeriod
      );
      if (existingIdx !== -1) {
        budgets[existingIdx].amount = payload.amount;
        budgets[existingIdx].period_type = targetPeriod;
      } else {
        budgets.push({
          id: `bud_${Date.now()}`,
          user_id: effectiveUserId,
          category_id: payload.category_id,
          category_name: payload.category_name,
          category_emoji: payload.category_emoji,
          category_color: payload.category_color,
          month_period: payload.month_period || getCurrentMonthPeriodWIB(),
          period_type: targetPeriod,
          amount: payload.amount,
          spent: payload.spent || 0,
        });
      }
      serverStore.budgets.set(effectiveUserId, budgets);
      serverStore.persist();
      return NextResponse.json({ ok: true, budgets });
    }

    if (action === 'update_user_plan') {
      const targetUser = serverStore.users.get(payload.targetUserId);
      if (targetUser) {
        targetUser.plan = payload.plan;
        targetUser.updated_at = new Date().toISOString();
        serverStore.persist();
        return NextResponse.json({ ok: true, user: targetUser });
      }
      return NextResponse.json({ ok: false, error: 'User tidak ditemukan' }, { status: 404 });
    }

    if (action === 'create_payment_simulation') {
      const newPay = {
        id: `pay_sim_${Date.now()}`,
        user_id: payload.targetUserId || 'usr_demo_123',
        user_name: payload.userName || 'Budi Santoso',
        plan: payload.plan || 'pro',
        amount: payload.amount || 99000,
        payment_method: payload.method || 'manual_transfer',
        status: 'pending' as const,
        manual_receipt_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      serverStore.payments.unshift(newPay);
      serverStore.persist();
      return NextResponse.json({ ok: true, payment: newPay, payments: serverStore.payments });
    }

    if (action === 'save_category') {
      const categories = serverStore.getCategories(effectiveUserId);
      const newCat = {
        ...payload,
        id: `cat_${Date.now()}`,
        user_id: effectiveUserId,
        is_custom: true,
      };
      categories.push(newCat);
      serverStore.categories.set(effectiveUserId, categories);
      serverStore.persist();
      return NextResponse.json({ ok: true, category: newCat });
    }

    if (action === 'update_profile') {
      if (!user) {
        user = serverStore.users.get('usr_admin_999') || Array.from(serverStore.users.values())[0];
      }

      if (user) {
        Object.assign(user, payload);
        user.updated_at = new Date().toISOString();

        if (payload.password) {
          user.password = payload.password;
          try {
            const db = getSqliteDb();
            if (db) {
              db.prepare('UPDATE users SET password = ?, updated_at = ? WHERE id = ?').run(
                payload.password,
                user.updated_at,
                user.id
              );
            }
          } catch (e: any) {
            console.warn('[update_profile] SQLite direct update notice:', e.message);
          }
        }

        // If user is admin/superadmin, keep system-wide admin contact settings in sync
        if (user.role === 'admin' || user.role === 'superadmin' || user.id === 'usr_admin_999') {
          if (payload.phone_number) {
            serverStore.setSetting('admin_wa_number', payload.phone_number);
            serverStore.setSetting('admin_phone_number', payload.phone_number);
          }
          if (payload.email) {
            serverStore.setSetting('admin_email', payload.email);
          }
        }

        serverStore.persist();
        return NextResponse.json({ 
          ok: true, 
          user, 
          settings: Object.fromEntries(serverStore.settings.entries()) 
        });
      }

      return NextResponse.json({ ok: false, error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    if (action === 'reset_user_password') {
      const { targetUserId, newPassword } = payload || {};
      if (!targetUserId || !newPassword) {
        return NextResponse.json({ ok: false, error: 'ID Pengguna dan kata sandi baru wajib disertakan' }, { status: 400 });
      }

      const cleanPassword = String(newPassword).trim();
      if (cleanPassword.length < 4) {
        return NextResponse.json({ ok: false, error: 'Kata sandi minimal 4 karakter' }, { status: 400 });
      }

      const targetUser = serverStore.users.get(targetUserId) || serverStore.getUserByIdentifier(targetUserId);
      if (!targetUser) {
        return NextResponse.json({ ok: false, error: 'Pengguna tidak ditemukan' }, { status: 404 });
      }

      targetUser.password = cleanPassword;
      targetUser.updated_at = new Date().toISOString();

      try {
        const db = getSqliteDb();
        if (db) {
          db.prepare('UPDATE users SET password = ?, updated_at = ? WHERE id = ?').run(
            cleanPassword,
            targetUser.updated_at,
            targetUser.id
          );
        }
      } catch (err: any) {
        console.warn('[reset_user_password] SQLite direct update notice:', err.message);
      }

      serverStore.persist();
      return NextResponse.json({
        ok: true,
        message: `Kata sandi untuk ${targetUser.full_name} berhasil direset secara permanen.`,
        user: {
          id: targetUser.id,
          full_name: targetUser.full_name,
          email: targetUser.email,
        }
      });
    }

    if (action === 'update_settings') {
      if (payload && typeof payload === 'object') {
        for (const [k, v] of Object.entries(payload)) {
          if (typeof v === 'string') {
            serverStore.setSetting(k, v);
          }
        }
        if (payload.admin_wa_number || payload.admin_phone_number) {
          const num = payload.admin_wa_number || payload.admin_phone_number;
          const admin = serverStore.users.get('usr_admin_999');
          if (admin) admin.phone_number = num;
        }
      }
      serverStore.persist();
      return NextResponse.json({ 
        ok: true, 
        settings: Object.fromEntries(serverStore.settings.entries()) 
      });
    }

    if (action === 'get_user_approvals') {
      return NextResponse.json({
        ok: true,
        approvals: Array.from(serverStore.userApprovals.values()),
      });
    }

    if (action === 'approve_user') {
      const targetId = payload.targetUserId || payload.id || payload.email;
      const res = serverStore.updateApprovalStatus(targetId, 'approved');
      if (res.user || res.approval) {
        return NextResponse.json({ 
          ok: true, 
          user: res.user, 
          approval: res.approval,
          approvals: Array.from(serverStore.userApprovals.values()),
          allUsers: Array.from(serverStore.users.values())
        });
      }
      return NextResponse.json({ ok: false, error: 'User tidak ditemukan' }, { status: 404 });
    }

    if (action === 'reject_user') {
      const targetId = payload.targetUserId || payload.id || payload.email;
      const res = serverStore.updateApprovalStatus(targetId, 'rejected');
      if (res.user || res.approval) {
        return NextResponse.json({ 
          ok: true, 
          user: res.user, 
          approval: res.approval,
          approvals: Array.from(serverStore.userApprovals.values()),
          allUsers: Array.from(serverStore.users.values())
        });
      }
      return NextResponse.json({ ok: false, error: 'User tidak ditemukan' }, { status: 404 });
    }

    if (action === 'check_or_login_user') {
      const { identifier, email, phone, password } = payload || {};
      const rawIdentifier = (identifier || email || phone || '').trim();
      const cleanEmail = rawIdentifier.toLowerCase();
      const digitsOnly = rawIdentifier.replace(/\D/g, '');
      const inputPassword = (password || '').trim();

      if (!rawIdentifier || !inputPassword) {
        return NextResponse.json({ ok: false, error: 'Email / Nomor Handphone dan kata sandi wajib diisi' }, { status: 400 });
      }

      // ====================================================================
      // 1. PRIORITAS UTAMA: VERIFIKASI AKUN ADMINISTRATOR UTAMA TATADANA
      // ====================================================================
      const adminEmail = (
        process.env.NEXT_PUBLIC_ADMIN_EMAIL ||
        process.env.DEFAULT_ADMIN_EMAIL ||
        'ferdiansyahr213@gmail.com'
      ).toLowerCase().trim();

      const existingAdmin = serverStore.users.get('usr_admin_999') || Array.from(serverStore.users.values()).find(u => u.role === 'superadmin');
      const envAdminPassword = process.env.ADMIN_PASSWORD?.trim();
      const validAdminPasswords = [
        existingAdmin?.password,
        envAdminPassword,
        'AdminTataDana123!',
        'Vina2007',
        'Vina1234',
        'admin123',
      ].filter(Boolean) as string[];
      const adminSavedPhone = existingAdmin?.phone_number || serverStore.getSetting('admin_wa_number') || process.env.NEXT_PUBLIC_ADMIN_WA_NUMBER || process.env.NEXT_PUBLIC_ADMIN_WA || '087730370324';
      const adminPhoneDigits = adminSavedPhone.replace(/\D/g, '');

      const isAttemptingAdmin = cleanEmail === adminEmail || 
        (digitsOnly.length >= 8 && adminPhoneDigits.endsWith(digitsOnly.slice(-9)));

      if (isAttemptingAdmin) {
        // Cek apakah password cocok dengan salah satu password admin yang valid
        const isPasswordMatch = validAdminPasswords.includes(inputPassword);

        if (isPasswordMatch) {
          const adminUser: any = existingAdmin || {
            id: 'usr_admin_999',
            full_name: 'Administrator TataDana',
            email: adminEmail,
            phone_number: adminSavedPhone,
            role: 'superadmin',
            verification_status: 'verified',
            plan: 'pro',
            password: inputPassword,
            telegram_connected: true,
            reminder_enabled: true,
            reminder_frequency: 1,
            reminder_time_1: '09:00:00',
            reminder_time_2: '20:00:00',
            onboarding_completed: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          adminUser.role = 'superadmin';
          adminUser.verification_status = 'verified';
          adminUser.password = inputPassword;
          if (!adminUser.phone_number || adminUser.phone_number === '081234567890') {
            adminUser.phone_number = adminSavedPhone;
          }
          serverStore.users.set('usr_admin_999', adminUser);
          serverStore.persist();

          return NextResponse.json({ ok: true, user: adminUser });
        }

        // Jika password belum cocok, coba cek apakah terdaftar di Supabase Auth live (jika aktif)
        if (isLiveSupabaseConfigured()) {
          try {
            const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password: inputPassword,
            });

            if (!authErr && authData?.user) {
              const meta = authData.user.user_metadata || {};
              const adminUser = {
                id: 'usr_admin_999',
                full_name: meta.full_name || meta.name || 'Administrator TataDana',
                email: adminEmail,
                phone_number: meta.phone || '081234567890',
                role: 'superadmin',
                verification_status: 'verified',
                plan: 'pro',
                telegram_connected: true,
                reminder_enabled: true,
                reminder_frequency: 1,
                reminder_time_1: '09:00:00',
                reminder_time_2: '20:00:00',
                onboarding_completed: true,
                created_at: authData.user.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              serverStore.users.set('usr_admin_999', adminUser as any);
              serverStore.persist();
              return NextResponse.json({ ok: true, user: adminUser });
            }
          } catch {
            // Abaikan kesalahan koneksi Supabase, lanjut return error yang jelas
          }
        }

        return NextResponse.json({ ok: false, error: 'Email atau kata sandi admin salah' }, { status: 401 });
      }

      // ====================================================================
      // 2. VERIFIKASI PENGGUNA UMUM (NON-ADMIN)
      // ====================================================================

      // A. Cek Supabase Auth jika live Supabase aktif
      if (isLiveSupabaseConfigured()) {
        try {
          const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: inputPassword,
          });

          if (!authErr && authData?.user) {
            const meta = authData.user.user_metadata || {};
            const isSuper = cleanEmail === adminEmail || meta.role === 'admin' || meta.role === 'superadmin';
            let liveUser = serverStore.users.get(authData.user.id) || {
              id: authData.user.id,
              full_name: meta.full_name || meta.name || (isSuper ? 'Administrator TataDana' : 'Pengguna TataDana'),
              email: authData.user.email || cleanEmail,
              phone_number: meta.phone || authData.user.phone || '081234567890',
              currency: 'IDR',
              role: isSuper ? 'superadmin' : (meta.role || 'user'),
              verification_status: isSuper ? 'verified' : (meta.verification_status || 'pending'),
              plan: meta.plan || 'pro',
              telegram_connected: Boolean(meta.telegram_connected),
              reminder_enabled: true,
              reminder_frequency: 1,
              reminder_time_1: '09:00:00',
              reminder_time_2: '20:00:00',
              onboarding_completed: true,
              created_at: authData.user.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            serverStore.users.set(authData.user.id, liveUser as any);
            return NextResponse.json({ ok: true, user: liveUser });
          }
        } catch (authException) {
          console.error('Supabase live auth error, using fallback:', authException);
        }
      }

      // B. Cek Database Store / Persistent Local Database (Email atau Nomor HP)
      const foundUser = serverStore.getUserByIdentifier(rawIdentifier);

      if (!foundUser) {
        return NextResponse.json({ ok: false, error: 'Email / Nomor Handphone atau kata sandi salah' }, { status: 401 });
      }

      // Validasi kata sandi jika tersimpan
      if (foundUser.password && foundUser.password !== inputPassword) {
        return NextResponse.json({ ok: false, error: 'Email / Nomor Handphone atau kata sandi salah' }, { status: 401 });
      }

      // Pengecekan status saat login: jika masih pending dan bukan admin, tolak akses
      if (foundUser.verification_status === 'pending' && foundUser.role !== 'admin' && foundUser.role !== 'superadmin') {
        return NextResponse.json(
          {
            ok: false,
            status: 'pending',
            error: 'Akun Anda sedang menunggu persetujuan admin sebelum dapat digunakan.',
            user: {
              id: foundUser.id,
              full_name: foundUser.full_name,
              email: foundUser.email,
              phone_number: foundUser.phone_number,
              role: foundUser.role,
              verification_status: 'pending',
            },
          },
          { status: 403 }
        );
      }

      return NextResponse.json({ ok: true, user: foundUser });
    }

    if (action === 'get_all_users') {
      const allUsers = Array.from(serverStore.users.values());
      return NextResponse.json({ ok: true, users: allUsers });
    }

    if (action === 'approve_payment') {
      const payIdx = serverStore.payments.findIndex(p => p.id === payload.paymentId);
      if (payIdx !== -1) {
        serverStore.payments[payIdx].status = 'success';
        const targetUser = serverStore.users.get(serverStore.payments[payIdx].user_id);
        if (targetUser) targetUser.plan = serverStore.payments[payIdx].plan;
        serverStore.persist();
      }
      return NextResponse.json({ ok: true, payments: serverStore.payments });
    }

    if (action === 'reject_payment') {
      const payIdx = serverStore.payments.findIndex(p => p.id === payload.paymentId);
      if (payIdx !== -1) {
        serverStore.payments[payIdx].status = 'rejected';
        serverStore.persist();
      }
      return NextResponse.json({ ok: true, payments: serverStore.payments });
    }

    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
