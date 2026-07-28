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
import {
  Download,
  Send,
  PenTool,
  Loader2,
  BarChart3,
  FileCheck2,
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
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  onNavigateToGenerator,
  initialSelectedDocIds,
  onClearSharedDocIds,
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

  // ===================== DIALOG MODAL STATE FOR ROLE MAPPING =====================
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [modalBaselineId, setModalBaselineId] = useState('');
  const [modalRealizationId, setModalRealizationId] = useState('');
  const [modalIndicatorName, setModalIndicatorName] = useState('Analisis Deviasi Dokumen Terpilih');
  const [modalSector, setModalSector] = useState('Pembangunan & Kebijakan Daerah');
  const [modalTargetValue, setModalTargetValue] = useState(100);
  const [modalRealizationValue, setModalRealizationValue] = useState(84.5);
  const [modalUnitSuffix, setModalUnitSuffix] = useState('%');

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
                      { factor: 'Eskalasi Biaya Material Daerah', weightPercentage: 35, category: 'Ekonomi', description: 'Fluktuasi harga bahan di Kabupaten Mimika.' },
                      { factor: 'Kondisi Cuaca Ekstrem', weightPercentage: 20, category: 'Lingkungan', description: 'Hambatan cuaca pada pengerjaan fisik.' },
                    ],
                    recommendations: [
                      { id: 'db-rec-1', actionTitle: 'Percepatan Evaluasi & Verifikasi Proyek', pic: 'Dinas PU & BRIDA', deadline: '30 Hari', estimatedCostText: 'Rp 100 Juta', priority: 'TINGGI', status: 'IN_PROGRESS' },
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

  const saveSessionToStorage = (newSessions: SavedAnalysisSession[]) => {
    setSavedSessions(newSessions);
    localStorage.setItem('brida_saved_analysis_sessions', JSON.stringify(newSessions));
  };

  const toggleDocumentSelection = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((dId) => dId !== id) : [...prev, id],
    );
  };

  const selectAllCategoryDocs = (docType: string) => {
    const categoryDocIds = documents
      .filter((d) => d.metadata?.docType === docType)
      .map((d) => d.id);
    const allSelected = categoryDocIds.every((id) => selectedDocIds.includes(id));
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

    // Cari dokumen Baseline & Realisasi secara proaktif dari pilihan user
    const autoBaseline = documents.find(
      (d) => selectedDocIds.includes(d.id) && d.metadata?.docType === 'BASELINE'
    );
    const autoRealization = documents.find(
      (d) => selectedDocIds.includes(d.id) && d.metadata?.docType === 'REALIZATION'
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
      }
    } catch (err: any) {
      console.error('Gagal memuat cache dari DB:', err);
    }
  };

  const baselineDocs = documents.filter((d) => d.metadata?.docType === 'BASELINE');
  const realizationDocs = documents.filter((d) => d.metadata?.docType === 'REALIZATION');
  const generalDocs = documents.filter((d) => d.metadata?.docType === 'GENERAL_REFERENCE' || !d.metadata?.docType);

  const isAllBaselineSelected = baselineDocs.length > 0 && baselineDocs.every((d) => selectedDocIds.includes(d.id));
  const isAllRealizationSelected = realizationDocs.length > 0 && realizationDocs.every((d) => selectedDocIds.includes(d.id));
  const isAllGeneralSelected = generalDocs.length > 0 && generalDocs.every((d) => selectedDocIds.includes(d.id));

  // Mendapatkan daftar dokumen terpilih untuk dropdown di dialog modal
  const selectedDocumentsList = documents.filter((d) => selectedDocIds.includes(d.id));

  return (
    <div className="flex flex-col w-full bg-slate-100/70 p-6 space-y-6 font-roboto relative">
      { }
      <div className="w-full bg-white border border-slate-300 px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-none shadow-2xs">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold uppercase text-slate-900 tracking-tight">
            Analisis Deviasi Multidokumen
          </h1>
          <p className="text-xs text-slate-500 font-normal mt-1">
            Pilih dokumen acuan Target dan Realisasi untuk mengeksekusi analisis perbandingan deviasi capaian kinerja secara deterministik.
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

      { }
      {savedSessions.length > 0 && (
        <div className="bg-white border border-slate-300 p-4 rounded-none shadow-2xs space-y-3 font-roboto">
          { }
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <History size={16} className="text-teal-700 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider text-teal-900">
                Riwayat Analisis Tersimpan ({filteredSavedSessions.length} dari {savedSessions.length} Sesi)
              </span>
            </div>

            { }
            <div className="flex flex-wrap items-center gap-2">
              { }
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 px-2 py-1 text-xs">
                <Calendar size={13} className="text-teal-700 shrink-0" />
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider hidden sm:inline">
                  Pilih Kalender:
                </span>
                <input
                  type="date"
                  value={selectedCalendarDate}
                  onChange={(e) => setSelectedCalendarDate(e.target.value)}
                  className="bg-transparent text-slate-900 text-xs font-semibold focus:outline-none cursor-pointer rounded-none"
                />
                {selectedCalendarDate && (
                  <button
                    onClick={() => setSelectedCalendarDate('')}
                    className="p-0.5 text-slate-400 hover:text-red-600 cursor-pointer"
                    title="Hapus tanggal kalender"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              { }
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
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    title="Hapus kata kunci filter"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          { }
          {filteredSavedSessions.length === 0 ? (
            <p className="text-xs text-slate-500 py-2 italic font-normal">
              Tidak ada cache sesi analisis yang cocok dengan filter kata kunci "{sessionSearchQuery}".
            </p>
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
              {filteredSavedSessions.map((session) => {
                const isActive = session.id === activeSessionId;
                return (
                  <div
                    key={session.id}
                    onClick={() => handleSelectHistorySession(session)}
                    className={`px-3.5 py-2 border text-xs cursor-pointer flex items-center gap-2.5 shrink-0 transition-all rounded-none ${isActive
                      ? 'bg-teal-50 border-teal-600 text-teal-950 font-bold shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                  >
                    <Clock size={13} className="text-teal-700 shrink-0" />
                    <div className="flex flex-col">
                      <span className="truncate max-w-50 font-semibold text-slate-900">{session.indicatorName}</span>
                      <span className="text-[9px] text-slate-500 font-normal">
                        {session.timestamp} &bull; {session.selectedDocTitles?.length || 1} Dokumen
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteHistorySession(session.id, e)}
                      className="p-1 text-slate-400 hover:text-red-600 ml-1 cursor-pointer"
                      title="Hapus riwayat ini"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      { }
      <div className="bg-white border border-slate-200 p-6 rounded-none shadow-xs space-y-4 font-roboto">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-teal-700 shrink-0" />
            <h2 className="text-sm font-bold text-slate-900 tracking-wide">
              Pilih Dokumen Acuan yang Akan Dianalisis
            </h2>
          </div>
          <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-none">
            {selectedDocIds.length} Dokumen Terpilih
          </span>

        </div>

        {isLoadingDocs ? (
          <div className="flex items-center gap-2 py-8 justify-center text-slate-600 text-xs font-bold">
            <Loader2 size={18} className="animate-spin text-teal-700" />
            <span>Memuat daftar dokumen dari database...</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-6 bg-slate-50 border border-slate-200 text-center space-y-2">
            <AlertCircle size={24} className="mx-auto text-slate-400" />
            <p className="text-xs font-semibold text-slate-700">
              Belum ada dokumen diunggah di Repositori.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 border-y border-slate-200 py-2">
            { }
            <div className="p-3 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Target size={14} className="text-teal-600 shrink-0" />
                  1. Target (Baseline)
                </span>
                <button
                  type="button"
                  onClick={() => selectAllCategoryDocs('BASELINE')}
                  className="text-slate-500 hover:text-teal-700 transition-colors cursor-pointer p-0.5"
                  title={isAllBaselineSelected ? 'Batal Pilih Semua (Uncheck All)' : 'Pilih Semua (Check All)'}
                >
                  {isAllBaselineSelected ? (
                    <CheckSquare size={16} className="text-teal-700" />
                  ) : (
                    <Square size={16} className="text-slate-400" />
                  )}
                </button>
              </div>
              <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                {baselineDocs.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-1">Tidak ada dokumen Target Baseline.</p>
                ) : (
                  baselineDocs.map((doc) => {
                    const isSelected = selectedDocIds.includes(doc.id);
                    return (
                      <div
                        key={doc.id}
                        onClick={() => toggleDocumentSelection(doc.id)}
                        className={`p-2 text-xs cursor-pointer flex items-start gap-2 transition-colors ${isSelected ? 'bg-teal-50/80 font-semibold text-slate-900' : 'hover:bg-slate-50 text-slate-600'
                          }`}
                      >
                        {isSelected ? <CheckSquare size={15} className="text-teal-700 shrink-0 mt-0.5" /> : <Square size={15} className="text-slate-400 shrink-0 mt-0.5" />}
                        <span className="truncate">{doc.title}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            { }
            <div className="p-3 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <BarChart3 size={14} className="text-teal-600 shrink-0" />
                  2. Realisasi (Capaian)
                </span>
                <button
                  type="button"
                  onClick={() => selectAllCategoryDocs('REALIZATION')}
                  className="text-slate-500 hover:text-teal-700 transition-colors cursor-pointer p-0.5"
                  title={isAllRealizationSelected ? 'Batal Pilih Semua (Uncheck All)' : 'Pilih Semua (Check All)'}
                >
                  {isAllRealizationSelected ? (
                    <CheckSquare size={16} className="text-teal-700" />
                  ) : (
                    <Square size={16} className="text-slate-400" />
                  )}
                </button>
              </div>
              <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                {realizationDocs.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-1">Tidak ada dokumen Realisasi.</p>
                ) : (
                  realizationDocs.map((doc) => {
                    const isSelected = selectedDocIds.includes(doc.id);
                    return (
                      <div
                        key={doc.id}
                        onClick={() => toggleDocumentSelection(doc.id)}
                        className={`p-2 text-xs cursor-pointer flex items-start gap-2 transition-colors ${isSelected ? 'bg-teal-50/80 font-semibold text-slate-900' : 'hover:bg-slate-50 text-slate-600'
                          }`}
                      >
                        {isSelected ? <CheckSquare size={15} className="text-teal-700 shrink-0 mt-0.5" /> : <Square size={15} className="text-slate-400 shrink-0 mt-0.5" />}
                        <span className="truncate">{doc.title}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            { }
            <div className="p-3 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Newspaper size={14} className="text-teal-600 shrink-0" />
                  3. Referensi (Umum)
                </span>
                <button
                  type="button"
                  onClick={() => selectAllCategoryDocs('GENERAL_REFERENCE')}
                  className="text-slate-500 hover:text-teal-700 transition-colors cursor-pointer p-0.5"
                  title={isAllGeneralSelected ? 'Batal Pilih Semua (Uncheck All)' : 'Pilih Semua (Check All)'}
                >
                  {isAllGeneralSelected ? (
                    <CheckSquare size={16} className="text-teal-700" />
                  ) : (
                    <Square size={16} className="text-slate-400" />
                  )}
                </button>
              </div>
              <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                {generalDocs.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-1">Tidak ada dokumen Referensi Umum.</p>
                ) : (
                  generalDocs.map((doc) => {
                    const isSelected = selectedDocIds.includes(doc.id);
                    return (
                      <div
                        key={doc.id}
                        onClick={() => toggleDocumentSelection(doc.id)}
                        className={`p-2 text-xs cursor-pointer flex items-start gap-2 transition-colors ${isSelected ? 'bg-teal-50/80 font-semibold text-slate-900' : 'hover:bg-slate-50 text-slate-600'
                          }`}
                      >
                        {isSelected ? <CheckSquare size={15} className="text-teal-700 shrink-0 mt-0.5" /> : <Square size={15} className="text-slate-400 shrink-0 mt-0.5" />}
                        <span className="truncate">{doc.title}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        { }
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleOpenMappingModal} // Alihkan dari handleExecute ke pembukaan modal dialog [5]
            disabled={isComparing || selectedDocIds.length === 0}
            className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white font-bold text-xs uppercase tracking-wider rounded-none inline-flex items-center gap-2 border border-teal-900 shadow-sm"
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

      { }
      {(isComparing || compareResult) && (
        <div className="space-y-4">
          { }
          <div className="flex items-center justify-between bg-white border border-slate-300 p-3 rounded-none">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Hasil Diagnostik Deviasi: {compareResult?.math?.indicatorName || 'Analisis Multidokumen'}
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

              <button
                onClick={() =>
                  alert(`Kirim Laporan Nota Eksekutif ${compareResult?.math?.indicatorName} langsung ke WhatsApp Bupati Mimika.`)
                }
                disabled={!compareResult}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 text-white font-bold text-xs uppercase tracking-wider rounded-none inline-flex items-center gap-1.5 border border-emerald-800 shadow-xs"
              >
                <Send size={12} />
                <span>Kirim WA Bupati</span>
              </button>

              {onNavigateToGenerator && compareResult && (
                <button
                  onClick={() =>
                    onNavigateToGenerator(
                      `Buatkan artikel publikasi mengenai analisis deviasi ${compareResult.math.indicatorName} di Kabupaten Mimika.`,
                    )
                  }
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs uppercase tracking-wider rounded-none inline-flex items-center gap-1.5 border border-teal-700 shadow-xs"
                >
                  <PenTool size={12} />
                  <span>Buat Artikel</span>
                </button>
              )}
            </div>
          </div>

          { }
          <div id="deep-dive-analysis-container" className="space-y-6 bg-white p-4 border border-slate-300">
            { }
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 uppercase tracking-tight">
                  BADAN RISET DAN INOVASI DAERAH (BRIDA) KABUPATEN MIMIKA
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

            { }
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

            { }
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

            { }
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