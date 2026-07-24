import React, { useState } from 'react';
import { ChatPanel } from '../components/chat-panel.component';
import { MOCK_DATA } from '../../../services/mock-data.service';
import { ArrowRight, PenTool } from 'lucide-react';

interface AiQaViewProps {
  onNavigateToGenerator: (initialPrompt?: string) => void;
}

export const AiQaView: React.FC<AiQaViewProps> = ({ onNavigateToGenerator }) => {
  const [documents] = useState(MOCK_DATA.documents);
  const [selectedDocId, setSelectedDocId] = useState<string | null>('doc-001');
  const selectedDoc = documents.find((d) => d.id === selectedDocId);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-h1 mb-1">AI Request (Asisten Obrolan Q&A)</h1>
          <p className="text-body">
            Fasilitas tanya-jawab interaktif murni untuk mengeksplorasi isi dokumen investigasi dan analisis kebijakan.
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

      {/* Active Document Selector Bar */}
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
        <span className="text-xs text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 font-bold rounded-none">
          {selectedDoc?.chunkCount || 0} Chunks Terindeks
        </span>
      </div>

      {/* Main Q&A Chat Panel */}
      <ChatPanel 
        selectedDocumentId={selectedDocId} 
        documentTitle={selectedDoc?.title}
        onArticleIntentDetected={(promptText) => onNavigateToGenerator(promptText)}
      />
    </div>
  );
};
