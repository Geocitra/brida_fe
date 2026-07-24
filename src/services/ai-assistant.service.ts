const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiInteractResult {
  intent: string;
  data: {
    answer?: string;
    fullArticleText?: string;
    [key: string]: any;
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

export const AiAssistantService = {
  /**
   * Create a new AI chat session tied to a specific document.
   */
  async createSession(documentId: string, title?: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/assistant/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId, title }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Gagal membuat sesi obrolan AI.');
    }
    return result.data.id;
  },

  /**
   * Send a chat query to the AI for a given session.
   */
  async sendQuery(sessionId: string, query: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/assistant/interact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, query }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Gagal memproses permintaan AI.');
    }
    const data = result.data as AiInteractResult;
    const d = data.data;

    if (d?.fullArticleText) return d.fullArticleText;
    if (d?.answer) return d.answer;

    if (d?.ringkasanEksekutif) {
      const parts: string[] = [];
      parts.push(d.ringkasanEksekutif);

      if (Array.isArray(d.entitasTerlibat) && d.entitasTerlibat.length > 0) {
        parts.push('\n\n📋 Entitas Terlibat:');
        d.entitasTerlibat.forEach((e: any) => {
          parts.push(`• ${e.nama} — ${e.peran}${e.entitasTerkait ? ` (${e.entitasTerkait})` : ''}`);
        });
      }

      if (Array.isArray(d.kronologiPeristiwa) && d.kronologiPeristiwa.length > 0) {
        parts.push('\n\n📅 Kronologi:');
        d.kronologiPeristiwa.forEach((k: any) => {
          parts.push(`• ${k.tanggal ? `[${k.tanggal}] ` : ''}${k.deskripsi}${k.lokasi ? ` — ${k.lokasi}` : ''}`);
        });
      }

      if (Array.isArray(d.indikasiPelanggaran) && d.indikasiPelanggaran.length > 0) {
        parts.push('\n\n⚠️ Indikasi Pelanggaran:');
        d.indikasiPelanggaran.forEach((p: any) => {
          parts.push(`• ${p.jenis}${p.pasalDugaan ? ` (${p.pasalDugaan})` : ''}: ${p.rincian}`);
        });
      }

      if (d.kesimpulanAnalisis) {
        parts.push(`\n\n✅ Kesimpulan: ${d.kesimpulanAnalisis}`);
      }

      return parts.join('\n');
    }

    return JSON.stringify(d, null, 2);
  },

  async queryDocumentOnce(documentId: string, query: string, documentTitle?: string): Promise<string> {
    const sessionId = await AiAssistantService.createSession(documentId, documentTitle || 'Sesi Q&A');
    return AiAssistantService.sendQuery(sessionId, query);
  },

  // --- Article Generator Methods ---

  async generateArticleMulti(req: {
    documentIds: string[];
    articleTitle: string;
    targetLength?: 'SHORT' | 'MEDIUM' | 'LONG';
    tone?: string;
    userInstruction?: string;
    sessionId?: string;
  }): Promise<ArticleSessionDetail> {
    const response = await fetch(`${API_BASE_URL}/assistant/article/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Gagal menghasilkan artikel publikasi.');
    }
    return result.data;
  },

  async interactArticle(sessionId: string, userInstruction: string): Promise<ArticleSessionDetail> {
    const response = await fetch(`${API_BASE_URL}/assistant/article/interact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, userInstruction }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Gagal mengirim instruksi revisi artikel.');
    }
    return result.data;
  },

  async listArticleSessions(): Promise<ArticleSessionDetail[]> {
    const response = await fetch(`${API_BASE_URL}/assistant/article/sessions`);
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Gagal memuat riwayat sesi artikel.');
    }
    return result.data;
  },

  async getArticleSession(id: string): Promise<ArticleSessionDetail> {
    const response = await fetch(`${API_BASE_URL}/assistant/article/sessions/${id}`);
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Gagal mengambil detail sesi artikel.');
    }
    return result.data;
  },

  async deleteArticleSession(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/assistant/article/sessions/${id}`, {
      method: 'DELETE',
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Gagal menghapus sesi artikel.');
    }
  },

  // --- QA Chat Session Methods ---

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
    const response = await fetch(`${API_BASE_URL}/assistant/sessions`);
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Gagal memuat riwayat sesi Q&A.');
    }
    return result.data;
  },

  async getQaSessionDetail(id: string): Promise<{
    id: string;
    title: string;
    documentId: string;
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
    const response = await fetch(`${API_BASE_URL}/assistant/sessions/${id}`);
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Gagal mengambil detail sesi Q&A.');
    }
    return result.data;
  },

  async deleteQaSession(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/assistant/sessions/${id}`, {
      method: 'DELETE',
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Gagal menghapus sesi Q&A.');
    }
  },

  /**
   * Helper alias for single document article generation
   */
  async generateArticle(documentId: string, tone: 'kritis' | 'solutif' | 'akademis'): Promise<string> {
    return this.queryDocumentOnce(documentId, `Buatkan artikel publikasi bertema ${tone} berdasarkan dokumen ini.`);
  },
};
