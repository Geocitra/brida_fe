import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Loader2,
  PenTool,
  ArrowRight,
  AlertCircle,
  History,
  Plus,
  Trash2,
  MessageSquare,
  X,
  Clock,
  ShieldAlert,
  WifiOff,
  Database,
  RefreshCw,
  LogOut,
  Paperclip,
  Image as ImageIcon,
  Sparkles,
  FileCheck,
  FileText,
} from 'lucide-react';
import { AiAssistantService, AiServiceException } from '../../../services/ai-assistant.service';
import { AiErrorMapper } from '../utils/error-mapper.util';

// --- SUB-KOMPONEN 1: PENAMPIL TABEL MARKDOWN DINAMIS ---

interface MarkdownTableRendererProps {
  rawTable: string;
}

const MarkdownTableRenderer: React.FC<MarkdownTableRendererProps> = ({ rawTable }) => {
  const lines = rawTable.trim().split('\n');
  if (lines.length < 2) return null;

  const headerLine = lines[0];
  const headers = headerLine
    .split('|')
    .map((h) => h.trim())
    .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

  const rows = lines.slice(2).map((line) => {
    return line
      .split('|')
      .map((cell) => cell.trim())
      .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
  });

  return (
    <div className="overflow-x-auto border border-slate-300 my-3 rounded-none shadow-2xs">
      <table className="min-w-full divide-y divide-slate-300 text-xs font-roboto">
        <thead className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300">
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className="px-4 py-2.5 text-left uppercase tracking-wider text-[10px] font-extrabold text-teal-900"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
          {rows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-4 py-2 whitespace-normal font-medium">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// --- SUB-KOMPONEN 2: PARSER & RENDERING MARKDOWN KLIEN ---

const parseInlineStyles = (lineText: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  let keyIdx = 0;

  const boldParts = lineText.split('**');
  boldParts.forEach((part, index) => {
    const isBold = index % 2 === 1;
    const codeParts = part.split('`');

    codeParts.forEach((subPart, subIndex) => {
      const isInlineCode = subIndex % 2 === 1;

      if (isInlineCode) {
        parts.push(
          <code
            key={keyIdx++}
            className="px-1.5 py-0.5 bg-slate-100 text-teal-800 font-mono text-[11px] border border-slate-200"
          >
            {subPart}
          </code>,
        );
      } else if (isBold) {
        parts.push(
          <strong key={keyIdx++} className="font-bold text-slate-900">
            {subPart}
          </strong>,
        );
      } else {
        parts.push(subPart);
      }
    });
  });

  return parts;
};

export interface RichMessageRendererProps {
  text: string;
}

export const RichMessageRenderer: React.FC<RichMessageRendererProps> = ({ text }) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  let tableBuffer: string[] = [];
  let insideTable = false;
  let listBuffer: React.ReactNode[] = [];
  let keyIdx = 0;

  const flushList = () => {
    if (listBuffer.length > 0) {
      elements.push(
        <ul key={`list-${keyIdx++}`} className="list-disc pl-5 space-y-1.5 my-2">
          {listBuffer}
        </ul>,
      );
      listBuffer = [];
    }
  };

  const flushTable = () => {
    if (tableBuffer.length > 0) {
      elements.push(
        <MarkdownTableRenderer key={`table-${keyIdx++}`} rawTable={tableBuffer.join('\n')} />,
      );
      tableBuffer = [];
      insideTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList();
      insideTable = true;
      tableBuffer.push(line);
      continue;
    } else if (insideTable) {
      flushTable();
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      const content = parseInlineStyles(trimmed.slice(2));
      listBuffer.push(
        <li key={`li-${keyIdx++}`} className="text-xs text-slate-700 leading-relaxed font-roboto">
          {content}
        </li>,
      );
      continue;
    } else {
      flushList();
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4
          key={keyIdx++}
          className="text-xs font-bold text-teal-800 uppercase tracking-wider mt-4 mb-1.5 font-roboto"
        >
          {parseInlineStyles(trimmed.slice(4))}
        </h4>,
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h3
          key={keyIdx++}
          className="text-sm font-bold text-slate-900 mt-5 mb-2 border-b border-slate-200 pb-1 font-roboto"
        >
          {parseInlineStyles(trimmed.slice(3))}
        </h3>,
      );
    } else if (trimmed.startsWith('# ')) {
      elements.push(
        <h2
          key={keyIdx++}
          className="text-base font-extrabold text-slate-900 mt-6 mb-3 border-b-2 border-slate-300 pb-1.5 font-roboto"
        >
          {parseInlineStyles(trimmed.slice(2))}
        </h2>,
      );
    } else if (trimmed === '') {
      continue;
    } else {
      elements.push(
        <p
          key={keyIdx++}
          className="text-xs text-slate-800 font-normal leading-relaxed my-2 font-roboto text-justify"
        >
          {parseInlineStyles(line)}
        </p>
      );
    }
  }

  flushList();
  flushTable();

  return <div className="space-y-1 w-full text-left">{elements}</div>;
};

// --- SUB-KOMPONEN 3: SUGGESTION CHIPS ---

interface SuggestionChipsProps {
  suggestions?: string[];
  onClick: (suggestion: string) => void;
  disabled: boolean;
}

const SuggestionChips: React.FC<SuggestionChipsProps> = ({
  suggestions,
  onClick,
  disabled,
}) => {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3 pt-2.5 border-t border-slate-100 no-print">
      {suggestions.map((s, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onClick(s)}
          disabled={disabled}
          className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 disabled:opacity-50 text-teal-800 hover:text-teal-950 font-bold text-xs border border-teal-200 hover:border-teal-300 rounded-none shadow-2xs transition-colors cursor-pointer disabled:cursor-not-allowed inline-flex items-center gap-1.5"
        >
          <span>{s}</span>
          <ArrowRight size={11} className="text-teal-600 shrink-0 animate-pulse" />
        </button>
      ))}
    </div>
  );
};

// --- SUB-KOMPONEN 4: KARTU FALLBACK GANGGUAN SISTEM ---

const iconMap = {
  AlertCircle,
  Clock,
  ShieldAlert,
  WifiOff,
  Database,
};

interface SystemFallbackCardProps {
  errorType: string;
  rawErrorMsg: string;
  onRetry: () => void;
  onNewSession: () => void;
  onLogin: () => void;
}

const SystemFallbackCard: React.FC<SystemFallbackCardProps> = ({
  errorType,
  rawErrorMsg,
  onRetry,
  onNewSession,
  onLogin,
}) => {
  const mapped = AiErrorMapper.map(new AiServiceException(500, errorType, rawErrorMsg));
  const IconComponent = iconMap[mapped.iconName] || AlertCircle;

  return (
    <div className="bg-slate-50 border border-slate-300 p-4 my-3 font-roboto w-full text-slate-800 space-y-3 shadow-2xs">
      <div className="flex items-start gap-3">
        <div className="p-1.5 bg-white border border-slate-200 shrink-0 text-slate-600">
          <IconComponent size={18} className="animate-pulse" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 leading-snug">
            {mapped.title}
          </h4>
          <p className="text-xs font-medium text-slate-600 leading-relaxed text-justify">
            {mapped.description}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/60 no-print">
        {mapped.actionType === 'RETRY' && (
          <button
            type="button"
            onClick={onRetry}
            className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs uppercase transition-colors inline-flex items-center gap-1.5 cursor-pointer rounded-none border border-teal-800 shadow-2xs"
          >
            <RefreshCw size={12} className="shrink-0" />
            <span>Coba Kirim Ulang</span>
          </button>
        )}

        {mapped.actionType === 'NEW_SESSION' && (
          <button
            type="button"
            onClick={onNewSession}
            className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs uppercase transition-colors inline-flex items-center gap-1.5 cursor-pointer rounded-none border border-teal-800 shadow-2xs"
          >
            <Plus size={12} className="shrink-0" />
            <span>Mulai Sesi Baru</span>
          </button>
        )}

        {mapped.actionType === 'LOGIN' && (
          <button
            type="button"
            onClick={onLogin}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs uppercase transition-colors inline-flex items-center gap-1.5 cursor-pointer rounded-none border border-slate-950 shadow-2xs"
          >
            <LogOut size={12} className="shrink-0" />
            <span>Masuk Sesi Kembali</span>
          </button>
        )}
      </div>
    </div>
  );
};

// --- SUB-KOMPONEN 5: MINI ANCHOR CARD (Pane Sync Indicator) [5] ---

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
          <strong className="block text-xs uppercase tracking-wider text-teal-950 font-bold flex items-center gap-1">
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

// --- INTERFACES DAN TIPE DATA ---

interface StagedAttachment {
  fileId: string;
  fileName: string;
  mimeType: string;
  classification?: 'BASELINE' | 'REALIZATION' | 'GENERAL_REFERENCE';
  base64Data?: string; // Menyimpan pratinjau biner khusus tipe berkas gambar
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  status: 'SUCCESS' | 'ERROR';
  errorType?: string;
  suggestions?: string[];
  timestamp: string;
  updatedArticle?: { // Menyimpan snapshot naskah di dalam timeline obrolan
    title: string;
    draftMarkdown: string;
  };
}

interface QaSessionItem {
  id: string;
  title: string;
  documentId: string;
  documentTitle: string;
  createdAt: string;
  updatedAt: string;
  messagesCount: number;
  lastMessage?: string;
}

interface ChatPanelProps {
  selectedDocumentId?: string | null;
  selectedDocumentIds?: string[];
  documentTitle?: string;
  documentTitles?: string[];
  currentDraft?: string; // Draf aktif yang staged dari Pane Kanan [5]
  onArticleIntentDetected?: (promptText: string) => void;
  onLoadingChange?: (loading: boolean) => void;
  onDraftUpdated?: (newDraft: string, title: string) => void; // Sinkronisasi otomatis ke lembar visual kanan [1, 5]
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  selectedDocumentId,
  selectedDocumentIds = [],
  documentTitle,
  documentTitles = [],
  currentDraft,
  onArticleIntentDetected,
  onLoadingChange,
  onDraftUpdated,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [detectedArticlePrompt, setDetectedArticlePrompt] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Cadangan memori kueri terakhir yang gagal dikirim
  const [lastFailedQuery, setLastFailedQuery] = useState<string | null>(null);

  const [qaSessions, setQaSessions] = useState<QaSessionItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [showHistorySidebar, setShowHistorySidebar] = useState<boolean>(true);


  // Pengelolaan State Berkas Terlampir (Staged Attachments) [5]
  const [stagedAttachments, setStagedAttachments] = useState<StagedAttachment[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  // Dialog Transisi Modal
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
  const [transitionTitle, setTransitionTitle] = useState('');
  const [transitionTone, setTransitionTone] = useState('solutif');
  const [transitionLength, setTransitionLength] = useState<'SHORT' | 'MEDIUM' | 'LONG'>('MEDIUM');
  const [transitionInstruction, setTransitionInstruction] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeDocIds = selectedDocumentIds.length > 0
    ? selectedDocumentIds
    : (selectedDocumentId ? [selectedDocumentId] : []);

  const activeDocTitles = documentTitles.length > 0
    ? documentTitles
    : (documentTitle ? [documentTitle] : []);

  const hasSelectedDoc = activeDocIds.length > 0;

  useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    loadQaSessionsHistory();
  }, []);

  const loadQaSessionsHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const history = await AiAssistantService.listQaSessions();
      setQaSessions(history || []);

      if (!sessionId && history && history.length > 0) {
        handleSelectQaSession(history[0].id);
      }
    } catch (err: any) {
      console.error('Gagal memuat riwayat sesi Q&A:', err);
      setQaSessions([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSelectQaSession = async (id: string) => {
    setIsLoading(true);
    setSessionError(null);
    setLastFailedQuery(null);
    try {
      const detail = await AiAssistantService.getQaSessionDetail(id);
      setSessionId(detail.id);

      const formattedMessages: ChatMessage[] = (detail.messages || []).map((m) => {
        const isAi = m.role === 'ASSISTANT';
        let text = m.content;
        let suggestions: string[] = [];
        let status: 'SUCCESS' | 'ERROR' = 'SUCCESS';
        let errorType: string | undefined = undefined;
        let updatedArticle = undefined;

        if (isAi) {
          try {
            const parsed = JSON.parse(m.content);
            if (parsed && typeof parsed === 'object') {
              text = parsed.answer || parsed.fullArticleText || m.content;
              suggestions = parsed.suggestions || [];
              updatedArticle = parsed.updatedArticle || undefined;
              if (parsed.status === 'ERROR' || parsed.errorType) {
                status = 'ERROR';
                errorType = parsed.errorType;
              }
            }
          } catch {
            // String legacy
          }
        }

        return {
          id: m.id,
          sender: isAi ? 'ai' : 'user',
          text,
          status,
          errorType,
          suggestions,
          updatedArticle,
          timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      });

      setMessages(formattedMessages);
    } catch (err: any) {
      setSessionError(`Gagal memuat sesi obrolan: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewSession = () => {
    setSessionId(null);
    setMessages([]);
    setSessionError(null);
    setDetectedArticlePrompt(null);
    setLastFailedQuery(null);
    setStagedAttachments([]);
  };

  const handleDeleteQaSession = async (e: React.MouseEvent, idToDelete: string) => {
    e.stopPropagation();
    if (!window.confirm('Apakah Anda yakin ingin menghapus sesi obrolan Q&A ini dari database?')) return;

    try {
      await AiAssistantService.deleteQaSession(idToDelete);
      if (sessionId === idToDelete) {
        handleCreateNewSession();
      }
      loadQaSessionsHistory();
    } catch (err: any) {
      alert(`Gagal menghapus sesi: ${err.message}`);
    }
  };

  const getOrCreateSession = async (): Promise<string> => {
    if (sessionId) return sessionId;
    const primaryId = activeDocIds.length > 0 ? activeDocIds[0] : undefined;
    const sessionTitle = activeDocTitles.length > 0
      ? `Sesi Q&A (${activeDocTitles.length} Dokumen): ${activeDocTitles.slice(0, 2).join(', ')}${activeDocTitles.length > 2 ? '...' : ''}`
      : 'Sesi Q&A Interaktif (Kreasi Bebas)';

    const newSessionId = await AiAssistantService.createSession(
      primaryId || '',
      sessionTitle,
      activeDocIds,
    );
    setSessionId(newSessionId);
    return newSessionId;
  };

  /**
   * Mengunggah berkas penempelan keyboard (Ctrl+V) atau dari pemilih konvensional secara asinkron [5]
   */
  const handleUploadStagedAsset = async (file: File) => {
    setIsUploadingAttachment(true);
    setSessionError(null);
    try {
      const activeSessionId = await getOrCreateSession();
      const res = await AiAssistantService.uploadSessionAttachment(activeSessionId, file);

      let base64Data: string | undefined = undefined;
      const isImg = file.type.startsWith('image/');

      if (isImg) {
        base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.readAsDataURL(file);
        });
      }

      setStagedAttachments((prev) => [
        ...prev,
        {
          fileId: res.tempFileId,
          fileName: file.name,
          mimeType: file.type,
          classification: isImg ? undefined : 'GENERAL_REFERENCE',
          base64Data,
        },
      ]);
    } catch (err: any) {
      setSessionError(`Gagal melampirkan berkas: ${err.message}`);
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadStagedAsset(e.target.files[0]);
    }
  };

  /**
   * Menangkap penempelan biner screenshot langsung dari clipboard (Ctrl+V) [5]
   */
  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          // Cek batas maksimal ubin gambar (maksimal 3 per prompt) [5]
          const existingImagesCount = stagedAttachments.filter((att) => att.mimeType.startsWith('image/')).length;
          if (existingImagesCount >= 3) {
            setSessionError('Batas Terlampaui: Anda hanya dapat melampirkan maksimal 3 gambar per prompt.');
            return;
          }
          await handleUploadStagedAsset(file);
        }
      }
    }
  };

  const handleUpdateClassification = (fileId: string, classification: any) => {
    setStagedAttachments((prev) =>
      prev.map((att) => (att.fileId === fileId ? { ...att, classification } : att)),
    );
  };

  const handleRemoveStagedAttachment = (fileId: string) => {
    setStagedAttachments((prev) => prev.filter((att) => att.fileId !== fileId));
  };

  /**
   * Pipa Pemrosesan Pengiriman Pesan Multimodal Utama [5]
   */
  const executeSendMessage = async (queryText: string) => {
    if (!queryText.trim() && stagedAttachments.length === 0) return;
    if (isLoading) return;

    const currentQuery = queryText.trim();
    setLastFailedQuery(null);

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: currentQuery || 'Mengirim berkas terlampir...',
      status: 'SUCCESS',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);
    setSessionError(null);

    // Salin antrean lampiran aktif ke variabel lokal sebelum di-reset di UI [5]
    const attachmentsPayload = stagedAttachments.map((att) => ({
      fileId: att.fileId,
      classification: att.classification,
    }));
    setStagedAttachments([]);

    try {
      const activeSessionId = await getOrCreateSession();

      // Kirim kueri multimodal terpadu berisi instruksi + draf + daftar lampiran [5]
      const response = await AiAssistantService.sendQuery(
        activeSessionId,
        currentQuery,
        attachmentsPayload,
        currentDraft,
        activeDocIds,
      );

      const responseText = response.data.answer || response.data.fullArticleText || JSON.stringify(response.data);
      const responseSuggestions = response.data.suggestions || [];
      const updatedArticle = response.data.updatedArticle || undefined;

      // Sinkronisasikan naskah draf terbarui langsung ke Pane Kanan secara dinamis (Two-Way Sync) [1, 5]
      if (updatedArticle && onDraftUpdated) {
        onDraftUpdated(updatedArticle.draftMarkdown, updatedArticle.title);
      }

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: responseText,
        status: 'SUCCESS',
        suggestions: responseSuggestions,
        updatedArticle, // Rekam snapshot artikel di dalam balon timeline
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
      loadQaSessionsHistory();
    } catch (err: any) {
      let errorType = 'UNKNOWN_ERROR';
      let displayMsg = err.message || 'Gagal memproses kueri diskusi AI.';

      if (err instanceof AiServiceException) {
        errorType = err.errorType;
        displayMsg = err.rawMessage;
      }

      setLastFailedQuery(currentQuery);

      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: displayMsg,
        status: 'ERROR',
        errorType: errorType,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSendMessage(inputQuery);
  };

  const handleOpenTransitionModal = () => {
    if (!sessionId) return;
    const activeSession = qaSessions.find((s) => s.id === sessionId);
    const baseTitle = activeSession ? activeSession.title : 'Hasil Diskusi';
    setTransitionTitle(`Artikel Hasil: ${baseTitle}`);
    setTransitionInstruction('');
    setIsTransitionModalOpen(true);
  };

  const handleTransitionSubmit = async () => {
    if (!sessionId || isTransitioning) return;

    setIsTransitioning(true);
    try {
      const result = await AiAssistantService.transitionToArticle({
        sessionId,
        articleTitle: transitionTitle,
        tone: transitionTone,
        targetLength: transitionLength,
        userInstruction: transitionInstruction,
      });

      setIsTransitionModalOpen(false);

      if (onArticleIntentDetected) {
        onArticleIntentDetected(`[TRANSITIONED_SESSION_ID]:${result.id}`);
      }
    } catch (err: any) {
      alert(`Gagal mentransisikan diskusi ke draf naskah: ${err.message || err}`);
    } finally {
      setIsTransitioning(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-150 lg:h-162.5">
      { }
      {showHistorySidebar && (
        <div className="bg-white border border-slate-300 flex flex-col rounded-none shadow-xs h-full overflow-hidden">
          <div className="p-3 border-b border-slate-300 bg-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
              <History size={14} className="text-teal-700" />
              <span>Riwayat Chat DB ({qaSessions.length})</span>
            </h3>
            <button
              onClick={handleCreateNewSession}
              className="px-2 py-1 bg-teal-700 hover:bg-teal-800 text-white font-bold text-[11px] uppercase tracking-wider rounded-none inline-flex items-center gap-1"
              title="Mulai Sesi Chat Baru"
            >
              <Plus size={12} />
              <span>Sesi Baru</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
            {isLoadingHistory ? (
              <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <Loader2 size={15} className="animate-spin text-teal-600" />
                <span>Memuat riwayat...</span>
              </div>
            ) : qaSessions.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs px-3 space-y-1">
                <MessageSquare size={24} className="mx-auto opacity-50" />
                <p className="font-semibold">Belum ada riwayat chat.</p>
                <p className="text-[11px]">Kirim pertanyaan untuk membuat sesi pertama.</p>
              </div>
            ) : (
              qaSessions.map((s) => {
                const isActive = sessionId === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelectQaSession(s.id)}
                    className={`p-3 text-xs cursor-pointer transition-colors space-y-1 ${isActive
                      ? 'bg-teal-50 text-teal-950 font-bold'
                      : 'bg-white hover:bg-slate-50'
                      }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate font-bold text-slate-900 text-[12px]">{s.title}</span>
                      <button
                        onClick={(e) => handleDeleteQaSession(e, s.id)}
                        className="text-slate-400 hover:text-red-600 shrink-0"
                        title="Hapus Sesi Ini"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">{s.lastMessage || 'Belum ada pesan.'}</div>
                    <div className="text-[10px] text-slate-400 font-medium flex items-center justify-between pt-0.5">
                      <span>{s.messagesCount} Pesan</span>
                      <span>{new Date(s.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      { }
      <div className={`bg-white border border-slate-300 flex flex-col rounded-none shadow-xs h-full overflow-hidden ${showHistorySidebar ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
        { }
        <div className="px-6 py-3 border-b border-slate-300 bg-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistorySidebar(!showHistorySidebar)}
              className="p-1 text-slate-600 hover:text-slate-900 bg-white"
              title="Toggle Sidebar Riwayat Chat"
            >
              <History size={16} />
            </button>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase">AI Chat Assistant</h2>
            </div>
          </div>

        </div>

        { }
        {sessionError && (
          <div className="p-3 bg-red-50 border-b border-red-200 flex items-center gap-2 text-red-800 text-xs font-semibold">
            <AlertCircle size={14} className="shrink-0" />
            <span>{sessionError}</span>
          </div>
        )}

        { }
        {detectedArticlePrompt && onArticleIntentDetected && (
          <div className="p-3 bg-teal-50 border-b border-teal-300 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-teal-900 text-xs font-bold">
              <PenTool size={15} className="text-teal-700 shrink-0" />
              <span>Terdeteksi Permintaan Pembuatan Artikel! Alihkan langsung ke modul generator?</span>
            </div>
            <button
              onClick={() => onArticleIntentDetected(detectedArticlePrompt)}
              className="px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs uppercase tracking-wider rounded-none flex items-center gap-1 border border-teal-800 shadow-xs shrink-0"
            >
              <span>Buka Article Generator</span>
              <ArrowRight size={13} />
            </button>
          </div>
        )}

        { }
        <div className="flex-1 overflow-y-auto bg-slate-50 divide-y divide-slate-200">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <Bot size={40} className="text-teal-700 mb-2 opacity-80" />
              <p className="font-roboto text-sm font-bold text-slate-800 mb-1">Belum ada percakapan pada sesi ini.</p>
              <p className="font-roboto text-xs text-slate-600 max-w-md">
                Ketik pertanyaan mengenai isi dokumen yang dipilih. Sesi percakapan dan seluruh riwayat chat akan tersimpan secara otomatis di database.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`w-full p-5 flex gap-4 items-start transition-colors ${msg.sender === 'user' ? 'bg-teal-50/30' : 'bg-white'
                  }`}
              >
                { }
                <div className={`w-8 h-8 flex items-center justify-center shrink-0 border rounded-none shadow-2xs ${msg.sender === 'user'
                  ? 'bg-slate-900 border-slate-950 text-white'
                  : 'bg-teal-700 border-teal-800 text-white'
                  }`}>
                  {msg.sender === 'user' ? <User size={15} /> : <Bot size={15} />}
                </div>

                { }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide font-roboto">
                      {msg.sender === 'user' ? 'User' : 'BRIDA AI Assistant'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">{msg.timestamp}</span>
                  </div>

                  <div className="text-xs text-slate-900 font-normal leading-relaxed">
                    {msg.sender === 'ai' ? (
                      msg.status === 'ERROR' ? (
                        <SystemFallbackCard
                          errorType={msg.errorType || 'UNKNOWN_ERROR'}
                          rawErrorMsg={msg.text}
                          onRetry={() => executeSendMessage(lastFailedQuery || msg.text)}
                          onNewSession={handleCreateNewSession}
                          onLogin={() => window.location.reload()}
                        />
                      ) : (
                        <>
                          <RichMessageRenderer text={msg.text} />
                          {/* Merender Mini Anchor Card secara bersyarat jika draf diperbarui oleh AI [5] */}
                          {msg.updatedArticle && (
                            <MiniAnchorCard title={msg.updatedArticle.title} />
                          )}
                          <SuggestionChips
                            suggestions={msg.suggestions}
                            onClick={(suggestion) => executeSendMessage(suggestion)}
                            disabled={isLoading}
                          />
                        </>
                      )
                    ) : (
                      <p className="whitespace-pre-wrap font-roboto">{msg.text}</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex gap-3 items-center text-slate-700 text-xs font-roboto font-bold p-5">
              <Loader2 size={16} className="animate-spin text-teal-700" />
              <span>Menganalisis dokumen berdasarkan konteks yang diunggah...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        { }
        {/* Antrean Berkas Lampiran / Preview Screenshot Ctrl+V [5] */}
        {stagedAttachments.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 flex flex-wrap gap-2.5">
            {stagedAttachments.map((att) => (
              <div
                key={att.fileId}
                className="p-1.5 bg-white border border-slate-300 flex items-center gap-2 shadow-2xs font-roboto"
              >
                {att.base64Data ? (
                  <img
                    src={`data:${att.mimeType};base64,${att.base64Data}`}
                    alt={att.fileName}
                    className="w-8 h-8 object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-8 h-8 bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-extrabold text-[10px]">
                    DOC
                  </div>
                )}

                <div className="text-left space-y-0.5">
                  <span className="block text-[10px] font-bold text-slate-800 truncate max-w-40" title={att.fileName}>
                    {att.fileName}
                  </span>

                  {/* Dropdown Klasifikasi Berkas Sesuai Karakteristik RAG BRIDA [5] */}
                  {att.classification && (
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-bold text-teal-800 uppercase tracking-wider">Tipe:</span>
                      <select
                        value={att.classification}
                        onChange={(e) => handleUpdateClassification(att.fileId, e.target.value as any)}
                        className="text-[9px] bg-slate-100 border border-slate-300 text-slate-700 font-bold focus:outline-none focus:border-teal-700 px-1 py-0.5"
                      >
                        <option value="BASELINE">1. Target</option>
                        <option value="REALIZATION">2. Realisasi</option>
                        <option value="GENERAL_REFERENCE">3. Referensi</option>
                      </select>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveStagedAttachment(att.fileId)}
                  className="p-0.5 text-slate-400 hover:text-red-600 transition-colors cursor-pointer ml-1"
                  title="Batalkan lampiran"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        { }
        {/* Input Diskusi Q&A */}
        <div className="p-3 border-t border-slate-300 bg-white no-print">
          <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex items-center border border-slate-400 focus-within:border-teal-600 bg-slate-50 transition-colors">

              {/* Tombol Klip Kertas Kustom */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isUploadingAttachment}
                className="p-3 text-slate-500 hover:text-teal-700 disabled:opacity-40 cursor-pointer border-r border-slate-200"
                title="Unggah berkas acuan / screenshots (.pdf, .docx, .png, .jpg)"
              >
                {isUploadingAttachment ? (
                  <Loader2 size={16} className="animate-spin text-teal-600" />
                ) : (
                  <Paperclip size={16} />
                )}
              </button>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.docx,.txt,image/*"
                className="hidden"
              />

              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onPaste={handlePaste} // Listener penempelan biner (Ctrl+V) [5]
                placeholder="Ketik pertanyaan / draf revisi Anda di sini..."
                disabled={isLoading || isUploadingAttachment}
                className="flex-1 bg-transparent px-4 py-3 text-xs text-slate-900 font-semibold focus:outline-none disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={(!inputQuery.trim() && stagedAttachments.length === 0) || isLoading || isUploadingAttachment}
                className="px-5 py-3 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-50 text-white disabled:text-slate-500 font-bold text-xs uppercase transition-colors flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed shrink-0 h-full"
              >
                <span>Kirim</span>
                <Send size={14} className="shrink-0" />
              </button>
            </div>

            {sessionId && (
              <button
                type="button"
                onClick={handleOpenTransitionModal}
                disabled={isLoading || messages.length === 0}
                className="px-5 py-3 bg-teal-700 hover:bg-teal-850 disabled:bg-slate-300 text-white disabled:text-slate-500 font-bold text-xs uppercase tracking-wider rounded-none inline-flex items-center gap-1.5 border border-teal-800 shadow-2xs cursor-pointer disabled:cursor-not-allowed transition-all shrink-0 justify-center"
                title="Konversi transkrip percakapan aktif secara terintegrasi menjadi draf naskah rilis baru"
              >
                <PenTool size={14} className="shrink-0" />
                <span>Jadikan Artikel</span>
              </button>
            )}
          </form>
        </div>

      </div>

      {/* --- MODAL TRANSISI --- */}
      {isTransitionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 shadow-2xl max-w-lg w-full p-6 rounded-none space-y-4 font-roboto text-left">

            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-slate-900">
                <PenTool size={18} className="text-teal-700 shrink-0" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Transisikan Diskusi ke draf naskah</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTransitionModalOpen(false)}
                disabled={isTransitioning}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                title="Tutup Panel"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed font-semibold text-justify">
                AI Engine akan mengambil seluruh riwayat tanya-jawab dalam sesi diskusi ini secara kronologis, men-distilasi konsensus obrolan, kemudian melahirkan sesi draf artikel baru yang independen dengan mengamankan keterkaitan sitasi dokumen asal.
              </p>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Judul Artikel Baru
                </label>
                <input
                  type="text"
                  value={transitionTitle}
                  onChange={(e) => setTransitionTitle(e.target.value)}
                  required
                  disabled={isTransitioning}
                  placeholder="Masukkan judul draf publikasi..."
                  className="w-full text-xs p-2.5 border border-slate-300 focus:outline-none focus:border-teal-700 rounded-none font-semibold bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Gaya Bahasa (Tone)
                  </label>
                  <select
                    value={transitionTone}
                    onChange={(e) => setTransitionTone(e.target.value)}
                    disabled={isTransitioning}
                    className="w-full text-xs p-2.5 border border-slate-300 focus:outline-none focus:border-teal-700 bg-white font-semibold rounded-none"
                  >
                    <option value="solutif">SOLUTIF</option>
                    <option value="kritis">KRITIS</option>
                    <option value="akademis">AKADEMIS</option>
                    <option value="populer">POPULER</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Panjang Target Teks
                  </label>
                  <select
                    value={transitionLength}
                    onChange={(e) => setTransitionLength(e.target.value as any)}
                    disabled={isTransitioning}
                    className="w-full text-xs p-2.5 border border-slate-300 focus:outline-none focus:border-teal-700 bg-white font-semibold rounded-none"
                  >
                    <option value="SHORT">Ringkas (~700 Kata)</option>
                    <option value="MEDIUM">Sedang (~1000 Kata)</option>
                    <option value="LONG">Mendalam (~1500 Kata)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Instruksi Khusus Tambahan (Opsional)
                </label>
                <textarea
                  value={transitionInstruction}
                  onChange={(e) => setTransitionInstruction(e.target.value)}
                  disabled={isTransitioning}
                  placeholder="Contoh: Fokuskan pembahasan pada aspek fiskal pendapatan daerah Mimika dan kurangi bahasan jembatan..."
                  className="w-full text-xs p-2.5 border border-slate-300 focus:outline-none focus:border-teal-700 rounded-none font-semibold bg-slate-50 focus:bg-white h-20 resize-none leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsTransitionModalOpen(false)}
                disabled={isTransitioning}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase border border-slate-300 rounded-none cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleTransitionSubmit}
                disabled={isTransitioning || !transitionTitle.trim()}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs uppercase tracking-wider border border-teal-850 rounded-none inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isTransitioning ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Memproses Sesi...</span>
                  </>
                ) : (
                  <>
                    <PenTool size={13} />
                    <span>Mulai Transisi Sesi</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default ChatPanel;