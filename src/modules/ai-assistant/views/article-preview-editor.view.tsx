import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import { Node, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
// @ts-ignore
import { PaginationPlus } from 'tiptap-pagination-plus';

import { AiAssistantService } from '../../../services/ai-assistant.service';
import type { ArticleSessionDetail } from '../../../services/ai-assistant.service';
import { PdfExportService } from '../../../services/pdf-export.service';
import { MarkupConverter } from '../utils/markup-converter.util';

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

// Pemetaan nama font ke CSS font-family string yang tepat untuk inline style dan Tiptap
const FONT_FAMILY_MAP: Record<string, string> = {
  'Calibri': "'Calibri', 'Gill Sans', 'Trebuchet MS', sans-serif",
  'Times New Roman': "'Times New Roman', Times, serif",
  'Verdana': "'Verdana', Geneva, Tahoma, sans-serif",
  'Arial': "'Arial', 'Helvetica Neue', Helvetica, sans-serif",
};

type FontFamilyKey = 'Calibri' | 'Times New Roman' | 'Verdana' | 'Arial';

// Kebalikan: CSS string → nama font pilihan user (untuk sync toolbar dari kursor editor)
const CSS_TO_FONT_NAME: Record<string, FontFamilyKey> = Object.fromEntries(
  Object.entries(FONT_FAMILY_MAP).map(([name, css]) => [css, name as FontFamilyKey])
);

// Daftar preset ukuran font untuk dropdown & stepper (pt)
const FONT_SIZE_PRESETS = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

// ==========================================
// KUSTOM EKSTENSI TIPTAP: FONT SIZE (Word-like Inline Style) [1.1.2]
// ==========================================
const FontSizeExtension = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    };
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
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}pt`,
              };
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
    return [
      { tag: 'div[data-type="page-break"]' },
    ];
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

const TIPTAP_EXTENSIONS = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
    // StarterKit v3 menyertakan Underline bawaan — nonaktifkan agar tidak duplikat
    // dengan extension @tiptap/extension-underline yang sudah tidak dipakai
  }),
  TextAlign.configure({
    types: ['heading', 'paragraph'],
    alignments: ['left', 'center', 'right', 'justify'],
    defaultAlignment: 'justify',
  }),
  TextStyle,
  // FontFamily extension resmi Tiptap — inject font-family sebagai inline style ke konten
  FontFamily.configure({
    types: ['textStyle'],
  }),
  FontSizeExtension,
  PageBreakExtension,
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
  const [activeSession, setActiveSession] = useState<ArticleSessionDetail | null>(null);
  const [initialContent, setInitialContent] = useState<string>('');
  const [articleTitle, setArticleTitle] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Parameter Kertas A4 (WYSIWYG)
  const [fontFamily, setFontFamily] = useState<FontFamilyKey>('Calibri');
  const [fontSize, setFontSize] = useState<string>('11'); // Default size: 11pt
  const [lineSpacing, setLineSpacing] = useState<number>(1.18);
  const [marginCm, setMarginCm] = useState<number>(2.5);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Navigasi & Halaman Visual (MS Word Mode)
  const [totalPages, setTotalPages] = useState<number>(1);
  const [activePage, setActivePage] = useState<number>(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Inisialisasi TipTap WYSIWYG Editor
  // onSelectionUpdate & onTransaction dipakai untuk sinkronisasi state toolbar
  // dengan posisi kursor / seleksi yang aktif di dalam dokumen (Word-like behavior)
  const editor = useEditor({
    extensions: TIPTAP_EXTENSIONS,
    editorProps: {
      attributes: {
        class: 'focus:outline-none max-w-none min-h-[500px] outline-none h-full text-slate-900 leading-relaxed text-xs focus:bg-white selection:bg-teal-700 selection:text-white',
      },
    },
    onSelectionUpdate: ({ editor: ed }) => {
      // Baca font-family dari atribut textStyle di posisi kursor / seleksi
      const attrs = ed.getAttributes('textStyle');
      const cssFont: string = attrs.fontFamily || '';
      const matched = CSS_TO_FONT_NAME[cssFont];
      if (matched) setFontFamily(matched);

      // Baca font size dari atribut textStyle
      const rawSize: string | null = attrs.fontSize || null;
      if (rawSize) {
        const parsed = rawSize.replace('pt', '').trim();
        if (!isNaN(Number(parsed))) setFontSize(parsed);
      }
    },
  });

  // Pemantau Jumlah Halaman Terpisah Secara Real-time via ResizeObserver
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

  // Sinkronisasi opsi margin ke dalam Tiptap Pagination secara dinamis
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      try {
        const px = Math.round(marginCm * (96 / 2.54));
        ((editor.commands) as any).updateMargins({
          top: px,
          bottom: px,
          left: px,
          right: px,
        });
      } catch (err) {
        console.error('Gagal memperbarui margin Tiptap:', err);
      }
    }
  }, [editor, marginCm]);

  // Handler Scroll untuk Mengubah Halaman Aktif di Sidebar Navigasi
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const computedPageHeight = 1122;
    const currentPage = Math.floor((scrollTop + computedPageHeight / 2) / computedPageHeight);
    setActivePage(Math.min(totalPages - 1, Math.max(0, currentPage)));
  };

  // Handler Gulir Halus ke Halaman Pilihan dari Navigasi Sidebar
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
    if (sessionId) {
      loadSession();
    } else {
      // Fallback aman jika sessionId tidak terdefinisi (misal akibat refresh kehilangan state)
      setIsLoading(false);
      onBack();
    }
  }, [sessionId]);

  // Sinkronisasi data awal ke editor ketika editor dan data teks siap
  useEffect(() => {
    if (editor && initialContent && editor.isEmpty) {
      editor.commands.setContent(initialContent);
      // Fokus ke akhir dokumen tanpa mengubah formatting apapun
      requestAnimationFrame(() => {
        if (editor && !editor.isDestroyed) {
          editor.commands.focus('end');
        }
      });
    }
  }, [editor, initialContent]);

  const loadSession = async () => {
    setIsLoading(true);
    try {
      const session = await AiAssistantService.getArticleSession(sessionId!);
      setActiveSession(session);
      setArticleTitle(session.articleTitle || session.title || '');

      const htmlContent = MarkupConverter.toHTML(session.fullArticleText || '');
      setInitialContent(htmlContent);

      if (editor) {
        editor.commands.setContent(htmlContent);
      }
    } catch (err: any) {
      console.error('Gagal memuat sesi artikel:', err);
      showToast('Gagal memuat sesi artikel dari database.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Autosave Terkunci: Menyimpan konten secara senyap ke database PostgreSQL
   */
  const executeSilentAutosave = async (): Promise<any> => {
    if (!sessionId || !editor) return;
    const markdownContent = MarkupConverter.toMarkdown(editor.getHTML());
    return AiAssistantService.updateArticleSessionContent(
      sessionId,
      articleTitle,
      markdownContent
    );
  };



  const handleSaveAndBack = async () => {
    if (!sessionId || !editor || isSaving) {
      onBack();
      return;
    }

    setIsSaving(true);
    showToast('⏳ Menyinkronkan perubahan naskah terakhir Anda ke database...');
    try {
      await executeSilentAutosave();
      onBack();
    } catch (err: any) {
      const displayMsg = err.rawMessage || err.message || 'Gagal menyinkronkan data.';
      showToast(`⚠️ Sinkronisasi otomatis gagal: ${displayMsg}. Mengalihkan halaman...`);
      await new Promise((resolve) => setTimeout(resolve, 1200));
      onBack();
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * ALUR ATOMIC PRINT-SAVE [2]
   * Mengintegrasikan proses autosave senyap ke database sebelum mengeksekusi pencetakan PDF.
   */
  const handlePrint = async () => {
    if (!editor && !sessionId) {
      showToast('⚠️ Tidak ada naskah untuk dicetak.');
      return;
    }
    setIsPrinting(true);
    showToast('⏳ Menyinkronkan draf revisi Anda ke database sebelum mencetak...');

    try {
      // Langkah 1: Jalankan autosave secara transaksional di background
      const updatedSession = await executeSilentAutosave();
      setActiveSession(updatedSession);

      // Langkah 2: Sukses save, kirim HTML editor aktif ke PDF engine server
      showToast('🖨️ Merakit dokumen PDF resmi di server (True WYSIWYG)...');
      const targetFontSize = parseFloat(fontSize);

      await PdfExportService.exportCustomFormattedArticlePdf(
        editor.getHTML(), // WYSIWYG murni dari Editor
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
      const displayMsg = err.rawMessage || err.message || 'Gagal melakukan ekspor.';
      showToast(`❌ Pencetakan PDF gagal: ${displayMsg}`);
    } finally {
      setIsPrinting(false);
    }
  };

  /**
   * Apply ukuran font hanya ke teks yang sedang di-seleksi.
   * Jika tidak ada seleksi, berlaku pada karakter berikutnya yang diketik (Word behavior).
   */
  const handleApplyFontSize = useCallback((size: string) => {
    setFontSize(size);
    if (editor && !editor.isDestroyed) {
      (editor.chain().focus() as any).setFontSize(size).run();
    }
  }, [editor]);

  /**
   * Naik / turun ukuran font satu langkah dari FONT_SIZE_PRESETS (A+ / A- Word-like).
   * Jika ukuran saat ini tidak ada di preset, snap ke preset terdekat.
   */
  const handleFontSizeStep = useCallback((direction: 'up' | 'down') => {
    const current = parseInt(fontSize, 10) || 11;
    const idx = FONT_SIZE_PRESETS.indexOf(current);
    let next: number;
    if (idx === -1) {
      // snap ke preset terdekat
      next = direction === 'up'
        ? FONT_SIZE_PRESETS.find(s => s > current) ?? FONT_SIZE_PRESETS[FONT_SIZE_PRESETS.length - 1]
        : [...FONT_SIZE_PRESETS].reverse().find(s => s < current) ?? FONT_SIZE_PRESETS[0];
    } else {
      next = direction === 'up'
        ? FONT_SIZE_PRESETS[Math.min(idx + 1, FONT_SIZE_PRESETS.length - 1)]
        : FONT_SIZE_PRESETS[Math.max(idx - 1, 0)];
    }
    handleApplyFontSize(String(next));
  }, [editor, fontSize, handleApplyFontSize]);

  /**
   * Apply font family hanya ke teks yang sedang di-seleksi (bukan selectAll).
   * Jika tidak ada seleksi aktif, berlaku sebagai "format mark" untuk karakter berikutnya.
   */
  const handleFontFamilyChange = useCallback((newFont: FontFamilyKey) => {
    setFontFamily(newFont);
    if (editor && !editor.isDestroyed) {
      const fontCss = FONT_FAMILY_MAP[newFont];
      editor.chain().focus().setFontFamily(fontCss).run();
    }
  }, [editor]);

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
            ID Sesi Sifat Editorial kosong atau tidak valid. Silakan kembali ke Halaman Penulis Artikel untuk memilih sesi aktif.
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
    <div className="w-full h-screen flex flex-col bg-slate-100 overflow-hidden relative font-roboto select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-teal-400 border border-slate-700 px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-xl animate-in fade-in duration-200">
          <CheckCircle2 size={14} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* STICKY RIBBON HEADER (MS Word style) */}
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
              <span>Kembali ke AI Editor</span>
            </button>
            <div className="h-4 w-px bg-slate-300" />
            <div>
              <h1 className="text-sm font-black uppercase text-slate-900 tracking-wider">
                Sunting Naskah &amp; Tata Letak A4
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
          {/* Seksie A: Layout (Font, Spasi, Margin) */}
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
                onChange={(e) => setLineSpacing(parseFloat(e.target.value))}
                disabled={isSaving || isPrinting}
                className="bg-white border border-slate-300 text-[10px] font-bold px-2 py-1 focus:outline-none focus:border-teal-600 rounded-none cursor-pointer"
              >
                <option value="1.18">1.18 (Nota Dinas)</option>
                <option value="1.5">1.50 (Laporan)</option>
              </select>
            </div>

            <div className="h-4 w-px bg-slate-300" />

            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Margin:</span>
              <select
                value={marginCm}
                onChange={(e) => setMarginCm(parseFloat(e.target.value))}
                disabled={isSaving || isPrinting}
                className="bg-white border border-slate-300 text-[10px] font-bold px-2 py-1 focus:outline-none focus:border-teal-600 rounded-none cursor-pointer"
              >
                <option value="2.5">2.5 cm (Normal)</option>
                <option value="3.0">3.0 cm (Longgar)</option>
              </select>
            </div>
          </div>

          <div className="hidden md:block h-5 w-px bg-slate-300" />

          {/* Seksie B: Text Formatting Toolbar (Tiptap) — setiap state mencerminkan posisi kursor */}
          <div className="flex flex-wrap items-center gap-1">

            {/* Bold / Italic / Underline */}
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

            {/* Font Size: A- | dropdown | A+ — Word-like stepper */}
            <div className="flex items-center">
              {/* A- button */}
              <button
                type="button"
                onClick={() => handleFontSizeStep('down')}
                disabled={isSaving || isPrinting || parseInt(fontSize, 10) <= FONT_SIZE_PRESETS[0]}
                className="flex items-center justify-center w-6 h-6 border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-colors"
                title="Perkecil Huruf"
              >
                <span className="text-[10px] font-black text-slate-600 select-none leading-none">A<sub style={{ fontSize: '7px', verticalAlign: 'sub' }}>▼</sub></span>
              </button>
              {/* Dropdown ukuran */}
              <select
                value={FONT_SIZE_PRESETS.includes(parseInt(fontSize, 10)) ? fontSize : ''}
                onChange={(e) => handleApplyFontSize(e.target.value)}
                disabled={isSaving || isPrinting}
                className="h-6 bg-white border-t border-b border-slate-300 text-[10px] font-bold px-1 focus:outline-none focus:border-teal-600 rounded-none cursor-pointer w-12 text-center"
                title={`Ukuran font saat ini: ${fontSize}pt`}
              >
                {!FONT_SIZE_PRESETS.includes(parseInt(fontSize, 10)) && (
                  <option value="" disabled>{fontSize}pt</option>
                )}
                {FONT_SIZE_PRESETS.map(s => (
                  <option key={s} value={String(s)}>{s}pt</option>
                ))}
              </select>
              {/* A+ button */}
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

            {/* Alignment — aktif state sync dari posisi kursor */}
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

            {/* Bullet / Numbered List */}
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

            {/* Undo/Redo */}
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

            {/* Manual Page Break Button */}
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

      {/* MAIN WORKSPACE SPLIT CONTAINER (Page Navigation Sidebar + Editor Canvas) */}
      <div className="flex-1 flex flex-row min-h-0 w-full overflow-hidden">
        
        {/* LEFT SIDEBAR: MS Word Page Navigation */}
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
                  className={`flex flex-col items-center gap-1.5 cursor-pointer p-1.5 transition-all group ${
                    isCurrent ? 'bg-teal-50/50 border border-teal-600 shadow-2xs' : 'border border-transparent hover:bg-slate-200/50'
                  }`}
                >
                  {/* Miniature Sheet Visualizer */}
                  <div className={`w-28 h-36 bg-white shadow-xs border ${
                    isCurrent ? 'border-teal-600' : 'border-slate-300 group-hover:border-slate-400'
                  } flex flex-col justify-between p-2 relative overflow-hidden transition-colors`}>
                    {/* Dummy content lines to look like a document */}
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
                    {/* Page Number Badge in thumbnail */}
                    <span className={`text-[8px] font-black text-right self-end mt-auto transition-colors ${
                      isCurrent ? 'text-teal-700' : 'text-slate-400'
                    }`}>
                      Hal {idx + 1}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold transition-colors ${
                    isCurrent ? 'text-teal-800' : 'text-slate-655 group-hover:text-slate-900'
                  }`}>
                    Halaman {idx + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT WORKSPACE: Scrollable Integrated WYSIWYG A4 Canvas */}
        <div
          id="editor-scroll-container"
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto bg-slate-200/40 p-8 flex justify-center w-full min-h-[600px] select-text scroll-smooth"
        >
          {/* Virtual A4 sheet layout (relative for pagination lines) */}
          <div className="relative h-fit mb-12">
            {/* Dynamic CSS styles for the pagination layout and gaps */}
            {/* Dynamic CSS styles for the pagination layout and gaps */}
            <style>{`
              /* .page bertindak sebagai spacer vertikal mengambang murni (width 0), jangan diberi border atau margin-bottom */
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
              /* Gaya kertas A4 (background putih & box-shadow) dipusatkan di kontainer utama editor */
              .ProseMirror.rm-with-pagination {
                background-color: white !important;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
                border: 1px solid #cbd5e1 !important;
                box-sizing: border-box !important;
              }
              .ProseMirror {
                outline: none !important;
              }
              .page-break-gap {
                height: 20px;
                background-color: #f1f5f9 !important; /* Matches workspace background */
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

            {/* The A4 pages canvas wrapper */}
            <div
              id="virtual-a4-page"
              className="text-slate-800 text-justify prose max-w-none prose-slate prose-xs focus:outline-none transition-all"
              style={{
                lineHeight: lineSpacing,
                width: '794px', // Width of A4 in pixels
                background: 'transparent',
                border: 'none',
                boxShadow: 'none',
                padding: 0,
                // Font family di-apply langsung via CSS variable — fallback visual wrapper
                fontFamily: FONT_FAMILY_MAP[fontFamily],
                fontSize: fontFamily === 'Times New Roman' ? '11pt' : fontFamily === 'Verdana' ? '10pt' : '11pt',
                // Localized CSS variables to avoid global document reflow loop
                ['--rm-margin-left' as any]: `${Math.round(marginCm * (96 / 2.54))}px`,
                ['--rm-margin-right' as any]: `${Math.round(marginCm * (96 / 2.54))}px`,
                ['--rm-margin-top' as any]: `${Math.round(marginCm * (96 / 2.54))}px`,
                ['--rm-margin-bottom' as any]: `${Math.round(marginCm * (96 / 2.54))}px`,
              }}
            >
              {/* Bidang Penyuntingan TipTap Murni */}
              <EditorContent editor={editor} className="h-full focus:outline-none text-slate-800" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ArticlePreviewEditorView;