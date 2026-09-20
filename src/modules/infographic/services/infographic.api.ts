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
    // Sanitasi payload: Hanya kirim atribut branding murni (hindari metadata seperti id, posterId, createdAt)
    const cleanPayload: Record<string, any> = {};
    if (payload.headerEnabled !== undefined) cleanPayload.headerEnabled = payload.headerEnabled;
    if (payload.institution !== undefined) cleanPayload.institution = payload.institution;
    if (payload.subInstitution !== undefined) cleanPayload.subInstitution = payload.subInstitution;
    if (payload.footerEnabled !== undefined) cleanPayload.footerEnabled = payload.footerEnabled;
    if (payload.footerText !== undefined) cleanPayload.footerText = payload.footerText;
    if (payload.layoutConfig !== undefined) cleanPayload.layoutConfig = payload.layoutConfig;

    const response = await fetch(`${API_BASE_URL}/infographic/agent/posters/${posterId}/branding`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(cleanPayload),
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
   * Mengunduh berkas poster resmi beresolusi tinggi langsung dari server dengan nama .png resmi
   */
  async downloadPosterFile(
    posterId: string,
    filename: string,
    branded: boolean = true,
  ): Promise<void> {
    const downloadUrl = `${API_BASE_URL}/infographic/agent/posters/${posterId}/download?branded=${branded}`;

    // 1. Lakukan pre-flight GET fetch untuk memastikan proses komposit Puppeteer di server selesai
    // Ini menjaga agar tombol tetap dalam status "Mengunduh..." selama Puppeteer menyusun gambar
    const token = sessionStorage.getItem('brida_auth_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const preflightRes = await fetch(downloadUrl, { method: 'GET', headers });
    if (!preflightRes.ok) {
      let errMsg = `HTTP ${preflightRes.status}: Gagal mengunduh berkas poster`;
      try {
        const errJson = await preflightRes.json();
        if (errJson?.message) errMsg = errJson.message;
      } catch {}
      throw new Error(errMsg);
    }

    // 2. Sanitasi nama berkas: wajib berakhiran .png
    let safeName = (filename || 'Infografis_BRIDA.png').trim();
    if (!safeName.toLowerCase().endsWith('.png')) {
      safeName = `${safeName}.png`;
    }

    // 3. Picu Native Browser HTTP Download langsung dari URL endpoint server.
    // Pendekatan ini TIDAK MENGGUNAKAN Blob URL (blob:http://...) yang pada Google Chrome / Incognito
    // sering kali mengabaikan atribut download dan menghasilkan nama file GUID tanpa ekstensi.
    // Dengan mengunduh langsung dari URL HTTP server, browser membaca header Content-Disposition
    // dan 100% PASTI menyimpannya sebagai file gambar PNG resmi (.png).
    const link = document.createElement('a');
    link.style.position = 'fixed';
    link.style.top = '-9999px';
    link.style.left = '-9999px';
    link.style.width = '1px';
    link.style.height = '1px';
    link.style.opacity = '0';
    link.href = downloadUrl;
    link.setAttribute('download', safeName);
    link.download = safeName;
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      try {
        if (link.parentNode) link.parentNode.removeChild(link);
      } catch {}
    }, 15000);
  },
};
