import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Loader2,
  History,
  Plus,
  Trash2,
  AlertCircle,
  Paperclip,
  X,
  HeartPulse,
  Coins,
  Building2,
  Compass,
  MessageSquareCode,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { InfographicApi } from '../services/infographic.api';
import type {
  InfographicSessionDetail,
  InfographicSessionListItem,
  InfographicPosterItem,
  PosterAspectRatio,
} from '../services/infographic.api';
import { PosterShowcaseStage } from '../components/poster-showcase-stage.component';

interface InfographicStudioViewProps {
  initialTopic?: string;
  onNavigateToArticleEditor?: () => void;
}

export const InfographicStudioView: React.FC<InfographicStudioViewProps> = ({
  initialTopic,
}) => {
  const [sessions, setSessions] = useState<InfographicSessionListItem[]>([]);
  const [activeSession, setActiveSession] = useState<InfographicSessionDetail | null>(null);
  const [activePoster, setActivePoster] = useState<InfographicPosterItem | null>(null);

  const [inputPrompt, setInputPrompt] = useState<string>(initialTopic || '');
  const aspectRatio: PosterAspectRatio = '3:4';
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'chat' | 'showcase'>('chat');
  const [isChatCollapsed, setIsChatCollapsed] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSessionsList();
    // Default buka sidebar hanya pada layar desktop (>= 1024px)
    if (window.innerWidth >= 1024) {
      setIsSidebarOpen(true);
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.posters, isLoading]);

  const loadSessionsList = async () => {
    try {
      const list = await InfographicApi.getSessionsList();
      setSessions(list);
      if (list.length > 0 && !activeSession) {
        handleSelectSession(list[0].id);
      }
    } catch (err: any) {
      console.error('Gagal memuat sesi infografis:', err);
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    setErrorMessage(null);
    try {
      const detail = await InfographicApi.getSessionDetail(sessionId);
      setActiveSession(detail);
      const posters = detail.posters || [];
      setActivePoster(posters[posters.length - 1] || null);

      // Pada perangkat mobile, otomatis alihkan ke tab panggung infografis saat memilih sesi
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
        setMobileTab('showcase');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memuat detail sesi.');
    }
  };

  const handleCreateNewSession = () => {
    setActiveSession(null);
    setActivePoster(null);
    setInputPrompt('');
    setAttachedFile(null);
    setErrorMessage(null);
    setMobileTab('chat');
    setIsChatCollapsed(false);
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!window.confirm('Hapus sesi infografis ini beserta seluruh berkas gambarnya?')) return;

    try {
      await InfographicApi.deleteSession(sessionId);
      if (activeSession?.id === sessionId) {
        handleCreateNewSession();
      }
      loadSessionsList();
    } catch (err: any) {
      alert(`Gagal menghapus sesi: ${err.message}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
    }
  };

  const handleSubmitPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputPrompt.trim();
    if ((!query && !attachedFile) || isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);

    // Di layar mobile, segera alihkan ke tab panggung untuk melihat proses generasi
    if (window.innerWidth < 1024) {
      setMobileTab('showcase');
    }

    try {
      const effectivePrompt = query || (attachedFile ? `Rangkum dan visualisasikan dokumen terlampir: ${attachedFile.name}` : '');

      if (!activeSession) {
        // TURN 1: Inisiasi sesi baru & buat infografis v1
        const createdSession = await InfographicApi.createSession({
          topic: effectivePrompt,
          aspectRatio,
        });

        setActiveSession(createdSession);
        const posters = createdSession.posters || [];
        setActivePoster(posters[posters.length - 1] || null);
        loadSessionsList();
      } else {
        // TURN 2+: Kirim instruksi revisi & buat infografis versi baru (v2, v3, ...)
        const result = await InfographicApi.sendRevisionChat({
          sessionId: activeSession.id,
          message: effectivePrompt,
          aspectRatio,
        });

        setActiveSession((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            posters: [...prev.posters, result.latestPoster],
          };
        });
        setActivePoster(result.latestPoster);
        loadSessionsList();
      }

      setInputPrompt('');
      setAttachedFile(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi gangguan saat memproses instruksi infografis.');
      if (window.innerWidth < 1024) {
        setMobileTab('chat');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const quickStarters = [
    {
      label: 'Dampak El Niño Mimika 2026',
      icon: Compass,
      prompt: 'Buatkan infografis perkembangan dampak El Niño di Kabupaten Mimika 2026 lengkap dengan perbandingan curah hujan, sektor pertanian, dan peta kerawanan distrik.',
    },
    {
      label: 'Prevalensi Stunting 18.4%',
      icon: HeartPulse,
      prompt: 'Buatkan infografis penurunan stunting di Kabupaten Mimika tahun 2026, tonjolkan prevalensi 18.4% dan rekomendasi aksi Dinas Kesehatan.',
    },
    {
      label: 'Evaluasi Serapan APBD & PAD',
      icon: Coins,
      prompt: 'Buatkan infografis evaluasi serapan anggaran APBD dan realisasi PAD Kabupaten Mimika 2026 dengan warna dominan Deep Navy dan Gold.',
    },
    {
      label: 'Konektivitas Jalan Distrik',
      icon: Building2,
      prompt: 'Buatkan infografis progres pembangunan jalan poros dan jembatan penghubung distrik terisolasi di Mimika.',
    },
  ];

  return (
    <div className="w-full h-[calc(100vh-64px)] flex flex-col bg-slate-100 font-roboto select-none overflow-hidden rounded-none">
      {/* ── TOP HEADER BANNER RESPONSIVE ── */}
      <div className="px-4 sm:px-6 py-2 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 rounded-none z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-teal-50 border border-teal-200 text-teal-800 rounded-none shrink-0">
            <Sparkles size={14} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 truncate">
              Studio Infografis AI &bull; Asisten Kreatif BRIDA
            </h1>
            <p className="text-[10px] text-slate-500 font-medium truncate hidden sm:block">
              Rancang infografis resmi berbasis data riset daerah dan internet live.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsChatCollapsed(!isChatCollapsed)}
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border border-slate-300 uppercase tracking-wider rounded-none cursor-pointer transition-colors"
            title={isChatCollapsed ? "Buka panel obrolan AI" : "Sembunyikan panel obrolan"}
          >
            {isChatCollapsed ? <PanelLeftOpen size={13} /> : <PanelLeftClose size={13} />}
            <span>{isChatCollapsed ? "Buka Obrolan" : "Sembunyikan Obrolan"}</span>
          </button>

          <button
            type="button"
            onClick={handleCreateNewSession}
            className="px-3 sm:px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-[11px] sm:text-xs uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors cursor-pointer rounded-none shrink-0"
          >
            <Plus size={13} />
            <span>Infografis Baru</span>
          </button>
        </div>
      </div>

      {/* ── MOBILE VIEW SELECTOR TABS (< 1024px) ── */}
      <div className="lg:hidden flex items-center border-b border-slate-200 bg-white shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab('chat')}
          className={`flex-1 py-2.5 px-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors border-b-2 rounded-none cursor-pointer ${
            mobileTab === 'chat'
              ? 'border-teal-700 text-teal-900 bg-teal-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquareCode size={14} className={mobileTab === 'chat' ? 'text-teal-700' : 'text-slate-400'} />
          <span>Obrolan AI</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('showcase')}
          className={`flex-1 py-2.5 px-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors border-b-2 rounded-none cursor-pointer ${
            mobileTab === 'showcase'
              ? 'border-teal-700 text-teal-900 bg-teal-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers size={14} className={mobileTab === 'showcase' ? 'text-teal-700' : 'text-slate-400'} />
          <span>Panggung Infografis {activePoster ? `(v${activePoster.versionNumber})` : ''}</span>
        </button>
      </div>

      {/* ── WORKSPACE BODY (SPLIT-SCREEN DUAL PANE / TABBED MOBILE) ── */}
      <div className="flex-1 flex overflow-hidden bg-white relative">
        {/* ── SIDEBAR RIWAYAT (DESKTOP: INLINE, MOBILE: OVERLAY DRAWER) ── */}
        {isSidebarOpen && (
          <>
            {/* Backdrop Mobile */}
            <div
              className="fixed inset-0 top-16 bg-slate-950/70 z-40 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />

            {/* Sidebar Content */}
            <div className="fixed inset-y-0 left-0 z-50 w-72 bg-slate-50 border-r border-slate-200 flex flex-col shadow-2xl lg:static lg:z-auto lg:w-64 lg:shadow-none shrink-0 overflow-hidden rounded-none">
              <div className="p-3.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between rounded-none">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <History size={13} className="text-teal-700" />
                  <span>Riwayat Sesi ({sessions.length})</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="text-slate-500 hover:text-slate-900 p-1 cursor-pointer lg:hidden"
                  title="Tutup Riwayat"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-200/60 custom-scrollbar">
                {sessions.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 italic">
                    Belum ada sesi infografis tersimpan.
                  </div>
                ) : (
                  sessions.map((sess) => {
                    const isActive = activeSession?.id === sess.id;
                    return (
                      <div
                        key={sess.id}
                        onClick={() => handleSelectSession(sess.id)}
                        className={`p-3.5 text-left text-xs cursor-pointer transition-colors space-y-1.5 rounded-none ${
                          isActive
                            ? 'bg-white border-l-4 border-teal-700 font-bold text-teal-950 shadow-2xs'
                            : 'hover:bg-slate-100/60 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="truncate font-bold text-slate-900">{sess.title}</span>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSession(e, sess.id)}
                            className="text-slate-400 hover:text-red-600 p-0.5 shrink-0 cursor-pointer rounded-none"
                            title="Hapus sesi infografis"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center justify-between font-medium">
                          <span>{sess.totalVersions} Versi Revisi</span>
                          <span className="font-mono">{new Date(sess.updatedAt).toLocaleDateString('id-ID')}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}

        {/* ── PANE KIRI: CONVERSATIONAL CHAT STREAM ── */}
        <div
          className={`w-full lg:w-[460px] bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-hidden rounded-none transition-all duration-200 ${
            isChatCollapsed ? 'hidden' : mobileTab === 'chat' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Header Kontrol Chat */}
          <div className="px-4 sm:px-5 py-2.5 sm:py-3 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 rounded-none">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-slate-600 hover:text-slate-900 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer rounded-none"
            >
              <History size={13} />
              <span>{isSidebarOpen ? 'Tutup Riwayat' : 'Buka Riwayat'}</span>
            </button>
            <span className="text-[10px] font-bold text-teal-800 uppercase tracking-widest">
              Pengarah Kreatif AI
            </span>
          </div>

          {/* Timeline Dialog Obrolan */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 sm:py-6 space-y-5 custom-scrollbar select-text">
            {!activeSession ? (
              <div className="space-y-4 py-2 text-left">
                <div className="space-y-2 border-l-2 border-teal-600 pl-4 py-1">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wide block">
                    Selamat Datang di Studio Infografis BRIDA
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Sampaikan topik infografis yang ingin dirancang atau lampirkan berkas laporan. Data angka dan fakta akan dipadukan secara otomatis dari seluruh database BRIDA dan internet live.
                  </p>
                </div>

                {/* Pilihan Cepat Topik Sektoral */}
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Pilihan Contoh Topik Sektoral:
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    {quickStarters.map((starter, idx) => {
                      const Icon = starter.icon;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setInputPrompt(starter.prompt)}
                          className="p-3 bg-slate-50 hover:bg-teal-50/70 border border-slate-200 text-left transition-colors cursor-pointer flex items-center gap-2.5 text-xs font-semibold text-slate-800 rounded-none"
                        >
                          <Icon size={15} className="text-teal-700 shrink-0" />
                          <span className="truncate">{starter.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              activeSession.posters.map((poster) => (
                <div key={poster.id} className="space-y-3">
                  {/* Bubble Prompt Pengguna */}
                  <div className="flex flex-col items-end space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Instruksi Anda
                    </span>
                    <div className="bg-teal-850 text-white px-3.5 py-2.5 text-xs leading-relaxed max-w-[90%] select-text font-medium rounded-none">
                      <p className="whitespace-pre-wrap">{poster.userPrompt}</p>
                    </div>
                  </div>

                  {/* Respon Art Director AI */}
                  <div className="border-l-2 border-teal-600 pl-3.5 py-1 space-y-2 text-left">
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-teal-800">
                      <span className="flex items-center gap-1.5">
                        <Sparkles size={13} className="text-teal-600 shrink-0" />
                        <span>Pengarah Kreatif &bull; Versi {poster.versionNumber}</span>
                      </span>
                      <span className="text-slate-400 font-mono text-[10px]">
                        Rasio {poster.aspectRatio}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed font-normal">
                      {poster.aiCommentary || 'Infografis telah dirancang sesuai data acuan dan arahan visual.'}
                    </p>

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setActivePoster(poster);
                          if (window.innerWidth < 1024) {
                            setMobileTab('showcase');
                          }
                        }}
                        className={`text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                          activePoster?.id === poster.id
                            ? 'text-teal-900 font-black underline underline-offset-4'
                            : 'text-teal-700 hover:text-teal-900 underline underline-offset-2'
                        }`}
                      >
                        Tampilkan di Panggung (v{poster.versionNumber}) &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex items-center gap-3 p-3.5 bg-teal-50 border-l-2 border-teal-600 text-teal-900 text-xs font-semibold animate-pulse rounded-none">
                <Loader2 size={16} className="animate-spin text-teal-700 shrink-0" />
                <span>
                  {activeSession
                    ? 'Pengarah kreatif sedang memproses revisi & merender infografis baru...'
                    : 'Memadukan data database & internet untuk merender infografis v1...'}
                </span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Pesan Error */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border-t border-red-200 text-red-700 text-xs flex items-center gap-2 rounded-none">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ── CLEAN INPUT BAR (DENGAN PAPERCLIP LAMPIRAN BERKAS) ── */}
          <form onSubmit={handleSubmitPrompt} className="p-3 sm:p-4 bg-white border-t border-slate-200 space-y-2.5 shrink-0 rounded-none">
            {/* Indikator Lampiran Berkas Jika Ada */}
            {attachedFile && (
              <div className="flex items-center justify-between px-3 py-1.5 bg-teal-50 border border-teal-200 text-teal-900 text-xs font-medium rounded-none">
                <div className="flex items-center gap-2 truncate">
                  <Paperclip size={13} className="text-teal-700 shrink-0" />
                  <span className="truncate">{attachedFile.name} ({(attachedFile.size / 1024).toFixed(0)} KB)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedFile(null)}
                  className="text-teal-700 hover:text-red-600 p-0.5 cursor-pointer ml-2"
                >
                  <X size={13} />
                </button>
              </div>
            )}


            {/* Input Bar & Actions */}
            <div className="flex items-center border border-slate-300 focus-within:border-teal-700 bg-slate-50 transition-colors rounded-none">
              {/* Tombol Lampiran Berkas (Paperclip) */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="p-2.5 text-slate-400 hover:text-teal-700 transition-colors cursor-pointer border-r border-slate-200"
                title="Lampirkan Dokumen PDF/Laporan atau Gambar Referensi"
              >
                <Paperclip size={16} />
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
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                disabled={isLoading}
                placeholder={
                  activeSession
                    ? 'Ketik instruksi revisi (misal: "Ganti warna jadi navy gold")...'
                    : 'Ketik topik infografis atau lampirkan dokumen laporan...'
                }
                className="flex-1 bg-transparent px-3 py-2.5 text-xs text-slate-900 outline-none font-medium"
              />

              <button
                type="submit"
                disabled={isLoading || (!inputPrompt.trim() && !attachedFile)}
                className="px-3.5 sm:px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold uppercase transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 rounded-none"
              >
                <span>{activeSession ? 'Revisi' : 'Kirim'}</span>
                <Send size={12} />
              </button>
            </div>
          </form>
        </div>

        {/* ── PANE KANAN: PANGGUNG SHOWCASE INFOGRAFIS ── */}
        <div
          className={`flex-1 overflow-hidden flex flex-col ${
            mobileTab === 'showcase' || isChatCollapsed ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <PosterShowcaseStage
            session={activeSession}
            activePoster={activePoster}
            onSelectVersion={(poster) => setActivePoster(poster)}
            isGenerating={isLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default InfographicStudioView;
