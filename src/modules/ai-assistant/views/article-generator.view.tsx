import React, { useState, useEffect } from 'react';
import { DocumentService } from '../../../services/document.service';
import type { DocumentRecord } from '../../../services/document.service';
import { AiAssistantService } from '../../../services/ai-assistant.service';
import type { ArticleSessionDetail } from '../../../services/ai-assistant.service';
import { CategorizedDocumentSelector } from '../../../components/common/categorized-document-selector.component';
import {
  MessageSquareCode,
  Sparkles,
  Search,
  X,
  FileText,
  PenTool,
  Loader2,
  Copy,
  CheckCircle2,
  History,
  Trash2,
  Send,
  Clock,
  Calendar,
  Layers,
  Database,
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

  // Form Generator Configuration
  const [articleTitle, setArticleTitle] = useState<string>('');
  const [tone, setTone] = useState<string>('solutif');
  const [targetLength, setTargetLength] = useState<'SHORT' | 'MEDIUM' | 'LONG'>('MEDIUM');
  const [userInstruction, _setUserInstruction] = useState<string>(initialPrompt || '');

  // Session & Interaction State
  const [activeSession, setActiveSession] = useState<ArticleSessionDetail | null>(null);
  const [articleSessionsHistory, setArticleSessionsHistory] = useState<ArticleSessionDetail[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [followUpQuery, setFollowUpQuery] = useState<string>('');
  const [isSendingFollowUp, setIsSendingFollowUp] = useState<boolean>(false);

  // Live filter states for saved article sessions history (Calendar Datepicker & Text Search)
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyCalendarDate, setHistoryCalendarDate] = useState('');

  const filteredArticleSessions = articleSessionsHistory.filter((session) => {
    // 1. Text Search Filter
    const q = historySearchQuery.toLowerCase();
    const titleText = session.articleTitle || session.title || '';
    const lastMsgText = (session as any).lastMessage || '';
    const matchesText = titleText.toLowerCase().includes(q) || lastMsgText.toLowerCase().includes(q);

    if (!matchesText) return false;

    // 2. Calendar Date Filter (YYYY-MM-DD)
    if (historyCalendarDate) {
      const sessionDate = new Date(session.updatedAt || session.createdAt);
      if (!isNaN(sessionDate.getTime())) {
        const sessionDateIso = sessionDate.toISOString().split('T')[0];
        if (sessionDateIso !== historyCalendarDate) return false;
      }
    }

    return true;
  });

  // Active Tab for Sidebar (Editor vs History)
  const [activeTab, setActiveTab] = useState<'editor' | 'history'>('editor');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

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

  const handleSelectAll = () => {
    setSelectedDocIds(documents.map((d) => d.id));
  };

  const handleClearAll = () => {
    setSelectedDocIds([]);
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

  return (
    <div className="flex flex-col w-full bg-slate-100/70 p-6 space-y-6 font-roboto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 border border-slate-700 shadow-xl flex items-center gap-3 rounded-none">
          <CheckCircle2 size={18} className="text-teal-400 shrink-0" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* SECTION 1. HERO COMMAND STRIP HEADER */}
      <div className="w-full bg-white border border-slate-300 px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-none shadow-2xs">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold uppercase text-slate-900 tracking-tight">
            Penulis Artikel &amp; Rilis Media BRIDA
          </h1>
          <p className="text-xs text-slate-500 font-normal mt-1">
            Perakitan artikel publikasi dan naskah siaran pers berbasis sintesis multidokumen acuan resmi BRIDA.
          </p>
        </div>
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
        </div>

        <form onSubmit={handleGenerateNewArticle} className="space-y-4 font-roboto">
          {/* Categorized Multi-Document Selector Hub */}
          <CategorizedDocumentSelector
            documents={documents}
            selectedDocIds={selectedDocIds}
            onToggleDoc={toggleSelectDocument}
            onSelectAll={handleSelectAll}
            onClearAll={handleClearAll}
            isLoading={isLoadingDocs}
            title="Pilih Dokumen Acuan Artikel"
          />

          {/* Judul Artikel Input */}
          <div className="space-y-2 pt-4 border-t border-slate-200">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
              Judul / Topik Utama Artikel (Input Pengguna)
            </label>
            <input
              type="text"
              value={articleTitle}
              onChange={(e) => setArticleTitle(e.target.value)}
              placeholder="Contoh: Strategi Percepatan Perekonomian & Infrastruktur Kabupaten Mimika 2025"
              required
              className="w-full text-xs p-2.5 border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-700 rounded-none font-medium"
            />
            <p className="text-[11px] text-slate-500">
              Judul ini akan menjadi panduan fokus utama AI Engine dalam mensintesis artikel berbasis bukti data dokumen.
            </p>
          </div>

          {/* Row 2: Target Length & Tone Options dengan Pembatas Vertikal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">

            {/* Length Selector (Kolom Kiri dengan Border Vertikal di kanan) */}
            <div className="border-r border-slate-200 pr-6">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2 tracking-wider">
                Panjang Teks Keluaran Artikel
              </label>
              <div className="grid grid-cols-3 divide-x divide-slate-200 border-y border-slate-200">
                {[
                  { key: 'SHORT', label: 'Ringkas (~700 Kata)' },
                  { key: 'MEDIUM', label: 'Sedang (~1000 Kata)' },
                  { key: 'LONG', label: 'Mendalam (~1500 Kata)' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTargetLength(item.key as any)}
                    className={`py-2 text-xs font-bold uppercase transition-all ${targetLength === item.key ? 'bg-teal-700 text-white' : 'hover:bg-slate-50 text-slate-700'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tone Selector (Kolom Kanan) */}
            <div className="pl-0">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2 tracking-wider">
                Gaya Bahasa / Tone Publikasi
              </label>
              <div className="grid grid-cols-4 divide-x divide-slate-200 border-y border-slate-200">
                {['solutif', 'kritis', 'akademis', 'populer'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTone(t)}
                    className={`py-2 text-xs font-bold uppercase transition-all ${tone === t ? 'bg-teal-700 text-white' : 'hover:bg-slate-50 text-slate-700'}`}
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
          className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 rounded-none transition-all ${activeTab === 'editor'
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
          className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 rounded-none transition-all ${activeTab === 'history'
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
                    className={`p-3 text-xs rounded-none leading-relaxed border border-slate-200 ${msg.role === 'USER'
                      ? 'bg-slate-100 text-slate-900'
                      : 'bg-teal-50 text-teal-950 font-medium'
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
        <div className="bg-white border border-slate-300 p-6 rounded-none shadow-xs space-y-4 font-roboto">
          {/* Header & Filter Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Database size={16} className="text-teal-700 shrink-0" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Daftar Sesi Artikel &amp; Percakapan Tersimpan ({filteredArticleSessions.length} dari {articleSessionsHistory.length})
              </h2>
            </div>

            {/* Filter Controls: Calendar Datepicker + Search Box */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Calendar Datepicker Input */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 px-2 py-1 text-xs">
                <Calendar size={13} className="text-teal-700 shrink-0" />
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider hidden sm:inline">
                  Pilih Kalender:
                </span>
                <input
                  type="date"
                  value={historyCalendarDate}
                  onChange={(e) => setHistoryCalendarDate(e.target.value)}
                  className="bg-transparent text-slate-900 text-xs font-semibold focus:outline-none cursor-pointer rounded-none"
                />
                {historyCalendarDate && (
                  <button
                    onClick={() => setHistoryCalendarDate('')}
                    className="p-0.5 text-slate-400 hover:text-red-600 cursor-pointer"
                    title="Hapus tanggal kalender"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Text Search Input */}
              <div className="relative w-full sm:w-56">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="Cari judul / instruksi..."
                  className="w-full bg-slate-50 border border-slate-300 pl-8 pr-7 py-1 text-xs text-slate-900 focus:outline-none focus:border-teal-700 rounded-none font-medium"
                />
                {historySearchQuery && (
                  <button
                    onClick={() => setHistorySearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    title="Hapus kata kunci filter"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <button
                onClick={loadHistory}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase rounded-none border border-slate-300 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {filteredArticleSessions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Clock size={36} className="mx-auto text-slate-400" />
              <p className="text-sm font-semibold">Tidak ditemukan riwayat sesi artikel yang cocok dengan filter.</p>
              <p className="text-xs text-slate-400">Coba ubah tanggal kalender atau kata kunci pencarian Anda.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 border border-slate-200">
              {filteredArticleSessions.map((session) => (
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
