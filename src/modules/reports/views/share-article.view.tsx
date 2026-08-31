import React, { useState, useEffect, useRef } from 'react';
import { ReportService } from '../../../services/report.service';
import { PdfExportService } from '../../../services/pdf-export.service';
import { MarkupConverter } from '../../ai-assistant/utils/markup-converter.util';
import {
  Download,
  Loader2,
  AlertCircle,
  Building,
  Link2,
  CheckCheck,
} from 'lucide-react';

export const ShareArticleView: React.FC = () => {
  const id = React.useMemo(() => {
    try {
      return window.location.pathname.split('/').pop() || '';
    } catch {
      return '';
    }
  }, []);
  const [article, setArticle] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [pageCount, setPageCount] = useState(1);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }).catch(() => {
      // Fallback for browsers without clipboard API
      const ta = document.createElement('textarea');
      ta.value = window.location.href;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    });
  };

  useEffect(() => {
    const fetchSharedArticle = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setErrorMsg(null);
        const data = await ReportService.getPublicSharedArticle(id);
        setArticle(data);
      } catch (err: any) {
        console.error('Gagal mengambil artikel publik:', err);
        setErrorMsg(err.message || 'Gagal memuat artikel.');
      } finally {
        setLoading(false);
      }
    };

    fetchSharedArticle();
  }, [id]);

  const handleExportPdf = async () => {
    if (!article) return;
    setIsExportingPdf(true);
    try {
      // Dapatkan naskah bersih tanpa Kop Surat mentah untuk mencegah duplikasi
      const cleanBody = stripCoverPage(article.content);

      // Siapkan HTML untuk diekspor ke PDF yang berisi isi naskah bersih langsung tanpa cover
      const printHtml = `
        <div style="font-family: 'Calibri', sans-serif; color: #1e293b; background: white; font-size: 11pt; line-height: 1.18; padding: 20px;">
          <style>
            p { line-height: 1.18 !important; margin-top: 0 !important; margin-bottom: 14px !important; }
            h1 { font-size: 1.4em; font-weight: 700; margin: 20px 0 10px !important; text-transform: uppercase; }
            h2 { font-size: 1.2em; font-weight: 700; margin: 18px 0 8px !important; text-transform: uppercase; }
            h3 { font-size: 1.05em; font-weight: 600; margin: 14px 0 6px !important; }
            table { border-collapse: collapse !important; width: 100% !important; margin: 16px 0 28px !important; }
            td, th { border: 1px solid #cbd5e1; padding: 6px 10px; vertical-align: top; }
            th { font-weight: 700; background-color: #f8fafc; }
            ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 14px; }
            ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 14px; }
            .no-print { display: none !important; }
          </style>
          ${cleanBody}
        </div>
      `;

      await PdfExportService.exportCustomFormattedArticlePdf(
        printHtml,
        {
          fontFamily: 'Arial',
          fontSize: 11,
          lineSpacing: 1.18,
          marginCm: 2.5,
        },
        `BRIDA_Artikel_${article.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      );
    } catch (err: any) {
      alert(`Gagal mengekspor PDF: ${err.message || 'Terjadi kesalahan'}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const stripCoverPage = (htmlString: string): string => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, 'text/html');
      
      // Hapus seluruh paragraf rata tengah di awal naskah yang berisi tulisan Kop Surat
      const paragraphs = Array.from(doc.body.querySelectorAll('p, div, h1, h2, hr'));
      
      for (const el of paragraphs) {
        const text = el.textContent?.toUpperCase() || '';
        
        const isHeaderWord = text.includes('PEMERINTAH KABUPATEN MIMIKA') || 
                             text.includes('BADAN RISET DAN INOVASI') || 
                             text.includes('JALAN CENDERAWASIH') || 
                             text.includes('DOKUMEN PUBLIKASI ILMIAH') ||
                             text.includes('KABUPATEN MIMIKA') ||
                             text.includes('SP 3');
                             
        if (isHeaderWord || el.tagName === 'HR') {
          el.remove();
        }
        
        // Stop checking setelah kita melewati HR pertama
        if (el.tagName === 'HR') {
          break;
        }
      }
      
      return doc.body.innerHTML;
    } catch {
      return htmlString;
    }
  };

  const PAGE_W = 794;
  const PAGE_H = 1123;
  const PAGE_GAP = 24;
  const marginPx = Math.round(2.5 * (96 / 2.54)); // 94px for 2.5cm margin

  // Bersihkan konten dari Kop Surat mentah, lalu konversi markdown ke HTML resmi (tanpa token sitasi)
  const cleanContent = React.useMemo(() => {
    if (!article?.content) return '';
    const stripped = stripCoverPage(article.content);
    return MarkupConverter.toHTML(stripped);
  }, [article?.content]);

  // Hitung halaman dinamis & sisipkan spacer di DOM agar melewati gap antar kertas
  useEffect(() => {
    const container = contentRef.current;
    if (!container || loading || !article) return;

    // Bersihkan spacer lama terlebih dahulu
    const existingSpacers = container.querySelectorAll('.static-page-spacer');
    existingSpacers.forEach(el => el.remove());

    const usableH = PAGE_H - marginPx * 2;
    const children = Array.from(container.children) as HTMLElement[];
    
    let accHeight = 0;
    let computedPages = 1;

    children.forEach((el) => {
      const style = window.getComputedStyle(el);
      const marginTop = parseFloat(style.marginTop) || 0;
      const marginBottom = parseFloat(style.marginBottom) || 0;
      const elHeight = el.offsetHeight + marginTop + marginBottom;

      if (accHeight + elHeight > usableH) {
        // Meluap -> Sisipkan spacer agar paragraf melompati gap antar kertas A4
        const remaining = Math.max(0, usableH - accHeight);
        const spacerH = remaining + PAGE_GAP + 2 * marginPx;

        const spacer = document.createElement('div');
        spacer.className = 'static-page-spacer';
        spacer.style.height = `${spacerH}px`;
        spacer.style.display = 'block';
        spacer.style.background = 'transparent';
        spacer.style.pointerEvents = 'none';

        container.insertBefore(spacer, el);

        accHeight = elHeight;
        computedPages += 1;
      } else {
        accHeight += elHeight;
      }
    });

    setPageCount(computedPages);
  }, [cleanContent, loading, article, marginPx]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-roboto">
        <Loader2 className="w-8 h-8 text-teal-700 animate-spin mb-2" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Memuat Artikel BRIDA...</span>
      </div>
    );
  }

  if (errorMsg || !article) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-roboto p-4">
        <div className="max-w-md w-full bg-white border border-red-300 p-6 rounded-none space-y-4 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Gagal Memuat Artikel</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {errorMsg || 'Artikel yang Anda cari tidak ditemukan atau telah dihapus.'}
          </p>
          <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-3">
            Badan Riset dan Inovasi Daerah (BRIDA) Kabupaten Mimika
          </div>
        </div>
      </div>
    );
  }

  const totalCanvasH = pageCount * PAGE_H + (pageCount - 1) * PAGE_GAP;

  return (
    <div className="min-h-screen bg-slate-700 font-roboto py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-350 p-4 rounded-none gap-4">
          <div className="flex items-center gap-3">
            <Building className="w-8 h-8 text-teal-800 shrink-0" />
            <div>
              <span className="text-[9px] font-black text-teal-700 uppercase tracking-widest block">Portal Publikasi Resmi</span>
              <h1 className="text-xs font-black text-slate-900 uppercase tracking-wider">Badan Riset &amp; Inovasi Daerah Mimika</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold transition-colors cursor-pointer rounded-none uppercase tracking-wider border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
            >
              {copySuccess ? <CheckCheck size={12} className="text-emerald-600" /> : <Link2 size={12} />}
              <span>{copySuccess ? 'Tersalin!' : 'Salin Link'}</span>
            </button>
            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 disabled:bg-slate-300 transition-colors cursor-pointer rounded-none uppercase tracking-wider"
            >
              {isExportingPdf ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              <span>{isExportingPdf ? 'Mencetak...' : 'Unduh PDF Resmi'}</span>
            </button>
          </div>
        </div>

        {/* Responsive Horizontal Scroll wrapper for A4 Canvas */}
        <div className="w-full overflow-x-auto pb-6 flex justify-center">
          <div 
            className="relative select-none text-left shrink-0 animate-in fade-in duration-200"
            style={{
              width: `${PAGE_W}px`,
              height: `${totalCanvasH}px`,
            }}
          >
            {/* Layer 1: Page Sheets */}
            {Array.from({ length: pageCount }).map((_, i) => (
              <div
                key={i}
                className="absolute bg-white"
                style={{
                  left: 0,
                  top: `${i * (PAGE_H + PAGE_GAP)}px`,
                  width: `${PAGE_W}px`,
                  height: `${PAGE_H}px`,
                  boxShadow: [
                    '0 1px 3px rgba(0,0,0,0.06)',
                    '0 4px 16px rgba(0,0,0,0.08)',
                    '0 12px 32px rgba(0,0,0,0.05)',
                  ].join(', '),
                  border: '1px solid #cbd5e1',
                  zIndex: 0,
                }}
              >
                {/* Page Number indicator */}
                <span
                  className="absolute bottom-4 right-5 text-[8px] font-black text-slate-355 uppercase tracking-widest select-none pointer-events-none"
                >
                  HALAMAN {i + 1} dari {pageCount}
                </span>
              </div>
            ))}

            {/* Layer 2: Transparent Article Text Content Overlay */}
            <div
              id="share-article-content-container"
              className="absolute text-left"
              style={{
                left: 0,
                top: 0,
                width: `${PAGE_W}px`,
                minHeight: `${totalCanvasH}px`,
                padding: `${marginPx}px`,
                boxSizing: 'border-box',
                zIndex: 1,
                background: 'transparent',
              }}
            >
              <style dangerouslySetInnerHTML={{ __html: `
                .article-preview-content {
                  font-family: 'Calibri', sans-serif;
                  font-size: 11pt;
                  line-height: 1.18;
                  color: #1e293b;
                }
                .article-preview-content p {
                  line-height: 1.18 !important;
                  margin-top: 0 !important;
                  margin-bottom: 14px !important;
                }
                /* Mengatur spasi rapat khusus untuk baris Kop Surat (teks rata tengah) */
                .article-preview-content p[style*="text-align: center"],
                .article-preview-content p[style*="text-align:center"],
                .article-preview-content div[style*="text-align: center"],
                .article-preview-content div[style*="text-align:center"] {
                  margin-bottom: 6px !important;
                  line-height: 1.3 !important;
                  letter-spacing: 0.02em;
                }
                .article-preview-content td p, 
                .article-preview-content th p, 
                .article-preview-content li p { 
                  margin-bottom: 0 !important; 
                }
                .article-preview-content h1 { font-size: 1.4em; font-weight: 700; margin: 20px 0 10px !important; }
                .article-preview-content h2 { font-size: 1.2em; font-weight: 700; margin: 18px 0 8px !important; }
                .article-preview-content h3 { font-size: 1.05em; font-weight: 600; margin: 14px 0 6px !important; }
                
                /* Desain double-line Kop Surat Resmi Pemerintah */
                .article-preview-content hr {
                  border-top: 2.5px solid #0f172a !important;
                  border-bottom: 0.75px solid #0f172a !important;
                  height: 4.5px !important;
                  border-left: none !important;
                  border-right: none !important;
                  margin: 12px 0 18px 0 !important;
                  opacity: 1 !important;
                  padding: 0 !important;
                }
                
                .article-preview-content table {
                  border-collapse: collapse !important;
                  table-layout: fixed !important;
                  width: 100% !important;
                  margin: 16px 0 28px !important;
                  overflow: hidden !important;
                }
                .article-preview-content td, 
                .article-preview-content th {
                  min-width: 80px;
                  border: 1px solid #cbd5e1;
                  padding: 6px 10px;
                  vertical-align: top;
                  box-sizing: border-box;
                  word-break: normal;
                  overflow-wrap: break-word;
                }
                .article-preview-content th { font-weight: 700; text-align: left; background: rgba(248,250,252,0.95); }
                .article-preview-content tr { page-break-inside: avoid !important; break-inside: avoid !important; }
                .article-preview-content img { max-width: 100% !important; height: auto !important; margin: 16px 0; border: 1px solid #cbd5e1; }
                .article-preview-content ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 14px; }
                .article-preview-content ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 14px; }
                [data-auto-page-spacer] {
                  display: block;
                  background: transparent !important;
                  cursor: default;
                  pointer-events: none;
                  user-select: none;
                }
              `}} />
              <div
                ref={contentRef}
                className="article-preview-content"
                dangerouslySetInnerHTML={{ __html: cleanContent }}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ShareArticleView;
