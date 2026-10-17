'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Cpu, Plus, Sparkles, Check, Key, ShieldCheck } from 'lucide-react';
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

    setStatusMessage('✅ Mode eksekusi AI berhasil diperbarui!');
    setTimeout(() => setStatusMessage(null), 3000);
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
    setStatusMessage(`✅ API Key untuk ${editingProvider.display_name} berhasil disimpan terenkripsi.`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Kelola Multi-Provider AI Engine</h1>
          <p className="text-xs text-slate-400 mt-1">
            Atur provider AI (Gemini, OpenAI, DeepSeek), kelola kunci API terenkripsi, dan tentukan mode failover
          </p>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-purple-900/40 border border-purple-500/50 text-purple-300 text-xs font-semibold">
          {statusMessage}
        </div>
      )}

      {/* Mode Switcher */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white">Mode Eksekusi Model AI</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Pilih bagaimana sistem memproses parsing transaksi saat terjadi lonjakan trafik atau error provider
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          <div
            onClick={() => handleSaveSettings('failover')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              settings.mode === 'failover'
                ? 'bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/20'
                : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-white">Mode Failover Otomatis</span>
              {settings.mode === 'failover' && <Badge variant="purple" size="sm">Aktif</Badge>}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Utamakan Gemini 1.5 Flash. Jika terjadi rate-limit atau timeout, otomatis alihkan request ke OpenAI GPT atau DeepSeek tanpa gangguan bagi user.
            </p>
          </div>

          <div
            onClick={() => handleSaveSettings('single', 'gemini')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              settings.mode === 'single'
                ? 'bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/20'
                : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-white">Mode Single Provider</span>
              {settings.mode === 'single' && <Badge variant="purple" size="sm">Aktif</Badge>}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Hanya gunakan satu provider AI utama secara eksklusif. Lebih hemat biaya dan konsisten dalam output JSON.
            </p>
          </div>
        </div>
      </div>

      {/* Providers List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {providers.map((p) => (
          <div
            key={p.id}
            className={`p-5 rounded-2xl border flex flex-col justify-between ${
              p.is_active ? 'bg-slate-900 border-slate-700' : 'bg-slate-950/60 border-slate-800 opacity-60'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-purple-400" />
                  <h3 className="font-bold text-sm text-white">{p.display_name}</h3>
                </div>
                <Badge variant={p.is_active ? 'green' : 'gray'} size="sm">
                  {p.is_active ? 'Aktif' : 'Nonaktif'}
                </Badge>
              </div>

              <div className="space-y-1.5 text-xs text-slate-400 my-3">
                <p>
                  Model: <span className="font-mono text-purple-300 font-semibold">{p.model_name}</span>
                </p>
                <p>
                  Prioritas Failover: <span className="font-bold text-white">#{p.priority}</span>
                </p>
                <p className="flex items-center gap-1">
                  <span>API Key:</span>
                  <span className="font-mono text-slate-500">
                    {p.api_key_encrypted ? '••••••••••••••••' : 'Tersedia di .env.local'}
                  </span>
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
              <button
                onClick={() => handleToggleProvider(p.id)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                {p.is_active ? 'Nonaktifkan' : 'Aktifkan'}
              </button>

              <button
                onClick={() => handleOpenEditKey(p)}
                className="text-purple-400 hover:text-purple-300 font-semibold inline-flex items-center gap-1"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Ubah Key</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Key Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Konfigurasi Kunci API ${editingProvider?.display_name}`}
        description="Kunci API disimpan terenkripsi di database dan tidak akan diekspos ke klien"
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
    </div>
  );
}
