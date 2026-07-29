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
    <div className="font-roboto space-y-4">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-3 gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">
            Sektor: {sector}
          </h2>
          <span className="text-[12px] font-bold text-teal-800 uppercase tracking-wider block mb-0.5">
            Ringkasan Deviasi: {indicatorName}
          </span>
        </div>

        <span className={`self-start sm:self-auto px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-none inline-flex items-center gap-1.5 border ${urgencyStatus === 'KRITIS'
          ? 'bg-red-50 text-red-800 border-red-300'
          : urgencyStatus === 'WASPADA'
            ? 'bg-amber-50 text-amber-900 border-amber-300'
            : 'bg-emerald-50 text-emerald-900 border-emerald-300'
          }`}>
          {urgencyStatus === 'KRITIS' && <AlertCircle size={14} className="text-red-700" />}
          {urgencyStatus === 'WASPADA' && <AlertTriangle size={14} className="text-amber-700" />}
          {urgencyStatus === 'NORMAL' && <CheckCircle2 size={14} className="text-emerald-700" />}
          <span>Status {urgencyStatus}</span>
        </span>
      </div>

      {/* 3 Metric Sections - Flat Divided Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 border-y border-slate-200 py-4 bg-slate-50/50">
        <div className="px-4 py-2 md:py-0">
          <span className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Baseline Target (RPJMD)
          </span>
          <span className="font-bold text-2xl text-slate-900">{targetText}</span>
        </div>

        <div className="px-4 py-2 md:py-0">
          <span className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Realisasi Capaian (Aktual)
          </span>
          <span className="font-bold text-2xl text-slate-900">{realizationText}</span>
        </div>

        <div className="px-4 py-2 md:py-0">
          <span className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Persentase Deviasi
          </span>
          <div className="flex items-center gap-2">
            <span className={`font-bold text-2xl ${deviationPercentage < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
              {deviationPercentage > 0 ? `+${deviationPercentage}` : deviationPercentage}%
            </span>
            {deviationPercentage < 0 ? (
              <ArrowDownRight size={22} className="text-red-700 shrink-0" />
            ) : (
              <ArrowUpRight size={22} className="text-emerald-700 shrink-0" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
