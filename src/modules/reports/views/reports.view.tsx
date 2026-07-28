import React, { useState, useEffect } from 'react';
import { PdfExportService } from '../../../services/pdf-export.service';
import { DocumentService } from '../../../services/document.service';
import type { DocumentRecord } from '../../../services/document.service';
import { ReportService } from '../../../services/report.service';
import type { GeneratedReportDetail } from '../../../services/report.service';
import { CategorizedDocumentSelector } from '../../../components/common/categorized-document-selector.component';
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
  Building2,
  History,
  Sparkles,
  RefreshCw,
  Database,
  Trash2,
  Eye,
  Search,
  UploadCloud,
  X,
  FileUp,
} from 'lucide-react';

interface ReportsViewProps {
  onNavigateToGenerator?: (initialPrompt?: string) => void;
  onNavigateToDashboard?: () => void;
  initialSelectedDocIds?: string[]; // Prop baru hasil forward [3]
  onClearSharedDocIds?: () => void;  // Callback pembersihan [3]
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  onNavigateToGenerator,
  onNavigateToDashboard,
  initialSelectedDocIds,
  onClearSharedDocIds,
}) => {
  // State for available source documents
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(true);

  // Direct Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const [uploadCategory, setUploadCategory] = useState<string>('Laporan Strategis');
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Generation State
  const [forceRegenerate, setForceRegenerate] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Active Report & History (Strictly 100% Real Live DB Data)
  const [currentReport, setCurrentReport] = useState<any | null>(null);
  const [reportMetadata, setReportMetadata] = useState<{
    id?: string;
    isCached?: boolean;
    tokenCount?: number;
    llmProvider?: string;
    createdAt?: string;
  }>({});

  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [savedReports, setSavedReports] = useState<GeneratedReportDetail[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Live filter states for saved reports history (Calendar Datepicker & Text Search)
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyCalendarDate, setHistoryCalendarDate] = useState('');

  const filteredSavedReports = savedReports.filter((report) => {
    // 1. Text Search Filter
    const q = historySearchQuery.toLowerCase();
    const matchesText =
      report.title.toLowerCase().includes(q) ||
      (report.executiveSummary && report.executiveSummary.toLowerCase().includes(q));

    if (!matchesText) return false;

    // 2. Calendar Date Filter (YYYY-MM-DD)
    if (historyCalendarDate) {
      const reportDate = new Date(report.createdAt);
      if (!isNaN(reportDate.getTime())) {
        const reportDateIso = reportDate.toISOString().split('T')[0];
        if (reportDateIso !== historyCalendarDate) return false;
      }
    }

    return true;
  });

  // Toast & Export
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Initial Load: Fetch ingested documents & saved reports history
  useEffect(() => {
    loadDocuments();
    loadHistory();
  }, []);

  /**
   * Memuat dokumen acuan dari basis data
   */
  const loadDocuments = async () => {
    setIsLoadingDocs(true);
    try {
      const fetchedDocs = await DocumentService.listDocuments();
      setDocuments(fetchedDocs || []);

      // HANYA jalankan seleksi default jika TIDAK ada dokumen hasil penerusan
      if (!initialSelectedDocIds || initialSelectedDocIds.length === 0) {
        if (fetchedDocs && fetchedDocs.length > 0 && selectedDocIds.length === 0) {
          // Select first document by default
          setSelectedDocIds([fetchedDocs[0].id]);
        }
      }
    } catch (err: any) {
      console.error('Gagal memuat dokumen dari database:', err);
      setDocuments([]);
      showToast('Gagal terhubung ke server database dokumen.');
    } finally {
      setIsLoadingDocs(false);
    }
  };

  /**
   * Menyelaraskan dokumen hasil penerusan secara aman (Forwarding State sync)
   */
  useEffect(() => {
    if (documents.length > 0) {
      if (initialSelectedDocIds && initialSelectedDocIds.length > 0) {
        // Penyaringan defensif: Pastikan ID dokumen yang diteruskan benar-benar ada di database
        const validIds = initialSelectedDocIds.filter((id) =>
          documents.some((doc) => doc.id === id)
        );

        if (validIds.length > 0) {
          setSelectedDocIds(validIds);
        }

        // Segera bersihkan state transien global untuk menghindari masalah sticky selection
        onClearSharedDocIds?.();
      }
    }
  }, [initialSelectedDocIds, documents]);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const history = await ReportService.listSavedReports();
      setSavedReports(history || []);

      // If no active report loaded yet and history exists, auto-load latest saved report
      if (!currentReport && history && history.length > 0) {
        loadReportToView(history[0]);
      }
    } catch (err: any) {
      console.error('Gagal memuat riwayat laporan:', err);
      setSavedReports([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const toggleSelectDocument = (docId: string) => {
    setSelectedDocIds((prev) => {
      if (prev.includes(docId)) {
        return prev.filter((id) => id !== docId);
      } else {
        return [...prev, docId];
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedDocIds(documents.map((d) => d.id));
  };

  const handleClearAll = () => {
    setSelectedDocIds([]);
  };

  // Direct Document Upload Handler (.pdf, .txt, .docx)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadFile(file);
      if (!uploadTitle) {
        // Remove file extension for default title
        const titleWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setUploadTitle(titleWithoutExt);
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      showToast('Pilih file dokumen terlebih dahulu (.pdf, .txt, atau .docx)');
      return;
    }

    setIsUploading(true);
    try {
      const newDoc = await DocumentService.uploadDocument(
        uploadFile,
        uploadTitle || uploadFile.name,
        uploadCategory,
      );

      showToast(`Dokumen '${newDoc.title}' berhasil diunggah & diproses oleh AI Engine!`);

      // Refresh documents list & auto-select newly uploaded doc
      await loadDocuments();
      setSelectedDocIds((prev) => [...prev, newDoc.id]);

      // Reset & close modal
      setUploadFile(null);
      setUploadTitle('');
      setIsUploadModalOpen(false);
    } catch (err: any) {
      showToast(`Gagal mengunggah dokumen: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (selectedDocIds.length === 0) {
      showToast('Silakan pilih minimal 1 dokumen acuan dari dropdown terlebih dahulu.');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await ReportService.generateReport({
        documentIds: selectedDocIds,
        forceRegenerate,
      });

      loadReportToView(response.data, response.isCached);
      setActiveTab('active');

      if (response.isCached) {
        showToast('⚡ Laporan dimuat langsung dari Database Cache (0 Token terpakai)!');
      } else {
        showToast(`✨ Laporan baru berhasil disintesis oleh AI dan disimpan ke Database!`);
      }

      loadHistory();
    } catch (err: any) {
      showToast(`Gagal menghasilkan laporan: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const loadReportToView = (reportDetail: GeneratedReportDetail, isCached: boolean = true) => {
    const payload = reportDetail.contentPayload || {};

    setCurrentReport({
      title: reportDetail.title || payload.title || 'Laporan Eksekutif Resmi Bupati',
      urgency: payload.urgency || 'TINGGI',
      recipient: payload.recipient || 'Bupati Mimika',
      sender: payload.sender || 'Kepala Badan Riset dan Inovasi Daerah (BRIDA) Kabupaten Mimika',
      period: payload.period || 'Triwulan IV 2024 / Sintesis Multidokumen',
      date: payload.date || new Date(reportDetail.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }),
      executiveSummary: reportDetail.executiveSummary || payload.executiveSummary,
      deviations: payload.deviations || [],
      nationalPolicyImpact: payload.nationalPolicyImpact || { policyName: '-', simulationResults: [] },
      actionPriorities: payload.actionPriorities || [],
    });

    setReportMetadata({
      id: reportDetail.id,
      isCached,
      tokenCount: isCached ? 0 : reportDetail.tokenCount,
      llmProvider: isCached ? `Database Cache (${reportDetail.sources?.length || 1} Dokumen Acuan)` : reportDetail.llmProvider,
      createdAt: reportDetail.createdAt,
    });

    if (reportDetail.sources && reportDetail.sources.length > 0) {
      setSelectedDocIds(reportDetail.sources.map((s) => s.id));
    }
  };

  const handleSelectFromHistory = async (reportId: string) => {
    try {
      const report = await ReportService.getSavedReport(reportId);
      loadReportToView(report, true);
      setActiveTab('active');
      showToast(`Laporan '${report.title}' berhasil dimuat dari database.`);
    } catch (err: any) {
      showToast(`Gagal memuat laporan: ${err.message}`);
    }
  };

  const handleDeleteHistory = async (e: React.MouseEvent, reportId: string) => {
    e.stopPropagation();
    if (!window.confirm('Apakah Anda yakin ingin menghapus laporan ini dari database?')) return;

    try {
      await ReportService.deleteSavedReport(reportId);
      showToast('Laporan berhasil dihapus dari database.');
      if (reportMetadata.id === reportId) {
        setCurrentReport(null);
      }
      loadHistory();
    } catch (err: any) {
      showToast(`Gagal menghapus laporan: ${err.message}`);
    }
  };

  const handleExportPdf = () => {
    if (!currentReport) return;
    setIsExportingPdf(true);
    try {
      PdfExportService.exportBupatiReportPdf(currentReport);
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
    if (onNavigateToGenerator && currentReport) {
      onNavigateToGenerator(`Buatkan artikel publikasi berdasarkan ${currentReport.title}`);
    }
  };

  return (
    <div className="flex flex-col w-full bg-slate-100/70 p-6 space-y-6 font-roboto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 border border-slate-700 shadow-xl flex items-center gap-3 rounded-none no-print">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* SECTION 1. HERO COMMAND STRIP HEADER */}
      <div className="w-full bg-white border border-slate-300 px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-none shadow-2xs no-print">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold uppercase text-slate-900 tracking-tight">
            Laporan Strategis &amp; Nota Dinas Bupati
          </h1>
          <p className="text-xs text-slate-500 font-normal mt-1">
            Penyusunan dan generasi laporan eksekutif multidokumen untuk bahan rekomendasi pengambilan keputusan Bupati Mimika.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-none flex items-center gap-2 cursor-pointer transition-colors"
          >
            <UploadCloud size={14} />
            <span>Unggah Dokumen Acuan Baru</span>
          </button>

          {onNavigateToDashboard && (
            <button
              onClick={onNavigateToDashboard}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-none border border-slate-300 flex items-center gap-2 cursor-pointer transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Dashboard</span>
            </button>
          )}
        </div>
      </div>

      {/* SECTION 1: Categorized Multi-Document Selector Hub (Flat, Categorized, Compact Scroll) */}
      <div className="no-print space-y-4">
        <CategorizedDocumentSelector
          documents={documents}
          selectedDocIds={selectedDocIds}
          onToggleDoc={toggleSelectDocument}
          onSelectAll={handleSelectAll}
          onClearAll={handleClearAll}
          isLoading={isLoadingDocs}
          onUploadNew={() => setIsUploadModalOpen(true)}
          title="Pilihan Dokumen Acuan Laporan"
        />

        {/* Generation Action Toolbar */}
        <div className="bg-white border border-slate-300 p-4 rounded-none shadow-2xs flex flex-wrap items-center justify-between gap-4 font-roboto">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={forceRegenerate}
              onChange={(e) => setForceRegenerate(e.target.checked)}
              className="rounded-none border-slate-300 text-teal-700 focus:ring-teal-500"
            />
            <span className="flex items-center gap-1.5">
              <RefreshCw size={13} className={forceRegenerate ? 'text-teal-700 animate-spin' : 'text-slate-500'} />
              <span>Paksa Generate Ulang AI (Bypass DB Cache)</span>
            </span>
          </label>

          <button
            onClick={handleGenerateReport}
            disabled={isGenerating || selectedDocIds.length === 0}
            className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs uppercase tracking-wider rounded-none inline-flex items-center gap-2 border border-teal-800 shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Memproses Laporan AI...</span>
              </>
            ) : (
              <>
                <Sparkles size={15} />
                <span>Generate Laporan AI Acuan</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* SECTION 2: Tab Navigation (Laporan Aktif vs Riwayat Database) */}
      <div className="flex items-center border-b border-slate-300 no-print">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 rounded-none transition-all ${activeTab === 'active'
            ? 'border-teal-700 text-teal-900 bg-white shadow-2xs font-extrabold'
            : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
        >
          <FileText size={15} />
          <span>Laporan Aktif (Kop Resmi Bupati)</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('history');
            loadHistory();
          }}
          className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 rounded-none transition-all ${activeTab === 'history'
            ? 'border-teal-700 text-teal-900 bg-white shadow-2xs font-extrabold'
            : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
        >
          <History size={15} />
          <span>Riwayat Laporan Database ({savedReports.length})</span>
        </button>
      </div>

      {/* TAB CONTENT 1: Active Report Viewer */}
      {activeTab === 'active' && (
        !currentReport ? (
          <div className="bg-white border border-slate-300 p-12 text-center rounded-none shadow-xs space-y-4">
            <Database size={42} className="mx-auto text-slate-400" />
            <h3 className="text-base font-bold text-slate-900">Belum Ada Laporan Ditampilkan</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Pilih dokumen acuan dari dropdown di atas, lalu klik <strong>'Generate Laporan AI Acuan'</strong> untuk membuat laporan berbasis AI atau memuat dari database cache.
            </p>
            {documents.length === 0 && (
              <div className="pt-2">
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs uppercase tracking-wider rounded-none border border-teal-800 inline-flex items-center gap-2"
                >
                  <UploadCloud size={15} />
                  <span>Unggah Dokumen Acuan Pertama (.pdf / .txt)</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white border border-slate-300 p-6 lg:p-10 rounded-none shadow-xs space-y-6">
            {/* Token & Cache Metadata Telemetry Header (Borderless) */}
            <div className="border-b border-slate-200 pb-3 text-xs flex flex-wrap items-center justify-between gap-2 no-print font-medium text-slate-600">
              <div className="flex items-center gap-2">
                <Database size={15} className="text-teal-700" />
                <span>Sumber Data: <strong className="text-slate-900">{reportMetadata.llmProvider}</strong></span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-700 font-bold">
                  Token Digunakan: {reportMetadata.tokenCount?.toLocaleString() || 0}
                </span>
                {reportMetadata.createdAt && (
                  <span>&bull; Tersimpan: {new Date(reportMetadata.createdAt).toLocaleString('id-ID')}</span>
                )}
              </div>
            </div>

            {/* Kop Header Laporan Resmi */}
            <div className="border-b-2 border-slate-900 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
                <div>
                  <span className="text-xs font-bold text-teal-800 uppercase tracking-widest block mb-1 items-center gap-1.5">
                    <Building2 size={14} className="text-teal-700" />
                    <span>PEMERINTAH KABUPATEN MIMIKA &bull; BRIDA SMART ANALYSIS</span>
                  </span>
                  <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-wide">
                    {currentReport.title}
                  </h1>
                </div>
                {(() => {
                  const urgencyStr = (currentReport.urgency || '').toUpperCase();
                  const isHigh = urgencyStr.includes('TINGGI') || urgencyStr.includes('UTAMA');
                  const isMedium = urgencyStr.includes('SEDANG') || urgencyStr.includes('MENENGAH');

                  const bgClass = isHigh
                    ? 'bg-red-50 text-red-800 border border-red-200'
                    : isMedium
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200';

                  return (
                    <span className={`px-3 py-1 text-xs font-bold uppercase rounded-none flex items-center gap-1.5 shrink-0 self-start ${bgClass}`}>
                      {isHigh ? (
                        <ShieldAlert size={14} className="text-red-750" />
                      ) : isMedium ? (
                        <AlertTriangle size={14} className="text-amber-750" />
                      ) : (
                        <CheckCircle2 size={14} className="text-emerald-750" />
                      )}
                      <span>PRIORITAS: {currentReport.urgency}</span>
                    </span>
                  );
                })()}
              </div>

              {/* Penerima/Pengirim Details (Left Border Accent - Zero Nested Box) */}
              <div className="text-xs text-slate-700 space-y-1 font-medium border-teal-700 pl-4 py-1.5 mt-3">
                <div><strong>Penerima:</strong> {currentReport.recipient}</div>
                <div><strong>Pengirim:</strong> {currentReport.sender}</div>
                <div className="flex flex-wrap items-center gap-3 text-slate-600">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} className="text-slate-500" />
                    <span>Periode Data: {currentReport.period}</span>
                  </span>
                  <span>&bull;</span>
                  <span>Tanggal Rilis: {currentReport.date}</span>
                </div>
              </div>
            </div>

            {/* Ringkasan Eksekutif (Executive Summary - Clean Left Accent - Zero Nested Box) */}
            <div className="border-teal-700 pl-4 py-2.5 bg-slate-50/70 text-slate-900 font-normal leading-relaxed italic text-sm text-justify pr-4">
              <strong className="block text-xs uppercase tracking-wider text-teal-900 font-bold mb-1.5 not-italic items-center gap-1.5">
                <FileText size={14} className="text-teal-700" />
                <span>RINGKASAN EKSEKUTIF</span>
              </strong>
              {currentReport.executiveSummary}
            </div>

            {/* Kumpulan Indikator Deviasi Signifikan (Flat Modular Section) */}
            {currentReport.deviations && currentReport.deviations.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 pb-2 border-b border-slate-200 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-600" />
                  <span>KUMPULAN INDIKATOR DEVIASI SIGNIFIKAN</span>
                </h3>

                <div className="space-y-3 divide-y divide-slate-100">
                  {currentReport.deviations.map((d: any, idx: number) => (
                    <div key={idx} className="pt-3 first:pt-0 space-y-1 text-xs">
                      <strong className="block font-bold text-slate-900 text-sm">{d.title}</strong>
                      <p className="text-slate-700 font-medium">
                        Baseline Target: <span className="font-bold text-slate-900">{d.baseline}</span> &bull; Realisasi Aktual: <span className="font-bold text-slate-900">{d.realization}</span> &bull; Deviasi: <span className={d.severityColor || 'text-red-700 font-bold'}>{d.deviationText}</span>
                      </p>
                      <p className="text-slate-600 font-normal pt-0.5">
                        <strong className="text-slate-800">Penyebab Utama:</strong> {d.causes}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analisis Dampak Kebijakan Eksternal / Nasional (Flat Modular Section) */}
            {currentReport.nationalPolicyImpact && (
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
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Rekomendasi Respon Berbasis Prioritas (Action Plan - Flat Modular Section) */}
            {currentReport.actionPriorities && currentReport.actionPriorities.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 pb-2 border-b border-slate-200 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-700" />
                  <span>REKOMENDASI RESPON BERBASIS PRIORITAS (ACTION PLAN)</span>
                </h3>

                <div className="space-y-2">
                  <span className="block text-[11px] uppercase tracking-wider text-amber-900 font-bold mb-1">
                    INSTRUKSI PRIORITAS (Harus Dieksekusi Sebelum Tenggat Waktu)
                  </span>
                  <div className="space-y-2">
                    {currentReport.actionPriorities.map((act: string, idx: number) => (
                      <div key={idx} className="text-xs text-slate-800 font-medium border-amber-600 pl-3 py-1">
                        {act}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

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
                <span>Edit Teks / Generasi Artikel</span>
              </button>
            </div>
          </div>
        )
      )}

      {/* TAB CONTENT 2: History Database List */}
      {activeTab === 'history' && (
        <div className="bg-white border border-slate-300 p-6 rounded-none shadow-xs space-y-4 font-roboto">
          {/* Header & Filter Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Database size={16} className="text-teal-700 shrink-0" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Daftar Laporan AI Tersimpan di Database ({filteredSavedReports.length} dari {savedReports.length})
              </h2>
            </div>

            {/* Filter Controls: Calendar Datepicker + Search Box */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Calendar Datepicker Input */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 px-2 py-1 text-xs">
                <Calendar size={13} className="text-teal-700 shrink-0" />
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider hidden sm:inline">
                  Pilih Kalender:
                </span>
                <input
                  type="date"
                  value={historyCalendarDate}
                  onChange={(e) => setHistoryCalendarDate(e.target.value)}
                  className="bg-transparent text-slate-900 text-xs font-semibold focus:outline-none cursor-pointer rounded-none"
                />
                {historyCalendarDate && (
                  <button
                    onClick={() => setHistoryCalendarDate('')}
                    className="p-0.5 text-slate-400 hover:text-red-600 cursor-pointer"
                    title="Hapus tanggal kalender"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Text Search Input */}
              <div className="relative w-full sm:w-56">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="Cari judul / ringkasan..."
                  className="w-full bg-slate-50 border border-slate-300 pl-8 pr-7 py-1 text-xs text-slate-900 focus:outline-none focus:border-teal-700 rounded-none font-medium"
                />
                {historySearchQuery && (
                  <button
                    onClick={() => setHistorySearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    title="Hapus kata kunci filter"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <button
                onClick={loadHistory}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase rounded-none border border-slate-300 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {isLoadingHistory ? (
            <div className="py-12 text-center text-xs text-slate-500 font-medium flex items-center justify-center gap-2">
              <Loader2 size={18} className="animate-spin text-teal-600" />
              <span>Memuat riwayat laporan tersimpan...</span>
            </div>
          ) : filteredSavedReports.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Database size={32} className="mx-auto text-slate-400" />
              <p className="text-sm font-semibold">Tidak ditemukan laporan yang cocok dengan filter.</p>
              <p className="text-xs text-slate-400">Coba ubah tanggal kalender atau kata kunci pencarian Anda.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 border border-slate-200">
              {filteredSavedReports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => handleSelectFromHistory(report.id)}
                  className="p-4 hover:bg-slate-50 transition-colors flex flex-wrap items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="space-y-1 max-w-2xl">
                    <strong className="block text-sm font-bold text-slate-900 hover:text-teal-700">
                      {report.title}
                    </strong>
                    <p className="text-xs text-slate-600 line-clamp-2">
                      {report.executiveSummary}
                    </p>
                    <div className="text-[11px] text-slate-500 font-semibold flex flex-wrap items-center gap-3 pt-1">
                      <span>Tanggal: {new Date(report.createdAt).toLocaleString('id-ID')}</span>
                      <span>&bull;</span>
                      <span>Acuan: {report.sources?.length || 1} Dokumen</span>
                      <span>&bull;</span>
                      <span className="text-teal-700">Provider: {report.llmProvider}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleSelectFromHistory(report.id)}
                      className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs uppercase tracking-wider rounded-none inline-flex items-center gap-1.5"
                    >
                      <Eye size={14} />
                      <span>Buka</span>
                    </button>
                    <button
                      onClick={(e) => handleDeleteHistory(e, report.id)}
                      className="px-2.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 font-bold text-xs uppercase tracking-wider rounded-none border border-red-300 inline-flex items-center gap-1"
                      title="Hapus Laporan"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: Upload Direct Document (.pdf, .txt, .docx) */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 shadow-2xl max-w-lg w-full p-6 rounded-none space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-slate-900">
                <FileUp size={18} className="text-teal-700" />
                <h3 className="text-sm font-bold uppercase">Unggah Dokumen Acuan Baru</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Pilih File Dokumen (.pdf, .txt, .docx)
                </label>
                <input
                  type="file"
                  accept=".pdf,.txt,.docx"
                  onChange={handleFileChange}
                  required
                  className="w-full text-xs p-2 border border-slate-300 bg-slate-50 focus:outline-none focus:border-teal-700"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  File akan langsung diproses oleh AI Ingestion Engine dan disimpan ke PostgreSQL.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Judul Dokumen Acuan
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Contoh: Laporan Pertumbuhan Ekonomi Kabupaten Mimika 2024"
                  required
                  className="w-full text-xs p-2.5 border border-slate-300 focus:outline-none focus:border-teal-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Kategori Dokumen
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 focus:outline-none focus:border-teal-700 bg-white"
                >
                  <option value="Laporan Strategis">Laporan Strategis</option>
                  <option value="Keuangan & Perekonomian">Keuangan & Perekonomian</option>
                  <option value="Kesehatan & Sosial">Kesehatan & Sosial</option>
                  <option value="Infrastruktur & Pembangunan">Infrastruktur & Pembangunan</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs uppercase tracking-wider inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Mengunggah & Ekstraksi AI...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud size={14} />
                      <span>Unggah & Tambah ke Acuan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsView;