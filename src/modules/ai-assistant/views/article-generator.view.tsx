import React, { useState, useEffect, useRef } from 'react';
import { DocumentService } from '../../../services/document.service';
import type { DocumentRecord } from '../../../services/document.service';
import { AiAssistantService } from '../../../services/ai-assistant.service';
import type { ArticleSessionDetail } from '../../../services/ai-assistant.service';
import {
  MessageSquareCode,
  Sparkles,
  Search,
  ChevronDown,
  X,
  Check,
  FileText,
  PenTool,
  Loader2,
  Copy,
  CheckCircle2,
  History,
  Trash2,
  Send,
  Database,
  Layers,
  Clock,
  RefreshCw,
} from 'lucide-react';

interface ArticleGeneratorViewProps {
  initialPrompt?: string;
  onNavigateToQa: () => void;
}

export const ArticleGeneratorView: React.FC<ArticleGeneratorViewProps> = ({
  initialPrompt,
  onNavigateToQa,
}) => {
  // Document Selection State
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(true);

  // Searchable Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // User Article Generation Parameters
  const [articleTitle, setArticleTitle] = useState<string>('');
  const [targetLength, setTargetLength] = useState<'SHORT' | 'MEDIUM' | 'LONG'>('MEDIUM');
  const [tone, setTone] = useState<string>('solutif');
  const [userInstruction, _setUserInstruction] = useState<string>(initialPrompt || '');

  // Session & Interaction State
  const [activeSession, setActiveSession] = useState<ArticleSessionDetail | null>(null);
  const [articleSessionsHistory, setArticleSessionsHistory] = useState<ArticleSessionDetail[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [followUpQuery, setFollowUpQuery] = useState<string>('');
  const [isSendingFollowUp, setIsSendingFollowUp] = useState<boolean>(false);

  // Active Tab for Sidebar (Editor vs History)
  const [activeTab, setActiveTab] = useState<'editor' | 'history'>('editor');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initial Data Fetch
  useEffect(() => {
    loadDocuments();
    loadHistory();
  }, []);

  const loadDocuments = async () => {
    setIsLoadingDocs(true);
    try {
      const fetched = await DocumentService.listDocuments();
      setDocuments(fetched || []);
      if (fetched && fetched.length > 0 && selectedDocIds.length === 0) {
        setSelectedDocIds([fetched[0].id]);
        if (!articleTitle) {
          setArticleTitle(`Artikel Strategis: ${fetched[0].title}`);
        }
      }
    } catch (err: any) {
      console.error('Gagal memuat dokumen acuan:', err);
      setDocuments([]);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const loadHistory = async () => {
    try {
      const sessions = await AiAssistantService.listArticleSessions();
      setArticleSessionsHistory(sessions || []);
    } catch (err: any) {
      console.error('Gagal memuat riwayat sesi artikel:', err);
      setArticleSessionsHistory([]);
    }
  };

  const toggleSelectDocument = (docId: string) => {
    setSelectedDocIds((prev) => {
      if (prev.includes(docId)) {
        return prev.filter((id) => id !== docId);
      } else {
        return [...prev, docId];
      }
    });
  };

  const handleGenerateNewArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDocIds.length === 0) {
      showToast('Pilih minimal 1 dokumen acuan dari dropdown terlebih dahulu.');
      return;
    }
    if (!articleTitle || !articleTitle.trim()) {
      showToast('Masukkan judul artikel yang diinginkan terlebih dahulu.');
      return;
    }

    setIsGenerating(true);
    try {
      const sessionDetail = await AiAssistantService.generateArticleMulti({
        documentIds: selectedDocIds,
        articleTitle,
        targetLength,
        tone,
        userInstruction,
      });

      setActiveSession(sessionDetail);
      setActiveTab('editor');
      showToast('✨ Draf artikel baru berhasil disintesis oleh AI dan disimpan ke Database!');
      loadHistory();
    } catch (err: any) {
      showToast(`Gagal menghasilkan artikel: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession || !followUpQuery.trim() || isSendingFollowUp) return;

    setIsSendingFollowUp(true);
    try {
      const updated = await AiAssistantService.interactArticle(activeSession.id, followUpQuery);
      setActiveSession(updated);
      setFollowUpQuery('');
      showToast('Draf artikel berhasil diperbarui berdasarkan instruksi revisi Anda.');
      loadHistory();
    } catch (err: any) {
      showToast(`Gagal mengirim revisi: ${err.message}`);
    } finally {
      setIsSendingFollowUp(false);
    }
  };

  const handleOpenSessionFromHistory = async (sessionId: string) => {
    try {
      const session = await AiAssistantService.getArticleSession(sessionId);
      setActiveSession(session);
      setArticleTitle(session.articleTitle || session.title);
      setTargetLength(session.targetLength || 'MEDIUM');
      setTone(session.tone || 'solutif');

      if (session.sources && session.sources.length > 0) {
        setSelectedDocIds(session.sources.map((s) => s.id));
      }

      setActiveTab('editor');
      showToast(`Sesi artikel '${session.articleTitle || session.title}' dimuat dari database.`);
    } catch (err: any) {
      showToast(`Gagal memuat sesi artikel: ${err.message}`);
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!window.confirm('Apakah Anda yakin ingin menghapus sesi artikel ini dari database?')) return;

    try {
      await AiAssistantService.deleteArticleSession(sessionId);
      showToast('Sesi artikel berhasil dihapus dari database.');
      if (activeSession?.id === sessionId) {
        setActiveSession(null);
      }
      loadHistory();
    } catch (err: any) {
      showToast(`Gagal menghapus sesi artikel: ${err.message}`);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Teks artikel berhasil disalin ke papan klip.');
  };

  // Filtered documents for live search
  const filteredDocuments = documents.filter((doc) => {
    const q = searchQuery.toLowerCase();
    return doc.title.toLowerCase().includes(q) || (doc.metadata?.category || '').toLowerCase().includes(q);
  });

  const selectedDocObjects = documents.filter((d) => selectedDocIds.includes(d.id));

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 border border-slate-700 shadow-xl flex items-center gap-3 rounded-none">
          <CheckCircle2 size={18} className="text-teal-400 shrink-0" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-h1 mb-1">Article Generator & Public Drafting (CoT Chain-of-Thought)</h1>
          <p className="text-body">
            Fasilitas perakitan artikel publikasi & rilis media berbasis multi-dokumen acuan dengan kustomisasi judul, panjang teks, dan penyimpanan sesi di database.
          </p>
        </div>

        <button
          onClick={onNavigateToQa}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-wider rounded-none inline-flex items-center gap-2 border border-slate-900 shadow-xs shrink-0"
        >
          <MessageSquareCode size={14} />
          <span>Kembali ke Q&A Chat</span>
        </button>
      </div>

      {initialPrompt && (
        <div className="p-3.5 bg-teal-50 border border-teal-300 rounded-none shadow-xs flex items-center gap-3 text-teal-900 text-xs font-semibold">
          <Sparkles size={16} className="text-teal-700 shrink-0" />
          <div>
            <strong className="block text-teal-800 uppercase tracking-wider font-bold">Instruksi Awal dari Modul Lain:</strong>
            <span className="italic">"{initialPrompt}"</span>
          </div>
        </div>
      )}

      {/* SECTION 1: Control Panel (Multi-Doc Picker, Title Input, Length, & Tone) */}
      <div className="bg-white border border-slate-300 p-5 rounded-none shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <PenTool size={16} className="text-teal-700" />
            <span>1. Konfigurasi Dokumen Acuan & Parameter Artikel</span>
          </h2>
          <span className="px-2.5 py-0.5 bg-teal-100 text-teal-800 text-[11px] font-bold uppercase border border-teal-300">
            CoT Engine v2 Active
          </span>
        </div>

        <form onSubmit={handleGenerateNewArticle} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Searchable Multi-Select Combobox Dokumen Acuan */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Pilih Dokumen Acuan ({selectedDocIds.length} Dipilih)
              </label>

              <div className="relative" ref={dropdownRef}>
                <div
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-300 p-2.5 cursor-pointer flex items-center justify-between gap-2 rounded-none min-h-[42px]"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Search size={15} className="text-slate-500 shrink-0" />
                    {selectedDocIds.length === 0 ? (
                      <span className="text-xs text-slate-400 font-medium">-- Cari & pilih dokumen acuan di DB --</span>
                    ) : (
                      <span className="text-xs text-slate-900 font-bold truncate">
                        {selectedDocObjects.map((d) => d.title).join(', ')}
                      </span>
                    )}
                  </div>
                  <ChevronDown size={16} className={`text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </div>

                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 shadow-xl z-40 max-h-72 overflow-y-auto rounded-none p-3 space-y-3">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Ketik untuk mencari dokumen acuan..."
                        className="w-full pl-9 pr-3 py-1.5 border border-slate-300 text-xs rounded-none focus:outline-none focus:border-teal-700"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    {isLoadingDocs ? (
                      <div className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                        <Loader2 size={14} className="animate-spin text-teal-600" />
                        <span>Memuat dokumen...</span>
                      </div>
                    ) : filteredDocuments.length === 0 ? (
                      <div className="py-4 text-center text-xs text-slate-500">
                        Tidak ditemukan dokumen acuan di database.
                      </div>
                    ) : (
                      <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                        {filteredDocuments.map((doc) => {
                          const isSelected = selectedDocIds.includes(doc.id);
                          return (
                            <div
                              key={doc.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelectDocument(doc.id);
                              }}
                              className={`p-2 border cursor-pointer transition-colors flex items-center justify-between text-xs rounded-none ${
                                isSelected
                                  ? 'bg-teal-50 border-teal-600 text-teal-900 font-bold'
                                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                              }`}
                            >
                              <div className="truncate min-w-0">{doc.title}</div>
                              <div className={`w-4 h-4 border flex items-center justify-center shrink-0 ${isSelected ? 'bg-teal-700 border-teal-700 text-white' : 'border-slate-400'}`}>
                                {isSelected && <Check size={12} />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Selected Pills */}
              {selectedDocObjects.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedDocObjects.map((doc) => (
                    <span key={doc.id} className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-teal-100 border border-teal-300 text-teal-900 text-[11px] font-bold">
                      <FileText size={11} className="text-teal-700" />
                      <span className="max-w-[180px] truncate">{doc.title}</span>
                      <button type="button" onClick={() => toggleSelectDocument(doc.id)} className="hover:text-red-700 text-slate-500">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Judul Artikel Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Judul / Topik Artikel (Input Pengguna)
              </label>
              <input
                type="text"
                value={articleTitle}
                onChange={(e) => setArticleTitle(e.target.value)}
                placeholder="Contoh: Strategi Percepatan Perekonomian & Infrastruktur Mimika 2025"
                required
                className="w-full text-xs p-2.5 border border-slate-300 bg-white focus:outline-none focus:border-teal-700"
              />
              <p className="text-[11px] text-slate-500">
                Judul akan menjadi fokus utama analisis dan perakitan narasi artikel oleh AI.
              </p>
            </div>
          </div>

          {/* Row 2: Target Length & Tone Options (FLAT DIVIDED ROW, NO NESTED BOXES) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-200">
            {/* Length Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2 tracking-wider">
                Panjang Teks Keluaran Artikel
              </label>
              <div className="grid grid-cols-3 divide-x divide-slate-200 border-y border-slate-200">
                {[
                  { key: 'SHORT', label: 'Ringkas (~300 Kata)' },
                  { key: 'MEDIUM', label: 'Sedang (~700 Kata)' },
                  { key: 'LONG', label: 'Mendalam (~1500 Kata)' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTargetLength(item.key as any)}
                    className={`py-2 px-2 text-xs font-bold uppercase transition-all cursor-pointer text-center ${
                      targetLength === item.key
                        ? 'bg-teal-700 text-white font-extrabold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tone Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2 tracking-wider">
                Gaya Bahasa / Tone Publikasi
              </label>
              <div className="grid grid-cols-4 divide-x divide-slate-200 border-y border-slate-200">
                {['solutif', 'kritis', 'akademis', 'populer'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTone(t)}
                    className={`py-2 px-2 text-xs font-bold uppercase transition-all cursor-pointer text-center ${
                      tone === t
                        ? 'bg-teal-700 text-white font-extrabold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>


          {/* Submit Action */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isGenerating || selectedDocIds.length === 0}
              className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs uppercase tracking-wider rounded-none inline-flex items-center gap-2 border border-teal-800 shadow-xs disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Sintesis CoT 2-Step Berlangsung...</span>
                </>
              ) : (
                <>
                  <PenTool size={15} />
                  <span>Generate Draf Artikel Baru (Simpan ke DB)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: Tab System (Editor Chat Aktif vs Riwayat Sesi DB) */}
      <div className="flex items-center border-b border-slate-300">
        <button
          onClick={() => setActiveTab('editor')}
          className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 rounded-none transition-all ${
            activeTab === 'editor'
              ? 'border-teal-700 text-teal-900 bg-white font-extrabold shadow-2xs'
              : 'border-transparent text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText size={15} />
          <span>Draf Artikel & Interactive Chat</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('history');
            loadHistory();
          }}
          className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 rounded-none transition-all ${
            activeTab === 'history'
              ? 'border-teal-700 text-teal-900 bg-white font-extrabold shadow-2xs'
              : 'border-transparent text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History size={15} />
          <span>Riwayat Sesi Artikel DB ({articleSessionsHistory.length})</span>
        </button>
      </div>

      {/* TAB CONTENT 1: Editor & Interactive Revision Chat */}
      {activeTab === 'editor' && (
        !activeSession ? (
          <div className="bg-white border border-slate-300 p-12 text-center rounded-none shadow-xs space-y-4">
            <Layers size={42} className="mx-auto text-slate-400" />
            <h3 className="text-base font-bold text-slate-900">Belum Ada Sesi Artikel Aktif</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Konfigurasikan judul dan dokumen acuan pada panel di atas, lalu klik <strong>'Generate Draf Artikel Baru'</strong> atau buka riwayat dari tab <strong>'Riwayat Sesi Artikel DB'</strong>.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Col (2 cols): Active Article Preview & Full Text */}
            <div className="lg:col-span-2 bg-white border border-slate-300 p-6 rounded-none shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider block">
                    {activeSession.tone?.toUpperCase()} &bull; {activeSession.targetLength} &bull; {activeSession.sources?.length || 0} DOKUMEN ACUAN
                  </span>
                  <h2 className="text-lg font-bold text-slate-900">
                    {activeSession.articleTitle || activeSession.title}
                  </h2>
                </div>

                <button
                  onClick={() => handleCopyText(activeSession.fullArticleText || '')}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs uppercase tracking-wider rounded-none inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <Copy size={13} />
                  <span>Salin Teks Artikel</span>
                </button>
              </div>

              {/* Full Article Text Box */}
              <div className="bg-slate-50 border border-slate-300 p-5 font-mono text-xs text-slate-900 leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto rounded-none">
                {activeSession.fullArticleText || 'Belum ada draf artikel.'}
              </div>
            </div>

            {/* Right Col (1 col): CoT Interactive Chat History & Revision Input */}
            <div className="bg-white border border-slate-300 p-4 rounded-none shadow-xs flex flex-col h-[580px]">
              <div className="border-b border-slate-200 pb-3 mb-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                  <MessageSquareCode size={15} className="text-teal-700" />
                  <span>Riwayat Percakapan & Revisi (CoT)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Setiap instruksi revisi disimpan ke PostgreSQL selayaknya obrolan AI.
                </p>
              </div>

              {/* Chat Message List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {activeSession.messages?.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 text-xs rounded-none leading-relaxed ${
                      msg.role === 'USER'
                        ? 'bg-slate-100 border-l-2 border-slate-700 text-slate-900'
                        : 'bg-teal-50 border-l-2 border-teal-700 text-teal-950 font-medium'
                    }`}
                  >
                    <div className="font-bold uppercase text-[10px] text-slate-500 mb-1">
                      {msg.role === 'USER' ? 'Pengguna / Editor' : 'BRIDA AI Assistant'} &bull; {new Date(msg.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="whitespace-pre-wrap line-clamp-6">{msg.content}</div>
                  </div>
                ))}
              </div>

              {/* Interactive Revision Form */}
              <form onSubmit={handleSendFollowUp} className="pt-3 border-t border-slate-200 mt-3 space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    value={followUpQuery}
                    onChange={(e) => setFollowUpQuery(e.target.value)}
                    placeholder="Instruksikan revisi (cth: Perbaiki paragraf 2)..."
                    className="w-full text-xs pr-10 p-2.5 border border-slate-300 rounded-none focus:outline-none focus:border-teal-700"
                  />
                  <button
                    type="submit"
                    disabled={isSendingFollowUp || !followUpQuery.trim()}
                    className="absolute right-2 top-2 text-teal-700 hover:text-teal-900 disabled:opacity-40"
                  >
                    {isSendingFollowUp ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      )}

      {/* TAB CONTENT 2: Saved Article Sessions History */}
      {activeTab === 'history' && (
        <div className="bg-white border border-slate-300 p-6 rounded-none shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Database size={16} className="text-teal-700" />
              <span>Daftar Sesi Artikel & Percakapan Tersimpan di Database</span>
            </h2>
            <button
              onClick={loadHistory}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase rounded-none border border-slate-300 inline-flex items-center gap-1.5"
            >
              <RefreshCw size={13} />
              <span>Refresh</span>
            </button>
          </div>

          {articleSessionsHistory.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Clock size={36} className="mx-auto text-slate-400" />
              <p className="text-sm font-semibold">Belum ada riwayat sesi artikel di database.</p>
              <p className="text-xs text-slate-400">Buat draf artikel baru di atas untuk mulai menyimpan sesi.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 border border-slate-200">
              {articleSessionsHistory.map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleOpenSessionFromHistory(session.id)}
                  className="p-4 hover:bg-slate-50 transition-colors flex flex-wrap items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="space-y-1 max-w-2xl">
                    <strong className="block text-sm font-bold text-slate-900 hover:text-teal-700">
                      {session.articleTitle || session.title}
                    </strong>
                    <p className="text-xs text-slate-600 line-clamp-2 italic">
                      "{(session as any).lastMessage || 'Tidak ada riwayat pesan.'}"
                    </p>
                    <div className="text-[11px] text-slate-500 font-semibold flex flex-wrap items-center gap-3 pt-1">
                      <span>Diperbarui: {new Date(session.updatedAt).toLocaleString('id-ID')}</span>
                      <span>&bull;</span>
                      <span>Tone: {session.tone?.toUpperCase() || 'SOLUTIF'}</span>
                      <span>&bull;</span>
                      <span className="text-teal-700">Acuan: {session.sources?.length || 1} Dokumen</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenSessionFromHistory(session.id)}
                      className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs uppercase tracking-wider rounded-none inline-flex items-center gap-1.5"
                    >
                      <span>Buka Sesi</span>
                    </button>
                    <button
                      onClick={(e) => handleDeleteSession(e, session.id)}
                      className="px-2.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 font-bold text-xs uppercase tracking-wider rounded-none border border-red-300"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer Note */}
      <div className="text-center text-xs text-slate-500 font-medium pt-4">
        BRIDA SMART Analysis &bull; Terintegrasi Storage Database PostgreSQL & Engine Generative AI Kabupaten Mimika
      </div>
    </div>
  );
};

export default ArticleGeneratorView;
