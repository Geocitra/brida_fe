import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import { Node, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';

// --- Ekstensi Tabel Baru ---
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';

// @ts-ignore
import { PaginationPlus } from 'tiptap-pagination-plus';

import { AiAssistantService } from '../../../services/ai-assistant.service';
import type { ArticleSessionDetail } from '../../../services/ai-assistant.service';
import { PdfExportService } from '../../../services/pdf-export.service';
import { MarkupConverter } from '../utils/markup-converter.util';

import { useEditorStore } from '../store/useEditorStore';
import type { FontFamilyKey, EditorFormatting } from '../store/useEditorStore';

import {
  Loader2,
  Download,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Undo,
  Redo,
  LayoutGrid,
} from 'lucide-react';

interface ArticlePreviewEditorViewProps {
  sessionId: string | null;
  onBack: () => void;
}

const FONT_FAMILY_MAP: Record<string, string> = {
  'Calibri': "'Calibri', 'Gill Sans', 'Trebuchet MS', sans-serif",
  'Times New Roman': "'Times New Roman', Times, serif",
  'Verdana': "'Verdana', Geneva, Tahoma, sans-serif",
  'Arial': "'Arial', 'Helvetica Neue', Helvetica, sans-serif",
};

const CSS_TO_FONT_NAME: Record<string, FontFamilyKey> = Object.fromEntries(
  Object.entries(FONT_FAMILY_MAP).map(([name, css]) => [css, name as FontFamilyKey])
);

const FONT_SIZE_PRESETS = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

const FontSizeExtension = Extension.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize?.replace('pt', ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}pt` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }: any) => {
        return chain().setMark('textStyle', { fontSize }).run();
      },
      unsetFontSize: () => ({ chain }: any) => {
        return chain().setMark('textStyle', { fontSize: null }).run();
      },
    } as any;
  },
});

const PageBreakExtension = Node.create({
  name: 'pageBreak',
  group: 'block',
  selectable: true,
  draggable: true,
  parseHTML() {
    return [{ tag: 'div[data-type="page-break"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'page-break',
        class: 'page-break-gap no-print',
        style: 'page-break-after: always;',
      }),
    ];
  },
  addKeyboardShortcuts() {
    return {
      'Mod-Enter': () => this.editor.commands.insertContent({ type: this.name }),
    };
  },
});

const TabKeyExtension = Extension.create({
  name: 'tabKey',
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        // Jika kursor berada di dalam tabel, daftar berbutir, atau daftar berangka,
        // biarkan aksi default (navigasi sel atau indentasi daftar) berjalan normal.
        if (
          this.editor.isActive('table') ||
          this.editor.isActive('bulletList') ||
          this.editor.isActive('orderedList')
        ) {
          return false;
        }
        return this.editor.commands.insertContent('\t');
      },
    };
  },
});

const TIPTAP_EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
  }),
  TextAlign.configure({
    types: ['heading', 'paragraph'],
    alignments: ['left', 'center', 'right', 'justify'],
    defaultAlignment: 'justify',
  }),
  TextStyle,
  FontFamily.configure({
    types: ['textStyle'],
  }),
  FontSizeExtension,
  PageBreakExtension,
  // --- Injeksi Ekstensi Tabel ---
  Table.configure({
    resizable: true,
    cellMinWidth: 80,
    handleWidth: 10,
  }),
  TableRow,
  TableHeader,
  TableCell,
  // --- Injeksi Ekstensi Tab Key ---
  TabKeyExtension,
  // ------------------------------
  PaginationPlus.configure({
    pageHeight: 1123,
    pageWidth: 794,
    pageGap: 24,
    pageBreakBackground: '#f1f5f9',
    marginTop: 94,
    marginBottom: 94,
    marginLeft: 94,
    marginRight: 94,
  }),
];

export const ArticlePreviewEditorView: React.FC<ArticlePreviewEditorViewProps> = ({
  sessionId,
  onBack,
}) => {
  const {
    sessionId: storeSessionId,
    articleTitle,
    draftContent,
    isDirty,
    fontFamily,
    fontSize,
    lineSpacing,
    marginCm,
    initSession,
    setContent,
    setFormatting,
    markSaved,
  } = useEditorStore();

  const [activeSession, setActiveSession] = useState<ArticleSessionDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [totalPages, setTotalPages] = useState<number>(1);
  const [activePage, setActivePage] = useState<number>(0);

  const rulerRef = React.useRef<HTMLDivElement>(null);

  const handleStartDrag = (e: React.MouseEvent, type: 'left' | 'right') => {
    e.preventDefault();
    if (!rulerRef.current) return;

    const startX = e.clientX;
    const initialMarginCm = marginCm;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      let newMarginCm = initialMarginCm;

      if (type === 'left') {
        const newPx = Math.round(initialMarginCm * (96 / 2.54) + deltaX);
        newMarginCm = newPx * (2.54 / 96);
      } else {
        const newPx = Math.round(initialMarginCm * (96 / 2.54) - deltaX);
        newMarginCm = newPx * (2.54 / 96);
      }

      // Batasi margin dalam rentang aman 1.0 cm s.d 5.0 cm
      const constrainedMarginCm = Math.max(1.0, Math.min(5.0, Math.round(newMarginCm * 10) / 10));
      useEditorStore.getState().setFormatting({ marginCm: constrainedMarginCm });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const editor = useEditor({
    extensions: TIPTAP_EXTENSIONS,
    editorProps: {
      attributes: {
        class: 'focus:outline-none max-w-none min-h-[500px] outline-none h-full text-slate-900 leading-relaxed text-xs focus:bg-white selection:bg-teal-700 selection:text-white',
      },
      handleDOMEvents: {
        mousedown: (view, event) => {
          const target = event.target as HTMLElement;
          const isTableClick = target.closest('table') !== null;
          const isResizeHandle = target.classList.contains('column-resize-handle') ||
                                 target.classList.contains('column-resize-handle-active');
          
          if (isTableClick || isResizeHandle) {
            try {
              (view as any).editor.commands.disablePagination();
            } catch (e) {
              console.warn('[Pagination Freeze] Gagal menonaktifkan pagination:', e);
            }
          }
          return false;
        }
      }
    },
    onUpdate: ({ editor: ed }) => {
      setContent(ed.getHTML());
    },
    onSelectionUpdate: ({ editor: ed }) => {
      const attrs = ed.getAttributes('textStyle');
      const cssFont: string = attrs.fontFamily || '';
      const matched = CSS_TO_FONT_NAME[cssFont];
      const rawSize: string | null = attrs.fontSize || null;

      const updates: Partial<EditorFormatting> = {};
      if (matched && matched !== useEditorStore.getState().fontFamily) {
        updates.fontFamily = matched;
      }
      if (rawSize) {
        const parsed = rawSize.replace('pt', '').trim();
        if (!isNaN(Number(parsed)) && parsed !== useEditorStore.getState().fontSize) {
          updates.fontSize = parsed;
        }
      }

      if (Object.keys(updates).length > 0) {
        useEditorStore.getState().setFormatting(updates);
      }
    },
  });

  useEffect(() => {
    const el = document.getElementById('virtual-a4-page');
    if (!el) return;

    const observer = new ResizeObserver(() => {
      const pageCount = el.querySelectorAll('.page').length;
      const nextPages = Math.max(1, pageCount);
      setTotalPages((prev) => (prev !== nextPages ? nextPages : prev));
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [editor, isLoading]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (editor && !editor.isDestroyed) {
        try {
          editor.commands.enablePagination();
        } catch (e) {
          // Abaikan jika command belum siap
        }
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [editor]);

  // =================================================================
  // PERBAIKAN MARGIN: SINKRONISASI TIPTAP (ANTI INFINITE LOOP)
  // =================================================================
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      try {
        const px = Math.round(marginCm * (96 / 2.54));

        // 1. Mutasi ke opsi plugin internal agar algoritma matematika pagination sinkron dengan CSS
        const paginationExt = editor.extensionManager.extensions.find(e => e.name === 'pagination');
        if (paginationExt) {
          paginationExt.options.marginTop = px;
          paginationExt.options.marginBottom = px;
          paginationExt.options.marginLeft = px;
          paginationExt.options.marginRight = px;
        }

        // 2. Pancing reflow ProseMirror secara natural tanpa setMeta yang memicu infinite loop
        setTimeout(() => {
          if (editor && !editor.isDestroyed) {
            // Ini akan memicu evaluasi ulang batas halaman secara aman
            editor.view.dispatch(editor.state.tr);
          }
        }, 50);
      } catch (err) {
        console.error('Gagal memperbarui margin Tiptap:', err);
      }
    }
  }, [editor, marginCm]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const computedPageHeight = 1122;
    const currentPage = Math.floor((scrollTop + computedPageHeight / 2) / computedPageHeight);
    setActivePage(Math.min(totalPages - 1, Math.max(0, currentPage)));
  };

  const handleScrollToPage = (pageIdx: number) => {
    const scrollContainer = document.getElementById('editor-scroll-container');
    if (scrollContainer) {
      const computedPageHeight = 1122;
      scrollContainer.scrollTo({
        top: pageIdx * computedPageHeight,
        behavior: 'smooth',
      });
      setActivePage(pageIdx);
    }
  };

  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false);
      onBack();
      return;
    }

    const loadSession = async () => {
      setIsLoading(true);
      try {
        const session = await AiAssistantService.getArticleSession(sessionId);
        setActiveSession(session);

        const htmlContent = MarkupConverter.toHTML(session.fullArticleText || '');
        initSession(sessionId, session.articleTitle || session.title || '', htmlContent);
      } catch (err: any) {
        console.error('Gagal memuat sesi artikel:', err);
        showToast('Gagal memuat sesi artikel dari database.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, [sessionId, initSession, onBack]);

  useEffect(() => {
    if (editor && draftContent && editor.isEmpty) {
      editor.commands.setContent(draftContent);
      requestAnimationFrame(() => {
        if (editor && !editor.isDestroyed) {
          editor.commands.focus('end');
        }
      });
    }
  }, [editor, draftContent]);

  const handleSaveAndBack = async () => {
    if (!sessionId || !editor || isSaving) return;

    if (!isDirty) {
      onBack();
      return;
    }

    setIsSaving(true);
    showToast('⏳ Menyinkronkan perubahan naskah ke database...');
    try {
      const markdownContent = MarkupConverter.toMarkdown(editor.getHTML());
      await AiAssistantService.updateArticleSessionContent(sessionId, articleTitle, markdownContent);
      markSaved();
      onBack();
    } catch (err: any) {
      showToast(`⚠️ Sinkronisasi gagal: ${err.message}. Draft tetap aman di penyimpanan lokal (Offline Safe).`);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = async () => {
    if (!editor && !sessionId) {
      showToast('⚠️ Tidak ada naskah untuk dicetak.');
      return;
    }
    setIsPrinting(true);

    if (isDirty && sessionId) {
      showToast('⏳ Menyimpan draf ke database sebelum mencetak...');
      try {
        const markdownContent = MarkupConverter.toMarkdown(editor.getHTML());
        await AiAssistantService.updateArticleSessionContent(sessionId, articleTitle, markdownContent);
        markSaved();
      } catch (e) {
        showToast('⚠️ Gagal menyimpan ke server. Tetap mencetak PDF dari versi layar...');
      }
    }

    try {
      showToast('🖨️ Merakit dokumen PDF resmi di server (True WYSIWYG)...');
      const targetFontSize = parseFloat(fontSize);

      await PdfExportService.exportCustomFormattedArticlePdf(
        editor.getHTML(),
        {
          fontFamily,
          fontSize: isNaN(targetFontSize) ? 11 : targetFontSize,
          lineSpacing,
          marginCm,
        },
        articleTitle || 'Draf_Artikel_AKLS_Mimika'
      );

      showToast('✅ Dokumen PDF resmi berhasil diunduh!');
    } catch (err: any) {
      showToast(`❌ Pencetakan PDF gagal: ${err.message}`);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleApplyFontSize = useCallback((size: string) => {
    setFormatting({ fontSize: size });
    if (editor && !editor.isDestroyed) {
      (editor.chain().focus() as any).setFontSize(size).run();
    }
  }, [editor, setFormatting]);

  const handleFontSizeStep = useCallback((direction: 'up' | 'down') => {
    const current = parseInt(fontSize, 10) || 11;
    const idx = FONT_SIZE_PRESETS.indexOf(current);
    let next: number;
    if (idx === -1) {
      next = direction === 'up'
        ? FONT_SIZE_PRESETS.find(s => s > current) ?? FONT_SIZE_PRESETS[FONT_SIZE_PRESETS.length - 1]
        : [...FONT_SIZE_PRESETS].reverse().find(s => s < current) ?? FONT_SIZE_PRESETS[0];
    } else {
      next = direction === 'up'
        ? FONT_SIZE_PRESETS[Math.min(idx + 1, FONT_SIZE_PRESETS.length - 1)]
        : FONT_SIZE_PRESETS[Math.max(idx - 1, 0)];
    }
    handleApplyFontSize(String(next));
  }, [fontSize, handleApplyFontSize]);

  const handleFontFamilyChange = useCallback((newFont: FontFamilyKey) => {
    setFormatting({ fontFamily: newFont });
    if (editor && !editor.isDestroyed) {
      editor.chain().focus().setFontFamily(FONT_FAMILY_MAP[newFont]).run();
    }
  }, [editor, setFormatting]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 font-roboto bg-slate-50/50 border border-slate-300">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-teal-700" size={24} />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Memuat Sesi Redaksi...</span>
        </div>
      </div>
    );
  }

  if (!sessionId || !activeSession) {
    return (
      <div className="flex items-center justify-center h-96 font-roboto bg-slate-50/50 border border-slate-300 p-6 text-center space-y-4">
        <div className="max-w-md mx-auto space-y-2">
          <AlertCircle className="mx-auto text-red-600" size={36} />
          <h3 className="text-base font-bold text-slate-900 uppercase">Akses Sesi Gagal</h3>
          <p className="text-xs text-slate-600">
            ID Sesi Sifat Editorial kosong atau tidak valid.
          </p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-wider rounded-none inline-flex items-center gap-1.5 cursor-pointer mt-4"
          >
            <ArrowLeft size={13} />
            <span>Kembali ke AI Editor</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col bg-slate-100 overflow-hidden relative font-roboto">
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-teal-400 border border-slate-700 px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-xl animate-in fade-in duration-200">
          <CheckCircle2 size={14} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* STICKY RIBBON HEADER */}
      <div className="bg-white border-b border-slate-350 flex flex-col shrink-0 no-print z-20 shadow-xs">

        {/* Ribbon Row 1: Back, Page Title, Action Buttons */}
        <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-left">
            <button
              onClick={handleSaveAndBack}
              disabled={isSaving || isPrinting}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer font-bold text-xs uppercase border border-slate-300 shadow-2xs rounded-none"
            >
              {isSaving ? <Loader2 size={12} className="animate-spin" /> : <ArrowLeft size={12} />}
              <span>{isDirty ? 'Simpan & Kembali' : 'Kembali'}</span>
            </button>
            <div className="h-4 w-px bg-slate-300" />
            <div>
              <h1 className="text-sm font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                <span>Sunting Naskah &amp; Tata Letak A4</span>
                {isDirty && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Terdapat perubahan belum tersimpan" />}
              </h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5 max-w-lg truncate">
                Sesi Cetak: <span className="text-teal-700 font-black">{articleTitle || activeSession.title}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={isSaving || isPrinting}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-none inline-flex items-center gap-1.5 border border-teal-800 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isPrinting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              <span>Cetak PDF</span>
            </button>
          </div>
        </div>

        {/* Ribbon Row 2: Layout & Tiptap Styling Controls */}
        <div className="px-6 py-2 bg-slate-50 flex flex-wrap items-center justify-between gap-4 select-none">
          {/* Seksie A: Layout (Font, Spasi) */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Font:</span>
              <select
                value={fontFamily}
                onChange={(e) => handleFontFamilyChange(e.target.value as FontFamilyKey)}
                disabled={isSaving || isPrinting}
                className="bg-white border border-slate-300 text-[10px] font-bold px-2 py-1 focus:outline-none focus:border-teal-600 rounded-none cursor-pointer"
              >
                <option value="Calibri">Calibri</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Verdana">Verdana</option>
                <option value="Arial">Arial</option>
              </select>
            </div>

            <div className="h-4 w-px bg-slate-300" />

            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Spasi:</span>
              <select
                value={lineSpacing}
                onChange={(e) => setFormatting({ lineSpacing: parseFloat(e.target.value) })}
                disabled={isSaving || isPrinting}
                className="bg-white border border-slate-300 text-[10px] font-bold px-2 py-1 focus:outline-none focus:border-teal-600 rounded-none cursor-pointer"
              >
                <option value="1.18">1.18 (Nota Dinas)</option>
                <option value="1.5">1.50 (Laporan)</option>
              </select>
            </div>

            {/* UI Dropdown Margin sudah dihapus untuk mengunci margin di 2.5cm */}
          </div>

          <div className="hidden md:block h-5 w-px bg-slate-300" />

          {/* Seksie B: Text Formatting Toolbar */}
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBold().run()}
              className={`p-1 transition-colors cursor-pointer ${editor?.isActive('bold') ? 'bg-teal-700 text-white' : 'text-slate-650 hover:bg-slate-200'}`}
              title="Tebal (Ctrl+B)"
            >
              <Bold size={13} />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className={`p-1 transition-colors cursor-pointer ${editor?.isActive('italic') ? 'bg-teal-700 text-white' : 'text-slate-650 hover:bg-slate-200'}`}
              title="Miring (Ctrl+I)"
            >
              <Italic size={13} />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              className={`p-1 transition-colors cursor-pointer ${editor?.isActive('underline') ? 'bg-teal-700 text-white' : 'text-slate-650 hover:bg-slate-200'}`}
              title="Garis Bawah (Ctrl+U)"
            >
              <UnderlineIcon size={13} />
            </button>

            <div className="w-px h-3.5 bg-slate-300 mx-0.5" />

            <div className="flex items-center">
              <button
                type="button"
                onClick={() => handleFontSizeStep('down')}
                disabled={isSaving || isPrinting || parseInt(fontSize, 10) <= FONT_SIZE_PRESETS[0]}
                className="flex items-center justify-center w-6 h-6 border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-colors"
                title="Perkecil Huruf"
              >
                <span className="text-[10px] font-black text-slate-600 select-none leading-none">A<sub style={{ fontSize: '7px', verticalAlign: 'sub' }}>▼</sub></span>
              </button>
              <select
                value={FONT_SIZE_PRESETS.includes(parseInt(fontSize, 10)) ? fontSize : ''}
                onChange={(e) => handleApplyFontSize(e.target.value)}
                disabled={isSaving || isPrinting}
                className="h-6 bg-white border-t border-b border-slate-300 text-[10px] font-bold px-1 focus:outline-none focus:border-teal-600 rounded-none cursor-pointer w-12 text-center"
              >
                {!FONT_SIZE_PRESETS.includes(parseInt(fontSize, 10)) && (
                  <option value="" disabled>{fontSize}pt</option>
                )}
                {FONT_SIZE_PRESETS.map(s => (
                  <option key={s} value={String(s)}>{s}pt</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleFontSizeStep('up')}
                disabled={isSaving || isPrinting || parseInt(fontSize, 10) >= FONT_SIZE_PRESETS[FONT_SIZE_PRESETS.length - 1]}
                className="flex items-center justify-center w-6 h-6 border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-colors"
                title="Perbesar Huruf"
              >
                <span className="text-[11px] font-black text-slate-700 select-none leading-none">A<sup style={{ fontSize: '7px', verticalAlign: 'super' }}>▲</sup></span>
              </button>
            </div>

            <div className="w-px h-3.5 bg-slate-300 mx-0.5" />

            <button
              type="button"
              onClick={() => editor?.chain().focus().setTextAlign('left').run()}
              className={`p-1 transition-colors cursor-pointer ${editor?.isActive({ textAlign: 'left' }) ? 'bg-teal-700 text-white' : 'text-slate-650 hover:bg-slate-200'}`}
              title="Rata Kiri"
            >
              <AlignLeft size={13} />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().setTextAlign('center').run()}
              className={`p-1 transition-colors cursor-pointer ${editor?.isActive({ textAlign: 'center' }) ? 'bg-teal-700 text-white' : 'text-slate-650 hover:bg-slate-200'}`}
              title="Rata Tengah"
            >
              <AlignCenter size={13} />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().setTextAlign('right').run()}
              className={`p-1 transition-colors cursor-pointer ${editor?.isActive({ textAlign: 'right' }) ? 'bg-teal-700 text-white' : 'text-slate-650 hover:bg-slate-200'}`}
              title="Rata Kanan"
            >
              <AlignRight size={13} />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
              className={`p-1 transition-colors cursor-pointer ${editor?.isActive({ textAlign: 'justify' }) ? 'bg-teal-700 text-white' : 'text-slate-650 hover:bg-slate-200'}`}
              title="Rata Kiri Kanan"
            >
              <AlignJustify size={13} />
            </button>

            <div className="w-px h-3.5 bg-slate-300 mx-0.5" />

            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              className={`p-1 transition-colors cursor-pointer ${editor?.isActive('bulletList') ? 'bg-teal-700 text-white' : 'text-slate-650 hover:bg-slate-200'}`}
              title="Daftar Berbutir"
            >
              <List size={13} />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              className={`p-1 transition-colors cursor-pointer ${editor?.isActive('orderedList') ? 'bg-teal-700 text-white' : 'text-slate-650 hover:bg-slate-200'}`}
              title="Daftar Berangka"
            >
              <ListOrdered size={13} />
            </button>

            <div className="w-px h-3.5 bg-slate-300 mx-0.5" />

            <button
              type="button"
              onClick={() => editor?.chain().focus().undo().run()}
              disabled={!editor?.can().undo()}
              className="p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30 transition-colors cursor-pointer"
              title="Undo"
            >
              <Undo size={13} />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().redo().run()}
              disabled={!editor?.can().redo()}
              className="p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30 transition-colors cursor-pointer"
              title="Redo"
            >
              <Redo size={13} />
            </button>

            <div className="w-px h-3.5 bg-slate-300 mx-0.5" />

            <button
              type="button"
              onClick={() => editor?.chain().focus().insertContent({ type: 'pageBreak' }).run()}
              className="p-1.5 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer inline-flex items-center gap-1 rounded-none border border-transparent hover:border-slate-300"
              title="Sisipkan Potongan Batas Halaman (Ctrl+Enter)"
            >
              <LayoutGrid size={12} className="text-teal-700" />
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Potong Halaman</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN WORKSPACE SPLIT CONTAINER */}
      <div className="flex-1 flex flex-row min-h-0 w-full overflow-hidden">

        {/* LEFT SIDEBAR: Navigasi Halaman */}
        <div className="w-56 bg-slate-50 border-r border-slate-300 flex flex-col min-h-0 select-none no-print shrink-0">
          <div className="p-3 bg-slate-100 border-b border-slate-250 flex items-center justify-between text-left">
            <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider">
              Navigasi Halaman
            </span>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5">
              {totalPages} Hlm
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
            {Array.from({ length: totalPages }).map((_, idx) => {
              const isCurrent = activePage === idx;
              return (
                <div
                  key={idx}
                  onClick={() => handleScrollToPage(idx)}
                  className={`flex flex-col items-center gap-1.5 cursor-pointer p-1.5 transition-all group ${isCurrent ? 'bg-teal-50/50 border border-teal-600 shadow-2xs' : 'border border-transparent hover:bg-slate-200/50'
                    }`}
                >
                  <div className={`w-28 h-36 bg-white shadow-xs border ${isCurrent ? 'border-teal-600' : 'border-slate-300 group-hover:border-slate-400'
                    } flex flex-col justify-between p-2 relative overflow-hidden transition-colors`}>
                    <div className="space-y-1.5 opacity-30 select-none">
                      <div className="h-1.5 bg-slate-600 w-3/4" />
                      <div className="h-1 bg-slate-400 w-full" />
                      <div className="h-1 bg-slate-400 w-full" />
                      <div className="h-1 bg-slate-400 w-5/6" />
                      <div className="pt-2 space-y-1">
                        <div className="h-1 bg-slate-400 w-full" />
                        <div className="h-1 bg-slate-400 w-2/3" />
                      </div>
                    </div>
                    <span className={`text-[8px] font-black text-right self-end mt-auto transition-colors ${isCurrent ? 'text-teal-700' : 'text-slate-400'
                      }`}>
                      Hal {idx + 1}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold transition-colors ${isCurrent ? 'text-teal-800' : 'text-slate-655 group-hover:text-slate-900'
                    }`}>
                    Halaman {idx + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT WORKSPACE: Integrated WYSIWYG A4 Canvas */}
        <div
          id="editor-scroll-container"
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto bg-slate-200/40 pt-0 px-8 pb-8 flex justify-center w-full min-h-150 select-text scroll-smooth"
        >
          <div className="relative h-fit mb-12">
            {/* Visual A4 Ruler (no-print) */}
            <div 
              ref={rulerRef} 
              className="w-[794px] h-[24px] bg-slate-100 border-b border-slate-350 flex relative select-none shrink-0 no-print sticky top-0 z-30 shadow-xs" 
              style={{ fontFamily: 'Roboto, sans-serif' }}
            >
              {/* Left Margin area (Greyed out) */}
              <div className="h-full bg-slate-300/40 border-r border-slate-350 relative" style={{ width: `${Math.round(marginCm * (96 / 2.54))}px` }}>
                {/* Drag Handle */}
                <div 
                  className="absolute right-[-4px] top-0 bottom-0 w-[8px] cursor-col-resize hover:bg-teal-600/50 active:bg-teal-700 z-40 transition-colors" 
                  onMouseDown={(e) => handleStartDrag(e, 'left')}
                  title="Seret untuk mengubah margin kiri"
                />
              </div>
              
              {/* Printable Area (White) with tick marks */}
              <div className="h-full bg-white relative flex-1 overflow-hidden">
                {/* Tab Stop Indicators */}
                {Array.from({ length: Math.floor((794 - Math.round(marginCm * (96 / 2.54)) * 2) / 48) }).map((_, i) => {
                  const leftPx = (i + 1) * 48;
                  return (
                    <div 
                      key={`tab-${i}`} 
                      className="absolute top-[2px] w-[3px] h-[3px] bg-slate-400 rounded-full" 
                      style={{ left: `${leftPx - 1.5}px` }} 
                      title={`Tab Stop ${i + 1} (${((i + 1) * 1.27).toFixed(2)} cm)`}
                    />
                  );
                })}

                {/* Ticks and Numbers starting from 0 at the left margin line */}
                {Array.from({ length: 22 }).map((_, i) => {
                  const cmToPx = 96 / 2.54;
                  const leftPx = i * cmToPx;
                  const totalWidthPx = 794;
                  const marginPx = Math.round(marginCm * cmToPx);
                  const printableWidthPx = totalWidthPx - (marginPx * 2);
                  
                  if (leftPx > printableWidthPx) return null;
                  
                  return (
                    <div key={i} className="absolute bottom-0 flex flex-col items-center" style={{ left: `${leftPx}px` }}>
                      {/* Tick Mark */}
                      <div className="w-[1px] h-[6px] bg-slate-400" />
                      {/* Number */}
                      {i % 2 === 0 && (
                        <span className="text-[8px] font-black text-slate-500 absolute bottom-[8px]">
                          {i}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Right Margin area (Greyed out) */}
              <div className="h-full bg-slate-300/40 border-l border-slate-350 relative" style={{ width: `${Math.round(marginCm * (96 / 2.54))}px` }}>
                {/* Drag Handle */}
                <div 
                  className="absolute left-[-4px] top-0 bottom-0 w-[8px] cursor-col-resize hover:bg-teal-600/50 active:bg-teal-700 z-40 transition-colors" 
                  onMouseDown={(e) => handleStartDrag(e, 'right')}
                  title="Seret untuk mengubah margin kanan"
                />
              </div>
            </div>
            
            {/* Jarak aman di bawah ruler agar kertas tidak langsung menempel saat dimuat */}
            <div className="h-8 no-print" />

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
              /* Injeksi spasi line-spacing dan gaya dasar ke ProseMirror (WYSIWYG 1:1 Backend PDF) */
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
              
              /* CSS Tabel untuk Editor Frontend */
              .ProseMirror table {
                border-collapse: collapse !important;
                table-layout: fixed !important;
                width: 100% !important;
                margin: 16px 0 !important;
                overflow: hidden !important;
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
              className="text-slate-800 text-justify prose max-w-none prose-slate prose-xs focus:outline-none transition-all"
              style={{
                width: '794px', // Lebar fix A4 96DPI
                background: 'transparent',
                border: 'none',
                boxShadow: 'none',
                padding: 0,
                // Eksekusi Gaya Global
                fontFamily: FONT_FAMILY_MAP[fontFamily],
                fontSize: fontFamily === 'Times New Roman' ? '11pt' : fontFamily === 'Verdana' ? '10pt' : '11pt',
                // CSS Variable Injection untuk Tiptap Pagination
                ['--rm-margin-left' as any]: `${Math.round(marginCm * (96 / 2.54))}px`,
                ['--rm-margin-right' as any]: `${Math.round(marginCm * (96 / 2.54))}px`,
                ['--rm-margin-top' as any]: `${Math.round(marginCm * (96 / 2.54))}px`,
                ['--rm-margin-bottom' as any]: `${Math.round(marginCm * (96 / 2.54))}px`,
              }}
            >
              <EditorContent editor={editor} className="h-full focus:outline-none text-slate-800" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ArticlePreviewEditorView;