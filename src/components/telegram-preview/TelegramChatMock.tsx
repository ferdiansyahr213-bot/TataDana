'use client';

import React, { useState } from 'react';
import { Send, Bot, User, Image as ImageIcon, Mic, Sparkles } from 'lucide-react';
import { formatExpenseReply, formatIncomeReply, formatSaldoReply, formatBudgetListReply, formatHelpReply } from '@/lib/telegram/formatter';
import { heuristicParseIndonesian } from '@/lib/ai/provider-manager';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
  isImage?: boolean;
}

export const TelegramChatMock: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'user',
      text: 'beli bakso 15rb',
      time: '12:30',
    },
    {
      id: '2',
      sender: 'bot',
      text: `📅 Sabtu, 10 Oktober 2026 — 12:30 WIB
💸 Pengeluaran tercatat!
├ Nominal : Rp15.000
├ Kategori : 🍜 Makanan & Minuman
├ Dompet : 👛 BCA Utama
├ Catatan : beli bakso
└ Saldo : Rp8.485.000

📊 Budget Makanan & Minuman bulan ini:
███████░░░ 74% — sisa Rp650.000
Tetap hemat dan bijak ya! 👍`,
      time: '12:30',
    },
  ]);

  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const samplePrompts = [
    'beli bakso 15rb',
    'gajian 5jt',
    'isi bensin spbu 30k',
    '/saldo',
    '/budget',
  ];

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputVal).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setIsTyping(true);

    setTimeout(() => {
      let replyText = '';

      if (text === '/saldo') {
        replyText = `👛 Saldo Dompet Kamu:

• BCA Utama (Default): Rp8.485.000
• Dompet Tunai (Cash): Rp450.000
• GoPay: Rp285.000

💵 Total Saldo: Rp9.220.000`;
      } else if (text === '/budget') {
        replyText = `🎯 Status Budget Bulan Ini:

🍜 Makanan & Minuman
███████░ 74%
Terpakai: Rp1.850.000 / Rp2.500.000 (Sisa: Rp650.000)

🚗 Transportasi
████░░░░ 52%
Terpakai: Rp420.000 / Rp800.000 (Sisa: Rp380.000)`;
      } else {
        const parsed = heuristicParseIndonesian(text);
        if (parsed) {
          if (parsed.jenis === 'transfer') {
            replyText = `📅 Sabtu, 10 Oktober 2026 — 12:35 WIB
🔄 Transfer antar dompet berhasil!
├ Dari : 👛 BCA Utama (Sisa: Rp8.385.000)
├ Ke : 👛 ${parsed.destWalletName ? parsed.destWalletName.toUpperCase() : 'GoPay'} (Saldo: Rp385.000)
└ Nominal : Rp${parsed.nominal.toLocaleString('id-ID')}`;
          } else if (parsed.jenis === 'pengeluaran') {
            replyText = `📅 Sabtu, 10 Oktober 2026 — 12:35 WIB
💸 Pengeluaran tercatat!
├ Nominal : Rp${parsed.nominal.toLocaleString('id-ID')}
├ Kategori : 🍜 ${parsed.kategori}
├ Dompet : 👛 BCA Utama
├ Catatan : ${parsed.catatan}
└ Saldo : Rp8.455.000

📊 Budget ${parsed.kategori} bulan ini:
████████░░ 78% — sisa Rp550.000
Tetap hemat dan bijak ya! 👍`;
          } else {
            replyText = `📅 Sabtu, 10 Oktober 2026 — 12:35 WIB
💰 Pemasukan tercatat!
├ Nominal : Rp${parsed.nominal.toLocaleString('id-ID')}
├ Kategori : 💼 ${parsed.kategori}
├ Dompet : 👛 BCA Utama
└ Saldo baru : Rp13.485.000

💪 Semangat terus! Jangan lupa sisihkan untuk tabungan ya.`;
          }
        } else {
          replyText = `🤔 Maaf, TataDana belum memahami: "${text}"
💡 Contoh format: "beli bakso 15rb" atau "gajian 5jt"`;
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `b_${Date.now()}`,
          sender: 'bot',
          text: replyText,
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setIsTyping(false);
    }, 600);
  };

  const handleSimulateReceipt = () => {
    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: '📸 Mengirim foto struk Indomaret...',
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      isImage: true,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      const reply = `📅 Sabtu, 10 Oktober 2026 — 12:40 WIB
💸 Pengeluaran tercatat!
├ Nominal : Rp154.000
├ Kategori : 👕 Belanja
├ Dompet : 👛 BCA Utama
├ Catatan : Indomaret Point Tebet (5 items)
└ Saldo : Rp8.331.000

📋 Rincian Item:
• Susu UHT Full Cream 1L (2x) — Rp42.000
• Roti Gandum Sari Roti (1x) — Rp18.000
• Kopi Arabika Ground 200g (1x) — Rp49.000
• Sabun Mandi Refill 450ml (1x) — Rp25.000
• Snack Keripik Kentang (1x) — Rp20.000

📊 Budget Belanja bulan ini:
█████░░░░░ 51% — sisa Rp446.000`;

      setMessages((prev) => [
        ...prev,
        {
          id: `b_${Date.now()}`,
          sender: 'bot',
          text: reply,
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setIsTyping(false);
    }, 900);
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 text-slate-100 flex flex-col h-[560px]">
      {/* Telegram Header */}
      <div className="bg-slate-800/90 px-4 py-3 flex items-center justify-between border-b border-slate-700/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center font-bold text-white shadow-brand-sm">
            TD
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm">TataDana Bot</span>
              <span className="bg-brand-500/20 text-brand-400 text-[10px] px-1.5 py-0.2 rounded font-medium">BOT</span>
            </div>
            <p className="text-[11px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online • Realtime Supabase
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSimulateReceipt}
            className="text-xs bg-slate-700 hover:bg-slate-600 px-2.5 py-1.5 rounded-lg flex items-center gap-1 text-slate-200 transition-colors"
            title="Coba simulasi struk belanja"
          >
            <ImageIcon className="w-3.5 h-3.5 text-brand-400" />
            <span className="hidden sm:inline">Foto Struk</span>
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        {messages.map((m) => {
          const isMe = m.sender === 'user';
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-md ${
                  isMe
                    ? 'bg-brand-500 text-white rounded-tr-none'
                    : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700/60 font-mono whitespace-pre-wrap leading-relaxed'
                }`}
              >
                {m.text}
                <div
                  className={`text-[9px] mt-1 text-right ${
                    isMe ? 'text-blue-100/70' : 'text-slate-400'
                  }`}
                >
                  {m.time}
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700/60 text-slate-300 rounded-2xl rounded-tl-none px-3 py-2 text-xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:0.4s]" />
              <span className="text-[11px] text-slate-400 ml-1">TataDana mencatat...</span>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-3 py-1.5 bg-slate-900 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[11px] scrollbar-none">
        <span className="text-slate-400 text-[10px] uppercase font-semibold shrink-0">Coba:</span>
        {samplePrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            className="whitespace-nowrap px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full border border-slate-700 transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Chat Input */}
      <div className="p-3 bg-slate-850 bg-slate-900/95 border-t border-slate-800 flex items-center gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ketik transaksi... (contoh: beli bakso 15rb)"
          className="flex-1 bg-slate-800 text-white placeholder-slate-400 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 border border-slate-700"
        />
        <button
          onClick={() => handleSend()}
          disabled={!inputVal.trim()}
          className="p-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white rounded-xl transition-all shadow-brand-sm"
          title="Kirim pesan"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
