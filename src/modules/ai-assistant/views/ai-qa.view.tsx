import React, { useState, useEffect } from 'react';
import { ChatPanel } from '../components/chat-panel.component';
import { DocumentService } from '../../../services/document.service';
import type { DocumentRecord } from '../../../services/document.service';
import { CategorizedDocumentSelector } from '../../../components/common/categorized-document-selector.component';
import {
  ArrowRight,
  PenTool,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface AiQaViewProps {
  onNavigateToGenerator: (initialPrompt?: string) => void;
}

export const AiQaView: React.FC<AiQaViewProps> = ({ onNavigateToGenerator }) => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const loadDocuments = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const docs = await DocumentService.listDocuments();
      setDocuments(docs || []);
      if (docs && docs.length > 0 && selectedDocIds.length === 0) {
        setSelectedDocIds([docs[0].id]);
      }
    } catch (err: any) {
      setDocuments([]);
      setLoadError(`Gagal memuat dokumen dari database: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const selectedDocs = documents.filter((d) => selectedDocIds.includes(d.id));

  return (
    <div className="flex flex-col w-full bg-slate-100/70 p-6 space-y-6 font-roboto">
      {/* SECTION 1. HERO COMMAND STRIP HEADER */}
      <div className="w-full bg-white border border-slate-300 px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-none shadow-2xs">
        <div className="flex flex-col">
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            AI Chat Assistant
          </h1>
          <p className="text-xs text-slate-600 font-normal mt-0.5">
            Tanyakan konteks atau analisis isi dokumen acuan secara langsung menggunakan model LLM terintegrasi.
          </p>
        </div>

        <button
          onClick={() => onNavigateToGenerator()}
          className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold uppercase tracking-wider rounded-none inline-flex items-center gap-2 transition-all cursor-pointer shrink-0 border border-teal-800 shadow-xs"
        >
          <PenTool size={14} />
          <span>Buat Artikel Publikasi</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Connection error banner if any */}
      {loadError && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-300 px-4 py-3 text-amber-900 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0 text-amber-600" />
            <span>{loadError}</span>
          </div>
          <button
            onClick={loadDocuments}
            className="flex items-center gap-1 text-amber-800 hover:text-amber-900 font-bold underline"
          >
            <RefreshCw size={12} />
            Coba Lagi
          </button>
        </div>
      )}

      {/* Categorized Document Selector Hub */}
      <CategorizedDocumentSelector
        documents={documents}
        selectedDocIds={selectedDocIds}
        onToggleDoc={(docId) => {
          setSelectedDocIds((prev) =>
            prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
          );
        }}
        onSelectAll={() => setSelectedDocIds(documents.map((d) => d.id))}
        onClearAll={() => setSelectedDocIds([])}
        isLoading={isLoading}
        isLocked={isAiProcessing}
        title="Pilih Dokumen"
      />

      {/* Main Q&A Chat Panel */}
      {!isLoading && (
        <ChatPanel
          selectedDocumentIds={selectedDocIds}
          documentTitles={selectedDocs.map((d) => d.title)}
          onArticleIntentDetected={(promptText) => onNavigateToGenerator(promptText)}
          onLoadingChange={(loading) => setIsAiProcessing(loading)}
        />
      )}
    </div>
  );
};

export default AiQaView;
