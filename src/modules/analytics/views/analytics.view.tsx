import React, { useState, useEffect } from 'react';
import { DeviationSummaryCard } from '../components/deviation-summary-card.component';
import { CausalFactorChart } from '../components/causal-factor-chart.component';
import { RecommendationList } from '../components/recommendation-list.component';
import {
  AnalysisService,
  type DeviationCompareResult,
} from '../../../services/analysis.service';
import { PdfExportService } from '../../../services/pdf-export.service';
import { DocumentService, type DocumentRecord } from '../../../services/document.service';
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
} from 'lucide-react';

interface SavedAnalysisSession {
  id: string;
  timestamp: string;
  indicatorName: string;
  selectedDocTitles: string[];
  compareResult: DeviationCompareResult;
}

interface AnalyticsViewProps {
  onNavigateToGenerator?: (initialPrompt?: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ onNavigateToGenerator }) => {
  const [compareResult, setCompareResult] = useState<DeviationCompareResult | null>(null);

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [savedSessions, setSavedSessions] = useState<SavedAnalysisSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [isComparing, setIsComparing] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Load document list & saved sessions on mount
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoadingDocs(true);
      try {
        const docs = await DocumentService.listDocuments().catch(() => []);
        setDocuments(docs || []);

        if (docs && docs.length > 0) {
          setSelectedDocIds(docs.map((d) => d.id));
        }

        // Restore saved sessions from LocalStorage cache
        const localData = localStorage.getItem('brida_saved_analysis_sessions');
        if (localData) {
          try {
            const parsed = JSON.parse(localData);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSavedSessions(parsed);
              setCompareResult(parsed[0].compareResult);
              setActiveSessionId(parsed[0].id);
            }
          } catch {
            // ignore
          }
        }
      } finally {
        setIsLoadingDocs(false);
      }
    };

    loadInitialData();
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

  // Run multi-document analysis comparison
  const handleExecuteMultiAnalysis = async () => {
    if (selectedDocIds.length === 0) {
      alert('Silakan pilih minimal 1 dokumen acuan di atas.');
      return;
    }

    setIsComparing(true);

    try {
      const baselineDoc = documents.find((d) => selectedDocIds.includes(d.id) && d.metadata?.docType === 'BASELINE');
      const realizationDoc = documents.find((d) => selectedDocIds.includes(d.id) && d.metadata?.docType === 'REALIZATION');
      const fallbackDoc = documents.find((d) => selectedDocIds.includes(d.id));

      const selectedDocTitles = documents
        .filter((d) => selectedDocIds.includes(d.id))
        .map((d) => d.title);

      const res = await AnalysisService.compareDeviation({
        indicatorName: 'Analisis Deviasi Dokumen Terpilih',
        targetValue: 100,
        realizationValue: 84.5,
        sector: 'Pembangunan & Kebijakan Daerah',
        unitPrefix: '',
        unitSuffix: '%',
        baselineDocId: baselineDoc?.id || fallbackDoc?.id,
        realizationDocId: realizationDoc?.id || fallbackDoc?.id,
      });

      setCompareResult(res);

      // Save new analysis run to history list
      const newSession: SavedAnalysisSession = {
        id: `sess-${Date.now()}`,
        timestamp: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
        indicatorName: res.math?.indicatorName || 'Analisis Deviasi Multidokumen',
        selectedDocTitles,
        compareResult: res,
      };

      const updatedSessions = [newSession, ...savedSessions.slice(0, 9)];
      saveSessionToStorage(updatedSessions);
      setActiveSessionId(newSession.id);
    } catch (err: any) {
      console.error('Error executing multi-analysis:', err);
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

  // Export PDF functionality
  const handleExportPdf = async () => {
    if (!compareResult) return;
    setIsExportingPdf(true);
    try {
      await PdfExportService.exportElementToPdf(
        'deep-dive-analysis-container',
        `Analisis_Deviasi_${compareResult.math.indicatorName.replace(/[^a-zA-Z0-9]/g, '_')}_2026.pdf`,
      );
    } catch (err: any) {
      alert(`Gagal mengekspor PDF: ${err.message || 'Terjadi kesalahan'}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const baselineDocs = documents.filter((d) => d.metadata?.docType === 'BASELINE');
  const realizationDocs = documents.filter((d) => d.metadata?.docType === 'REALIZATION');
  const generalDocs = documents.filter((d) => d.metadata?.docType === 'GENERAL_REFERENCE' || !d.metadata?.docType);

  return (
    <div className="space-y-6 pb-12 font-roboto">
      {/* Page Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-300 pb-4">
        <div>
          <h1 className="text-h1 flex items-center gap-2">
            <BarChart3 size={24} className="text-teal-700" />
            <span>Interactive Diagnostic Workspace (Analisis Deviasi Multidokumen)</span>
          </h1>
          <p className="text-body mt-1">
            Pilih pasangan dokumen Baseline, Realisasi, dan Referensi Umum untuk menjalankan analisis deviasi deterministik secara presisi.
          </p>
        </div>
      </div>

      {/* ===================== SAVED HISTORY SESSION BAR ===================== */}
      {savedSessions.length > 0 && (
        <div className="bg-slate-900 text-slate-100 p-4 border-l-4 border-teal-500 rounded-none shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History size={16} className="text-teal-400 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
                Riwayat Analisis Terpan di Database ({savedSessions.length} Sesi)
              </span>
            </div>
            <span className="text-[10px] text-slate-400">Klik sesi untuk membuka hasil analisis instan</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
            {savedSessions.map((session) => {
              const isActive = session.id === activeSessionId;
              return (
                <div
                  key={session.id}
                  onClick={() => handleSelectHistorySession(session)}
                  className={`px-3 py-1.5 border text-xs cursor-pointer flex items-center gap-2 shrink-0 transition-colors ${
                    isActive
                      ? 'bg-teal-600/30 border-teal-400 text-white font-bold'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Clock size={12} className="text-teal-400 shrink-0" />
                  <div className="flex flex-col">
                    <span className="truncate max-w-[180px] font-semibold">{session.indicatorName}</span>
                    <span className="text-[9px] text-slate-400">{session.timestamp}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteHistorySession(session.id, e)}
                    className="p-1 text-slate-400 hover:text-red-400 ml-1"
                    title="Hapus riwayat ini"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================== MULTI-DOCUMENT SELECTOR HUB (FLAT & UN-NESTED) ===================== */}
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
              Belum ada dokumen diunggah di Knowledge Hub.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 border-y border-slate-200 py-2">
            {/* Group 1: Baseline */}
            <div className="p-3 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Target size={14} className="text-teal-600 shrink-0" />
                  1. Target (Baseline)
                </span>
                <button
                  type="button"
                  onClick={() => selectAllCategoryDocs('BASELINE')}
                  className="text-[11px] font-medium text-teal-700 hover:underline cursor-pointer"
                >
                  Pilih Semua
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
                        className={`p-2 text-xs cursor-pointer flex items-start gap-2 transition-colors ${
                          isSelected ? 'bg-teal-50/80 font-semibold text-slate-900' : 'hover:bg-slate-50 text-slate-600'
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

            {/* Group 2: Realisasi */}
            <div className="p-3 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <BarChart3 size={14} className="text-teal-600 shrink-0" />
                  2. Realisasi (Capaian)
                </span>
                <button
                  type="button"
                  onClick={() => selectAllCategoryDocs('REALIZATION')}
                  className="text-[11px] font-medium text-teal-700 hover:underline cursor-pointer"
                >
                  Pilih Semua
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
                        className={`p-2 text-xs cursor-pointer flex items-start gap-2 transition-colors ${
                          isSelected ? 'bg-teal-50/80 font-semibold text-slate-900' : 'hover:bg-slate-50 text-slate-600'
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

            {/* Group 3: Referensi Umum */}
            <div className="p-3 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Newspaper size={14} className="text-teal-600 shrink-0" />
                  3. Referensi (Umum)
                </span>
                <button
                  type="button"
                  onClick={() => selectAllCategoryDocs('GENERAL_REFERENCE')}
                  className="text-[11px] font-medium text-teal-700 hover:underline cursor-pointer"
                >
                  Pilih Semua
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
                        className={`p-2 text-xs cursor-pointer flex items-start gap-2 transition-colors ${
                          isSelected ? 'bg-teal-50/80 font-semibold text-slate-900' : 'hover:bg-slate-50 text-slate-600'
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

        {/* Action Button Bar */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleExecuteMultiAnalysis}
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

      {/* ===================== DIAGNOSTIC RESULTS DISPLAY ===================== */}
      {(isComparing || compareResult) && (
        <div className="space-y-4">
          {/* Executive Action Toolbar */}
          <div className="flex items-center justify-between bg-white border border-slate-300 p-3 rounded-none">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Hasil Diagnostik Deviasi: {compareResult?.math?.indicatorName || 'Analisis Multidokumen'}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportPdf}
                disabled={isExportingPdf || !compareResult}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold text-xs uppercase tracking-wider rounded-none inline-flex items-center gap-1.5 border border-slate-950 shadow-xs"
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

          {/* Printable Deep-Dive Container */}
          <div id="deep-dive-analysis-container" className="space-y-6 bg-white p-4 border border-slate-300">
            {/* Kop Printable Header */}
            <div className="p-4 bg-slate-900 text-white rounded-none border-b-4 border-teal-600 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest block">
                  BADAN RISET DAN INOVASI DAERAH (BRIDA) KABUPATEN MIMIKA
                </span>
                <h2 className="text-base font-bold text-white uppercase tracking-tight">
                  NASKAH DIAGNOSTIK ANALISIS DEVIASI INDIKATOR DAERAH
                </h2>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-300 block">Tahun Anggaran 2026</span>
                <span className="text-[10px] text-teal-300 font-semibold flex items-center gap-1 justify-end">
                  <FileCheck2 size={12} /> Confirmed Factual
                </span>
              </div>
            </div>

            {/* Component 1: Deviation Summary Card */}
            {compareResult && (
              <DeviationSummaryCard
                indicatorName={compareResult.math.indicatorName}
                sector={compareResult.math.sector}
                targetText={compareResult.math.targetText}
                realizationText={compareResult.math.realizationText}
                deviationPercentage={compareResult.math.deviationPercentage}
                urgencyStatus={compareResult.math.urgencyStatus}
              />
            )}

            {/* Component 2: Causal Factor Chart */}
            {isComparing ? (
              <div className="bg-white border border-slate-300 p-12 text-center text-slate-600 space-y-2">
                <Loader2 size={28} className="animate-spin text-teal-700 mx-auto" />
                <p className="font-bold text-sm text-slate-800">
                  Menganalisis Causal Inference AI dari {selectedDocIds.length} dokumen sumber terpilih...
                </p>
              </div>
            ) : compareResult ? (
              <CausalFactorChart
                summaryText={compareResult.causal.summary}
                causalFactors={compareResult.causal.causalFactors}
              />
            ) : null}

            {/* Component 3: Recommendation List Matrix */}
            {compareResult && (
              <RecommendationList
                recommendations={compareResult.causal.recommendations}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
