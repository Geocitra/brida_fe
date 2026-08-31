import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import { ReportService, type GeneratedReportDetail } from '../../../services/report.service';
import { PdfExportService } from '../../../services/pdf-export.service';
import {
  Download,
  Loader2,
  FileText,
  AlertTriangle,
  AlertCircle,
  Building,
  Link2,
  CheckCheck,
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
  const [copySuccess, setCopySuccess] = useState(false);
  const [pageCount, setPageCount] = useState(1);
  const contentRef = useRef<HTMLDivElement>(null);

  const PAGE_W = 794;
  const PAGE_H = 1123;
  const PAGE_GAP = 24;
  const marginPx = Math.round(2.5 * (96 / 2.54)); // ~94px for 2.5cm margin

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = window.location.href;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    });
  };

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

  // Hitung jumlah halaman berdasarkan tinggi konten aktual setelah render
  useEffect(() => {
    if (!contentRef.current || loading || !report) return;
    const usableH = PAGE_H - marginPx * 2;

    const measure = () => {
      if (!contentRef.current) return;
      const contentH = contentRef.current.scrollHeight;
      const pages = Math.max(1, Math.ceil(contentH / usableH));
      setPageCount(pages);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [loading, report, marginPx]);

  const handleExportPdf = async () => {
    if (!report) return;
    setIsExportingPdf(true);
    try {
      await PdfExportService.exportElementToPdf(
        'share-report-pdf-target',
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
  const totalCanvasH = pageCount * PAGE_H + (pageCount - 1) * PAGE_GAP;

  return (
    <div className="min-h-screen bg-slate-200/60 font-roboto py-8 px-4 sm:px-6">
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
          <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold transition-colors cursor-pointer rounded-none uppercase tracking-wider border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
            >
              {copySuccess ? <CheckCheck size={12} className="text-emerald-600" /> : <Link2 size={12} />}
              <span>{copySuccess ? 'Tersalin!' : 'Salin Link'}</span>
            </button>
            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 disabled:bg-slate-300 transition-colors cursor-pointer rounded-none uppercase tracking-wider"
            >
              {isExportingPdf ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              <span>{isExportingPdf ? 'Mencetak...' : 'Unduh PDF Resmi'}</span>
            </button>
          </div>
        </div>

        {/* A4 Multi-Page Canvas */}
        <div className="w-full overflow-x-auto pb-6 flex justify-center">
          <div
            className="relative shrink-0 animate-in fade-in duration-200"
            style={{ width: `${PAGE_W}px`, height: `${totalCanvasH}px` }}
          >
            {/* Layer 1: Page Sheets */}
            {Array.from({ length: pageCount }).map((_, i) => (
              <div
                key={i}
                className="absolute bg-white"
                style={{
                  left: 0,
                  top: `${i * (PAGE_H + PAGE_GAP)}px`,
                  width: `${PAGE_W}px`,
                  height: `${PAGE_H}px`,
                  boxShadow: [
                    '0 1px 3px rgba(0,0,0,0.06)',
                    '0 4px 16px rgba(0,0,0,0.08)',
                    '0 12px 32px rgba(0,0,0,0.05)',
                  ].join(', '),
                  border: '1px solid #cbd5e1',
                  zIndex: 0,
                }}
              >
                <span className="absolute bottom-4 right-5 text-[8px] font-black text-slate-400 uppercase tracking-widest select-none pointer-events-none">
                  HALAMAN {i + 1} dari {pageCount}
                </span>
              </div>
            ))}

            {/* Layer 2: Content Overlay */}
            <div
              id="share-report-pdf-target"
              className="absolute text-left"
              style={{
                left: 0,
                top: 0,
                width: `${PAGE_W}px`,
                minHeight: `${totalCanvasH}px`,
                padding: `${marginPx}px`,
                boxSizing: 'border-box',
                zIndex: 1,
                background: 'transparent',
              }}
            >
              <style dangerouslySetInnerHTML={{ __html: `
                .report-doc {
                  font-family: 'Calibri', sans-serif;
                  font-size: 11pt;
                  line-height: 1.5;
                  color: #1e293b;
                }
                .report-doc p { margin-top: 0 !important; margin-bottom: 10px !important; }
                .report-doc h1, .report-doc h2, .report-doc h3 { font-weight: 700; margin: 16px 0 8px !important; color: #0f172a; }
                .report-doc h1 { font-size: 1.3em; }
                .report-doc h2 { font-size: 1.15em; }
                .report-doc h3 { font-size: 1.05em; }
                .report-doc ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 10px; }
                .report-doc ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 10px; }
                .report-doc li { margin-bottom: 4px; }
                .report-doc strong { font-weight: 700; }
                .report-doc table { border-collapse: collapse !important; width: 100% !important; margin: 12px 0 20px !important; }
                .report-doc td, .report-doc th { border: 1px solid #cbd5e1; padding: 6px 10px; vertical-align: top; }
                .report-doc th { font-weight: 700; background: #f8fafc; }
              `}} />

              <div ref={contentRef} className="report-doc space-y-5">

                {/* Kop Surat */}
                <div className="text-center space-y-1 pb-4" style={{ borderBottom: '3px double #0f172a' }}>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-700">PEMERINTAH KABUPATEN MIMIKA</div>
                  <div className="text-sm font-black uppercase tracking-widest text-teal-900">BADAN RISET DAN INOVASI DAERAH (BRIDA)</div>
                  <div className="text-[9px] text-slate-500 italic">Sentra Pemerintahan SP3, Jalan Cenderawasih, Kuala Kencana, Mimika, Papua Tengah</div>
                </div>

                {/* Judul Nota Dinas */}
                <div className="text-center pt-1">
                  <div className="text-sm font-black uppercase tracking-wider text-slate-900 underline decoration-2 underline-offset-4">NOTA DINAS</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">
                    Nomor: 000.5.2/BRIDA/{new Date(report.createdAt).getFullYear()}
                  </div>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs border-y border-slate-200 py-3 font-medium text-slate-700">
                  <div><strong>Penerima:</strong> {currentReport?.recipient || 'Bupati Mimika'}</div>
                  <div className="text-right"><strong>Periode:</strong> {currentReport?.period || '-'}</div>
                  <div><strong>Pengirim:</strong> {currentReport?.sender || 'Kepala BRIDA Mimika'}</div>
                  <div className="text-right"><strong>Tanggal:</strong> {currentReport?.date || new Date(report.createdAt).toLocaleDateString('id-ID')}</div>
                </div>

                {/* Judul Laporan */}
                <div className="pb-2 border-b border-slate-100">
                  <div className="text-[9px] font-black text-teal-700 uppercase tracking-widest">Judul Laporan Analitik</div>
                  <h2 className="text-sm font-bold text-slate-900 mt-0.5">{report.title}</h2>
                </div>

                {/* Ringkasan Eksekutif */}
                <div className="border-l-4 border-teal-700 pl-4 py-1 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-teal-900">
                    <FileText size={13} className="text-teal-700" />
                    <span>Ringkasan Eksekutif</span>
                  </div>
                  <MarkdownContent
                    content={report.executiveSummary}
                    className="text-slate-800 text-xs leading-relaxed [&_p]:mb-2 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1"
                  />
                </div>

                {/* Deviasi */}
                {currentReport?.deviations && currentReport.deviations.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-900 pb-2 border-b border-slate-200 flex items-center gap-2">
                      <AlertTriangle size={14} className="text-amber-600" />
                      <span>Indikator Deviasi Signifikan</span>
                    </div>
                    <div className="space-y-3 divide-y divide-slate-100">
                      {currentReport.deviations.map((d: any, idx: number) => (
                        <div key={idx} className="pt-3 first:pt-0 space-y-1 text-xs">
                          <strong className="block font-bold text-slate-900">{sanitizeReportText(d.title).replace(/\*\*/g, '')}</strong>
                          <p className="text-slate-700 font-medium">
                            Target: <span className="font-bold text-slate-900">{sanitizeReportText(d.baseline).replace(/\*\*/g, '')}</span>
                            {' '}&#8226;{' '}
                            Realisasi: <span className="font-bold text-slate-900">{sanitizeReportText(d.realization).replace(/\*\*/g, '')}</span>
                            {' '}&#8226;{' '}
                            Deviasi: <span className={d.severityColor || 'text-red-700 font-bold'}>{sanitizeReportText(d.deviationText).replace(/\*\*/g, '')}</span>
                          </p>
                          <div className="text-slate-600 pt-0.5">
                            <strong className="text-slate-800">Penyebab:</strong>
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

                {/* Dampak Kebijakan Nasional */}
                {currentReport?.nationalPolicyImpact && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-900 pb-2 border-b border-slate-200 flex items-center gap-2">
                      <FileText size={14} className="text-teal-700" />
                      <span>Analisis Dampak Kebijakan Eksternal</span>
                    </div>
                    <div className="pl-4 space-y-2 text-xs">
                      <strong className="block font-bold text-slate-900">
                        Kebijakan: {currentReport.nationalPolicyImpact.policyName}
                      </strong>
                      <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Hasil Simulasi:</p>
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

                {/* Prioritas Tindakan */}
                {currentReport?.actionPriorities && currentReport.actionPriorities.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-900 pb-2 border-b border-slate-200 flex items-center gap-2">
                      <FileText size={14} className="text-teal-700" />
                      <span>Rekomendasi &amp; Prioritas Tindakan</span>
                    </div>
                    <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-800 font-medium">
                      {currentReport.actionPriorities.map((item: string, idx: number) => (
                        <li key={idx} className="leading-relaxed">
                          <MarkdownContent content={item} className="text-inherit [&_p]:mb-0 [&_strong]:font-semibold" />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Footer */}
                <div className="text-[9px] text-slate-400 text-center border-t border-slate-200 pt-6 mt-8 italic">
                  Dokumen ini dihasilkan secara otomatis oleh BRIDA SMART Analysis Engine Kabupaten Mimika.
                </div>

              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
