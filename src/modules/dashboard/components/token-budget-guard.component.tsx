import React from 'react';
import { Coins, Database, Loader2, AlertTriangle, ExternalLink } from 'lucide-react';

export interface TokenBudget {
    totalTokens: number;
    remainingTokens: number;
    estimatedCostIdr: number;
    remainingCostIdr: number;
    remainingCostUsd: number;
    totalCreditUsd: number;
    maxMonthlyPaguIdr: number;
    quotaPercentage: number;
    paguStatus: 'SAFE' | 'ALERT' | 'WARNING';
}

interface TokenBudgetGuardProps {
    budget?: TokenBudget | null;
    isLoading?: boolean;
}

export const TokenBudgetGuard: React.FC<TokenBudgetGuardProps> = ({ budget, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="w-full py-4 flex items-center justify-center gap-2.5 font-roboto select-none">
        <Loader2 size={16} className="animate-spin text-teal-700" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Menghitung Sisa Kuota AI Bulan Ini...
        </span>
      </div>
    );
  }

  if (!budget) return null;

  const { remainingTokens, remainingCostIdr, remainingCostUsd, totalCreditUsd, maxMonthlyPaguIdr, quotaPercentage, paguStatus } = budget;

  const statusConfigs = {
    SAFE: {
      badge: 'text-emerald-800',
      bar: 'bg-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.3)]',
      label: 'Aman',
      pulse: 'bg-emerald-500',
      description: 'Penggunaan AI masih sangat aman. Sisa kuota bulanan Anda masih melimpah.',
      wrapperExtra: '',
    },
    ALERT: {
      badge: 'text-amber-700',
      bar: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]',
      label: 'Waspada',
      pulse: 'bg-amber-500',
      description: 'Sudah lebih dari setengah kredit digunakan. Batasi aktivitas AI yang tidak mendesak.',
      wrapperExtra: '',
    },
    WARNING: {
      badge: 'text-rose-700 animate-pulse',
      bar: 'bg-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.4)]',
      label: '⚡ Kritis — Segera Isi Ulang',
      pulse: 'bg-rose-500',
      description: 'Sisa kredit AI sudah sangat menipis! Sistem AI akan berhenti bekerja ketika kredit habis.',
      wrapperExtra: 'outline outline-1 outline-rose-300/40',
    },
  };

  const currentConfig = statusConfigs[paguStatus] || statusConfigs.SAFE;

  return (
    <div className="w-full py-1 flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-colors rounded-none font-roboto">
      {/* Sisi Kiri: Monitor Kuota & Progress Line */}
      <div className="flex-1 space-y-3.5 text-left">
        <div className="flex flex-wrap items-center gap-2.5 select-none">
         
          <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
            PEMANTAUAN KUOTA AI BULANAN
          </span>
          <span className={`text-[9px] font-black uppercase tracking-wider ${currentConfig.badge}`}>
            Status Kuota: {currentConfig.label}
          </span>
        </div>

        {/* Bar Indikator Kapasitas */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-baseline select-none">
            <span className="text-xs font-semibold text-slate-500">Kuota Bulanan Terpakai:</span>
            <span className="text-sm font-black text-slate-800 font-mono">{quotaPercentage}%</span>
          </div>
          <div className="w-full bg-slate-200/60 h-1.5 rounded-none overflow-hidden border border-slate-300/20 select-none">
            <div
              className={`h-full rounded-none transition-all duration-1000 ease-out ${currentConfig.bar}`}
              style={{ width: `${quotaPercentage}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
            {currentConfig.description}
          </p>

          {/* Inline Alert — hanya muncul saat ALERT atau WARNING, tanpa drama */}
          {paguStatus !== 'SAFE' && (
            <div className={`flex items-center justify-between gap-3 mt-2 px-3 py-2 border-l-2 ${
              paguStatus === 'WARNING'
                ? 'border-rose-400 bg-rose-50'
                : 'border-amber-400 bg-amber-50'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle
                  size={11}
                  className={`shrink-0 ${
                    paguStatus === 'WARNING' ? 'text-rose-500' : 'text-amber-500'
                  }`}
                />
                <span className={`text-[10px] font-semibold truncate ${
                  paguStatus === 'WARNING' ? 'text-rose-700' : 'text-amber-700'
                }`}>
                  {paguStatus === 'WARNING'
                    ? `Sisa kredit tinggal ${(100 - quotaPercentage).toFixed(1)}% — segera isi ulang agar sistem AI tidak berhenti.`
                    : `Kredit sudah terpakai ${quotaPercentage}% — pantau penggunaan secara berkala.`
                  }
                </span>
              </div>
              <a
                href="https://platform.openai.com/account/billing"
                target="_blank"
                rel="noopener noreferrer"
                className={`shrink-0 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider whitespace-nowrap ${
                  paguStatus === 'WARNING' ? 'text-rose-600 hover:text-rose-800' : 'text-amber-600 hover:text-amber-800'
                } transition-colors`}
              >
                <ExternalLink size={9} strokeWidth={2.5} />
                {paguStatus === 'WARNING' ? 'Isi Sekarang' : 'Cek Billing'}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Sisi Kanan: Detail Transaksional */}
      <div className="flex items-center divide-x divide-slate-200 min-w-full lg:min-w-0 lg:pl-6 text-left no-print">
        {/* Kolom 1: Total Kredit */}
        <div className="flex flex-col justify-center pr-6">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5 select-none">
            <Coins size={11} className="text-teal-700 shrink-0" />
            <span>Total Kredit</span>
          </span>
          <span className="text-lg font-black text-slate-900 tracking-tight font-mono">
            Rp {maxMonthlyPaguIdr.toLocaleString('id-ID')}
          </span>
          {totalCreditUsd !== undefined && (
            <span className="text-[10px] font-medium text-slate-400 font-mono">${totalCreditUsd.toFixed(2)}</span>
          )}
        </div>

        {/* Kolom 2: Sisa Saldo (IDR + USD) */}
        <div className="flex flex-col justify-center px-6">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5 select-none">
            <Coins size={11} className="text-teal-700 shrink-0" />
            <span>Sisa Saldo</span>
          </span>
          <span className={`text-lg font-black tracking-tight font-mono ${
            paguStatus === 'WARNING' ? 'text-rose-600' : paguStatus === 'ALERT' ? 'text-amber-600' : 'text-slate-900'
          }`}>
            Rp {remainingCostIdr.toLocaleString('id-ID')}
          </span>
          {remainingCostUsd !== undefined && (
            <span className={`text-[10px] font-bold font-mono ${
              paguStatus === 'WARNING' ? 'text-rose-500' : paguStatus === 'ALERT' ? 'text-amber-500' : 'text-slate-400'
            }`}>${remainingCostUsd.toFixed(2)} USD</span>
          )}
        </div>

        {/* Kolom 3: Sisa Token */}
        <div className="pl-6 flex flex-col justify-center">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5 select-none">
            <Database size={11} className="text-teal-700 shrink-0" />
            <span>Sisa Token</span>
          </span>
          <span className="text-lg font-black text-slate-900 tracking-tight font-mono">
            {remainingTokens.toLocaleString('id-ID')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TokenBudgetGuard;