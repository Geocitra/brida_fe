const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export type PosterAspectRatio = '1:1' | '9:16' | '16:9';

export interface InfographicPosterItem {
  id: string;
  sessionId: string;
  versionNumber: number;
  userPrompt: string;
  revisedPrompt?: string;
  aiCommentary?: string;
  imageUrl: string;
  aspectRatio: PosterAspectRatio;
  createdAt: string;
}

export interface InfographicSessionDetail {
  id: string;
  title: string;
  topic: string;
  aspectRatio: PosterAspectRatio;
  document?: {
    id: string;
    title: string;
    metadata?: any;
  } | null;
  createdAt: string;
  updatedAt: string;
  posters: InfographicPosterItem[];
}

export interface InfographicSessionListItem {
  id: string;
  title: string;
  topic: string;
  aspectRatio: PosterAspectRatio;
  createdAt: string;
  updatedAt: string;
  totalVersions: number;
  latestPoster: InfographicPosterItem | null;
  document?: { id: string; title: string } | null;
}

export interface CreateSessionPayload {
  topic: string;
  title?: string;
  documentId?: string;
  aspectRatio?: PosterAspectRatio;
  customInstructions?: string;
}

export interface ChatTurnPayload {
  sessionId: string;
  message: string;
  aspectRatio?: PosterAspectRatio;
}

function getAuthHeaders(): Record<string, string> {
  const token = sessionStorage.getItem('brida_auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const InfographicApi = {
  /**
   * Membuat sesi baru dan menghasilkan poster v1
   */
  async createSession(payload: CreateSessionPayload): Promise<InfographicSessionDetail> {
    const response = await fetch(`${API_BASE_URL}/infographic/agent/session`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok || result?.success === false) {
      throw new Error(result?.message || 'Gagal memulai sesi pembuatan poster.');
    }
    return result.data;
  },

  /**
   * Mengirim pesan revisi dan menghasilkan poster versi baru (v2, v3, ...)
   */
  async sendRevisionChat(
    payload: ChatTurnPayload,
  ): Promise<{ session: any; latestPoster: InfographicPosterItem }> {
    const response = await fetch(`${API_BASE_URL}/infographic/agent/chat`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok || result?.success === false) {
      throw new Error(result?.message || 'Gagal mengirim instruksi revisi poster.');
    }
    return result.data;
  },

  /**
   * Mengambil daftar seluruh riwayat sesi poster
   */
  async getSessionsList(): Promise<InfographicSessionListItem[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/infographic/agent/sessions`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const result = await response.json();
      if (response.ok && result?.success) {
        return result.data || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Mengambil detail lengkap sesi beserta semua riwayat versinya
   */
  async getSessionDetail(sessionId: string): Promise<InfographicSessionDetail> {
    const response = await fetch(`${API_BASE_URL}/infographic/agent/sessions/${sessionId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    const result = await response.json();
    if (!response.ok || result?.success === false) {
      throw new Error(result?.message || 'Gagal memuat detail sesi poster.');
    }
    return result.data;
  },

  /**
   * Menghapus sesi beserta file biner gambar dari disk
   */
  async deleteSession(sessionId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/infographic/agent/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    const result = await response.json();
    if (!response.ok || result?.success === false) {
      throw new Error(result?.message || 'Gagal menghapus sesi poster.');
    }
  },

  /**
   * Mengambil daftar dokumen acuan dari database untuk grounding data
   */
  async getAvailableDocuments(): Promise<Array<{ id: string; title: string }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/documents`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const result = await response.json();
      if (response.ok && result?.data) {
        return result.data.map((d: any) => ({ id: d.id, title: d.title }));
      }
      return [];
    } catch {
      return [];
    }
  },
};
