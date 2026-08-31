import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import { Node, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { ResizableImage } from '../components/article-preview-editor/resizable-image.extension';
import { AutoPageSpacer } from '../components/article-preview-editor/auto-page-spacer.extension';

// --- Ekstensi Tabel Baru ---
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';

// --- Ekstensi Sitasi URL Interaktif ---
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
  // --- Ekstensi Gambar Baru ---
  ResizableImage,
  // --- Injeksi Ekstensi Auto Page Spacer ---
  AutoPageSpacer,
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

  // WhatsApp Share State
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
  const [activeTableElement, setActiveTableElement] = useState<HTMLTableElement | null>(null);
  const [tableResizeState, setTableResizeState] = useState<{
    mode: 'column' | 'row';
    index: number;
    startX: number;
    startY: number;
    initialValue: number;
    tableElement: HTMLTableElement;
  } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  // Dipanggil oleh ArticlePreviewCanvas setiap kali tinggi konten berubah
  const handlePageCountChange = useCallback((count: number) => {
    if (count !== lastPageCountRef.current) {
      lastPageCountRef.current = count;
      setTotalPages(count);
    }
  }, []);

  // Update activePage saat user menggulir dokumen
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = event.currentTarget.scrollTop;
    const page = Math.floor(scrollTop / (1123 * zoomLevel));
    setActivePage(Math.max(0, page));
  }, [zoomLevel]);

  // Gulir ke halaman tertentu saat user klik thumbnail di navigator
  const handleScrollToPage = useCallback((pageIdx: number) => {
    const container = document.getElementById('editor-scroll-container');
    if (!container) return;
    container.scrollTo({ top: pageIdx * 1123 * zoomLevel, behavior: 'smooth' });
    setActivePage(pageIdx);
  }, [zoomLevel]);

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
          return false;
        }
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
                showToast('⏳ Mengunggah berkas gambar ke server...');

                AiAssistantService.uploadEditorMedia(sessionId, file)
                  .then((mediaData) => {
                    const { schema } = view.state;
                    const node = schema.nodes.image.create({ src: mediaData.url });
                    const transaction = view.state.tr.replaceSelectionWith(node);
                    view.dispatch(transaction);
                    showToast('✅ Gambar berhasil disematkan!');
                  })
                  .catch((err) => {
                    console.error('Gagal mengunggah media:', err);
                    showToast(`⚠️ Gagal mengunggah gambar: ${err.message}`);
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
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0 && sessionId) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
            setIsUploadingMedia(true);
            showToast('⏳ Mengunggah berkas gambar ke server...');

            AiAssistantService.uploadEditorMedia(sessionId, file)
              .then((mediaData) => {
                const { schema } = view.state;
                const node = schema.nodes.image.create({ src: mediaData.url });
                const pos = coordinates ? coordinates.pos : view.state.selection.from;
                const transaction = view.state.tr.insert(pos, node);
                view.dispatch(transaction);
                showToast('✅ Gambar berhasil disematkan!');
              })
              .catch((err) => {
                console.error('Gagal mengunggah media:', err);
                showToast(`⚠️ Gagal mengunggah gambar: ${err.message}`);
              })
              .finally(() => {
                setIsUploadingMedia(false);
              });

            return true;
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

  // --- updatePages sekarang dikelola oleh onPageCountChange callback dari Canvas ---
  // (tidak perlu useEffect terpisah di sini)

  useEffect(() => {
    const handleGlobalMouseUp = () => {
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

        // Jika naskah sudah memiliki representasi visual editorial (editorDocumentState), gunakan langsung.
        // Jika sesi lama/baru pertama kali dibuka, kompilasi sekali dari fullArticleText via MarkupConverter.toHTML.
        const htmlContent = session.editorDocumentState && session.editorDocumentState.trim().length > 0
          ? session.editorDocumentState
          : MarkupConverter.toHTML(session.fullArticleText || '');

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

  const getDefaultWaMessage = (
    receiverName: string,
    receiverRole: string,
    titleStr: string,
    sessionUUID: string,
    draftHtml: string
  ) => {
    // Bersihkan HTML tag untuk summary
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = draftHtml;
    const plainText = (tempDiv.textContent || tempDiv.innerText || '').replace(/\s+/g, ' ').trim();
    const cleanSummary = plainText.substring(0, 280).trim() + '...';

    const origin = window.location.origin;
    const shareUrl = `${origin}/share/article/${sessionUUID}`;

    return `Yth. Bapak/Ibu ${receiverName},
Selaku ${receiverRole}.

Assalamu'alaikum Wr. Wb.

Dengan hormat, bersama surat ini kami sampaikan naskah artikel publikasi resmi dari Badan Riset dan Inovasi Daerah (BRIDA) Kabupaten Mimika untuk dapat dijadikan bahan pertimbangan:

Judul    : ${titleStr}
Ringkasan: ${cleanSummary}

Naskah lengkap beserta dokumen resmi dalam format PDF dapat diakses dan diunduh melalui tautan berikut:
${shareUrl}

Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.

Hormat kami,
Badan Riset dan Inovasi Daerah (BRIDA)
Kabupaten Mimika`;
  };

  const handleOpenWaModal = async () => {
    if (!editor || !sessionId) return;
    setLoadingContacts(true);
    setIsWaModalOpen(true);
    try {
      const [opdsList, settingsList] = await Promise.all([
        AdminService.getOpds(),
        AdminService.getPublicSettings().catch(() => []),
      ]);

      const bupatiName = settingsList.find((s: any) => s.key === 'BUPATI_NAME')?.value || 'Darius Sabon Rain, S.E., M.Ec.Dev.';
      const bupatiPhone = settingsList.find((s: any) => s.key === 'BUPATI_PHONE')?.value || '628123456789';

      const contacts = [
        { id: 'bupati', displayName: bupatiName, role: 'Bupati Mimika', label: `${bupatiName} – Bupati Mimika`, phone: bupatiPhone },
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
        const msg = getDefaultWaMessage(
          contacts[0].displayName,
          contacts[0].role,
          articleTitle || 'Artikel Publikasi',
          sessionId,
          editor.getHTML()
        );
        setWaMessage(msg);
      }
    } catch (err) {
      console.error('Gagal memuat kontak WhatsApp:', err);
      showToast('⚠️ Gagal mengambil daftar kontak dari database.');
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleContactChange = (contactId: string) => {
    setSelectedContactId(contactId);
    const contact = waContacts.find((c: any) => c.id === contactId);
    if (contact && editor && sessionId) {
      const msg = getDefaultWaMessage(
        contact.displayName,
        contact.role,
        articleTitle || 'Artikel Publikasi',
        sessionId,
        editor.getHTML()
      );
      setWaMessage(msg);
    }
  };


  const handleSendWaSubmit = () => {
    const contact = waContacts.find(c => c.id === selectedContactId);
    if (!contact) return;
    const cleanPhone = contact.phone.replace(/[^0-9]/g, '');
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(waMessage)}`;
    window.open(url, '_blank');
    setIsWaModalOpen(false);
    showToast(`Membuka WhatsApp untuk mengirim naskah ke ${contact.name}`);
  };

  const handleCopyArticleLink = () => {
    if (!sessionId) return;
    const shareUrl = `${window.location.origin}/share/article/${sessionId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopyLinkSuccess(true);
      setTimeout(() => setCopyLinkSuccess(false), 2500);
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopyLinkSuccess(true);
      setTimeout(() => setCopyLinkSuccess(false), 2500);
    });
  };

  const handleSaveAndBack = async () => {
    if (!sessionId || !editor || isSaving) return;

    if (isUploadingMedia) {
      showToast('⏳ Mohon tunggu sampai proses unggah gambar selesai...');
      return;
    }

    if (!isDirty) {
      onBack();
      return;
    }

    setIsSaving(true);
    showToast('⏳ Menyinkronkan naskah visual ke database...');
    try {
      const editorStateHtml = editor.getHTML();
      await AiAssistantService.updateArticleSessionContent(sessionId, articleTitle, editorStateHtml);
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

    if (isUploadingMedia) {
      showToast('⏳ Mohon tunggu sampai proses unggah gambar selesai...');
      return;
    }

    setIsPrinting(true);

    if (isDirty && sessionId) {
      showToast('⏳ Menyimpan draf ke database sebelum mencetak...');
      try {
        const editorStateHtml = editor.getHTML();
        await AiAssistantService.updateArticleSessionContent(sessionId, articleTitle, editorStateHtml);
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

  const handleInsertImage = useCallback((file: File) => {
    if (!sessionId || !editor || editor.isDestroyed) {
      showToast('⚠️ Editor belum siap untuk menyisipkan gambar.');
      return;
    }

    setIsUploadingMedia(true);
    showToast('⏳ Mengunggah berkas gambar ke server...');

    AiAssistantService.uploadEditorMedia(sessionId, file)
      .then((mediaData) => {
        editor.chain().focus().setImage({ src: mediaData.url }).run();
        showToast('✅ Gambar berhasil disematkan ke naskah!');
      })
      .catch((err: any) => {
        console.error('Gagal mengunggah gambar via toolbar:', err);
        showToast(`⚠️ Gagal mengunggah gambar: ${err.message}`);
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

      {/* WhatsApp Share Modal (rounded-none border-slate-300 layout) */}
      {isWaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/40 backdrop-blur-sm p-4 animate-in fade-in duration-100 no-print">
          <div className="w-full max-w-2xl bg-white border border-slate-350 shadow-2xl rounded-none flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-205 px-6 py-4">
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
                  Tidak ada kontak terdaftar dengan nomor WA aktif di database master. Silakan tambahkan nomor WA OPD di menu Admin Console.
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block font-roboto">Pilih Kontak Tujuan</label>
                    <select
                      value={selectedContactId}
                      onChange={(e) => handleContactChange(e.target.value)}
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

            <div className="border-t border-slate-205 px-6 py-4 flex justify-between items-center gap-2 bg-slate-50">
              <button
                type="button"
                onClick={handleCopyArticleLink}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-600 font-semibold text-xs uppercase tracking-wider rounded-none hover:bg-slate-100 transition-colors cursor-pointer font-roboto"
              >
                {copyLinkSuccess ? <CheckCheck size={12} className="text-emerald-600" /> : <Link2 size={12} />}
                <span>{copyLinkSuccess ? 'Link Tersalin!' : 'Salin Link Artikel'}</span>
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