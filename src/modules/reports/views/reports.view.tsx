import React, { useState } from 'react';
import { MOCK_DATA, type StructuredReportData } from '../../../services/mock-data.service';
import { Calendar, AlertTriangle } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const [reports] = useState<StructuredReportData[]>(MOCK_DATA.structuredReports);
  const [selectedReport, setSelectedReport] = useState<StructuredReportData>(reports[0]);

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-h1 mb-1">Laporan Terstruktur & Matriks Rekap</h1>
        <p className="text-body">
          Dokumen hasil kompilasi otomatis dari ekstraksi laporan investigasi dan dokumen hukum Kabupaten Mimika.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Daftar Laporan */}
        <div className="bg-white border border-slate-300 rounded-none shadow-xs">
          <div className="px-4 py-3 border-b border-slate-300 bg-slate-100 font-bold text-sm text-slate-800">
            Daftar Laporan Eksekutif
          </div>
          <div className="divide-y divide-slate-200">
            {reports.map((rep) => (
              <button
                key={rep.id}
                onClick={() => setSelectedReport(rep)}
                className={`
                  w-full p-4 text-left font-roboto transition-colors rounded-none block
                  ${selectedReport.id === rep.id 
                    ? 'bg-teal-50 border-l-4 border-l-teal-600 font-bold' 
                    : 'hover:bg-slate-50 text-slate-700'}
                `}
              >
                <span className="block font-bold text-sm text-slate-900 mb-1">{rep.title}</span>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <Calendar size={12} />
                  <span>{rep.date}</span>
                  <span>&bull;</span>
                  <span className="text-teal-700 font-semibold">{rep.category}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Kolom Detail Laporan (Flat High Contrast Layout) */}
        <div className="lg:col-span-2 bg-white border border-slate-300 p-6 rounded-none shadow-xs space-y-6">
          <div className="border-b border-slate-300 pb-4">
            <span className="inline-block px-2.5 py-1 bg-teal-100 text-teal-800 text-xs font-bold uppercase mb-2 rounded-none">
              {selectedReport.category}
            </span>
            <h2 className="text-xl font-bold text-slate-900 mb-1">{selectedReport.title}</h2>
            <span className="text-xs text-slate-500 font-medium">Diterbitkan: {selectedReport.date}</span>
          </div>

          <div>
            <strong className="block text-xs uppercase tracking-wider text-slate-700 font-bold mb-2">
              Ringkasan Eksekutif
            </strong>
            <p className="text-body text-slate-900 bg-slate-50 p-4 border border-slate-200 leading-relaxed">
              {selectedReport.ringkasan}
            </p>
          </div>

          <div>
            <strong className="block text-xs uppercase tracking-wider text-slate-700 font-bold mb-2">
              Temuan Faktual & Tingkat Resiko
            </strong>
            <div className="space-y-3">
              {selectedReport.temuan.map((t, i) => (
                <div key={i} className="p-4 border border-slate-300 bg-white flex items-start gap-3">
                  <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <strong className="text-sm font-bold text-slate-900">{t.topik}</strong>
                      <span className={`text-[11px] font-bold px-2 py-0.5 ${t.tingkatResiko === 'TINGGI' ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-amber-100 text-amber-800 border border-amber-300'}`}>
                        Resiko {t.tingkatResiko}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium">{t.deskripsi}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <strong className="block text-xs uppercase tracking-wider text-slate-700 font-bold mb-2">
              Rekomendasi Kebijakan BRIDA
            </strong>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-800 font-medium">
              {selectedReport.rekomendasi.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
