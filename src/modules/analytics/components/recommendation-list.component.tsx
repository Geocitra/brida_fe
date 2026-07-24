import React from 'react';
import type { RecommendationItem } from '../../../services/analysis.service';
import { ClipboardList, Calendar, UserCheck, DollarSign } from 'lucide-react';

interface RecommendationListProps {
  recommendations: RecommendationItem[];
}

export const RecommendationList: React.FC<RecommendationListProps> = ({
  recommendations,
}) => {
  return (
    <div className="bg-white border border-slate-300 p-6 rounded-none shadow-xs font-roboto space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <ClipboardList size={20} className="text-teal-700 shrink-0" />
          <h3 className="text-h3 text-slate-900">Matriks Rekomendasi Respon Prioritas</h3>
        </div>
        <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-300 px-2.5 py-1 uppercase tracking-wider rounded-none">
          Actionable Executive Output
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              <th className="py-2.5 px-3">Tindakan Rekomendasi</th>
              <th className="py-2.5 px-3">Penanggung Jawab (PIC)</th>
              <th className="py-2.5 px-3">Tenggat Waktu</th>
              <th className="py-2.5 px-3 text-right">Estimasi Biaya</th>
              <th className="py-2.5 px-3 text-center">Prioritas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs font-medium text-slate-900">
            {recommendations.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-3 font-bold text-slate-900">
                  {item.actionTitle}
                </td>
                <td className="py-3 px-3 text-slate-700">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <UserCheck size={14} className="text-teal-700 shrink-0" />
                    <span>{item.pic}</span>
                  </div>
                </td>
                <td className="py-3 px-3 text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-slate-500 shrink-0" />
                    <span>{item.deadline}</span>
                  </div>
                </td>
                <td className="py-3 px-3 text-right font-bold text-slate-900">
                  <div className="inline-flex items-center gap-1 text-slate-900 justify-end">
                    <DollarSign size={13} className="text-teal-700 shrink-0" />
                    <span>{item.estimatedCostText}</span>
                  </div>
                </td>
                <td className="py-3 px-3 text-center">
                  <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-none border ${
                    item.priority === 'TINGGI'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : item.priority === 'SEDANG'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}>
                    {item.priority}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
