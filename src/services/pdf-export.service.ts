import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import htmlToPdfmake from 'html-to-pdfmake'; // Impor pustaka parser HTML [1]

// Inisialisasi VFS pdfMake dengan biner Roboto bawaan — JANGAN pernah dioverwrite seluruhnya
const vfsFonts = (pdfFonts as any)?.pdfMake?.vfs || (pdfFonts as any)?.vfs || (pdfFonts as any);
if (vfsFonts) {
  (pdfMake as any).vfs = vfsFonts;
}

// Cache biner font kustom di memori untuk menghindari HTTP fetch berulang
const fontVfsCache: Record<string, string> = {};

/**
 * Interface Konfigurasi Tata Letak Halaman PDF Dinamis (OCP) [1]
 */
export interface PDFFormatConfig {
  fontFamily: 'Calibri' | 'Times New Roman' | 'Verdana' | 'Arial';
  fontSize: number;
  lineSpacing: number;
  marginCm: number;
}

/**
 * Mengunduh berkas biner font lokal secara asinkron dan mengonversinya ke Base64 [1].
 * Menggunakan cache in-memory untuk mencegah HTTP round-trip ganda pada ekspor berulang.
 */
async function fetchLocalFontToBase64(url: string): Promise<string> {
  if (fontVfsCache[url]) return fontVfsCache[url];

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Gagal memuat aset biner font dari jalur server lokal: ${url} (HTTP ${response.status})`);
  }
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1]; // Ambil data Base64 mentah
      fontVfsCache[url] = base64Data; // Simpan ke cache
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const PdfExportService = {
  /**
   * Mengambil draf HTML interaktif, menyuntikkan font kustom secara dinamis,
   * dan mencetak dokumen PDF formal dengan format presisi (WYSIWYG) [1].
   *
   * DESAIN ARSITEKTUR: Font kustom didaftarkan HANYA di dalam docDefinition.fonts,
   * BUKAN melalui mutasi properti global `pdfMake.fonts`, untuk mencegah polusi
   * state global yang merusak operasi ekspor PDF lain (Bupati Report, Analytics).
   */
  async exportCustomFormattedArticlePdf(
    htmlText: string,
    config: PDFFormatConfig,
    filename: string,
  ): Promise<void> {
    const fontFileMap: Record<string, { normal: string; bold: string; italics: string; bolditalics: string }> = {
      'Times New Roman': { normal: 'times.ttf', bold: 'timesbd.ttf', italics: 'timesi.ttf', bolditalics: 'timesbi.ttf' },
      'Arial': { normal: 'arial.ttf', bold: 'arialbd.ttf', italics: 'ariali.ttf', bolditalics: 'arialbi.ttf' },
      'Verdana': { normal: 'verdana.ttf', bold: 'verdanab.ttf', italics: 'verdanai.ttf', bolditalics: 'verdanaz.ttf' },
      'Calibri': { normal: 'calibri.ttf', bold: 'calibrib.ttf', italics: 'calibrii.ttf', bolditalics: 'calibriz.ttf' },
    };

    const files = fontFileMap[config.fontFamily] || fontFileMap['Arial'];
    // Nama key VFS deterministik berdasarkan nama asli berkas agar tidak menabrak kunci lain
    const vfsPrefix = files.normal.replace('.ttf', '');

    // 1. Ambil berkas font .ttf secara paralel dari /public/fonts/ dengan dukungan cache [1]
    const [vNormal, vBold, vItalics, vBoldItalics] = await Promise.all([
      fetchLocalFontToBase64(`/fonts/${files.normal}`),
      fetchLocalFontToBase64(`/fonts/${files.bold}`),
      fetchLocalFontToBase64(`/fonts/${files.italics}`),
      fetchLocalFontToBase64(`/fonts/${files.bolditalics}`),
    ]);

    // 2. Suntikkan biner font ke VFS pdfMake — TAMBAH ke VFS yang sudah ada, jangan replace seluruhnya [1]
    const currentVfs = (pdfMake as any).vfs || {};
    (pdfMake as any).vfs = {
      ...currentVfs, // Pertahankan Roboto bawaan agar html-to-pdfmake tidak crash
      [`${vfsPrefix}-Regular.ttf`]: vNormal,
      [`${vfsPrefix}-Bold.ttf`]: vBold,
      [`${vfsPrefix}-Italic.ttf`]: vItalics,
      [`${vfsPrefix}-BoldItalic.ttf`]: vBoldItalics,
    };

    // 3. Konversi satuan margin kertas dari Sentimeter ke Satuan Point (1 cm = ~28.3465 pt) [1]
    const marginPoints = Math.round(config.marginCm * 28.3465);

    // 4. Terjemahkan draf HTML menjadi representasi JSON AST pdfMake [1]
    //    html-to-pdfmake akan menggunakan font Roboto (tersedia di VFS bawaan) sebagai default
    const pdfContent = htmlToPdfmake(htmlText, { window: window });

    // 5. Susun dokumen definisi pdfMake — font kustom didaftarkan di sini, BUKAN secara global
    const docDefinition: any = {
      pageSize: 'A4',
      // Add extra top margin to accommodate header without overlapping content
      // Increase top margin to provide space for header and prevent overlap
      pageMargins: [marginPoints, marginPoints + 30, marginPoints, marginPoints],
      // Deklarasi font scoped ke dalam dokumen ini saja — tidak mencemari state global [1]
      fonts: {
        Roboto: {
          normal: 'Roboto-Regular.ttf',
          bold: 'Roboto-Medium.ttf',
          italics: 'Roboto-Italic.ttf',
          bolditalics: 'Roboto-MediumItalic.ttf',
        },
        CustomFont: {
          normal: `${vfsPrefix}-Regular.ttf`,
          bold: `${vfsPrefix}-Bold.ttf`,
          italics: `${vfsPrefix}-Italic.ttf`,
          bolditalics: `${vfsPrefix}-BoldItalic.ttf`,
        },
      },
      defaultStyle: {
        font: 'CustomFont',
        fontSize: config.fontSize,
        lineHeight: config.lineSpacing,
        alignment: 'justify',
      },
      header: {
        text: 'BRIDA SMART ANALYSIS — KABUPATEN MIMIKA',
        alignment: 'right',
        fontSize: 8,
        color: '#94a3b8',
        // Increase top margin for header to avoid overlapping body content
        margin: [marginPoints, 30, marginPoints, 0],
      },
      footer: (currentPage: number, pageCount: number) => ({
        columns: [
          { text: 'Naskah Publikasi Resmi BRIDA Kabupaten Mimika', fontSize: 8, color: '#94a3b8' },
          { text: `Halaman ${currentPage} dari ${pageCount}`, alignment: 'right', fontSize: 8, color: '#94a3b8' },
        ],
        margin: [marginPoints, 10, marginPoints, 0],
      }),
      content: pdfContent,
    };

    // 6. Jalankan perakitan dokumen dan unduh file PDF
    const targetFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdfMake.createPdf(docDefinition).download(targetFilename);
  },


  /**
   * Export Diagnostik Deviasi Indikator ke PDF Vector Pristine (pdfMake)
   */
  exportAnalyticsPdf(indicator: any, filename?: string): void {
    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [45, 55, 45, 40],
      defaultStyle: {
        font: 'Roboto',
        fontSize: 10,
        lineHeight: 1.4,
        alignment: 'justify',
        color: '#1e293b',
      },
      header: {
        text: 'BRIDA SMART ANALYSIS — KABUPATEN MIMIKA',
        alignment: 'right',
        fontSize: 8,
        color: '#64748b',
        margin: [45, 28, 45, 0],
      },
      footer: (currentPage: number, pageCount: number) => ({
        columns: [
          { text: `Tanggal Rilis: ${new Date().toLocaleDateString('id-ID')}`, fontSize: 8, color: '#94a3b8' },
          { text: `Halaman ${currentPage} dari ${pageCount}`, alignment: 'right', fontSize: 8, color: '#94a3b8' },
        ],
        margin: [45, 12, 45, 0],
      }),
      content: [
        // ── Judul Laporan ──────────────────────────────────────────────────────
        {
          text: 'LEMBAR DIAGNOSTIK & DEVIASI INDIKATOR',
          fontSize: 15,
          bold: true,
          color: '#0f172a',
          alignment: 'center',
          margin: [0, 0, 0, 4],
        },
        {
          text: `${indicator.name}  ·  ${indicator.sector}  ·  ${indicator.period}`,
          fontSize: 9,
          color: '#0d9488',
          bold: true,
          alignment: 'center',
          margin: [0, 0, 0, 12],
        },
        {
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: 505, y2: 0, lineWidth: 1.5, lineColor: '#0f172a' }],
          margin: [0, 0, 0, 18],
        },
        // ── Seksi 1 ────────────────────────────────────────────────────────────
        {
          text: '1. RINGKASAN DEVIASI CAPAIAN',
          style: 'sectionHeader',
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
                { text: indicator.baseline, fontSize: 13, bold: true, alignment: 'center' },
                { text: indicator.realization, fontSize: 13, bold: true, alignment: 'center' },
                { text: indicator.deviationText, fontSize: 13, bold: true, color: '#dc2626', alignment: 'center' },
              ],
            ],
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 20],
        },
        // ── Seksi 2 ────────────────────────────────────────────────────────────
        {
          text: '2. RINGKASAN EKSEKUTIF ANALISIS (AI-SYNTHESIS)',
          style: 'sectionHeader',
        },
        {
          text: indicator.summary || 'Hasil analisis deskriptif AI belum tersedia.',
          fontSize: 10,
          lineHeight: 1.55,
          alignment: 'justify',
          color: '#1e293b',
          margin: [0, 0, 0, 18],
        },
        // ── Seksi 3 ────────────────────────────────────────────────────────────
        {
          text: '3. ANALISIS FAKTOR PENYEBAB (AI — Causal Inference)',
          style: 'sectionHeader',
        },
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
        // ── Seksi 4 ────────────────────────────────────────────────────────────
        {
          text: '4. MATRIKS REKOMENDASI RESPON (ACTION PLAN)',
          style: 'sectionHeader',
        },
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

    const targetFilename = filename || `Analisis_Deviasi_${indicator.id.toUpperCase()}_Mimika.pdf`;
    pdfMake.createPdf(docDefinition).download(targetFilename);
  },

  /**
   * Export Naskah Resmi Nota Dinas Bupati ke PDF Vector Pristine (pdfMake)
   */
  exportBupatiReportPdf(report: any): void {
    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [50, 65, 50, 45],
      defaultStyle: {
        font: 'Roboto',
        fontSize: 10,
        lineHeight: 1.45,
        alignment: 'justify',
        color: '#1e293b',
      },
      header: {
        text: 'BRIDA SMART ANALYSIS — KABUPATEN MIMIKA',
        alignment: 'right',
        fontSize: 8,
        color: '#64748b',
        margin: [50, 30, 50, 0],
      },
      footer: (currentPage: number, pageCount: number) => ({
        columns: [
          { text: 'Dokumen Resmi Pemerintah Kabupaten Mimika', fontSize: 8, color: '#94a3b8' },
          { text: `Halaman ${currentPage} dari ${pageCount}`, alignment: 'right', fontSize: 8, color: '#94a3b8' },
        ],
        margin: [50, 12, 50, 0],
      }),
      content: [
        // ── Kop Surat ──────────────────────────────────────────────────────────
        { text: 'PEMERINTAH KABUPATEN MIMIKA', fontSize: 13, bold: true, alignment: 'center', color: '#0f172a' },
        { text: 'BADAN RISET DAN INOVASI DAERAH (BRIDA)', fontSize: 11, bold: true, alignment: 'center', color: '#0d9488', margin: [0, 3, 0, 3] },
        { text: 'Jl. Cenderawasih No. 1, Timika, Papua Tengah', fontSize: 8.5, alignment: 'center', color: '#64748b', margin: [0, 0, 0, 10] },
        {
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 2, lineColor: '#0f172a' }],
          margin: [0, 0, 0, 14],
        },
        // ── Metadata Nota ──────────────────────────────────────────────────────
        {
          table: {
            widths: [85, 6, '*'],
            body: [
              [{ text: 'PENERIMA', bold: true, fontSize: 9, alignment: 'left' }, ':', { text: report.recipient, fontSize: 9, bold: true, alignment: 'left' }],
              [{ text: 'PENGIRIM', bold: true, fontSize: 9, alignment: 'left' }, ':', { text: report.sender, fontSize: 9, alignment: 'left' }],
              [{ text: 'PERIODE', bold: true, fontSize: 9, alignment: 'left' }, ':', { text: `${report.period} (Rilis: ${report.date})`, fontSize: 9, alignment: 'left' }],
              [
                { text: 'PRIORITAS', bold: true, fontSize: 9, alignment: 'left' },
                ':',
                {
                  text: report.urgency,
                  fontSize: 9,
                  bold: true,
                  alignment: 'left',
                  color: (report.urgency || '').toLowerCase().includes('utama') || (report.urgency || '').toLowerCase().includes('tinggi')
                    ? '#dc2626'
                    : (report.urgency || '').toLowerCase().includes('menengah') || (report.urgency || '').toLowerCase().includes('sedang')
                      ? '#d97706'
                      : '#059669',
                },
              ],
            ],
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 16],
        },
        // ── Judul Nota ─────────────────────────────────────────────────────────
        { text: report.title, fontSize: 13, bold: true, alignment: 'center', color: '#0f172a', margin: [0, 0, 0, 14] },
        // ── Ringkasan Eksekutif ────────────────────────────────────────────────
        {
          table: {
            widths: ['*'],
            body: [
              [
                {
                  text: [
                    { text: 'RINGKASAN EKSEKUTIF:\n', bold: true, fontSize: 9.5, color: '#0369a1' },
                    { text: report.executiveSummary, fontSize: 9.5, italic: true, alignment: 'justify' },
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
        { text: '1. KUMPULAN INDIKATOR DEVIASI SIGNIFIKAN', style: 'sectionHeader' },
        {
          table: {
            widths: ['*', 65, 65, 90],
            body: [
              [
                { text: 'Indikator Pembangunan', style: 'tableHeader' },
                { text: 'Baseline', style: 'tableHeader' },
                { text: 'Realisasi', style: 'tableHeader' },
                { text: 'Status Deviasi', style: 'tableHeader' },
              ],
              ...report.deviations.map((d: any) => [
                { text: d.title, fontSize: 9, bold: true, alignment: 'left' },
                { text: d.baseline, fontSize: 8.5, alignment: 'center' },
                { text: d.realization, fontSize: 8.5, alignment: 'center' },
                { text: d.deviationText, fontSize: 8.5, bold: true, color: '#dc2626', alignment: 'center' },
              ]),
            ],
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 18],
        },
        // ── Seksi 2 ────────────────────────────────────────────────────────────
        { text: '2. SIMULASI DAMPAK KEBIJAKAN MAKRO / NASIONAL', style: 'sectionHeader' },
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
        { text: '3. REKOMENDASI ACTION PLAN BUPATI', style: 'sectionHeader' },
        {
          ol: report.actionPriorities.map((act: string) => ({
            text: act,
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
                { text: 'Tim Analis Kebijakan BRIDA,', fontSize: 9, alignment: 'center' },
                { text: '\n\n\n', fontSize: 9 },
                { text: 'Kepala BRIDA Kabupaten Mimika', fontSize: 9.5, bold: true, alignment: 'center' },
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

    pdfMake.createPdf(docDefinition).download('Nota_Dinas_Resmi_Bupati_Mimika_Maret_2026.pdf');
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
          { label: 'Evaluasi & Verifikasi Administrasi Proyek', percentage: 45 },
          { label: 'Eskalasi Biaya & Logistik Wilayah', percentage: 35 },
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
        label: f.factor,
        percentage: f.weightPercentage,
      })),
      priorityRecommendations: (compareResult.causal?.recommendations || []).map((rec: any) => ({
        priority: rec.priority,
        title: rec.actionTitle,
        pic: rec.pic,
        deadline: rec.deadline,
      })),
      summary: compareResult.causal?.summary || 'Tidak ada ringkasan eksekutif.',
    };

    this.exportAnalyticsPdf(indicatorData, filename);
  },
};