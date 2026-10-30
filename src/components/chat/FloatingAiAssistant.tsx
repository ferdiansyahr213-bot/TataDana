'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Sparkles, 
  Bot, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  Minimize2, 
  CornerDownLeft,
  ChevronDown
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils/currency';
import { parsePurchaseIntent, extractActionPayloadFromMessage } from '@/lib/ai/provider-manager';
import { InitiatePaymentPayload } from '@/lib/types';

export interface FloatingAiMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
  paymentPayload?: InitiatePaymentPayload;
  paymentStatus?: 'pending' | 'success';
  chosenMethod?: string;
}

interface FloatingAiAssistantProps {
  userId?: string;
  userName?: string;
  userBalance?: number;
  onTransactionLogged?: () => void;
  isLocked?: boolean;
  onLockedClick?: () => void;
}

export const FloatingAiAssistant: React.FC<FloatingAiAssistantProps> = ({
  userId = 'usr_demo_123',
  userName = 'Vina',
  userBalance = 1500000,
  onTransactionLogged,
  isLocked = false,
  onLockedClick,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<FloatingAiMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto initialize initial greeting
  useEffect(() => {
    setMessages([
      {
        id: 'msg_init',
        sender: 'bot',
        text: `Halo **${userName}**! 👋 Saya **Tata AI Assistant**, siap membantumu mencatat transaksi, cek saldo, atau menganalisis keuangan.\n\nCoba ketik seperti: *"cilok 2rb"* atau *"kopi 15k"* untuk mencatat cepat.`,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, [userName]);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isTyping, isOpen]);

  // Toggle Panel Open / Close
  const handleToggle = () => {
    if (isLocked && !isOpen) {
      if (onLockedClick) onLockedClick();
      return;
    }
    setIsOpen((prev) => !prev);
  };

  /**
   * Mengirim pesan dan memproses respon AI Assistant
   * @param textOverride Pesan teks opsional (untuk quick prompts)
   */
  const handleSendMessage = async (textOverride?: string) => {
    const textToSend = (textOverride || inputMessage).trim();
    if (!textToSend || isTyping) return;

    if (isLocked) {
      if (onLockedClick) onLockedClick();
      return;
    }

    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    // 1. Append bubble pesan pengguna ke chat
    const userMsg: FloatingAiMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      time: nowStr,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    // 2. Simulasi / Pemanggilan Asynchronous ke Endpoint Backend AI
    // CONTOH INTEGRASI API BACKEND:
    // const res = await fetch('/api/ai/chat', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ message: textToSend, userId })
    // });
    // const data = await res.json();
    try {
      // Analisis niat pencatatan transaksi menggunakan Intent Parser
      const purchaseIntent = parsePurchaseIntent(textToSend);

      setTimeout(async () => {
        setIsTyping(false);

        if (purchaseIntent && purchaseIntent.amount && purchaseIntent.item_name) {
          const paymentPayload = purchaseIntent.payload;

          const botResponse: FloatingAiMessage = {
            id: `bot_${Date.now()}`,
            sender: 'bot',
            text: `Siap, pesanan **${purchaseIntent.item_name}** sebesar **${formatRupiah(purchaseIntent.amount)}** sudah dicatat. Mau bayar pakai apa?\n\nPilihan metode:\n1. Saldo TataDana\n2. QRIS\n3. Transfer Bank\n4. Tunai / Catat Manual`,
            time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            paymentPayload,
            paymentStatus: 'pending',
          };

          setMessages((prev) => [...prev, botResponse]);
        } else {
          // Respon cerdas untuk konsultasi atau tanya saldo umum
          let replyText = `Saya memahami pertanyaanmu. Saldo aktifmu saat ini adalah **${formatRupiah(userBalance)}**.\n\nKamu bisa mencatat pengeluaran harian kapan saja cukup dengan mengetik: *nama barang* dan *nominal*.`;
          if (textToSend.toLowerCase().includes('saldo')) {
            replyText = `Total saldo aktif di seluruh dompet TataDana kamu saat ini adalah **${formatRupiah(userBalance)}**. Semua dompet dalam kondisi sehat! 💳`;
          } else if (textToSend.toLowerCase().includes('tips') || textToSend.toLowerCase().includes('hemat')) {
            replyText = `💡 **Tips Tata AI**: Terapkan metode **50/30/20** (50% Kebutuhan Pokok, 30% Keinginan, 20% Tabungan/Investasi). Jangan lupa catat setiap kopi atau camilan kecil ya!`;
          }

          const botResponse: FloatingAiMessage = {
            id: `bot_${Date.now()}`,
            sender: 'bot',
            text: replyText,
            time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          };

          setMessages((prev) => [...prev, botResponse]);
        }
      }, 750);
    } catch (err) {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot_err_${Date.now()}`,
          sender: 'bot',
          text: 'Maaf, terjadi gangguan saat menghubungi server Tata AI. Silakan coba lagi sebentar lagi.',
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  /**
   * Menangani pilihan metode pembayaran dari Structured Action Payload
   */
  const handleSelectPaymentMethod = async (messageId: string, payload: InitiatePaymentPayload, method: string) => {
    const methodNames: Record<string, string> = {
      TATADANA_WALLET: 'Saldo TataDana',
      QRIS: 'QRIS Dinamis',
      BANK_TRANSFER: 'Transfer Bank',
      CASH: 'Tunai / Catat Manual',
    };
    const methodName = methodNames[method] || method;

    // Update message status di UI
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, paymentStatus: 'success', chosenMethod: methodName }
          : msg
      )
    );

    // Kirim konfirmasi transaksi ke backend API
    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_transaction',
          userId,
          payload: {
            user_id: userId,
            type: 'expense',
            amount: payload.data.amount,
            notes: `${payload.data.item} (${methodName})`,
            category_name: payload.data.category,
            source: 'web',
            transaction_date: new Date().toISOString(),
          },
        }),
      });

      if (onTransactionLogged) {
        onTransactionLogged();
      }
    } catch (e) {
      console.error('Error logging transaction:', e);
    }

    // Append pesan konfirmasi sukses dari bot
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot_conf_${Date.now()}`,
          sender: 'bot',
          text: `[OK] Pernyataan terkirim ke Tata AI | Metode bayar disajikan | Transaksi **${payload.data.item}** (${formatRupiah(payload.data.amount)}) via **${methodName}** berhasil dicatat ke sistem! ✅`,
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 400);
  };

  return (
    <>
      {/* 1. Floating Action Button (FAB) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={handleToggle}
          aria-label={isOpen ? 'Tutup Panel AI' : 'Buka Tata AI Assistant'}
          className={`relative group flex items-center gap-2.5 px-4 py-3 rounded-full text-white font-bold text-xs shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 ${
            isOpen
              ? 'bg-slate-800 hover:bg-slate-700 shadow-slate-900/30 ring-2 ring-white/20'
              : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-brand-500 hover:from-blue-500 hover:to-brand-400 shadow-blue-500/25 ring-4 ring-blue-500/10'
          }`}
        >
          {/* Status Indicator: Titik Hijau Berkedip */}
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>

          {isOpen ? (
            <>
              <X className="w-4 h-4 text-white" />
              <span>Tutup AI</span>
            </>
          ) : (
            <>
              <Bot className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">Tata AI Assistant</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            </>
          )}
        </button>
      </div>

      {/* 2. Floating Chat Panel */}
      {isOpen && (
        <div
          className="fixed bottom-22 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[400px] h-[540px] max-h-[80vh] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
          role="dialog"
          aria-labelledby="ai-chat-header"
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800/80 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                  <Bot className="w-5 h-5" />
                </div>
                {/* Online indicator badge */}
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 id="ai-chat-header" className="text-xs font-black tracking-tight text-white">
                    Tata AI Assistant
                  </h3>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold uppercase bg-brand-500/20 text-brand-300 border border-brand-500/30">
                    Pro
                  </span>
                </div>
                <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span>Online • Respons Instan</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors"
                title="Tutup Panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Message Area (Body) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed shadow-xs ${
                      isUser
                        ? 'bg-gradient-to-r from-blue-600 to-brand-600 text-white rounded-br-xs'
                        : 'bg-white border border-slate-200/90 text-slate-800 rounded-bl-xs'
                    }`}
                  >
                    <div className="whitespace-pre-line font-normal">
                      {extractActionPayloadFromMessage(msg.text).cleanText}
                    </div>

                    {/* Interactive Payment Selector if available */}
                    {msg.paymentPayload && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                          Pilih Metode Pembayaran:
                        </span>

                        {msg.paymentStatus === 'success' ? (
                          <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Dibayar via: {msg.chosenMethod}</span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-1.5">
                            {[
                              { id: 'TATADANA_WALLET', label: '💳 Saldo TataDana' },
                              { id: 'QRIS', label: '📱 QRIS' },
                              { id: 'BANK_TRANSFER', label: '🏦 Transfer Bank' },
                              { id: 'CASH', label: '💵 Tunai / Catat' },
                            ].map((opt) => (
                              <button
                                key={opt.id}
                                onClick={() =>
                                  handleSelectPaymentMethod(msg.id, msg.paymentPayload!, opt.id)
                                }
                                className="px-2 py-1.5 rounded-lg bg-slate-50 hover:bg-brand-50 border border-slate-200 hover:border-brand-300 text-slate-700 hover:text-brand-700 text-[11px] font-bold transition-all text-left truncate"
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 px-1 font-mono">
                    {msg.time}
                  </span>
                </div>
              );
            })}

            {/* Typing Indicator: 3 Animasi Titik Bouncing */}
            {isTyping && (
              <div className="flex items-center gap-1.5 p-3 bg-white border border-slate-200 rounded-2xl rounded-bl-xs max-w-[80px] shadow-xs">
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Pills */}
          <div className="px-3 py-1.5 bg-slate-100/70 border-t border-slate-200/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[10px]">
            <button
              onClick={() => handleSendMessage('cilok 2rb')}
              className="whitespace-nowrap px-2 py-0.8 bg-white hover:bg-blue-50 text-slate-700 hover:text-brand-600 rounded-full border border-slate-200 transition-colors font-semibold"
            >
              🍜 cilok 2rb
            </button>
            <button
              onClick={() => handleSendMessage('kopi susu 15k')}
              className="whitespace-nowrap px-2 py-0.8 bg-white hover:bg-blue-50 text-slate-700 hover:text-brand-600 rounded-full border border-slate-200 transition-colors font-semibold"
            >
              ☕ kopi susu 15k
            </button>
            <button
              onClick={() => handleSendMessage('Cek total saldo')}
              className="whitespace-nowrap px-2 py-0.8 bg-white hover:bg-blue-50 text-slate-700 hover:text-brand-600 rounded-full border border-slate-200 transition-colors font-semibold"
            >
              💳 Cek Saldo
            </button>
            <button
              onClick={() => handleSendMessage('Tips hemat pengeluaran')}
              className="whitespace-nowrap px-2 py-0.8 bg-white hover:bg-blue-50 text-slate-700 hover:text-brand-600 rounded-full border border-slate-200 transition-colors font-semibold"
            >
              💡 Tips Hemat
            </button>
          </div>

          {/* Footer / Input Area */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              placeholder="Ketik pesan atau transaksi (misal: cilok 2rb)..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="flex-1 bg-slate-50 text-slate-900 placeholder-slate-400 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 border border-slate-200 font-medium"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isTyping}
              className="p-2.5 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 disabled:opacity-40 text-white rounded-xl transition-all shadow-md shadow-brand-500/20 shrink-0"
              title="Kirim Pesan (Enter)"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
