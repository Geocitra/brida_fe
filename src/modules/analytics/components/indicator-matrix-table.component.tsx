import React, { useState } from 'react';
import type { IndicatorItem } from '../../../services/analysis.service';
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronRight, Search, Filter } from 'lucide-react';

interface IndicatorMatrixTableProps {
  indicators: IndicatorItem[];
  onSelectIndicator: (indicator: IndicatorItem) => void;
}

export const IndicatorMatrixTable: React.FC<IndicatorMatrixTableProps> = ({
  indicators,
  onSelectIndicator,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');

  const sectors = ['ALL', ...Array.from(new Set(indicators.map((i) => i.sector)))];

  const filtered = indicators.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.sector.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSector = selectedSector === 'ALL' || item.sector === selectedSector;
    return matchesSearch && matchesSector;
  });

  return (
    <div className="bg-white border border-slate-300 rounded-none shadow-xs font-roboto">
      {/* Table Toolbar Header */}
      <div className="p-4 border-b border-slate-300 bg-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari indikator daerah..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-400 text-xs text-slate-900 focus:outline-none focus:border-teal-600 rounded-none shadow-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Filter size={14} className="text-slate-500" />
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="bg-white border border-slate-400 px-3 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-teal-600 rounded-none shadow-xs"
            >
              {sectors.map((sec) => (
                <option key={sec} value={sec}>
                  {sec === 'ALL' ? 'Semua Sektor' : sec}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
          <span>Total: <strong className="text-slate-900">{filtered.length}</strong> Indikator</span>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-200 border-b border-slate-300 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              <th className="py-3 px-4">Indikator Pembangunan</th>
              <th className="py-3 px-4">Sektor / Bidang</th>
              <th className="py-3 px-4 text-right">Baseline Target</th>
              <th className="py-3 px-4 text-right">Realisasi Capaian</th>
              <th className="py-3 px-4 text-right">Deviasi (%)</th>
              <th className="py-3 px-4 text-center">Status Urgensi</th>
              <th className="py-3 px-4 text-center">Aksi Deep-Dive</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs font-medium text-slate-900">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 font-semibold">
                  Tidak ada indikator yang sesuai dengan filter pencarian.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => onSelectIndicator(item)}
                  className="hover:bg-teal-50/60 cursor-pointer transition-colors group"
                >
                  <td className="py-3.5 px-4 font-bold text-slate-900 group-hover:text-teal-800">
                    {item.name}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-medium">
                    {item.sector}
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-slate-700">
                    {item.baseline}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                    {item.realization}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold">
                    <span className={item.deviationPercentage < 0 ? 'text-red-700' : 'text-emerald-700'}>
                      {item.deviationPercentage > 0 ? `+${item.deviationPercentage}` : item.deviationPercentage}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-none border ${
                      item.urgencyStatus === 'KRITIS'
                        ? 'bg-red-100 text-red-800 border-red-300'
                        : item.urgencyStatus === 'WASPADA'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    }`}>
                      {item.urgencyStatus === 'KRITIS' && <AlertCircle size={12} />}
                      {item.urgencyStatus === 'WASPADA' && <AlertTriangle size={12} />}
                      {item.urgencyStatus === 'NORMAL' && <CheckCircle2 size={12} />}
                      <span>{item.urgencyStatus}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectIndicator(item);
                      }}
                      className="px-3 py-1 bg-teal-700 group-hover:bg-teal-800 text-white font-bold text-[11px] uppercase tracking-wider rounded-none inline-flex items-center gap-1 border border-teal-800 shadow-xs"
                    >
                      <span>Membedah</span>
                      <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
