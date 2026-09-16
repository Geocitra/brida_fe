import React, { useRef, useState, useEffect, useCallback } from 'react';
import { EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { Loader2, Download, Send } from 'lucide-react';

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
  isDirty: boolean;
  onSaveAndBack: () => void;
  onPrint: () => void;
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
 * Mendekomposisi elemen majemuk (seperti <ul>/<ol> menjadi <li>, dan <table> menjadi <tr>)
 * sehingga tidak ada butir daftar atau baris yang terpotong di perbatasan kertas.
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
    } else if (tag === 'table') {
      const rows = Array.from(el.querySelectorAll('tbody > tr')) as HTMLElement[];
      if (rows.length > 1) {
        blocks.push(...rows);
      } else {
        blocks.push(el);
      }
    } else {
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
  onPrint,
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

  // ── MESIN PAGINASI ATOMIK A4 (DEEP BLOCK-FLOW ENGINE SEPERTI MS WORD) ──
  const applyWordStylePagination = useCallback(() => {
    if (!wrapperRef.current) return;
    const pm = wrapperRef.current.querySelector('.ProseMirror') as HTMLElement | null;
    if (!pm) return;

    // Reset seluruh margin paginasi yang pernah disematkan (baik di direct children maupun sub-element)
    const previouslyModified = pm.querySelectorAll('[data-page-margin-added]');
    previouslyModified.forEach((el: any) => {
      el.style.marginTop = '';
      delete el.dataset.pageMarginAdded;
    });

    Array.from(pm.children).forEach((el: any) => {
      if (el.dataset?.pageMarginAdded) {
        el.style.marginTop = '';
        delete el.dataset.pageMarginAdded;
      }
    });

    // Paksa browser melakukan reflow kalkulasi layout bersih
    void pm.offsetHeight;

    const blocks = getPaginatableBlocks(pm);
    if (blocks.length === 0) return;

    let currentPageIdx = 0;
    let currentAccumulatedY = 0;

    blocks.forEach((el, idx) => {
      const style = window.getComputedStyle(el);
      const origMarginTop = parseFloat(style.marginTop) || 0;
      const origMarginBottom = parseFloat(style.marginBottom) || 0;

      const rect = el.getBoundingClientRect();
      const elHeight = (rect.height > 0 ? rect.height : el.offsetHeight) + origMarginBottom;

      // Cegah Heading yatim di dasar halaman (Keep with Next Element)
      const isHeading = ['H1', 'H2', 'H3', 'H4'].includes(el.tagName);
      let nextWillOverflow = false;

      if (isHeading && idx < blocks.length - 1) {
        const nextEl = blocks[idx + 1];
        const nextStyle = window.getComputedStyle(nextEl);
        const nextRect = nextEl.getBoundingClientRect();
        const nextH =
          (nextRect.height > 0 ? nextRect.height : nextEl.offsetHeight) +
          (parseFloat(nextStyle.marginBottom) || 0);
        if (currentAccumulatedY + elHeight + nextH > pageContentH) {
          nextWillOverflow = true;
        }
      }

      // Jika elemen saat ini melebihi sisa tinggi halaman, lompatkan ke awal lembar A4 berikutnya
      if (
        (currentAccumulatedY + elHeight > pageContentH || nextWillOverflow) &&
        currentAccumulatedY > 0
      ) {
        const remainingOnCurrentPage = Math.max(0, pageContentH - currentAccumulatedY);
        const pushMargin = remainingOnCurrentPage + pageJumpH;

        el.style.marginTop = `${origMarginTop + pushMargin}px`;
        el.dataset.pageMarginAdded = 'true';

        currentPageIdx += 1;
        currentAccumulatedY = elHeight;
      } else {
        currentAccumulatedY += elHeight + origMarginTop;
      }
    });

    const calculatedTotalPages = Math.max(1, currentPageIdx + 1);
    setPageCount(calculatedTotalPages);
    onPageCountChange?.(calculatedTotalPages);
  }, [pageContentH, pageJumpH, onPageCountChange]);

  const schedulePagination = useCallback(() => {
    requestAnimationFrame(() => {
      applyWordStylePagination();
      requestAnimationFrame(() => {
        applyWordStylePagination();
      });
    });
  }, [applyWordStylePagination]);

  // Pantau perubahan ukuran elemen / gambar yang baru selesai diunduh
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      schedulePagination();
    });
    ro.observe(el);

    const attachImageListeners = () => {
      const images = el.querySelectorAll('img');
      images.forEach((img) => {
        if (!img.complete) {
          img.onload = () => schedulePagination();
          img.onerror = () => schedulePagination();
        }
      });
    };

    const handleMediaLoaded = () => {
      schedulePagination();
    };

    window.addEventListener('tiptap-media-loaded', handleMediaLoaded);

    attachImageListeners();
    schedulePagination();

    // Jalankan timer pengaman untuk menangkap chart eksternal
    const t1 = setTimeout(schedulePagination, 200);
    const t2 = setTimeout(schedulePagination, 600);
    const t3 = setTimeout(schedulePagination, 1500);

    return () => {
      ro.disconnect();
      window.removeEventListener('tiptap-media-loaded', handleMediaLoaded);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [schedulePagination]);

  // Jalankan paginasi setiap kali ada update teks dari TipTap
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
            line-height: ${lineSpacing} !important;
            margin-top: 0 !important;
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

          .ProseMirror h1 { font-size: 1.4em !important; margin: 20px 0 10px !important; }
          .ProseMirror h2 { font-size: 1.2em !important; margin: 18px 0 8px !important; }
          .ProseMirror h3 { font-size: 1.05em !important; margin: 14px 0 6px !important; }

          /* Tabel Kebijakan Anti-Meluber */
          .ProseMirror table {
            border-collapse: collapse !important;
            table-layout: fixed !important;
            width: 100% !important;
            margin: 14px 0 18px !important;
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
            margin: 14px 0 !important;
            color: #134e4a !important;
            font-style: normal !important;
          }

          .ProseMirror .citation-url-node { display: none !important; }
          .ProseMirror ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 12px; }
          .ProseMirror ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 12px; }

          @media print {
            .no-print { display: none !important; }
            [data-page-margin-added] { margin-top: 0 !important; }
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
              boxShadow: '0 4px 20px rgba(0,0,0,0.22), 0 1px 4px rgba(0,0,0,0.1)',
              border: '1px solid #cbd5e1',
              zIndex: 0,
            }}
          >
            {/* Nomor Halaman di Margin Bawah Kertas */}
            <span
              className="no-print"
              style={{
                position: 'absolute',
                bottom: '16px',
                right: '24px',
                fontSize: '9px',
                fontWeight: 800,
                color: '#94a3b8',
                letterSpacing: '0.1em',
                userSelect: 'none',
              }}
            >
              HALAMAN {i + 1} DARI {pageCount}
            </span>
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
          <button
            type="button"
            onClick={onPrint}
            disabled={isSaving || isPrinting}
            className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 shadow-md rounded-none"
          >
            {isPrinting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            <span>Cetak PDF Resmi</span>
          </button>

          {onShareWa && (
            <button
              type="button"
              onClick={onShareWa}
              disabled={isSaving || isPrinting}
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
