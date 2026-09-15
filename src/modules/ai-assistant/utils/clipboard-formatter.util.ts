export class ClipboardFormatter {
  /**
   * Membersihkan teks mentah AI dari token sitasi internal mesin
   * dan menyelaraskan formatting agar siap ditempel (paste) ke WhatsApp, Word, atau Email.
   */
  public static cleanForClipboard(rawText: string): string {
    if (!rawText) return '';

    let text = rawText;

    // 1. Ekstrak teks jika berupa JSON string (misal: {"answer": "..."})
    if (text.startsWith('{') && text.includes('"answer"')) {
      try {
        const parsed = JSON.parse(text);
        text = parsed.answer || parsed.fullArticleText || text;
      } catch {
        // Abaikan jika bukan JSON valid
      }
    }

    // 2. Buang token sitasi mesin internal seperti [doc-001:2] atau [uuid:1]
    text = text
      .replace(/\[(?:[a-f0-9-]{8,}|doc(?:[-_a-z0-9]+)?):\d+\]/gi, '')
      .replace(/\[doc[-_][a-z0-9]+:\d+\]/gi, '');

    // 3. Rapikan tautan URL Markdown [Judul](URL) atau [URL]
    text = text.replace(/\[(https?:\/\/[^\]\s]+)\]/g, '$1');
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '$1 ($2)');

    // 4. Konversi heading Markdown (#, ##, ###) menjadi baris teks kapital tebal
    text = text.replace(/^#{1,6}\s+(.+)$/gm, '\n*$1*\n');

    // 5. Konversi bold Markdown ganda (**) menjadi format bintang tunggal WhatsApp (*teks*)
    text = text.replace(/\*\*(.*?)\*\*/g, '*$1*');

    // 6. Buang penanda blockquote (> ) agar menjadi teks paragraf bersih
    text = text.replace(/^>\s?/gm, '');

    // 7. Rapikan baris tabel Markdown menjadi teks baris berjajar rapi
    text = this.formatMarkdownTablesForChat(text);

    // 8. Normalisasi spasi dan baris kosong berlebih
    text = text
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim();

    return text;
  }

  /**
   * Merapikan baris tabel Markdown | col | col | menjadi teks berjajar yang rapi saat dibaca di WhatsApp
   */
  private static formatMarkdownTablesForChat(text: string): string {
    const lines = text.split('\n');
    const processedLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Abaikan garis pembatas tabel | --- | --- |
      if (/^\|\s*[-:]+[\s-|]*\|$/.test(trimmed)) {
        continue;
      }

      // Jika baris tabel, pisahkan dengan pemisah titik tengah (•) yang rapi
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const cells = trimmed
          .split('|')
          .map((c) => c.trim())
          .filter((c) => c.length > 0);

        if (cells.length > 0) {
          processedLines.push(cells.join('  •  '));
          continue;
        }
      }

      processedLines.push(line);
    }

    return processedLines.join('\n');
  }

  /**
   * Mengeksekusi salinan ke clipboard perangkat dengan mekanisme fallback otomatis
   */
  public static async copyToClipboard(text: string): Promise<boolean> {
    const cleanText = this.cleanForClipboard(text);

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(cleanText);
        return true;
      } catch (err) {
        console.warn('[Clipboard] Navigator API gagal, mencoba fallback textarea:', err);
      }
    }

    // Mekanisme Fallback Textarea (untuk lingkungan non-HTTPS atau browser lama)
    try {
      const textArea = document.createElement('textarea');
      textArea.value = cleanText;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error('[Clipboard] Seluruh metode salin gagal:', err);
      return false;
    }
  }
}
