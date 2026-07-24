import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { IndicatorMatrixItem } from './mock-data.service';

// Initialize pdfMake virtual file system for Roboto fonts
const vfsFonts = (pdfFonts as any)?.pdfMake?.vfs || (pdfFonts as any)?.vfs || (pdfFonts as any);
if (vfsFonts) {
  (pdfMake as any).vfs = vfsFonts;
}

export const PdfExportService = {
  /**
   * Export Diagnostik Deviasi Indikator ke PDF Vector Pristine (pdfMake)
   */
  exportAnalyticsPdf(indicator: IndicatorMatrixItem): void {
    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [30, 30, 30, 30],
      header: {
        text: 'BRIDA SMART ANALYSIS — KABUPATEN MIMIKA',
        alignment: 'right',
        fontSize: 8,
        color: '#64748b',
        margin: [30, 15, 30, 0],
      },
      footer: (currentPage: number, pageCount: number) => ({
        columns: [
          { text: `Tanggal Rilis: ${new Date().toLocaleDateString('id-ID')}`, fontSize: 8, color: '#64748b' },
          { text: `Halaman ${currentPage} dari ${pageCount}`, alignment: 'right', fontSize: 8, color: '#64748b' },
        ],
        margin: [30, 10, 30, 0],
      }),
      content: [
        // Title Header
        {
          text: 'LEMBAR DIAGNOSTIK & DEVIASI INDIKATOR',
          fontSize: 16,
          bold: true,
          color: '#0f172a',
          margin: [0, 0, 0, 4],
        },
        {
          text: `Indikator: ${indicator.name} | Sektor: ${indicator.sector} | Periode: ${indicator.period}`,
          fontSize: 9.5,
          color: '#0d9488',
          bold: true,
          margin: [0, 0, 0, 14],
        },

        // Divider Line
        {
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: 535, y2: 0, lineWidth: 1.5, lineColor: '#0f172a' }],
          margin: [0, 0, 0, 16],
        },

        // Ringkasan Deviasi Table
        {
          text: '1. RINGKASAN DEVIASI CAPAIAN',
          fontSize: 11,
          bold: true,
          color: '#0f172a',
          margin: [0, 0, 0, 8],
        },
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
                { text: indicator.baseline, fontSize: 12, bold: true, alignment: 'center' },
                { text: indicator.realization, fontSize: 12, bold: true, alignment: 'center' },
                { text: indicator.deviationText, fontSize: 12, bold: true, color: '#dc2626', alignment: 'center' },
              ],
            ],
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 20],
        },

        // Causal Inference Section
        {
          text: '2. ANALISIS FAKTOR PENYEBAB (AI - Causal Inference)',
          fontSize: 11,
          bold: true,
          color: '#0f172a',
          margin: [0, 0, 0, 8],
        },
        {
          table: {
            widths: ['*', 70],
            body: [
              [
                { text: 'Faktor Penyebab Utama', style: 'tableHeader' },
                { text: 'Kontribusi', style: 'tableHeader' },
              ],
              ...indicator.causalFactors.map((f, i) => [
                { text: `Faktor ${i + 1}: ${f.label}`, fontSize: 9.5 },
                { text: `${f.percentage}%`, fontSize: 9.5, bold: true, alignment: 'center' },
              ]),
            ],
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 20],
        },

        // Priority Action Plan Section
        {
          text: '3. MATRIKS REKOMENDASI RESPON (ACTION PLAN)',
          fontSize: 11,
          bold: true,
          color: '#0f172a',
          margin: [0, 0, 0, 8],
        },
        {
          table: {
            widths: [95, '*', 95, 80],
            body: [
              [
                { text: 'Tingkat Prioritas', style: 'tableHeader' },
                { text: 'Rekomendasi Instruksi', style: 'tableHeader' },
                { text: 'Penanggung Jawab', style: 'tableHeader' },
                { text: 'Tenggat Waktu', style: 'tableHeader' },
              ],
              ...indicator.priorityRecommendations.map((rec) => [
                { text: rec.priority, fontSize: 8.5, bold: true, color: '#dc2626' },
                { text: rec.title, fontSize: 8.5, bold: true },
                { text: rec.pic, fontSize: 8 },
                { text: rec.deadline, fontSize: 8, alignment: 'center' },
              ]),
            ],
          },
          layout: 'lightHorizontalLines',
        },
      ],
      styles: {
        tableHeader: {
          bold: true,
          fontSize: 9.5,
          color: '#0f172a',
          fillColor: '#f1f5f9',
          alignment: 'center',
        },
      },
    };

    pdfMake.createPdf(docDefinition).download(`Analisis_Deviasi_${indicator.id.toUpperCase()}_Mimika.pdf`);
  },

  /**
   * Export Naskah Resmi Nota Dinas Bupati ke PDF Vector Pristine (pdfMake)
   */
  exportBupatiReportPdf(report: any): void {
    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [35, 35, 35, 35],
      header: {
        text: 'BRIDA SMART ANALYSIS — KABUPATEN MIMIKA',
        alignment: 'right',
        fontSize: 8,
        color: '#64748b',
        margin: [35, 18, 35, 0],
      },
      footer: (currentPage: number, pageCount: number) => ({
        columns: [
          { text: 'Dokumen Resmi Pemerintah Kabupaten Mimika', fontSize: 8, color: '#64748b' },
          { text: `Halaman ${currentPage} dari ${pageCount}`, alignment: 'right', fontSize: 8, color: '#64748b' },
        ],
        margin: [35, 10, 35, 0],
      }),
      content: [
        // Kop Naskah Resmi
        { text: 'PEMERINTAH KABUPATEN MIMIKA', fontSize: 13, bold: true, alignment: 'center', color: '#0f172a' },
        { text: 'BADAN RISET DAN INOVASI DAERAH (BRIDA)', fontSize: 11, bold: true, alignment: 'center', color: '#0d9488', margin: [0, 2, 0, 4] },
        { text: 'Jl. Cenderawasih No. 1, Timika, Papua Tengah', fontSize: 8.5, alignment: 'center', color: '#475569', margin: [0, 0, 0, 10] },

        {
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: 525, y2: 0, lineWidth: 2, lineColor: '#0f172a' }],
          margin: [0, 0, 0, 16],
        },

        // Metadata Header
        {
          table: {
            widths: [80, 5, '*'],
            body: [
              [{ text: 'PENERIMA', bold: true, fontSize: 9 }, ':', { text: report.recipient, fontSize: 9, bold: true }],
              [{ text: 'PENGIRIM', bold: true, fontSize: 9 }, ':', { text: report.sender, fontSize: 9 }],
              [{ text: 'PERIODE', bold: true, fontSize: 9 }, ':', { text: `${report.period} (Rilis: ${report.date})`, fontSize: 9 }],
              [{ text: 'SIFAT', bold: true, fontSize: 9 }, ':', { text: report.urgency, fontSize: 9, bold: true, color: '#dc2626' }],
            ],
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 16],
        },

        // Title
        { text: report.title, fontSize: 14, bold: true, alignment: 'center', color: '#0f172a', margin: [0, 0, 0, 14] },

        // Ringkasan Eksekutif Box
        {
          table: {
            widths: ['*'],
            body: [
              [
                {
                  text: [
                    { text: 'RINGKASAN EKSEKUTIF:\n', bold: true, fontSize: 9.5, color: '#0369a1' },
                    { text: report.executiveSummary, fontSize: 9.5, italic: true },
                  ],
                  fillColor: '#f0f9ff',
                  margin: [10, 10, 10, 10],
                },
              ],
            ],
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 16],
        },

        // Indikator Deviasi Signifikan
        { text: '1. KUMPULAN INDIKATOR DEVIASI SIGNIFIKAN', fontSize: 11, bold: true, color: '#0f172a', margin: [0, 0, 0, 8] },
        {
          table: {
            widths: ['*', 70, 70, 90],
            body: [
              [
                { text: 'Indikator Pembangunan', style: 'tableHeader' },
                { text: 'Baseline', style: 'tableHeader' },
                { text: 'Realisasi', style: 'tableHeader' },
                { text: 'Status Deviasi', style: 'tableHeader' },
              ],
              ...report.deviations.map((d: any) => [
                { text: d.title, fontSize: 9, bold: true },
                { text: d.baseline, fontSize: 8.5, alignment: 'center' },
                { text: d.realization, fontSize: 8.5, alignment: 'center' },
                { text: d.deviationText, fontSize: 8.5, bold: true, color: '#dc2626', alignment: 'center' },
              ]),
            ],
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 16],
        },

        // Dampak Kebijakan Nasional
        { text: '2. SIMULASI DAMPAK KEBIJAKAN MAKRO / NASIONAL', fontSize: 11, bold: true, color: '#0f172a', margin: [0, 0, 0, 6] },
        { text: `Kebijakan: ${report.nationalPolicyImpact.policyName}`, fontSize: 9.5, bold: true, color: '#0d9488', margin: [0, 0, 0, 4] },
        {
          ul: report.nationalPolicyImpact.simulationResults.map((res: string) => ({
            text: res,
            fontSize: 9,
            margin: [0, 1, 0, 1],
          })),
          margin: [0, 0, 0, 16],
        },

        // Action Plan Prioritas
        { text: '3. REKOMENDASI ACTION PLAN BUPATI', fontSize: 11, bold: true, color: '#0f172a', margin: [0, 0, 0, 6] },
        {
          ol: report.actionPriorities.map((act: string) => ({
            text: act,
            fontSize: 9,
            bold: true,
            margin: [0, 2, 0, 2],
          })),
          margin: [0, 0, 0, 24],
        },

        // Signature block
        {
          columns: [
            { width: '*', text: '' },
            {
              width: 200,
              text: [
                { text: 'Tim Analis Kebijakan BRIDA,\n\n\n\n', fontSize: 9, alignment: 'center' },
                { text: 'Kepala BRIDA Kabupaten Mimika\n', fontSize: 9.5, bold: true, alignment: 'center' },
                { text: 'NIP. 19780412 200312 1 002', fontSize: 8.5, alignment: 'center', color: '#475569' },
              ],
            },
          ],
        },
      ],
      styles: {
        tableHeader: {
          bold: true,
          fontSize: 9,
          color: '#0f172a',
          fillColor: '#f1f5f9',
          alignment: 'center',
        },
      },
    };

    pdfMake.createPdf(docDefinition).download('Nota_Dinas_Resmi_Bupati_Mimika_Maret_2026.pdf');
  },

  /**
   * Export DOM Element / Indicator to PDF using pdfMake
   */
  async exportElementToPdf(_elementId: string, _filename: string): Promise<void> {
    const indicator: any = {
      id: 'ind-export',
      name: 'Pendapatan Asli Daerah (PAD)',
      sector: 'Fiskal & Ekonomi',
      baseline: 'Rp 110 M',
      realization: 'Rp 85 M',
      deviationPercentage: -22.7,
      urgencyStatus: 'KRITIS',
      targetValue: 110,
      realizationValue: 85,
      unitPrefix: 'Rp ',
      unitSuffix: ' M',
    };
    this.exportAnalyticsPdf(indicator);
  },
};
