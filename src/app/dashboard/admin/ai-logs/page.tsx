'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/dashboard/Header';
import { AdminTabNav } from '@/components/admin/AdminTabNav';
import { Badge } from '@/components/ui/Badge';
import { formatShortWIB } from '@/lib/utils/date-wib';
import { AILog } from '@/lib/types';
import { Activity, Clock, Zap, DollarSign, RefreshCw, Cpu } from 'lucide-react';
import { formatRupiah } from '@/lib/utils/currency';

export default function AdminAILogsPage() {
  const [logs, setLogs] = useState<AILog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = () => {
    setLoading(true);
    fetch('/api/data?userId=usr_admin_999')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.aiLogs) {
          setLogs(data.aiLogs);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const totalCost = logs.reduce((sum, l) => sum + (l.cost_idr || 0), 0);
  const avgLatency = logs.length > 0 ? Math.round(logs.reduce((sum, l) => sum + (l.latency_ms || 0), 0) / logs.length) : 0;
  const totalTokens = logs.reduce((sum, l) => sum + (l.prompt_tokens || 0) + (l.completion_tokens || 0), 0);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="Log Pemanggilan AI & Biaya"
        subtitle="Monitoring konsumsi token NLP, latensi pemrosesan instruksi keuangan, dan estimasi biaya Rupiah"
      />

      <AdminTabNav />

      <div className="p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Request AI
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">{logs.length} kali</div>
            <p className="text-[11px] text-slate-500 mt-1">Interaksi parser transaksi</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Rata-rata Latensi
            </span>
            <div className="text-2xl font-black text-amber-600 mt-1">{avgLatency} ms</div>
            <p className="text-[11px] text-slate-500 mt-1">Respon rata-rata AI server</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Token Terpakai
            </span>
            <div className="text-2xl font-black text-purple-600 mt-1">
              {totalTokens.toLocaleString('id-ID')}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Prompt & completion token</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Estimasi Biaya API
            </span>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              {formatRupiah(totalCost)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Biaya API multi-provider</p>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-600" />
              <h3 className="font-bold text-slate-900 text-sm">Aktivitas Pemrosesan AI Terbaru</h3>
            </div>
            <button
              onClick={loadLogs}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Segarkan</span>
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2 text-purple-600" />
              <span>Memuat data log pemanggilan AI...</span>
            </div>
          ) : logs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-4">Waktu</th>
                    <th className="p-4">Provider & Model</th>
                    <th className="p-4">Prompt Pengguna</th>
                    <th className="p-4">Token & Latensi</th>
                    <th className="p-4">Biaya (IDR)</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4 text-slate-500 text-[11px] whitespace-nowrap">
                        {formatShortWIB(log.created_at)}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-900 capitalize">{log.provider}</div>
                        <div className="text-[11px] text-purple-700 font-mono">{log.model}</div>
                      </td>
                      <td className="p-4 max-w-xs">
                        <span className="truncate block text-slate-800 font-mono text-[11px] bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                          {log.action_type || '-'}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="font-mono text-slate-700">
                          {log.prompt_tokens + log.completion_tokens} token
                        </div>
                        <div className="text-[11px] text-slate-400">{log.latency_ms} ms</div>
                      </td>
                      <td className="p-4 font-mono font-bold text-emerald-700 whitespace-nowrap">
                        {formatRupiah(log.cost_idr)}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === 'success'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {log.status === 'success' ? 'Sukses' : 'Gagal'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs">
              Belum ada riwayat pemanggilan AI yang tercatat.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
