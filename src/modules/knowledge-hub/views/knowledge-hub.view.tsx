import React, { useState } from 'react';
import { UploadDropzone } from '../components/upload-dropzone';
import { DocumentTable } from '../components/document-table';
import type { DocumentRecord } from '../../../services/document.service';

export const KnowledgeHubView: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([
    {
      id: 'doc-001',
      title: 'Laporan Kebijakan Pembangunan Mimika 2026',
      fileUrl: '/uploads/doc-001.pdf',
      mimeType: 'application/pdf',
      checksumHash: 'hash-001',
      status: 'READY',
      createdAt: new Date().toISOString(),
      metadata: {
        fileSizeBytes: '2450000',
        pageCount: 13,
        totalTokenCount: 12500,
        category: 'Analisis Kebijakan',
        uploadedBy: 'Kepala BRIDA',
      },
      chunkCount: 24,
    },
    {
      id: 'doc-002',
      title: 'Dokumen RTRW & Infrastruktur Wilayah',
      fileUrl: '/uploads/doc-002.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      checksumHash: 'hash-002',
      status: 'READY',
      createdAt: new Date().toISOString(),
      metadata: {
        fileSizeBytes: '1850000',
        pageCount: 8,
        totalTokenCount: 8200,
        category: 'Dokumen Hukum',
        uploadedBy: 'Kepala BRIDA',
      },
      chunkCount: 16,
    },
  ]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>('doc-001');

  const handleUploadSuccess = (newDoc: DocumentRecord) => {
    setDocuments((prev) => [newDoc, ...prev]);
    setSelectedDocId(newDoc.id);
  };

  const handleSelectDocument = (doc: DocumentRecord) => {
    setSelectedDocId(doc.id);
  };

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-h1 mb-2">Manajer Dokumen & Pengetahuan</h1>
        <p className="text-body">
          Unggah laporan investigasi atau dokumen kebijakan statis baru. Sistem akan otomatis memvalidasi, membersihkan teks, melakukan pemotongan semantik, dan menghasilkan *embeddings* vektor untuk keperluan analisis AI eksekutif.
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
