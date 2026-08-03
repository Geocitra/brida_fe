const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Pengecualian Kustom untuk Layanan AI (Custom Exception Wrapper) [5].
 * Membungkus kegagalan teknis dari server menjadi properti objek bertipe kuat [5].
 */
export class AiServiceException extends Error {
  public readonly statusCode: number;
  public readonly errorType: string;
  public readonly rawMessage: string;

  constructor(statusCode: number, errorType: string, message: string) {
    super(message);
    this.name = 'AiServiceException';
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.rawMessage = message;

    // Penyelarasan prototipe eksplisit untuk pewarisan TypeScript
    Object.setPrototypeOf(this, AiServiceException.prototype);
  }
}

/**
 * Interface respons AI interaktif polimorfis dari backend NestJS.
 * Membawa Markdown bebas (answer), quick-reply suggestions, dan draf artikel terbarui.
 */
export interface AiInteractResult {
  intent: string;
  sessionId?: string;
  documentId?: string;
  documentIds?: string[];
  data: {
    answer?: string;           // Teks jawaban utama dalam format Rich Markdown
    suggestions?: string[];    // Pertanyaan rekomendasi dinamis (chips)
    updatedArticle?: {         // Metadata artikel terbarui hasil proses kolaboratif (Dual-Pane) [5]
      title: string;
      draftMarkdown: string;
    };
    citations?: Array<{        // Metadata sitasi jangkar dokumen rujukan [5]
      documentId: string;
      chunkIndex: number;
      rawText: string;
    }>;
    [key: string]: any;        // Fallback untuk properti dinamis lainnya
  };
  memoryInfo?: {
    activeTokens: number;
    prunedMessagesCount: number;
  };
}

export interface ArticleSessionDetail {
  id: string;
  title: string;
  articleTitle: string;
  tone: string;
  targetLength: 'SHORT' | 'MEDIUM' | 'LONG';
  createdAt: string;
  updatedAt: string;
  sourcesCount?: number;
  sources: Array<{
    id: string;
    title: string;
    category?: string;
    fileUrl?: string;
  }>;
  messages: Array<{
    id: string;
    role: 'USER' | 'ASSISTANT' | 'SYSTEM';
    content: string;
    createdAt: string;
  }>;
  fullArticleText?: string;
}

/**
 * Pembungkus Fetch Heuristik dan Amandemen Kesalahan Jaringan (Fail-Safe Transport) [5].
 * Mengonversi kegagalan server, gateway, maupun koneksi browser menjadi AiServiceException terstruktur.
 */
async function safeFetch(url: string, options: RequestInit): Promise<any> {
  try {
    const response = await fetch(url, options);
    let result: any;

    try {
      result = await response.json();
    } catch {
      // Fallback jika Gateway/Proxy mengembalikan error HTML (seperti 502 Bad Gateway / 504 Timeout)
      throw new AiServiceException(
        response.status,
        'HTML_GATEWAY_ERROR',
        `Server mengembalikan kode status ${response.status} tanpa format JSON.`,
      );
    }

    // Evaluasi status respons dari server
    if (!response.ok || result?.success === false) {
      const status = result?.statusCode || response.status;
      const type = result?.errorType || 'HTTP_ERROR';
      const rawMsg = result?.message || 'Terjadi kesalahan sistem internal.';
      const msg = Array.isArray(rawMsg) ? rawMsg.join(', ') : String(rawMsg);

      throw new AiServiceException(status, type, msg);
    }

    return result;
  } catch (err) {
    if (err instanceof AiServiceException) {
      throw err;
    }

    // Amandemen kegagalan jaringan mentah browser (Failed to Fetch, Offline, DNS Failure, CORS) [5]
    throw new AiServiceException(
      503,
      'CONNECTION_FAILURE',
      err instanceof Error ? err.message : 'Gagal menghubungi server.',
    );
  }
}

export const AiAssistantService = {
  /**
   * Membuat sesi obrolan AI baru yang terikat ke beberapa dokumen acuan.
   */
  async createSession(documentId: string, title?: string, documentIds?: string[], sessionType?: 'QA_CHAT' | 'ARTICLE_GENERATOR'): Promise<string> {
    const result = await safeFetch(`${API_BASE_URL}/assistant/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId, title, documentIds, sessionType }),
    });
    return result.data.id;
  },

  /**
   * Mengunggah berkas transien/multimodal (screenshot clipboard atau file chat) ke server.
   * Format pengiriman dikelola dalam objek FormData asinkron secara aman [5].
   */
  async uploadSessionAttachment(
    sessionId: string,
    file: File,
  ): Promise<{
    tempFileId: string;
    fileName: string;
    mimeType: string;
    fileSizeBytes: string;
    tempPath: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const result = await safeFetch(`${API_BASE_URL}/assistant/sessions/${sessionId}/attachments`, {
      method: 'POST',
      body: formData, // Konten-tipe dikosongkan agar ditangani otomatis oleh browser pembatas biner
    });
    return result.data;
  },

  /**
   * Mengirim kueri obrolan kolaboratif dinamis ke asisten AI (Pane Kiri).
   * Mendukung transmisi draf aktif (Pane Kanan) dan ID lampiran berkas/screenshots.
   */
  async sendQuery(
    sessionId: string,
    query: string,
    attachments?: Array<{ fileId: string; classification?: 'BASELINE' | 'REALIZATION' | 'GENERAL_REFERENCE' }>,
    currentDraft?: string,
    documentIds?: string[],
    tone?: string,
    targetLength?: string,
    districts?: string[],
  ): Promise<AiInteractResult> {
    const result = await safeFetch(`${API_BASE_URL}/assistant/interact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, query, attachments, currentDraft, documentIds, tone, targetLength, districts }),
    });
    return result.data as AiInteractResult; // Mengembalikan data murni bertipe kuat
  },

  /**
   * Membuka sesi asisten sekali-jalan (single transaction) untuk satu dokumen.
   */
  async queryDocumentOnce(
    documentId: string,
    query: string,
    documentTitle?: string,
  ): Promise<AiInteractResult> {
    const sessionId = await AiAssistantService.createSession(documentId, documentTitle || 'Sesi Q&A');
    return AiAssistantService.sendQuery(sessionId, query);
  },

  // --- Metode Penulisan Artikel Publikasi (Article Generator) ---

  async generateArticleMulti(req: {
    documentIds: string[];
    articleTitle: string;
    targetLength?: 'SHORT' | 'MEDIUM' | 'LONG';
    tone?: string;
    userInstruction?: string;
    sessionId?: string;
  }): Promise<ArticleSessionDetail> {
    const result = await safeFetch(`${API_BASE_URL}/assistant/article/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    return result.data;
  },

  /**
   * Mentransisikan sesi obrolan QA panjang lebar menjadi sesi pembuatan artikel independen baru [Two-Pass Pipeline].
   * Endpoint: POST /assistant/article/transition
   */
  async transitionToArticle(req: {
    sessionId: string; // ID sesi QA obrolan asal
    articleTitle: string;
    targetLength?: 'SHORT' | 'MEDIUM' | 'LONG';
    tone?: string;
    userInstruction?: string;
  }): Promise<ArticleSessionDetail> {
    const result = await safeFetch(`${API_BASE_URL}/assistant/article/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    return result.data;
  },

  async interactArticle(sessionId: string, userInstruction: string): Promise<ArticleSessionDetail> {
    const result = await safeFetch(`${API_BASE_URL}/assistant/article/interact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, userInstruction }),
    });
    return result.data;
  },

  /**
   * Menyinkronkan konten hasil suntingan manual naskah draf artikel ke database (Two-Way Sync) [1].
   * Menjamin kesalahan jaringan tertangkap secara terpadu oleh AiServiceException [5].
   */
  async updateArticleSessionContent(
    sessionId: string,
    articleTitle: string,
    fullArticleText: string,
  ): Promise<ArticleSessionDetail> {
    const result = await safeFetch(`${API_BASE_URL}/assistant/article/sessions/${sessionId}/content`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleTitle, fullArticleText }),
    });
    return result.data;
  },

  async listArticleSessions(): Promise<ArticleSessionDetail[]> {
    const result = await safeFetch(`${API_BASE_URL}/assistant/article/sessions`, {
      method: 'GET',
    });
    return result.data;
  },

  async getArticleSession(id: string): Promise<ArticleSessionDetail> {
    const result = await safeFetch(`${API_BASE_URL}/assistant/article/sessions/${id}`, {
      method: 'GET',
    });
    return result.data;
  },

  async deleteArticleSession(id: string): Promise<void> {
    await safeFetch(`${API_BASE_URL}/assistant/article/sessions/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Mengambil data artikel dari endpoint export-data backend untuk keperluan cetak PDF.
   * Endpoint: GET /assistant/article/sessions/:id/export-data
   */
  async getArticleExportData(id: string): Promise<{
    title: string;
    content: string;
    tone: string;
    generatedAt: string;
  }> {
    const result = await safeFetch(`${API_BASE_URL}/assistant/article/sessions/${id}/export-data`, {
      method: 'GET',
    });
    return result.data;
  },

  // --- Metode Manajemen Sesi Obrolan Q&A ---

  async listQaSessions(): Promise<Array<{
    id: string;
    title: string;
    documentId: string;
    documentTitle: string;
    createdAt: string;
    updatedAt: string;
    messagesCount: number;
    lastMessage?: string;
  }>> {
    const result = await safeFetch(`${API_BASE_URL}/assistant/sessions`, {
      method: 'GET',
    });
    return result.data;
  },

  async getQaSessionDetail(id: string): Promise<{
    id: string;
    title: string;
    documentId: string;
    documentIds?: string[];
    documentTitle: string;
    createdAt: string;
    updatedAt: string;
    messages: Array<{
      id: string;
      role: 'USER' | 'ASSISTANT' | 'SYSTEM';
      content: string;
      createdAt: string;
    }>;
  }> {
    const result = await safeFetch(`${API_BASE_URL}/assistant/sessions/${id}`, {
      method: 'GET',
    });
    return result.data;
  },

  async deleteQaSession(id: string): Promise<void> {
    await safeFetch(`${API_BASE_URL}/assistant/sessions/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Helper alias asinkron untuk pembuatan artikel cepat berbasis satu dokumen rujukan.
   */
  async generateArticle(documentId: string, tone: 'kritis' | 'solutif' | 'akademis'): Promise<string> {
    const result = await this.queryDocumentOnce(
      documentId,
      `Buatkan artikel publikasi bertema ${tone} berdasarkan dokumen ini.`,
    );
    return result.data.answer || JSON.stringify(result.data, null, 2);
  },
};