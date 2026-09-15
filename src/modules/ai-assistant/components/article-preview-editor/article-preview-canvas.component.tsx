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

const PAGE_W   = 794;
const PAGE_H   = 1123;
const PAGE_GAP = 28;

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
    const marginPx     = Math.round(marginCm * (96 / 2.54));
    const pageContentH = PAGE_H - 2 * marginPx;
    const wrapperRef   = useRef<HTMLDivElement>(null);
    const [pageCount, setPageCount] = useState(1);

    const recalcPages = useCallback(() => {
        if (!wrapperRef.current) return;
        const pmEl = wrapperRef.current.querySelector('.ProseMirror') as HTMLElement | null;
        if (!pmEl) return;
        const h     = pmEl.scrollHeight;
        const count = Math.max(1, Math.ceil(h / pageContentH));
        setPageCount(count);
        onPageCountChange?.(count);
    }, [pageContentH, onPageCountChange]);

    useEffect(() => {
        const el = wrapperRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => recalcPages());
        ro.observe(el);
        recalcPages();
        return () => ro.disconnect();
    }, [recalcPages]);

    useEffect(() => {
        if (!editor) return;
        const handler = () => requestAnimationFrame(recalcPages);
        editor.on('update', handler);
        return () => {
            editor.off('update', handler);
        };
    }, [editor, recalcPages]);

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
          }
          .ProseMirror td p, .ProseMirror th p, .ProseMirror li p { margin-bottom: 0 !important; }
          .ProseMirror h1 { font-size: 1.4em; font-weight: 700; margin: 18px 0 10px; }
          .ProseMirror h2 { font-size: 1.2em; font-weight: 700; margin: 16px 0 8px; }
          .ProseMirror h3 { font-size: 1.05em; font-weight: 600; margin: 14px 0 6px; }
          
          /* Standar Tabel Native TipTap (Fixed Width 100% Anti-Meluber) */
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
          .ProseMirror tr { page-break-inside: avoid !important; }

          /* Blockquote Callout Kebijakan TipTap */
          .ProseMirror blockquote {
            border-left: 3px solid #0d9488 !important;
            background: #f0fdfa !important;
            padding: 8px 14px !important;
            margin: 14px 0 !important;
            color: #134e4a !important;
            font-style: normal !important;
          }

          .ProseMirror .citation-url-node { display: none !important; }
          .ProseMirror img { max-width: 100% !important; height: auto !important; }
          .ProseMirror ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 12px; }
          .ProseMirror ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 12px; }
        `}</style>

                {/* Lembar Halaman Fisik Putih */}
                {Array.from({ length: pageCount }, (_, i) => (
                    <div
                        key={`page-${i}`}
                        style={{
                            position: 'absolute',
                            top: `${i * (PAGE_H + PAGE_GAP)}px`,
                            left: 0,
                            width: `${PAGE_W}px`,
                            height: `${PAGE_H}px`,
                            background: 'white',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                            zIndex: 0,
                        }}
                    >
                        <span
                            className="no-print"
                            style={{
                                position: 'absolute',
                                bottom: 12,
                                right: 16,
                                fontSize: '8px',
                                fontWeight: 800,
                                color: '#94a3b8',
                                letterSpacing: '0.1em',
                                userSelect: 'none',
                            }}
                        >
                            HALAMAN {i + 1}
                        </span>
                    </div>
                ))}

                {/* Konten Editor TipTap */}
                <div
                    ref={wrapperRef}
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
                    <EditorContent editor={editor} className="focus:outline-none" />
                </div>

                {/* Tombol Cetak & Berbagi */}
                <div
                    className="no-print"
                    style={{
                        position: 'absolute',
                        top: `${totalCanvasH + 20}px`,
                        left: 0,
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '12px',
                    }}
                >
                    <button
                        type="button"
                        onClick={onPrint}
                        disabled={isSaving || isPrinting}
                        className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 shadow"
                    >
                        {isPrinting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                        <span>Cetak PDF Resmi</span>
                    </button>

                    {onShareWa && (
                        <button
                            type="button"
                            onClick={onShareWa}
                            disabled={isSaving || isPrinting}
                            className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 shadow"
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
