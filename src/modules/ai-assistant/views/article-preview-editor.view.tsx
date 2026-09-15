import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, Extension } from '@tiptap/react';
import { Node, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { ResizableImage } from '../components/article-preview-editor/resizable-image.extension';
import { AutoPageSpacer } from '../components/article-preview-editor/auto-page-spacer.extension';

import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';

import { CitationUrlNode } from '../components/article-preview-editor/citation-url.extension';
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
  Send,
  X,
  Link2,
  CheckCheck,
} from 'lucide-react';
import { AdminService } from '../../../services/admin.service';
import { ArticlePreviewEditorHeader } from '../components/article-preview-editor/article-preview-editor-header.component';
import { ArticlePreviewPageNavigator } from '../components/article-preview-editor/article-preview-page-navigator.component';
import { ArticlePreviewCanvas } from '../components/article-preview-editor/article-preview-canvas.component';

interface ArticlePreviewEditorViewProps {
  sessionId: string | null;
  onBack: () => void;
  onNavigateToInfographic?: (topic: string) => void;
}

const FONT_FAMILY_MAP: Record<string, string> = {
  Calibri: "'Calibri', 'Gill Sans', 'Trebuchet MS', sans-serif",
  'Times New Roman': "'Times New Roman', Times, serif",
  Verdana: "'Verdana', Geneva, Tahoma, sans-serif",
  Arial: "'Arial', 'Helvetica Neue', Helvetica, sans-serif",
};

const CSS_TO_FONT_NAME: Record<string, FontFamilyKey> = Object.fromEntries(
  Object.entries(FONT_FAMILY_MAP).map(([name, css]) => [css, name as FontFamilyKey])
);

const FONT_SIZE_PRESETS = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

const PAGE_H = 1123;
const PAGE_GAP = 28;

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
            parseHTML: (element) => element.style.fontSize?.replace('pt', ''),
            renderHTML: (attributes) => {
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

const LineSpacingExtension = Extension.create({
  name: 'lineSpacing',
  addOptions() {
    return { types: ['paragraph', 'heading'] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) return {};
              return { style: `line-height: ${attributes.lineHeight}` };
            },
          },
        },
      },
    ];
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
        class: 'page-break-indicator no-print',
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
  LineSpacingExtension,
  PageBreakExtension,
  Table.configure({
    resizable: true,
  }),
  TableRow,
  TableHeader,
  TableCell,
  CitationUrlNode,
  TabKeyExtension,
  ResizableImage,
  AutoPageSpacer,
];

/**
 * Mengekstrak teks judul asli dari tag <h1> pertama di dalam dokumen kanvas TipTap
 */
const extractTitleFromDocument = (htmlContent: string, fallbackTitle: string): string => {
  if (!htmlContent) return fallbackTitle;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const h1 = doc.querySelector('h1');
    if (h1 && h1.textContent && h1.textContent.trim().length > 0) {
      return h1.textContent.trim();
    }
    const h2 = doc.querySelector('h2');
    if (h2 && h2.textContent && h2.textContent.trim().length > 0) {
      return h2.textContent.trim();
    }
  } catch {
    // Abaikan jika parsing gagal
  }
  return fallbackTitle;
};

/**
 * Membersihkan judul agar menjadi nama berkas yang aman di Windows, macOS, dan Linux
 */
const sanitizeFilenameForDownload = (title: string, defaultName: string = 'Naskah_Kebijakan_BRIDA_Mimika'): string => {
  if (!title || !title.trim()) return defaultName;

  let clean = title.trim();

  // Buang awalan Markdown # atau spasi
  clean = clean.replace(/^#+\s*/, '');

  // Buang tanda titik dua dari awalan umum (misal: "Policy Brief: Judul" -> "Policy_Brief_Judul")
  clean = clean.replace(/^(?:Policy\s*Brief|Artikel|Laporan|Draf|Nota\s*Dinas)\s*:\s*/i, (m) => m.replace(':', '_'));

  // Bersihkan karakter terlarang untuk nama berkas OS
  clean = clean
    .replace(/[/\\?%*:|"<>#]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  // Batasi panjang nama berkas maksimal 100 karakter agar tidak melebihi limit OS
  if (clean.length > 100) {
    clean = clean.substring(0, 100).replace(/_+$/, '');
  }

  return clean || defaultName;
};

export const ArticlePreviewEditorView: React.FC<ArticlePreviewEditorViewProps> = ({
  sessionId,
  onBack,
  onNavigateToInfographic,
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

  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [waContacts, setWaContacts] = useState<any[]>([]);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [waMessage, setWaMessage] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [copyLinkSuccess, setCopyLinkSuccess] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const loadedSessionIdRef = useRef<string | null>(null);

  const [totalPages, setTotalPages] = useState<number>(1);
  const [activePage, setActivePage] = useState<number>(0);
  const lastPageCountRef = useRef<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  const handlePageCountChange = useCallback((count: number) => {
    if (count !== lastPageCountRef.current) {
      lastPageCountRef.current = count;
      setTotalPages(count);
    }
  }, []);

  // Perhitungan posisi scroll yang presisi memperhitungkan PAGE_GAP (28px)
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = event.currentTarget.scrollTop;
    const pageHeightWithGap = (PAGE_H + PAGE_GAP) * zoomLevel;
    const page = Math.floor((scrollTop + 50) / pageHeightWithGap);
    setActivePage(Math.max(0, page));
  }, [zoomLevel]);

  // Navigasi klik halaman akurat untuk naskah panjang 4-6 halaman
  const handleScrollToPage = useCallback((pageIdx: number) => {
    const container = document.getElementById('editor-scroll-container');
    if (!container) return;
    const targetScrollTop = pageIdx * (PAGE_H + PAGE_GAP) * zoomLevel;
    container.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
    setActivePage(pageIdx);
  }, [zoomLevel]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const editor = useEditor({
    extensions: TIPTAP_EXTENSIONS,
    editorProps: {
      attributes: {
        class: 'focus:outline-none max-w-none min-h-[500px] outline-none h-full text-slate-900 leading-relaxed focus:bg-white selection:bg-teal-700 selection:text-white',
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (items && sessionId) {
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.indexOf('image') === 0) {
              const file = item.getAsFile();
              if (file) {
                event.preventDefault();
                setIsUploadingMedia(true);
                showToast('Mengunggah gambar ke server...');

                AiAssistantService.uploadEditorMedia(sessionId, file)
                  .then((mediaData) => {
                    const { schema } = view.state;
                    const node = schema.nodes.image.create({ src: mediaData.url });
                    const transaction = view.state.tr.replaceSelectionWith(node);
                    view.dispatch(transaction);
                    showToast('Gambar berhasil disematkan!');
                  })
                  .catch((err) => {
                    showToast(`Gagal mengunggah gambar: ${err.message}`);
                  })
                  .finally(() => {
                    setIsUploadingMedia(false);
                  });

                return true;
              }
            }
          }
        }
        return false;
      },
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

        const rawContent = session.editorDocumentState && session.editorDocumentState.trim().length > 0
          ? session.editorDocumentState
          : (session.fullArticleText && session.fullArticleText.trim().length > 0
              ? MarkupConverter.toHTML(session.fullArticleText)
              : '<p>Mempersiapkan draf naskah kebijakan...</p>');

        initSession(sessionId, session.articleTitle || session.title || 'Draf Naskah Kebijakan', rawContent);
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

  const handleOpenWaModal = async () => {
    if (!editor || !sessionId) return;
    setLoadingContacts(true);
    setIsWaModalOpen(true);
    try {
      const [opdsList, settingsList] = await Promise.all([
        AdminService.getOpds(),
        AdminService.getPublicSettings().catch(() => []),
      ]);

      const bupatiName = settingsList.find((s: any) => s.key === 'BUPATI_NAME')?.value || 'Johannes Rettob, S.Sos., M.M.';
      const bupatiTitle = settingsList.find((s: any) => s.key === 'BUPATI_TITLE')?.value || 'Bupati Mimika';
      const bupatiPhone = settingsList.find((s: any) => s.key === 'BUPATI_PHONE')?.value || '628123456789';

      const wakilName = settingsList.find((s: any) => s.key === 'WAKIL_BUPATI_NAME')?.value;
      const wakilPhone = settingsList.find((s: any) => s.key === 'WAKIL_BUPATI_PHONE')?.value;

      const sekdaName = settingsList.find((s: any) => s.key === 'SEKDA_NAME')?.value;
      const sekdaPhone = settingsList.find((s: any) => s.key === 'SEKDA_PHONE')?.value;

      const contacts = [
        { id: 'bupati', displayName: bupatiName, role: bupatiTitle, label: `${bupatiName} – ${bupatiTitle}`, phone: bupatiPhone },
        ...(wakilName && wakilPhone ? [{ id: 'wakil_bupati', displayName: wakilName, role: 'Wakil Bupati Mimika', label: `${wakilName} – Wakil Bupati Mimika`, phone: wakilPhone }] : []),
        ...(sekdaName && sekdaPhone ? [{ id: 'sekda', displayName: sekdaName, role: 'Sekretaris Daerah', label: `${sekdaName} – Sekretaris Daerah`, phone: sekdaPhone }] : []),
        ...opdsList
          .filter((o: any) => o.headName && o.headPhone)
          .map((o: any) => ({
            id: o.id,
            displayName: o.headName,
            role: `Kepala ${o.name || o.code}`,
            label: `${o.headName} – Kepala ${o.code}`,
            phone: o.headPhone,
          }))
      ];
      setWaContacts(contacts);
      if (contacts.length > 0) {
        setSelectedContactId(contacts[0].id);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = editor.getHTML();
        const plainSummary = (tempDiv.textContent || '').substring(0, 250).trim() + '...';
        const shareUrl = `${window.location.origin}/share/article/${sessionId}`;

        const defaultMsg = `Yth. Bapak/Ibu ${contacts[0].displayName},\nSelaku ${contacts[0].role}.\n\nBerikut disampaikan draf naskah rekomendasi kebijakan BRIDA Kabupaten Mimika:\n\n*Judul*: ${articleTitle || 'Naskah Kebijakan'}\n*Ringkasan*: ${plainSummary}\n\nNaskah lengkap format PDF resmi dapat diakses melalui tautan:\n${shareUrl}\n\nTerima kasih.\nBRIDA Kabupaten Mimika.`;
        setWaMessage(defaultMsg);
      }
    } catch (err) {
      showToast('Gagal memuat kontak WhatsApp dari master data.');
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleSendWaSubmit = () => {
    const contact = waContacts.find(c => c.id === selectedContactId);
    if (!contact) return;
    const cleanPhone = contact.phone.replace(/[^0-9]/g, '');
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(waMessage)}`;
    window.open(url, '_blank');
    setIsWaModalOpen(false);
  };

  const handleCopyArticleLink = () => {
    if (!sessionId) return;
    const shareUrl = `${window.location.origin}/share/article/${sessionId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopyLinkSuccess(true);
      setTimeout(() => setCopyLinkSuccess(false), 2500);
    });
  };

  const handleSaveAndBack = async () => {
    if (!sessionId || !editor || isSaving) return;
    if (isUploadingMedia) {
      showToast('Tunggu proses unggah gambar selesai...');
      return;
    }

    setIsSaving(true);
    showToast('Menyinkronkan naskah visual ke database...');
    try {
      const editorStateHtml = editor.getHTML();
      
      // Ekstrak judul riil dari <h1> dokumen kanvas
      const resolvedTitle = extractTitleFromDocument(
        editorStateHtml,
        articleTitle || activeSession?.title || 'Draf Naskah Kebijakan'
      );

      // Sinkronkan ke backend dengan judul asli yang tertera di dokumen
      await AiAssistantService.updateArticleSessionContent(sessionId, resolvedTitle, editorStateHtml);
      
      // Perbarui judul di state store lokal
      useEditorStore.getState().initSession(sessionId, resolvedTitle, editorStateHtml);
      markSaved();
      onBack();
    } catch (err: any) {
      showToast(`Sinkronisasi gagal: ${err.message}.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = async () => {
    if (!editor) {
      showToast('Tidak ada naskah untuk dicetak.');
      return;
    }

    setIsPrinting(true);
    const editorStateHtml = editor.getHTML();

    // 1. Ekstrak judul riil dari tag <h1> pertama di naskah
    const resolvedTitle = extractTitleFromDocument(
      editorStateHtml,
      articleTitle || activeSession?.title || 'Draf_Kebijakan_BRIDA_Mimika'
    );

    // 2. Sanitasi menjadi nama berkas yang aman dan rapi
    const safeFilename = sanitizeFilenameForDownload(resolvedTitle);

    // 3. Sinkronkan judul riil ke database & store agar riwayat sesi tidak lagi bernama "sesi"
    if (sessionId) {
      try {
        await AiAssistantService.updateArticleSessionContent(sessionId, resolvedTitle, editorStateHtml);
        useEditorStore.getState().initSession(sessionId, resolvedTitle, editorStateHtml);
        markSaved();
      } catch (err) {
        console.warn('Gagal memperbarui judul sesi saat cetak:', err);
      }
    }

    try {
      showToast(`Merakit PDF resmi: ${safeFilename}.pdf...`);
      const targetFontSize = parseFloat(fontSize);

      const stripNoPrintElements = (htmlString: string): string => {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlString, 'text/html');
          doc.querySelectorAll('.no-print, [data-auto-page-spacer]').forEach((el) => el.remove());
          return doc.body.innerHTML;
        } catch {
          return htmlString;
        }
      };

      const cleanHtmlForPdf = stripNoPrintElements(editorStateHtml);

      // 4. Unduh PDF dengan nama berkas sesuai judul naskah asli!
      await PdfExportService.exportCustomFormattedArticlePdf(
        cleanHtmlForPdf,
        {
          fontFamily,
          fontSize: isNaN(targetFontSize) ? 11 : targetFontSize,
          lineSpacing,
          marginCm,
        },
        safeFilename
      );

      showToast(`Dokumen '${safeFilename}.pdf' berhasil diunduh!`);
    } catch (err: any) {
      showToast(`Pencetakan PDF gagal: ${err.message}`);
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

  const handleInsertImage = useCallback((file: File) => {
    if (!sessionId || !editor || editor.isDestroyed) return;
    setIsUploadingMedia(true);
    showToast('Mengunggah gambar ke server...');

    AiAssistantService.uploadEditorMedia(sessionId, file)
      .then((mediaData) => {
        editor.chain().focus().setImage({ src: mediaData.url }).run();
        showToast('Gambar berhasil disematkan!');
      })
      .catch((err: any) => {
        showToast(`Gagal mengunggah gambar: ${err.message}`);
      })
      .finally(() => {
        setIsUploadingMedia(false);
      });
  }, [sessionId, editor]);

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
          <p className="text-xs text-slate-600">ID Sesi Sifat Editorial kosong atau tidak valid.</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-wider rounded-none inline-flex items-center gap-1.5 cursor-pointer mt-4"
          >
            <ArrowLeft size={13} />
            <span>Kembali ke Editor</span>
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
        isSaving={isSaving || isUploadingMedia}
        isPrinting={isPrinting}
        isDirty={isDirty}
        articleTitle={articleTitle}
        activeSessionTitle={activeSession.title}
        fontFamily={fontFamily}
        fontSize={fontSize}
        lineSpacing={lineSpacing}
        fontSizePresets={FONT_SIZE_PRESETS}
        zoomLevel={zoomLevel}
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
        onInsertImage={handleInsertImage}
        onZoomChange={setZoomLevel}
        onConvertToInfographic={
          onNavigateToInfographic
            ? () => onNavigateToInfographic(articleTitle || activeSession?.title || '')
            : undefined
        }
      />

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
          activeTableElement={null}
          onScroll={handleScroll}
          isSaving={isSaving || isUploadingMedia}
          isPrinting={isPrinting}
          isDirty={isDirty}
          onSaveAndBack={handleSaveAndBack}
          onPrint={handlePrint}
          onShareWa={handleOpenWaModal}
          fontSize={fontSize}
          fontFamily={fontFamily}
          zoomLevel={zoomLevel}
          onPageCountChange={handlePageCountChange}
        />
      </div>

      {isWaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 animate-in fade-in duration-100 no-print">
          <div className="w-full max-w-2xl bg-white border border-slate-350 shadow-2xl rounded-none flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider font-roboto">Berbagi Kajian</span>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mt-0.5 font-roboto">
                  Bagikan Naskah ke WhatsApp
                </h3>
              </div>
              <button
                onClick={() => setIsWaModalOpen(false)}
                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {loadingContacts ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-2">
                  <Loader2 size={24} className="text-emerald-700 animate-spin" />
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider font-roboto">Memuat Daftar Kontak...</span>
                </div>
              ) : waContacts.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs font-roboto">
                  Tidak ada kontak terdaftar di master data.
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block font-roboto">Pilih Kontak Tujuan</label>
                    <select
                      value={selectedContactId}
                      onChange={(e) => setSelectedContactId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-none bg-slate-50 focus:bg-white focus:border-slate-900 outline-none font-bold text-slate-800 font-roboto"
                    >
                      {waContacts.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block font-roboto">Draf Pesan WhatsApp (Dapat Diedit)</label>
                    <textarea
                      value={waMessage}
                      onChange={(e) => setWaMessage(e.target.value)}
                      rows={10}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-none bg-slate-50 focus:bg-white focus:border-slate-900 outline-none font-mono text-slate-750 resize-none"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-slate-200 px-6 py-4 flex justify-between items-center gap-2 bg-slate-50">
              <button
                type="button"
                onClick={handleCopyArticleLink}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-600 font-semibold text-xs uppercase tracking-wider rounded-none hover:bg-slate-100 transition-colors cursor-pointer font-roboto"
              >
                {copyLinkSuccess ? <CheckCheck size={12} className="text-emerald-600" /> : <Link2 size={12} />}
                <span>{copyLinkSuccess ? 'Link Tersalin!' : 'Salin Link'}</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsWaModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold text-xs uppercase tracking-wider rounded-none hover:bg-slate-100 transition-colors cursor-pointer font-roboto"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSendWaSubmit}
                  disabled={loadingContacts || waContacts.length === 0}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold text-xs uppercase tracking-wider rounded-none inline-flex items-center gap-1.5 cursor-pointer border border-emerald-800 shadow-xs font-roboto"
                >
                  <Send size={12} />
                  <span>Kirim via WhatsApp Web</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticlePreviewEditorView;