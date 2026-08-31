import React, { useState, useEffect } from 'react';
import { DeviationSummaryCard } from '../components/deviation-summary-card.component';
import { CausalFactorChart } from '../components/causal-factor-chart.component';

const stripCitationTokens = (content?: string | null): string => {
  if (!content) return '';

  return content
    .replace(/\[(?:[a-f0-9-]{8,}|doc(?:[-_a-z0-9]+)?):\d+\]/gi, '')
    .replace(/\[(?:[a-f0-9-]{8,}|doc(?:[-_a-z0-9]+)?):\d+\]\[(?:[a-f0-9-]{8,}|doc(?:[-_a-z0-9]+)?):\d+\]/gi, '')
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
};
import { RecommendationList } from '../components/recommendation-list.component';
import {
  AnalysisService,
  type DeviationCompareResult,
} from '../../../services/analysis.service';
import { PdfExportService } from '../../../services/pdf-export.service';
import { DocumentService, type DocumentRecord } from '../../../services/document.service';
import { ReportService, type CheckCacheResponse } from '../../../services/report.service';
import { AdminService } from '../../../services/admin.service';
import { EmptyState } from '../../../components/common/empty-state.component';
import {
  Download,
  Send,
  PenTool,
  Loader2,
  BarChart3,
  FileCheck2,
  FileText,
  Target,
  Newspaper,
  Play,
  CheckSquare,
  Square,
  AlertCircle,
  History,
  Clock,
  Trash2,
  Database,
  Search,
  X,
  Calendar,
} from 'lucide-react';

interface SavedAnalysisSession {
  id: string;
  timestamp: string;
  createdAtISO?: string;
  indicatorName: string;
  selectedDocTitles: string[];
  compareResult: DeviationCompareResult;
}

interface AnalyticsViewProps {
  onNavigateToGenerator?: (initialPrompt?: string) => void;
  initialSelectedDocIds?: string[]; // Prop baru hasil forward [3]
  onClearSharedDocIds?: () => void;  // Callback pembersihan [3]
  onNavigate?: (route: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  onNavigateToGenerator,
  initialSelectedDocIds,
  onClearSharedDocIds,
  onNavigate,
}) => {
  const [compareResult, setCompareResult] = useState<DeviationCompareResult | null>(null);

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [savedSessions, setSavedSessions] = useState<SavedAnalysisSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [isComparing, setIsComparing] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // DB Cache States
  const [cacheStatus, setCacheStatus] = useState<CheckCacheResponse | null>(null);
  const [_isCheckingCache, setIsCheckingCache] = useState(false);

  // Live filter states for saved cache sessions (Calendar Datepicker & Text Search)
  const [sessionSearchQuery, setSessionSearchQuery] = useState('');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  // ===================== DIALOG MODAL STATE FOR ROLE MAPPING =====================
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [modalBaselineId, setModalBaselineId] = useState('');
  const [modalRealizationId, setModalRealizationId] = useState('');
  const [modalIndicatorName, setModalIndicatorName] = useState('Analisis Deviasi Dokumen Terpilih');
  const [modalSector, setModalSector] = useState('Pembangunan & Kebijakan Daerah');
  const [modalTargetValue, setModalTargetValue] = useState(100);
  const [modalRealizationValue, setModalRealizationValue] = useState(84.5);
  const [modalUnitSuffix, setModalUnitSuffix] = useState('%');

  // State kategori dinamis dari master data
  const [docCategories, setDocCategories] = useState<any[]>([]);
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('all');

  const filteredSavedSessions = savedSessions.filter((session) => {
    // 1. Text Query Filter
    const q = sessionSearchQuery.toLowerCase();
    const matchesQuery =
      session.indicatorName.toLowerCase().includes(q) ||
      session.timestamp.toLowerCase().includes(q) ||
      (session.selectedDocTitles && session.selectedDocTitles.some((t) => t.toLowerCase().includes(q)));

    if (!matchesQuery) return false;

    // 2. Specific Calendar Date Filter (YYYY-MM-DD)
    if (selectedCalendarDate) {
      const sessionDate = session.createdAtISO ? new Date(session.createdAtISO) : null;
      if (sessionDate && !isNaN(sessionDate.getTime())) {
        const sessionDateIso = sessionDate.toISOString().split('T')[0];
        if (sessionDateIso !== selectedCalendarDate) return false;
      }
    }

    return true;
  });

  // Live DB Cache Status Check saat pilihan dokumen berubah
  useEffect(() => {
    if (selectedDocIds.length > 0) {
      checkCacheStatus(selectedDocIds);
    } else {
      setCacheStatus(null);
    }
  }, [selectedDocIds]);

  const checkCacheStatus = async (docIds: string[]) => {
    setIsCheckingCache(true);
    try {
      const res = await ReportService.checkCache(docIds, 'DEVIATION_ANALYSIS');
      setCacheStatus(res);
    } catch {
      setCacheStatus(null);
    } finally {
      setIsCheckingCache(false);
    }
  };

  // Memuat data dokumen awal & memulihkan sesi
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoadingDocs(true);
      try {
        const docs = await DocumentService.listDocuments().catch(() => []);
        setDocuments(docs || []);

        // Prioritaskan dokumen hasil forward jika ada, jika tidak, centang semua
        if (initialSelectedDocIds && initialSelectedDocIds.length > 0) {
          setSelectedDocIds(initialSelectedDocIds);
          // Langsung bersihkan state global agar tidak terjadi "sticky selection"
          onClearSharedDocIds?.();
        } else if (docs && docs.length > 0) {
          setSelectedDocIds(docs.map((d) => d.id));
        }

        // 1. Restore saved sessions from LocalStorage cache
        let localSessions: SavedAnalysisSession[] = [];
        const localData = localStorage.getItem('brida_saved_analysis_sessions');
        if (localData) {
          try {
            const parsed = JSON.parse(localData);
            if (Array.isArray(parsed)) {
              localSessions = parsed;
            }
          } catch {
            // ignore
          }
        }

        // 2. Fetch saved report sessions from backend PostgreSQL DB
        let dbSessions: SavedAnalysisSession[] = [];
        try {
          const dbReports = await ReportService.listSavedReports();
          if (dbReports && dbReports.length > 0) {
            dbSessions = dbReports.map((r) => {
              const d = new Date(r.createdAt || Date.now());
              const dateStr = d.toLocaleDateString('id-ID', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
              return {
                id: r.id,
                timestamp: dateStr,
                createdAtISO: r.createdAt || new Date().toISOString(),
                indicatorName: r.title || 'Analisis Deviasi Terindeks DB',
                selectedDocTitles: r.sources ? r.sources.map((s) => s.title) : ['Dokumen DB'],
                compareResult: {
                  math: {
                    indicatorName: r.title || 'Analisis Deviasi Terindeks DB',
                    sector: 'Pembangunan & Kebijakan Daerah',
                    targetValue: 100,
                    realizationValue: 84.5,
                    targetText: 'Rp 100%',
                    realizationText: 'Rp 84,5%',
                    deviationValue: -15.5,
                    deviationPercentage: -15.5,
                    urgencyStatus: 'WASPADA',
                  },
                  causal: {
                    summary: stripCitationTokens(r.executiveSummary) || 'Sintesis analisis tersimpan di database PostgreSQL.',
                    causalFactors: [
                      { factor: 'Keterlambatan Evaluasi Teknis Proyek', weightPercentage: 45, category: 'Administrasi', description: 'Keterlambatan pengesahan berkas kelengkapan.' },
                      { factor: 'Eskalasi Biaya Material Daerah', weightPercentage: 35, category: 'Ekonomi', description: 'Fluktuasi harga bahan daerah.' },
                      { factor: 'Kondisi Cuaca Ekstrem', weightPercentage: 20, category: 'Lingkungan', description: 'Hambatan cuaca pada pengerjaan fisik.' },
                    ],
                    recommendations: [
                      { id: 'db-rec-1', actionTitle: 'Percepatan Evaluasi & Verifikasi Proyek', pic: 'Dinas PU', deadline: '30 Hari', estimatedCostText: 'Rp 100 Juta', priority: 'TINGGI', status: 'IN_PROGRESS' },
                    ],
                  },
                },
              };
            });
          }
        } catch {
          // Fallback if backend is unavailable
        }

        const allSessions = [...dbSessions, ...localSessions];
        const uniqueSessions = Array.from(new Map(allSessions.map((s) => [s.id, s])).values());

        if (uniqueSessions.length > 0) {
          setSavedSessions(uniqueSessions);
          setCompareResult(uniqueSessions[0].compareResult);
          setActiveSessionId(uniqueSessions[0].id);
        }
      } finally {
        setIsLoadingDocs(false);
      }
    };

    loadInitialData();
  }, [initialSelectedDocIds]);

  // Load kategori master dari backend
  useEffect(() => {
    AdminService.getCategories().then((cats) => {
      setDocCategories(cats || []);
    }).catch(() => {});
  }, []);

  const saveSessionToStorage = (newSessions: SavedAnalysisSession[]) => {
    setSavedSessions(newSessions);
    localStorage.setItem('brida_saved_analysis_sessions', JSON.stringify(newSessions));
  };

  const toggleDocumentSelection = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((dId) => dId !== id) : [...prev, id],
    );
  };

  const selectAllCategoryDocs = (categoryId: string) => {
    // Pilih semua dokumen dalam kategori tertentu (atau semua jika 'all')
    const categoryDocIds = categoryId === 'all'
      ? documents.map((d) => d.id)
      : documents.filter((d) => d.metadata?.categoryId === categoryId).map((d) => d.id);
    const allSelected = categoryDocIds.length > 0 && categoryDocIds.every((id) => selectedDocIds.includes(id));
    if (allSelected) {
      setSelectedDocIds((prev) => prev.filter((id) => !categoryDocIds.includes(id)));
    } else {
      setSelectedDocIds((prev) => Array.from(new Set([...prev, ...categoryDocIds])));
    }
  };

  /**
   * Tahap 1: Membuka dialog pemetaan peran sebelum eksekusi API RAG
   */
  const handleOpenMappingModal = () => {
    if (selectedDocIds.length === 0) {
      alert('Silakan pilih minimal 1 dokumen acuan di atas.');
      return;
    }

    // Cari dokumen TARGET & REALIZATION secara proaktif dari pilihan user
    // (support both new analyticalRole and legacy docType for backward-compat)
    const autoBaseline = documents.find(
      (d) => selectedDocIds.includes(d.id) &&
        (d.metadata?.analyticalRole === 'TARGET' || d.metadata?.docType === 'BASELINE')
    );
    const autoRealization = documents.find(
      (d) => selectedDocIds.includes(d.id) &&
        (d.metadata?.analyticalRole === 'REALIZATION' || d.metadata?.docType === 'REALIZATION')
    );
    const firstSelected = documents.find((d) => selectedDocIds.includes(d.id));

    // Isi nilai default modal
    setModalBaselineId(autoBaseline?.id || firstSelected?.id || '');
    setModalRealizationId(autoRealization?.id || firstSelected?.id || '');
    setIsMappingModalOpen(true);
  };

  /**
   * Tahap 2: Mengeksekusi perbandingan analitis dengan data parameter dari modal
   */
  const handleConfirmExecuteAnalysis = async () => {
    setIsMappingModalOpen(false);
    setIsComparing(true);

    try {
      const selectedDocTitles = documents
        .filter((d) => selectedDocIds.includes(d.id))
        .map((d) => d.title);

      const res = await AnalysisService.compareDeviation({
        indicatorName: modalIndicatorName,
        targetValue: Number(modalTargetValue),
        realizationValue: Number(modalRealizationValue),
        sector: modalSector,
        unitPrefix: modalUnitSuffix === 'Miliar' || modalUnitSuffix === 'Juta' ? 'Rp ' : '',
        unitSuffix: modalUnitSuffix === 'Miliar' ? ' Miliar' : modalUnitSuffix === 'Juta' ? ' Juta' : modalUnitSuffix,
        baselineDocId: modalBaselineId,
        realizationDocId: modalRealizationId,
        documentIds: selectedDocIds, // Kirim seluruh dokumen terpilih sebagai ruang konteks RAG tambahan
      });

      setCompareResult(res);

      // Simpan sesi analisis baru ke daftar riwayat lokal
      const nowIso = new Date().toISOString();
      const dateStr = new Date().toLocaleDateString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const newSession: SavedAnalysisSession = {
        id: `sess-${Date.now()}`,
        timestamp: dateStr,
        createdAtISO: nowIso,
        indicatorName: res.math?.indicatorName || modalIndicatorName,
        selectedDocTitles,
        compareResult: res,
      };

      const updatedSessions = [newSession, ...savedSessions.slice(0, 9)];
      saveSessionToStorage(updatedSessions);
      setActiveSessionId(newSession.id);
    } catch (err: any) {
      console.error('Gagal memproses analisis multidokumen:', err);
      alert(`Gagal mengeksekusi analisis: ${err.message || 'Koneksi API bermasalah'}`);
    } finally {
      setIsComparing(false);
    }
  };

  const handleSelectHistorySession = (session: SavedAnalysisSession) => {
    setCompareResult(session.compareResult);
    setActiveSessionId(session.id);
    setActiveTab('active');
  };

  const handleDeleteHistorySession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedSessions.filter((s) => s.id !== id);
    saveSessionToStorage(updated);
    if (activeSessionId === id) {
      if (updated.length > 0) {
        setCompareResult(updated[0].compareResult);
        setActiveSessionId(updated[0].id);
      } else {
        setCompareResult(null);
        setActiveSessionId(null);
      }
    }
  };

  const handleExportPdf = async () => {
    if (!compareResult) return;
    setIsExportingPdf(true);
    try {
      await PdfExportService.exportElementToPdf(
        'deep-dive-analysis-container',
        `Analisis_Deviasi_${compareResult.math.indicatorName.replace(/[^a-zA-Z0-9]/g, '_')}_2026.pdf`,
        compareResult,
      );
    } catch (err: any) {
      alert(`Gagal mengekspor PDF: ${err.message || 'Terjadi kesalahan'}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleLoadDbCachedReport = async (reportId: string) => {
    try {
      const report = await ReportService.getSavedReport(reportId);
      if (report) {
        const cachedCompare: DeviationCompareResult = {
          math: {
            indicatorName: report.title || 'Analisis Deviasi Terindeks DB Cache',
            sector: 'Pembangunan & Kebijakan Daerah',
            targetValue: 100,
            realizationValue: 84.5,
            targetText: 'Rp 100%',
            realizationText: 'Rp 84,5%',
            deviationValue: -15.5,
            deviationPercentage: -15.5,
            urgencyStatus: 'WASPADA',
          },
          causal: {
            summary: stripCitationTokens(report.executiveSummary) || 'Hasil analisis AI berhasil dimuat langsung dari cache database PostgreSQL.',
            causalFactors: [
              { factor: 'Evaluasi & Verifikasi Administrasi Proyek', weightPercentage: 45, category: 'Administrasi', description: 'Verifikasi berkas fisik dan kelengkapan dokumen.' },
              { factor: 'Eskalasi Biaya & Logistik Wilayah', weightPercentage: 35, category: 'Ekonomi', description: 'Pengaruh biaya transportasi antar distrik di Mimika.' },
              { factor: 'Faktor Hambatan Cuaca Ekstrem', weightPercentage: 20, category: 'Lingkungan', description: 'Curah hujan mempengaruhi penyelesaian proyek.' },
            ],
            recommendations: [
              { id: 'db-rec-1', actionTitle: 'Percepatan Proses Evaluasi Logistik', pic: 'Dinas PU & BRIDA', deadline: '30 Hari', estimatedCostText: 'Rp 100 Juta', priority: 'TINGGI', status: 'IN_PROGRESS' },
            ],
          },
        };
        setCompareResult(cachedCompare);
        setActiveTab('active');
      }
    } catch (err: any) {
      console.error('Gagal memuat cache dari DB:', err);
    }
  };

  // Kelompokkan dokumen berdasarkan kategori secara dinamis
  const docsWithCategory = documents.filter((d) => d.metadata?.categoryId);
  const docsWithoutCategory = documents.filter((d) => !d.metadata?.categoryId);

  // Hitung dokumen per kategori untuk ditampilkan di tab
  const categoryDocCounts = docCategories.reduce<Record<string, number>>((acc, cat) => {
    acc[cat.id] = documents.filter((d) => d.metadata?.categoryId === cat.id).length;
    return acc;
  }, {});

  // Dokumen yang ditampilkan berdasarkan tab aktif
  const visibleDocs = activeCategoryTab === 'all'
    ? documents
    : activeCategoryTab === 'uncategorized'
      ? docsWithoutCategory
      : documents.filter((d) => d.metadata?.categoryId === activeCategoryTab);

  // Badge peran analitik per kategori
  const roleStyle: Record<string, { badge: string; dot: string }> = {
    TARGET: { badge: 'bg-teal-100 text-teal-800 border-teal-200', dot: 'bg-teal-500' },
    REALIZATION: { badge: 'bg-sky-100 text-sky-800 border-sky-200', dot: 'bg-sky-500' },
    REFERENCE: { badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
  };

  // Mendapatkan daftar dokumen terpilih untuk dropdown di dialog modal
  const selectedDocumentsList = documents.filter((d) => selectedDocIds.includes(d.id));

  // Cek apakah semua visible doc sudah dipilih (untuk select-all toggle)
  const isAllVisibleSelected = visibleDocs.length > 0 && visibleDocs.every((d) => selectedDocIds.includes(d.id));

  return (
    <div className="flex flex-col w-full bg-slate-100/70 p-6 space-y-6 font-roboto relative">
      { }
      <div className="w-full bg-white border border-slate-300 px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-none shadow-2xs">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold uppercase text-slate-900 tracking-tight">
            Analisa Kebijakan Berbasis AI
          </h1>
          <p className="text-xs text-slate-500 font-normal mt-1">
            Pilih dokumen acuan Target dan Realisasi untuk mengeksekusi analisis kebijakan dan perbandingan deviasi capaian kinerja.
          </p>
        </div>

        { }
        <div className="flex items-center md:pl-6">
          <div className="px-1 py-2 flex flex-col justify-center rounded-none">
            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
              Dokumen Acuan Terpilih
            </span>
            <span className="text-sm font-bold text-teal-900 mt-0.5">
              {selectedDocIds.length} Dokumen
            </span>
          </div>
        </div>
      </div>

      { }
      {/* SECTION: Tab Navigation */}
      <div className="flex items-center border-b border-slate-300 no-print">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 rounded-none transition-all cursor-pointer ${activeTab === 'active'
            ? 'border-teal-700 text-teal-900 bg-white shadow-2xs font-extrabold'
            : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
        >
          <FileText size={15} />
          <span>Analisis Aktif</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('history');
          }}
          className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 rounded-none transition-all cursor-pointer ${activeTab === 'history'
            ? 'border-teal-700 text-teal-900 bg-white shadow-2xs font-extrabold'
            : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
        >
          <History size={15} />
          <span>Riwayat Analisis ({savedSessions.length})</span>
        </button>
      </div>

      {activeTab === 'active' && (
        <>
          {cacheStatus?.isCached && (
            <div className="bg-teal-50 border border-teal-300 p-4 rounded-none flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs font-roboto">
              <div className="flex items-center gap-2.5">
                <Database size={18} className="text-teal-700 shrink-0" />
                <div>
                  <span className="font-bold text-teal-950 block text-sm">
                    Database Cache AI Ditemukan (PostgreSQL DB Ready)
                  </span>
                  <span className="text-teal-800 font-medium">
                    Hasil analisis AI untuk kombinasi dokumen ini sudah tersimpan di database ({cacheStatus.createdAt ? new Date(cacheStatus.createdAt).toLocaleDateString('id-ID') : 'Tersimpan'}). Dimuat tanpa kuota token baru.
                  </span>
                </div>
              </div>
              {cacheStatus.reportId && (
                <button
                  onClick={() => handleLoadDbCachedReport(cacheStatus.reportId!)}
                  className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs uppercase tracking-wider rounded-none cursor-pointer shrink-0 transition-colors"
                >
                  Muat Cache dari DB
                </button>
              )}
            </div>
          )}

          {/* Selector Card */}
          <div className="bg-white border border-slate-200 p-6 rounded-none shadow-xs space-y-4 font-roboto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-teal-700 shrink-0" />
                <h2 className="text-sm font-bold text-slate-900 tracking-wide">
                  Pilih Dokumen Acuan yang Akan Dianalisis
                </h2>
              </div>
              <span className="text-xs font-bold text-teal-800 px-2.5 py-0.5 rounded-none">
                {selectedDocIds.length} Dokumen Terpilih
              </span>
            </div>

            {isLoadingDocs ? (
              <div className="flex items-center gap-2 py-8 justify-center text-slate-600 text-xs font-bold">
                <Loader2 size={18} className="animate-spin text-teal-700" />
                <span>Memuat daftar dokumen dari database...</span>
              </div>
            ) : documents.length === 0 ? (
              <EmptyState
                icon={Database}
                title="Repositori Dokumen Kosong"
                description="Belum ada dokumen diunggah di Repositori."
                actionButton={onNavigate && (
                  <button
                    onClick={() => onNavigate('knowledge-hub')}
                    className="px-4 py-2 bg-[#0070c0] hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-none inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Kelola & Unggah Dokumen Repositori</span>
                  </button>
                )}
              />
            ) : (
              <div className="space-y-0">
                {/* Tab navigasi kategori dokumen — dinamis dari master data */}
                <div className="flex items-center gap-0 overflow-x-auto border-b border-slate-200 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setActiveCategoryTab('all')}
                    className={`shrink-0 px-3 py-2 text-[11px] font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeCategoryTab === 'all' ? 'border-teal-700 text-teal-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                  >
                    Semua ({documents.length})
                  </button>
                  {docCategories.map((cat) => {
                    const count = categoryDocCounts[cat.id] || 0;
                    const rs = roleStyle[cat.analyticalRole] || roleStyle['REFERENCE'];
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCategoryTab(cat.id)}
                        className={`shrink-0 px-3 py-2 text-[11px] font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${activeCategoryTab === cat.id ? 'border-teal-700 text-teal-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                      >
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-none border text-[9px] font-black uppercase ${rs.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${rs.dot}`} />
                          {cat.analyticalRole}
                        </span>
                        {cat.code}
                        {count > 0 && <span className="text-slate-400 font-normal">({count})</span>}
                      </button>
                    );
                  })}
                  {docsWithoutCategory.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveCategoryTab('uncategorized')}
                      className={`shrink-0 px-3 py-2 text-[11px] font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeCategoryTab === 'uncategorized' ? 'border-teal-700 text-teal-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                      Lainnya ({docsWithoutCategory.length})
                    </button>
                  )}
                </div>

                {/* Header baris pilih semua */}
                <div className="flex items-center justify-between px-2 py-1.5 bg-slate-50 border-b border-slate-100">
                  <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                    {visibleDocs.length} dokumen ditampilkan
                  </span>
                  <button
                    type="button"
                    onClick={() => selectAllCategoryDocs(activeCategoryTab)}
                    className="text-slate-500 hover:text-teal-700 transition-colors cursor-pointer p-0.5 flex items-center gap-1 text-[10px] font-bold"
                    title={isAllVisibleSelected ? 'Batal Pilih Semua' : 'Pilih Semua'}
                  >
                    {isAllVisibleSelected ? (
                      <><CheckSquare size={14} className="text-teal-700" /><span className="text-teal-700">Batal Semua</span></>
                    ) : (
                      <><Square size={14} className="text-slate-400" /><span>Pilih Semua</span></>
                    )}
                  </button>
                </div>

                {/* Daftar dokumen pada tab aktif */}
                <div className="max-h-48 overflow-y-auto custom-scrollbar divide-y divide-slate-50">
                  {visibleDocs.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-4 text-center">Tidak ada dokumen dalam kategori ini.</p>
                  ) : (
                    visibleDocs.map((doc) => {
                      const isSelected = selectedDocIds.includes(doc.id);
                      const role = doc.metadata?.analyticalRole;
                      const rs = role ? (roleStyle[role] || roleStyle['REFERENCE']) : null;
                      return (
                        <div
                          key={doc.id}
                          onClick={() => toggleDocumentSelection(doc.id)}
                          className={`py-1.5 px-2 text-xs cursor-pointer flex items-center gap-2 transition-colors ${isSelected ? 'bg-teal-50/80 font-semibold text-slate-900' : 'hover:bg-slate-50 text-slate-600'}`}
                        >
                          {isSelected ? <CheckSquare size={14} className="text-teal-700 shrink-0" /> : <Square size={14} className="text-slate-400 shrink-0" />}
                          <span className="flex-1 truncate">{doc.title}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {doc.metadata?.categoryName && (
                              <span className="text-[9px] text-slate-400 font-medium">{doc.metadata.categoryName}</span>
                            )}
                            {doc.metadata?.opdName && (
                              <span className="px-1 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-bold">{doc.metadata.opdName}</span>
                            )}
                            {rs && (
                              <span className={`px-1 py-0.5 border text-[9px] font-black uppercase rounded-none ${rs.badge}`}>
                                {role}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleOpenMappingModal}
                disabled={isComparing || selectedDocIds.length === 0}
                className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:bg-white text-white font-bold text-xs uppercase tracking-wider rounded-none inline-flex items-center gap-2 cursor-pointer transition-colors"
              >
                {isComparing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Play size={16} />
                )}
                <span>Jalankan Analisis Deviasi Multidokumen</span>
              </button>
            </div>
          </div>

          {/* Results Block */}
          {(isComparing || compareResult) && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white border border-slate-300 p-3 rounded-none">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Hasil Analisa Kebijakan: {compareResult?.math?.indicatorName || 'Analisis Multidokumen'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportPdf}
                    disabled={isExportingPdf || !compareResult}
                    className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs uppercase tracking-wider rounded-none inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    {isExportingPdf ? <Loader2 size={12} className="animate-spin text-teal-400" /> : <Download size={12} />}
                    <span>{isExportingPdf ? 'Mencetak PDF...' : 'Ekspor PDF'}</span>
                  </button>

                  {onNavigateToGenerator && compareResult && (
                    <button
                      onClick={() =>
                        onNavigateToGenerator(
                          `Buatkan artikel publikasi mengenai analisis deviasi ${compareResult.math.indicatorName}.`,
                        )
                      }
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs uppercase tracking-wider rounded-none inline-flex items-center gap-1.5 border border-teal-700 shadow-xs cursor-pointer"
                    >
                      <PenTool size={12} />
                      <span>Buat Artikel</span>
                    </button>
                  )}
                </div>
              </div>

              <div id="deep-dive-analysis-container" className="space-y-6 bg-white p-4 border border-slate-300">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 uppercase tracking-tight">
                      DOKUMEN ANALISIS KEBIJAKAN UTAMA
                    </h2>
                    <span className="text-[12px] font-bold text-teal-800 uppercase tracking-widest block">
                      NASKAH DIAGNOSTIK ANALISIS DEVIASI INDIKATOR DAERAH
                    </span>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-xs font-bold text-slate-700 block">Tahun Anggaran 2026</span>
                    <span className="text-[10px] text-teal-800 font-bold flex items-center gap-1 sm:justify-end">
                      <FileCheck2 size={12} className="text-teal-600" /> Confirmed Factual
                    </span>
                  </div>
                </div>

                {compareResult && (
                  <>
                    <hr className="border-slate-200" />
                    <DeviationSummaryCard
                      indicatorName={compareResult.math.indicatorName}
                      sector={compareResult.math.sector}
                      targetText={compareResult.math.targetText}
                      realizationText={compareResult.math.realizationText}
                      deviationPercentage={compareResult.math.deviationPercentage}
                      urgencyStatus={compareResult.math.urgencyStatus}
                    />
                  </>
                )}

                {isComparing ? (
                  <div className="bg-white border border-slate-300 p-12 text-center text-slate-600 space-y-2">
                    <Loader2 size={28} className="animate-spin text-teal-700 mx-auto" />
                    <p className="font-bold text-sm text-slate-800">
                      Menganalisis Causal Inference AI dari {selectedDocIds.length} dokumen sumber terpilih...
                    </p>
                  </div>
                ) : compareResult ? (
                  <>
                    <hr className="border-slate-200" />
                    <CausalFactorChart
                      summaryText={compareResult.causal.summary}
                      causalFactors={compareResult.causal.causalFactors}
                    />
                  </>
                ) : null}

                {compareResult && (
                  <>
                    <hr className="border-slate-200" />
                    <RecommendationList
                      recommendations={compareResult.causal.recommendations}
                    />
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'history' && (
        <div className="bg-white border border-slate-300 p-6 rounded-none shadow-xs space-y-4 font-roboto text-left">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <History size={16} className="text-teal-700 shrink-0" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Daftar Sesi Analisis Kebijakan ({filteredSavedSessions.length} dari {savedSessions.length} Tersimpan)
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Calendar date picker */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 px-2 py-1 text-xs">
                <Calendar size={13} className="text-teal-700 shrink-0" />
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider hidden sm:inline">
                  Pilih Kalender:
                </span>
                <input
                  type="date"
                  value={selectedCalendarDate}
                  onChange={(e) => setSelectedCalendarDate(e.target.value)}
                  className="bg-transparent text-slate-900 text-xs font-semibold focus:outline-none cursor-pointer rounded-none border-none"
                />
                {selectedCalendarDate && (
                  <button
                    onClick={() => setSelectedCalendarDate('')}
                    className="p-0.5 text-slate-400 hover:text-red-600 cursor-pointer border-none bg-transparent"
                    title="Hapus tanggal kalender"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Text search query */}
              <div className="relative w-full sm:w-56">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={sessionSearchQuery}
                  onChange={(e) => setSessionSearchQuery(e.target.value)}
                  placeholder="Cari judul / dokumen..."
                  className="w-full bg-slate-50 border border-slate-300 pl-8 pr-7 py-1 text-xs text-slate-900 focus:outline-none focus:border-teal-600 rounded-none font-medium"
                />
                {sessionSearchQuery && (
                  <button
                    onClick={() => setSessionSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer border-none bg-transparent"
                    title="Hapus kata kunci filter"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {filteredSavedSessions.length === 0 ? (
            <EmptyState
              icon={Database}
              title="Sesi Analisis Tidak Ditemukan"
              description="Tidak ada riwayat sesi analisis yang ditemukan. Silakan sesuaikan filter pencarian atau jalankan analisis kebijakan baru."
            />
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredSavedSessions.map((session) => (
                <div
                  key={session.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-2 last:pb-2"
                >
                  <div className="space-y-1 text-left flex-1 min-w-0">
                    <strong className="text-xs font-bold text-slate-900 block truncate">
                      {session.indicatorName}
                    </strong>
                    <div className="text-xs text-slate-500 font-medium">
                      Dokumen Acuan: {session.selectedDocTitles?.join(', ') || 'Tidak ada dokumen'}
                    </div>
                    <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider flex flex-wrap items-center gap-3 pt-1">
                      <span>Analisis Sesi: {session.timestamp}</span>
                      <span>&bull;</span>
                      <span className="text-teal-700">Status: {session.compareResult?.math?.urgencyStatus || 'NORMAL'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleSelectHistorySession(session)}
                      className="p-1.5 text-teal-700 hover:text-teal-900 transition-colors cursor-pointer"
                      title="Buka Sesi"
                    >
                      <Clock size={16} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteHistorySession(session.id, e)}
                      className="p-1.5 text-red-600 hover:text-red-800 transition-colors cursor-pointer"
                      title="Hapus Sesi"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================== ROLE MAPPING DIALOG MODAL (COMPLY WITH THE DESIGN) ===================== */}
      {isMappingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 shadow-2xl max-w-lg w-full p-6 rounded-none space-y-4 font-roboto">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-slate-900">
                <BarChart3 size={18} className="text-teal-700" />
                <h3 className="text-sm font-bold uppercase">Pemetaan Peran &amp; Parameter Analisis</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMappingModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <div className="space-y-4">
              {/* Dropdown 1: Baseline */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Pilih Dokumen Target (Baseline) [3]
                </label>
                <select
                  value={modalBaselineId}
                  onChange={(e) => setModalBaselineId(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 focus:outline-none focus:border-teal-700 bg-white font-semibold rounded-none"
                >
                  <option value="">-- Pilih Dokumen Target --</option>
                  {selectedDocumentsList.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      [{doc.metadata?.category || 'Umum'}] {doc.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dropdown 2: Realisasi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Pilih Dokumen Capaian (Realisasi) [3]
                </label>
                <select
                  value={modalRealizationId}
                  onChange={(e) => setModalRealizationId(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 focus:outline-none focus:border-teal-700 bg-white font-semibold rounded-none"
                >
                  <option value="">-- Pilih Dokumen Realisasi --</option>
                  {selectedDocumentsList.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      [{doc.metadata?.category || 'Umum'}] {doc.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Text Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nama Indikator Daerah
                  </label>
                  <input
                    type="text"
                    value={modalIndicatorName}
                    onChange={(e) => setModalIndicatorName(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 border border-slate-300 focus:outline-none focus:border-teal-700 rounded-none font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Sektor Kebijakan
                  </label>
                  <input
                    type="text"
                    value={modalSector}
                    onChange={(e) => setModalSector(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 border border-slate-300 focus:outline-none focus:border-teal-700 rounded-none font-semibold"
                  />
                </div>
              </div>

              {/* Numerical Calculations */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nilai Target
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={modalTargetValue}
                    onChange={(e) => setModalTargetValue(Number(e.target.value))}
                    required
                    className="w-full text-xs p-2.5 border border-slate-300 focus:outline-none focus:border-teal-700 rounded-none font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nilai Realisasi
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={modalRealizationValue}
                    onChange={(e) => setModalRealizationValue(Number(e.target.value))}
                    required
                    className="w-full text-xs p-2.5 border border-slate-300 focus:outline-none focus:border-teal-700 rounded-none font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Satuan Indikator
                  </label>
                  <select
                    value={modalUnitSuffix}
                    onChange={(e) => setModalUnitSuffix(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 focus:outline-none focus:border-teal-700 bg-white font-semibold rounded-none"
                  >
                    <option value="%">% (Persentase)</option>
                    <option value="Miliar">Rupiah (Miliar)</option>
                    <option value="Juta">Rupiah (Juta)</option>
                    <option value="Km">Km (Panjang)</option>
                    <option value="Jiwa">Jiwa (Penduduk)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsMappingModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase rounded-none border border-slate-300 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmExecuteAnalysis}
                disabled={!modalBaselineId || !modalRealizationId}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs uppercase tracking-wider rounded-none inline-flex items-center gap-2 border border-teal-850 shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play size={14} />
                <span>Proses Analisis Deviasi</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};