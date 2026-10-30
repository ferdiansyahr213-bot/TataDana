'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/dashboard/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { formatRupiah } from '@/lib/utils/currency';
import { 
  Bot, 
  Send, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Lightbulb, 
  RefreshCcw, 
  User, 
  CheckCircle2,
  Clock,
  CreditCard
} from 'lucide-react';
import { 
  Transaction, 
  Wallet, 
  Category, 
  Budget, 
  UserProfile, 
  InitiatePaymentPayload,
  RecordIncomePayload,
  TataAiActionPayload
} from '@/lib/types';
import { 
  parseTransactionIntent, 
  parsePurchaseIntent, 
  parseIncomeIntent, 
  extractActionPayloadFromMessage 
} from '@/lib/ai/provider-manager';
import { PaymentActionCard } from '@/components/chat/PaymentActionCard';
import { IncomeActionCard } from '@/components/chat/IncomeActionCard';
import { UpgradeProModal } from '@/components/dashboard/UpgradeProModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  getCurrentUserProfile, 
  fetchUserWallets, 
  fetchUserTransactions, 
  fetchUserBudgets, 
  fetchUserCategories, 
  insertTransaction, 
  subscribeToTransactions 
} from '@/lib/supabase/data-service';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  actionPayload?: TataAiActionPayload | any;
  paymentPayload?: any;
  paymentStatus?: 'pending' | 'success';
  chosenMethod?: string;
}

export default function TataAiChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    try {
      const paramId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('impersonate') || new URLSearchParams(window.location.search).get('userId') || sessionStorage.getItem('current_user_id') : null;
      const activeUser = await getCurrentUserProfile(paramId);
      setUser(activeUser);

      // Fetch seluruh data dari Supabase
      const [wls, txs, bgts, cats] = await Promise.all([
        fetchUserWallets(activeUser.id),
        fetchUserTransactions(activeUser.id),
        fetchUserBudgets(activeUser.id),
        fetchUserCategories(activeUser.id),
      ]);

      setWallets(wls);
      setTransactions(txs);
      setBudgets(bgts);
      setCategories(cats);

      // Greeting dinamis dengan nama asli user aktif
      setMessages((prev) => {
        if (prev.length > 0) return prev;
        return [
          {
            id: 'msg_welcome',
            sender: 'bot',
            text: `Halo **${activeUser.full_name?.split(' ')[0] || 'Kawan'}**! 👋 Saya **Tata AI**, penasihat keuangan cerdas pribadimu.\n\nSaya memantau seluruh dompet, transaksi, dan anggaranmu secara real-time dari Supabase. Kamu bisa bertanya apa saja, misalnya evaluasi keuangan bulan ini, tips menghemat, atau mencatat transaksi baru ("cilok 2rb"). Ada yang ingin kamu diskusikan hari ini?`,
            timestamp: 'Sekarang',
          },
        ];
      });
    } catch (e) {
      console.error('loadData ai-chat error:', e);
    }
  };

  useEffect(() => {
    loadData();

    // Supabase Realtime Subscription untuk tabel transactions
    const paramId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('impersonate') || new URLSearchParams(window.location.search).get('userId') || sessionStorage.getItem('current_user_id') : null;
    const targetUserId = paramId || 'usr_demo_123';

    const unsubscribe = subscribeToTransactions(targetUserId, () => {
      loadData();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const quickPrompts = [
    '💰 gajian 5jt',
    '🎁 bonus freelance 1.5jt',
    '🍢 cilok 2rb',
    '☕ kopi susu 15k',
    '📱 pulsa 50rb',
    '💡 Analisis apakah pengeluaranku bulan ini aman atau boros?',
    '🎯 Kalau mau beli laptop 15jt dalam 6 bulan, berapa harus saya tabung?',
    '🍜 Tips menghemat anggaran kategori Makanan bulan ini',
    '👛 Berapa total saldo aktif saya di semua dompet saat ini?',
  ];

  const generateAiReply = (query: string): string => {
    const q = query.toLowerCase();

    // 1. Saldo & Dompet
    if (q.includes('saldo') || q.includes('dompet')) {
      const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
      const list = wallets.map((w) => `• **${w.name}**: ${formatRupiah(w.balance)}${w.is_default ? ' *(Default)*' : ''}`).join('\n');
      return `Total saldo aktifmu di seluruh dompet saat ini adalah **${formatRupiah(totalBalance)}**.\n\nRincian per dompet:\n${list}\n\n💡 *Saran*: Pastikan saldo dompet kas operasional harian cukup sebelum melakukan pengeluaran besar ya!`;
    }

    // 2. Simulasi Tabungan / Pembelian barang
    if (q.includes('laptop') || q.includes('nabung') || q.includes('beli') || q.includes('target')) {
      return `Untuk target pembelian **Laptop Rp15.000.000 dalam 6 bulan**:\n\n1. **Nominal Tabungan**: Kamu perlu menyisihkan **Rp2.500.000 per bulan** (atau sekitar **Rp625.000 per minggu**).\n2. **Rekomendasi Alokasi**: Sisihkan langsung pada tanggal gajian ke dompet tabungan khusus terpisah (jangan dicampur ke rekening operasional BCA).\n3. **Optimasi Anggaran**: Dengan memangkas 15% dari kategori Hiburan & Ngopi, targetmu akan tercapai lebih cepat! 💪`;
    }

    // 3. Evaluasi Boros / Hemat
    if (q.includes('boros') || q.includes('aman') || q.includes('analisis') || q.includes('evaluasi')) {
      const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const ratio = totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : 0;

      return `📊 **Hasil Evaluasi Finansial Bulan Ini**:\n\n• **Total Pemasukan**: ${formatRupiah(totalIncome)}\n• **Total Pengeluaran**: ${formatRupiah(totalExpense)}\n• **Rasio Pengeluaran**: **${ratio}%** dari total pendapatan\n\n${
        ratio > 80
          ? '⚠️ *Perhatian*: Rasio pengeluaranmu sudah melampaui 80%! Ini indikasi mendekati batas boros. Tahan pembelian non-primer di akhir bulan.'
          : '👍 *Kabar Baik*: Rasio pengeluaranmu masih di batas sehat (<70%). Terus pertahankan ritme pencatatan ini!'
      }\n\n💡 *Fokus*: Pantau budget kategori Makanan yang sudah terpakai lebih dari separuh.`;
    }

    // 4. Tips Makanan / Kategori
    if (q.includes('makan') || q.includes('hemat') || q.includes('tips')) {
      return `🍜 **3 Tips Menghemat Kategori Makanan & Ngopi**:\n\n1. **Terapkan Aturan 3x Seminggu**: Batasi jajan pesan antar makanan online maksimal 3 kali seminggu, selebihnya masak atau beli lauk langsung.\n2. **Ganti Kopi Kafe**: Ganti kopi susu kafe (Rp25rb-35rb) dengan cold brew botolan untuk 3 hari hemat Rp300rb/bulan.\n3. **Catat Setiap Bon**: Setiap beli makan siang ketik langsung di bot Telegram agar tidak terlewat Rp10rb-20rb kecil yang menumpuk.`;
    }

    // General Answer
    return `Terima kasih atas pertanyaannya! 💡\n\nBerdasarkan data keuanganmu di TataDana, cara paling efektif menjaga kondisi finansial tetap sehat adalah dengan rutin mencatat transaksi langsung via Telegram setiap kali bertransaksi, dan menjaga pengeluaran tidak melebihi 70% dari pemasukan bulanan.\n\nAda hal spesifik lain tentang dompet, budget, atau strategi menabung yang ingin kamu tanyakan?`;
  };

  const executeTransaction = async (
    payload: {
      wallet_id: string;
      amount: number;
      description?: string;
      category?: string;
      item?: string;
      title?: string;
      wallet_name?: string;
      type?: 'expense' | 'income';
    },
    messageId?: string
  ) => {
    const txType = payload.type || 'expense';

    // 1. Validasi Ketat: Hilangkan fallback default dompet sepihak
    if (!payload.wallet_id || typeof payload.wallet_id !== 'string' || payload.wallet_id.trim() === '') {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot_err_${Date.now()}`,
          sender: 'bot',
          text: '❌ **Gagal Memproses Transaksi**: Tidak ada `wallet_id` yang dipilih. Silakan pilih dompet yang valid.',
          timestamp: 'Sekarang',
        },
      ]);
      return;
    }

    // 2. Cari dompet spesifik HANYA berdasarkan wallet_id yang dikirimkan pengguna
    const targetWallet = wallets.find((w) => w.id === payload.wallet_id);

    if (!targetWallet) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot_err_${Date.now()}`,
          sender: 'bot',
          text: `❌ **Gagal Memproses Transaksi**: Dompet dengan ID \`${payload.wallet_id}\` tidak ditemukan pada akun Anda. Transaksi dibatalkan untuk mencegah manipulasi saldo sembarangan.`,
          timestamp: 'Sekarang',
        },
      ]);
      return;
    }

    const walletDisplayName = targetWallet.name;
    const itemName = payload.description || payload.title || payload.item || (txType === 'income' ? 'Pemasukan' : 'Pembelian');
    const amountVal = payload.amount;

    if (messageId) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, paymentStatus: 'success', chosenMethod: walletDisplayName } : m
        )
      );
    }

    let targetCategory = categories.find(
      (c) =>
        (payload.category && c.name.toLowerCase().includes(payload.category.toLowerCase())) ||
        (txType === 'income' && c.type === 'income') ||
        (txType === 'expense' && c.type === 'expense' && payload.category && c.name.toLowerCase().includes(payload.category.toLowerCase()))
    );

    if (!targetCategory) {
      targetCategory =
        categories.find((c) => c.type === txType) ||
        categories[0] ||
        { id: 'cat_1', name: payload.category || (txType === 'income' ? 'Gaji / Pendapatan' : 'Belanja'), emoji: txType === 'income' ? '💰' : '🛍️' };
    }

    try {
      const requestPayload = {
        user_id: user?.id || 'usr_demo_123',
        wallet_id: targetWallet.id, // WAJIB wallet_id spesifik dari tombol pilihan pengguna
        wallet_name: walletDisplayName,
        category_id: targetCategory.id,
        category_name: targetCategory.name,
        category_emoji: targetCategory.emoji || (txType === 'income' ? '💰' : '🛍️'),
        type: txType,
        amount: amountVal,
        notes: txType === 'income' ? `${itemName} (masuk ke ${walletDisplayName})` : `${itemName} (via ${walletDisplayName})`,
        source: 'web' as const,
        transaction_date: new Date().toISOString(),
      };

      const res = await insertTransaction(user?.id || 'usr_demo_123', requestPayload);

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot_err_${Date.now()}`,
            sender: 'bot',
            text: `❌ **Gagal Memproses Transaksi**: ${res.error || 'Terjadi kesalahan sistem'}`,
            timestamp: 'Sekarang',
          },
        ]);
        return;
      }

      await loadData();
      const formattedAmt = new Intl.NumberFormat('id-ID').format(amountVal);
      const newBalance = txType === 'income'
        ? (targetWallet.balance || 0) + amountVal
        : (targetWallet.balance || 0) - amountVal;

      if (txType === 'income') {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot_inc_${Date.now()}`,
            sender: 'bot',
            text: `🎉 Pemasukan **${itemName}** sebesar **Rp ${formattedAmt}** berhasil ditambahkan ke **${walletDisplayName}**! Saldo dompet **${walletDisplayName}** (ID: \`${targetWallet.id}\`) sekarang menjadi **${formatRupiah(newBalance)}**.`,
            timestamp: 'Sekarang',
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot_pay_${Date.now()}`,
            sender: 'bot',
            text: `✅ Pembayaran **${itemName}** sebesar **Rp ${formattedAmt}** via **${walletDisplayName}** berhasil dicatat ke Supabase! Saldo dompet **${walletDisplayName}** (ID: \`${targetWallet.id}\`) sekarang menjadi **${formatRupiah(newBalance)}**.`,
            timestamp: 'Sekarang',
          },
        ]);
      }
    } catch (err: any) {
      console.error('Error executing transaction:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot_err_${Date.now()}`,
          sender: 'bot',
          text: `❌ **Gagal Memproses Transaksi**: ${err.message || 'Koneksi bermasalah'}`,
          timestamp: 'Sekarang',
        },
      ]);
    }
  };

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: 'Sekarang',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // 1. Periksa apakah pengguna sedang merespons pilihan dompet yang tertunda
    const lastPending = [...messages].reverse().find(
      (m) => m.sender === 'bot' && (m.actionPayload || m.paymentPayload) && m.paymentStatus === 'pending'
    );

    if (lastPending) {
      const pendingData = lastPending.actionPayload || lastPending.paymentPayload;
      if (pendingData && pendingData.data) {
        const qLower = text.toLowerCase().trim();
        let matchedWallet: Wallet | undefined;

        // Cek berdasarkan nomor urut (1, 2, 3...)
        const numMatch = qLower.match(/^([1-9]\d*)\.?$/);
        if (numMatch) {
          const idx = parseInt(numMatch[1], 10) - 1;
          if (idx >= 0 && idx < wallets.length) {
            matchedWallet = wallets[idx];
          }
        }

        // Cek berdasarkan nama dompet riil pengguna
        if (!matchedWallet) {
          matchedWallet = wallets.find(
            (w) => qLower.includes(w.name.toLowerCase()) || w.name.toLowerCase().includes(qLower)
          );
        }

        // Cek kata kunci tunai / cash
        if (!matchedWallet && (qLower.includes('tunai') || qLower.includes('cash') || qLower.includes('manual'))) {
          matchedWallet = wallets.find((w) => w.type === 'cash' || /tunai|cash|kas/i.test(w.name));
        }

        if (matchedWallet) {
          const isPendingIncome = pendingData.action === 'RECORD_INCOME' || pendingData.data?.type === 'income';
          const pendingAmount = pendingData.data.amount;
          const pendingItem = pendingData.data.title || pendingData.data.item || 'Transaksi';
          const pendingCategory = pendingData.data.category;

          setTimeout(() => {
            executeTransaction(
              {
                wallet_id: matchedWallet!.id,
                amount: pendingAmount,
                description: pendingItem,
                category: pendingCategory,
                wallet_name: matchedWallet!.name,
                type: isPendingIncome ? 'income' : 'expense',
              },
              lastPending.id
            );
            setIsTyping(false);
          }, 400);
          return;
        } else {
          // Minta klarifikasi ke pengguna
          setTimeout(() => {
            const list = wallets.map((w, i) => `${i + 1}. **${w.name}** (${formatRupiah(w.balance)})`).join('\n');
            setMessages((prev) => [
              ...prev,
              {
                id: `bot_clarify_${Date.now()}`,
                sender: 'bot',
                text: `⚠️ Pilihan dompet "${text}" belum cocok dengan daftar dompet aktifmu. Silakan klik tombol dompet di kartu di atas atau ketik nama/nomor:\n\n${list}`,
                timestamp: 'Sekarang',
              },
            ]);
            setIsTyping(false);
          }, 300);
          return;
        }
      }
    }

    // 2. Hubungkan ke API route handler /api/ai/chat dengan mengirimkan daftar dompet riil
    (async () => {
      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            userId: user?.id || 'usr_demo_123',
            wallets,
          }),
        });
        const data = await res.json();
        if (data.ok && data.reply) {
          const botMsg: ChatMessage = {
            id: `bot_${Date.now()}`,
            sender: 'bot',
            text: data.reply,
            timestamp: 'Sekarang',
            actionPayload: data.actionPayload,
            paymentPayload: data.actionPayload,
            paymentStatus: data.actionPayload ? 'pending' : undefined,
          };
          setMessages((prev) => [...prev, botMsg]);
          setIsTyping(false);
          return;
        }
      } catch (err) {
        console.warn('API /api/ai/chat notice, fallback ke parser internal:', err);
      }

      // 3. Fallback jika offline dengan parser terpadu (income & expense)
      const txIntent = parseTransactionIntent(text, wallets);
      if (txIntent) {
        const { cleanText, payload } = extractActionPayloadFromMessage(txIntent.replyText);
        setMessages((prev) => [
          ...prev,
          {
            id: `bot_${Date.now()}`,
            sender: 'bot',
            text: cleanText,
            timestamp: 'Sekarang',
            actionPayload: payload || txIntent.payload,
            paymentPayload: payload || txIntent.payload,
            paymentStatus: 'pending',
          },
        ]);
        setIsTyping(false);
        return;
      }

      const replyRaw = generateAiReply(text);
      const { cleanText, payload } = extractActionPayloadFromMessage(replyRaw);
      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        sender: 'bot',
        text: cleanText,
        timestamp: 'Sekarang',
        actionPayload: payload,
        paymentPayload: payload,
        paymentStatus: payload ? 'pending' : undefined,
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    })();
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl mx-auto w-full">
      <Header
        title="Tata AI Financial Assistant"
        subtitle="Konsultasikan perencanaan keuangan, evaluasi budget, dan strategi tabungan bersama AI"
        userPlan={user?.plan}
        user={user ? { id: user.id, fullName: user.full_name, email: user.email, phone: user.phone_number } : null}
        onUpgradeClick={() => setIsUpgradeModalOpen(true)}
      />

      {/* Main Chat Box */}
      <Card className="p-0 border-slate-200 overflow-hidden flex flex-col h-[650px] shadow-sm">
        {/* Chat Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-brand-600 via-brand-500 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl border border-white/30 shadow-inner">
              🤖
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base text-white">Tata AI Financial Bot</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-brand-600 uppercase">
                  Online
                </span>
              </div>
              <p className="text-[11px] text-blue-100">
                Terhubung dengan data dompet & transaksi real-time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user?.plan !== 'pro' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsUpgradeModalOpen(true)}
                className="bg-white/10 hover:bg-white/20 text-white border-white/30 text-xs gap-1.5 font-bold shadow-xs backdrop-blur-sm"
                title="Upgrade ke TataDana Pro via WhatsApp Admin"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>Upgrade ke Pro</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setMessages([
                  {
                    id: `welcome_${Date.now()}`,
                    sender: 'bot',
                    text: 'Obrolan telah di-reset. Apa yang ingin kamu diskusikan tentang keuanganmu hari ini?',
                    timestamp: 'Sekarang',
                  },
                ]);
              }}
              className="text-white hover:bg-white/10 text-xs gap-1"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              <span>Reset Chat</span>
            </Button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50">
          {messages.map((m) => {
            const isBot = m.sender === 'bot';
            // Ekstrak data JSON sebelum dihapus
            let actionData: any = m.actionPayload || m.paymentPayload || null;
            const jsonMatch = m.text.match(/```(?:json)?\s*(\{[\s\S]*?"action"[\s\S]*?\})\s*```/i);
            if (jsonMatch) {
              try {
                actionData = JSON.parse(jsonMatch[1]);
              } catch (e) {
                console.error('Gagal parse action JSON', e);
              }
            }

            // Pembersihan Regex Ketat di Frontend Chat Component:
            // Hapus blok ```json ... ``` atau ``` ... ``` yang berisi action JSON
            const cleanedMessage = m.text
              .replace(/```(?:json)?\s*\{[\s\S]*?"action"[\s\S]*?\}\s*```/gi, '')
              .replace(/\{[\s\S]*?"action"\s*:\s*"(?:INITIATE_PAYMENT|RECORD_INCOME)"[\s\S]*?\}/gi, '')
              .replace(/\n*Pilihan metode:\s*\n*(?:[1-9]\d*\.[^\n]*\n*)+/gi, '')
              .replace(/\n*Pilihan metode:\s*$/gi, '')
              .replace(/\n*Silakan pilih dompet tujuan penerimaan:\s*\n*(?:[1-9]\d*\.[^\n]*\n*)+/gi, '')
              .replace(/\n*Silakan pilih dompet tujuan penerimaan:\s*$/gi, '')
              .trim();

            const isIncomeAction =
              actionData?.action === 'RECORD_INCOME' ||
              actionData?.data?.type === 'income';

            return (
              <div
                key={m.id}
                className={`flex gap-3 items-start ${isBot ? 'justify-start' : 'justify-end'}`}
              >
                {isBot && (
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-brand-600 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-200">
                    🤖
                  </div>
                )}

                <div className={`flex flex-col gap-2 max-w-[85%] sm:max-w-[75%] ${isBot ? 'items-start' : 'items-end'}`}>
                  {/* Gelembung teks chat murni dengan parser ReactMarkdown */}
                  <div
                    className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      isBot
                        ? 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-sm shadow-sm'
                        : 'bg-brand-500 text-white rounded-tr-sm shadow-md font-medium'
                    }`}
                  >
                    <div className="chat-markdown prose-sm max-w-none break-words">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          strong: ({ children }) => (
                            <strong
                              className={`font-extrabold ${
                                isBot ? 'text-slate-900 font-bold' : 'text-white font-bold'
                              }`}
                            >
                              {children}
                            </strong>
                          ),
                          em: ({ children }) => (
                            <em className={`italic ${isBot ? 'text-slate-700' : 'text-blue-100'}`}>
                              {children}
                            </em>
                          ),
                          code: ({ children }) => (
                            <code
                              className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold ${
                                isBot
                                  ? 'bg-slate-100 text-pink-600 border border-slate-200'
                                  : 'bg-white/20 text-white border border-white/30'
                              }`}
                            >
                              {children}
                            </code>
                          ),
                          p: ({ children }) => (
                            <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc list-inside mb-2 space-y-1 pl-1">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal list-inside mb-2 space-y-1 pl-1">{children}</ol>
                          ),
                          li: ({ children }) => (
                            <li className="leading-relaxed">{children}</li>
                          ),
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`underline font-medium hover:opacity-80 transition-opacity ${
                                isBot ? 'text-brand-600' : 'text-white'
                              }`}
                            >
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {cleanedMessage}
                      </ReactMarkdown>
                    </div>
                    <span
                      className={`block text-[10px] mt-1.5 text-right ${
                        isBot ? 'text-slate-400' : 'text-blue-200'
                      }`}
                    >
                      {m.timestamp}
                    </span>
                  </div>

                  {/* Render komponen kartu aksi secara terpisah di luar gelembung teks chat */}
                  {actionData && (
                    isIncomeAction ? (
                      <IncomeActionCard
                        data={actionData}
                        status={m.paymentStatus}
                        chosenMethod={m.chosenMethod}
                        onSelectWallet={(payload) => executeTransaction(payload, m.id)}
                        wallets={wallets}
                      />
                    ) : (
                      <PaymentActionCard
                        data={actionData}
                        status={m.paymentStatus}
                        chosenMethod={m.chosenMethod}
                        onSelectMethod={(payload) => executeTransaction({ ...payload, type: 'expense' }, m.id)}
                        wallets={wallets}
                      />
                    )
                  )}
                </div>

                {!isBot && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isTyping && (
            <div className="flex gap-3 items-center text-slate-400 text-xs">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-brand-600 flex items-center justify-center text-sm shrink-0">
                🤖
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 rounded-tl-sm flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse delay-150" />
                <span className="w-2 h-2 rounded-full bg-brand-300 animate-pulse delay-300" />
                <span className="text-[11px] font-medium text-slate-500 ml-1">Tata AI sedang menganalisis...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompt Suggestions */}
        <div className="px-6 py-2.5 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto custom-scrollbar">
          <span className="text-[11px] font-bold text-slate-400 shrink-0">Saran Tanya:</span>
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p)}
              className="text-[11px] whitespace-nowrap bg-blue-50 hover:bg-blue-100 text-brand-700 px-3 py-1 rounded-full border border-blue-200 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Tanyakan analisis keuangan, tips hemat, atau simulasi tabungan..."
              className="flex-1 text-sm bg-slate-50 border-slate-200 focus:bg-white"
            />
            <Button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className="bg-brand-500 hover:bg-brand-600 text-white gap-1 px-5"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Kirim</span>
            </Button>
          </form>
        </div>
      </Card>

      {/* Upgrade Pro WhatsApp Direct Modal */}
      <UpgradeProModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        user={user ? { id: user.id, fullName: user.full_name, email: user.email, phone: user.phone_number } : null}
      />
    </div>
  );
}
