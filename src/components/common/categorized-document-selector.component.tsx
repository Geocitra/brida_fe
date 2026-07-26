import React, { useState } from 'react';
import type { DocumentRecord } from '../../services/document.service';
import {
  Target,
  BarChart3,
  Newspaper,
  CheckSquare,
  Square,
  Search,
  X,
  Loader2,
  AlertCircle,
  Plus,
  FileText,
} from 'lucide-react';

interface CategorizedDocumentSelectorProps {
  documents: DocumentRecord[];
  selectedDocIds: string[];
  onToggleDoc: (docId: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  isLoading?: boolean;
  onUploadNew?: () => void;
  title?: string;
}

export const CategorizedDocumentSelector: React.FC<CategorizedDocumentSelectorProps> = ({
  documents,
  selectedDocIds,
  onToggleDoc,
  onSelectAll,
  onClearAll,
  isLoading = false,
  onUploadNew,
  title = 'Pilih Dokumen Acuan Berdasarkan Kategori',
}) => {
  const [docSearchQuery, setDocSearchQuery] = useState('');

  // Filter documents by live text search
  const filteredDocs = documents.filter((doc) =>
    doc.title.toLowerCase().includes(docSearchQuery.toLowerCase())
  );

  // Categorize documents into 3 columns
  const baselineDocs = filteredDocs.filter(
    (d) =>
      d.metadata?.docType === 'BASELINE' ||
      d.metadata?.category?.toLowerCase().includes('target') ||
      d.metadata?.category?.toLowerCase().includes('rpjmd') ||
      d.metadata?.category?.toLowerCase().includes('renstra')
  );

  const realizationDocs = filteredDocs.filter(
    (d) =>
      d.metadata?.docType === 'REALIZATION' ||
      d.metadata?.category?.toLowerCase().includes('realisasi') ||
      d.metadata?.category?.toLowerCase().includes('lkpj') ||
      d.metadata?.category?.toLowerCase().includes('lkh')
  );

  // General or uncategorized docs fall into reference column if not matched above
  const referenceDocs = filteredDocs.filter(
    (d) => !baselineDocs.includes(d) && !realizationDocs.includes(d)
  );

  const selectCategoryGroup = (groupDocs: DocumentRecord[]) => {
    groupDocs.forEach((d) => {
      if (!selectedDocIds.includes(d.id)) {
        onToggleDoc(d.id);
      }
    });
  };

  return (
    <div className="bg-white border border-slate-300 p-5 rounded-none shadow-2xs space-y-4 font-roboto">
      {/* Header Toolbar & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-teal-700 shrink-0" />
          <h2 className="text-sm font-bold text-slate-900 tracking-wide uppercase">
            {title} ({selectedDocIds.length} Dipilih)
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Filter Search Bar */}
          <div className="relative w-full sm:w-56">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={docSearchQuery}
              onChange={(e) => setDocSearchQuery(e.target.value)}
              placeholder="Cari nama dokumen..."
              className="w-full bg-slate-50 border border-slate-300 pl-8 pr-7 py-1 text-xs text-slate-900 focus:outline-none focus:border-teal-700 rounded-none font-medium"
            />
            {docSearchQuery && (
              <button
                type="button"
                onClick={() => setDocSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                title="Hapus filter pencarian"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onSelectAll}
            className="text-xs font-bold text-teal-700 hover:underline cursor-pointer"
          >
            Pilih Semua
          </button>
          <span className="text-slate-300 text-xs">&bull;</span>
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-medium text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
          >
            Kosongkan
          </button>

          {onUploadNew && (
            <button
              type="button"
              onClick={onUploadNew}
              className="px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold uppercase rounded-none inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus size={13} />
              <span>+ Unggah</span>
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-8 justify-center text-slate-600 text-xs font-bold">
          <Loader2 size={18} className="animate-spin text-teal-700" />
          <span>Memuat daftar dokumen dari database...</span>
        </div>
      ) : documents.length === 0 ? (
        <div className="p-6 bg-slate-50 border border-slate-200 text-center space-y-2">
          <AlertCircle size={24} className="mx-auto text-slate-400" />
          <p className="text-xs font-semibold text-slate-700">
            Belum ada dokumen terindeks di Knowledge Hub database.
          </p>
          {onUploadNew && (
            <button
              type="button"
              onClick={onUploadNew}
              className="px-3 py-1.5 bg-teal-700 text-white text-xs font-bold uppercase rounded-none inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={13} />
              <span>Unggah Dokumen Acuan Pertama</span>
            </button>
          )}
        </div>
      ) : (
        /* Categorized 3-Column Grid (Compact with Max Height Scrollable Columns) */
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 border-y border-slate-200 py-1 font-roboto">
          {/* Group 1: Target (Baseline) */}
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <span className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                <Target size={14} className="text-teal-700 shrink-0" />
                <span>1. Target (Baseline)</span>
                <span className="text-[10px] text-slate-500 font-normal">({baselineDocs.length})</span>
              </span>
              {baselineDocs.length > 0 && (
                <button
                  type="button"
                  onClick={() => selectCategoryGroup(baselineDocs)}
                  className="text-[11px] font-semibold text-teal-700 hover:underline cursor-pointer"
                >
                  Pilih Semua
                </button>
              )}
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {baselineDocs.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-1">Tidak ada dokumen Target Baseline.</p>
              ) : (
                baselineDocs.map((doc) => {
                  const isSelected = selectedDocIds.includes(doc.id);
                  return (
                    <div
                      key={doc.id}
                      onClick={() => onToggleDoc(doc.id)}
                      className={`p-2 text-xs cursor-pointer flex items-start gap-2 transition-colors rounded-none ${
                        isSelected
                          ? 'bg-teal-50 font-bold text-teal-950 border-l-2 border-teal-700'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {isSelected ? (
                        <CheckSquare size={14} className="text-teal-700 shrink-0 mt-0.5" />
                      ) : (
                        <Square size={14} className="text-slate-400 shrink-0 mt-0.5" />
                      )}
                      <span className="truncate">{doc.title}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Group 2: Realisasi (Capaian) */}
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <span className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                <BarChart3 size={14} className="text-teal-700 shrink-0" />
                <span>2. Realisasi (Capaian)</span>
                <span className="text-[10px] text-slate-500 font-normal">({realizationDocs.length})</span>
              </span>
              {realizationDocs.length > 0 && (
                <button
                  type="button"
                  onClick={() => selectCategoryGroup(realizationDocs)}
                  className="text-[11px] font-semibold text-teal-700 hover:underline cursor-pointer"
                >
                  Pilih Semua
                </button>
              )}
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {realizationDocs.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-1">Tidak ada dokumen Realisasi.</p>
              ) : (
                realizationDocs.map((doc) => {
                  const isSelected = selectedDocIds.includes(doc.id);
                  return (
                    <div
                      key={doc.id}
                      onClick={() => onToggleDoc(doc.id)}
                      className={`p-2 text-xs cursor-pointer flex items-start gap-2 transition-colors rounded-none ${
                        isSelected
                          ? 'bg-teal-50 font-bold text-teal-950 border-l-2 border-teal-700'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {isSelected ? (
                        <CheckSquare size={14} className="text-teal-700 shrink-0 mt-0.5" />
                      ) : (
                        <Square size={14} className="text-slate-400 shrink-0 mt-0.5" />
                      )}
                      <span className="truncate">{doc.title}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Group 3: Referensi & Dokumen Lainnya */}
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <span className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                <Newspaper size={14} className="text-teal-700 shrink-0" />
                <span>3. Referensi / Acuan Lain</span>
                <span className="text-[10px] text-slate-500 font-normal">({referenceDocs.length})</span>
              </span>
              {referenceDocs.length > 0 && (
                <button
                  type="button"
                  onClick={() => selectCategoryGroup(referenceDocs)}
                  className="text-[11px] font-semibold text-teal-700 hover:underline cursor-pointer"
                >
                  Pilih Semua
                </button>
              )}
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {referenceDocs.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-1">Tidak ada dokumen Referensi Lain.</p>
              ) : (
                referenceDocs.map((doc) => {
                  const isSelected = selectedDocIds.includes(doc.id);
                  return (
                    <div
                      key={doc.id}
                      onClick={() => onToggleDoc(doc.id)}
                      className={`p-2 text-xs cursor-pointer flex items-start gap-2 transition-colors rounded-none ${
                        isSelected
                          ? 'bg-teal-50 font-bold text-teal-950 border-l-2 border-teal-700'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {isSelected ? (
                        <CheckSquare size={14} className="text-teal-700 shrink-0 mt-0.5" />
                      ) : (
                        <Square size={14} className="text-slate-400 shrink-0 mt-0.5" />
                      )}
                      <span className="truncate">{doc.title}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
