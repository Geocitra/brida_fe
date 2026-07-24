import React, { useState } from 'react';
import { MOCK_DATA, type IndicatorMatrixItem } from '../../../services/mock-data.service';
import { PdfExportService } from '../../../services/pdf-export.service';
import { 
  BarChart3, 
  ArrowLeft, 
  Send, 
  PenTool, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Filter, 
  Download, 
  Loader2,
  PieChart,
  ListChecks,
  Info
} from 'lucide-react';

interface AnalyticsViewProps {
  onNavigateToGenerator?: (initialPrompt?: string) => void;
  onNavigateToDashboard?: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ 
  onNavigateToGenerator, 
  onNavigateToDashboard 
}) => {
  const [indicators] = useState<IndicatorMatrixItem[]>(MOCK_DATA.indicatorsMatrix);
  const [selectedIndicator, setSelectedIndicator] = useState<IndicatorMatrixItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleExportPdf = () => {
    setIsExportingPdf(true);
    try {
      const activeItem = selectedIndicator || indicators[0];
      PdfExportService.exportAnalyticsPdf(activeItem);
      showToast('Dokumen PDF Diagnostik Vektor berhasil diunduh!');
    } catch (err: any) {
      showToast(`Gagal mengekspor PDF: ${err.message}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleSendWa = () => {
    const indicatorName = selectedIndicator?.name || 'Seluruh Indikator';
    showToast(`Analisis Deviasi ${indicatorName} berhasil dikirimkan ke WhatsApp Bupati Mimika!`);
  };

  const handleCreateArticle = () => {
    if (onNavigateToGenerator) {
      const topic = selectedIndicator ? selectedIndicator.name : 'Analisis Deviasi Pembangunan Mimika';
      onNavigateToGenerator(`Buatkan artikel publikasi berdasarkan ${topic}.`);
    }
  };

  const renderStatusBadge = (status: 'KRITIS' | 'WASPADA' | 'NORMAL') => {
    switch (status) {
      case 'KRITIS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-100 border border-red-300 text-red-800 text-xs font-bold rounded-none">
            <AlertCircle size={12} className="text-red-700" /> KRITIS
          </span>
        );
      case 'WASPADA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold rounded-none">
            <AlertCircle size={12} className="text-amber-700" /> WASPADA
          </span>
        );
      case 'NORMAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-none">
            <CheckCircle2 size={12} className="text-emerald-700" /> NORMAL
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 border border-slate-700 shadow-xl flex items-center gap-3 rounded-none">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Level 1 vs Level 2 Navigation Bar */}
      <div className="flex items-center justify-between no-print">
        {selectedIndicator ? (
          <button
            onClick={() => setSelectedIndicator(null)}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold uppercase rounded-none border border-slate-300 inline-flex items-center gap-2 shadow-2xs"
          >
            <ArrowLeft size={14} />
            <span>Kembali ke Matriks Indikator (Level 1)</span>
          </button>
        ) : (
          onNavigateToDashboard && (
            <button
              onClick={onNavigateToDashboard}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold uppercase rounded-none border border-slate-300 inline-flex items-center gap-2 shadow-2xs"
            >
              <ArrowLeft size={14} />
              <span>Kembali ke Dashboard</span>
            </button>
          )
        )}
      </div>

      {/* Main Title */}
      <div>
        <h1 className="text-h1 mb-1 flex items-center gap-2">
          <BarChart3 size={24} className="text-teal-700" />
          <span>
            {selectedIndicator 
              ? `Analisis Indikator: ${selectedIndicator.name}` 
              : 'Interactive Diagnostic Workspace (Matriks Indikator)'}
          </span>
        </h1>
        <p className="text-body">
          {selectedIndicator 
            ? 'Tampilan Level 2: Membedah akar masalah (root cause) deviasi indikator pembangunan.' 
            : 'Tampilan Level 1: Pilih salah satu baris indikator daerah di bawah ini untuk melihat deep-dive analisis deviasi.'}
        </p>
      </div>

      {/* LEVEL 1: TABEL MATRIKS INDIKATOR DEVELOPMENT */}
      {!selectedIndicator && (
        <div className="bg-white border border-slate-300 rounded-none shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-300 bg-slate-100 flex items-center justify-between">
            <h2 className="text-h2 text-slate-900 flex items-center gap-2">
              <Filter size={18} className="text-teal-700" />
              <span>Matriks Pemantauan Indikator Daerah (Kabupaten Mimika)</span>
            </h2>
            <span className="text-xs font-bold text-teal-800 bg-teal-100 border border-teal-300 px-3 py-1 rounded-none">
              Deterministik Engine Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-300 bg-slate-200/80 text-slate-800 font-roboto text-xs uppercase tracking-wider font-bold">
                  <th className="py-3.5 px-4">Nama Indikator Pembangunan</th>
                  <th className="py-3.5 px-4">Sektor / Bidang</th>
                  <th className="py-3.5 px-4 text-center">Baseline Target</th>
                  <th className="py-3.5 px-4 text-center">Realisasi Aktual</th>
                  <th className="py-3.5 px-4 text-center">Status Deviasi</th>
                  <th className="py-3.5 px-4 text-right no-print">Aksi Deep-Dive</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {indicators.map((item) => (
                  <tr 
                    key={item.id} 
                    onClick={() => setSelectedIndicator(item)}
                    className="hover:bg-slate-100 cursor-pointer transition-colors group"
                  >
                    <td className="py-4 px-4 font-bold text-slate-900 text-sm">
                      {item.name}
                    </td>
                    <td className="py-4 px-4 text-slate-700 text-xs font-semibold">
                      {item.sector}
                    </td>
                    <td className="py-4 px-4 text-center text-slate-700 font-medium text-xs">
                      {item.baseline}
                    </td>
                    <td className="py-4 px-4 text-center text-slate-900 font-bold text-xs">
                      {item.realization}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {renderStatusBadge(item.status)}
                    </td>
                    <td className="py-4 px-4 text-right no-print">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 group-hover:underline">
                        <span>Bedah Deviasi</span>
                        <ChevronRight size={16} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LEVEL 2: DETAIL ANALISIS DEVIASI (DEEP-DIVE DEVIATION) */}
      {selectedIndicator && (
        <div className="space-y-6">
          
          {/* 1. Ringkasan Deviasi Card */}
          <div className="bg-white border border-slate-300 p-6 rounded-none shadow-xs">
            <h3 className="text-h3 text-slate-900 mb-4 pb-2 border-b border-slate-200 flex items-center gap-2">
              <Info size={18} className="text-teal-700" />
              <span>RINGKASAN DEVIASI INDIKATOR</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div className="p-4 bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Baseline Target ({selectedIndicator.period})
                </span>
                <span className="text-2xl font-bold text-slate-900">{selectedIndicator.baseline}</span>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Realisasi Aktual
                </span>
                <span className="text-2xl font-bold text-slate-900">{selectedIndicator.realization}</span>
              </div>
              <div className={`p-4 border ${selectedIndicator.status === 'KRITIS' ? 'bg-red-50 border-red-200' : selectedIndicator.status === 'WASPADA' ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <span className="text-xs font-bold uppercase tracking-wider block mb-1 text-slate-800">
                  Status & Persentase Deviasi
                </span>
                <span className={`text-2xl font-bold ${selectedIndicator.status === 'KRITIS' ? 'text-red-700' : selectedIndicator.status === 'WASPADA' ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {selectedIndicator.deviationText}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Visual Bar Chart Target vs Realisasi */}
          <div className="bg-white border border-slate-300 p-6 rounded-none shadow-xs">
            <h3 className="text-h3 text-slate-900 mb-2 flex items-center gap-2">
              <BarChart3 size={18} className="text-teal-700" />
              <span>GRAFIK TREN TARGET VS REALISASI</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mb-4">Periode Evaluasi: {selectedIndicator.period}</p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Baseline Target RPJMD</span>
                  <span>{selectedIndicator.baseline} (100%)</span>
                </div>
                <div className="w-full bg-slate-200 h-8 rounded-none overflow-hidden flex items-center">
                  <div className="bg-blue-600 h-full text-white text-xs font-bold flex items-center justify-end pr-3 w-full">
                    Target: {selectedIndicator.baseline}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Realisasi Lapangan</span>
                  <span>{selectedIndicator.realization} ({selectedIndicator.deviationPercent}%)</span>
                </div>
                <div className="w-full bg-slate-200 h-8 rounded-none overflow-hidden flex items-center">
                  <div 
                    className={`${selectedIndicator.status === 'KRITIS' ? 'bg-red-600' : selectedIndicator.status === 'WASPADA' ? 'bg-amber-500' : 'bg-emerald-600'} h-full text-white text-xs font-bold flex items-center justify-end pr-3 transition-all duration-500`}
                    style={{ width: `${Math.min(selectedIndicator.deviationPercent, 100)}%` }}
                  >
                    Realisasi: {selectedIndicator.realization} ({selectedIndicator.deviationPercent}%)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Analisis Faktor Penyebab (Causal Inference AI) */}
          <div className="bg-white border border-slate-300 p-6 rounded-none shadow-xs">
            <h3 className="text-h3 text-slate-900 mb-2 flex items-center gap-2">
              <PieChart size={18} className="text-teal-700" />
              <span>ANALISIS FAKTOR PENYEBAB (AI - Causal Inference)</span>
            </h3>
            <p className="text-xs text-slate-600 mb-4 font-medium">Berdasarkan model Causal Inference, kontribusi faktor penyebab deviasi:</p>

            <div className="space-y-4">
              {selectedIndicator.causalFactors.map((f, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                    <span>Faktor {idx + 1}: {f.label}</span>
                    <span>{f.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-6 rounded-none overflow-hidden">
                    <div 
                      className={`${f.color} h-full text-white text-xs font-bold flex items-center justify-end pr-2`}
                      style={{ width: `${f.percentage}%` }}
                    >
                      {f.percentage}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Matriks Rekomendasi Respon & Prioritas */}
          <div className="bg-white border border-slate-300 p-6 rounded-none shadow-xs">
            <h3 className="text-h3 text-slate-900 mb-4 flex items-center gap-2">
              <ListChecks size={18} className="text-teal-700" />
              <span>MATRIKS REKOMENDASI RESPON & ACTION PLAN</span>
            </h3>

            <div className="space-y-3">
              {selectedIndicator.priorityRecommendations.map((rec, idx) => (
                <div key={idx} className="p-4 bg-slate-50 border border-slate-300">
                  <span className={`inline-block px-2.5 py-0.5 text-xs font-bold mb-2 ${rec.badgeColor}`}>
                    {rec.priority}
                  </span>
                  <h4 className="font-bold text-sm text-slate-900 mb-1">{rec.title}</h4>
                  <p className="text-xs text-slate-600 font-medium">
                    PIC: <strong>{rec.pic}</strong> &bull; Deadline: <strong>{rec.deadline}</strong> &bull; Estimasi Biaya: <strong>{rec.cost}</strong>
                  </p>
                </div>
              ))}
            </div>

            {/* 5. Tombol Aksi Cepat (No Print) */}
            <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-slate-200 mt-6 justify-end no-print">
              <button
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs uppercase tracking-wider rounded-none inline-flex items-center gap-2 border border-slate-950 shadow-xs disabled:opacity-50"
              >
                {isExportingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                <span>{isExportingPdf ? 'Merakit PDF Vector...' : 'Ekspor PDF Diagnostik'}</span>
              </button>
              
              <button
                onClick={handleSendWa}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider rounded-none inline-flex items-center gap-2 border border-emerald-800 shadow-xs"
              >
                <Send size={14} />
                <span>Kirim WA Bupati</span>
              </button>

              <button
                onClick={handleCreateArticle}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs uppercase tracking-wider rounded-none inline-flex items-center gap-2 border border-teal-800 shadow-xs"
              >
                <PenTool size={14} />
                <span>Lempar ke Generator Artikel</span>
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
