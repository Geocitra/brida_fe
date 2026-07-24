import React from 'react';
import type { CausalFactorItem } from '../../../services/analysis.service';
import { Cpu, Info } from 'lucide-react';

interface CausalFactorChartProps {
  summaryText: string;
  causalFactors: CausalFactorItem[];
}

export const CausalFactorChart: React.FC<CausalFactorChartProps> = ({
  summaryText,
  causalFactors,
}) => {
  return (
    <div className="bg-white border border-slate-300 p-6 rounded-none shadow-xs font-roboto space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <Cpu size={20} className="text-teal-700 shrink-0" />
          <h3 className="text-h3 text-slate-900">Analisis Faktor Penyebab (Causal Inference AI)</h3>
        </div>
        <span className="text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 uppercase tracking-wider rounded-none">
          Gemini AI Engine
        </span>
      </div>

      <p className="text-body text-slate-700 bg-slate-50 border-l-4 border-teal-600 p-3 text-xs font-medium">
        {summaryText}
      </p>

      <div className="space-y-4 pt-1">
        {causalFactors.map((item, idx) => (
          <div key={idx} className="space-y-1.5 bg-slate-50/70 p-3.5 border border-slate-200 rounded-none">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900">
                {idx + 1}. {item.factor}
              </span>
              <span className="font-bold text-teal-700 bg-teal-100 px-2 py-0.5 border border-teal-200 text-[11px]">
                Kontribusi: {item.weightPercentage}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-200 h-2 rounded-none overflow-hidden">
              <div
                className="bg-teal-600 h-2 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(5, item.weightPercentage))}%` }}
              />
            </div>

            <div className="flex items-start gap-1.5 text-[11px] text-slate-600 pt-1 font-medium">
              <Info size={13} className="text-slate-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-700">[{item.category}]</strong> — {item.description}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
