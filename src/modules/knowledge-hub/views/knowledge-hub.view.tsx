import React, { useState, useEffect } from 'react';
import { UploadDropzone } from '../components/upload-dropzone';
import { DocumentTable } from '../components/document-table';
import { DocumentDetailModal } from '../components/document-detail-modal.component';
import { DocumentService, type DocumentRecord } from '../../../services/document.service';
import { MOCK_DATA } from '../../../services/mock-data.service';
import { Loader2, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';

export const KnowledgeHubView: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUsingMock, setIsUsingMock] = useState(false);
  const [detailDoc, setDetailDoc] = useState<DocumentRecord | null>(null);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<DocumentRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadDocuments = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const docs = await DocumentService.listDocuments();
      setDocuments(docs);
      setIsUsingMock(false);
    } catch {
      // Fallback ke data contoh (mock) apabila backend tidak terhubung
      setDocuments(MOCK_DATA.documents);
      setIsUsingMock(true);
      setLoadError('Backend tidak terhubung — menampilkan data contoh.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleUploadSuccess = (newDoc: DocumentRecord) => {
    setDocuments((prev) => [newDoc, ...prev]);
    setIsUsingMock(false);
    setLoadError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmDoc) return;
    setIsDeleting(true);
    try {
      if (!isUsingMock) {
        await DocumentService.deleteDocument(deleteConfirmDoc.id);
      }
      setDocuments((prev) => prev.filter((d) => d.id !== deleteConfirmDoc.id));
      setDeleteConfirmDoc(null);
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus dokumen.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col w-full min-h-full pb-12 bg-white">
      {/* 
        1. COMMAND STRIP HEADER
        Menyatukan identitas halaman di kiri dan Live Metadata Status DB di kanan 
        dalam satu baris horizontal solid berbatas slate tipis.
      */}
      <div className="w-full bg-white border-b border-slate-300 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Sisi Kiri: Breadcrumb & Judul Halaman */}
        <div className="flex flex-col">
          <span className="text-[10px] font-bold tracking-widest text-teal-700 uppercase mb-1">
            Home / Knowledge Hub
          </span>
          <h1 className="text-sm font-bold uppercase text-slate-900 tracking-tight">
            Knowledge Warehouse & Ingestion Engine
          </h1>
        </div>

        {/* Sisi Kanan: Live Database Stats Grid */}
        <div className="flex items-stretch divide-x divide-slate-200 md:border-l md:border-slate-200 md:pl-6">
          <div className="px-4 py-1 flex flex-col justify-center">
            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
              Vektor Status
            </span>
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              pgvector Active
            </span>
          </div>
          <div className="px-4 py-1 flex flex-col justify-center">
            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
              Arsip Terindeks
            </span>
            <span className="text-xs font-bold text-slate-800 mt-0.5">
              {isLoading ? '-' : `${documents.length} Dokumen`}
            </span>
          </div>
          <div className="px-4 py-1 flex flex-col justify-center">
            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
              Ingestion Model
            </span>
            <span className="text-xs font-bold text-teal-700 mt-0.5">
              Gemini Flash v1.5
            </span>
          </div>
        </div>
      </div>

      {/* 
        2. STATUS BANNER (CONDITIONAL STRIP)
        Tampil mepet lurus di bawah header apabila terjadi kendala koneksi backend.
      */}
      {loadError && (
        <div className="flex items-center justify-between bg-amber-50/80 border-b border-amber-300 px-6 py-3.5 text-amber-900 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0 text-amber-600" />
            <span>{loadError}</span>
            {isUsingMock && (
              <span className="ml-1.5 px-2 py-0.5 bg-amber-200 text-amber-900 font-bold text-[9px] uppercase tracking-wider">
                Mode Demo
              </span>
            )}
          </div>
          <button
            onClick={loadDocuments}
            className="flex items-center gap-1.5 text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
          >
            <RefreshCw size={12} />
            Muat Ulang Koneksi
          </button>
        </div>
      )}

      {/* 
        3. UPLOAD DROPZONE
        Komponen ini akan menempel langsung di bawah header/status banner.
        Styling internal upload-dropzone akan ditata tanpa menyisakan border luar.
      */}
      <UploadDropzone onUploadSuccess={handleUploadSuccess} />

      {/* 
        4. DOCUMENT TABLE WAREHOUSE
        Tampil rapat penuh di bawah dropzone.
      */}
      {isLoading ? (
        <div className="flex items-center gap-2.5 py-16 justify-center text-slate-600 border-t border-slate-300 bg-slate-50/50">
          <Loader2 size={18} className="animate-spin text-teal-700" />
          <span className="text-xs font-bold uppercase tracking-wider">Menghubungkan dengan Vektor database...</span>
        </div>
      ) : (
        <DocumentTable
          documents={documents}
          onViewDetail={(doc) => setDetailDoc(doc)}
          onDeleteDocument={(doc) => setDeleteConfirmDoc(doc)}
        />
      )}

      {/* 
        5. DETAIL VISUALIZER MODAL
        Modal detail dokumen (menyajikan pratinjau teks/Word/PDF & chunks).
      */}
      <DocumentDetailModal
        document={detailDoc}
        onClose={() => setDetailDoc(null)}
      />

      {/* 
        6. CONFIRM DELETE MODAL
        Modal dialog persetujuan penghapusan arsip dari database.
      */}
      {deleteConfirmDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 rounded-none">
          <div className="bg-white border-2 border-slate-900 shadow-2xl w-full max-w-md p-6 space-y-4 rounded-none">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2 bg-red-50 border border-red-200">
                <Trash2 size={18} />
              </div>
              <h3 className="text-sm font-bold uppercase text-slate-900 tracking-wide">Konfirmasi Hapus Dokumen</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              Apakah Anda yakin ingin menghapus dokumen <strong className="text-slate-900">"{deleteConfirmDoc.title}"</strong> secara permanen?
              Tindakan destruktif ini akan menghapus seluruh data vektor chunks dari penyimpanan PostgreSQL.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmDoc(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer border border-slate-300"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer border border-red-700"
              >
                {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                <span>{isDeleting ? 'Memproses...' : 'Ya, Hapus Permanen'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};