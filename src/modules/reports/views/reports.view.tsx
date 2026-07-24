import React, { useState } from 'react';
import { MOCK_DATA } from '../../../services/mock-data.service';
import { PdfExportService } from '../../../services/pdf-export.service';
import {
  ArrowLeft,
  Download,
  Send,
  Edit3,
  CheckCircle2,
  FileText,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  Calendar,
  Building2
} from 'lucide-react';

interface ReportsViewProps {
  onNavigateToGenerator?: (initialPrompt?: string) => void;
  onNavigateToDashboard?: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  onNavigateToGenerator,
  onNavigateToDashboard
}) => {
  const bupatiReport = MOCK_DATA.bupatiReport;
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleExportPdf = () => {
    setIsExportingPdf(true);
    try {
      PdfExportService.exportBupatiReportPdf(bupatiReport);
      showToast('Nota Dinas Resmi Eksekutif Bupati Mimika Vektor PDF berhasil diunduh!');
    } catch (err: any) {
      showToast(`Gagal mengekspor PDF: ${err.message}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleSendWa = () => {
    showToast('Laporan Resmi Bupati Mimika berhasil dikirimkan ke WhatsApp Bupati!');
  };

  const handleEditOrCreateArticle = () => {
    if (onNavigateToGenerator) {
      onNavigateToGenerator('Buatkan artikel publikasi berdasarkan Laporan Perkembangan Wilayah Mimika untuk Bupati.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 border border-slate-700 shadow-xl flex items-center gap-3 rounded-none no-print">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Navigation Header */}
      <div className="flex items-center justify-between no-print">
        {onNavigateToDashboard && (
          <button
            onClick={onNavigateToDashboard}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold uppercase rounded-none border border-slate-300 inline-flex items-center gap-2 shadow-2xs"
          >
            <ArrowLeft size={14} />
            <span>Kembali ke Dashboard</span>
          </button>
        )}
      </div>

      {/* Main Official Executive Document Viewer (Kop Naskah Resmi) */}
      <div
        className="bg-white border border-slate-300 border-l-4 border-l-slate-900 p-6 lg:p-10 rounded-none shadow-xs space-y-6"
      >

        {/* Kop Header Laporan Resmi */}
        <div className="border-b-2 border-slate-900 pb-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-xs font-bold text-teal-800 uppercase tracking-widest block mb-1 flex items-center gap-1.5">
                <Building2 size={14} className="text-teal-700" />
                <span>PEMERINTAH KABUPATEN MIMIKA &bull; BRIDA SMART ANALYSIS</span>
              </span>
              <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-wide">
                {bupatiReport.title}
              </h1>
            </div>
            <span className="px-3 py-1 bg-red-100 border border-red-300 text-red-800 text-xs font-bold uppercase rounded-none flex items-center gap-1">
              <ShieldAlert size={14} />
              <span>SIFAT: {bupatiReport.urgency}</span>
            </span>
          </div>

          <div className="text-xs text-slate-700 space-y-1 font-semibold bg-slate-50 p-4 border border-slate-200 mt-3">
            <div><strong>Penerima:</strong> {bupatiReport.recipient}</div>
            <div><strong>Pengirim:</strong> {bupatiReport.sender}</div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Calendar size={12} className="text-slate-500" />
                <span>Periode Data: {bupatiReport.period}</span>
              </span>
              <span>&bull;</span>
              <span>Tanggal Rilis: {bupatiReport.date}</span>
            </div>
          </div>
        </div>

        {/* Ringkasan Eksekutif (Executive Summary) */}
        <div className="bg-sky-50 border border-sky-200 p-5 rounded-none text-slate-900 font-medium leading-relaxed italic text-sm">
          <strong className="block text-xs uppercase tracking-wider text-sky-900 font-bold mb-2 not-italic flex items-center gap-1.5">
            <FileText size={14} className="text-sky-700" />
            <span>RINGKASAN EKSEKUTIF</span>
          </strong>
          {bupatiReport.executiveSummary}
        </div>

        {/* Kumpulan Indikator Deviasi Signifikan */}
        <div>
          <h3 className="text-h3 text-slate-900 mb-4 pb-2 border-b border-slate-200 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-600" />
            <span>KUMPULAN INDIKATOR DEVIASI SIGNIFIKAN</span>
          </h3>

          <div className="space-y-4">
            {bupatiReport.deviations.map((d, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-300 p-4 rounded-none">
                <strong className="block text-sm font-bold text-slate-900 mb-1">{d.title}</strong>
                <p className="text-xs text-slate-700 font-semibold mb-2">
                  Baseline Target: <strong>{d.baseline}</strong> | Realisasi Aktual: <strong>{d.realization}</strong> | Deviasi: <span className={d.severityColor}>{d.deviationText}</span>
                </p>
                <div className="text-xs text-slate-600 bg-white p-2.5 border border-slate-200">
                  <strong>Penyebab Utama:</strong> {d.causes}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Analisis Dampak Kebijakan Eksternal / Nasional */}
        <div>
          <h3 className="text-h3 text-slate-900 mb-4 pb-2 border-b border-slate-200 flex items-center gap-2">
            <FileText size={18} className="text-teal-700" />
            <span>ANALISIS DAMPAK KEBIJAKAN EKSTERNAL / NASIONAL</span>
          </h3>

          <div className="bg-slate-50 border border-slate-300 p-4 rounded-none">
            <strong className="block text-sm font-bold text-slate-900 mb-2">
              Kebijakan Makro: {bupatiReport.nationalPolicyImpact.policyName}
            </strong>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Hasil Simulasi AI Engine:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-800 font-semibold">
              {bupatiReport.nationalPolicyImpact.simulationResults.map((r, idx) => (
                <li key={idx}>{r}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Rekomendasi Respon Berbasis Prioritas */}
        <div>
          <h3 className="text-h3 text-slate-900 mb-4 pb-2 border-b border-slate-200 flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-700" />
            <span>REKOMENDASI RESPON BERBASIS PRIORITAS (ACTION PLAN)</span>
          </h3>

          <div className="bg-amber-50 border border-amber-300 p-5 rounded-none space-y-3">
            <strong className="block text-xs uppercase tracking-wider text-amber-900 font-bold mb-2">
              INSTRUKSI PRIORITAS (Harus Dieksekusi Sebelum Tenggat Waktu)
            </strong>
            <div className="space-y-2">
              {bupatiReport.actionPriorities.map((act, idx) => (
                <div key={idx} className="text-xs text-slate-900 font-semibold bg-white p-3 border border-amber-200">
                  {act}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Toolbar (No Print) */}
        <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-slate-200 justify-end no-print">
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs uppercase tracking-wider rounded-none inline-flex items-center gap-2 border border-slate-950 shadow-xs disabled:opacity-50"
          >
            {isExportingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            <span>{isExportingPdf ? 'Merakit PDF Vector...' : 'Download PDF Resmi'}</span>
          </button>

          <button
            onClick={handleSendWa}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider rounded-none inline-flex items-center gap-2 border border-emerald-800 shadow-xs"
          >
            <Send size={14} />
            <span>Kirim Langsung ke WA Bupati</span>
          </button>

          <button
            onClick={handleEditOrCreateArticle}
            className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs uppercase tracking-wider rounded-none inline-flex items-center gap-2 border border-teal-800 shadow-xs"
          >
            <Edit3 size={14} />
            <span>Edit Teks Sebelum Dikirim</span>
          </button>
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-center text-xs text-slate-500 font-medium">
        BRIDA SMART Analysis &bull; Laporan ini telah melalui review staf & validator sistem BRIDA Kabupaten Mimika
      </div>
    </div>
  );
};
