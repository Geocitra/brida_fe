import React from 'react';
import { EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { Loader2, Download } from 'lucide-react';

interface ArticlePreviewCanvasProps {
    editor: Editor | null;
    lineSpacing: number;
    marginCm: number;
    activeTableElement: HTMLTableElement | null;
    onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
    onStartTableResize: (event: React.MouseEvent<HTMLDivElement>, mode: 'column' | 'row', index: number, tableElement: HTMLTableElement) => void;
    isSaving: boolean;
    isPrinting: boolean;
    isDirty: boolean;
    onSaveAndBack: () => void;
    onPrint: () => void;
    fontSize: string;
    fontFamily: string;
}

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
    fontSize,
    fontFamily,
}) => {
    return (
        <div
            id="editor-scroll-container"
            onScroll={onScroll}
            className="flex-1 overflow-y-auto bg-slate-200/40 p-8 flex justify-center w-full min-h-150 select-text scroll-smooth"
        >
            <div className="relative h-fit mb-12">
                <style>{`
          .page {
            background-color: transparent !important;
            border: none !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
            margin-bottom: 0px !important;
          }
          .rm-pages-wrapper {
            background: transparent !important;
          }
          .ProseMirror.rm-with-pagination {
            background-color: white !important;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
            border: 1px solid #cbd5e1 !important;
            box-sizing: border-box !important;
            line-height: ${lineSpacing} !important;
          }
          .ProseMirror {
            outline: none !important;
            white-space: pre-wrap !important;
            tab-size: 48px !important;
          }
          .ProseMirror p {
            line-height: ${lineSpacing} !important;
            margin-top: 0px !important;
            margin-bottom: 16px !important;
          }
          .ProseMirror td p,
          .ProseMirror th p,
          .ProseMirror li p {
            margin-bottom: 0px !important;
          }
          .ProseMirror table {
            border-collapse: collapse !important;
            table-layout: fixed !important;
            width: 100% !important;
            margin-top: 16px !important;
            margin-bottom: 32px !important;
            overflow: hidden !important;
          }
          .ProseMirror table + p,
          .ProseMirror table + table {
            margin-top: 32px !important;
          }
          .ProseMirror td,
          .ProseMirror th {
            min-width: 80px;
            border: 1px solid #cbd5e1;
            padding: 6px 10px;
            vertical-align: top;
            box-sizing: border-box;
            position: relative;
            word-break: normal;
            overflow-wrap: break-word;
          }
          .ProseMirror th {
            font-weight: bold;
            text-align: left;
            background-color: #f8fafc;
          }
          .ProseMirror tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .ProseMirror .column-resize-handle {
            position: absolute;
            right: -2px;
            top: 0;
            bottom: -2px;
            width: 4px;
            background-color: #0d9488;
            pointer-events: none;
          }
          .ProseMirror.resize-cursor {
            cursor: ew-resize !important;
            cursor: col-resize !important;
          }
          .ProseMirror .selectedCell:after {
            z-index: 2;
            position: absolute;
            content: "";
            left: 0; right: 0; top: 0; bottom: 0;
            background: rgba(200, 200, 255, 0.4);
            pointer-events: none;
          }
          .ProseMirror .citation-url-node {
            display: none !important;
          }
          .page-break-gap {
            height: 20px;
            background-color: #f1f5f9 !important; 
            border-top: 1px solid #cbd5e1;
            border-bottom: 1px solid #cbd5e1;
            margin-top: 20px;
            margin-bottom: 20px;
            margin-left: -${marginCm}cm !important;
            margin-right: -${marginCm}cm !important;
            position: relative;
            pointer-events: none;
            display: block;
          }
          .page-break-gap::after {
            content: 'POTONGAN HALAMAN (PDF BREAK)';
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            font-size: 7px;
            font-family: 'Roboto', sans-serif;
            font-weight: 900;
            color: #64748b;
            letter-spacing: 0.15em;
            background-color: #f1f5f9;
            padding: 1px 8px;
          }
        `}</style>

                <div
                    id="virtual-a4-page"
                    className="text-slate-800 text-left prose max-w-none prose-slate prose-xs focus:outline-none transition-all relative"
                    style={{
                        width: '794px',
                        background: 'transparent',
                        border: 'none',
                        boxShadow: 'none',
                        padding: 0,
                        fontFamily: `${fontFamily}, sans-serif`,
                        fontSize: `${fontSize}pt`,
                        ['--rm-margin-left' as any]: `${Math.round(marginCm * (96 / 2.54))}px`,
                        ['--rm-margin-right' as any]: `${Math.round(marginCm * (96 / 2.54))}px`,
                        ['--rm-margin-top' as any]: `${Math.round(marginCm * (96 / 2.54))}px`,
                        ['--rm-margin-bottom' as any]: `${Math.round(marginCm * (96 / 2.54))}px`,
                    }}
                >
                    <EditorContent editor={editor} className="h-full focus:outline-none text-slate-800" />

                    {activeTableElement && (
                        <div className="absolute inset-0 pointer-events-none">
                            {Array.from({ length: Math.max(1, activeTableElement.rows[0]?.cells.length || 1) }).map((_, colIndex) => {
                                const firstRowCell = activeTableElement.rows[0]?.cells[colIndex];
                                if (!firstRowCell) return null;
                                const rect = firstRowCell.getBoundingClientRect();
                                const tableRect = activeTableElement.getBoundingClientRect();
                                const left = rect.left - tableRect.left + rect.width - 2;

                                return (
                                    <div
                                        key={`col-handle-${colIndex}`}
                                        className="absolute w-2 h-5 rounded-sm bg-teal-600/80 cursor-col-resize pointer-events-auto shadow-sm"
                                        style={{ left: `${Math.max(0, left)}px`, top: `${Math.max(0, rect.top - tableRect.top - 4)}px` }}
                                        onMouseDown={(event) => onStartTableResize(event, 'column', colIndex, activeTableElement)}
                                        title={`Ubah lebar kolom ${colIndex + 1}`}
                                    />
                                );
                            })}

                            {Array.from({ length: Math.max(1, activeTableElement.rows.length) }).map((_, rowIndex) => {
                                const row = activeTableElement.rows[rowIndex];
                                if (!row) return null;
                                const rect = row.getBoundingClientRect();
                                const tableRect = activeTableElement.getBoundingClientRect();
                                const top = rect.top - tableRect.top + rect.height - 2;
                                const left = rect.left - tableRect.left + 4;

                                return (
                                    <div
                                        key={`row-handle-${rowIndex}`}
                                        className="absolute h-2 w-5 rounded-sm bg-amber-600/80 cursor-row-resize pointer-events-auto shadow-sm"
                                        style={{ left: `${Math.max(0, left)}px`, top: `${Math.max(0, top)}px` }}
                                        onMouseDown={(event) => onStartTableResize(event, 'row', rowIndex, activeTableElement)}
                                        title={`Ubah tinggi baris ${rowIndex + 1}`}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Bottom Action Footer (no-print)
                    Menyediakan tombol cetak PDF saja di bawah halaman kertas A4.
                    Class 'no-print' menjamin footer ini tidak ikut tercetak di hasil PDF. */}
                <div className="w-[794px] mt-8 mb-12 flex justify-center no-print font-roboto select-none">
                    <button
                        type="button"
                        onClick={(e) => {
                            console.log('[DEBUG] Tombol Cetak PDF Resmi di Canvas diklik!');
                            onPrint();
                        }}
                        disabled={isSaving || isPrinting}
                        className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs uppercase tracking-wider border border-teal-800 rounded-none cursor-pointer transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 shadow-sm"
                    >
                        {isPrinting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                        <span>Cetak PDF Resmi</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
