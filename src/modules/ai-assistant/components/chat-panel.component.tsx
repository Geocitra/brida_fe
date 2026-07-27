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
} from 'lucide-react';
import { AiAssistantService } from '../../../services/ai-assistant.service';

// Helper formatting functions for Markdown & JSON
const formatLabel = (str: string) => {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .trim();
};

const renderJsonData = (obj: any): React.ReactNode => {
  if (Array.isArray(obj)) {
    if (obj.length === 0) return <span className="italic text-slate-500 text-xs">Daftar kosong</span>;
    const firstItem = obj[0];
    const columns = typeof firstItem === 'object' && firstItem !== null ? Object.keys(firstItem) : [];
    
    if (columns.length === 0) {
      return (
        <ul className="list-disc pl-5 space-y-1 my-1 text-xs">
          {obj.map((item, idx) => <li key={idx}>{String(item)}</li>)}
        </ul>
      );
    }

    return (
      <div className="overflow-x-auto border border-slate-300 my-2">
        <table className="min-w-full divide-y divide-slate-300 text-xs font-roboto">
          <thead className="bg-slate-100 font-bold text-slate-900">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-3 py-2 text-left uppercase tracking-wider text-[10px]">{formatLabel(col)}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white text-slate-800">
            {obj.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-50">
                {columns.map((col) => (
                  <td key={col} className="px-3 py-2 whitespace-normal">{String(row[col] ?? '')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const keys = Object.keys(obj);
  if (keys.length === 0) return <span className="italic text-slate-500 text-xs">Objek kosong</span>;

  return (
    <div className="space-y-4 font-roboto text-slate-900 w-full my-2">
      <div className="border border-slate-300 bg-slate-50 divide-y divide-slate-200">
        {keys.map((key) => {
          const val = obj[key];
          let valStr = '';
          if (typeof val === 'object' && val !== null) {
            valStr = JSON.stringify(val, null, 2);
          } else {
            valStr = String(val);
          }
          return (
            <div key={key} className="grid grid-cols-1 sm:grid-cols-4 p-3 gap-2 align-top">
              <span className="font-bold text-slate-700 text-[10px] uppercase tracking-wider">{formatLabel(key)}</span>
              <span className="sm:col-span-3 text-xs font-medium text-slate-900 whitespace-pre-wrap">{valStr}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

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
          <code key={keyIdx++} className="px-1.5 py-0.5 bg-slate-100 text-teal-850 font-mono text-[11px] border border-slate-200">
            {subPart}
          </code>
        );
      } else if (isBold) {
        parts.push(<strong key={keyIdx++} className="font-bold text-slate-900">{subPart}</strong>);
      } else {
        parts.push(subPart);
      }
    });
  });

  return parts;
};

const renderMarkdown = (text: string): React.ReactNode => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  const flushList = (key: string | number) => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${key}`} className="list-disc pl-5 space-y-1 my-2">
          {currentList}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('```')) {
      if (inCodeBlock) {
        inCodeBlock = false;
        elements.push(
          <pre key={`code-${idx}`} className="bg-slate-900 text-slate-100 p-3.5 font-mono text-xs overflow-x-auto my-3 rounded-none border border-slate-950">
            <code>{codeBlockLines.join('\n')}</code>
          </pre>
        );
        codeBlockLines = [];
      } else {
        flushList(idx);
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      return;
    }

    if (trimmedLine.startsWith('### ')) {
      flushList(idx);
      elements.push(
        <h4 key={idx} className="text-xs font-bold text-teal-800 uppercase tracking-wider mt-4 mb-1.5 font-roboto">
          {parseInlineStyles(trimmedLine.slice(4))}
        </h4>
      );
    } else if (trimmedLine.startsWith('## ')) {
      flushList(idx);
      elements.push(
        <h3 key={idx} className="text-sm font-bold text-slate-900 mt-5 mb-2 border-b border-slate-200 pb-1 font-roboto font-semibold">
          {parseInlineStyles(trimmedLine.slice(3))}
        </h3>
      );
    } else if (trimmedLine.startsWith('# ')) {
      flushList(idx);
      elements.push(
        <h2 key={idx} className="text-base font-extrabold text-slate-900 mt-6 mb-3 border-b-2 border-slate-300 pb-1.5 font-roboto font-bold">
          {parseInlineStyles(trimmedLine.slice(2))}
        </h2>
      );
    } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || trimmedLine.startsWith('• ')) {
      const content = parseInlineStyles(trimmedLine.slice(2));
      currentList.push(
        <li key={`li-${idx}`} className="text-xs text-slate-700 leading-relaxed font-roboto">
          {content}
        </li>
      );
    } else if (/^\d+\.\s/.test(trimmedLine)) {
      flushList(idx);
      const match = trimmedLine.match(/^(\d+)\.\s(.*)/);
      if (match) {
        elements.push(
          <div key={idx} className="flex gap-2 text-xs text-slate-700 leading-relaxed font-roboto my-1">
            <span className="font-bold text-teal-700">{match[1]}.</span>
            <span>{parseInlineStyles(match[2])}</span>
          </div>
        );
      }
    } else if (trimmedLine === '') {
      flushList(idx);
    } else {
      flushList(idx);
      elements.push(
        <p key={idx} className="text-xs text-slate-800 font-normal leading-relaxed my-2 font-roboto">
          {parseInlineStyles(line)}
        </p>
      );
    }
  });

  flushList('end');
  return <div className="space-y-1 w-full text-left">{elements}</div>;
};

const renderFormattedContent = (text: string): React.ReactNode => {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const obj = JSON.parse(trimmed);
      return renderJsonData(obj);
    } catch {
      // ignore & render as markdown
    }
  } else if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const obj = JSON.parse(trimmed);
      return renderJsonData(obj);
    } catch {
      // ignore & render as markdown
    }
  }

  return renderMarkdown(text);
};

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
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

  // QA Sessions History List State
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

  // Load QA Chat Sessions History on Mount
  useEffect(() => {
    loadQaSessionsHistory();
  }, []);

  const loadQaSessionsHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const history = await AiAssistantService.listQaSessions();
      setQaSessions(history || []);

      // Auto-load latest QA session if no active session yet
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
    try {
      const detail = await AiAssistantService.getQaSessionDetail(id);
      setSessionId(detail.id);

      const formattedMessages: ChatMessage[] = (detail.messages || []).map((m) => ({
        id: m.id,
        sender: m.role === 'USER' ? 'user' : 'ai',
        text: m.content,
        timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));

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
      activeDocIds
    );
    setSessionId(newSessionId);
    return newSessionId;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim() || activeDocIds.length === 0 || isLoading) return;

    const currentQuery = inputQuery;

    if (isArticleIntent(currentQuery) && onArticleIntentDetected) {
      setDetectedArticlePrompt(currentQuery);
    } else {
      setDetectedArticlePrompt(null);
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: currentQuery,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);
    setSessionError(null);

    try {
      const activeSessionId = await getOrCreateSession();
      const responseText = await AiAssistantService.sendQuery(activeSessionId, currentQuery);

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
      loadQaSessionsHistory();
    } catch (err: any) {
      const errorText = err.message || 'Gagal terhubung ke engine AI.';
      setSessionError(errorText);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: `[System Error]: ${errorText}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[600px] lg:h-[650px]">
      {/* Sidebar Kiri: Riwayat Percakapan Q&A dari Database */}
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
                    className={`p-3 text-xs cursor-pointer transition-colors space-y-1 ${
                      isActive
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

      {/* Main Chat Feed Area (3 Columns when Sidebar open, 4 when closed) */}
      <div className={`bg-white border border-slate-300 flex flex-col rounded-none shadow-xs h-full overflow-hidden ${showHistorySidebar ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
        {/* Panel Header */}
        <div className="px-6 py-3 border-b border-slate-300 bg-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistorySidebar(!showHistorySidebar)}
              className="p-1 text-slate-600 hover:text-slate-900 border border-slate-300 bg-white"
              title="Toggle Sidebar Riwayat Chat"
            >
              <History size={16} />
            </button>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase">AI Chat Assistant</h2>
              <p className="font-roboto text-[11px] text-slate-600 font-medium">
                Sumber Aktif: <span className="text-teal-700 font-bold">{activeDocTitles.length > 0 ? activeDocTitles.join(', ') : 'Dokumen Terpilih'}</span>
                {sessionId && (
                  <span className="ml-2 text-emerald-700 font-bold">[ID Sesi: {sessionId.slice(0, 8)}...]</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Session Error Banner */}
        {sessionError && (
          <div className="p-3 bg-red-50 border-b border-red-200 flex items-center gap-2 text-red-800 text-xs font-semibold">
            <AlertCircle size={14} className="shrink-0" />
            <span>{sessionError}</span>
          </div>
        )}

        {/* Article Intent Banner */}
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

        {/* Messages Feed Area */}
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
                className={`w-full p-5 flex gap-4 items-start transition-colors ${
                  msg.sender === 'user' ? 'bg-teal-50/30' : 'bg-white'
                }`}
              >
                {/* Sender Avatar */}
                <div className={`w-8 h-8 flex items-center justify-center shrink-0 border rounded-none shadow-2xs ${
                  msg.sender === 'user' 
                    ? 'bg-slate-900 border-slate-950 text-white' 
                    : 'bg-teal-700 border-teal-800 text-white'
                }`}>
                  {msg.sender === 'user' ? <User size={15} /> : <Bot size={15} />}
                </div>

                {/* Message Content Area (Full-Width) */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide font-roboto">
                      {msg.sender === 'user' ? 'User' : 'BRIDA AI Assistant'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">{msg.timestamp}</span>
                  </div>
                  
                  <div className="text-xs text-slate-900 font-normal leading-relaxed">
                    {msg.sender === 'ai' ? (
                      renderFormattedContent(msg.text)
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

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-300 bg-white flex gap-2">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder={hasSelectedDoc ? 'Ketik pertanyaan analitis Anda di sini...' : 'Pilih dokumen sumber terlebih dahulu...'}
            disabled={!hasSelectedDoc || isLoading}
            className="flex-1 bg-slate-50 border border-slate-400 px-4 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-teal-600 disabled:opacity-50 rounded-none shadow-xs"
          />
          <button
            type="submit"
            disabled={!hasSelectedDoc || !inputQuery.trim() || isLoading}
            className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white font-bold text-xs uppercase transition-colors disabled:text-slate-500 border border-teal-800 disabled:border-slate-400 rounded-none flex items-center gap-2 shadow-xs"
          >
            <span>Kirim</span>
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
