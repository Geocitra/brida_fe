import React, { useState, useEffect, useRef } from 'react';
import { PdfExportService } from '../../../services/pdf-export.service';
import { DocumentService } from '../../../services/document.service';
import type { DocumentRecord } from '../../../services/document.service';
import { ReportService } from '../../../services/report.service';
import type { GeneratedReportDetail, CheckCacheResponse } from '../../../services/report.service';
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
  Zap,
  History,
  Sparkles,
  RefreshCw,
  Database,
  Trash2,
  Eye,
  Search,
  UploadCloud,
  ChevronDown,
  X,
  Plus,
  FileUp,
  Check,
} from 'lucide-react';

interface ReportsViewProps {
  onNavigateToGenerator?: (initialPrompt?: string) => void;
  onNavigateToDashboard?: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  onNavigateToGenerator,
  onNavigateToDashboard,
}) => {
  // State for available source documents
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(true);

  // Dropdown & Search state
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Direct Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const [uploadCategory, setUploadCategory] = useState<string>('Laporan Strategis');
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Cache & Generation State
  const [cacheStatus, setCacheStatus] = useState<CheckCacheResponse | null>(null);
  const [isCheckingCache, setIsCheckingCache] = useState<boolean>(false);
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

  // Toast & Export
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initial Load: Fetch ingested documents & saved reports history
  useEffect(() => {
    loadDocuments();
    loadHistory();
  }, []);

  // Live Cache Status Check when selection changes
  useEffect(() => {
    if (selectedDocIds.length > 0) {
      checkCacheStatus(selectedDocIds);
    } else {
      setCacheStatus(null);
    }
  }, [selectedDocIds]);

  const loadDocuments = async () => {
    setIsLoadingDocs(true);
    try {
      const fetchedDocs = await DocumentService.listDocuments();
      setDocuments(fetchedDocs || []);
      if (fetchedDocs && fetchedDocs.length > 0 && selectedDocIds.length === 0) {
        // Select first document by default
        setSelectedDocIds([fetchedDocs[0].id]);
      }
    } catch (err: any) {
      console.error('Gagal memuat dokumen dari database:', err);
      setDocuments([]);
      showToast('Gagal terhubung ke server database dokumen.');
    } finally {
      setIsLoadingDocs(false);
    }
  };

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

  const checkCacheStatus = async (docIds: string[]) => {
    setIsCheckingCache(true);
    try {
      const res = await ReportService.checkCache(docIds);
      setCacheStatus(res);
    } catch (err) {
      setCacheStatus(null);
    } finally {
      setIsCheckingCache(false);
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
    setSelectedDocIds(filteredDocuments.map((d) => d.id));
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
      urgency: payload.urgency || 'SANGAT TINGGI (MEMERLUKAN DISPOSISI)',
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

  // Filtered documents for live text search in dropdown
  const filteredDocuments = documents.filter((doc) => {
    const q = searchQuery.toLowerCase();
    const titleMatch = doc.title.toLowerCase().includes(q);
    const catMatch = (doc.metadata?.category || '').toLowerCase().includes(q);
    return titleMatch || catMatch;
  });

  const selectedDocObjects = documents.filter((d) => selectedDocIds.includes(d.id));

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 border border-slate-700 shadow-xl flex items-center gap-3 rounded-none no-print">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 no-print border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 uppercase tracking-wide">
              Modul Laporan Eksekutif & Acuan Multidokumen
            </h1>
            <span className="px-2.5 py-0.5 bg-teal-100 text-teal-800 border border-teal-300 text-xs font-bold uppercase rounded-none">
              Token Efficiency Mode
            </span>
          </div>
          <p className="text-xs text-slate-600 font-medium mt-1">
            Cari & pilih dokumen acuan dari dropdown. Jika belum tersedia di database, Anda dapat langsung mengunggah file TXT/PDF.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold uppercase rounded-none border border-teal-800 inline-flex items-center gap-2 shadow-xs"
          >
            <UploadCloud size={14} />
            <span>+ Unggah Dokumen Acuan Baru</span>
          </button>

          {onNavigateToDashboard && (
            <button
              onClick={onNavigateToDashboard}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold uppercase rounded-none border border-slate-300 inline-flex items-center gap-2 shadow-2xs"
            >
              <ArrowLeft size={14} />
              <span>Dashboard</span>
            </button>
          )}
        </div>
      </div>

      {/* SECTION 1: Searchable Combobox / Multi-Select Dropdown & Cache Alert */}
      <div className="bg-white border border-slate-300 p-5 rounded-none shadow-xs space-y-4 no-print">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-teal-700" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Pilihan Dokumen Acuan Laporan ({selectedDocIds.length} Dipilih)
            </h2>
          </div>

          {/* Live Cache Status Badge */}
          {isCheckingCache ? (
            <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
              <Loader2 size={13} className="animate-spin text-teal-600" />
              <span>Memeriksa Cache Database...</span>
            </span>
          ) : cacheStatus?.isCached ? (
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-1.5">
              <Zap size={14} className="text-emerald-600" />
              <span>Tersedia di DB Cache (Hemat 100% Token!)</span>
            </span>
          ) : selectedDocIds.length > 0 ? (
            <span className="px-3 py-1 bg-sky-100 text-sky-800 border border-sky-300 text-xs font-bold flex items-center gap-1.5">
              <Sparkles size={14} className="text-sky-600" />
              <span>Kombinasi Baru (Diperlukan Generasi AI)</span>
            </span>
          ) : null}
        </div>

        {/* Searchable Dropdown Control */}
        <div className="space-y-3">
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Cari & Pilih Dokumen Acuan (Dropdown Interaktif)
            </label>

            {/* Dropdown Input / Trigger */}
            <div
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-300 p-2.5 cursor-pointer flex items-center justify-between gap-2 rounded-none min-h-[42px]"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Search size={16} className="text-slate-500 shrink-0" />
                {selectedDocIds.length === 0 ? (
                  <span className="text-xs text-slate-400 font-medium">
                    -- Pilih atau cari dokumen acuan di database --
                  </span>
                ) : (
                  <span className="text-xs text-slate-900 font-bold truncate">
                    {selectedDocObjects.map((d) => d.title).join(', ')}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 text-slate-500 shrink-0">
                <span className="text-[11px] font-semibold bg-slate-200 px-1.5 py-0.5 text-slate-800">
                  {selectedDocIds.length} Terpilih
                </span>
                <ChevronDown size={16} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>

            {/* Dropdown Menu (Open Overlay) */}
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 shadow-xl z-40 max-h-80 overflow-y-auto rounded-none p-3 space-y-3">
                {/* Search Typing Bar inside Dropdown */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ketik untuk mencari judul dokumen atau kategori..."
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-300 text-xs rounded-none focus:outline-none focus:border-teal-700"
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Quick Selection Toolbar */}
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 border-b border-slate-200 pb-2">
                  <span>Menampilkan {filteredDocuments.length} dari {documents.length} dokumen</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectAll();
                      }}
                      className="text-teal-700 hover:underline"
                    >
                      Pilih Semua
                    </button>
                    <span>&bull;</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearAll();
                      }}
                      className="text-red-600 hover:underline"
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>

                {/* List of Filtered Items */}
                {isLoadingDocs ? (
                  <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <Loader2 size={15} className="animate-spin text-teal-600" />
                    <span>Memuat dokumen dari database...</span>
                  </div>
                ) : filteredDocuments.length === 0 ? (
                  <div className="py-6 text-center space-y-2 text-slate-500">
                    <p className="text-xs font-semibold">Tidak ditemukan dokumen acuan yang cocok.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setIsUploadModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-teal-700 text-white text-xs font-bold uppercase rounded-none inline-flex items-center gap-1.5"
                    >
                      <Plus size={13} />
                      <span>Unggah Dokumen Baru Sekarang</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                    {filteredDocuments.map((doc) => {
                      const isSelected = selectedDocIds.includes(doc.id);
                      return (
                        <div
                          key={doc.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectDocument(doc.id);
                          }}
                          className={`p-2.5 border cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs rounded-none ${
                            isSelected
                              ? 'bg-teal-50 border-teal-600 text-teal-900 font-bold'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                        >
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="truncate">{doc.title}</div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              {doc.metadata?.category || 'Umum'} &bull; {doc.metadata?.totalTokenCount ? `${doc.metadata.totalTokenCount.toLocaleString()} Token` : 'Ready'}
                            </div>
                          </div>
                          <div className={`w-4 h-4 border flex items-center justify-center shrink-0 ${isSelected ? 'bg-teal-700 border-teal-700 text-white' : 'border-slate-400'}`}>
                            {isSelected && <Check size={12} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected Document Tags / Pills */}
          {selectedDocObjects.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {selectedDocObjects.map((doc) => (
                <span
                  key={doc.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal-100 border border-teal-300 text-teal-900 text-xs font-bold rounded-none"
                >
                  <FileText size={12} className="text-teal-700" />
                  <span className="max-w-xs truncate">{doc.title}</span>
                  <button
                    type="button"
                    onClick={() => toggleSelectDocument(doc.id)}
                    className="hover:text-red-700 ml-1 text-slate-500"
                    title="Hapus acuan ini"
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Generation Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-200">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={forceRegenerate}
              onChange={(e) => setForceRegenerate(e.target.checked)}
              className="rounded-none border-slate-300 text-teal-700 focus:ring-teal-500"
            />
            <span className="flex items-center gap-1">
              <RefreshCw size={13} className={forceRegenerate ? 'text-teal-700 animate-spin' : 'text-slate-500'} />
              <span>Paksa Generate Ulang AI (Bypass DB Cache)</span>
            </span>
          </label>

          <button
            onClick={handleGenerateReport}
            disabled={isGenerating || selectedDocIds.length === 0}
            className={`px-5 py-2.5 font-bold text-xs uppercase tracking-wider rounded-none inline-flex items-center gap-2 border shadow-xs transition-all ${
              cacheStatus?.isCached && !forceRegenerate
                ? 'bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-800'
                : 'bg-teal-700 hover:bg-teal-800 text-white border-teal-800'
            } disabled:opacity-50`}
          >
            {isGenerating ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Memproses Laporan AI...</span>
              </>
            ) : cacheStatus?.isCached && !forceRegenerate ? (
              <>
                <Zap size={15} />
                <span>Muat Laporan dari DB (0 Token)</span>
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
          className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 rounded-none transition-all ${
            activeTab === 'active'
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
          className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 rounded-none transition-all ${
            activeTab === 'history'
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
          <div className="bg-white border border-slate-300 border-l-4 border-l-slate-900 p-6 lg:p-10 rounded-none shadow-xs space-y-6">
            {/* Token & Cache Metadata Banner */}
            <div className="bg-slate-100 border border-slate-300 p-3 text-xs flex flex-wrap items-center justify-between gap-2 no-print font-semibold text-slate-700">
              <div className="flex items-center gap-2">
                <Database size={15} className="text-teal-700" />
                <span>Sumber Data: <strong>{reportMetadata.llmProvider}</strong></span>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 bg-slate-200 text-slate-800 text-[11px] font-bold">
                  Token Digunakan: {reportMetadata.tokenCount?.toLocaleString() || 0}
                </span>
                {reportMetadata.createdAt && (
                  <span>Tersimpan: {new Date(reportMetadata.createdAt).toLocaleString('id-ID')}</span>
                )}
              </div>
            </div>

            {/* Kop Header Laporan Resmi */}
            <div className="border-b-2 border-slate-900 pb-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-xs font-bold text-teal-800 uppercase tracking-widest block mb-1 flex items-center gap-1.5">
                    <Building2 size={14} className="text-teal-700" />
                    <span>PEMERINTAH KABUPATEN MIMIKA &bull; BRIDA SMART ANALYSIS</span>
                  </span>
                  <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-wide">
                    {currentReport.title}
                  </h1>
                </div>
                <span className="px-3 py-1 bg-red-100 border border-red-300 text-red-800 text-xs font-bold uppercase rounded-none flex items-center gap-1">
                  <ShieldAlert size={14} />
                  <span>SIFAT: {currentReport.urgency}</span>
                </span>
              </div>

              <div className="text-xs text-slate-700 space-y-1 font-semibold bg-slate-50 p-4 border border-slate-200 mt-3">
                <div><strong>Penerima:</strong> {currentReport.recipient}</div>
                <div><strong>Pengirim:</strong> {currentReport.sender}</div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} className="text-slate-500" />
                    <span>Periode Data: {currentReport.period}</span>
                  </span>
                  <span>&bull;</span>
                  <span>Tanggal Rilis: {currentReport.date}</span>
                </div>
              </div>
            </div>

            {/* Ringkasan Eksekutif (Executive Summary) */}
            <div className="bg-sky-50 border border-sky-200 p-5 rounded-none text-slate-900 font-medium leading-relaxed italic text-sm">
              <strong className="block text-xs uppercase tracking-wider text-sky-900 font-bold mb-2 not-italic flex items-center gap-1.5">
                <FileText size={14} className="text-sky-700" />
                <span>RINGKASAN EKSEKUTIF</span>
              </strong>
              {currentReport.executiveSummary}
            </div>

            {/* Kumpulan Indikator Deviasi Signifikan */}
            {currentReport.deviations && currentReport.deviations.length > 0 && (
              <div>
                <h3 className="text-h3 text-slate-900 mb-4 pb-2 border-b border-slate-200 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-amber-600" />
                  <span>KUMPULAN INDIKATOR DEVIASI SIGNIFIKAN</span>
                </h3>

                <div className="space-y-4">
                  {currentReport.deviations.map((d: any, idx: number) => (
                    <div key={idx} className="bg-slate-50 border border-slate-300 p-4 rounded-none">
                      <strong className="block text-sm font-bold text-slate-900 mb-1">{d.title}</strong>
                      <p className="text-xs text-slate-700 font-semibold mb-2">
                        Baseline Target: <strong>{d.baseline}</strong> | Realisasi Aktual: <strong>{d.realization}</strong> | Deviasi: <span className={d.severityColor || 'text-red-700 font-bold'}>{d.deviationText}</span>
                      </p>
                      <div className="text-xs text-slate-600 bg-white p-2.5 border border-slate-200">
                        <strong>Penyebab Utama:</strong> {d.causes}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analisis Dampak Kebijakan Eksternal / Nasional */}
            {currentReport.nationalPolicyImpact && (
              <div>
                <h3 className="text-h3 text-slate-900 mb-4 pb-2 border-b border-slate-200 flex items-center gap-2">
                  <FileText size={18} className="text-teal-700" />
                  <span>ANALISIS DAMPAK KEBIJAKAN EKSTERNAL / NASIONAL</span>
                </h3>

                <div className="bg-slate-50 border border-slate-300 p-4 rounded-none">
                  <strong className="block text-sm font-bold text-slate-900 mb-2">
                    Kebijakan Makro: {currentReport.nationalPolicyImpact.policyName}
                  </strong>
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Hasil Simulasi AI Engine:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-slate-800 font-semibold">
                    {currentReport.nationalPolicyImpact.simulationResults?.map((r: string, idx: number) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Rekomendasi Respon Berbasis Prioritas */}
            {currentReport.actionPriorities && currentReport.actionPriorities.length > 0 && (
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
                    {currentReport.actionPriorities.map((act: string, idx: number) => (
                      <div key={idx} className="text-xs text-slate-900 font-semibold bg-white p-3 border border-amber-200">
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

      {/* TAB CONTENT 2: Saved Reports History in Database */}
      {activeTab === 'history' && (
        <div className="bg-white border border-slate-300 p-6 rounded-none shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Database size={16} className="text-teal-700" />
              <span>Daftar Laporan AI Tersimpan di Database PostgreSQL</span>
            </h2>
            <button
              onClick={loadHistory}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase rounded-none border border-slate-300 inline-flex items-center gap-1.5"
            >
              <RefreshCw size={13} />
              <span>Refresh</span>
            </button>
          </div>

          {isLoadingHistory ? (
            <div className="py-12 text-center text-xs text-slate-500 font-medium flex items-center justify-center gap-2">
              <Loader2 size={18} className="animate-spin text-teal-600" />
              <span>Memuat riwayat laporan tersimpan...</span>
            </div>
          ) : savedReports.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Database size={32} className="mx-auto text-slate-400" />
              <p className="text-sm font-semibold">Belum ada laporan yang tersimpan di database.</p>
              <p className="text-xs text-slate-400">Pilih dokumen acuan dari dropdown dan klik 'Generate Laporan AI Acuan' untuk menyimpan laporan baru.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 border border-slate-200">
              {savedReports.map((report) => (
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

      {/* Footer Note */}
      <div className="text-center text-xs text-slate-500 font-medium pt-4">
        BRIDA SMART Analysis &bull; Terintegrasi Database Caching PostgreSQL & Engine Generative AI Kabupaten Mimika
      </div>
    </div>
  );
};

export default ReportsView;
