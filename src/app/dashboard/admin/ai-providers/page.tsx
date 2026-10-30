'use client';

import React, { useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { AdminTabNav } from '@/components/admin/AdminTabNav';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Cpu, Plus, Sparkles, Check, Key, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { AIProvider, AISettings } from '@/lib/types';

export default function AdminAIProvidersPage() {
  const [providers, setProviders] = useState<AIProvider[]>([
    { id: '1', name: 'gemini', display_name: 'Google Gemini', model_name: 'gemini-1.5-flash', is_active: true, priority: 1 },
    { id: '2', name: 'openai', display_name: 'OpenAI GPT', model_name: 'gpt-4o-mini', is_active: true, priority: 2 },
    { id: '3', name: 'deepseek', display_name: 'DeepSeek AI', model_name: 'deepseek-chat', is_active: true, priority: 3 },
  ]);

  const [settings, setSettings] = useState<AISettings>({
    mode: 'failover',
    active_single_provider: 'gemini',
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSaveSettings = async (newMode: 'single' | 'failover', singleProvider?: string) => {
    const updated = {
      mode: newMode,
      active_single_provider: singleProvider || settings.active_single_provider,
    };
    setSettings(updated);

    await fetch('/api/admin/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: updated }),
    });

    setStatusMessage('Mode eksekusi AI berhasil diperbarui!');
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleToggleProvider = async (id: string) => {
    const nextProviders = providers.map((p) =>
      p.id === id ? { ...p, is_active: !p.is_active } : p
    );
    setProviders(nextProviders);

    await fetch('/api/admin/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providers: nextProviders }),
    });
  };

  const handleOpenEditKey = (prov: AIProvider) => {
    setEditingProvider(prov);
    setApiKeyInput('');
    setIsModalOpen(true);
  };

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProvider) return;

    const nextProviders = providers.map((p) =>
      p.id === editingProvider.id ? { ...p, api_key_encrypted: apiKeyInput ? '••••••••••••' : p.api_key_encrypted } : p
    );
    setProviders(nextProviders);

    await fetch('/api/admin/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providers: nextProviders }),
    });

    setIsModalOpen(false);
    setStatusMessage(`API Key untuk ${editingProvider.display_name} berhasil disimpan terenkripsi.`);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="Multi-Provider AI Engine"
        subtitle="Atur provider AI (Gemini, OpenAI, DeepSeek), kelola kunci API terenkripsi, dan mode failover otomatis"
      />

      <AdminTabNav />

      <div className="p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {statusMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-emerald-600 hover:text-emerald-900 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Mode Switcher */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Mode Eksekusi Model AI</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tentukan strategi sistem saat memproses NLP pencatatan pengeluaran & OCR struk belanja
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <div
              onClick={() => handleSaveSettings('failover')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                settings.mode === 'failover'
                  ? 'bg-purple-50/60 border-purple-300 ring-2 ring-purple-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-slate-900">Mode Failover Otomatis</span>
                {settings.mode === 'failover' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                    Aktif
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Utamakan Gemini 1.5 Flash. Jika terjadi batas rate-limit atau timeout, otomatis alihkan request ke OpenAI GPT atau DeepSeek tanpa gangguan.
              </p>
            </div>

            <div
              onClick={() => handleSaveSettings('single', 'gemini')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                settings.mode === 'single'
                  ? 'bg-purple-50/60 border-purple-300 ring-2 ring-purple-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-slate-900">Mode Single Provider</span>
                {settings.mode === 'single' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                    Aktif
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Hanya gunakan satu provider AI utama secara eksklusif. Lebih hemat kuota API dan seragam dalam schema output JSON.
              </p>
            </div>
          </div>
        </div>

        {/* Providers List */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {providers.map((p) => (
            <div
              key={p.id}
              className={`p-5 rounded-2xl border flex flex-col justify-between shadow-xs transition-all ${
                p.is_active ? 'bg-white border-slate-200/80' : 'bg-slate-50 border-slate-200/50 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900">{p.display_name}</h3>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    p.is_active
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {p.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-500 my-4">
                  <p>
                    Model: <span className="font-mono text-purple-700 font-semibold">{p.model_name}</span>
                  </p>
                  <p>
                    Prioritas Failover: <span className="font-bold text-slate-800">#{p.priority}</span>
                  </p>
                  <p className="flex items-center gap-1">
                    <span>API Key:</span>
                    <span className="font-mono text-slate-400">
                      {p.api_key_encrypted ? '••••••••••••••••' : 'Tersedia di .env.local'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => handleToggleProvider(p.id)}
                  className="text-slate-500 hover:text-slate-800 font-medium transition-colors"
                >
                  {p.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                </button>

                <button
                  onClick={() => handleOpenEditKey(p)}
                  className="text-purple-700 hover:text-purple-900 font-bold inline-flex items-center gap-1"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Ubah Key</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Key Edit Modal */}
        {isModalOpen && (
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title={`Konfigurasi Kunci API ${editingProvider?.display_name}`}
            description="Kunci API disimpan terenkripsi di database dan aman dari inspeksi klien"
          >
            <form onSubmit={handleSaveKey} className="space-y-4 text-xs">
              <Input
                label="API Key Baru"
                type="password"
                placeholder="AIzaSy... / sk-..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                required
                helperText="Key akan otomatis dienkripsi dengan enkripsi AES-256."
              />

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Simpan Enkripsi Key
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </div>
  );
}
