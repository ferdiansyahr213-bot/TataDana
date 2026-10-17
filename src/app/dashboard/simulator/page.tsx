'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatRupiah } from '@/lib/utils/currency';
import { 
  Send, 
  Mic, 
  Camera, 
  Trash2, 
  Sparkles, 
  Bot, 
  ArrowRight, 
  Check, 
  CheckCheck, 
  RefreshCw, 
  Wallet as WalletIcon, 
  CreditCard,
  Target,
  Smartphone,
  ExternalLink,
  Info,
  ShieldAlert
} from 'lucide-react';
import { Wallet, UserProfile } from '@/lib/types';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  type?: 'text' | 'voice' | 'photo';
  metadata?: any;
}

export default function BotSimulatorPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [recentTxCount, setRecentTxCount] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getWibTime = () => {
    return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB';
  };

  // RBAC Guard: Only accessible by admin/superadmin
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = sessionStorage.getItem('user_role');
      const userId = sessionStorage.getItem('current_user_id');

      if (role === 'admin' || role === 'superadmin' || userId === 'usr_admin_999') {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
        router.replace('/dashboard?error=access_denied');
      }
    }
  }, [router]);

  const loadInitialData = async () => {
    try {
      const res = await fetch('/api/data?userId=usr_demo_123');
      const data = await res.json();
      if (data.ok) {
        setUser(data.user);
        setWallets(data.wallets || []);
        setRecentTxCount((data.transactions || []).length);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      loadInitialData();

      // Default welcoming message from bot
      setMessages([
        {
          id: 'msg_welcome_1',
          sender: 'bot',
          text: `👋 *Halo Admin!*\n\nSelamat datang di **Simulator Bot Telegram TataDana** (@ReviKerudungTataDana_bot).\n\nMode simulasi ini hanya dapat diakses oleh Admin untuk keperluan testing & verifikasi:\n\n• **Pembelian Cepat (Tata AI):** \`cilok 2rb\` atau \`kopi susu 15k\`\n• **Catat Pengeluaran:** \`beli kopi 25rb pakai gopay\`\n• **Catat Pemasukan:** \`gajian masuk 12.5jt di bca\`\n• **Transfer Antar Dompet:** \`transfer 500rb dari BCA ke GoPay\`\n• **Perintah Finansial:** \`/saldo\`, \`/budget\`, \`/kalender\`, \`/hari ini\`\n• **Konsultasi AI:** \`/tataai analisis keuangan saya\`\n\n_Gunakan tombol preset di bawah untuk uji coba cepat!_`,
          timestamp: getWibTime(),
        },
      ]);
    }
  }, [isAuthorized]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-xs">
        Memeriksa otorisasi role Admin...
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  const sendPayload = async (payload: { actionType: 'text' | 'voice' | 'photo'; text?: string; receiptMerchant?: string }) => {
    if (loading) return;

    // Display user bubble
    const userMsgId = `user_${Date.now()}`;
    let userText = payload.text || '';
    if (payload.actionType === 'voice') {
      userText = `🎙️ [Voice Note 4s]: "Beli makan siang nasi padang dan es teh 25 ribu"`;
    } else if (payload.actionType === 'photo') {
      userText = `📸 [Foto Struk Belanja]: ${payload.receiptMerchant || 'Indomaret Point'}`;
    }

    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: userMsgId,
        sender: 'user',
        text: userText,
        timestamp: getWibTime(),
        type: payload.actionType,
      },
    ];

    setMessages(newMessages);
    setInputText('');
    setLoading(true);

    try {
      const res = await fetch('/api/telegram/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || 'usr_demo_123',
          actionType: payload.actionType,
          text: payload.text,
          receiptMerchant: payload.receiptMerchant,
        }),
      });

      const data = await res.json();

      if (data.ok && Array.isArray(data.replies)) {
        const botMessages: ChatMessage[] = data.replies.map((replyText: string, idx: number) => ({
          id: `bot_${Date.now()}_${idx}`,
          sender: 'bot',
          text: replyText,
          timestamp: getWibTime(),
        }));

        setMessages((prev) => [...prev, ...botMessages]);

        // Refresh live balances
        if (data.wallets) {
          setWallets(data.wallets);
        }
        if (typeof data.transactionsCount === 'number') {
          setRecentTxCount(data.transactionsCount);
        }

        setToastMessage('✅ Transaksi & respon bot berhasil diproses dan tersinkronisasi!');
        setTimeout(() => setToastMessage(null), 3000);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            sender: 'bot',
            text: `⚠️ Maaf, gagal memproses simulasi: ${data.error || 'Terjadi kesalahan sistem'}`,
            timestamp: getWibTime(),
          },
        ]);
      }
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'bot',
          text: `⚠️ Error jaringan: ${e.message}`,
          timestamp: getWibTime(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendPayload({ actionType: 'text', text: inputText.trim() });
  };

  const handleClearChat = async () => {
    try {
      await fetch('/api/telegram/simulator?chatId=8807546522', { method: 'DELETE' });
      setMessages([
        {
          id: `msg_cleared_${Date.now()}`,
          sender: 'bot',
          text: '🧹 Obrolan simulator telah dibersihkan. Silakan kirim transaksi baru kapan saja!',
          timestamp: getWibTime(),
        },
      ]);
    } catch (e) {
      console.error(e);
    }
  };

  const formatBotMarkdown = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, lIdx) => {
      let formatted: React.ReactNode = line;
      const parts = line.split(/(\*[^*]+\*|`[^`]+`)/g);
      formatted = parts.map((part, pIdx) => {
        if (part.startsWith('*') && part.endsWith('*')) {
          return <strong key={pIdx} className="font-bold text-white">{part.slice(1, -1)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={pIdx} className="px-1.5 py-0.5 rounded bg-slate-900/80 text-blue-300 font-mono text-[11px] border border-blue-500/20">
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      });

      return (
        <React.Fragment key={lIdx}>
          <span>{formatted}</span>
          {lIdx < lines.length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-brand-sm">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Bot Simulator Console
                </h1>
                <Badge variant="purple" size="sm">
                  Admin Restricted
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Konsol uji coba interaktif bot Telegram untuk Admin & Superadmin TataDana
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold transition-colors"
          >
            <span>Panel Admin</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            <span>Dashboard</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <Button
            onClick={handleClearChat}
            variant="outline"
            size="sm"
            className="text-slate-600 hover:text-rose-600 hover:border-rose-300"
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
          >
            Bersihkan Chat
          </Button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Grid: Telegram Chat Shell (Left 8 Cols) + Live Database Sync Panel (Right 4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* TELEGRAM SIMULATOR WINDOW (Cols 8) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden h-[680px]">
          
          {/* Telegram Header */}
          <div className="p-3.5 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-400 flex items-center justify-center text-white font-bold text-sm shadow-md">
                  TD
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-slate-900 animate-pulse"></span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-white text-sm">TataDana Bot Simulator</h3>
                  <span className="text-blue-400 text-xs" title="Verified Bot">✓</span>
                </div>
                <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                  <span>bot • admin testing</span>
                  <span className="text-slate-500">• @ReviKerudungTataDana_bot</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono text-[10px]">
                RBAC: Admin Verified
              </span>
            </div>
          </div>

          {/* Quick Preset Buttons Bar */}
          <div className="px-3 py-2 bg-slate-950/50 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px] shrink-0 no-scrollbar">
            <span className="text-slate-500 text-[10px] uppercase font-bold shrink-0 mr-1">Uji:</span>
            
            <button
              onClick={() => sendPayload({ actionType: 'text', text: 'cilok 2rb' })}
              className="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 whitespace-nowrap transition-all"
            >
              🍢 cilok 2rb
            </button>
            <button
              onClick={() => sendPayload({ actionType: 'text', text: 'kopi susu 15k' })}
              className="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 whitespace-nowrap transition-all"
            >
              ☕ kopi susu 15k
            </button>
            <button
              onClick={() => sendPayload({ actionType: 'text', text: '/saldo' })}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 whitespace-nowrap transition-all"
            >
              💰 /saldo
            </button>
            <button
              onClick={() => sendPayload({ actionType: 'text', text: '/budget' })}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 whitespace-nowrap transition-all"
            >
              📊 /budget
            </button>
            <button
              onClick={() => sendPayload({ actionType: 'text', text: 'gajian masuk 12500000 di bca' })}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 whitespace-nowrap transition-all"
            >
              💼 Gajian 12.5jt
            </button>
            <button
              onClick={() => sendPayload({ actionType: 'voice' })}
              className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 whitespace-nowrap transition-all flex items-center gap-1"
            >
              <Mic className="w-3 h-3 text-purple-400" />
              <span>Voice Note</span>
            </button>
            <button
              onClick={() => sendPayload({ actionType: 'photo', receiptMerchant: 'Indomaret Point Tebet' })}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 whitespace-nowrap transition-all flex items-center gap-1"
            >
              <Camera className="w-3 h-3 text-amber-400" />
              <span>Foto Struk</span>
            </button>
          </div>

          {/* Messages Stream Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';

              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0 mb-1 shadow">
                      TD
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 text-xs shadow-md transition-all ${
                      isUser
                        ? 'bg-purple-600 text-white rounded-br-xs'
                        : 'bg-slate-800 text-slate-100 rounded-bl-xs border border-slate-700/70'
                    }`}
                  >
                    <div className="leading-relaxed whitespace-pre-wrap">
                      {isUser ? msg.text : formatBotMarkdown(msg.text)}
                    </div>

                    <div
                      className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                        isUser ? 'text-purple-200' : 'text-slate-400'
                      }`}
                    >
                      <span>{msg.timestamp}</span>
                      {isUser && <CheckCheck className="w-3.5 h-3.5 text-purple-300" />}
                    </div>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                  TD
                </div>
                <div className="p-3 rounded-2xl rounded-bl-xs bg-slate-800 border border-slate-700 text-slate-300 text-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"></span>
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:0.4s]"></span>
                  <span className="text-[11px] text-slate-400 ml-1">TataDana bot sedang mencatat...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form onSubmit={handleFormSubmit} className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => sendPayload({ actionType: 'voice' })}
                title="Simulasi Rekaman Suara / Voice Note"
                className="p-2 rounded-xl text-slate-400 hover:text-purple-400 hover:bg-slate-800 transition-colors"
              >
                <Mic className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => sendPayload({ actionType: 'photo', receiptMerchant: 'Indomaret Point Tebet' })}
                title="Simulasi Upload Foto Struk OCR"
                className="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ketik perintah atau transaksi (cth: cilok 2rb, /saldo, beli bensin 50rb)..."
              className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-all"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || loading}
              className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white transition-all shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>

        {/* RIGHT PANEL: AUDIT & SYNC (Cols 4) */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Status Box */}
          <Card className="p-5 bg-white border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <h3 className="font-bold text-slate-800 text-xs">Sinkronisasi Simulator</h3>
              </div>
              <Button onClick={loadInitialData} variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600">
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Mode Hak Akses:</span>
                <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 text-[10px]">ADMIN ONLY</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Pengguna Target:</span>
                <span className="font-bold text-slate-900">{user?.full_name || 'Revi'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>ID Telegram Target:</span>
                <span className="font-mono text-blue-600 font-semibold">{user?.telegram_chat_id || 8807546522}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Paket Target:</span>
                <span className="font-extrabold uppercase text-indigo-600 text-[10px] px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200">
                  {user?.plan || 'PRO'}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Transaksi Tercatat:</span>
                <span className="font-extrabold text-emerald-600">{recentTxCount} transaksi</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Halaman ini terisolasi untuk role Admin & Superadmin guna menguji alur pipeline chat tanpa mengubah status produksi pengguna umum.
              </p>
            </div>
          </Card>

          {/* Tips Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-tr from-purple-50 to-indigo-50 border border-purple-200/60 text-xs text-slate-700 space-y-2">
            <div className="flex items-center gap-2 font-bold text-purple-900">
              <Info className="w-4 h-4 text-purple-600" />
              <span>Instruksi Pengujian:</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-slate-600 list-disc list-inside">
              <li><code className="text-purple-700">cilok 2rb</code> (Memicu alur pembayaran Tata AI)</li>
              <li><code className="text-purple-700">/saldo</code> (Rincian saldo seluruh dompet)</li>
              <li><code className="text-purple-700">/budget</code> (Status kuota pengeluaran)</li>
            </ul>
          </div>

        </div>

      </div>
    </div>
  );
}
