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
    onStartTableResize: (
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

// ─── Konstanta A4 pada 96 DPI ─────────────────────────────────────────────────
const PAGE_W   = 794;   // 210mm @ 96 DPI
const PAGE_H   = 1123;  // 297mm @ 96 DPI
const PAGE_GAP = 28;    // Jarak antar lembar kertas (latar "meja" terlihat)

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  MESIN PAGINASI — INTI LOGIKA
 * ══════════════════════════════════════════════════════════════════════════
 *
 *  Algoritma:
 *  1. Scan seluruh blok top-level di ProseMirror document
 *  2. Ukur tinggi DOM tiap blok (kecuali spacer yang sudah ada)
 *  3. Akumulasikan tinggi; jika blok berikutnya tidak muat di halaman saat ini:
 *     → Sisipkan AutoPageSpacer sebelum blok overflow
 *     → Tinggi spacer = sisa ruang halaman ini + gap + margin atas halaman baru
 *  4. Kirim sebagai satu ProseMirror transaction dengan meta isPagination:true
 *  5. Listener onUpdate mengabaikan transaction dengan isPagination:true
 *     → TIDAK INFINITE LOOP
 */
function usePaginationEngine(
    editor: Editor | null,
    pageContentH: number,
    marginPx: number,
    onPagesCalculated?: (count: number) => void,
) {
    const isPaginatingRef = useRef(false);
    const debounceRef     = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const runPagination = useCallback(() => {
        if (isPaginatingRef.current || !editor || editor.isDestroyed) return;

        const { state, view } = editor;
        const pmEl = view.dom as HTMLElement;
        if (!pmEl) return;

        // Pastikan schema memiliki node autoPageSpacer
        if (!state.schema.nodes.autoPageSpacer) {
            console.warn('[PaginationEngine] autoPageSpacer node not found in schema.');
            return;
        }

        isPaginatingRef.current = true;

        try {
            // ── Step 1: Inventarisasi blok ────────────────────────────────
            type BlockInfo = {
                pos: number;
                size: number;
                isSpaced: boolean;
                domH: number;
            };
            const blocks: BlockInfo[] = [];

            state.doc.forEach((node, offset) => {
                const isSpaced = node.type.name === 'autoPageSpacer';
                let domH = 0;

                if (!isSpaced) {
                    try {
                        const domInfo  = view.domAtPos(offset + 1);
                        let el: HTMLElement | null =
                            domInfo.node.nodeType === 1
                                ? (domInfo.node as HTMLElement)
                                : domInfo.node.parentElement;

                        // Naik ke direct child of .ProseMirror
                        while (el && el.parentElement !== pmEl) {
                            el = el.parentElement;
                        }
                        if (el) {
                            const style = window.getComputedStyle(el);
                            const marginTop = parseFloat(style.marginTop) || 0;
                            const marginBottom = parseFloat(style.marginBottom) || 0;
                            domH = (el.offsetHeight || el.getBoundingClientRect().height) + marginTop + marginBottom;
                        } else {
                            domH = 24;
                        }
                    } catch {
                        domH = 24;
                    }
                }

                blocks.push({ pos: offset, size: node.nodeSize, isSpaced, domH });
            });

            // ── Step 2: Hitung di mana spacer harus ditempatkan ──────────
            const realBlocks = blocks.filter((b) => !b.isSpaced);
            const desired: { afterIdx: number; spacerH: number }[] = [];
            let acc = 0;

            for (let i = 0; i < realBlocks.length; i++) {
                const rn = realBlocks[i];

                if (i > 0 && acc + rn.domH > pageContentH) {
                    // Blok ini overflow → buat spacer sebelum blok ini
                    // spacerH = sisa halaman ini + gap + 2×margin (bottom margin hal ini + top margin hal baru)
                    const remaining = Math.max(0, pageContentH - acc);
                    const spacerH   = Math.max(
                        PAGE_GAP + 2 * marginPx,
                        remaining + PAGE_GAP + 2 * marginPx,
                    );
                    desired.push({ afterIdx: i - 1, spacerH });
                    acc = 0; // reset: halaman baru mulai dari blok ini
                }

                acc += rn.domH;
            }

            const calculatedPages = desired.length + 1;
            onPagesCalculated?.(calculatedPages);

            // ── Step 3: Bandingkan dengan spacer yang ada ─────────────────
            const existing = blocks.filter((b) => b.isSpaced);
            const sameCount = existing.length === desired.length;

            // Cek apakah posisi dan tinggi spacer sama (toleransi ±20px)
            const sameHeight = sameCount && existing.every((sp, si) => {
                const desiredH = desired[si]?.spacerH ?? 0;
                const existingH = state.doc.nodeAt(sp.pos)?.attrs.height ?? 0;
                return Math.abs(existingH - desiredH) < 20;
            });

            if (sameCount && sameHeight) return; // Tidak ada perubahan diperlukan

            // ── Step 4: Bangun transaction ────────────────────────────────
            let tr = state.tr;

            // Hapus semua spacer yang ada (dari belakang agar posisi stabil)
            for (const sp of [...existing].reverse()) {
                const from = tr.mapping.map(sp.pos);
                const to   = tr.mapping.map(sp.pos + sp.size);
                tr.delete(from, to);
            }

            // Sisipkan spacer baru di posisi yang tepat
            for (const { afterIdx, spacerH } of desired) {
                const rb       = realBlocks[afterIdx];
                if (!rb) continue;
                const insertAt = tr.mapping.map(rb.pos + rb.size);
                const spacerNode = state.schema.nodes.autoPageSpacer.create({ height: spacerH });
                if (spacerNode) tr.insert(insertAt, spacerNode);
            }

            tr.setMeta('addToHistory', false);
            tr.setMeta('isPagination', true);
            view.dispatch(tr);

        } finally {
            isPaginatingRef.current = false;
        }
    }, [editor, pageContentH, marginPx, onPagesCalculated]);

    const schedulePagination = useCallback(() => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => requestAnimationFrame(runPagination), 400);
    }, [runPagination]);

    useEffect(() => {
        if (!editor) return;

        const handleUpdate = ({ transaction }: { transaction: any }) => {
            // Abaikan transaction yang dihasilkan oleh mesin paginasi sendiri
            if (transaction.getMeta('isPagination')) return;
            schedulePagination();
        };

        editor.on('update', handleUpdate);

        // Jalankan paginasi awal setelah editor siap
        const initTimer = setTimeout(() => requestAnimationFrame(runPagination), 500);

        return () => {
            editor.off('update', handleUpdate);
            clearTimeout(debounceRef.current);
            clearTimeout(initTimer);
        };
    }, [editor, schedulePagination, runPagination]);
}

// ─── Komponen Utama ────────────────────────────────────────────────────────────
export const ArticlePreviewCanvas: React.FC<ArticlePreviewCanvasProps> = ({
    editor,
    lineSpacing,
    marginCm,
    activeTableElement,
    onScroll,
    onStartTableResize,
    isSaving,
    isPrinting,
    isDirty,
    onSaveAndBack,
    onPrint,
    onShareWa,
    fontSize,
    fontFamily,
    zoomLevel,
    onPageCountChange,
}) => {
    const marginPx     = Math.round(marginCm * (96 / 2.54));
    const pageContentH = PAGE_H - 2 * marginPx; // Tinggi area konten per halaman
    const wrapperRef   = useRef<HTMLDivElement>(null);
    const [pageCount, setPageCount] = useState(1);
    const lastNotifiedCountRef = useRef(1);

    const updatePageCount = useCallback((count: number) => {
        setPageCount(count);
        if (lastNotifiedCountRef.current !== count) {
            lastNotifiedCountRef.current = count;
            requestAnimationFrame(() => {
                onPageCountChange?.(count);
            });
        }
    }, [onPageCountChange]);

    // ── Jalankan mesin paginasi ──────────────────────────────────────────────
    usePaginationEngine(editor, pageContentH, marginPx, updatePageCount);

    // ── Hitung jumlah kartu halaman ──────────────────────────────────────────
    const recalcPages = useCallback(() => {
        if (!wrapperRef.current) return;
        const pmEl = wrapperRef.current.querySelector('.ProseMirror') as HTMLElement | null;
        if (!pmEl) return;
        const h     = pmEl.scrollHeight;
        const count = Math.max(1, Math.ceil(h / (pageContentH + PAGE_GAP + 2 * marginPx)));
        updatePageCount(count);
    }, [pageContentH, marginPx, updatePageCount]);

    useEffect(() => {
        const el = wrapperRef.current;
        if (!el) return;
        let timer: ReturnType<typeof setTimeout>;
        const ro = new ResizeObserver(() => {
            clearTimeout(timer);
            timer = setTimeout(recalcPages, 150);
        });
        ro.observe(el);
        recalcPages();
        return () => { clearTimeout(timer); ro.disconnect(); };
    }, [recalcPages]);

    useEffect(() => {
        if (!editor) return;
        const handler = () => requestAnimationFrame(recalcPages);
        editor.on('update', handler);
        return () => {
            editor.off('update', handler);
        };
    }, [editor, recalcPages]);

    // ── Dimensi total kanvas ─────────────────────────────────────────────────
    const totalCanvasH = pageCount * PAGE_H + (pageCount - 1) * PAGE_GAP;

    return (
        <div
            id="editor-scroll-container"
            onScroll={onScroll}
            className="flex-1 overflow-auto flex justify-center w-full select-text"
            style={{
                background: '#475569',
                padding: `${40 * zoomLevel}px ${80 * zoomLevel}px`,
            }}
        >
            {/*
             * ZOOM WRAPPER
             * height eksplisit agar scrollbar browser tahu ukuran total konten.
             * marginBottom kompensasi agar konten tidak terpotong saat zoom > 1.
             */}
            <div
                style={{
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: 'top center',
                    willChange: 'transform',
                    width: `${PAGE_W}px`,
                    height: `${totalCanvasH}px`,
                    flexShrink: 0,
                    position: 'relative',
                    marginBottom: zoomLevel !== 1 ? `${(zoomLevel - 1) * totalCanvasH}px` : undefined,
                }}
            >
                <style>{`
          /* ── KUNCI UTAMA: ProseMirror transparan ──────────────────────────
           * Kartu halaman putih di bawahnya terlihat sebagai latar konten.
           * Spacer AutoPageSpacer memberikan jarak yang tepat antar halaman.
           * ─────────────────────────────────────────────────────────────── */
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
            margin-bottom: 14px !important;
          }
          .ProseMirror td p, .ProseMirror th p, .ProseMirror li p { margin-bottom: 0 !important; }
          .ProseMirror h1 { font-size: 1.4em; font-weight: 700; margin: 20px 0 10px; }
          .ProseMirror h2 { font-size: 1.2em; font-weight: 700; margin: 18px 0 8px; }
          .ProseMirror h3 { font-size: 1.05em; font-weight: 600; margin: 14px 0 6px; }
          .ProseMirror table {
            border-collapse: collapse !important;
            table-layout: fixed !important;
            width: 100% !important;
            margin: 16px 0 28px !important;
            overflow: hidden !important;
          }
          .ProseMirror td, .ProseMirror th {
            min-width: 80px;
            border: 1px solid #cbd5e1;
            padding: 6px 10px;
            vertical-align: top;
            box-sizing: border-box;
            position: relative;
            word-break: normal;
            overflow-wrap: break-word;
          }
          .ProseMirror th { font-weight: 700; text-align: left; background: rgba(248,250,252,0.95); }
          .ProseMirror tr { page-break-inside: avoid !important; break-inside: avoid !important; }
          .ProseMirror .column-resize-handle {
            position: absolute; right: -2px; top: 0; bottom: -2px;
            width: 4px; background: #0d9488; pointer-events: none;
          }
          .ProseMirror.resize-cursor { cursor: col-resize !important; }
          .ProseMirror .selectedCell:after {
            z-index: 2; position: absolute; content: "";
            left: 0; right: 0; top: 0; bottom: 0;
            background: rgba(200,200,255,0.4); pointer-events: none;
          }
          .ProseMirror .citation-url-node { display: none !important; }
          .ProseMirror img { max-width: 100% !important; max-height: 850px !important; height: auto !important; }
          .ProseMirror ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 14px; }
          .ProseMirror ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 14px; }

          /* ── Auto Page Spacer — visual indikator batas halaman ─────────── */
          [data-auto-page-spacer] {
            display: block;
            background: transparent !important;
            cursor: default;
          }
          [data-auto-page-spacer]::before {
            content: '';
            display: block;
            position: absolute;
            left: -${marginPx}px;
            right: -${marginPx}px;
            top: 50%;
            height: 0;
            border-top: 1px dashed rgba(148,163,184,0.6);
          }
          [data-auto-page-spacer]::after {
            content: '— batas halaman —';
            display: flex;
            align-items: center;
            justify-content: center;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 8px;
            font-family: 'Roboto', sans-serif;
            font-weight: 700;
            color: rgba(148,163,184,0.8);
            letter-spacing: 0.15em;
            text-transform: uppercase;
            background: white;
            padding: 0 12px;
            pointer-events: none;
            user-select: none;
          }
        `}</style>

                {/*
                 * ══ LAYER 1: KARTU HALAMAN (background, z-index rendah) ══════
                 *
                 * Setiap kartu = satu lembar kertas A4 (794×1123px).
                 * Kartu ke-i ditempatkan di: i × (PAGE_H + PAGE_GAP)
                 * Gap PAGE_GAP px antar kartu menampilkan latar "meja" gelap.
                 *
                 * Kartu TIDAK berisi konten — hanya visual.
                 * Konten ada di LAYER 2 (editor transparan) di atasnya.
                 */}
                {Array.from({ length: pageCount }, (_, i) => (
                    <div
                        key={`page-${i}`}
                        style={{
                            position: 'absolute',
                            top:    `${i * (PAGE_H + PAGE_GAP)}px`,
                            left:   0,
                            width:  `${PAGE_W}px`,
                            height: `${PAGE_H}px`,
                            background: 'white',
                            boxShadow: [
                                '0 1px 3px rgba(0,0,0,0.12)',
                                '0 4px 16px rgba(0,0,0,0.18)',
                                '0 12px 32px rgba(0,0,0,0.14)',
                            ].join(', '),
                            zIndex: 0,
                        }}
                    >
                        {/* Nomor halaman di pojok kanan bawah (tidak tercetak) */}
                        <span
                            className="no-print"
                            style={{
                                position:   'absolute',
                                bottom:     10,
                                right:      14,
                                fontSize:   '7px',
                                fontFamily: 'Roboto, sans-serif',
                                fontWeight: 900,
                                color:      '#d1d5db',
                                letterSpacing: '0.1em',
                                userSelect:    'none',
                                pointerEvents: 'none',
                            }}
                        >
                            {i + 1}
                        </span>
                    </div>
                ))}

                {/*
                 * ══ LAYER 2: EDITOR OVERLAY (z-index 1, transparan) ═════════
                 *
                 * Editor adalah satu ProseMirror tree yang dialirkan secara
                 * kontinu. AutoPageSpacer yang disisipkan mesin paginasi
                 * memberikan "ruang kosong" yang tepat sehingga konten
                 * melompat ke kartu halaman berikutnya secara akurat.
                 *
                 * Padding kiri/kanan/atas/bawah = marginPx (margin kertas A4).
                 */}
                <div
                    ref={wrapperRef}
                    style={{
                        position:   'absolute',
                        top:        0,
                        left:       0,
                        right:      0,
                        zIndex:     1,
                        padding:    `${marginPx}px`,
                        fontFamily: `${fontFamily}, sans-serif`,
                        fontSize:   `${fontSize}pt`,
                        background: 'transparent',
                        boxSizing:  'border-box',
                        minHeight:  `${totalCanvasH}px`,
                    }}
                >
                    <EditorContent
                        editor={editor}
                        className="focus:outline-none"
                        style={{ background: 'transparent' }}
                    />

                    {/* Table resize handles overlay */}
                    {activeTableElement && (
                        <div className="absolute inset-0 pointer-events-none">
                            {Array.from({
                                length: Math.max(1, activeTableElement.rows[0]?.cells.length || 1),
                            }).map((_, colIndex) => {
                                const cell = activeTableElement.rows[0]?.cells[colIndex];
                                if (!cell) return null;
                                const rect      = cell.getBoundingClientRect();
                                const tableRect = activeTableElement.getBoundingClientRect();
                                const left      = rect.left - tableRect.left + rect.width - 2;
                                return (
                                    <div
                                        key={`col-${colIndex}`}
                                        className="absolute w-2 h-5 bg-teal-600/80 cursor-col-resize pointer-events-auto"
                                        style={{
                                            left: `${Math.max(0, left)}px`,
                                            top:  `${Math.max(0, rect.top - tableRect.top - 4)}px`,
                                        }}
                                        onMouseDown={(e) =>
                                            onStartTableResize(e, 'column', colIndex, activeTableElement)
                                        }
                                    />
                                );
                            })}
                            {Array.from({
                                length: Math.max(1, activeTableElement.rows.length),
                            }).map((_, rowIndex) => {
                                const row = activeTableElement.rows[rowIndex];
                                if (!row) return null;
                                const rect      = row.getBoundingClientRect();
                                const tableRect = activeTableElement.getBoundingClientRect();
                                const top  = rect.top - tableRect.top + rect.height - 2;
                                const left = rect.left - tableRect.left + 4;
                                return (
                                    <div
                                        key={`row-${rowIndex}`}
                                        className="absolute h-2 w-5 bg-amber-600/80 cursor-row-resize pointer-events-auto"
                                        style={{
                                            left: `${Math.max(0, left)}px`,
                                            top:  `${Math.max(0, top)}px`,
                                        }}
                                        onMouseDown={(e) =>
                                            onStartTableResize(e, 'row', rowIndex, activeTableElement)
                                        }
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Tombol Cetak PDF & Bagikan ke WA (bawah dokumen, tidak tercetak) */}
                <div
                    className="no-print"
                    style={{
                        position:   'absolute',
                        top:        `${totalCanvasH + 24}px`,
                        left:       0,
                        width:      '100%',
                        display:    'flex',
                        justifyContent: 'center',
                        gap:        '12px',
                        fontFamily: 'Roboto, sans-serif',
                    }}
                >
                    <button
                        type="button"
                        onClick={onPrint}
                        disabled={isSaving || isPrinting}
                        style={{ border: '1px solid #0f766e' }}
                        className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs uppercase tracking-wider cursor-pointer transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 shadow"
                    >
                        {isPrinting
                            ? <Loader2 size={12} className="animate-spin" />
                            : <Download size={12} />
                        }
                        <span>Cetak PDF Resmi</span>
                    </button>

                    {onShareWa && (
                      <button
                          type="button"
                          onClick={onShareWa}
                          disabled={isSaving || isPrinting}
                          style={{ border: '1px solid #065f46' }}
                          className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs uppercase tracking-wider cursor-pointer transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 shadow"
                      >
                          <Send size={12} />
                          <span>Bagikan ke WA</span>
                      </button>
                    )}
                </div>
            </div>
        </div>
    );
};
