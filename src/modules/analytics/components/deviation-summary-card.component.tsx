import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface DeviationSummaryCardProps {
  indicatorName: string;
  sector: string;
  targetText: string;
  realizationText: string;
  deviationPercentage: number;
  urgencyStatus: 'NORMAL' | 'WASPADA' | 'KRITIS';
}

export const DeviationSummaryCard: React.FC<DeviationSummaryCardProps> = ({
  indicatorName,
  sector,
  targetText,
  realizationText,
  deviationPercentage,
  urgencyStatus,
}) => {
  return (
    <div className="bg-slate-900 text-white border border-slate-800 p-6 rounded-none shadow-md font-roboto space-y-4">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-3 gap-2">
        <div>
          <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider block mb-0.5">
            Sektor: {sector}
          </span>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Ringkasan Deviasi: {indicatorName}
          </h2>
        </div>

        <span className={`self-start sm:self-auto px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-none inline-flex items-center gap-1.5 border ${
          urgencyStatus === 'KRITIS'
            ? 'bg-red-950 text-red-400 border-red-700/60'
            : urgencyStatus === 'WASPADA'
            ? 'bg-amber-950 text-amber-400 border-amber-700/60'
            : 'bg-emerald-950 text-emerald-400 border-emerald-700/60'
        }`}>
          {urgencyStatus === 'KRITIS' && <AlertCircle size={14} />}
          {urgencyStatus === 'WASPADA' && <AlertTriangle size={14} />}
          {urgencyStatus === 'NORMAL' && <CheckCircle2 size={14} />}
          <span>Status {urgencyStatus}</span>
        </span>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
        <div className="bg-slate-950 p-4 border border-slate-800 rounded-none">
          <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Baseline Target (RPJMD)
          </span>
          <span className="font-bold text-2xl text-slate-100">{targetText}</span>
        </div>

        <div className="bg-slate-950 p-4 border border-slate-800 rounded-none">
          <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Realisasi Capaian (Aktual)
          </span>
          <span className="font-bold text-2xl text-slate-100">{realizationText}</span>
        </div>

        <div className="bg-slate-950 p-4 border border-slate-800 rounded-none">
          <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Persentase Deviasi
          </span>
          <div className="flex items-center gap-2">
            <span className={`font-bold text-2xl ${deviationPercentage < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {deviationPercentage > 0 ? `+${deviationPercentage}` : deviationPercentage}%
            </span>
            {deviationPercentage < 0 ? (
              <ArrowDownRight size={22} className="text-red-400 shrink-0" />
            ) : (
              <ArrowUpRight size={22} className="text-emerald-400 shrink-0" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
