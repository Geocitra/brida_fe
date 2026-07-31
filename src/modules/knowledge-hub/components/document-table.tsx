import React from 'react';
import { FileText, Eye, Download, Trash2, Clock, Database } from 'lucide-react';
import type { DocumentRecord } from '../../../services/document.service';
import { EmptyState } from '../../../components/common/empty-state.component';

interface DocumentTableProps {
  documents: DocumentRecord[];
  selectedDocIds: string[]; // State terpilih dari view induk [3]
  onSelectionChange: (selectedIds: string[]) => void; // Callback sinkronisasi [3]
  onViewDetail: (doc: DocumentRecord) => void;
  onDeleteDocument: (doc: DocumentRecord) => void;
}

export const DocumentTable: React.FC<DocumentTableProps> = ({
  documents,
  selectedDocIds,
  onSelectionChange,
  onViewDetail,
  onDeleteDocument,
}) => {

  if (documents.length === 0) {
    return (
      <EmptyState
        icon={Database}
        title="Repositori Dokumen Kosong"
        description="Belum ada dokumen laporan yang diunggah ke dalam sistem. Silakan klik tombol Unggah Dokumen Baru untuk menambahkan berkas acuan."
      />
    );
  }

  // Hanya dokumen berstatus READY yang dapat diproses dan dicentang oleh AI Engine
  const selectableDocs = documents.filter((doc) => doc.status === 'READY');
  const isAllSelectableSelected =
    selectableDocs.length > 0 &&
    selectableDocs.every((doc) => selectedDocIds.includes(doc.id));

  /**
   * Menangani toggle check/uncheck seluruh dokumen yang valid sekaligus
   */
  const handleSelectAllToggle = () => {
    const selectableIds = selectableDocs.map((d) => d.id);
    if (isAllSelectableSelected) {
      // Hapus dokumen yang dapat dipilih dari daftar seleksi saat ini
      onSelectionChange(selectedDocIds.filter((id) => !selectableIds.includes(id)));
    } else {
      // Gabungkan seleksi sebelumnya dengan semua dokumen yang valid
      onSelectionChange(Array.from(new Set([...selectedDocIds, ...selectableIds])));
    }
  };

  /**
   * Menangani toggle check/uncheck pada baris dokumen tertentu
   */
  const handleRowToggle = (docId: string) => {
    if (selectedDocIds.includes(docId)) {
      onSelectionChange(selectedDocIds.filter((id) => id !== docId));
    } else {
      onSelectionChange([...selectedDocIds, docId]);
    }
  };

  /**
   * Merender badge indikator status pemrosesan dokumen secara visual
   */
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'READY':
        return (
          <span className="inline-block text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 font-bold uppercase tracking-wider rounded-none">
            Ready
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 font-bold uppercase tracking-wider rounded-none">
            <Clock size={10} className="animate-spin text-amber-600" /> Ingesting
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-block text-[10px] bg-red-50 text-red-800 border border-red-200 px-2 py-0.5 font-bold uppercase tracking-wider rounded-none">
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-block text-[10px] bg-slate-50 text-slate-800 border border-slate-200 px-2 py-0.5 font-bold uppercase tracking-wider rounded-none">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-none overflow-hidden shadow-xs">
      <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50/50">
        <h2 className="text-base font-bold text-slate-900">Daftar Dokumen Repositori</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/70 font-roboto text-sm text-slate-900 font-bold tracking-wide">
              {/* Kolom 1: Checkbox Master Select-All */}
              <th className="py-3 px-4 w-12 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelectableSelected}
                  onChange={handleSelectAllToggle}
                  disabled={selectableDocs.length === 0}
                  className="rounded-none border-slate-300 text-teal-700 focus:ring-teal-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed w-4 h-4"
                  title="Pilih semua dokumen yang siap digunakan"
                />
              </th>
              <th className="py-3 px-4 font-bold text-slate-900">Judul Dokumen</th>
              <th className="py-3 px-4 font-bold text-slate-900">Kategori</th>
              <th className="py-3 px-4 font-bold text-slate-900">Jumlah Halaman &amp; Chunks</th>
              <th className="py-3 px-4 font-bold text-slate-900">Status</th>
              <th className="py-3 px-4 font-bold text-slate-900 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {documents.map((doc) => {
              const isSelected = selectedDocIds.includes(doc.id);
              const isSelectable = doc.status === 'READY';

              return (
                <tr
                  key={doc.id}
                  className={`transition-colors font-roboto ${isSelected ? 'bg-teal-50/30 font-semibold' : 'hover:bg-slate-50/80'
                    } ${!isSelectable ? 'opacity-65 bg-slate-50/30' : ''}`}
                >
                  {/* Kolom Checkbox Row */}
                  <td className="py-3 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleRowToggle(doc.id)}
                      disabled={!isSelectable}
                      className="rounded-none border-slate-300 text-teal-700 focus:ring-teal-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed w-4 h-4"
                      title={
                        isSelectable
                          ? 'Pilih dokumen ini'
                          : 'Dokumen sedang diproses atau gagal dianalisis oleh AI'
                      }
                    />
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-teal-600 shrink-0" />
                      <span className="text-slate-800 text-xs truncate max-w-sm" title={doc.title}>
                        {doc.title}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-800 text-xs font-normal">
                    {doc.metadata?.category || 'General Report'}
                  </td>
                  <td className="py-3 px-4 text-slate-800 text-xs font-normal">
                    {doc.metadata?.pageCount || 0} Hal / {doc.chunkCount || 0} Chunks
                  </td>
                  <td className="py-3 px-4 text-xs">
                    {renderStatusBadge(doc.status)}
                  </td>

                  <td className="py-3 px-4 text-center">
                    <div className="inline-flex items-center justify-center gap-1">
                      {/* Tombol Detail */}
                      <button
                        onClick={() => onViewDetail(doc)}
                        className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Lihat Detail & Pratinjau Dokumen"
                      >
                        <Eye size={16} />
                      </button>

                      {/* Tombol Unduh */}
                      {doc.fileUrl && (
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-slate-100 transition-colors"
                          title="Unduh Berkas Asli"
                        >
                          <Download size={16} />
                        </a>
                      )}

                      {/* Tombol Hapus */}
                      <button
                        onClick={() => onDeleteDocument(doc)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Hapus Dokumen"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
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