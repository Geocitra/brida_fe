import React from 'react';
import { FileText, Eye, Download, Trash2 } from 'lucide-react';
import type { DocumentRecord } from '../../../services/document.service';

interface DocumentTableProps {
  documents: DocumentRecord[];
  onViewDetail: (doc: DocumentRecord) => void;
  onDeleteDocument: (doc: DocumentRecord) => void;
}

export const DocumentTable: React.FC<DocumentTableProps> = ({
  documents,
  onViewDetail,
  onDeleteDocument,
}) => {


  if (documents.length === 0) {
    return (
      <div className="bg-white border border-slate-200 p-8 text-center rounded-none shadow-sm">
        <p className="text-body text-slate-500">Belum ada dokumen laporan yang diunggah ke dalam sistem.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-none overflow-hidden shadow-xs">
      <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50/50">
        <h2 className="text-base font-bold text-slate-900">Daftar Dokumen</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/70 font-roboto text-sm text-slate-900 font-bold tracking-wide">
              <th className="py-3 px-4 font-bold text-slate-900">Judul Dokumen</th>
              <th className="py-3 px-4 font-bold text-slate-900">Kategori</th>
              <th className="py-3 px-4 font-bold text-slate-900">Jumlah Halaman &amp; Chunks</th>
              <th className="py-3 px-4 font-bold text-slate-900 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {documents.map((doc) => {
              return (
                <tr 
                  key={doc.id} 
                  className="transition-colors hover:bg-slate-50/80"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-teal-600 shrink-0" />
                      <span className="font-roboto font-medium text-slate-800 text-sm">{doc.title}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-xs font-normal">
                    {doc.metadata?.category || 'General Report'}
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-xs font-normal">
                    {doc.metadata?.pageCount || 0} Hal / {doc.chunkCount || 0} Chunks
                  </td>

                  <td className="py-3 px-4 text-center">
                    <div className="inline-flex items-center justify-center gap-1">
                      {/* Tombol Detail (Icon Only) */}
                      <button
                        onClick={() => onViewDetail(doc)}
                        className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Lihat Detail & Pratinjau Dokumen"
                      >
                        <Eye size={16} />
                      </button>

                      {/* Tombol Unduh (Icon Only) */}
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

                      {/* Tombol Hapus (Icon Only) */}
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


