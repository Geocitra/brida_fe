import React from 'react';
import { MOCK_DATA } from '../../../services/mock-data.service';
import { BarChart3, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const renderStatus = (status: string) => {
    switch (status) {
      case 'OPTIMAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-none">
            <CheckCircle2 size={12} className="text-emerald-700" /> Optimal
          </span>
        );
      case 'PERLU_PERHATIAN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold rounded-none">
            <Clock size={12} className="text-amber-700" /> Perlu Perhatian
          </span>
        );
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-100 border border-red-300 text-red-800 text-xs font-bold rounded-none">
            <AlertCircle size={12} className="text-red-700" /> Kritis
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-h1 mb-1">Analisis Deterministik Statis</h1>
        <p className="text-body">
          Rekapitulasi metrik pembangunan daerah berbasis perhitungan matematis murni tanpa biaya token AI (Zero-Token Cost).
        </p>
      </div>

      {/* Tabel Metrik Deterministik (Non-Nested Flat Design) */}
      <div className="bg-white border border-slate-300 rounded-none shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-300 bg-slate-100 flex items-center justify-between">
          <h2 className="text-h2 flex items-center gap-2">
            <BarChart3 size={20} className="text-teal-700" />
            <span>Matriks Capaian Indikator Utama Mimika</span>
          </h2>
          <span className="text-xs font-bold text-teal-800 bg-teal-100 border border-teal-300 px-3 py-1 rounded-none">
            Deterministik Engine Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-200/80 text-slate-800 font-roboto text-xs uppercase tracking-wider font-bold">
                <th className="py-3 px-4">Kategori Indikator</th>
                <th className="py-3 px-4 text-center">Target Perencanaan</th>
                <th className="py-3 px-4 text-center">Realisasi Lapangan</th>
                <th className="py-3 px-4 text-center">Persentase Capaian</th>
                <th className="py-3 px-4 text-right">Status Evaluasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {MOCK_DATA.deterministicMetrics.map((item, idx) => {
                const percentage = Math.round((item.realizedCount / item.targetCount) * 100);
                return (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 text-sm">
                      {item.category}
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-700 font-medium">
                      {item.targetCount} {item.unit}
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-900 font-bold">
                      {item.realizedCount} {item.unit}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`font-bold text-sm ${percentage >= 80 ? 'text-emerald-700' : percentage >= 50 ? 'text-amber-700' : 'text-red-700'}`}>
                        {percentage}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {renderStatus(item.status)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
