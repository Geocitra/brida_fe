import React from 'react';
import { FileText, CheckCircle2, Clock, AlertTriangle, ArrowUpRight } from 'lucide-react';
import type { DocumentRecord } from '../../../services/document.service';

interface DocumentTableProps {
  documents: DocumentRecord[];
  selectedDocumentId: string | null;
  onSelectDocument: (doc: DocumentRecord) => void;
}

export const DocumentTable: React.FC<DocumentTableProps> = ({
  documents,
  selectedDocumentId,
  onSelectDocument,
}) => {
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'READY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-roboto font-semibold rounded-none">
            <CheckCircle2 size={12} className="text-emerald-600" /> Ready
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-roboto font-semibold rounded-none">
            <Clock size={12} className="animate-spin text-amber-600" /> Processing
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-50 border border-red-200 text-red-700 text-xs font-roboto font-semibold rounded-none">
            <AlertTriangle size={12} className="text-red-600" /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 border border-slate-300 text-slate-600 text-xs font-roboto font-medium rounded-none">
            Pending
          </span>
        );
    }
  };

  if (documents.length === 0) {
    return (
      <div className="bg-white border border-slate-200 p-8 text-center rounded-none shadow-sm">
        <p className="text-body text-slate-500">Belum ada dokumen laporan yang diunggah ke dalam sistem.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-none overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <h2 className="text-h2 text-slate-800">Arsip Dokumen Pengetahuan (Knowledge Hub)</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-roboto text-xs uppercase tracking-wider font-semibold">
              <th className="py-3 px-4">Judul Dokumen</th>
              <th className="py-3 px-4">Kategori</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Halaman / Chunks</th>
              <th className="py-3 px-4 text-right">Aksi Pilihan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {documents.map((doc) => {
              const isSelected = selectedDocumentId === doc.id;
              return (
                <tr 
                  key={doc.id} 
                  className={`transition-colors hover:bg-slate-50 ${isSelected ? 'bg-teal-50/60 border-l-4 border-l-teal-600' : ''}`}
                >
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-teal-600 shrink-0" />
                      <span className="font-roboto font-semibold text-slate-900 text-sm">{doc.title}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 text-sm font-medium">
                    {doc.metadata?.category || 'General Report'}
                  </td>
                  <td className="py-3.5 px-4">
                    {renderStatusBadge(doc.status)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 text-sm font-medium">
                    {doc.metadata?.pageCount || 0} Hal / {doc.chunkCount || 0} Chunks
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onSelectDocument(doc)}
                      className={`
                        px-3 py-1.5 text-xs font-roboto font-semibold rounded-none inline-flex items-center gap-1 transition-colors shadow-xs
                        ${isSelected 
                          ? 'bg-teal-600 text-white border border-teal-700' 
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'}
                      `}
                    >
                      <span>{isSelected ? 'Dokumen Aktif' : 'Pilih Sumber'}</span>
                      <ArrowUpRight size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
