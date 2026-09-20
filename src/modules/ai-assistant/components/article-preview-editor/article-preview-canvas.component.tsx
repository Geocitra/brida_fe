import React, { useRef, useState, useEffect, useCallback } from 'react';
import { EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { Loader2, Download, Send, FileText } from 'lucide-react';

interface ArticlePreviewCanvasProps {
  editor: Editor | null;
  lineSpacing: number;
  marginCm: number;
  activeTableElement: HTMLTableElement | null;
  onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  onStartTableResize?: (
    event: React.MouseEvent<HTMLDivElement>,
    mode: 'column' | 'row',
    index: number,
    tableElement: HTMLTableElement
  ) => void;
  isSaving: boolean;
  isPrinting: boolean;
  isExportingDocx?: boolean;
  isDirty: boolean;
  onSaveAndBack: () => void;
  onPrint: () => void;
  onExportDocx?: () => void;
  onShareWa?: () => void;
  fontSize: string;
  fontFamily: string;
  zoomLevel: number;
  onPageCountChange?: (count: number) => void;
}

const PAGE_W = 794;   // 210mm pada 96 DPI (Standar Lebar Kertas A4)
const PAGE_H = 1123;  // 297mm pada 96 DPI (Standar Tinggi Kertas A4)
const PAGE_GAP = 28;  // Jarak fisik antar lembar kertas A4 (px)

/**
 * Mengambil blok-blok atomik yang dapat dipaginasi secara mandiri.
 * Mendekomposisi elemen majemuk (seperti <ul>/<ol> menjadi <li>)
 * agar setiap butir list dapat berpindah halaman secara alami seperti di Word.
 * Tabel diperlakukan sebagai satu unit utuh agar baris tabel tidak terbelah di celah.
 */
function getPaginatableBlocks(pm: HTMLElement): HTMLElement[] {
  const blocks: HTMLElement[] = [];

  Array.from(pm.children).forEach((child) => {
    const el = child as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === 'ul' || tag === 'ol') {
      const items = Array.from(el.children).filter(
        (c) => c.tagName.toLowerCase() === 'li'
      ) as HTMLElement[];
      if (items.length > 0) {
        blocks.push(...items);
      } else {
        blocks.push(el);
      }
    } else {
      // Tabel, paragraf, heading, blockquote, div diperlakukan sebagai blok utuh
      blocks.push(el);
    }
  });

  return blocks;
}

export const ArticlePreviewCanvas: React.FC<ArticlePreviewCanvasProps> = ({
  editor,
  lineSpacing,
  marginCm,
  onScroll,
  isSaving,
  isPrinting,
  isExportingDocx = false,
  onPrint,
  onExportDocx,
  onShareWa,
  fontSize,
  fontFamily,
  zoomLevel,
  onPageCountChange,
}) => {
  const marginPx = Math.round(marginCm * (96 / 2.54));
  const pageContentH = PAGE_H - 2 * marginPx;
  const pageJumpH = 2 * marginPx + PAGE_GAP;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState<number>(1);
  const isPaginatingRef = useRef(false);
  const debounceTimerRef = useRef<any>(null);

  // ── MESIN PAGINASI PRESISI NYATA A4 (TRUE DOM RECT PAGINATION ALA MS WORD) ──
  const applyWordStylePagination = useCallback(() => {
    if (!wrapperRef.current || isPaginatingRef.current) return;
    const pm = wrapperRef.current.querySelector('.ProseMirror') as HTMLElement | null;
    if (!pm) return;

    isPaginatingRef.current = true;

    try {
      // 1. Reset seluruh margin paginasi sementara untuk mengukur tata letak murni
      const previouslyModified = pm.querySelectorAll('[data-page-margin-added]');
      previouslyModified.forEach((el: any) => {
        el.style.removeProperty('--page-push-margin');
        el.style.removeProperty('margin-top');
        delete el.dataset.pageMarginAdded;
      });

      Array.from(pm.children).forEach((el: any) => {
        if (el.dataset?.pageMarginAdded) {
          el.style.removeProperty('--page-push-margin');
          el.style.removeProperty('margin-top');
          delete el.dataset.pageMarginAdded;
        }
      });

      // Paksa browser melakukan reflow kalkulasi layout bersih
      void pm.offsetHeight;

      const blocks = getPaginatableBlocks(pm);
      if (blocks.length === 0) {
        setPageCount(1);
        onPageCountChange?.(1);
        return;
      }

      const pageSlotH = PAGE_H + PAGE_GAP;
      const pageAvailableH = PAGE_H - 2 * marginPx;
      let maxPageReached = 0;

      // 2. Evaluasi sekuensial blok demi blok berdasarkan koordinat fisik riil DOM
      for (let idx = 0; idx < blocks.length; idx++) {
        const el = blocks[idx];
        const pmRect = pm.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();

        // Posisi absolut elemen di dalam kanvas kertas A4 (diskalakan bebas zoom)
        const actualTop = (elRect.top - pmRect.top) / zoomLevel + marginPx;
        const actualHeight = elRect.height / zoomLevel;
        const actualBottom = actualTop + actualHeight;

        // Halaman lembar A4 tempat puncak elemen saat ini berada
        const currentPageIdx = Math.max(0, Math.floor(actualTop / pageSlotH));
        const pageSheetTop = currentPageIdx * pageSlotH;
        const pageSafeTop = pageSheetTop + marginPx;
        const pageSafeBottom = pageSheetTop + PAGE_H - marginPx;
        const nextPageSafeTop = (currentPageIdx + 1) * pageSlotH + marginPx;

        // Cek manual page break node
        const isPageBreak = el.getAttribute('data-type') === 'page-break';
        if (isPageBreak) {
          const pushDistance = nextPageSafeTop - actualTop;
          if (pushDistance > 0) {
            el.style.setProperty('--page-push-margin', `${pushDistance}px`);
            el.style.setProperty('margin-top', `${pushDistance}px`, 'important');
            el.dataset.pageMarginAdded = 'true';
            const targetPageIdx = Math.floor(nextPageSafeTop / pageSlotH);
            if (targetPageIdx > maxPageReached) maxPageReached = targetPageIdx;
            void el.offsetHeight;
          }
          continue;
        }

        // Cek apakah elemen adalah Heading atau Caption Judul Tabel / Gambar
        const tag = el.tagName.toUpperCase();
        const isHeading = ['H1', 'H2', 'H3', 'H4', 'H5'].includes(tag);
        const text = el.textContent?.trim().toLowerCase() || '';
        const isCaption =
          tag === 'P' &&
          (text.startsWith('tabel') ||
           text.startsWith('grafik') ||
           text.startsWith('gambar') ||
           text.startsWith('diagram') ||
           text.startsWith('bagan') ||
           (Boolean(el.querySelector('strong')) && text.length < 100));

        let shouldKeepWithNext = false;
        if ((isHeading || isCaption) && idx < blocks.length - 1) {
          const nextEl = blocks[idx + 1];
          const nextRect = nextEl.getBoundingClientRect();
          const nextH = nextRect.height / zoomLevel;
          const nextTag = nextEl.tagName.toUpperCase();
          const isNextTable = nextTag === 'TABLE' || nextEl.classList.contains('tableWrapper');
          // Untuk tabel: butuh ruang penuh tabel agar tidak terpotong dari judulnya
          const neededRoom = isNextTable ? Math.min(nextH, pageAvailableH) : Math.min(nextH, 150);
          if (actualBottom + neededRoom > pageSafeBottom) {
            shouldKeepWithNext = true;
          }
        }

        // Evaluasi apakah elemen butuh didorong ke halaman berikutnya
        const isTallerThanPage = actualHeight > pageAvailableH;

        let needsPush = false;
        let targetTop = nextPageSafeTop;

        if (isTallerThanPage) {
          // Jika elemen luar biasa tinggi (> 1 lembar), dorong jika belum di awal halaman
          if (actualTop > pageSafeTop + 30) {
            needsPush = true;
            targetTop = nextPageSafeTop;
          }
        } else {
          // Elemen normal: dorong jika melewati batas aman bawah atau keep-with-next
          if (
            actualBottom > pageSafeBottom ||
            actualTop >= pageSafeBottom - 8 ||
            shouldKeepWithNext
          ) {
            needsPush = true;
            targetTop = nextPageSafeTop;
          } else if (actualTop < pageSafeTop && actualTop >= pageSheetTop) {
            needsPush = true;
            targetTop = pageSafeTop;
          }
        }

        if (needsPush) {
          const pushDistance = targetTop - actualTop;
          if (pushDistance > 0) {
            el.style.setProperty('--page-push-margin', `${pushDistance}px`);
            el.style.setProperty('margin-top', `${pushDistance}px`, 'important');
            el.dataset.pageMarginAdded = 'true';

            const targetPageIdx = Math.floor(targetTop / pageSlotH);
            if (targetPageIdx > maxPageReached) {
              maxPageReached = targetPageIdx;
            }

            // Paksa reflow instan agar elemen berikutnya membaca koordinat yang sudah bergeser
            void el.offsetHeight;
          }
        } else {
          if (currentPageIdx > maxPageReached) {
            maxPageReached = currentPageIdx;
          }
        }
      }

      // 3. Hitung total halaman akhir berdasarkan posisi elemen terbawah
      const pmFinalRect = pm.getBoundingClientRect();
      const lastElement = blocks[blocks.length - 1];
      const lastRect = lastElement.getBoundingClientRect();
      const docBottom = (lastRect.bottom - pmFinalRect.top) / zoomLevel + marginPx;
      const finalCalculatedPages = Math.max(1, maxPageReached + 1, Math.ceil(docBottom / pageSlotH));

      setPageCount(finalCalculatedPages);
      onPageCountChange?.(finalCalculatedPages);
    } finally {
      isPaginatingRef.current = false;
    }
  }, [marginPx, zoomLevel, onPageCountChange]);

  const schedulePagination = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      requestAnimationFrame(() => {
        applyWordStylePagination();
      });
    }, 80);
  }, [applyWordStylePagination]);

  // Pantau event update dari TipTap editor
  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      schedulePagination();
    };
    editor.on('update', handler);
    return () => {
      editor.off('update', handler);
    };
  }, [editor, schedulePagination]);

  // Pantau pemuatan media dan inisialisasi awal
  useEffect(() => {
    const handleMediaLoaded = () => {
      schedulePagination();
    };
    window.addEventListener('tiptap-media-loaded', handleMediaLoaded);

    const el = wrapperRef.current;
    if (el) {
      const images = el.querySelectorAll('img');
      images.forEach((img) => {
        if (!img.complete) {
          img.onload = () => schedulePagination();
          img.onerror = () => schedulePagination();
        }
      });
    }

    const tInit = setTimeout(schedulePagination, 150);

    return () => {
      window.removeEventListener('tiptap-media-loaded', handleMediaLoaded);
      clearTimeout(tInit);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [schedulePagination]);

  // Paginasi ulang jika konfigurasi tata letak berubah
  useEffect(() => {
    schedulePagination();
  }, [fontSize, fontFamily, lineSpacing, marginCm, zoomLevel, schedulePagination]);

  const totalCanvasH = pageCount * PAGE_H + (pageCount - 1) * PAGE_GAP;

  return (
    <div
      id="editor-scroll-container"
      onScroll={onScroll}
      className="flex-1 overflow-auto flex justify-center w-full select-text custom-scrollbar rounded-none"
      style={{
        background: '#334155', // Slate-700 untuk kontras kertas A4 optimal
        padding: `${40 * zoomLevel}px ${80 * zoomLevel}px`,
      }}
    >
      <div
        style={{
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'top center',
          willChange: 'transform',
          width: `${PAGE_W}px`,
          height: `${totalCanvasH}px`,
          flexShrink: 0,
          position: 'relative',
          marginBottom: zoomLevel !== 1 ? `${Math.max(40, (zoomLevel - 1) * totalCanvasH)}px` : '60px',
        }}
      >
        <style>{`
          /* ── TYPOGRAPHY & RITME KONTEN PROSEMIRROR ── */
          .ProseMirror {
            outline: none !important;
            background: transparent !important;
            white-space: pre-wrap !important;
            tab-size: 48px !important;
            line-height: ${lineSpacing} !important;
            min-height: ${pageContentH}px;
          }
          
          .ProseMirror p {
            line-height: ${lineSpacing};
            margin-top: 0;
            margin-bottom: 12px !important;
            text-align: justify;
          }
          
          .ProseMirror td p, .ProseMirror th p, .ProseMirror li p { 
            margin-bottom: 0 !important; 
          }
          
          /* Heading & Struktur Dokumen */
          .ProseMirror h1, 
          .ProseMirror h2, 
          .ProseMirror h3, 
          .ProseMirror h4 {
            color: #0f172a !important;
            font-weight: 700 !important;
          }

          .ProseMirror h1 { font-size: 1.4em !important; margin-top: 20px; margin-bottom: 10px !important; }
          .ProseMirror h2 { font-size: 1.2em !important; margin-top: 18px; margin-bottom: 8px !important; }
          .ProseMirror h3 { font-size: 1.05em !important; margin-top: 14px; margin-bottom: 6px !important; }

          /* Tabel Kebijakan Anti-Meluber */
          .ProseMirror table {
            border-collapse: collapse !important;
            table-layout: fixed !important;
            width: 100% !important;
            margin-top: 14px;
            margin-bottom: 18px !important;
          }

          .ProseMirror .tableWrapper {
            margin-top: 14px;
            margin-bottom: 18px !important;
          }
          
          .ProseMirror td, .ProseMirror th {
            border: 1px solid #cbd5e1 !important;
            padding: 6px 10px !important;
            vertical-align: top !important;
            box-sizing: border-box !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            font-size: 0.95em;
          }
          
          .ProseMirror th {
            font-weight: 700 !important;
            text-align: left !important;
            background: #f8fafc !important;
          }

          /* Gambar / QuickChart Diagram dengan ruang tinggi terproteksi */
          .ProseMirror img { 
            max-width: 100% !important; 
            height: auto !important;
            min-height: 200px;
            display: block;
            margin: 16px auto;
          }

          /* Callout Box Kebijakan */
          .ProseMirror blockquote {
            border-left: 3px solid #0d9488 !important;
            background: #f0fdfa !important;
            padding: 8px 14px !important;
            margin-top: 14px;
            margin-bottom: 14px !important;
            color: #134e4a !important;
            font-style: normal !important;
          }

          .ProseMirror .citation-url-node { display: none !important; }
          .ProseMirror ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 12px; }
          .ProseMirror ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 12px; }
          .ProseMirror li { margin-bottom: 4px; }
          .ProseMirror li[data-page-margin-added] { list-style-position: outside !important; }

          /* ── PENEGAKAN MARGIN PAGINASI DENGAN PRIORITAS TERTINGGI ── */
          .ProseMirror [data-page-margin-added],
          .ProseMirror p[data-page-margin-added],
          .ProseMirror h1[data-page-margin-added],
          .ProseMirror h2[data-page-margin-added],
          .ProseMirror h3[data-page-margin-added],
          .ProseMirror h4[data-page-margin-added],
          .ProseMirror table[data-page-margin-added],
          .ProseMirror .tableWrapper[data-page-margin-added],
          .ProseMirror div[data-page-margin-added],
          .ProseMirror blockquote[data-page-margin-added],
          .ProseMirror li[data-page-margin-added] {
            margin-top: var(--page-push-margin) !important;
          }

          @media print {
            .no-print { display: none !important; }
            [data-page-margin-added] { margin-top: 0 !important; }
            table, .tableWrapper { page-break-inside: avoid !important; break-inside: avoid !important; }
            tr { page-break-inside: avoid !important; break-inside: avoid !important; }
            h1, h2, h3, h4 { page-break-after: avoid !important; break-after: avoid !important; }
            img { page-break-inside: avoid !important; break-inside: avoid !important; }
          }
        `}</style>

        {/* ── LEMBARAN KERTAS FISIK A4 TERPISAH (MS WORD STYLE SHEETS) ── */}
        {Array.from({ length: pageCount }, (_, i) => (
          <div
            key={`a4-sheet-${i}`}
            className="rounded-none select-none pointer-events-none"
            style={{
              position: 'absolute',
              top: `${i * (PAGE_H + PAGE_GAP)}px`,
              left: 0,
              width: `${PAGE_W}px`,
              height: `${PAGE_H}px`,
              background: '#ffffff',
              boxShadow: '0 4px 20px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.08)',
              border: '1px solid #cbd5e1',
              zIndex: 0,
            }}
          >
            {/* Header Kertas Halus di Lembar Halaman (Kecuali Halaman 1 jika ada judul naskah) */}
            {i > 0 && (
              <div
                className="no-print select-none pointer-events-none"
                style={{
                  position: 'absolute',
                  top: '16px',
                  left: `${marginPx}px`,
                  right: `${marginPx}px`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #f1f5f9',
                  paddingBottom: '4px',
                  fontSize: '9px',
                  fontWeight: 600,
                  color: '#94a3b8',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  fontFamily: 'Roboto, sans-serif',
                }}
              >
                <span>BRIDA Kabupaten Mimika</span>
                <span>Naskah Kebijakan</span>
              </div>
            )}

            {/* Footer Kertas Rapi Terpasang di Layer Kertas (TIDAK MELAYANG DI ATAS TEKS!) */}
            <div
              className="no-print select-none pointer-events-none"
              style={{
                position: 'absolute',
                bottom: '16px',
                right: `${marginPx}px`,
                fontSize: '9px',
                fontWeight: 700,
                color: '#94a3b8',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontFamily: 'Roboto, sans-serif',
              }}
            >
              Halaman {i + 1} dari {pageCount}
            </div>
          </div>
        ))}

        {/* ── KONTEN EDITOR TIPTAP (TERPAGINASI SECARA PRESISI DI ATAS KERTAS) ── */}
        <div
          ref={wrapperRef}
          className="rounded-none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1,
            padding: `${marginPx}px`,
            fontFamily: `${fontFamily}, sans-serif`,
            fontSize: `${fontSize}pt`,
            boxSizing: 'border-box',
            minHeight: `${totalCanvasH}px`,
          }}
        >
          <EditorContent editor={editor} className="focus:outline-none rounded-none" />
        </div>

        {/* ── FOOTER TOOLBAR AKSI DI BAWAH KANVAS ── */}
        <div
          className="no-print flex justify-center gap-3 pb-12"
          style={{
            position: 'absolute',
            top: `${totalCanvasH + 30}px`,
            left: 0,
            width: '100%',
          }}
        >
          {onExportDocx && (
            <button
              type="button"
              onClick={onExportDocx}
              disabled={isSaving || isPrinting || isExportingDocx}
              className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 shadow-md rounded-none"
            >
              {isExportingDocx ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
              <span>Unduh Word (.docx)</span>
            </button>
          )}

          <button
            type="button"
            onClick={onPrint}
            disabled={isSaving || isPrinting || isExportingDocx}
            className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 shadow-md rounded-none"
          >
            {isPrinting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            <span>Cetak PDF Resmi</span>
          </button>

          {onShareWa && (
            <button
              type="button"
              onClick={onShareWa}
              disabled={isSaving || isPrinting || isExportingDocx}
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 shadow-md rounded-none"
            >
              <Send size={13} />
              <span>Bagikan ke WhatsApp</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
