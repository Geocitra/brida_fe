const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export interface DocumentRecord {
  id: string;
  title: string;
  fileUrl: string;
  mimeType: string;
  checksumHash: string;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
  createdAt: string;
  metadata?: {
    fileSizeBytes: string;
    pageCount: number;
    totalTokenCount: number;
    category: string;
    uploadedBy: string;
  };
  chunkCount?: number;
  extractedLocationsCount?: number;
}

export const DocumentService = {
  async uploadDocument(file: File, title: string, category?: string): Promise<DocumentRecord> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    if (category) formData.append('category', category);
    formData.append('uploadedBy', 'Kepala BRIDA');

    const response = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Gagal mengunggah dokumen laporan.');
    }

    return result.data;
  },

  async getDocumentById(id: string): Promise<DocumentRecord> {
    const response = await fetch(`${API_BASE_URL}/documents/${id}`);
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Gagal memuat detail dokumen.');
    }
    return result.data;
  }
};
