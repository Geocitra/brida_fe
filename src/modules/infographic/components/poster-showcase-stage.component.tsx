import React, { useState } from 'react';
import {
  Download,
  Maximize2,
  ExternalLink,
  History,
  Layers,
  X,
  Sparkles,
  Loader2,
} from 'lucide-react';
import type {
  InfographicPosterItem,
  InfographicSessionDetail,
} from '../services/infographic.api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface PosterShowcaseStageProps {
  session: InfographicSessionDetail | null;
  activePoster: InfographicPosterItem | null;
  onSelectVersion: (poster: InfographicPosterItem) => void;
  isGenerating: boolean;
}

const generateCleanDownloadFilename = (title: string, versionNumber: number): string => {
  const cleanTitle = (title || 'Infografis')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .substring(0, 50);

  return `Infografis_BRIDA_${cleanTitle}_v${versionNumber}.png`;
};

export const PosterShowcaseStage: React.FC<PosterShowcaseStageProps> = ({
  session,
  activePoster,
  onSelectVersion,
  isGenerating,
}) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  if (!session || !activePoster) {
    return (
      <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center p-8 text-center select-none rounded-none text-slate-400">
        <div className="w-14 h-14 bg-slate-800/80 border border-slate-700 text-teal-400 flex items-center justify-center mb-4 rounded-none">
          <Layers size={26} />
        </div>
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Panggung Kreatif Infografis
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mt-2 leading-relaxed">
          Ketik topik infografis pada panel dialog untuk memulai perancangan visual resmi BRIDA Kabupaten Mimika.
        </p>
      </div>
    );
  }

  const posters = session.posters || [];
  const fullImageUrl = activePoster.imageUrl.startsWith('http')
    ? activePoster.imageUrl
    : `${API_BASE_URL}${activePoster.imageUrl}`;

  const handleDownloadImage = async () => {
    if (!activePoster || isDownloading) return;
    setIsDownloading(true);

    const downloadFilename = generateCleanDownloadFilename(
      session?.title || 'Infografis',
      activePoster.versionNumber,
    );

    try {
      // 1. Ambil berkas biner gambar via fetch CORS
      const response = await fetch(fullImageUrl, {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Gagal mengambil berkas infografis`);
      }

      const blob = await response.blob();
      const pngBlob = blob.type === 'image/png' ? blob : new Blob([blob], { type: 'image/png' });
      const objectUrl = window.URL.createObjectURL(pngBlob);

      // 2. Trigger unduhan melalui Object URL (same-origin sehingga atribut download 100% dipatuhi oleh browser)
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        window.URL.revokeObjectURL(objectUrl);
      }, 2000);
    } catch (err) {
      console.warn('Pengunduhan via Blob gagal, mengalihkan ke endpoint server resmi:', err);
      // Fallback: gunakan endpoint unduhan server dengan Content-Disposition attachment
      const serverDownloadUrl = `${API_BASE_URL}/infographic/agent/posters/${activePoster.id}/download`;
      const fallbackLink = document.createElement('a');
      fallbackLink.href = serverDownloadUrl;
      fallbackLink.setAttribute('download', downloadFilename);
      document.body.appendChild(fallbackLink);
      fallbackLink.click();
      document.body.removeChild(fallbackLink);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 rounded-none font-roboto overflow-hidden select-none">
      {/* ── TOOLBAR PANGGUNG SEAMLESS (FLAT & MINIMALIS) ── */}
      <div className="px-3 sm:px-6 py-2.5 sm:py-3.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 sm:gap-4 shrink-0 rounded-none z-10">
        {/* Info Sesi & Indikator */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-2 h-2 bg-teal-400 shrink-0" />
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider truncate max-w-[200px] sm:max-w-md">
              {session.title}
            </h2>
            <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5">
              <span>Rasio {activePoster.aspectRatio}</span>
              <span>&bull;</span>
              <span>Versi {activePoster.versionNumber} dari {posters.length}</span>
            </div>
          </div>
        </div>

        {/* Iterasi Versi Switcher (Tampil jika ada > 1 versi) */}
        {posters.length > 1 && (
          <div className="flex items-center gap-1 bg-slate-950 p-1 border border-slate-800 rounded-none overflow-x-auto max-w-full">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1.5 flex items-center gap-1 shrink-0">
              <History size={11} className="text-teal-400" />
              <span>Versi:</span>
            </span>
            {posters.map((poster) => {
              const isActive = poster.versionNumber === activePoster.versionNumber;
              return (
                <button
                  key={poster.id}
                  type="button"
                  onClick={() => onSelectVersion(poster)}
                  className={`px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] font-bold uppercase transition-all cursor-pointer rounded-none shrink-0 ${
                    isActive
                      ? 'bg-teal-600 text-white font-black'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  v{poster.versionNumber}
                </button>
              );
            })}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto sm:ml-0">
          <button
            type="button"
            onClick={() => setIsLightboxOpen(true)}
            className="p-1.5 sm:p-2 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border border-slate-700 cursor-pointer rounded-none"
            title="Perbesar Layar Penuh"
          >
            <Maximize2 size={13} />
          </button>

          <a
            href={fullImageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 sm:p-2 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border border-slate-700 rounded-none"
            title="Buka di Tab Baru"
          >
            <ExternalLink size={13} />
          </a>

          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={isDownloading}
            className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 disabled:cursor-not-allowed text-white font-bold text-[11px] sm:text-xs uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors cursor-pointer rounded-none shadow-sm"
            title="Unduh berkas gambar PNG ke komputer"
          >
            {isDownloading ? (
              <>
                <Loader2 size={12} className="animate-spin text-teal-200" />
                <span className="hidden sm:inline">Mengunduh...</span>
              </>
            ) : (
              <>
                <Download size={12} />
                <span>Unduh PNG</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── AREA KANVAS POSTER IMMERSIVE (EDGE-TO-EDGE, NO NESTED CARDS) ── */}
      <div className="flex-1 overflow-auto p-3 sm:p-6 lg:p-10 flex items-center justify-center custom-scrollbar relative bg-slate-950">
        {isGenerating && (
          <div className="absolute inset-0 z-20 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-3 select-none rounded-none">
            <div className="w-9 h-9 border-3 border-teal-400 border-t-transparent animate-spin rounded-none" />
            <span className="text-xs font-bold uppercase tracking-widest text-teal-300">
              Merender Versi Revisi Berikutnya...
            </span>
          </div>
        )}

        {/* Kanvas Poster (Fokus Utama, Berdiri Sendiri Tanpa Card Bertingkat) */}
        <div
          className={`relative shadow-2xl shadow-black overflow-hidden transition-all duration-300 rounded-none ${
            activePoster.aspectRatio === '9:16'
              ? 'max-w-[430px] aspect-[9/16]'
              : activePoster.aspectRatio === '3:4'
              ? 'max-w-[490px] aspect-[3/4]'
              : activePoster.aspectRatio === '1:1'
              ? 'max-w-[540px] aspect-square'
              : activePoster.aspectRatio === '4:3'
              ? 'max-w-[650px] aspect-[4/3]'
              : 'max-w-[760px] aspect-[16/9]'
          } w-full`}
        >
          <img
            src={fullImageUrl}
            alt={session.title}
            className="w-full h-full object-contain select-none rounded-none"
            loading="lazy"
          />
        </div>
      </div>

      {/* ── MODAL LIGHTBOX FULLSCREEN ZOOM ── */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 sm:p-8 rounded-none">
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-6 right-6 p-2 bg-slate-800 text-white hover:bg-slate-700 transition-colors cursor-pointer rounded-none"
            title="Tutup (Esc)"
          >
            <X size={20} />
          </button>

          <div className="max-w-4xl max-h-[85vh] flex items-center justify-center overflow-auto rounded-none">
            <img
              src={fullImageUrl}
              alt={session.title}
              className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-none"
            />
          </div>

          <div className="mt-4 flex items-center gap-4 text-white text-xs font-semibold">
            <span>{session.title} &bull; Versi {activePoster.versionNumber}</span>
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isDownloading}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 disabled:cursor-not-allowed text-white uppercase text-[11px] font-bold tracking-wider inline-flex items-center gap-1.5 rounded-none cursor-pointer"
            >
              {isDownloading ? (
                <>
                  <Loader2 size={12} className="animate-spin text-teal-200" />
                  <span>Mengunduh...</span>
                </>
              ) : (
                <>
                  <Download size={12} />
                  <span>Simpan ke Komputer</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
