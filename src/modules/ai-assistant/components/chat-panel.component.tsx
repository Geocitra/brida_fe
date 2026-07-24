import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, ShieldCheck, PenTool, ArrowRight, AlertCircle } from 'lucide-react';
import { AiAssistantService } from '../../../services/ai-assistant.service';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

interface ChatPanelProps {
  selectedDocumentId: string | null;
  documentTitle?: string;
  onArticleIntentDetected?: (promptText: string) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ 
  selectedDocumentId, 
  documentTitle,
  onArticleIntentDetected 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [detectedArticlePrompt, setDetectedArticlePrompt] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Reset session when document changes
  useEffect(() => {
    setSessionId(null);
    setMessages([]);
    setSessionError(null);
    setDetectedArticlePrompt(null);
  }, [selectedDocumentId]);

  const isArticleIntent = (text: string) => {
    const keywords = ['artikel', 'publikasi', 'naskah', 'rilis', 'buatkan artikel', 'tulis artikel', 'generate artikel'];
    return keywords.some((k) => text.toLowerCase().includes(k));
  };

  const getOrCreateSession = async (): Promise<string> => {
    if (sessionId) return sessionId;
    if (!selectedDocumentId) throw new Error('Pilih dokumen sumber terlebih dahulu.');
    const newSessionId = await AiAssistantService.createSession(
      selectedDocumentId,
      documentTitle || 'Sesi Q&A',
    );
    setSessionId(newSessionId);
    return newSessionId;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim() || !selectedDocumentId || isLoading) return;

    const currentQuery = inputQuery;

    // Detect article creation intent
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
      // Get or create session, then send query
      const activeSessionId = await getOrCreateSession();
      const responseText = await AiAssistantService.sendQuery(activeSessionId, currentQuery);

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
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
    <div className="bg-white border border-slate-300 flex flex-col h-[600px] rounded-none shadow-xs">
      {/* Panel Header */}
      <div className="px-6 py-4 border-b border-slate-300 bg-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-h2 text-slate-900">Q&A Chat Assistant</h2>
          <p className="font-roboto text-xs text-slate-600 font-medium">
            Sumber Aktif: <span className="text-teal-700 font-bold">{documentTitle || 'Belum ada dokumen dipilih'}</span>
            {sessionId && (
              <span className="ml-2 text-emerald-700 font-bold">[Sesi Aktif]</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1 text-teal-800 text-xs bg-teal-100 px-2.5 py-1 border border-teal-300 font-bold rounded-none">
          <ShieldCheck size={14} className="text-teal-700" />
          <span>Zero-Knowledge Q&A</span>
        </div>
      </div>

      {/* Session Error Banner */}
      {sessionError && (
        <div className="p-3 bg-red-50 border-b border-red-200 flex items-center gap-2 text-red-800 text-xs font-semibold">
          <AlertCircle size={14} className="shrink-0" />
          <span>Backend tidak terhubung. Cek apakah server BE berjalan di port 3000.</span>
        </div>
      )}

      {/* Article Intent Banner if detected */}
      {detectedArticlePrompt && onArticleIntentDetected && (
        <div className="p-4 bg-teal-50 border-b border-teal-300 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-teal-900 text-xs font-bold">
            <PenTool size={16} className="text-teal-700 shrink-0" />
            <span>Terdeteksi Permintaan Pembuatan Artikel! Alihkan langsung ke modul generator?</span>
          </div>
          <button
            onClick={() => onArticleIntentDetected(detectedArticlePrompt)}
            className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs uppercase tracking-wider rounded-none flex items-center gap-1 border border-teal-800 shadow-xs shrink-0"
          >
            <span>Buka Article Generator</span>
            <ArrowRight size={14} />
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
              Ketik pertanyaan mengenai isi dokumen yang dipilih. Sesi AI akan dibuat otomatis saat mengirim pesan pertama.
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
              <div className={`max-w-xl p-4 rounded-none border text-sm font-roboto ${
                msg.sender === 'user' 
                  ? 'bg-teal-100 border-teal-300 text-slate-900 shadow-xs' 
                  : 'bg-white border-slate-300 text-slate-900 shadow-xs'
              }`}>
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
          <div className="flex gap-3 items-center text-slate-700 text-sm font-roboto font-bold">
            <Loader2 size={18} className="animate-spin text-teal-700" />
            <span>Menganalisis dokumen berdasarkan konteks dokumen yang diunggah...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box Form */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-300 bg-white flex gap-2">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder={selectedDocumentId ? "Ketik pertanyaan analitis Anda di sini..." : "Pilih dokumen sumber terlebih dahulu..."}
          disabled={!selectedDocumentId || isLoading}
          className="flex-1 bg-slate-50 border border-slate-400 px-4 py-2.5 text-sm text-slate-900 font-semibold focus:outline-none focus:border-teal-600 disabled:opacity-50 rounded-none shadow-xs"
        />
        <button
          type="submit"
          disabled={!selectedDocumentId || !inputQuery.trim() || isLoading}
          className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white font-bold text-sm transition-colors disabled:text-slate-500 border border-teal-800 disabled:border-slate-400 rounded-none flex items-center gap-2 shadow-xs"
        >
          <span>Kirim</span>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};
