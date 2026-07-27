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
  // Ikon baru untuk integrasi kartu fallback kesalahan sistem
  Clock,
  ShieldAlert,
  WifiOff,
  Database,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { AiAssistantService, AiServiceException } from '../../../services/ai-assistant.service';
import { AiErrorMapper } from '../utils/error-mapper.util';

// --- SUB-KOMPONEN 1: PENAMPIL TABEL MARKDOWN DINAMIS (Component-Driven UI) ---

interface MarkdownTableRendererProps {
  rawTable: string;
}

const MarkdownTableRenderer: React.FC<MarkdownTableRendererProps> = ({ rawTable }) => {
  const lines = rawTable.trim().split('\n');
  if (lines.length < 2) return null;

  // Ekstraksi kolom header (baris index 0)
  const headerLine = lines[0];
  const headers = headerLine
    .split('|')
    .map((h) => h.trim())
    .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

  // Ekstraksi baris data (melewati pembatas baris indeks 1)
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

// --- SUB-KOMPONEN 2: PARSER & RENDERING MARKDOWN KLIEN (SRP) ---

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

/**
 * Komponen Perender Teks Markdown Terpadu (Eksport Publik untuk Reusability) [3].
 */
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
        </p>,
      );
    }
  }

  flushList();
  flushTable();

  return <div className="space-y-1 w-full text-left">{elements}</div>;
};

// --- SUB-KOMPONEN 3: SUGGESTION CHIPS (Interactive AI) ---

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

// --- SUB-KOMPONEN 4: KARTU FALLBACK GANGGUAN SISTEM (Polymorphic Error UX) [5] ---

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
  // Evaluasi tipe kesalahan menggunakan asisten utilitas mapper murni [1]
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

      {/* Render Tombol Aksi Taktis Berdasarkan Rekomendasi Mapper UX [1, 5] */}
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

// --- KOMPONEN UTAMA: CHAT PANEL ---

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  status: 'SUCCESS' | 'ERROR'; // Melacak apakah pesan berhasil diproses atau mengalami kegagalan [5]
  errorType?: string;          // Menyimpan kode kesalahan teknis untuk filter fallback visual [5]
  suggestions?: string[];
  timestamp: string;
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
  onArticleIntentDetected?: (promptText: string) => void;
  onLoadingChange?: (loading: boolean) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  selectedDocumentId,
  selectedDocumentIds = [],
  documentTitle,
  documentTitles = [],
  onArticleIntentDetected,
  onLoadingChange,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [detectedArticlePrompt, setDetectedArticlePrompt] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Cadangan memori kueri terakhir yang gagal dikirim (Fail-Safe Caching) [1, 5]
  const [lastFailedQuery, setLastFailedQuery] = useState<string | null>(null);

  const [qaSessions, setQaSessions] = useState<QaSessionItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [showHistorySidebar, setShowHistorySidebar] = useState<boolean>(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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

      // Parsing Defensif untuk riwayat pesan [Defensive Programming]
      const formattedMessages: ChatMessage[] = (detail.messages || []).map((m) => {
        const isAi = m.role === 'ASSISTANT';
        let text = m.content;
        let suggestions: string[] = [];
        let status: 'SUCCESS' | 'ERROR' = 'SUCCESS';
        let errorType: string | undefined = undefined;

        if (isAi) {
          try {
            const parsed = JSON.parse(m.content);
            if (parsed && typeof parsed === 'object') {
              text = parsed.answer || parsed.fullArticleText || m.content;
              suggestions = parsed.suggestions || [];
              if (parsed.status === 'ERROR' || parsed.errorType) {
                status = 'ERROR';
                errorType = parsed.errorType;
              }
            }
          } catch {
            // Data bertipe string warisan (legacy string), abaikan parsing JSON
          }
        }

        return {
          id: m.id,
          sender: isAi ? 'ai' : 'user',
          text,
          status,
          errorType,
          suggestions,
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

  const isArticleIntent = (text: string) => {
    const keywords = ['artikel', 'publikasi', 'naskah', 'rilis', 'buatkan artikel', 'tulis artikel', 'generate artikel'];
    return keywords.some((k) => text.toLowerCase().includes(k));
  };

  const getOrCreateSession = async (): Promise<string> => {
    if (sessionId) return sessionId;
    if (activeDocIds.length === 0) throw new Error('Pilih dokumen sumber terlebih dahulu.');
    const primaryId = activeDocIds[0];
    const sessionTitle = activeDocTitles.length > 0
      ? `Sesi Q&A (${activeDocTitles.length} Dokumen): ${activeDocTitles.slice(0, 2).join(', ')}${activeDocTitles.length > 2 ? '...' : ''}`
      : 'Sesi Q&A Interaktif';

    const newSessionId = await AiAssistantService.createSession(
      primaryId,
      sessionTitle,
      activeDocIds,
    );
    setSessionId(newSessionId);
    return newSessionId;
  };

  /**
   * Pipa Pemrosesan Pengiriman Pesan Utama (Polimorfis)
   */
  const executeSendMessage = async (queryText: string) => {
    if (!queryText.trim() || activeDocIds.length === 0 || isLoading) return;

    const currentQuery = queryText.trim();
    setLastFailedQuery(null); // Reset cache kegagalan pada setiap pengiriman baru

    if (isArticleIntent(currentQuery) && onArticleIntentDetected) {
      setDetectedArticlePrompt(currentQuery);
    } else {
      setDetectedArticlePrompt(null);
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: currentQuery,
      status: 'SUCCESS',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);
    setSessionError(null);

    try {
      const activeSessionId = await getOrCreateSession();

      // Ambil respons bertipe kuat dari layer service [3]
      const response = await AiAssistantService.sendQuery(activeSessionId, currentQuery);

      const responseText = response.data.answer || response.data.fullArticleText || JSON.stringify(response.data);
      const responseSuggestions = response.data.suggestions || [];

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: responseText,
        status: 'SUCCESS',
        suggestions: responseSuggestions, // Mengisi Quick-Reply Suggestion Chips [1]
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
      loadQaSessionsHistory();
    } catch (err: any) {
      // Isolasi dan identifikasi pengecualian kustom dari layer service [5]
      let errorType = 'UNKNOWN_ERROR';
      let displayMsg = err.message || 'Gagal memproses kueri diskusi AI.';

      if (err instanceof AiServiceException) {
        errorType = err.errorType;
        displayMsg = err.rawMessage;
      }

      // Caching kueri yang gagal untuk fungsionalitas tombol Coba Ulang [1, 5]
      setLastFailedQuery(currentQuery);

      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: displayMsg,
        status: 'ERROR', // Flag visual polimorfis diaktifkan [5]
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
        {/* Input Form Obrolan Terintegrasi (Perbaikan Kontras Tombol) */}
        <form onSubmit={handleFormSubmit} className="p-4 border-t border-slate-300 bg-white no-print">
          <div className="flex items-center border border-slate-400 focus-within:border-teal-600 bg-slate-50 transition-colors">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={hasSelectedDoc ? 'Ketik pertanyaan analitis Anda di sini...' : 'Pilih dokumen sumber terlebih dahulu...'}
              disabled={!hasSelectedDoc || isLoading}
              className="flex-1 bg-transparent px-4 py-3 text-xs text-slate-900 font-semibold focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!hasSelectedDoc || !inputQuery.trim() || isLoading}
              className="px-5 py-3 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-55 text-white disabled:text-slate-500 font-bold text-xs uppercase transition-colors flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed shrink-0 h-full"
            >
              <span>Kirim</span>
              <Send size={14} className="shrink-0" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;