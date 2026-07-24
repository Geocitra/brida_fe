import React, { useState } from 'react';
import { UploadDropzone } from '../components/upload-dropzone';
import { DocumentTable } from '../components/document-table';
import { MOCK_DATA } from '../../../services/mock-data.service';
import type { DocumentRecord } from '../../../services/document.service';

export const KnowledgeHubView: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentRecord[]>(MOCK_DATA.documents);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(documents[0]?.id || null);

  const handleUploadSuccess = (newDoc: DocumentRecord) => {
    setDocuments((prev) => [newDoc, ...prev]);
    setSelectedDocId(newDoc.id);
  };

  const handleSelectDocument = (doc: DocumentRecord) => {
    setSelectedDocId(doc.id);
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-h1 mb-1">Manajer Dokumen & Knowledge Hub</h1>
        <p className="text-body">
          Unggah laporan investigasi atau dokumen kebijakan statis baru. Sistem akan otomatis memvalidasi, membersihkan teks, melakukan pemotongan semantik, dan menghasilkan *embeddings* vektor untuk analisis AI eksekutif.
        </p>
      </div>

      {/* Komponen Unggah File */}
      <UploadDropzone onUploadSuccess={handleUploadSuccess} />

      {/* Komponen Tabel Daftar Dokumen */}
      <DocumentTable 
        documents={documents}
        selectedDocumentId={selectedDocId}
        onSelectDocument={handleSelectDocument}
      />
    </div>
  );
};
