import React, { useState } from 'react';
import {
  Download,
  Maximize2,
  Layers,
  X,
  Loader2,
  ZoomIn,
  ZoomOut,
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
  const [zoom, setZoom] = useState<number>(100);

  if (!session || !activePoster) {
    return (
      <div className="w-full h-full min-h-[500px] lg:min-h-[700px] bg-slate-900 flex flex-col items-center justify-center p-8 text-center select-none rounded-none text-slate-400">
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

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 20, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 20, 60));
  };

  const handleResetZoom = () => {
    setZoom(100);
  };

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
    <div className="relative w-full h-full min-h-[750px] lg:min-h-[900px] bg-slate-950 flex flex-col items-center justify-center select-none font-roboto rounded-none">
      {/* ── SEAMLESS CONTROLS: KANAN ATAS (AKSI & VERSI) ── */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex flex-wrap items-center gap-1.5 sm:gap-2">
        {/* Iterasi Versi Switcher (Tampil jika ada > 1 versi) */}
        {posters.length > 1 && (
          <div className="flex items-center gap-1">
            {posters.map((poster) => {
              const isActive = poster.versionNumber === activePoster.versionNumber;
              return (
                <button
                  key={poster.id}
                  type="button"
                  onClick={() => onSelectVersion(poster)}
                  className={`px-2.5 py-1.5 text-xs font-bold uppercase transition-colors cursor-pointer rounded-none border ${
                    isActive
                      ? 'bg-teal-700 border-teal-600 text-white'
                      : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                  title={`Versi ${poster.versionNumber}`}
                >
                  v{poster.versionNumber}
                </button>
              );
            })}
          </div>
        )}

        {/* Kontrol Skala Ukuran Gambar (Zoom In / Zoom Out) */}
        <div className="flex items-center bg-slate-900/90 border border-slate-700 text-slate-300 rounded-none">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 60}
            className="p-1.5 sm:p-2 hover:text-white hover:bg-slate-800 disabled:opacity-35 disabled:hover:bg-transparent cursor-pointer transition-colors"
            title="Perkecil Gambar (-20%)"
          >
            <ZoomOut size={14} />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="px-2 py-1 text-[11px] font-bold font-mono hover:text-teal-300 cursor-pointer"
            title="Reset Ukuran Standar (100%)"
          >
            {zoom}%
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= 200}
            className="p-1.5 sm:p-2 hover:text-white hover:bg-slate-800 disabled:opacity-35 disabled:hover:bg-transparent cursor-pointer transition-colors"
            title="Perbesar Gambar (+20%)"
          >
            <ZoomIn size={14} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsLightboxOpen(true)}
          className="p-2 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer rounded-none"
          title="Pratinjau Layar Penuh"
        >
          <Maximize2 size={15} />
        </button>

        <button
          type="button"
          onClick={handleDownloadImage}
          disabled={isDownloading}
          className="px-3.5 sm:px-4 py-2 bg-teal-700 hover:bg-teal-600 disabled:bg-teal-900 border border-teal-600 text-white font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors cursor-pointer rounded-none shadow-sm"
          title="Unduh berkas PNG ke komputer"
        >
          {isDownloading ? (
            <>
              <Loader2 size={13} className="animate-spin text-teal-200" />
              <span className="hidden sm:inline">Mengunduh...</span>
            </>
          ) : (
            <>
              <Download size={13} />
              <span>Unduh PNG</span>
            </>
          )}
        </button>
      </div>

      {/* ── LOADING REVISI OVERLAY ── */}
      {isGenerating && (
        <div className="absolute inset-0 z-30 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-3 select-none rounded-none">
          <div className="w-9 h-9 border-3 border-teal-400 border-t-transparent animate-spin rounded-none" />
          <span className="text-xs font-bold uppercase tracking-widest text-teal-300">
            Merender Versi Revisi Berikutnya...
          </span>
        </div>
      )}

      {/* ── KANVAS UTAMA FULL LEBAR LEGA (UKURAN PROMINEN & RESPONSIF ZOOM) ── */}
      <div className="w-full min-h-[750px] lg:min-h-[900px] pt-18 pb-12 px-4 sm:px-8 md:px-12 flex items-center justify-center overflow-x-auto">
        <img
          src={fullImageUrl}
          alt={session.title || 'Infografis BRIDA Mimika'}
          style={{ maxWidth: `${Math.round(860 * (zoom / 100))}px` }}
          className="w-full h-auto object-contain shadow-2xl drop-shadow-2xl rounded-none select-none transition-all duration-200"
          loading="lazy"
        />
      </div>

      {/* ── MODAL LIGHTBOX FULLSCREEN ZOOM ── */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 rounded-none">
          {/* Header Controls Lightbox */}
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2 z-10">
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isDownloading}
              className="px-3 sm:px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 text-white uppercase text-xs font-bold tracking-wider inline-flex items-center gap-1.5 rounded-none cursor-pointer shadow-md"
            >
              {isDownloading ? <Loader2 size={13} className="animate-spin text-teal-200" /> : <Download size={13} />}
              <span>Unduh PNG</span>
            </button>
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer rounded-none"
              title="Tutup (Esc)"
            >
              <X size={18} />
            </button>
          </div>

          <div className="w-full h-full flex items-center justify-center p-2 sm:p-6 overflow-hidden">
            <img
              src={fullImageUrl}
              alt={session.title}
              className="max-w-full max-h-[92vh] object-contain shadow-2xl rounded-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};
