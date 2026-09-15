import React, { useState } from 'react';
import { parseInlineStylesRaw } from './rich-message-renderer.component';
import { BarChart3, Table as TableIcon } from 'lucide-react';

interface MarkdownTableRendererProps {
  rawTable: string;
  activeDocIds?: string[];
  allDocs?: any[];
}

export const MarkdownTableRenderer: React.FC<MarkdownTableRendererProps> = ({
  rawTable,
  activeDocIds = [],
  allDocs = [],
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const lines = rawTable.trim().split('\n');
  if (lines.length < 2) return null;

  const headerLine = lines[0];
  const headers = headerLine
    .split('|')
    .map((h) => h.trim())
    .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

  const rows = lines
    .slice(1)
    .filter((line) => !/^\|\s*[-:]+[\s-|]*\|$/.test(line.trim()))
    .map((line) => {
      return line
        .split('|')
        .map((cell) => cell.trim())
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
    })
    .filter((row) => row.length > 0);

  // Deteksi kolom numerik untuk chart visual jika relevan
  let numericColIdx = -1;
  for (let c = 1; c < headers.length; c++) {
    const isNumeric = rows.length > 0 && rows.every((row) => {
      const val = row[c];
      if (!val) return true;
      const cleanVal = val.replace(/[^\d.-]/g, '');
      return !isNaN(parseFloat(cleanVal)) && cleanVal.length > 0;
    });
    if (isNumeric) {
      numericColIdx = c;
      break;
    }
  }

  const hasChart = numericColIdx !== -1 && rows.length >= 2;

  // Helper untuk merender status badge otomatis jika sel berisi kata kunci urgensi
  const renderCellContent = (cellText: string) => {
    const trimmed = cellText.trim();
    const upper = trimmed.toUpperCase();

    if (['KRITIS', 'TINGGI', 'DARURAT', 'BURUK'].includes(upper)) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
          {trimmed}
        </span>
      );
    }
    if (['WASPADA', 'SEDANG', 'SEDANG-TINGGI', 'CUKUP'].includes(upper)) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
          {trimmed}
        </span>
      );
    }
    if (['NORMAL', 'AMAN', 'MEMADAI', 'RENDAH', 'TERCAPAI', 'BAIK'].includes(upper)) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
          {trimmed}
        </span>
      );
    }

    return parseInlineStylesRaw(cellText, activeDocIds, allDocs);
  };

  if (viewMode === 'chart' && hasChart) {
    const values = rows.map((row) => {
      const cleanVal = (row[numericColIdx] || '').replace(/[^\d.-]/g, '');
      return parseFloat(cleanVal) || 0;
    });
    const maxVal = Math.max(...values, 1);

    return (
      <div className="border border-slate-300 my-3.5 p-4 bg-white shadow-2xs font-roboto">
        <div className="flex justify-between items-center border-b border-slate-200 pb-2.5 mb-3.5 select-none">
          <div className="flex items-center gap-1.5">
            <BarChart3 size={14} className="text-teal-700" />
            <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">
              Visualisasi Grafik: {headers[numericColIdx] || 'Indikator'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer flex items-center gap-1"
          >
            <TableIcon size={12} />
            <span>Tampilkan Tabel</span>
          </button>
        </div>

        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
          {rows.map((row, idx) => {
            const label = row[0] || `Data ${idx + 1}`;
            const rawVal = row[numericColIdx] || '0';
            const val = values[idx];
            const pct = Math.max(3, (val / maxVal) * 100);

            return (
              <div key={idx} className="flex flex-col text-left space-y-1">
                <div className="flex justify-between text-[11px] font-bold text-slate-700">
                  <span className="truncate max-w-[240px] sm:max-w-md">{label}</span>
                  <span className="font-mono text-teal-900 bg-teal-50 px-1.5 py-0.5 border border-teal-200/50">
                    {rawVal}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 overflow-hidden border border-slate-200">
                  <div
                    className="bg-teal-700 h-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="my-3.5 border border-slate-300 bg-white shadow-2xs font-roboto overflow-hidden">
      <div className="flex justify-between items-center bg-slate-50/90 px-3.5 py-2 border-b border-slate-200 select-none">
        <div className="flex items-center gap-1.5">
          <TableIcon size={13} className="text-teal-700" />
          <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
            Matriks Tabel Analitis ({rows.length} Baris Data)
          </span>
        </div>
        {hasChart && (
          <button
            type="button"
            onClick={() => setViewMode('chart')}
            className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-white hover:bg-slate-100 text-teal-800 border border-slate-300 transition-colors cursor-pointer flex items-center gap-1"
          >
            <BarChart3 size={11} className="text-teal-600" />
            <span>Mode Grafik</span>
          </button>
        )}
      </div>

      <div className="overflow-x-auto w-full custom-scrollbar">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-900">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="px-3.5 py-2.5 text-left uppercase tracking-wider text-[10px] font-black text-slate-800 whitespace-nowrap bg-slate-100 border-r last:border-r-0 border-slate-200"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-teal-50/20 transition-colors">
                {row.map((cell, cIdx) => (
                  <td
                    key={cIdx}
                    className="px-3.5 py-2 whitespace-normal font-medium border-r last:border-r-0 border-slate-100 leading-relaxed text-[11px]"
                  >
                    {renderCellContent(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
