import React, { useState, useEffect } from 'react';
import { UploadDropzone } from '../components/upload-dropzone';
import { DocumentTable } from '../components/document-table';
import { DocumentService, type DocumentRecord } from '../../../services/document.service';
import { MOCK_DATA } from '../../../services/mock-data.service';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export const KnowledgeHubView: React.FC = () => {
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
      if (docs.length > 0 && !selectedDocId) {
        setSelectedDocId(docs[0].id);
      }
    } catch {
      // Fallback to mock data if BE is not running
      setDocuments(MOCK_DATA.documents);
      setIsUsingMock(true);
      setLoadError('Backend tidak terhubung — menampilkan data contoh.');
      if (MOCK_DATA.documents.length > 0 && !selectedDocId) {
        setSelectedDocId(MOCK_DATA.documents[0].id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleUploadSuccess = (newDoc: DocumentRecord) => {
    setDocuments((prev) => [newDoc, ...prev]);
    setSelectedDocId(newDoc.id);
    setIsUsingMock(false);
    setLoadError(null);
  };

  const handleSelectDocument = (doc: DocumentRecord) => {
    setSelectedDocId(doc.id);
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-h1 mb-1">Manajer Dokumen &amp; Knowledge Hub</h1>
        <p className="text-body">
          Unggah laporan investigasi atau dokumen kebijakan statis baru. Sistem akan otomatis memvalidasi, membersihkan teks, melakukan pemotongan semantik, dan menghasilkan embeddings vektor untuk analisis AI eksekutif.
        </p>
      </div>

      {/* Status Banner */}
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

      {/* Upload Dropzone */}
      <UploadDropzone onUploadSuccess={handleUploadSuccess} />

      {/* Document Table */}
      {isLoading ? (
        <div className="flex items-center gap-3 py-12 justify-center text-slate-600">
          <Loader2 size={20} className="animate-spin text-teal-700" />
          <span className="text-sm font-bold">Memuat daftar dokumen dari server...</span>
        </div>
      ) : (
        <DocumentTable 
          documents={documents}
          selectedDocumentId={selectedDocId}
          onSelectDocument={handleSelectDocument}
        />
      )}
    </div>
  );
};
