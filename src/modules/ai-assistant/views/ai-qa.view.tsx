import React, { useState, useEffect } from 'react';
import { ChatPanel } from '../components/chat-panel.component';
import { DocumentService, type DocumentRecord } from '../../../services/document.service';
import { MOCK_DATA } from '../../../services/mock-data.service';
import { ArrowRight, PenTool, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

interface AiQaViewProps {
  onNavigateToGenerator: (initialPrompt?: string) => void;
}

export const AiQaView: React.FC<AiQaViewProps> = ({ onNavigateToGenerator }) => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUsingMock, setIsUsingMock] = useState(false);

  const loadDocuments = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const docs = await DocumentService.listDocuments();
      setDocuments(docs);
      setIsUsingMock(false);
      if (docs.length > 0) {
        setSelectedDocId(docs[0].id);
      }
    } catch {
      // Fallback to mock data
      setDocuments(MOCK_DATA.documents);
      setIsUsingMock(true);
      setLoadError('Backend tidak terhubung — menampilkan daftar dokumen contoh.');
      if (MOCK_DATA.documents.length > 0) {
        setSelectedDocId(MOCK_DATA.documents[0].id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const selectedDoc = documents.find((d) => d.id === selectedDocId);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-h1 mb-1">AI Request (Asisten Obrolan Q&amp;A)</h1>
          <p className="text-body">
            Fasilitas tanya-jawab interaktif murni untuk mengeksplorasi isi dokumen investigasi dan analisis kebijakan. AI hanya menjawab berdasarkan dokumen yang diunggah.
          </p>
        </div>

        <button
          onClick={() => onNavigateToGenerator()}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs uppercase tracking-wider rounded-none inline-flex items-center gap-2 border border-teal-700 shadow-xs shrink-0"
        >
          <PenTool size={14} />
          <span>Buat Artikel Publikasi</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* BE connection error banner */}
      {loadError && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-300 px-4 py-3 text-amber-900 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0 text-amber-600" />
            <span>{loadError}</span>
            {isUsingMock && (
              <span className="ml-1 px-2 py-0.5 bg-amber-200 text-amber-900 font-bold rounded-none text-[10px] uppercase tracking-wider">
                Mode Demo
              </span>
            )}
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

      {/* Active Document Selector Bar */}
      {isLoading ? (
        <div className="flex items-center gap-3 py-6 justify-center text-slate-600">
          <Loader2 size={18} className="animate-spin text-teal-700" />
          <span className="text-sm font-bold">Memuat daftar dokumen...</span>
        </div>
      ) : (
        <div className="bg-white border border-slate-300 p-4 rounded-none shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Pilih Dokumen Sumber:
            </span>
            <select
              value={selectedDocId || ''}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="bg-slate-50 border border-slate-400 px-3 py-1.5 text-sm font-semibold text-slate-900 rounded-none focus:outline-none focus:border-teal-600"
            >
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.title} ({doc.metadata?.category})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold px-2.5 py-1 border rounded-none ${
              isUsingMock
                ? 'text-amber-800 bg-amber-50 border-amber-200'
                : 'text-teal-800 bg-teal-50 border-teal-200'
            }`}>
              {selectedDoc?.chunkCount || 0} Chunks Terindeks
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-none uppercase tracking-wider ${
              isUsingMock
                ? 'text-amber-800 bg-amber-100 border border-amber-300'
                : 'text-emerald-800 bg-emerald-50 border border-emerald-200'
            }`}>
              {isUsingMock ? 'Demo' : 'Live BE'}
            </span>
          </div>
        </div>
      )}

      {/* Main Q&A Chat Panel */}
      {!isLoading && (
        <ChatPanel 
          selectedDocumentId={selectedDocId} 
          documentTitle={selectedDoc?.title}
          onArticleIntentDetected={(promptText) => onNavigateToGenerator(promptText)}
        />
      )}
    </div>
  );
};
