import type {
  PosterBrandingData,
  PosterGenerationProfile,
} from '../types/poster-branding.types';

export type { PosterBrandingData, PosterGenerationProfile };

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
  generationProfile?: PosterGenerationProfile;
  branding?: PosterBrandingData | null;
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
      throw new Error(result?.message || 'Gagal memulai sesi pembuatan infografis.');
    }
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

    const result = await response.json();
    if (!response.ok || result?.success === false) {
      throw new Error(result?.message || 'Gagal mengirim instruksi revisi infografis.');
    }
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

    const result = await response.json();
    if (!response.ok || result?.success === false) {
      throw new Error(result?.message || 'Gagal memuat detail sesi infografis.');
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
      throw new Error(result?.message || 'Gagal menghapus sesi infografis.');
    }
  },

  /**
   * Mengambil daftar dokumen acuan dari database untuk grounding data
   */
  /**
   * Mengambil konfigurasi branding poster
   */
  async getBranding(posterId: string): Promise<PosterBrandingData> {
    const response = await fetch(`${API_BASE_URL}/infographic/agent/posters/${posterId}/branding`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    const result = await response.json();
    if (!response.ok || result?.success === false) {
      throw new Error(result?.message || 'Gagal memuat konfigurasi branding poster.');
    }
    return result.data;
  },

  /**
   * Menyimpan / memperbarui konfigurasi branding poster
   */
  async saveBranding(
    posterId: string,
    payload: Partial<PosterBrandingData>,
  ): Promise<PosterBrandingData> {
    const response = await fetch(`${API_BASE_URL}/infographic/agent/posters/${posterId}/branding`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok || result?.success === false) {
      throw new Error(result?.message || 'Gagal menyimpan konfigurasi branding poster.');
    }
    return result.data;
  },

  /**
   * Mengunggah berkas logo resmi (PNG/JPEG max 2MB)
   */
  async uploadBrandingLogo(posterId: string, file: File): Promise<PosterBrandingData> {
    const formData = new FormData();
    formData.append('logo', file);

    const token = sessionStorage.getItem('brida_auth_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_BASE_URL}/infographic/agent/posters/${posterId}/branding/logo`,
      {
        method: 'POST',
        headers,
        body: formData,
      },
    );

    const result = await response.json();
    if (!response.ok || result?.success === false) {
      throw new Error(result?.message || 'Gagal mengunggah berkas logo instansi.');
    }
    return result.data;
  },

  /**
   * Menghapus berkas logo resmi yang terpasang
   */
  async deleteBrandingLogo(posterId: string): Promise<PosterBrandingData> {
    const response = await fetch(
      `${API_BASE_URL}/infographic/agent/posters/${posterId}/branding/logo`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
      },
    );

    const result = await response.json();
    if (!response.ok || result?.success === false) {
      throw new Error(result?.message || 'Gagal menghapus berkas logo.');
    }
    return result.data;
  },

  /**
   * Mengunduh berkas poster resmi beresolusi tinggi langsung dari server dengan JWT
   */
  async downloadPosterFile(
    posterId: string,
    filename: string,
    branded: boolean = true,
  ): Promise<void> {
    const token = sessionStorage.getItem('brida_auth_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE_URL}/infographic/agent/posters/${posterId}/download?branded=${branded}`;
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      let errMsg = `HTTP ${response.status}: Gagal mengunduh berkas poster`;
      try {
        const errJson = await response.json();
        if (errJson?.message) errMsg = errJson.message;
      } catch {}
      throw new Error(errMsg);
    }

    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      window.URL.revokeObjectURL(objectUrl);
    }, 2000);
  },
};
