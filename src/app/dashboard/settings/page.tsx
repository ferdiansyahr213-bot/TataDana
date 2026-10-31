'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/dashboard/Header';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { 
  User, 
  Send, 
  BellRing, 
  Tags, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Sparkles, 
  Plus, 
  ExternalLink,
  Mail,
  Lock,
  Smartphone,
  Camera,
  Check
} from 'lucide-react';
import { UserProfile, Category } from '@/lib/types';
import { formatDailyReminderReply } from '@/lib/telegram/formatter';

const AVATAR_PRESETS = [
  {
    id: 'avatar_1',
    name: 'Profesional Elegan',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    description: 'Executive Modern',
  },
  {
    id: 'avatar_2',
    name: 'Kreator Cerdas',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    description: 'Tech & Finance',
  },
  {
    id: 'avatar_3',
    name: 'Founder Dinamis',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    description: 'Digital Leader',
  },
  {
    id: 'avatar_4',
    name: 'FinTech Strategist',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    description: 'Global Investor',
  },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'telegram' | 'reminder' | 'categories'>('profile');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  // Profile Form States
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80');
  const [customAvatarInput, setCustomAvatarInput] = useState('');
  const [currency, setCurrency] = useState('IDR');
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Telegram Form
  const [botToken, setBotToken] = useState('');
  const [telegramStatus, setTelegramStatus] = useState<'connected' | 'disconnected' | 'testing'>('connected');
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; botInfo?: any } | null>(null);

  // Reminder Form
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderFrequency, setReminderFrequency] = useState<1 | 2>(1);
  const [reminderTime1, setReminderTime1] = useState('09:00');
  const [reminderTime2, setReminderTime2] = useState('20:00');
  const [reminderSaved, setReminderSaved] = useState(false);

  // Category Form
  const [newCatName, setNewCatName] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('🛍️');
  const [newCatColor, setNewCatColor] = useState('#f97316');
  const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense');

  const loadData = async () => {
    try {
      const paramId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('impersonate') || new URLSearchParams(window.location.search).get('userId') || sessionStorage.getItem('current_user_id') : null;
      const targetUserId = paramId || 'usr_demo_123';
      const res = await fetch(`/api/data?userId=${encodeURIComponent(targetUserId)}`);
      const data = await res.json();
      if (data.ok) {
        setUser(data.user);
        setCategories(data.categories);
        setFullName(data.user.full_name || '');
        setEmail(data.user.email || '');
        setPhoneNumber(data.user.phone_number || '');
        setCurrency(data.user.currency || 'IDR');
        setAvatarUrl(data.user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80');
        setBotToken(data.user.telegram_bot_token || '');
        setTelegramStatus(data.user.telegram_connected ? 'connected' : 'disconnected');
        setReminderEnabled(data.user.reminder_enabled);
        setReminderFrequency(data.user.reminder_frequency || 1);
        setReminderTime1(data.user.reminder_time_1?.slice(0, 5) || '09:00');
        setReminderTime2(data.user.reminder_time_2?.slice(0, 5) || '20:00');
        if (data.user.role === 'admin' || data.user.role === 'superadmin' || data.user.id === 'usr_admin_999') {
          if (typeof window !== 'undefined' && data.user.phone_number) {
            localStorage.setItem('admin_wa_number', data.user.phone_number);
            sessionStorage.setItem('admin_wa_number', data.user.phone_number);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);

    if (newPassword && newPassword !== confirmPassword) {
      setProfileError('Konfirmasi kata sandi tidak cocok. Harap periksa kembali.');
      return;
    }

    setIsSavingProfile(true);

    const payload: any = {
      full_name: fullName,
      email: email,
      phone_number: phoneNumber,
      avatar_url: avatarUrl,
      currency,
    };

    if (newPassword) {
      payload.password = newPassword;
    }

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_profile',
          payload,
          userId: user?.id,
        }),
      });

      if (res.ok) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('user_name', fullName);
          sessionStorage.setItem('user_email', email);
          sessionStorage.setItem('user_phone', phoneNumber);
          sessionStorage.setItem('user_avatar', avatarUrl);
          if (user?.role === 'admin' || user?.role === 'superadmin' || user?.id === 'usr_admin_999') {
            localStorage.setItem('admin_wa_number', phoneNumber);
            sessionStorage.setItem('admin_wa_number', phoneNumber);
          }
        }
        setProfileSaved(true);
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setProfileSaved(false), 3500);
        loadData();
      } else {
        setProfileError('Gagal menyimpan profil.');
      }
    } catch (err: any) {
      setProfileError(err.message || 'Error saat menyimpan profil.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Telegram Test Connection
  const handleTestConnection = async () => {
    if (!botToken.trim()) return;
    setTelegramStatus('testing');
    setTestResult(null);

    try {
      const res = await fetch('/api/telegram/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: botToken.trim(),
          userId: user?.id,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setTelegramStatus('connected');
        setTestResult({
          ok: true,
          message: `Bot @${data.bot?.username || 'TataDana'} berhasil terhubung dan Webhook aktif!`,
          botInfo: data.bot,
        });
        loadData();
      } else {
        setTelegramStatus('disconnected');
        setTestResult({
          ok: false,
          message: data.error || 'Gagal menghubungi Telegram API',
        });
      }
    } catch (e: any) {
      setTelegramStatus('disconnected');
      setTestResult({
        ok: false,
        message: e.message || 'Koneksi jaringan error',
      });
    }
  };

  // Reminder Save
  const handleSaveReminder = async () => {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_profile',
        payload: {
          reminder_enabled: reminderEnabled,
          reminder_frequency: reminderFrequency,
          reminder_time_1: `${reminderTime1}:00`,
          reminder_time_2: `${reminderTime2}:00`,
        },
        userId: user?.id,
      }),
    });
    if (res.ok) {
      setReminderSaved(true);
      setTimeout(() => setReminderSaved(false), 3000);
      loadData();
    }
  };

  // Category Add
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const payload = {
      name: newCatName.trim(),
      emoji: newCatEmoji,
      color: newCatColor,
      type: newCatType,
    };

    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_category',
        payload,
        userId: user?.id,
      }),
    });

    if (res.ok) {
      setNewCatName('');
      loadData();
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <Header
        title="Pengaturan Akun & Integrasi"
        subtitle="Konfigurasi bot Telegram, jadwal reminder harian, profil, dan kategori custom"
      />

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-4">
        {[
          { id: 'telegram', label: 'Telegram Bot', icon: Send },
          { id: 'reminder', label: 'Reminder Harian', icon: BellRing },
          { id: 'categories', label: 'Kategori Custom', icon: Tags },
          { id: 'profile', label: 'Profil Saya', icon: User },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Telegram Bot Integration */}
      {activeTab === 'telegram' && (
        <div className="space-y-6 max-w-3xl">
          {/* Status Badge Banner */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-3.5 h-3.5 rounded-full ${
                  telegramStatus === 'connected'
                    ? 'bg-emerald-500 animate-pulse'
                    : telegramStatus === 'testing'
                    ? 'bg-amber-500 animate-bounce'
                    : 'bg-rose-500'
                }`}
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">Status Koneksi Telegram:</span>
                <span className="text-xs text-slate-500">
                  {telegramStatus === 'connected'
                    ? '🟢 Terhubung — Webhook aktif menerima chat & foto'
                    : telegramStatus === 'testing'
                    ? '⏳ Testing koneksi & mendaftarkan webhook...'
                    : '🔴 Tidak Terhubung'}
                </span>
              </div>
            </div>

            {user?.telegram_username && (
              <Badge variant="blue" size="sm">
                @{user.telegram_username}
              </Badge>
            )}
          </div>

          {/* Direct Telegram Bot CTA */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Bot Telegram Aktif (@TataDanaVinaBot)</h4>
                <p className="text-[11px] text-slate-500">
                  Bot Telegram Anda aktif dan siap menerima pesan teks, voice note, serta foto struk langsung dari handphone.
                </p>
              </div>
            </div>
            <a
              href="https://t.me/TataDanaVinaBot"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shrink-0 inline-flex items-center gap-1.5 shadow-sm"
            >
              <span>Buka Bot Telegram</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* BotFather Step-by-Step Inline Guide */}
          <Card className="p-6 bg-gradient-to-br from-slate-900 to-slate-950 text-white border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-400" />
                <span>Panduan Step-by-Step Setup Bot Telegram</span>
              </h3>
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-brand-400 hover:underline inline-flex items-center gap-1 font-medium"
              >
                <span>Buka @BotFather</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <ol className="space-y-2.5 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
              <li>
                Buka aplikasi Telegram dan cari akun resmi <strong>@BotFather</strong>.
              </li>
              <li>
                Kirim perintah <code className="bg-slate-800 text-brand-300 px-1.5 py-0.5 rounded">/newbot</code> lalu beri nama bot kamu (misal: <em>TataDana Vina</em>).
              </li>
              <li>
                Beri username bot berakhiran <code className="bg-slate-800 text-brand-300 px-1.5 py-0.5 rounded">_bot</code> (misal: <em>tatadana_vina_bot</em>).
              </li>
              <li>
                Salin token API HTTP dari pesan konfirmasi @BotFather (format: <code className="bg-slate-800 text-brand-300 px-1.5 py-0.5 rounded">123456789:ABCdefGhI...</code>).
              </li>
              <li>
                Tempel (paste) token tersebut pada kolom di bawah ini dan tekan tombol <strong>Test Koneksi</strong>.
              </li>
            </ol>
          </Card>

          {/* Token Input Form */}
          <Card className="p-6">
            <div className="space-y-4">
              <Input
                label="HTTP API Token Bot Telegram"
                placeholder="123456789:AAHk..."
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                helperText="Token disimpan terenkripsi dan otomatis dipasangi Webhook resmi TataDana."
              />

              {testResult && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-center gap-2 font-medium ${
                    testResult.ok
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {testResult.ok ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleTestConnection}
                  isLoading={telegramStatus === 'testing'}
                  variant="primary"
                  leftIcon={<Send className="w-4 h-4" />}
                >
                  {telegramStatus === 'testing' ? '⏳ Testing...' : 'Test Koneksi & Aktifkan Webhook'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: Reminder Tab */}
      {activeTab === 'reminder' && (
        <div className="space-y-6 max-w-3xl">
          <Card className="p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Pengingat Catat Keuangan Harian</h3>
                <p className="text-xs text-slate-500">
                  Dikirimkan otomatis ke chat Telegram kamu sesuai jam pilihan (WIB).
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
              </label>
            </div>

            {reminderEnabled && (
              <div className="space-y-5 text-xs">
                {/* Frequency selector: Max 2x/hari per product spec */}
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Frekuensi Pengingat (Maksimal 2x Sehari)
                  </label>
                  <div className="grid grid-cols-2 gap-3 max-w-sm">
                    <button
                      type="button"
                      onClick={() => setReminderFrequency(1)}
                      className={`p-3 rounded-xl border text-center font-bold transition-all ${
                        reminderFrequency === 1
                          ? 'border-brand-500 bg-blue-50 text-brand-700 shadow-sm'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      1x Sehari
                    </button>
                    <button
                      type="button"
                      onClick={() => setReminderFrequency(2)}
                      className={`p-3 rounded-xl border text-center font-bold transition-all ${
                        reminderFrequency === 2
                          ? 'border-brand-500 bg-blue-50 text-brand-700 shadow-sm'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      2x Sehari
                    </button>
                  </div>
                </div>

                {/* Reminder Times */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Jam Pengingat Ke-1 (WIB)
                    </label>
                    <input
                      type="time"
                      value={reminderTime1}
                      onChange={(e) => setReminderTime1(e.target.value)}
                      className="w-full rounded-xl border border-surface-border bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  {reminderFrequency === 2 && (
                    <div>
                      <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        Jam Pengingat Ke-2 (WIB)
                      </label>
                      <input
                        type="time"
                        value={reminderTime2}
                        onChange={(e) => setReminderTime2(e.target.value)}
                        className="w-full rounded-xl border border-surface-border bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  )}
                </div>

                {/* Message Preview */}
                <div className="pt-2">
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Preview Pesan Reminder di Telegram:
                  </label>
                  <div className="bg-slate-900 text-slate-200 font-mono text-xs p-4 rounded-2xl whitespace-pre-wrap border border-slate-800">
                    {formatDailyReminderReply()}
                  </div>
                </div>

                {reminderSaved && (
                  <p className="text-emerald-600 font-semibold text-xs">
                    ✅ Jadwal pengingat berhasil disimpan!
                  </p>
                )}

                <div className="flex justify-end pt-2">
                  <Button onClick={handleSaveReminder} variant="primary" size="sm">
                    Simpan Jadwal Pengingat
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 3: Categories Management */}
      {activeTab === 'categories' && (
        <div className="space-y-6 max-w-3xl">
          <Card className="p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Tambah Kategori Custom Baru</h3>
            <form onSubmit={handleAddCategory} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Nama Kategori"
                  placeholder="contoh: Skincare, Kucing"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  required
                />
                <Input
                  label="Emoji"
                  placeholder="💄"
                  value={newCatEmoji}
                  onChange={(e) => setNewCatEmoji(e.target.value)}
                  required
                />
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Jenis
                  </label>
                  <select
                    value={newCatType}
                    onChange={(e) => setNewCatType(e.target.value as any)}
                    className="w-full rounded-xl border border-surface-border bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                  >
                    <option value="expense">Pengeluaran</option>
                    <option value="income">Pemasukan</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button type="submit" variant="primary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                  Tambah Kategori
                </Button>
              </div>
            </form>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Daftar Kategori Terdaftar</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{c.emoji}</span>
                    <span className="font-semibold text-slate-800">{c.name}</span>
                  </div>
                  <Badge variant={c.type === 'expense' ? 'red' : 'green'} size="sm">
                    {c.type === 'expense' ? 'Out' : 'In'}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: Profile Tab per specification */}
      {activeTab === 'profile' && (
        <div className="space-y-6 max-w-3xl">
          {/* Current Avatar & User Card */}
          <Card className="p-6 bg-gradient-to-r from-blue-50/70 via-white to-indigo-50/50 border-slate-200">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <div className="relative group">
                <img
                  src={avatarUrl}
                  alt={fullName || 'Avatar Pengguna'}
                  className="w-24 h-24 rounded-3xl object-cover border-4 border-white shadow-lg ring-2 ring-brand-500/20"
                />
                <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl bg-brand-500 text-white flex items-center justify-center shadow-md border-2 border-white">
                  <Camera className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="text-center sm:text-left flex-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h3 className="text-lg font-black text-slate-900">{fullName || 'Pengguna TataDana'}</h3>
                  <Badge variant={user?.role === 'superadmin' || user?.role === 'admin' ? 'red' : 'brand'} size="sm">
                    {user?.role === 'superadmin' ? 'Superadmin' : user?.role === 'admin' ? 'Admin' : 'User Biasa'}
                  </Badge>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    user?.verification_status === 'pending'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}>
                    {user?.verification_status === 'pending' ? 'Pending Verifikasi' : 'Terverifikasi (Verified)'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-1">{email || 'email@tatadana.id'}</p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{phoneNumber || '08xxxxxxxxxx'}</p>
                <div className="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start text-[11px] text-slate-600">
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200">
                    Paket: <strong className="text-brand-600 uppercase">{user?.plan || 'Starter'}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200">
                    Mata Uang: <strong>{currency}</strong>
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* 4 Pilihan Pengganti Avatar Preset */}
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-600" />
                <span>Pilih Foto Profil (4 Pilihan Avatar Preset)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Klik salah satu avatar preset di bawah ini untuk langsung mengganti foto profil Anda secara instan.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {AVATAR_PRESETS.map((preset) => {
                const isSelected = avatarUrl === preset.url;
                return (
                  <div
                    key={preset.id}
                    onClick={() => setAvatarUrl(preset.url)}
                    className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center text-center relative group ${
                      isSelected
                        ? 'border-brand-500 bg-blue-50/60 shadow-md ring-2 ring-brand-400/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="relative">
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="w-16 h-16 rounded-2xl object-cover shadow-sm transition-transform group-hover:scale-105"
                      />
                      {isSelected && (
                        <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-brand-500 text-white flex items-center justify-center shadow-md border-2 border-white">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <span className="font-bold text-slate-900 text-xs mt-2 truncate w-full block">
                      {preset.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium truncate w-full block mt-0.5">
                      {preset.description}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Custom Avatar URL option */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2">
              <input
                type="url"
                placeholder="Atau tempel URL gambar kustom di sini..."
                value={customAvatarInput}
                onChange={(e) => setCustomAvatarInput(e.target.value)}
                className="w-full sm:flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (customAvatarInput.trim()) {
                    setAvatarUrl(customAvatarInput.trim());
                    setCustomAvatarInput('');
                  }
                }}
                disabled={!customAvatarInput.trim()}
                className="text-xs shrink-0"
              >
                Gunakan URL Kustom
              </Button>
            </div>
          </Card>

          {/* Form Detail Pengguna & Kata Sandi */}
          <Card className="p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Informasi Akun &amp; Kredensial</h3>
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Nama Lengkap"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  leftIcon={<User className="w-4 h-4 text-slate-400" />}
                  placeholder="Nama Lengkap Anda"
                  required
                />

                <Input
                  label="Alamat Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
                  placeholder="nama@email.com"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Nomor Handphone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  leftIcon={<Smartphone className="w-4 h-4 text-slate-400" />}
                  placeholder="08xxxxxxxxxx"
                  helperText="Nomor aktif yang digunakan untuk menghubungkan akun Telegram."
                  required
                />

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mata Uang Default
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded-xl border border-surface-border bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-500"
                  >
                    <option value="IDR">IDR — Rupiah Indonesia (Rp)</option>
                  </select>
                </div>
              </div>

              {/* Password Section */}
              <div className="pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  Ganti Kata Sandi (Opsional)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Kata Sandi Baru"
                    type="password"
                    placeholder="Kosongkan jika tidak ingin mengubah"
                    leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />

                  <Input
                    label="Konfirmasi Kata Sandi Baru"
                    type="password"
                    placeholder="Ulangi kata sandi baru"
                    leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              {profileError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {profileError}
                </div>
              )}

              {profileSaved && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>✅ Profil, foto avatar, dan kredensial berhasil disimpan!</span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button type="submit" variant="primary" size="sm" isLoading={isSavingProfile}>
                  Simpan Perubahan Profil
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
