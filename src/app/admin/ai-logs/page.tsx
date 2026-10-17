'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';
import { formatShortWIB } from '@/lib/utils/date-wib';
import { AILog } from '@/lib/types';
import { Activity, Clock, Zap, DollarSign } from 'lucide-react';

export default function AdminAILogsPage() {
  const [logs, setLogs] = useState<AILog[]>([]);

  useEffect(() => {
    fetch('/api/data?userId=usr_admin_999')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.aiLogs) {
          setLogs(data.aiLogs);
        }
      });
  }, []);

  const totalCost = logs.reduce((sum, l) => sum + l.cost_idr, 0);
  const avgLatency = logs.length > 0 ? Math.round(logs.reduce((sum, l) => sum + l.latency_ms, 0) / logs.length) : 0;
  const totalTokens = logs.reduce((sum, l) => sum + l.prompt_tokens + l.completion_tokens, 0);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-black tracking-tight text-white">Log Pemanggilan AI & Biaya</h1>
        <p className="text-xs text-slate-400 mt-1">
          Monitoring penggunaan token, latensi pemrosesan NLP, OCR struk belanja, dan estimasi biaya Rupiah
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Total Request AI
          </span>
          <div className="text-2xl font-black text-white mt-1">{logs.length} kali</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Rata-rata Latensi
          </span>
          <div className="text-2xl font-black text-amber-400 mt-1">{avgLatency} ms</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Total Token Digunakan
          </span>
          <div className="text-2xl font-black text-purple-400 mt-1">{totalTokens.toLocaleString()}</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Estimasi Biaya API
          </span>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            Rp{totalCost.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900">
        <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Riwayat Pemanggilan Real-Time
          </span>
          <span className="text-[11px] text-slate-500">Auto-logged on every webhook invocation</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="p-3.5">Waktu</th>
                <th className="p-3.5">Provider & Model</th>
                <th className="p-3.5">Tipe Aksi</th>
                <th className="p-3.5">Latensi</th>
                <th className="p-3.5">Token (Prompt/Comp)</th>
                <th className="p-3.5">Biaya (IDR)</th>
                <th className="p-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 text-slate-400 whitespace-nowrap">
                    {formatShortWIB(l.created_at)}
                  </td>
                  <td className="p-3.5">
                    <span className="font-bold text-white block">{l.provider}</span>
                    <span className="font-mono text-[10px] text-purple-400">{l.model}</span>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase bg-slate-800 text-slate-300">
                      {l.action_type}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono text-amber-400">{l.latency_ms}ms</td>
                  <td className="p-3.5 font-mono text-slate-400">
                    {l.prompt_tokens} / {l.completion_tokens}
                  </td>
                  <td className="p-3.5 font-mono text-emerald-400">Rp{l.cost_idr.toFixed(2)}</td>
                  <td className="p-3.5 text-right">
                    <Badge variant={l.status === 'success' ? 'green' : 'red'} size="sm">
                      {l.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
