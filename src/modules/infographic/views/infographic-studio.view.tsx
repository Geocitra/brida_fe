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
  Layers,
  Search,
  Check,
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
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSessionsList();
  }, []);

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

    try {
      const effectivePrompt = query || (attachedFile ? `Rangkum dan visualisasikan dokumen terlampir: ${attachedFile.name}` : '');

      if (!activeSession) {
        // Inisiasi sesi baru & buat infografis v1
        const createdSession = await InfographicApi.createSession({
          topic: effectivePrompt,
          aspectRatio,
        });

        setActiveSession(createdSession);
        const posters = createdSession.posters || [];
        setActivePoster(posters[posters.length - 1] || null);
        loadSessionsList();
        window.dispatchEvent(new CustomEvent('brida-token-updated'));
      } else {
        // Kirim instruksi revisi & buat infografis versi baru (v2, v3, ...)
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
        window.dispatchEvent(new CustomEvent('brida-token-updated'));
      }

      setInputPrompt('');
      setAttachedFile(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi gangguan saat memproses instruksi infografis.');
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

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activePosters = activeSession?.posters || [];

  return (
    <div className="flex flex-col w-full min-h-screen bg-slate-100/70 p-4 sm:p-6 space-y-6 font-roboto text-left">
      {/* ── 1. HEADER HALAMAN STUDIO ── */}
      <div className="w-full bg-white border border-slate-300 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-none shadow-2xs shrink-0 text-left">
        <div className="flex flex-col text-left">
          <span className="text-[10px] font-bold tracking-widest text-teal-800 uppercase mb-1.5 flex items-center gap-1.5">
            <Sparkles size={12} className="text-teal-700" />
            <span>STUDIO PENGARAH KREATIF VISUAL</span>
          </span>
          <h1 className="text-lg font-bold uppercase text-slate-900 tracking-tight">
            Studio Infografis AI &bull; BRIDA Kabupaten Mimika
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Rancang infografis resmi berbasis data riset daerah, dokumen laporan, dan internet live.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-slate-950 bg-slate-50 hover:bg-slate-100 border border-slate-300 uppercase tracking-wider rounded-none cursor-pointer transition-colors"
            title={isSidebarOpen ? 'Sembunyikan panel riwayat' : 'Buka panel riwayat'}
          >
            <History size={14} className="text-teal-700" />
            <span>{isSidebarOpen ? 'Sembunyikan Riwayat' : 'Buka Riwayat'}</span>
          </button>

          <button
            type="button"
            onClick={handleCreateNewSession}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors cursor-pointer rounded-none shrink-0 shadow-xs"
          >
            <Plus size={14} />
            <span>Infografis Baru</span>
          </button>
        </div>
      </div>

      {/* ── 2. BAGIAN ATAS: PERINTAH & OBROLAN AI (FULL-WIDTH SEPERTI HALAMAN ARTIKEL) ── */}
      <div className="w-full bg-white border border-slate-300 p-5 sm:p-6 shadow-2xs rounded-none text-left space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-teal-700 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              {activeSession ? 'Instruksi Revisi & Obrolan Pengarah Kreatif AI' : 'Perintah Perancangan Infografis'}
            </span>
          </div>

          {activeSession && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Sesi Aktif:</span>
              <span className="text-teal-900 font-bold truncate max-w-md">{activeSession.title}</span>
              {activePoster && (
                <span className="px-2 py-0.5 bg-teal-50 border border-teal-200 text-teal-800 font-bold text-[10px] rounded-none">
                  Versi {activePoster.versionNumber}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Catatan / Arahan Pengarah Kreatif AI dari poster yang sedang aktif */}
        {activePoster?.aiCommentary && (
          <div className="p-3.5 bg-teal-50/70 border-l-3 border-teal-600 text-xs text-slate-700 leading-relaxed font-normal flex items-start gap-2.5 rounded-none">
            <Sparkles size={14} className="text-teal-700 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-950 block mb-1">
                Catatan Pengarah Kreatif &bull; Versi {activePoster.versionNumber}:
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">
                {activePoster.aiCommentary}
              </p>
            </div>
          </div>
        )}

        {/* Bar Masukan Prompting / Chat AI */}
        <form onSubmit={handleSubmitPrompt} className="space-y-2.5">
          {attachedFile && (
            <div className="flex items-center justify-between px-3 py-1.5 bg-teal-50 border border-teal-200 text-teal-900 text-xs font-medium rounded-none">
              <div className="flex items-center gap-2 truncate">
                <Paperclip size={14} className="text-teal-700 shrink-0" />
                <span className="truncate">{attachedFile.name} ({(attachedFile.size / 1024).toFixed(0)} KB)</span>
              </div>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                className="text-teal-700 hover:text-red-600 p-0.5 cursor-pointer ml-2"
                title="Hapus lampiran"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="flex items-center border border-slate-300 focus-within:border-teal-700 bg-slate-50 transition-colors rounded-none">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="p-3 text-slate-500 hover:text-teal-700 transition-colors cursor-pointer border-r border-slate-200"
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
                  ? 'Ketik instruksi revisi (misal: "Ganti warna jadi navy gold", "Perbesar visual peta", "Tonjolkan realisasi PAD")...'
                  : 'Ketik topik infografis atau lampirkan dokumen laporan untuk dirangkum...'
              }
              className="flex-1 bg-transparent px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none font-medium"
            />

            <button
              type="submit"
              disabled={isLoading || (!inputPrompt.trim() && !attachedFile)}
              className="px-5 py-3 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 rounded-none shadow-xs"
            >
              <span>{activeSession ? 'Revisi' : 'Kirim'}</span>
              <Send size={13} />
            </button>
          </div>
        </form>

        {/* Contoh Topik Sektoral (Jika sesi baru) */}
        {!activeSession && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
              Contoh Topik:
            </span>
            {quickStarters.map((starter, idx) => {
              const Icon = starter.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInputPrompt(starter.prompt)}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-left transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium text-slate-700 rounded-none"
                >
                  <Icon size={13} className="text-teal-700 shrink-0" />
                  <span>{starter.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Indikator Loading & Error */}
        {isLoading && (
          <div className="flex items-center gap-3 p-3 bg-teal-50 border-l-3 border-teal-600 text-teal-900 text-xs font-semibold animate-pulse rounded-none">
            <Loader2 size={16} className="animate-spin text-teal-700 shrink-0" />
            <span>
              {activeSession
                ? 'Pengarah kreatif sedang merancang revisi & merender infografis baru...'
                : 'Memadukan data database & internet live untuk merender infografis v1...'}
            </span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5 rounded-none">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* ── 3. BAGIAN BAWAH: WORKSPACE (RIWAYAT KIRI + PANGGUNG KANAN) ── */}
      <div className="flex flex-col lg:flex-row gap-0 w-full min-h-[850px] lg:min-h-[950px] border border-slate-300 bg-white shadow-2xs rounded-none text-left">
        {/* Sidebar Riwayat Sesi & Versi */}
        {isSidebarOpen && (
          <div className="w-full lg:w-80 bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-300 flex flex-col shrink-0 rounded-none text-left">
            {/* Search Bar Sesi */}
            <div className="p-3 border-b border-slate-200 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <History size={13} className="text-teal-700" />
                  <span>Riwayat Sesi ({sessions.length})</span>
                </span>
                <button
                  type="button"
                  onClick={handleCreateNewSession}
                  className="p-1 text-slate-600 hover:text-teal-800 cursor-pointer"
                  title="Mulai sesi baru"
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari sesi infografis..."
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-slate-300 focus:outline-none focus:border-teal-700 bg-slate-50 rounded-none font-medium"
                />
              </div>
            </div>

            {/* List Sesi */}
            <div className="flex-1 overflow-y-auto max-h-[850px] divide-y divide-slate-200 custom-scrollbar">
              {filteredSessions.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 italic">
                  Belum ada sesi infografis tersimpan.
                </div>
              ) : (
                filteredSessions.map((sess) => {
                  const isActive = activeSession?.id === sess.id;
                  return (
                    <div
                      key={sess.id}
                      className={`transition-colors rounded-none ${
                        isActive
                          ? 'bg-white border-l-4 border-teal-700 shadow-2xs'
                          : 'hover:bg-slate-100/70'
                      }`}
                    >
                      <div
                        onClick={() => handleSelectSession(sess.id)}
                        className="p-3.5 cursor-pointer space-y-1"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className={`text-xs truncate ${isActive ? 'font-bold text-teal-950' : 'font-semibold text-slate-800'}`}>
                            {sess.title}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSession(e, sess.id)}
                            className="text-slate-400 hover:text-red-600 p-0.5 shrink-0 cursor-pointer"
                            title="Hapus sesi"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center justify-between font-medium">
                          <span>{sess.totalVersions} Versi Revisi</span>
                          <span className="font-mono">{new Date(sess.updatedAt).toLocaleDateString('id-ID')}</span>
                        </div>
                      </div>

                      {/* Jika sesi ini aktif: tampilkan kartu tiap versi dengan tombol "Tampilkan" */}
                      {isActive && activePosters.length > 0 && (
                        <div className="px-3 pb-3 pt-1 border-t border-slate-100 space-y-2 bg-slate-50/50">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                            Daftar Versi Poster:
                          </span>
                          <div className="space-y-1.5">
                            {activePosters.map((poster) => {
                              const isPosterActive = activePoster?.id === poster.id;
                              return (
                                <div
                                  key={poster.id}
                                  className={`p-2 border text-xs transition-colors flex items-center justify-between gap-2 rounded-none ${
                                    isPosterActive
                                      ? 'bg-white border-teal-600 shadow-2xs'
                                      : 'bg-slate-50 border-slate-200 hover:bg-white'
                                  }`}
                                >
                                  <div className="min-w-0 space-y-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-[11px] text-slate-900">
                                        Versi {poster.versionNumber}
                                      </span>
                                      {isPosterActive && (
                                        <span className="text-[9px] text-teal-700 font-bold flex items-center gap-0.5">
                                          <Check size={10} />
                                          <span>Aktif</span>
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 truncate max-w-[140px]">
                                      {poster.userPrompt || 'Instruksi awal'}
                                    </p>
                                  </div>

                                  {/* Tombol ringkas "Tampilkan" sesuai instruksi pengguna */}
                                  <button
                                    type="button"
                                    onClick={() => setActivePoster(poster)}
                                    className={`px-2.5 py-1 text-[10px] font-bold uppercase transition-colors cursor-pointer rounded-none border shrink-0 ${
                                      isPosterActive
                                        ? 'bg-teal-700 border-teal-800 text-white'
                                        : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                                    }`}
                                  >
                                    Tampilkan
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Panggung Showcase Infografis */}
        <div className="flex-1 flex flex-col bg-slate-950 min-h-[850px] lg:min-h-[950px]">
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
