import React from 'react';
import type { CausalFactorItem } from '../../../services/analysis.service';
import { Cpu, Info } from 'lucide-react';

const stripCitationTokens = (content?: string | null): string => {
  if (!content) return '';

  return content
    .replace(/\[(?:[a-f0-9-]{8,}|doc(?:[-_a-z0-9]+)?):\d+\]/gi, '')
    .replace(/\[(?:[a-f0-9-]{8,}|doc(?:[-_a-z0-9]+)?):\d+\]\[(?:[a-f0-9-]{8,}|doc(?:[-_a-z0-9]+)?):\d+\]/gi, '')
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

interface CausalFactorChartProps {
  summaryText: string;
  causalFactors: CausalFactorItem[];
}

export const CausalFactorChart: React.FC<CausalFactorChartProps> = ({
  summaryText,
  causalFactors,
}) => {
  return (
    <div className="font-roboto space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <Cpu size={20} className="text-teal-700 shrink-0" />
          <h3 className="text-h3 text-slate-900">Analisis Faktor Penyebab</h3>
        </div>
      </div>

      <p className="text-xs text-slate-700 font-medium leading-relaxed text-justify" style={{ textAlign: 'justify' }}>
        {stripCitationTokens(summaryText)}
      </p>

      <div className="divide-y divide-slate-200 pt-1">
        {causalFactors.map((item, idx) => (
          <div key={idx} className="py-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900">
                {idx + 1}. {stripCitationTokens(item.factor)}
              </span>
              <span className="font-bold text-teal-900 px-2 py-0.5 text-[11px] rounded-none">
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
                <strong className="text-slate-700">[{stripCitationTokens(item.category)}]</strong> — {stripCitationTokens(item.description)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
