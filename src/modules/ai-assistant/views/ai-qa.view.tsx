import React, { useState, useEffect, useRef } from 'react';
import { ChatPanel } from '../components/chat-panel.component';
import { DocumentService } from '../../../services/document.service';
import type { DocumentRecord } from '../../../services/document.service';
import {
  ArrowRight,
  PenTool,
  Loader2,
  AlertCircle,
  RefreshCw,
  Search,
  ChevronDown,
  FileText,
  Check,
} from 'lucide-react';

interface AiQaViewProps {
  onNavigateToGenerator: (initialPrompt?: string) => void;
}

export const AiQaView: React.FC<AiQaViewProps> = ({ onNavigateToGenerator }) => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Combobox Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadDocuments = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const docs = await DocumentService.listDocuments();
      setDocuments(docs || []);
      if (docs && docs.length > 0 && !selectedDocId) {
        setSelectedDocId(docs[0].id);
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

  const selectedDoc = documents.find((d) => d.id === selectedDocId);

  const filteredDocuments = documents.filter((doc) => {
    const q = searchQuery.toLowerCase();
    return doc.title.toLowerCase().includes(q) || (doc.metadata?.category || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-h1 mb-1">AI Request (Asisten Obrolan Q&amp;A)</h1>
          <p className="text-body">
            Fasilitas tanya-jawab interaktif murni berbasis dokumen investigasi dan analisis kebijakan. Seluruh riwayat obrolan tersimpan otomatis di database PostgreSQL.
          </p>
        </div>

        <button
          onClick={() => onNavigateToGenerator()}
          className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs uppercase tracking-wider rounded-none inline-flex items-center gap-2 border border-teal-800 shadow-xs shrink-0"
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

      {/* Active Document Combobox Selector Bar */}
      {isLoading ? (
        <div className="flex items-center gap-3 py-6 justify-center text-slate-600">
          <Loader2 size={18} className="animate-spin text-teal-700" />
          <span className="text-sm font-bold">Memuat daftar dokumen dari database...</span>
        </div>
      ) : (
        <div className="bg-white border border-slate-300 p-4 rounded-none shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 relative" ref={dropdownRef}>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Pilih Dokumen Sumber Q&A (Searchable Combobox)
            </label>

            <div
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-300 p-2 cursor-pointer flex items-center justify-between gap-2 rounded-none min-h-[38px]"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileText size={15} className="text-teal-700 shrink-0" />
                {selectedDoc ? (
                  <span className="text-xs text-slate-900 font-bold truncate">
                    {selectedDoc.title} ({selectedDoc.metadata?.category || 'Umum'})
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 font-medium">-- Pilih dokumen acuan Q&A --</span>
                )}
              </div>
              <ChevronDown size={16} className={`text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </div>

            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 shadow-xl z-40 max-h-64 overflow-y-auto rounded-none p-3 space-y-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari judul dokumen atau kategori..."
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-300 text-xs rounded-none focus:outline-none focus:border-teal-700"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {filteredDocuments.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-500">
                    Tidak ada dokumen yang cocok.
                  </div>
                ) : (
                  <div className="space-y-1 max-h-44 overflow-y-auto">
                    {filteredDocuments.map((doc) => {
                      const isSelected = selectedDocId === doc.id;
                      return (
                        <div
                          key={doc.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDocId(doc.id);
                            setIsDropdownOpen(false);
                          }}
                          className={`p-2 border cursor-pointer transition-colors flex items-center justify-between text-xs rounded-none ${
                            isSelected
                              ? 'bg-teal-50 border-teal-600 text-teal-900 font-bold'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                        >
                          <div className="truncate min-w-0">{doc.title}</div>
                          {isSelected && <Check size={14} className="text-teal-700 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0 pt-2 sm:pt-4">
            <span className="text-xs font-bold px-2.5 py-1 border text-teal-800 bg-teal-50 border-teal-200 rounded-none">
              {selectedDoc?.chunkCount || 0} Chunks Terindeks
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-none uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200">
              Live DB
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

export default AiQaView;
