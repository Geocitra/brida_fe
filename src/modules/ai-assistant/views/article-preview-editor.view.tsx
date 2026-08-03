import React, { useState, useEffect, useCallback, useRef } from 'react';
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

// --- Ekstensi Sitasi URL Interaktif ---
import { CitationUrlNode } from '../components/article-preview-editor/citation-url.extension';

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
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { ArticlePreviewEditorHeader } from '../components/article-preview-editor/article-preview-editor-header.component';
import { ArticlePreviewPageNavigator } from '../components/article-preview-editor/article-preview-page-navigator.component';
import { ArticlePreviewCanvas } from '../components/article-preview-editor/article-preview-canvas.component';

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
    defaultAlignment: 'left',
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
  // --- Injeksi Ekstensi Sitasi URL ---
  CitationUrlNode,
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
  const loadedSessionIdRef = useRef<string | null>(null);

  const [totalPages, setTotalPages] = useState<number>(1);
  const [activePage, setActivePage] = useState<number>(0);
  const [activeTableElement, setActiveTableElement] = useState<HTMLTableElement | null>(null);
  const [tableResizeState, setTableResizeState] = useState<{
    mode: 'column' | 'row';
    index: number;
    startX: number;
    startY: number;
    initialValue: number;
    tableElement: HTMLTableElement;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const applyColumnWidth = useCallback((tableElement: HTMLTableElement, colIndex: number, widthPx: number) => {
    const rows = Array.from(tableElement.rows);
    const safeWidth = Math.max(72, Math.round(widthPx));

    rows.forEach((row) => {
      const cell = row.cells[colIndex];
      if (!cell) return;
      cell.style.width = `${safeWidth}px`;
      cell.style.minWidth = `${safeWidth}px`;
      cell.style.maxWidth = `${safeWidth}px`;
    });

    const colgroup = tableElement.querySelector('colgroup');
    if (colgroup) {
      const cols = colgroup.querySelectorAll('col');
      const targetCol = cols[colIndex];
      if (targetCol) {
        targetCol.style.width = `${safeWidth}px`;
      }
    }
  }, []);

  const applyRowHeight = useCallback((tableElement: HTMLTableElement, rowIndex: number, heightPx: number) => {
    const rows = Array.from(tableElement.rows);
    const safeHeight = Math.max(28, Math.round(heightPx));

    const targetRow = rows[rowIndex];
    if (!targetRow) return;

    targetRow.style.height = `${safeHeight}px`;
    Array.from(targetRow.cells).forEach((cell) => {
      cell.style.height = `${safeHeight}px`;
      cell.style.minHeight = `${safeHeight}px`;
    });
  }, []);

  const startTableResize = useCallback((event: React.MouseEvent, mode: 'column' | 'row', index: number, tableElement: HTMLTableElement) => {
    event.preventDefault();
    event.stopPropagation();

    setActiveTableElement(tableElement);

    const startX = event.clientX;
    const startY = event.clientY;
    const initialValue = mode === 'column'
      ? Math.max(72, Math.round(tableElement.rows[0]?.cells[index]?.getBoundingClientRect().width || 72))
      : Math.max(28, Math.round(tableElement.rows[index]?.getBoundingClientRect().height || 28));

    setTableResizeState({
      mode,
      index,
      startX,
      startY,
      initialValue,
      tableElement,
    });
  }, []);

  const editor = useEditor({
    extensions: TIPTAP_EXTENSIONS,
    editorProps: {
      attributes: {
        class: 'focus:outline-none max-w-none min-h-[500px] outline-none h-full text-slate-900 leading-relaxed focus:bg-white selection:bg-teal-700 selection:text-white',
      },
      handleDOMEvents: {
        mousedown: (view, event) => {
          const target = event.target as HTMLElement;
          const tableElement = target.closest('table') as HTMLTableElement | null;
          const isTableClick = tableElement !== null;
          const isResizeHandle = target.classList.contains('column-resize-handle') ||
            target.classList.contains('column-resize-handle-active');

          if (tableElement) {
            setActiveTableElement(tableElement);
          } else {
            setActiveTableElement(null);
          }

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

      if (tableResizeState && editor && !editor.isDestroyed) {
        const nextHtml = editor.view.dom.innerHTML;
        editor.commands.setContent(nextHtml, { emitUpdate: true });
      }

      setTableResizeState(null);
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [editor, tableResizeState]);

  useEffect(() => {
    if (!tableResizeState || !editor || editor.isDestroyed) return;

    const handleGlobalMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - tableResizeState.startX;
      const deltaY = moveEvent.clientY - tableResizeState.startY;

      if (tableResizeState.mode === 'column') {
        const nextWidth = Math.max(72, tableResizeState.initialValue + deltaX);
        applyColumnWidth(tableResizeState.tableElement, tableResizeState.index, nextWidth);
      } else {
        const nextHeight = Math.max(28, tableResizeState.initialValue + deltaY);
        applyRowHeight(tableResizeState.tableElement, tableResizeState.index, nextHeight);
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [applyColumnWidth, applyRowHeight, editor, tableResizeState]);

  useEffect(() => {
    if (!activeTableElement) return;

    const updateOverlay = () => {
      if (!activeTableElement.isConnected) {
        setActiveTableElement(null);
      }
    };

    updateOverlay();
    const observer = new ResizeObserver(updateOverlay);
    observer.observe(activeTableElement);
    return () => observer.disconnect();
  }, [activeTableElement]);

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
    if (isLoading) return;

    if (editor && !editor.isDestroyed && storeSessionId === sessionId && sessionId) {
      if (loadedSessionIdRef.current !== sessionId) {
        editor.commands.setContent(draftContent || '');
        loadedSessionIdRef.current = sessionId;
        requestAnimationFrame(() => {
          if (editor && !editor.isDestroyed) {
            editor.commands.focus('end');
          }
        });
      }
    }
  }, [editor, isLoading, storeSessionId, sessionId, draftContent]);

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
    console.log('[DEBUG] handlePrint dipanggil di Editor View. State:', { editor: !!editor, sessionId, isDirty, isPrinting });
    if (!editor) {
      console.warn('[DEBUG] Batal cetak karena editor null/undefined.');
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

      // Strip semua elemen `.no-print` (termasuk CitationUrlNode chip) dari HTML
      // sebelum dikirim ke server PDF generator, agar tidak muncul di dokumen akhir.
      const stripNoPrintElements = (htmlString: string): string => {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlString, 'text/html');
          doc.querySelectorAll('.no-print').forEach((el) => el.remove());
          return doc.body.innerHTML;
        } catch {
          return htmlString;
        }
      };

      const cleanHtmlForPdf = stripNoPrintElements(editor.getHTML());

      await PdfExportService.exportCustomFormattedArticlePdf(
        cleanHtmlForPdf,
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

      <ArticlePreviewEditorHeader
        editor={editor}
        isSaving={isSaving}
        isPrinting={isPrinting}
        isDirty={isDirty}
        articleTitle={articleTitle}
        activeSessionTitle={activeSession.title}
        fontFamily={fontFamily}
        fontSize={fontSize}
        lineSpacing={lineSpacing}
        fontSizePresets={FONT_SIZE_PRESETS}
        onSaveAndBack={handleSaveAndBack}
        onPrint={handlePrint}
        onFontFamilyChange={handleFontFamilyChange}
        onLineSpacingChange={(value) => setFormatting({ lineSpacing: value })}
        onApplyFontSize={handleApplyFontSize}
        onFontSizeStep={handleFontSizeStep}
        onSetTextAlign={(alignment) => editor?.chain().focus().setTextAlign(alignment).run()}
        onToggleBulletList={() => editor?.chain().focus().toggleBulletList().run()}
        onToggleOrderedList={() => editor?.chain().focus().toggleOrderedList().run()}
        onUndo={() => editor?.chain().focus().undo().run()}
        onRedo={() => editor?.chain().focus().redo().run()}
        onInsertPageBreak={() => editor?.chain().focus().insertContent({ type: 'pageBreak' }).run()}
      />

      {/* MAIN WORKSPACE SPLIT CONTAINER */}
      <div className="flex-1 flex flex-row min-h-0 w-full overflow-hidden">

        <ArticlePreviewPageNavigator
          totalPages={totalPages}
          activePage={activePage}
          onScrollToPage={handleScrollToPage}
        />

        <ArticlePreviewCanvas
          editor={editor}
          lineSpacing={lineSpacing}
          marginCm={marginCm}
          activeTableElement={activeTableElement}
          onScroll={handleScroll}
          onStartTableResize={startTableResize}
          isSaving={isSaving}
          isPrinting={isPrinting}
          isDirty={isDirty}
          onSaveAndBack={handleSaveAndBack}
          onPrint={handlePrint}
          fontSize={fontSize}
          fontFamily={fontFamily}
        />

      </div>
    </div>
  );
};

export default ArticlePreviewEditorView;