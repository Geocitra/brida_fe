import React from 'react';
import { Coins, Database, Loader2 } from 'lucide-react';

export interface TokenBudget {
    totalTokens: number;
    remainingTokens: number;
    estimatedCostIdr: number;
    remainingCostIdr: number;
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

  const { totalTokens, remainingTokens, estimatedCostIdr, remainingCostIdr, maxMonthlyPaguIdr, quotaPercentage, paguStatus } = budget;

  const statusConfigs = {
    SAFE: {
      badge: 'text-emerald-800',
      bar: 'bg-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.3)]',
      label: 'Aman',
      pulse: 'bg-emerald-500',
      description: 'Penggunaan AI masih sangat aman. Sisa kuota bulanan Anda masih melimpah.',
    },
    ALERT: {
      badge: 'text-amber-800',
      bar: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]',
      label: 'Waspada',
      pulse: 'bg-amber-500',
      description: 'Penggunaan AI sudah setengah jalan dari limit bulanan. Batasi aktivitas yang tidak terlalu penting.',
    },
    WARNING: {
      badge: 'text-rose-800',
      bar: 'bg-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.3)]',
      label: 'Hampir Habis / Kritis',
      pulse: 'bg-rose-500',
      description: 'Kuota AI Anda sudah kritis dan hampir habis! Harap batasi penggunaan agar sistem tidak terkunci.',
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
        </div>
      </div>

      {/* Sisi Kanan: Detail Transaksional dengan Jarak Simetris yang Lega */}
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
        </div>

        {/* Kolom 2: Sisa Saldo (IDR) */}
        <div className="flex flex-col justify-center px-6">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5 select-none">
            <Coins size={11} className="text-teal-700 shrink-0" />
            <span>Sisa Saldo</span>
          </span>
          <span className="text-lg font-black text-slate-900 tracking-tight font-mono">
            Rp {remainingCostIdr.toLocaleString('id-ID')}
          </span>
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