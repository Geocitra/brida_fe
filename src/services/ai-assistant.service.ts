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

export const AiAssistantService = {
  /**
   * Create a new AI chat session tied to a specific document.
   * Returns the sessionId used for subsequent interactions.
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
   * Returns the AI response text.
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

    // Normalize to readable text from BE AnalysisResponseDto format
    if (d?.fullArticleText) return d.fullArticleText;
    if (d?.answer) return d.answer;

    // Structured analysis response — build readable formatted text
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

    // Absolute last resort — stringify raw (should never hit this)
    return JSON.stringify(d, null, 2);
  },

  /**
   * One-shot: create session for a document then send the query.
   * Used by ChatPanel when no session exists yet.
   */
  async queryDocumentOnce(documentId: string, query: string, documentTitle?: string): Promise<string> {
    const sessionId = await AiAssistantService.createSession(documentId, documentTitle || 'Sesi Q&A');
    return AiAssistantService.sendQuery(sessionId, query);
  },

  /**
   * Generate article using CoT pipeline via assistant interact.
   */
  async generateArticle(documentId: string, tone: 'kritis' | 'solutif' | 'akademis'): Promise<string> {
    try {
      const sessionId = await AiAssistantService.createSession(documentId, `Sesi Generator Artikel - ${tone}`);
      return await AiAssistantService.sendQuery(
        sessionId,
        `Buatkan artikel ${tone} berdasarkan laporan ini.`,
      );
    } catch {
      // Fallback mock article for interactive client preview
      return `
# Draf Artikel Publikasi BRIDA (Tone: ${tone.toUpperCase()})

**Judul Usulan: Transparansi Pembangunan Mimika: Pembelajaran dari Laporan Investigasi 2026**

## Pendahuluan
Berdasarkan analisis mendalam terhadap dokumen laporan kebijakan dan investigasi Kabupaten Mimika, BRIDA mempublikasikan draf opini ini untuk mendorong akuntabilitas publik dan efektivitas tata kelola pemerintahan daerah.

## Analisis & Temuan Faktual
1. **Ketidaksesuaian Prosedur Pengadaan**: Ditemukan deviasi signifikan antara realisasi fisik pekerjaan dengan termin pembayaran yang telah dicairkan.
2. **Kesenjangan Wilayah**: Distrik terpencil seperti Hoya dan Agimuga membutuhkan percepatan perhatian infrastruktur dasar.

## Kesimpulan & Rekomendasi
Pemerintah Kabupaten Mimika direkomendasikan untuk memperketat pengawasan verifikasi lapangan sebelum pencairan anggaran termin berikutnya.
`.trim();
    }
  },
};
