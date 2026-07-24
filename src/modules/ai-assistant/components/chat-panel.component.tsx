import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, ShieldCheck } from 'lucide-react';
import { AiAssistantService, type StructuredAnalysisResult } from '../../../services/ai-assistant.service';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string | StructuredAnalysisResult;
  timestamp: string;
}

interface ChatPanelProps {
  selectedDocumentId: string | null;
  documentTitle?: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ selectedDocumentId, documentTitle }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim() || !selectedDocumentId || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputQuery,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    const currentQuery = inputQuery;
    setInputQuery('');
    setIsLoading(true);

    try {
      const responseData = await AiAssistantService.executeQARequest({
        documentId: selectedDocumentId,
        query: currentQuery,
      });

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: responseData,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: `[Error Sistem]: ${err.message || 'Gagal terhubung ke engine AI.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 flex flex-col h-[600px] rounded-none shadow-sm">
      {/* Panel Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div>
          <h2 className="text-h2 text-slate-800">Interactive Q&A Engine</h2>
          <p className="font-roboto text-xs text-slate-500 font-medium">
            Sumber Aktif: <span className="text-teal-700 font-semibold">{documentTitle || 'Belum ada dokumen dipilih'}</span>
          </p>
        </div>
        <div className="flex items-center gap-1 text-emerald-700 text-xs bg-emerald-50 px-2 py-1 border border-emerald-200 font-semibold rounded-none">
          <ShieldCheck size={14} className="text-emerald-600" />
          <span>Zero-Knowledge</span>
        </div>
      </div>

      {/* Messages Feed Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Bot size={38} className="text-teal-600 mb-2 opacity-80" />
            <p className="font-roboto text-sm font-semibold text-slate-700 mb-1">Belum ada percakapan pada sesi ini.</p>
            <p className="font-roboto text-xs text-slate-500 max-w-md">
              Pilih dokumen sumber di Knowledge Hub, lalu ajukan pertanyaan spesifik terkait isi laporan investigasi.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender === 'ai' && (
                <div className="w-8 h-8 bg-teal-600 border border-teal-700 flex items-center justify-center text-white shrink-0 rounded-none shadow-xs">
                  <Bot size={16} />
                </div>
              )}
              <div className={`max-w-xl p-4 rounded-none border text-sm font-roboto ${
                msg.sender === 'user' 
                  ? 'bg-teal-50 border-teal-200 text-slate-900 shadow-xs' 
                  : 'bg-white border-slate-200 text-slate-800 shadow-xs'
              }`}>
                {typeof msg.text === 'string' ? (
                  <p className="text-body text-slate-800 whitespace-pre-wrap">{msg.text}</p>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <strong className="block text-xs uppercase tracking-wider text-teal-700 font-bold mb-1">Ringkasan Eksekutif</strong>
                      <p className="text-body text-slate-800">{msg.text.ringkasanEksekutif}</p>
                    </div>
                    {msg.text.indikasiPelanggaran.length > 0 && (
                      <div className="p-3 bg-red-50 border border-red-200">
                        <strong className="block text-xs uppercase tracking-wider text-red-700 font-bold mb-1">Indikasi Pelanggaran</strong>
                        <ul className="list-disc pl-4 space-y-1 text-xs text-slate-700">
                          {msg.text.indikasiPelanggaran.map((ind, i) => (
                            <li key={i}><strong>{ind.jenis}</strong>: {ind.rincian}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div>
                      <strong className="block text-xs uppercase tracking-wider text-teal-700 font-bold mb-1">Kesimpulan Analis</strong>
                      <p className="text-body text-slate-800">{msg.text.kesimpulanAnalisis}</p>
                    </div>
                  </div>
                )}
                <span className="block text-[10px] text-slate-400 mt-2 text-right">{msg.timestamp}</span>
              </div>
              {msg.sender === 'user' && (
                <div className="w-8 h-8 bg-slate-800 border border-slate-900 flex items-center justify-center text-white shrink-0 rounded-none shadow-xs">
                  <User size={16} />
                </div>
              )}
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex gap-3 items-center text-slate-600 text-sm font-roboto font-medium">
            <Loader2 size={18} className="animate-spin text-teal-600" />
            <span>Menganalisis dokumen berdasarkan aturan Zero-Knowledge...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box Form */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 bg-white flex gap-2">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder={selectedDocumentId ? "Ketik pertanyaan analitis Anda di sini..." : "Pilih dokumen sumber terlebih dahulu..."}
          disabled={!selectedDocumentId || isLoading}
          className="flex-1 bg-slate-50 border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-teal-600 disabled:opacity-50 rounded-none shadow-xs"
        />
        <button
          type="submit"
          disabled={!selectedDocumentId || !inputQuery.trim() || isLoading}
          className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 text-white font-semibold text-sm transition-colors disabled:text-slate-400 border border-teal-700 disabled:border-slate-300 rounded-none flex items-center gap-2 shadow-xs"
        >
          <span>Kirim</span>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};
