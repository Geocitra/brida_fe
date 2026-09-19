const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export type PosterAspectRatio = '1:1' | '9:16' | '16:9' | '3:4' | '4:3';

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

async function safeParseJsonResponse(response: Response, defaultErrorMsg: string): Promise<any> {
  const text = await response.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // Respons bukan JSON (kemungkinan besar halaman error HTML dari Nginx seperti 504 atau 502)
    if (response.status === 504) {
      throw new Error(
        'Proses pembuatan infografis membutuhkan waktu lebih dari batas timeout server (504 Gateway Time-out). Tambahkan "proxy_read_timeout 300s;" pada konfigurasi Nginx reverse proxy Anda.'
      );
    }
    if (response.status === 502) {
      throw new Error(
        'Server backend tidak merespons (502 Bad Gateway). Jalankan "docker logs --tail 50 brida-be" pada VPS untuk melihat kendala pada backend.'
      );
    }
    if (response.status === 404) {
      throw new Error(
        `Endpoint API tidak ditemukan (404 Not Found): ${response.url}. Pastikan konfigurasi Nginx meneruskan request /api ke container brida-be.`
      );
    }

    const titleMatch = text.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : `HTTP ${response.status} ${response.statusText}`;
    throw new Error(`${defaultErrorMsg} (${title})`);
  }

  if (!response.ok || json?.success === false) {
    throw new Error(json?.message || defaultErrorMsg);
  }

  return json;
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

    const result = await safeParseJsonResponse(response, 'Gagal memulai sesi pembuatan infografis.');
    return result.data;
  },

  /**
   * Mengirim pesan revisi dan menghasilkan infografis versi baru (v2, v3, ...)
   */
  async sendRevisionChat(
    payload: ChatTurnPayload,
  ): Promise<{ session: any; latestPoster: InfographicPosterItem }> {
    const response = await fetch(`${API_BASE_URL}/infographic/agent/chat`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const result = await safeParseJsonResponse(response, 'Gagal mengirim instruksi revisi infografis.');
    return result.data;
  },

  /**
   * Mengambil daftar seluruh riwayat sesi infografis
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

    const result = await safeParseJsonResponse(response, 'Gagal memuat detail sesi infografis.');
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

    await safeParseJsonResponse(response, 'Gagal menghapus sesi infografis.');
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
