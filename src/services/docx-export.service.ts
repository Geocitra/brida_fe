const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/**
 * Interface Konfigurasi Tata Letak Halaman Word DOCX Dinamis
 */
export interface DocxFormatConfig {
  fontFamily: 'Calibri' | 'Times New Roman' | 'Verdana' | 'Arial';
  fontSize: number;
  lineSpacing: number;
  marginCm: number;
}

export const DocxExportService = {
  /**
   * Mengambil draf HTML interaktif dari TipTap, mengirimkan ke backend NestJS
   * untuk kompilasi OOXML, dan memicu unduhan berkas .docx di peramban.
   */
  async exportCustomFormattedArticleDocx(
    htmlText: string,
    config: DocxFormatConfig,
    filename: string,
  ): Promise<void> {
    const token = sessionStorage.getItem('brida_auth_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/docx/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        htmlContent: htmlText,
        fontFamily: config.fontFamily,
        fontSize: config.fontSize,
        lineSpacing: config.lineSpacing,
        marginCm: config.marginCm,
        filename: filename,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = 'Gagal mengekspor berkas Word DOCX';
      try {
        const errorJson = JSON.parse(errorText);
        errorMsg = errorJson.message || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.toLowerCase().endsWith('.docx') ? filename : `${filename}.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};
