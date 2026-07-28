import React, { useState, useEffect } from 'react';
import { marked } from 'marked';
import { AiAssistantService } from '../../../services/ai-assistant.service';
import type { ArticleSessionDetail } from '../../../services/ai-assistant.service';
import { PdfExportService } from '../../../services/pdf-export.service';
import {
  Loader2,
  Save,
  Download,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileText,
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
  const [editableText, setEditableText] = useState<string>('');
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
      setEditableText(session.fullArticleText || '');
      setArticleTitle(session.articleTitle || session.title || '');
    } catch (err: any) {
      console.error('Gagal memuat sesi artikel:', err);
      showToast('Gagal memuat sesi artikel dari database.');
    } finally {
      setIsLoading(false);
    }
  };

  const getRenderedHtml = (markdownText: string): string => {
    try {
      return marked.parse(markdownText) as string;
    } catch (err) {
      console.error('Gagal mengonversi Markdown ke HTML:', err);
      return markdownText;
    }
  };

  /**
   * Menyimpan draf artikel secara manual ke database PostgreSQL
   */
  const handleSave = async () => {
    if (!sessionId) return;
    setIsSaving(true);
    try {
      const updated = await AiAssistantService.updateArticleSessionContent(
        sessionId,
        articleTitle,
        editableText
      );
      setActiveSession(updated);
      setEditableText(updated.fullArticleText || '');
      showToast('💾 Perubahan naskah Anda berhasil disimpan permanen ke database BRIDA!');
    } catch (err: any) {
      const displayMsg = err.rawMessage || err.message || 'Gagal menyinkronkan data.';
      showToast(`Gagal menyimpan ke database: ${displayMsg}`);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Save-On-Back Sync: Menyimpan naskah secara otomatis sebelum kembali ke obrolan Dual-Pane [5]
   */
  const handleSaveAndBack = async () => {
    if (!sessionId || isSaving) {
      onBack();
      return;
    }

    setIsSaving(true);
    showToast('⏳ Menyinkronkan perubahan naskah terakhir Anda ke database...');

    try {
      await AiAssistantService.updateArticleSessionContent(
        sessionId,
        articleTitle,
        editableText
      );
      // Pindahkan halaman setelah data ter-commit dengan sukses ke database
      onBack();
    } catch (err: any) {
      const displayMsg = err.rawMessage || err.message || 'Gagal menyinkronkan data.';
      console.error('[ArticlePreviewEditor] Gagal autosave sebelum kembali:', err);

      // Berikan toleransi kesalahan agar pengguna tidak terlock out di halaman editor jika jaringan mati
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
    if (!editableText && !sessionId) {
      showToast('⚠️ Tidak ada naskah untuk dicetak. Silakan buka sesi dari halaman generator.');
      return;
    }
    setIsPrinting(true);

    let exportContent = editableText;
    let exportTitle = articleTitle;

    if (sessionId) {
      try {
        showToast('⏳ Mengambil data naskah terbaru dari server untuk ekspor...');
        const exportData = await AiAssistantService.getArticleExportData(sessionId);

        if (exportData.content) {
          exportContent = exportData.content;
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

    if (!exportContent) {
      showToast('⚠️ Tidak ada naskah untuk dicetak.');
      setIsPrinting(false);
      return;
    }

    try {
      const htmlContent = await Promise.resolve(marked.parse(exportContent));

      showToast('🖨️ Mengonversi dan merakit dokumen PDF resmi...');
      const fontSize = fontFamily === 'Times New Roman' ? 11 : fontFamily === 'Verdana' ? 10 : 11;

      await PdfExportService.exportCustomFormattedArticlePdf(
        htmlContent,
        {
          fontFamily,
          fontSize,
          lineSpacing,
          marginCm,
        },
        exportTitle || 'Draf_Artikel_BRIDA_Mimika'
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
            onClick={handleSaveAndBack} // Menjalankan autosave transaksional sebelum kembali [5]
            disabled={isSaving || isPrinting}
            className="self-start mb-2 text-xs font-bold text-teal-700 hover:text-teal-850 disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
          >
            {isSaving ? <Loader2 size={13} className="animate-spin" /> : <ArrowLeft size={13} />}
            <span>Kembali ke AI Editor</span>
          </button>
          <h1 className="text-xl font-bold uppercase text-slate-900 tracking-tight mt-1">
            Redaksi &amp; Layouting Cetak (A4)
          </h1>
          <p className="text-xs text-slate-500 font-normal mt-1">
            Sesi Cetak: <span className="font-bold text-slate-700">{articleTitle || activeSession.title}</span>
          </p>
        </div>
      </div>

      {/* Main Workspace split panel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Side: Editorial Settings & Markdown Textarea Editor (2 cols) */}
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

          {/* Text Editor Box */}
          <div className="bg-white border border-slate-300 p-5 flex flex-col flex-1 min-h-0">
            <div className="flex items-center gap-1.5 mb-2 shrink-0">
              <FileText size={14} className="text-slate-500" />
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Sumber Naskah Markdown (Sunting Manual)
              </label>
            </div>
            <textarea
              value={editableText}
              onChange={(e) => setEditableText(e.target.value)}
              disabled={isSaving || isPrinting}
              className="w-full flex-1 bg-slate-50 border border-slate-300 p-4 text-xs font-mono leading-relaxed text-slate-900 focus:outline-none focus:bg-white focus:border-teal-600 rounded-none resize-none overflow-y-auto disabled:opacity-60"
              placeholder="Tulis naskah draf artikel Anda di sini..."
            />
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
              htmlContent={getRenderedHtml(editableText)}
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