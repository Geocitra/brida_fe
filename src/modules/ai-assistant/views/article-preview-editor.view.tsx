import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';

import { AiAssistantService } from '../../../services/ai-assistant.service';
import type { ArticleSessionDetail } from '../../../services/ai-assistant.service';
import { PdfExportService } from '../../../services/pdf-export.service';
import { MarkupConverter } from '../utils/markup-converter.util';

import {
  Loader2,
  Save,
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
} from 'lucide-react';

interface ArticlePreviewEditorViewProps {
  sessionId: string | null;
  onBack: () => void;
}

const fontStyles: Record<string, string> = {
  'Calibri': 'font-sans',
  'Times New Roman': 'font-serif',
  'Verdana': 'font-sans tracking-tight',
  'Arial': 'font-sans tracking-tight',
};

const InteractivePaperSheet: React.FC<{
  htmlContent: string;
  fontFamily: 'Calibri' | 'Times New Roman' | 'Verdana' | 'Arial';
  lineSpacing: number;
  marginCm: number;
}> = ({ htmlContent, fontFamily, lineSpacing, marginCm }) => {
  const fontSize = fontFamily === 'Times New Roman' ? '11pt' : fontFamily === 'Verdana' ? '10pt' : '11pt';

  return (
    <div className="flex justify-center bg-slate-200/50 p-6 overflow-x-auto select-none no-print w-full">
      <div
        className={`bg-white shadow-lg border border-slate-300 text-slate-800 text-justify prose max-w-none prose-slate prose-xs focus:outline-none transition-all ${fontStyles[fontFamily]}`}
        style={{
          lineHeight: lineSpacing,
          padding: `${marginCm}cm`,
          minHeight: '29.7cm', // Rasio tinggi kertas A4 standar
          width: '21.0cm',     // Rasio lebar kertas A4 standar
          fontSize,
        }}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
};

export const ArticlePreviewEditorView: React.FC<ArticlePreviewEditorViewProps> = ({
  sessionId,
  onBack,
}) => {
  const [activeSession, setActiveSession] = useState<ArticleSessionDetail | null>(null);
  const [editableText, setEditableText] = useState<string>(''); // Menyimpan representasi HTML aktif dari Editor
  const [articleTitle, setArticleTitle] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Parameter Formatting Kertas A4 (WYSIWYG)
  const [fontFamily, setFontFamily] = useState<'Calibri' | 'Times New Roman' | 'Verdana' | 'Arial'>('Calibri');
  const [lineSpacing, setLineSpacing] = useState<number>(1.18);
  const [marginCm, setMarginCm] = useState<number>(2.5);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Inisialisasi TipTap WYSIWYG Editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      UnderlineExtension,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
        defaultAlignment: 'justify',
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-xs focus:outline-none max-w-none min-h-[450px] outline-none h-full text-slate-900 leading-relaxed font-sans text-xs p-4 selection:bg-teal-700 selection:text-white',
      },
    },
    onUpdate: ({ editor }) => {
      // Sinkronisasi HTML secara real-time ke state pratinjau lembar kertas kanan
      setEditableText(editor.getHTML());
    },
  });

  useEffect(() => {
    if (sessionId) {
      loadSession();
    }
  }, [sessionId]);

  const loadSession = async () => {
    setIsLoading(true);
    try {
      const session = await AiAssistantService.getArticleSession(sessionId!);
      setActiveSession(session);
      setArticleTitle(session.articleTitle || session.title || '');

      // Tahap 1 [RAG Compatibility Pass]: Konversi Markdown dari DB menjadi HTML
      const htmlContent = MarkupConverter.toHTML(session.fullArticleText || '');
      setEditableText(htmlContent);

      // Tahap 2: Muat konten HTML ke dalam TipTap Editor
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
   * Menyimpan draf artikel secara manual ke database PostgreSQL
   */
  const handleSave = async () => {
    if (!sessionId || !editor) return;
    setIsSaving(true);
    try {
      // Konversi HTML dari Editor TipTap ke Markdown bersih sebelum dikirim ke DB
      const markdownContent = MarkupConverter.toMarkdown(editor.getHTML());

      const updated = await AiAssistantService.updateArticleSessionContent(
        sessionId,
        articleTitle,
        markdownContent
      );

      setActiveSession(updated);
      const htmlContent = MarkupConverter.toHTML(updated.fullArticleText || '');
      setEditableText(htmlContent);
      editor.commands.setContent(htmlContent);

      showToast('💾 Perubahan naskah Anda berhasil disimpan permanen ke database AKLS!');
    } catch (err: any) {
      const displayMsg = err.rawMessage || err.message || 'Gagal menyinkronkan data.';
      showToast(`Gagal menyimpan ke database: ${displayMsg}`);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Save-On-Back Sync: Menyimpan naskah secara otomatis sebelum kembali ke obrolan Dual-Pane
   */
  const handleSaveAndBack = async () => {
    if (!sessionId || !editor || isSaving) {
      onBack();
      return;
    }

    setIsSaving(true);
    showToast('⏳ Menyinkronkan perubahan naskah terakhir Anda ke database...');

    try {
      // Konversi HTML TipTap ke Markdown
      const markdownContent = MarkupConverter.toMarkdown(editor.getHTML());

      await AiAssistantService.updateArticleSessionContent(
        sessionId,
        articleTitle,
        markdownContent
      );

      onBack();
    } catch (err: any) {
      const displayMsg = err.rawMessage || err.message || 'Gagal menyinkronkan data.';
      console.error('[ArticlePreviewEditor] Gagal autosave sebelum kembali:', err);
      showToast(`⚠️ Sinkronisasi otomatis gagal: ${displayMsg}. Mengalihkan halaman...`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      onBack();
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Merakit dokumen dan mencetak PDF resmi menggunakan PdfExportService
   */
  const handlePrint = async () => {
    if (!editor && !sessionId) {
      showToast('⚠️ Tidak ada naskah untuk dicetak. Silakan buka sesi dari halaman generator.');
      return;
    }
    setIsPrinting(true);

    let exportHtmlContent = editor ? editor.getHTML() : editableText;
    let exportTitle = articleTitle;

    if (sessionId) {
      try {
        showToast('⏳ Mengambil data naskah terbaru dari server untuk ekspor...');
        const exportData = await AiAssistantService.getArticleExportData(sessionId);

        if (exportData.content) {
          // Konversi data Markdown backend menjadi HTML cetak
          exportHtmlContent = MarkupConverter.toHTML(exportData.content);
        }
        if (exportData.title) {
          exportTitle = exportData.title;
        }
      } catch (fetchErr: any) {
        console.warn('[ArticlePreviewEditor] Gagal ambil export-data, menggunakan draf lokal:', fetchErr);
        showToast('⚠️ Gagal sinkron dari server, menggunakan naskah lokal untuk PDF...');
        await new Promise((res) => setTimeout(res, 1200));
      }
    }

    if (!exportHtmlContent) {
      showToast('⚠️ Tidak ada naskah untuk dicetak.');
      setIsPrinting(false);
      return;
    }

    try {
      showToast('🖨️ Mengonversi dan merakit dokumen PDF resmi...');
      const fontSize = fontFamily === 'Times New Roman' ? 11 : fontFamily === 'Verdana' ? 10 : 11;

      await PdfExportService.exportCustomFormattedArticlePdf(
        exportHtmlContent,
        {
          fontFamily,
          fontSize,
          lineSpacing,
          marginCm,
        },
        exportTitle || 'Draf_Artikel_AKLS_Mimika'
      );

      showToast('✅ Dokumen PDF resmi berhasil diunduh!');
    } catch (err: any) {
      const displayMsg = err.rawMessage || err.message || 'Gagal melakukan ekspor.';
      console.error('[ArticlePreviewEditor] Gagal generate PDF:', err);
      showToast(`❌ Pencetakan PDF gagal: ${displayMsg}`);
    } finally {
      setIsPrinting(false);
    }
  };

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
    <div className="flex flex-col w-full bg-slate-100/70 p-6 space-y-6 font-roboto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 border border-slate-700 shadow-xl flex items-center gap-3 rounded-none">
          <CheckCircle2 size={18} className="text-teal-400 shrink-0" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="w-full bg-white border border-slate-300 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-none shadow-2xs">
        <div className="flex flex-col">
          <button
            onClick={handleSaveAndBack} // Menjalankan autosave transaksional sebelum kembali
            disabled={isSaving || isPrinting}
            className="self-start mb-2 text-xs font-bold text-teal-700 hover:text-teal-850 disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
          >
            {isSaving ? <Loader2 size={13} className="animate-spin" /> : <ArrowLeft size={13} />}
            <span>Kembali ke AI Editor</span>
          </button>
          <h1 className="text-xl font-bold uppercase text-slate-900 tracking-tight mt-1">
            Sunting Naskah Artikel &amp; Layouting Cetak (A4)
          </h1>
          <p className="text-xs text-slate-500 font-normal mt-1">
            Sesi Cetak: <span className="font-bold text-slate-700">{articleTitle || activeSession.title}</span>
          </p>
        </div>
      </div>

      {/* Main Workspace split panel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Side: Editorial Settings & TipTap WYSIWYG Editor (2 cols) */}
        <div className="lg:col-span-2 space-y-6 flex flex-col h-185">
          {/* Format Control Panel */}
          <div className="bg-white border border-slate-300 p-5 space-y-4 rounded-none shadow-xs">
            <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wider border-b border-slate-200 pb-2">
              Kontrol Letak Kertas &amp; Estetika Cetak
            </h3>

            {/* Font Family Selector */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-600 uppercase">Tipe Huruf (Font)</label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value as any)}
                disabled={isSaving || isPrinting}
                className="w-full bg-white border border-slate-300 text-xs font-semibold px-2.5 py-1.5 rounded-none focus:outline-none focus:border-teal-600 shadow-xs disabled:opacity-50"
              >
                <option value="Calibri">Calibri</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Verdana">Verdana</option>
                <option value="Arial">Arial</option>
              </select>
            </div>

            {/* Line Spacing Selector */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-600 uppercase">Jarak Baris (Spasi)</label>
              <div className="grid grid-cols-2 divide-x divide-slate-300 border border-slate-300 bg-white">
                <button
                  type="button"
                  onClick={() => setLineSpacing(1.18)}
                  disabled={isSaving || isPrinting}
                  className={`py-1 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 ${lineSpacing === 1.18 ? 'bg-teal-700 text-white' : 'hover:bg-slate-50 text-slate-700'}`}
                >
                  1.18 (Nota Dinas)
                </button>
                <button
                  type="button"
                  onClick={() => setLineSpacing(1.5)}
                  disabled={isSaving || isPrinting}
                  className={`py-1 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 ${lineSpacing === 1.5 ? 'bg-teal-700 text-white' : 'hover:bg-slate-50 text-slate-700'}`}
                >
                  1.50 (Laporan)
                </button>
              </div>
            </div>

            {/* Margin Selector */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-600 uppercase">Margin Sisi Kertas (cm)</label>
              <div className="grid grid-cols-2 divide-x divide-slate-300 border border-slate-300 bg-white">
                <button
                  type="button"
                  onClick={() => setMarginCm(2.5)}
                  disabled={isSaving || isPrinting}
                  className={`py-1 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 ${marginCm === 2.5 ? 'bg-teal-700 text-white' : 'hover:bg-slate-50 text-slate-700'}`}
                >
                  2.5 cm (Standar)
                </button>
                <button
                  type="button"
                  onClick={() => setMarginCm(3.0)}
                  disabled={isSaving || isPrinting}
                  className={`py-1 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 ${marginCm === 3.0 ? 'bg-teal-700 text-white' : 'hover:bg-slate-50 text-slate-700'}`}
                >
                  3.0 cm (Longgar)
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isPrinting}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs uppercase tracking-wider rounded-none flex items-center justify-center gap-1.5 border border-slate-950 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                <span>Simpan DB</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={isSaving || isPrinting}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-850 text-white font-bold text-xs uppercase tracking-wider rounded-none flex items-center justify-center gap-1.5 border border-teal-850 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isPrinting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                <span>Cetak PDF</span>
              </button>
            </div>
          </div>

          {/* TipTap Rich Text Editor Container */}
          <div className="bg-white border border-slate-300 flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-300 p-2 flex flex-wrap items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-2 ml-1">Toolbar</span>

              {/* Inline Styles */}
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleBold().run()}
                className={`p-1.5 transition-colors cursor-pointer ${editor?.isActive('bold') ? 'bg-teal-700 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                title="Teks Tebal (Bold)"
              >
                <Bold size={14} />
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                className={`p-1.5 transition-colors cursor-pointer ${editor?.isActive('italic') ? 'bg-teal-700 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                title="Teks Miring (Italic)"
              >
                <Italic size={14} />
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
                className={`p-1.5 transition-colors cursor-pointer ${editor?.isActive('underline') ? 'bg-teal-700 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                title="Garis Bawah (Underline)"
              >
                <UnderlineIcon size={14} />
              </button>

              <div className="w-px h-4 bg-slate-300 mx-1" />

              {/* Text Alignments */}
              <button
                type="button"
                onClick={() => editor?.chain().focus().setTextAlign('left').run()}
                className={`p-1.5 transition-colors cursor-pointer ${editor?.isActive({ textAlign: 'left' }) ? 'bg-teal-700 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                title="Rata Kiri (Align Left)"
              >
                <AlignLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().setTextAlign('center').run()}
                className={`p-1.5 transition-colors cursor-pointer ${editor?.isActive({ textAlign: 'center' }) ? 'bg-teal-700 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                title="Rata Tengah (Align Center)"
              >
                <AlignCenter size={14} />
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().setTextAlign('right').run()}
                className={`p-1.5 transition-colors cursor-pointer ${editor?.isActive({ textAlign: 'right' }) ? 'bg-teal-700 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                title="Rata Kanan (Align Right)"
              >
                <AlignRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
                className={`p-1.5 transition-colors cursor-pointer ${editor?.isActive({ textAlign: 'justify' }) ? 'bg-teal-700 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                title="Rata Kanan Kiri (Align Justify)"
              >
                <AlignJustify size={14} />
              </button>

              <div className="w-px h-4 bg-slate-300 mx-1" />

              {/* Lists */}
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                className={`p-1.5 transition-colors cursor-pointer ${editor?.isActive('bulletList') ? 'bg-teal-700 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                title="Daftar Berbutir (Bullet List)"
              >
                <List size={14} />
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                className={`p-1.5 transition-colors cursor-pointer ${editor?.isActive('orderedList') ? 'bg-teal-700 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                title="Daftar Berangka (Ordered List)"
              >
                <ListOrdered size={14} />
              </button>

              <div className="w-px h-4 bg-slate-300 mx-1" />

              {/* History Undo Redo */}
              <button
                type="button"
                onClick={() => editor?.chain().focus().undo().run()}
                disabled={!editor?.can().undo()}
                className="p-1.5 text-slate-600 hover:bg-slate-200 disabled:opacity-40 transition-colors cursor-pointer"
                title="Batal Tindakan (Undo)"
              >
                <Undo size={14} />
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().redo().run()}
                disabled={!editor?.can().redo()}
                className="p-1.5 text-slate-600 hover:bg-slate-200 disabled:opacity-40 transition-colors cursor-pointer"
                title="Ulangi Tindakan (Redo)"
              >
                <Redo size={14} />
              </button>
            </div>

            {/* TipTap WYSIWYG Editable Area */}
            <div className="flex-1 overflow-y-auto bg-slate-50 focus-within:bg-white border-none min-h-0 outline-none">
              <EditorContent editor={editor} className="h-full focus:outline-none" />
            </div>
          </div>
        </div>

        {/* Right Side: A4 Page Preview Canvas (3 cols) */}
        <div className="lg:col-span-3 bg-white border border-slate-300 p-6 flex flex-col h-185 overflow-hidden">
          <div className="border-b border-slate-200 pb-3 mb-4 shrink-0 flex items-center justify-between">
            <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider">
              Pratinjau Halaman A4 Resmi
            </h3>
            <span className="text-[10px] text-slate-400 font-semibold italic">
              *Tampilan menyerupai cetak fisik PDF
            </span>
          </div>

          <div className="flex-1 overflow-y-auto border border-slate-300 bg-slate-200">
            <InteractivePaperSheet
              htmlContent={editableText} // Menampilkan HTML langsung dari TipTap secara instan
              fontFamily={fontFamily}
              lineSpacing={lineSpacing}
              marginCm={marginCm}
            />
          </div>
        </div>
      </div>
    </div>
  );
};