import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Loader2,
  ShieldCheck,
  PenTool,
  ArrowRight,
  AlertCircle,
  History,
  Plus,
  Trash2,
  MessageSquare,
} from 'lucide-react';
import { AiAssistantService } from '../../../services/ai-assistant.service';

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
  selectedDocumentId: string | null;
  documentTitle?: string;
  onArticleIntentDetected?: (promptText: string) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  selectedDocumentId,
  documentTitle,
  onArticleIntentDetected,
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
    if (!selectedDocumentId) throw new Error('Pilih dokumen sumber terlebih dahulu.');
    const newSessionId = await AiAssistantService.createSession(
      selectedDocumentId,
      documentTitle ? `Sesi Q&A: ${documentTitle}` : 'Sesi Q&A Interaktif',
    );
    setSessionId(newSessionId);
    return newSessionId;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim() || !selectedDocumentId || isLoading) return;

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
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[650px]">
      {/* Sidebar Kiri: Riwayat Percakapan Q&A dari Database */}
      {showHistorySidebar && (
        <div className="bg-white border border-slate-300 flex flex-col rounded-none shadow-xs">
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
                        ? 'bg-teal-50 border-l-4 border-l-teal-700 font-bold'
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
      <div className={`bg-white border border-slate-300 flex flex-col rounded-none shadow-xs ${showHistorySidebar ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
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
              <h2 className="text-sm font-bold text-slate-900 uppercase">Q&A Chat Assistant (Auto-Saved DB)</h2>
              <p className="font-roboto text-[11px] text-slate-600 font-medium">
                Sumber Aktif: <span className="text-teal-700 font-bold">{documentTitle || 'Dokumen Terpilih'}</span>
                {sessionId && (
                  <span className="ml-2 text-emerald-700 font-bold">[ID Sesi: {sessionId.slice(0, 8)}...]</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateNewSession}
              className="px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs uppercase tracking-wider rounded-none inline-flex items-center gap-1"
            >
              <Plus size={13} />
              <span>Sesi Obrolan Baru</span>
            </button>
            <div className="flex items-center gap-1 text-teal-800 text-xs bg-teal-100 px-2.5 py-1 border border-teal-300 font-bold rounded-none">
              <ShieldCheck size={14} className="text-teal-700" />
              <span>Zero-Knowledge Q&A</span>
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
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50">
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
              <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.sender === 'ai' && (
                  <div className="w-8 h-8 bg-teal-700 border border-teal-800 flex items-center justify-center text-white shrink-0 rounded-none shadow-xs">
                    <Bot size={16} />
                  </div>
                )}
                <div
                  className={`max-w-xl p-4 rounded-none border text-sm font-roboto ${
                    msg.sender === 'user'
                      ? 'bg-teal-100 border-teal-300 text-slate-900 shadow-xs'
                      : 'bg-white border-slate-300 text-slate-900 shadow-xs'
                  }`}
                >
                  <p className="text-body text-slate-900 font-medium whitespace-pre-wrap">{msg.text}</p>
                  <span className="block text-[10px] text-slate-500 mt-2 text-right font-medium">{msg.timestamp}</span>
                </div>
                {msg.sender === 'user' && (
                  <div className="w-8 h-8 bg-slate-900 border border-slate-950 flex items-center justify-center text-white shrink-0 rounded-none shadow-xs">
                    <User size={16} />
                  </div>
                )}
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex gap-3 items-center text-slate-700 text-xs font-roboto font-bold">
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
            placeholder={selectedDocumentId ? 'Ketik pertanyaan analitis Anda di sini...' : 'Pilih dokumen sumber terlebih dahulu...'}
            disabled={!selectedDocumentId || isLoading}
            className="flex-1 bg-slate-50 border border-slate-400 px-4 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-teal-600 disabled:opacity-50 rounded-none shadow-xs"
          />
          <button
            type="submit"
            disabled={!selectedDocumentId || !inputQuery.trim() || isLoading}
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
