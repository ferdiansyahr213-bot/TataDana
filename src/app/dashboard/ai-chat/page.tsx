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
import { Transaction, Wallet, Category, Budget, UserProfile, InitiatePaymentPayload } from '@/lib/types';
import { parsePurchaseIntent } from '@/lib/ai/provider-manager';
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
  paymentPayload?: InitiatePaymentPayload;
  paymentStatus?: 'pending' | 'success';
  chosenMethod?: string;
}

export default function TataAiChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
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

  const executePayment = async (
    method: 'TATADANA_WALLET' | 'QRIS' | 'BANK_TRANSFER' | 'CASH',
    data: { item: string; amount: number; category: string },
    messageId?: string
  ) => {
    const methodMap = {
      TATADANA_WALLET: 'Saldo TataDana',
      QRIS: 'QRIS',
      BANK_TRANSFER: 'Transfer Bank',
      CASH: 'Tunai / Catat Manual',
    };
    const methodLabel = methodMap[method] || 'Saldo TataDana';

    if (messageId) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, paymentStatus: 'success', chosenMethod: methodLabel } : m
        )
      );
    }

    const targetWallet =
      wallets.find((w) => (method === 'CASH' ? w.type === 'cash' : w.is_default)) || wallets[0];
    const targetCategory =
      categories.find(
        (c) =>
          c.name.toLowerCase().includes(data.category.toLowerCase()) ||
          (data.category === 'Food & Beverage' && c.name.toLowerCase().includes('makan')) ||
          (data.category === 'Utilities' && c.name.toLowerCase().includes('utilitas')) ||
          (data.category === 'Transport' && c.name.toLowerCase().includes('transport'))
      ) || categories[0];

    try {
      const payload = {
        wallet_id: targetWallet?.id || 'wal_1',
        wallet_name: targetWallet?.name,
        category_id: targetCategory?.id || 'cat_1',
        category_name: targetCategory?.name,
        category_emoji: targetCategory?.emoji,
        type: 'expense' as const,
        amount: data.amount,
        notes: `${data.item} (via ${methodLabel})`,
        source: 'web' as const,
        transaction_date: new Date().toISOString(),
      };

      const res = await insertTransaction(user?.id || 'usr_demo_123', payload);

      if (res.ok) {
        await loadData();
        const formattedAmt = new Intl.NumberFormat('id-ID').format(data.amount);
        setMessages((prev) => [
          ...prev,
          {
            id: `bot_pay_${Date.now()}`,
            sender: 'bot',
            text: `✅ Pembayaran **${data.item}** sebesar **Rp ${formattedAmt}** via **${methodLabel}** berhasil dicatat ke Supabase! Saldo dompet dan catatan mutasi telah diperbarui.`,
            timestamp: 'Sekarang',
          },
        ]);
      }
    } catch (err) {
      console.error('Error executing payment:', err);
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

    // Check if user is responding to pending payment prompt
    const lastPending = [...messages].reverse().find(
      (m) => m.sender === 'bot' && m.paymentPayload && m.paymentStatus === 'pending'
    );
    const qLower = text.toLowerCase();
    const isPay1 = qLower === '1' || qLower === '1.' || qLower.includes('saldo');
    const isPay2 = qLower === '2' || qLower === '2.' || qLower.includes('qris');
    const isPay3 = qLower === '3' || qLower === '3.' || qLower.includes('transfer bank') || qLower.includes('bank');
    const isPay4 = qLower === '4' || qLower === '4.' || qLower.includes('tunai') || qLower.includes('cash') || qLower.includes('manual');

    if (lastPending && lastPending.paymentPayload && (isPay1 || isPay2 || isPay3 || isPay4)) {
      const chosenMethod = isPay1
        ? 'TATADANA_WALLET'
        : isPay2
        ? 'QRIS'
        : isPay3
        ? 'BANK_TRANSFER'
        : 'CASH';
      setTimeout(() => {
        executePayment(chosenMethod, lastPending.paymentPayload!.data, lastPending.id);
        setIsTyping(false);
      }, 400);
      return;
    }

    // Check purchase intent
    const purchaseIntent = parsePurchaseIntent(text);
    if (purchaseIntent) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot_${Date.now()}`,
            sender: 'bot',
            text: purchaseIntent.replyText,
            timestamp: 'Sekarang',
            paymentPayload: purchaseIntent.payload,
            paymentStatus: 'pending',
          },
        ]);
        setIsTyping(false);
      }, 500);
      return;
    }

    setTimeout(() => {
      const replyText = generateAiReply(text);
      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        sender: 'bot',
        text: replyText,
        timestamp: 'Sekarang',
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 700);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl mx-auto w-full">
      <Header
        title="Tata AI Financial Assistant"
        subtitle="Konsultasikan perencanaan keuangan, evaluasi budget, dan strategi tabungan bersama AI"
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

        {/* Message Stream */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50">
          {messages.map((m) => {
            const isBot = m.sender === 'bot';

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
                  <div
                    className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      isBot
                        ? 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-sm shadow-sm'
                        : 'bg-brand-500 text-white rounded-tr-sm shadow-md font-medium'
                    }`}
                  >
                    <div className="whitespace-pre-line">{m.text}</div>
                    <span
                      className={`block text-[10px] mt-1 text-right ${
                        isBot ? 'text-slate-400' : 'text-blue-200'
                      }`}
                    >
                      {m.timestamp}
                    </span>
                  </div>

                  {/* Payment selector interactive action card */}
                  {m.paymentPayload && (
                    <div className="w-full bg-white border border-brand-200 rounded-2xl p-4 shadow-sm text-slate-800 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2 font-bold text-slate-800 text-xs sm:text-sm">
                          <CreditCard className="w-4 h-4 text-brand-600" />
                          <span>Pilih Metode Pembayaran TataDana</span>
                        </div>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          {formatRupiah(m.paymentPayload.data.amount)}
                        </span>
                      </div>

                      {m.paymentStatus === 'success' ? (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs sm:text-sm flex items-center gap-2 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            Terbayar via <strong>{m.chosenMethod}</strong>
                          </span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            onClick={() => executePayment('TATADANA_WALLET', m.paymentPayload!.data, m.id)}
                            className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-brand-500 text-left transition-all text-xs group"
                          >
                            <span className="text-base">👛</span>
                            <div>
                              <div className="font-bold text-slate-800 group-hover:text-brand-600">1. Saldo TataDana</div>
                              <div className="text-[10px] text-slate-500">
                                Saldo: {formatRupiah(wallets.reduce((s, w) => s + w.balance, 0))}
                              </div>
                            </div>
                          </button>

                          <button
                            onClick={() => executePayment('QRIS', m.paymentPayload!.data, m.id)}
                            className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-500 text-left transition-all text-xs group"
                          >
                            <span className="text-base">📱</span>
                            <div>
                              <div className="font-bold text-slate-800 group-hover:text-emerald-600">2. QRIS</div>
                              <div className="text-[10px] text-slate-500">Scan bayar instan</div>
                            </div>
                          </button>

                          <button
                            onClick={() => executePayment('BANK_TRANSFER', m.paymentPayload!.data, m.id)}
                            className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-500 text-left transition-all text-xs group"
                          >
                            <span className="text-base">🏦</span>
                            <div>
                              <div className="font-bold text-slate-800 group-hover:text-indigo-600">3. Transfer Bank</div>
                              <div className="text-[10px] text-slate-500">BCA, Mandiri, BRI</div>
                            </div>
                          </button>

                          <button
                            onClick={() => executePayment('CASH', m.paymentPayload!.data, m.id)}
                            className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-500 text-left transition-all text-xs group"
                          >
                            <span className="text-base">💵</span>
                            <div>
                              <div className="font-bold text-slate-800 group-hover:text-amber-600">4. Tunai / Manual</div>
                              <div className="text-[10px] text-slate-500">Catat buku kas</div>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
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
    </div>
  );
}
