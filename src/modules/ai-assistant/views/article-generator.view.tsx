import React, { useState } from 'react';
import { GeneratorPanel } from '../components/generator-panel.component';
import { MOCK_DATA } from '../../../services/mock-data.service';
import { MessageSquareCode, Sparkles } from 'lucide-react';

interface ArticleGeneratorViewProps {
  initialPrompt?: string;
  onNavigateToQa: () => void;
}

export const ArticleGeneratorView: React.FC<ArticleGeneratorViewProps> = ({ 
  initialPrompt,
  onNavigateToQa 
}) => {
  const [documents] = useState(MOCK_DATA.documents);
  const [selectedDocId, setSelectedDocId] = useState<string | null>('doc-001');
  const selectedDoc = documents.find((d) => d.id === selectedDocId);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-h1 mb-1">Article Generator & Public Drafting (CoT)</h1>
          <p className="text-body">
            Fasilitas khusus untuk perakitan draf artikel publikasi dan rilis media otomatis berbasis rantai penalaran dua tahap.
          </p>
        </div>

        <button
          onClick={onNavigateToQa}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-wider rounded-none inline-flex items-center gap-2 border border-slate-900 shadow-xs shrink-0"
        >
          <MessageSquareCode size={14} />
          <span>Kembali ke Q&A Chat</span>
        </button>
      </div>

      {initialPrompt && (
        <div className="p-4 bg-teal-50 border border-teal-300 rounded-none shadow-xs flex items-center gap-3 text-teal-900 text-xs font-semibold">
          <Sparkles size={18} className="text-teal-700 shrink-0" />
          <div>
            <strong className="block text-teal-800 uppercase tracking-wider font-bold">Dialihkan dari Prompt Q&A:</strong>
            <span className="italic">"{initialPrompt}"</span>
          </div>
        </div>
      )}

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
          CoT Chain-of-Thought Engine Active
        </span>
      </div>

      {/* Main Generator Panel */}
      <GeneratorPanel 
        selectedDocumentId={selectedDocId} 
        documentTitle={selectedDoc?.title}
      />
    </div>
  );
};
