import React, { useState, useEffect, useRef } from 'react';
import { DocumentService } from '../../../services/document.service';
import type { DocumentRecord } from '../../../services/document.service';
import { AiAssistantService, AiServiceException } from '../../../services/ai-assistant.service';
import type { ArticleSessionDetail } from '../../../services/ai-assistant.service';
import { CategorizedDocumentSelector } from '../../../components/common/categorized-document-selector.component';
import { EmptyState } from '../../../components/common/empty-state.component';
import { ChatInputBar } from '../components/chat-input-bar.component';
import type { StagedAttachment } from '../components/chat-input-bar.component'; // Type-only import
import { RichMessageRenderer } from '../components/chat-panel.component';
import { AiErrorMapper } from '../utils/error-mapper.util';
import { MarkupConverter } from '../utils/markup-converter.util'; // Impor utilitas konverter dua arah
import {
  MessageSquareCode,
  Sparkles,
  FileText,
  PenTool,
  Loader2,
  Copy,
  CheckCircle2,
  History,
  Trash2,
  Database,
  RefreshCw,
  AlertCircle,
  ShieldAlert,
  WifiOff,
  Plus,
  FileCheck,
  Clock,
  Bot,
  User,
} from 'lucide-react';

// --- SUB-KOMPONEN 1: MINI ANCHOR CARD (Pane Sync Indicator) ---

interface MiniAnchorCardProps {
  title: string;
}

const MiniAnchorCard: React.FC<MiniAnchorCardProps> = ({ title }) => {
  return (
    <div className="p-4 my-3 bg-teal-50/50 border border-teal-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs no-print">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-teal-100 border border-teal-300 text-teal-800 shrink-0">
          <FileCheck size={18} className="animate-pulse" />
        </div>
        <div className="space-y-0.5 text-left">
          <strong className="text-xs uppercase tracking-wider text-teal-950 font-bold flex items-center gap-1">
            <Sparkles size={12} className="text-teal-700" />
            <span>Draf Naskah Diperbarui!</span>
          </strong>
          <p className="text-[11px] font-semibold text-slate-700 line-clamp-1">
            Judul: "{title}"
          </p>
        </div>
      </div>
      <div className="text-left sm:text-right shrink-0">
      </div>
    </div>
  );
};

// --- SUB-KOMPONEN 2: KARTU GANGGUAN SINTESIS ARTIKEL (Polymorphic Drafting Error Card) ---

const iconMap = {
  AlertCircle,
  Clock,
  ShieldAlert,
  WifiOff,
  Database,
};

interface DraftingFallbackCardProps {
  errorType: string;
  rawErrorMsg: string;
  onRetry: () => void;
  onNewSession: () => void;
}

const DraftingFallbackCard: React.FC<DraftingFallbackCardProps> = ({
  errorType,
  rawErrorMsg,
  onRetry,
  onNewSession,
}) => {
  const mapped = AiErrorMapper.map(new AiServiceException(500, errorType, rawErrorMsg), 'DRAFTING');
  const IconComponent = iconMap[mapped.iconName] || AlertCircle;

  return (
    <div className="bg-slate-50 border border-slate-300 p-6 my-4 font-roboto w-full text-slate-800 space-y-4 shadow-2xs">
      <div className="flex items-start gap-4">
        <div className="p-2 bg-white border border-slate-200 shrink-0 text-slate-600">
          <IconComponent size={20} className="animate-pulse" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900 leading-snug">
            {mapped.title}
          </h4>
          <p className="text-xs font-semibold text-slate-600 leading-relaxed text-justify">
            {mapped.description}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200/60 no-print">
        {mapped.actionType === 'RETRY' && (
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs uppercase tracking-wider rounded-none inline-flex items-center gap-1.5 cursor-pointer border border-teal-800 shadow-2xs"
          >
            <RefreshCw size={12} className="shrink-0" />
            <span>Coba Sintesis Ulang</span>
          </button>
        )}

        {mapped.actionType === 'NEW_SESSION' && (
          <button
            type="button"
            onClick={onNewSession}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs uppercase tracking-wider rounded-none inline-flex items-center gap-1.5 cursor-pointer border border-teal-800 shadow-2xs"
          >
            <Plus size={12} className="shrink-0" />
            <span>Mulai Sesi Baru</span>
          </button>
        )}
      </div>
    </div>
  );
};

export type DraftingStatus = 'IDLE' | 'SUCCESS' | 'ERROR';

export interface ArticleGeneratorViewProps {
  initialPrompt?: string;
  initialSelectedDocIds?: string[];
  onClearSharedDocIds?: () => void;
  onNavigateToQa: () => void;
  onNavigateToEditor: (sessionId: string) => void;
  initialSessionId?: string | null;
}

// --- TIMELINE OBROLAN MESSAGE INTERFACE ---

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  status: 'SUCCESS' | 'ERROR';
  errorType?: string;
  suggestions?: string[];
  timestamp: string;
  updatedArticle?: {
    title: string;
    draftMarkdown: string;
  };
}

// --- KOMPONEN UTAMA: ARTICLE GENERATOR VIEW ---

export const ArticleGeneratorView: React.FC<ArticleGeneratorViewProps> = ({
  initialPrompt,
  initialSelectedDocIds,
  onClearSharedDocIds,
  onNavigateToQa,
  onNavigateToEditor,
  initialSessionId,
}) => {
  // Pengelolaan State Pilihan Dokumen Acuan Global
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(true);

  // State Kooperatif Sinkronisasi Lembar Kerja Kanan (Pane Kanan) [Markdown format]
  const [currentDraft, setCurrentDraft] = useState<string>('');
  const [articleTitle, setArticleTitle] = useState<string>('');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Logika Obrolan Sisi Kiri
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [lastFailedQuery, setLastFailedQuery] = useState<string | null>(null);

  // Parameter Riwayat Sesi Artikel
  const [articleSessionsHistory, setArticleSessionsHistory] = useState<ArticleSessionDetail[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [showHistorySidebar, setShowHistorySidebar] = useState<boolean>(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  const filteredArticleSessions = articleSessionsHistory.filter((session) => {
    const q = historySearchQuery.toLowerCase();
    const titleText = session.articleTitle || session.title || '';
    const lastMsgText = (session as any).lastMessage || '';
    return titleText.toLowerCase().includes(q) || lastMsgText.toLowerCase().includes(q);
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    loadDocuments();
    loadHistory();
    if (initialSessionId) {
      handleLoadSession(initialSessionId);
    }
  }, [initialSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const [tone, setTone] = useState<string>('solutif');
  const [targetLength, setTargetLength] = useState<'SHORT' | 'MEDIUM' | 'LONG'>('MEDIUM');

  const loadDocuments = async () => {
    setIsLoadingDocs(true);
    try {
      const fetched = await DocumentService.listDocuments();
      setDocuments(fetched || []);

      if (!initialSelectedDocIds || initialSelectedDocIds.length === 0) {
        if (fetched && fetched.length > 0 && selectedDocIds.length === 0) {
          // Jangan pilih dokumen secara otomatis saat pengguna belum menentukan acuan.
          // Biarkan state tetap kosong agar backend menerima konteks tanpa dokumen acuan.
        }
      }
    } catch (err: any) {
      console.error('Gagal memuat dokumen acuan:', err);
      setDocuments([]);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  /**
   * Konsolidasi State Dokumen Teruskan (Forwarding State Sync)
   */
  useEffect(() => {
    if (documents.length > 0) {
      if (initialSelectedDocIds && initialSelectedDocIds.length > 0) {
        const validIds = initialSelectedDocIds.filter((id) =>
          documents.some((doc) => doc.id === id)
        );

        if (validIds.length > 0) {
          setSelectedDocIds(validIds);
        }
        onClearSharedDocIds?.();
      }
    }
  }, [initialSelectedDocIds, documents]);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const sessions = await AiAssistantService.listArticleSessions();
      setArticleSessionsHistory(sessions || []);
    } catch (err: any) {
      console.error('Gagal memuat riwayat sesi artikel:', err);
      setArticleSessionsHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleToggleDocument = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleSelectAll = () => {
    setSelectedDocIds(documents.map((d) => d.id));
  };

  const handleClearAll = () => {
    setSelectedDocIds([]);
  };

  const handleCreateNewSession = () => {
    setActiveSessionId(null);
    setCurrentDraft('');
    setArticleTitle('');
    setMessages([]);
    setSessionError(null);
    setLastFailedQuery(null);
    setSelectedDocIds([]);
  };

  const handleLoadSession = async (sessionId: string) => {
    setIsLoadingDocs(true);
    setSessionError(null);
    setLastFailedQuery(null);
    try {
      const session = await AiAssistantService.getArticleSession(sessionId);
      setActiveSessionId(session.id);

      // Jaminan: State disinkronkan dalam bentuk draf Markdown bersih
      setCurrentDraft(session.fullArticleText || '');
      setArticleTitle(session.articleTitle || session.title);

      if (session.sources && session.sources.length > 0) {
        const sourceIds = session.sources.map((s: any) => s.documentId || s.id);
        setSelectedDocIds(sourceIds);

        // Pemicu Sinkronisasi: Muat ulang dokumen agar dokumen virtual hasil scrap langsung masuk ke selector
        await loadDocuments();
      }

      // Format riwayat pesan dari database ke struktur UI
      const formattedMessages: ChatMessage[] = (session.messages || []).map((m) => {
        const isAi = m.role === 'ASSISTANT';
        let text = m.content;
        let updatedArticle = undefined;

        if (isAi) {
          try {
            const parsed = JSON.parse(m.content);
            if (parsed && typeof parsed === 'object') {
              text = parsed.answer || parsed.fullArticleText || m.content;
              updatedArticle = parsed.updatedArticle || undefined;
            }
          } catch {
            // String legacy
          }
        }

        return {
          id: m.id,
          sender: isAi ? 'ai' : 'user',
          text,
          status: 'SUCCESS',
          timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          updatedArticle,
        };
      });

      setMessages(formattedMessages);
    } catch (err: any) {
      setSessionError(`Gagal memuat sesi: ${err.message}`);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, idToDelete: string) => {
    e.stopPropagation();
    if (!window.confirm('Apakah Anda yakin ingin menghapus sesi artikel ini dari database?')) return;

    try {
      await AiAssistantService.deleteArticleSession(idToDelete);
      if (activeSessionId === idToDelete) {
        handleCreateNewSession();
      }
      loadHistory();
      showToast('🗑️ Sesi artikel berhasil dihapus.');
    } catch (err: any) {
      alert(`Gagal menghapus sesi: ${err.message}`);
    }
  };

  /**
   * Delegasi Layanan Pengunggahan Berkas Transien ke Komponen Induk (Low Coupling)
   */
  const handleUploadStagedAsset = async (file: File) => {
    if (!activeSessionId) {
      const primaryId = selectedDocIds.length > 0 ? selectedDocIds[0] : '';
      const sessionTitle = articleTitle.trim() || `Sesi Artikel: ${new Date().toLocaleDateString('id-ID')}`;
      const newSessionId = await AiAssistantService.createSession(primaryId, sessionTitle, selectedDocIds, 'ARTICLE_GENERATOR');
      setActiveSessionId(newSessionId);
      return AiAssistantService.uploadSessionAttachment(newSessionId, file);
    }
    return AiAssistantService.uploadSessionAttachment(activeSessionId, file);
  };

  /**
   * Logika Utama Pengiriman Kueri Multimodal Kolaboratif (Dual-Pane Coordinator)
   */
  const handleSendMessage = async (
    queryText: string,
    stagedAttachments: StagedAttachment[],
    selectedTone: string,
    selectedLength: 'SHORT' | 'MEDIUM' | 'LONG',
  ) => {
    setTone(selectedTone);
    setTargetLength(selectedLength);
    const isFirstPrompt = !activeSessionId;
    setIsGenerating(true);
    setSessionError(null);

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: queryText || 'Mengirim berkas terlampir...',
      status: 'SUCCESS',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);

    const attachmentsPayload = stagedAttachments.map((att) => ({
      fileId: att.fileId,
      classification: att.classification,
    }));

    try {
      if (isFirstPrompt) {
        // Alur 1: Inisiasi Sesi Baru menggunakan generateArticleMulti (Creative Synthesis)
        const firstSession = await AiAssistantService.generateArticleMulti({
          documentIds: selectedDocIds,
          articleTitle: articleTitle.trim() || 'Draf Artikel Publikasi',
          targetLength: selectedLength,
          tone: selectedTone,
          userInstruction: queryText,
        });

        setActiveSessionId(firstSession.id);
        setCurrentDraft(firstSession.fullArticleText || '');

        // Pindahi riwayat pesan pertama ke timeline UI
        handleLoadSession(firstSession.id);
        showToast('✨ Draf artikel berhasil di-sintesis oleh AI!');
      } else {
        // Alur 2: Revisi Sesi Aktif menggunakan sendQuery (Conversational Editing Loop)
        const response = await AiAssistantService.sendQuery(
          activeSessionId!,
          queryText,
          attachmentsPayload,
          currentDraft,
          selectedDocIds,
          selectedTone,
          selectedLength,
        );

        const responseText = response.data.answer || response.data.fullArticleText || 'Maaf, asisten AI gagal memformulasikan jawaban teks yang valid.';
        const responseSuggestions = response.data.suggestions || [];
        const updatedArticle = response.data.updatedArticle || undefined;

        // Pemicu Sinkronisasi: Jika scraping proaktif mendeteksi dokumen virtual baru, perbarui centang dokumen acuan aktif [1.1.2]
        if (response.documentIds && response.documentIds.length > 0) {
          setSelectedDocIds(response.documentIds);
          await loadDocuments(); // Reload untuk merender ubin dokumen virtual baru di selector
        }

        if (updatedArticle) {
          // AI mengembalikan drafMarkdown bersih (Markdown format)
          setCurrentDraft(updatedArticle.draftMarkdown);
          setArticleTitle(updatedArticle.title);
        }

        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: responseText,
          status: 'SUCCESS',
          suggestions: responseSuggestions,
          updatedArticle,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, aiMsg]);
      }

      loadHistory();
    } catch (err: any) {
      let errorType = 'UNKNOWN_ERROR';
      let displayMsg = err.message || 'Gagal menyinkronkan data.';

      if (err instanceof AiServiceException) {
        errorType = err.errorType;
        displayMsg = err.rawMessage;
      }

      setLastFailedQuery(queryText);

      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: displayMsg,
        status: 'ERROR',
        errorType,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyText = () => {
    if (!currentDraft) return;
    // Jaminan: Teks yang disalin adalah Markdown bersih tanpa tag HTML visual kustom
    const cleanMarkdown = MarkupConverter.toMarkdown(MarkupConverter.toHTML(currentDraft));
    navigator.clipboard.writeText(cleanMarkdown);
    showToast('📋 Teks naskah berhasil disalin ke papan klip.');
  };

  return (
    <div className="flex flex-col w-full bg-slate-100/70 p-6 space-y-6 font-roboto">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 border border-slate-700 shadow-xl flex items-center gap-3 rounded-none animate-in fade-in duration-200">
          <CheckCircle2 size={18} className="text-teal-400 shrink-0" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* SECTION 1. COLLABORATIVE HERO HEADER */}
      <div className="w-full bg-white border border-slate-300 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-none shadow-2xs shrink-0">
        <div className="flex flex-col text-left">
          <span className="text-[10px] font-bold tracking-widest text-teal-800 uppercase mb-1.5 flex items-center gap-1.5">
            <Sparkles size={12} className="text-teal-700" />
            <span>WORKSPACE PENULISAN KOLABORATIF</span>
          </span>
          <h1 className="text-lg font-bold uppercase text-slate-900 tracking-tight">
            AI Agent &amp; Co-Writing Editor
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateToQa}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-wider rounded-none inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <MessageSquareCode size={14} />
            <span>Tanya AI Chat</span>
          </button>
        </div>
      </div>

      {/* SECTION 1.5. DOCUMENT REFERENCES (Full-Width Card) */}
      <div className="w-full bg-white border border-slate-300 p-3.5 shadow-2xs rounded-none shrink-0 text-left">
        <CategorizedDocumentSelector
          documents={documents}
          selectedDocIds={selectedDocIds}
          onToggleDoc={handleToggleDocument}
          onSelectAll={handleSelectAll}
          onClearAll={handleClearAll}
          isLoading={isLoadingDocs}
          title="Dokumen Referensi Acuan"
          isLocked={isGenerating}
        />
      </div>

      {/* SECTION 2. DUAL-PANE COOPERATIVE WORKSPACE AREA (100% Full-Width Workspace) [1.1.2] */}
      <div className="flex flex-row gap-0 w-full h-212.5 overflow-hidden">

        {/* Sub-Sidebar: Riwayat Sesi Kolaboratif (Chat History) */}
        {showHistorySidebar && (
          <div className="w-64 h-full flex flex-col bg-white border border-slate-300 border-r-0 shadow-xs shrink-0 overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">Riwayat Naskah</span>
              <button
                onClick={handleCreateNewSession}
                className="p-1 bg-teal-700 text-white hover:bg-teal-800"
                title="Mulai sesi draf baru"
              >
                <Plus size={12} />
              </button>
            </div>

            {/* Input Pencarian Filter Sesi Sejarah */}
            <div className="p-2 border-b border-slate-200 bg-slate-50 space-y-2">
              <input
                type="text"
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                placeholder="Cari draf naskah..."
                className="w-full px-2 py-1 text-xs border border-slate-300 focus:outline-none focus:border-teal-700 bg-white rounded-none font-medium"
              />
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-150">
              {isLoadingHistory ? (
                <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
                  <Loader2 size={13} className="animate-spin text-teal-600" />
                  <span>Memuat...</span>
                </div>
              ) : filteredArticleSessions.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    icon={History}
                    title="Naskah Kosong"
                    description="Belum ada riwayat naskah dibuat."
                  />
                </div>
              ) : (
                filteredArticleSessions.map((sess) => {
                  const isActive = activeSessionId === sess.id;
                  return (
                    <div
                      key={sess.id}
                      onClick={() => handleLoadSession(sess.id)}
                      className={`p-3 text-left text-xs cursor-pointer transition-colors space-y-1 ${isActive ? 'bg-teal-50/80 font-bold text-teal-950' : 'hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="truncate font-bold text-slate-800">{sess.articleTitle || sess.title}</span>
                        <button
                          onClick={(e) => handleDeleteSession(e, sess.id)}
                          className="text-slate-400 hover:text-red-650 p-0.5 shrink-0"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold flex items-center justify-between">
                        <span>{sess.tone?.toUpperCase()}</span>
                        <span>{new Date(sess.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Kolom Utama Chat Workspace (Tampil Penuh 100% Tanpa Split-Screen Pratinjau) [1.1.2] */}
        <div className="flex-1 h-full flex flex-col min-h-0 bg-white border border-slate-300 shadow-xs overflow-hidden">
          {/* Header: Toggle Sidebar & Dynamic Manual Editor Redirection [1.1.2] */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 font-roboto text-left">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHistorySidebar(!showHistorySidebar)}
                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Sembunyikan/Tampilkan sejarah"
              >
                <History size={14} />
              </button>
              <span className="text-xs font-bold uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                <MessageSquareCode size={14} className="text-teal-700" />
                <span>Obrolan Kolaboratif AI</span>
              </span>
            </div>
          </div>

          {/* Banner Kesalahan Sesi Obrolan */}
          {sessionError && (
            <div className="p-3 bg-red-50 border-b border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0 text-red-650" />
              <span>{sessionError}</span>
            </div>
          )}

          {/* Timeline Chronicle Obrolan */}
          <div className="flex-1 overflow-y-auto bg-slate-50 divide-y divide-slate-150 p-5">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <Bot size={40} className="text-teal-700 mb-2 opacity-85" />
                <p className="font-roboto text-xs font-bold text-slate-800 mb-1">
                  Mulai Kolaborasi Sesi Naskah
                </p>
                <p className="font-roboto text-[11px] text-slate-500 max-w-sm leading-relaxed">
                  Pilih dokumen acuan di atas, lalu ketik topik/instruksi draf awal Anda pada kolom input di bawah untuk memicu perakitan naskah kolaboratif.
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-4 flex gap-4 items-start transition-colors border-b border-slate-100 ${msg.sender === 'user' ? 'bg-teal-50/20' : 'bg-white'
                    }`}
                >
                  <div className={`w-7 h-7 flex items-center justify-center shrink-0 border ${msg.sender === 'user' ? 'bg-slate-900 border-slate-950 text-white' : 'bg-teal-700 border-teal-800 text-white'
                    }`}>
                    {msg.sender === 'user' ? <User size={13} /> : <Bot size={13} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        {msg.sender === 'user' ? 'Editor AKLS' : 'AKLS AI Writer'}
                      </span>
                      <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                    </div>

                    <div className="text-xs text-slate-900 leading-relaxed">
                      {msg.sender === 'ai' ? (
                        msg.status === 'ERROR' ? (
                          <DraftingFallbackCard
                            errorType={msg.errorType || 'UNKNOWN_ERROR'}
                            rawErrorMsg={msg.text}
                            onRetry={() => handleSendMessage(lastFailedQuery || msg.text, [], tone, targetLength)}
                            onNewSession={handleCreateNewSession}
                          />
                        ) : (
                          <div className="space-y-2">
                            <RichMessageRenderer text={msg.text} activeDocIds={selectedDocIds} />

                            {/* Render secara terintegrasi Mini Anchor Card jika ada draf terbarui */}
                            {msg.updatedArticle && (
                              <MiniAnchorCard title={msg.updatedArticle.title} />
                            )}
                          </div>
                        )
                      ) : (
                        <p className="whitespace-pre-wrap font-roboto text-left">{msg.text}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            {isGenerating && (
              <div className="flex gap-2.5 items-center text-slate-600 text-xs font-bold p-4">
                <Loader2 size={15} className="animate-spin text-teal-700" />
                <span>AI Agent sedang merakit naskah berdasarkan data acuan...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Judul Artikel Opsional */}
          <div className="shrink-0 border-b border-slate-200 bg-slate-50 p-3">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Judul Artikel (opsional)
            </label>
            <input
              type="text"
              value={articleTitle}
              onChange={(e) => setArticleTitle(e.target.value)}
              placeholder="Ketik judul artikel Anda di sini"
              className="w-full px-3 py-2 text-sm border border-slate-300 bg-white focus:outline-none focus:border-teal-700 rounded-none"
              disabled={isGenerating}
            />
          </div>

          {/* ChatInputBar Multimodal Terintegrasi */}
          <div className="shrink-0 border-t border-slate-200">
            <ChatInputBar
              isLoading={isGenerating}
              initialPrompt={initialPrompt}
              onSendMessage={handleSendMessage}
              onUploadAttachment={handleUploadStagedAsset}
              activeSessionId={activeSessionId}
              onNavigateToEditor={onNavigateToEditor}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default ArticleGeneratorView;