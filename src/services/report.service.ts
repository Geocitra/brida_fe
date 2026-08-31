const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export interface GenerateReportRequest {
  documentIds: string[];
  reportType?: string;
  title?: string;
  forceRegenerate?: boolean;
}

export interface GeneratedReportDetail {
  id: string;
  title: string;
  reportType: string;
  executiveSummary: string;
  contentPayload: {
    title?: string;
    urgency?: string;
    recipient?: string;
    sender?: string;
    period?: string;
    date?: string;
    executiveSummary?: string;
    deviations?: Array<{
      title: string;
      baseline: string;
      realization: string;
      deviationText: string;
      severityColor?: string;
      causes: string;
    }>;
    nationalPolicyImpact?: {
      policyName: string;
      simulationResults: string[];
    };
    actionPriorities?: string[];
  };
  tokenCount: number;
  llmProvider: string;
  createdAt: string;
  sources: Array<{
    id: string;
    title: string;
    fileUrl?: string;
    metadata?: {
      category: string;
      totalTokenCount: number;
    };
  }>;
}

export interface GenerateReportResponse {
  success: boolean;
  isCached: boolean;
  data: GeneratedReportDetail;
}

export interface CheckCacheResponse {
  isCached: boolean;
  reportId: string | null;
  createdAt?: string;
  title?: string;
  tokenCount?: number;
  sourceDocumentsCount: number;
}

const formatError = (msg: any, fallback: string): string => {
  if (!msg) return fallback;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg.join(', ');
  return String(msg);
};

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = sessionStorage.getItem('brida_auth_token');
  const headers = {
    ...(options.headers || {}),
  } as Record<string, string>;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

export const ReportService = {
  async generateReport(req: GenerateReportRequest): Promise<GenerateReportResponse> {
    const response = await fetchWithAuth(`${API_BASE_URL}/reports/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(formatError(result.message, 'Gagal menghasilkan laporan AI.'));
    }
    return result;
  },

  async checkCache(documentIds: string[], reportType?: string): Promise<CheckCacheResponse> {
    const response = await fetchWithAuth(`${API_BASE_URL}/reports/check-cache`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentIds, reportType }),
    });

    return await response.json();
  },

  async listSavedReports(): Promise<GeneratedReportDetail[]> {
    const response = await fetchWithAuth(`${API_BASE_URL}/reports`);
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(formatError(result.message, 'Gagal memuat riwayat laporan.'));
    }
    return result.data;
  },

  async getSavedReport(id: string): Promise<GeneratedReportDetail> {
    const response = await fetchWithAuth(`${API_BASE_URL}/reports/${id}`);
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(formatError(result.message, 'Gagal mengambil detail laporan tersimpan.'));
    }
    return result.data;
  },

  async deleteSavedReport(id: string): Promise<void> {
    const response = await fetchWithAuth(`${API_BASE_URL}/reports/${id}`, {
      method: 'DELETE',
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(formatError(result.message, 'Gagal menghapus laporan.'));
    }
  },

  async getPublicSharedReport(id: string): Promise<GeneratedReportDetail> {
    const response = await fetch(`${API_BASE_URL}/reports/share/${id}`);
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(formatError(result.message, 'Gagal mengambil detail laporan publik.'));
    }
    return result.data;
  },

  async getPublicSharedArticle(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/assistant/article/share/${id}`);
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(formatError(result.message, 'Gagal mengambil detail artikel publik.'));
    }
    return result.data;
  },
};
