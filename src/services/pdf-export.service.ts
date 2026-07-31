import pdfMake from 'pdfmake/build/pdfmake';
import htmlToPdfmake from 'html-to-pdfmake';
// @ts-ignore
import pdfFonts from 'pdfmake/build/vfs_fonts';
import customVfs from '../assets/fonts/vfs_fonts';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/**
 * Ambil dict VFS Roboto asli dari pdfmake/build/vfs_fonts.
 * pdfFonts adalah module object { pdfMake: { vfs: {...} } }, BUKAN dict langsung.
 * Jangan assign di module level — selalu merge saat dipakai agar tidak ada race condition.
 */
const getRobotoVfs = (): Record<string, string> => {
  // Handle dua bentuk export yang berbeda antar versi pdfmake
  if (pdfFonts && (pdfFonts as any).pdfMake?.vfs) {
    return (pdfFonts as any).pdfMake.vfs;
  }
  if (pdfFonts && typeof pdfFonts === 'object' && !Array.isArray(pdfFonts)) {
    // Mungkin sudah di-unwrap oleh bundler
    return pdfFonts as any;
  }
  return {};
};

/**
 * Utilitas untuk membersihkan token sitasi RAG sebelum diekspor ke PDF
 */
const stripCitationTokens = (content?: string | null): string => {
  if (!content) return '';

  return content
    .replace(/\[(?:[a-f0-9-]{8,}|doc(?:[-_a-z0-9]+)?):\d+\]/gi, '')
    .replace(/\[(?:[a-f0-9-]{8,}|doc(?:[-_a-z0-9]+)?):\d+\]\[(?:[a-f0-9-]{8,}|doc(?:[-_a-z0-9]+)?):\d+\]/gi, '')
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

/**
 * Interface Konfigurasi Tata Letak Halaman PDF Dinamis (OCP)
 */
export interface PDFFormatConfig {
  fontFamily: 'Calibri' | 'Times New Roman' | 'Verdana' | 'Arial';
  fontSize: number;
  lineSpacing: number;
  marginCm: number;
}

export const PdfExportService = {
  /**
   * Mengambil draf HTML interaktif, mendaftarkan VFS luring statis,
   * dan mencetak dokumen PDF formal dengan format WYSIWYG presisi.
   */
  async exportCustomFormattedArticlePdf(
    htmlText: string,
    config: PDFFormatConfig,
    filename: string,
  ): Promise<{ fallback: boolean }> {
    const response = await fetch(`${API_BASE_URL}/pdf/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
      let errorMsg = 'Gagal mengekspor PDF';
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
    a.download = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    return { fallback: false };
  },

  /**
   * Export Diagnostik Deviasi Indikator ke PDF Vector Pristine
   */
  exportAnalyticsPdf(indicator: any, filename?: string): void {
    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [45, 80, 45, 40],
      defaultStyle: {
        font: 'Roboto',
        fontSize: 10,
        lineHeight: 1.4,
        alignment: 'justify',
        color: '#1e293b',
      },
      footer: (currentPage: number, pageCount: number) => ({
        columns: [
          { text: `Tanggal Rilis: ${new Date().toLocaleDateString('id-ID')}`, fontSize: 8, color: '#565c63' },
          { text: `Halaman ${currentPage} dari ${pageCount}`, alignment: 'right', fontSize: 8, color: '#565c63' },
        ],
        margin: [45, 12, 45, 0],
      }),
      content: [
        { text: 'LEMBAR DIAGNOSTIK & DEVIASI INDIKATOR', fontSize: 15, bold: true, color: '#0f172a', alignment: 'center', margin: [0, 0, 0, 4] },
        { text: `${indicator.name}  ·  ${indicator.sector}  ·  ${indicator.period}`, fontSize: 9, color: '#0d9488', bold: true, alignment: 'center', margin: [0, 0, 0, 12] },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 505, y2: 0, lineWidth: 1.5, lineColor: '#0f172a' }], margin: [0, 0, 0, 18] },
        {
          keepTogether: true,
          stack: [
            { text: '1. RINGKASAN DEVIASI CAPAIAN', style: 'sectionHeader' },
            {
              table: {
                widths: ['*', '*', '*'],
                body: [
                  [
                    { text: 'Baseline Target', style: 'tableHeader' },
                    { text: 'Realisasi Lapangan', style: 'tableHeader' },
                    { text: 'Deviasi (%)', style: 'tableHeader' },
                  ],
                  [
                    { text: indicator.baseline, fontSize: 13, bold: true, alignment: 'center' },
                    { text: indicator.realization, fontSize: 13, bold: true, alignment: 'center' },
                    { text: indicator.deviationText, fontSize: 13, bold: true, color: '#dc2626', alignment: 'center' },
                  ],
                ],
              },
              layout: 'lightHorizontalLines',
              margin: [0, 0, 0, 20],
            },
          ],
        },
        {
          keepTogether: true,
          stack: [
            { text: '2. RINGKASAN EKSEKUTIF ANALISIS (AI-SYNTHESIS)', style: 'sectionHeader' },
            { text: stripCitationTokens(indicator.summary) || 'Hasil analisis deskriptif AI belum tersedia.', fontSize: 10, lineHeight: 1.55, alignment: 'justify', color: '#1e293b', margin: [0, 0, 0, 18] },
          ]
        },
        {
          keepTogether: true,
          stack: [
            { text: '3. ANALISIS FAKTOR PENYEBAB (AI — Causal Inference)', style: 'sectionHeader' },
            {
              table: {
                widths: ['*', 65],
                body: [
                  [
                    { text: 'Faktor Penyebab Utama', style: 'tableHeader' },
                    { text: 'Kontribusi', style: 'tableHeader' },
                  ],
                  ...indicator.causalFactors.map((f: any, i: number) => [
                    { text: `${i + 1}.  ${f.label}`, fontSize: 9.5, alignment: 'left' },
                    { text: `${f.percentage}%`, fontSize: 9.5, bold: true, alignment: 'center' },
                  ]),
                ],
              },
              layout: 'lightHorizontalLines',
              margin: [0, 0, 0, 20],
            },
          ]
        },
        {
          id: 'section4',
          keepTogether: true,
          pageBreakBefore: function (currentNode: any) { return currentNode.id === 'section4'; },
          stack: [
            { text: '4. MATRIKS REKOMENDASI RESPON (ACTION PLAN)', style: 'sectionHeader' },
            {
              table: {
                widths: [85, '*', 90, 75],
                body: [
                  [
                    { text: 'Tingkat Prioritas', style: 'tableHeader' },
                    { text: 'Rekomendasi Instruksi', style: 'tableHeader' },
                    { text: 'Penanggung Jawab', style: 'tableHeader' },
                    { text: 'Tenggat', style: 'tableHeader' },
                  ],
                  ...indicator.priorityRecommendations.map((rec: any) => [
                    { text: rec.priority, fontSize: 8.5, bold: true, color: '#dc2626', alignment: 'center' },
                    { text: rec.title, fontSize: 8.5, alignment: 'left' },
                    { text: rec.pic, fontSize: 8, alignment: 'left' },
                    { text: rec.deadline, fontSize: 8, alignment: 'center' },
                  ]),
                ],
              },
              layout: 'lightHorizontalLines',
              margin: [0, 0, 0, 18]
            },
          ]
        },
      ],
      styles: {
        sectionHeader: { fontSize: 11, bold: true, color: '#0f172a', alignment: 'left', margin: [0, 4, 0, 8] },
        tableHeader: { bold: true, fontSize: 9, color: '#0f172a', fillColor: '#f1f5f9', alignment: 'center' },
      },
    };

    const targetFilename = filename || `Analisis_Deviasi_${indicator.id.toUpperCase()}_Mimika.pdf`;

    (pdfMake as any).createPdf(docDefinition).download(targetFilename);
  },

  /**
   * Export Naskah Resmi Nota Dinas Bupati ke PDF Vector Pristine
   */
  exportBupatiReportPdf(report: any): void {
    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [50, 90, 50, 45],
      defaultStyle: {
        font: 'CustomFont',
        fontSize: 10,
        lineHeight: 1.45,
        alignment: 'justify',
        color: '#1e293b',
      },
      footer: (currentPage: number, pageCount: number) => ({
        columns: [
          { text: `Halaman ${currentPage} dari ${pageCount}`, alignment: 'right', fontSize: 8, color: '#565c63' },
        ],
        margin: [50, 12, 50, 0],
      }),
      content: [
        // ── Kop Surat ──────────────────────────────────────────────────────────
        { text: 'DOKUMEN REKOMENDASI KEBIJAKAN', fontSize: 13, bold: true, alignment: 'center', color: '#0f172a' },
        { text: 'ANALISIS KEBAN KANAN KEBIJAKAN DAERAH MIMIKA', fontSize: 11, bold: true, alignment: 'center', color: '#0d9488', margin: [0, 3, 0, 3] },
        { text: 'Badan Riset dan Inovasi Daerah (BRIDA) Kabupaten Mimika', fontSize: 8.5, alignment: 'center', color: '#565c63', margin: [0, 0, 0, 10] },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 2, lineColor: '#0f172a' }], margin: [0, 0, 0, 14] },
        // ── Judul Nota ─────────────────────────────────────────────────────────
        { text: report.title, fontSize: 13, bold: true, alignment: 'left', color: '#0f172a', margin: [0, 0, 0, 14] },
        // ── Metadata Nota ──────────────────────────────────────────────────────
        {
          table: {
            widths: [85, 6, '*'],
            body: [
              [{ text: 'PERIODE', bold: true, fontSize: 9, alignment: 'left' }, ':', { text: `${report.period}`, fontSize: 9, alignment: 'left' }],
              [{ text: 'PENERIMA', bold: true, fontSize: 9, alignment: 'left' }, ':', { text: `${report.recipient}`, fontSize: 9, alignment: 'left' }],
              [{ text: 'PENGIRIM', bold: true, fontSize: 9, alignment: 'left' }, ':', { text: `${report.sender}`, fontSize: 9, alignment: 'left' }],
              [{ text: 'TANGGAL RILIS', bold: true, fontSize: 9, alignment: 'left' }, ':', { text: `${report.date}`, fontSize: 9, alignment: 'left' }],
            ],
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 16],
        },
        // ── Ringkasan Eksekutif ────────────────────────────────────────────────
        {
          table: {
            widths: ['*'],
            body: [
              [
                {
                  text: [
                    { text: 'RINGKASAN EKSEKUTIF:\n', bold: true, fontSize: 9.5, color: '#0369a1' },
                    { text: stripCitationTokens(report.executiveSummary), fontSize: 9.5, italic: true, alignment: 'justify' },
                  ],
                  fillColor: '#f0f9ff',
                  margin: [12, 10, 12, 10],
                },
              ],
            ],
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 18],
        },
        // ── Seksi 1 ────────────────────────────────────────────────────────────
        { text: '1. KUMPULAN INDIKATOR DEVIASI SIGNIFIKAN', style: 'sectionHeader', margin: [0, 20, 0, 8] },
        {
          table: {
            widths: ['*', 90, 90, 90],
            body: [
              [
                { text: 'Indikator Pembangunan', style: 'tableHeader' },
                { text: 'Baseline Target', style: 'tableHeader' },
                { text: 'Realisasi Aktual', style: 'tableHeader' },
                { text: 'Status Deviasi', style: 'tableHeader' },
              ],
              ...report.deviations.map((d: any) => [
                { text: d.title, fontSize: 9, bold: true, alignment: 'left' },
                { text: d.baseline, fontSize: 8.5, alignment: 'left' },
                { text: d.realization, fontSize: 8.5, alignment: 'left' },
                { text: d.deviationText, fontSize: 8.5, bold: true, color: '#dc2626', alignment: 'left' },
              ]),
            ],
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 18],
        },
        // ── Seksi 2 ────────────────────────────────────────────────────────────
        { text: '2. SIMULASI DAMPAK KEBIJAKAN MAKRO / NASIONAL', style: 'sectionHeader', margin: [0, 20, 0, 8] },
        { text: `Kebijakan: ${report.nationalPolicyImpact.policyName}`, fontSize: 9.5, bold: true, color: '#0d9488', margin: [0, 0, 0, 6] },
        {
          ul: report.nationalPolicyImpact.simulationResults.map((res: string) => ({
            text: res,
            fontSize: 9.5,
            lineHeight: 1.4,
            alignment: 'justify',
            margin: [0, 2, 0, 2],
          })),
          margin: [0, 0, 0, 18],
        },
        // ── Seksi 3 ────────────────────────────────────────────────────────────
        { text: '3. REKOMENDASI ACTION PLAN EKSEKUTIF', style: 'sectionHeader', margin: [0, 20, 0, 8] },
        {
          ol: report.actionPriorities.map((act: string) => ({
            text: stripCitationTokens(act),
            fontSize: 9.5,
            lineHeight: 1.4,
            alignment: 'justify',
            margin: [0, 3, 0, 3],
          })),
          margin: [0, 0, 0, 28],
        },
        // ── Tanda Tangan ────────────────────────────────────────────────────────
        {
          columns: [
            { width: '*', text: '' },
            {
              width: 200,
              stack: [
                { text: 'Kepala Badan Riset & Inovasi,', fontSize: 9, alignment: 'center' },
                { text: '\n\n\n', fontSize: 9 },
                { text: 'Darius Sabon Rain, S.E., M.Ec.Dev.', fontSize: 9.5, bold: true, alignment: 'center' },
                { text: 'NIP. 19780412 200312 1 002', fontSize: 8.5, alignment: 'center', color: '#475569', margin: [0, 2, 0, 0] },
              ],
            },
          ],
        },
      ],
      styles: {
        sectionHeader: {
          fontSize: 11,
          bold: true,
          color: '#0f172a',
          alignment: 'left',
          margin: [0, 4, 0, 8],
        },
        tableHeader: {
          bold: true,
          fontSize: 9,
          color: '#0f172a',
          fillColor: '#f1f5f9',
          alignment: 'center',
        },
      },
    };

    const fontDefinitions: any = {
      CustomFont: {
        normal: 'Roboto-Regular.ttf',
        bold: 'Roboto-Medium.ttf',
        italics: 'Roboto-Italic.ttf',
        bolditalics: 'Roboto-MediumItalic.ttf',
      },
    };

    // Set VFS (konsisten dengan exportCustomFormattedArticlePdf)
    (pdfMake as any).vfs = { ...getRobotoVfs(), ...customVfs };
    (pdfMake as any).fonts = fontDefinitions;

    (pdfMake as any).createPdf(docDefinition).download('Nota_Dinas_Resmi_Bupati_Mimika_Maret_2026.pdf');
  },

  /**
   * Export DOM Element / Indicator to PDF using pdfMake
   */
  async exportElementToPdf(_elementId: string, filename: string, compareResult?: any): Promise<void> {
    if (!compareResult) {
      const indicator: any = {
        id: 'ind-export',
        name: 'Pendapatan Asli Daerah (PAD)',
        sector: 'Fiskal & Ekonomi',
        period: 'TA 2026',
        baseline: 'Rp 110 M',
        realization: 'Rp 85 M',
        deviationText: '-22.7% (KRITIS)',
        causalFactors: [
          { label: 'Evaluasi & Verifikasi Administratif Proyek', percentage: 45 },
          { factor: 'Eskalasi Biaya & Logistik Wilayah', percentage: 35 },
          { label: 'Faktor Hambatan Cuaca Ekstrem', percentage: 20 },
        ],
        priorityRecommendations: [
          { priority: 'TINGGI', title: 'Percepatan Proses Evaluasi Logistik', pic: 'Dinas PU & BRIDA', deadline: '30 Hari' },
        ],
        summary: 'Hasil evaluasi menunjukkan terjadinya deviasi kinerja pada indikator Pendapatan Asli Daerah.',
      };
      this.exportAnalyticsPdf(indicator, filename);
      return;
    }

    const devVal = compareResult.math?.deviationPercentage ?? compareResult.math?.deviationValue ?? 0;
    const devSign = devVal > 0 ? '+' : '';
    const deviationText = `${devSign}${devVal}% (${compareResult.math?.urgencyStatus || 'NORMAL'})`;

    const indicatorData: any = {
      id: 'ind-export',
      name: compareResult.math?.indicatorName || 'Analisis Deviasi',
      sector: compareResult.math?.sector || 'Pembangunan & Kebijakan Daerah',
      period: 'TA 2026',
      baseline: compareResult.math?.targetText || '100%',
      realization: compareResult.math?.realizationText || '0%',
      deviationText,
      causalFactors: (compareResult.causal?.causalFactors || []).map((f: any) => ({
        factor: f.factor,
        weightPercentage: f.weightPercentage,
      })),
      priorityRecommendations: (compareResult.causal?.recommendations || []).map((rec: any) => ({
        priority: rec.priority,
        actionTitle: rec.actionTitle,
        pic: rec.pic,
        deadline: rec.deadline,
      })),
      summary: compareResult.causal?.summary || 'Tidak ada ringkasan eksekutif.',
    };

    this.exportAnalyticsPdf(indicatorData, filename);
  },
};