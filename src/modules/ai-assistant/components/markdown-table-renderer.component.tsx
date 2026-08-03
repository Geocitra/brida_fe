import React, { useState } from 'react';

interface MarkdownTableRendererProps {
  rawTable: string;
}

export const MarkdownTableRenderer: React.FC<MarkdownTableRendererProps> = ({ rawTable }) => {
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const lines = rawTable.trim().split('\n');
  if (lines.length < 2) return null;

  const headerLine = lines[0];
  const headers = headerLine
    .split('|')
    .map((h) => h.trim())
    .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

  const rows = lines.slice(2).map((line) => {
    return line
      .split('|')
      .map((cell) => cell.trim())
      .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
  });

  // Deteksi kolom numerik untuk chart
  let numericColIdx = -1;
  for (let c = 1; c < headers.length; c++) {
    const isNumeric = rows.every((row) => {
      const val = row[c];
      if (!val) return true;
      const cleanVal = val.replace(/[^\d.-]/g, '');
      return !isNaN(parseFloat(cleanVal)) && cleanVal.length > 0;
    });
    if (isNumeric && rows.length > 0) {
      numericColIdx = c;
      break;
    }
  }

  const hasChart = numericColIdx !== -1;

  if (viewMode === 'chart' && hasChart) {
    const values = rows.map((row) => {
      const cleanVal = row[numericColIdx].replace(/[^\d.-]/g, '');
      return parseFloat(cleanVal) || 0;
    });
    const maxVal = Math.max(...values, 1);

    return (
      <div className="border border-slate-300 my-3 p-3 bg-white rounded-none">
        <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-3 select-none">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Grafik Visualisasi</span>
          <button
            onClick={() => setViewMode('table')}
            className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider border border-slate-300 hover:bg-slate-100 transition-colors rounded-none cursor-pointer"
          >
            Tampilkan Tabel
          </button>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
          {rows.map((row, idx) => {
            const label = row[0];
            const rawVal = row[numericColIdx];
            const val = values[idx];
            const pct = Math.max(2, (val / maxVal) * 100);
            return (
              <div key={idx} className="flex flex-col text-left space-y-0.5">
                <div className="flex justify-between text-[10px] font-bold text-slate-700">
                  <span className="truncate max-w-48">{label}</span>
                  <span className="font-mono text-teal-800">{rawVal}</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-none overflow-hidden">
                  <div
                    className="bg-teal-700 h-full rounded-none transition-all duration-500"
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
    <div className="overflow-x-auto border border-slate-300 my-3 rounded-none shadow-2xs">
      {hasChart && (
        <div className="flex justify-between items-center bg-slate-50 px-3 py-1.5 border-b border-slate-200 select-none">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Tabel Data</span>
          <button
            onClick={() => setViewMode('chart')}
            className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider border border-slate-300 hover:bg-slate-100 transition-colors rounded-none cursor-pointer"
          >
            Tampilkan Grafik
          </button>
        </div>
      )}
      <table className="min-w-full divide-y divide-slate-300 text-xs font-roboto">
        <thead className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300">
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className="px-4 py-2.5 text-left uppercase tracking-wider text-[10px] font-extrabold text-teal-900"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
          {rows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-4 py-2 whitespace-normal font-medium">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
