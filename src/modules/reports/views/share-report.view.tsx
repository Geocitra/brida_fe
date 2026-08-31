import React, { useState, useEffect } from 'react';
import { marked } from 'marked';
import { ReportService, type GeneratedReportDetail } from '../../../services/report.service';
import { PdfExportService } from '../../../services/pdf-export.service';
import {
  Download,
  Loader2,
  FileText,
  AlertTriangle,
  Calendar,
  AlertCircle,
  Building,
} from 'lucide-react';

const stripCitationTokens = (content?: string | null): string => {
  if (!content) return '';
  return content
    .replace(/\[(?:[a-f0-9-]{8,}|doc(?:[-_a-z0-9]+)?):\d+\]/gi, '')
    .replace(/\[(?:[a-f0-9-]{8,}|doc(?:[-_a-z0-9]+)?):\d+\]\[(?:[a-f0-9-]{8,}|doc(?:[-_a-z0-9]+)?):\d+\]/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const sanitizeReportText = (content?: string | null): string => stripCitationTokens(content);

const MarkdownContent: React.FC<{ content?: string | null; className?: string }> = ({ content, className = '' }) => {
  const html = React.useMemo(() => {
    const safeContent = sanitizeReportText(content);
    if (!safeContent) return '';
    const rendered = marked.parse(safeContent, { breaks: true });
    return typeof rendered === 'string' ? rendered : '';
  }, [content]);

  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
};

export default function ShareReportView() {
  const id = React.useMemo(() => {
    try {
      return window.location.pathname.split('/').pop() || '';
    } catch {
      return '';
    }
  }, []);
  const [report, setReport] = useState<GeneratedReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    ReportService.getPublicSharedReport(id)
      .then((data) => {
        setReport(data);
      })
      .catch((err) => {
        setErrorMsg(err.message || 'Gagal memuat dokumen publik.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const handleExportPdf = async () => {
    if (!report) return;
    setIsExportingPdf(true);
    try {
      await PdfExportService.exportElementToPdf(
        'share-report-content-container',
        `Nota_Dinas_${report.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
        {
          math: {
            indicatorName: report.title,
            sector: 'Pembangunan & Kebijakan Daerah',
            targetValue: 100,
            realizationValue: 80,
            targetText: '-',
            realizationText: '-',
            deviationValue: 0,
            deviationPercentage: 0,
            urgencyStatus: report.contentPayload?.urgency || 'TINGGI',
          },
          causal: {
            summary: report.executiveSummary,
            causalFactors: [],
            recommendations: [],
          },
        }
      );
    } catch (err: any) {
      alert(`Gagal mengekspor PDF: ${err.message || 'Terjadi kesalahan'}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-roboto">
        <Loader2 className="w-8 h-8 text-teal-700 animate-spin mb-2" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Memuat Dokumen Resmi BRIDA...</span>
      </div>
    );
  }

  if (errorMsg || !report) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-roboto p-4">
        <div className="max-w-md w-full bg-white border border-red-300 p-6 rounded-none space-y-4 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Gagal Memuat Dokumen</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {errorMsg || 'Dokumen yang Anda cari tidak ditemukan atau telah dihapus.'}
          </p>
          <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-3">
            Badan Riset dan Inovasi Daerah (BRIDA) Kabupaten Mimika
          </div>
        </div>
      </div>
    );
  }

  const currentReport = report.contentPayload;

  return (
    <div className="min-h-screen bg-slate-100 font-roboto py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-300 p-4 rounded-none gap-4">
          <div className="flex items-center gap-3">
            <Building className="w-8 h-8 text-teal-800 shrink-0" />
            <div>
              <span className="text-[9px] font-black text-teal-700 uppercase tracking-widest block">Portal Berbagi Resmi</span>
              <h1 className="text-xs font-black text-slate-900 uppercase tracking-wider">Badan Riset &amp; Inovasi Daerah Mimika</h1>
            </div>
          </div>
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 disabled:bg-slate-300 transition-colors cursor-pointer rounded-none uppercase tracking-wider self-start sm:self-center"
          >
            {isExportingPdf ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            <span>{isExportingPdf ? 'Mencetak...' : 'Unduh PDF Resmi'}</span>
          </button>
        </div>

        {/* Main Document Body (Styled identically to reports.view) */}
        <div 
          id="share-report-content-container"
          className="bg-white border border-slate-300 p-8 sm:p-12 rounded-none space-y-6 shadow-sm"
        >
          {/* Kop Surat Nota Dinas */}
          <div className="text-center space-y-1.5 pb-4 border-b-2 border-slate-900">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">PEMERINTAH KABUPATEN MIMIKA</h2>
            <h1 className="text-base font-black uppercase tracking-widest text-teal-900">BADAN RISET DAN INOVASI DAERAH (BRIDA)</h1>
            <p className="text-[9px] text-slate-500 font-medium italic">Sentra Pemerintahan SP3, Jalan Cenderawasih, Kuala Kencana, Mimika, Papua Tengah</p>
          </div>

          <div className="text-center pt-2">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 underline decoration-2 underline-offset-4">NOTA DINAS</h3>
            <p className="text-[10px] text-slate-500 font-mono mt-1">Nomor: 000.5.2/BRIDA/{new Date(report.createdAt).getFullYear()}</p>
          </div>

          {/* Metadata Block */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs border-y border-slate-200 py-3 my-2 font-medium">
            <div className="space-y-1 text-slate-700">
              <div><strong>Penerima:</strong> {currentReport?.recipient || 'Bupati Mimika'}</div>
              <div><strong>Pengirim:</strong> {currentReport?.sender || 'Kepala BRIDA Mimika'}</div>
            </div>
            <div className="space-y-1 text-slate-700 md:text-right">
              <div><strong>Periode Data:</strong> {currentReport?.period || '-'}</div>
              <div><strong>Tanggal Rilis:</strong> {currentReport?.date || new Date(report.createdAt).toLocaleDateString('id-ID')}</div>
            </div>
          </div>

          {/* Title Header */}
          <div className="py-2 border-b border-slate-100">
            <span className="text-[9px] font-black text-teal-700 uppercase tracking-widest">Judul Laporan Analitik</span>
            <h2 className="text-sm font-bold text-slate-900 mt-0.5">{report.title}</h2>
          </div>

          {/* Executive Summary */}
          <div className="bg-slate-50/70 border-l-4 border-teal-700 p-4 space-y-2 text-justify">
            <strong className="flex items-center gap-2 text-xs uppercase tracking-wider text-teal-900 font-bold">
              <FileText size={14} className="text-teal-700" />
              <span>RINGKASAN EKSEKUTIF</span>
            </strong>
            <MarkdownContent
              content={report.executiveSummary}
              className="prose prose-sm max-w-none text-slate-800 text-xs leading-relaxed [&_p]:mb-2 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1"
            />
          </div>

          {/* Deviations List */}
          {currentReport?.deviations && currentReport.deviations.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 pb-2 border-b border-slate-200 flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-600" />
                <span>KUMPULAN INDIKATOR DEVIASI SIGNIFIKAN</span>
              </h3>

              <div className="space-y-3 divide-y divide-slate-100">
                {currentReport.deviations.map((d: any, idx: number) => (
                  <div key={idx} className="pt-3 first:pt-0 space-y-1 text-xs">
                    <strong className="block font-bold text-slate-900 text-sm">{sanitizeReportText(d.title).replace(/\*\*/g, '')}</strong>
                    <p className="text-slate-700 font-medium">
                      Baseline Target: <span className="font-bold text-slate-900">{sanitizeReportText(d.baseline).replace(/\*\*/g, '')}</span> &bull; Realisasi Aktual: <span className="font-bold text-slate-900">{sanitizeReportText(d.realization).replace(/\*\*/g, '')}</span> &bull; Deviasi: <span className={d.severityColor || 'text-red-700 font-bold'}>{sanitizeReportText(d.deviationText).replace(/\*\*/g, '')}</span>
                    </p>
                    <div className="text-slate-600 font-normal pt-0.5">
                      <strong className="text-slate-800">Penyebab Utama:</strong>
                      <MarkdownContent
                        content={sanitizeReportText(d.causes)}
                        className="mt-1 text-slate-700 [&_p]:mb-1 [&_strong]:font-semibold"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* National Policy Impact */}
          {currentReport?.nationalPolicyImpact && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 pb-2 border-b border-slate-200 flex items-center gap-2">
                <FileText size={16} className="text-teal-700" />
                <span>ANALISIS DAMPAK KEBIJAKAN EKSTERNAL / NASIONAL</span>
              </h3>

              <div className="border-slate-300 pl-4 py-1 space-y-2 text-xs">
                <strong className="block text-sm font-bold text-slate-900">
                  Kebijakan Makro: {currentReport.nationalPolicyImpact.policyName}
                </strong>
                <p className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  Hasil Simulasi AI Engine:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-800 font-medium">
                  {currentReport.nationalPolicyImpact.simulationResults?.map((r: string, idx: number) => (
                    <li key={idx} className="leading-relaxed">
                      <MarkdownContent content={r} className="text-inherit [&_p]:mb-0 [&_strong]:font-semibold" />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Action Priorities */}
          {currentReport?.actionPriorities && currentReport.actionPriorities.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 pb-2 border-b border-slate-200 flex items-center gap-2">
                <FileText size={16} className="text-teal-700" />
                <span>REKOMENDASI INSTANKSI & PRIORITAS TINDAKAN</span>
              </h3>
              <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-800 font-medium">
                {currentReport.actionPriorities.map((item: string, idx: number) => (
                  <li key={idx} className="leading-relaxed">
                    <MarkdownContent content={item} className="text-inherit [&_p]:mb-0 [&_strong]:font-semibold" />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer Instansi */}
          <div className="text-[10px] text-slate-400 text-center border-t border-slate-200 pt-6 mt-8 font-medium italic">
            Dokumen ini dihasilkan secara otomatis oleh BRIDA SMART Analysis Engine Kabupaten Mimika.
          </div>

        </div>

      </div>
    </div>
  );
}
