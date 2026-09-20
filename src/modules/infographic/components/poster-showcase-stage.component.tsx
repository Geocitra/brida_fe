import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  Maximize2,
  Layers,
  X,
  Loader2,
  ZoomIn,
  ZoomOut,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { InfographicApi } from '../services/infographic.api';
import type {
  InfographicPosterItem,
  InfographicSessionDetail,
} from '../services/infographic.api';
import type { PosterBrandingData } from '../types/poster-branding.types';
import { PosterBrandingBar } from './poster-branding-bar.component';
import { PosterBrandingOverlay } from './poster-branding-overlay.component';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface PosterShowcaseStageProps {
  session: InfographicSessionDetail | null;
  activePoster: InfographicPosterItem | null;
  onSelectVersion: (poster: InfographicPosterItem) => void;
  isGenerating: boolean;
}

const DEFAULT_BRANDING: (posterId: string) => PosterBrandingData = (posterId) => ({
  posterId,
  headerEnabled: false,
  logoUrl: null,
  institution: 'PEMERINTAH KABUPATEN MIMIKA',
  subInstitution: 'Badan Riset dan Inovasi Daerah',
  footerEnabled: false,
  footerText: 'Sumber: Dokumen Resmi BRIDA Kabupaten Mimika',
  layoutConfig: {
    headerBgColor: '#FFFFFF',
    headerTextColor: '#0F1E36',
    headerAlignment: 'left_with_logo',
    footerBgColor: '#0F1E36',
    footerTextColor: '#F8FAFC',
    footerAlignment: 'center',
    headerFontSize: 'normal',
    footerFontSize: 'normal',
    logoPosition: 'left',
    logoSize: 'normal',
  },
  composedUrl: null,
  brandingHash: null,
});

const generateCleanDownloadFilename = (
  title: string,
  versionNumber: number,
  isBranded: boolean,
): string => {
  const cleanTitle = (title || 'Infografis')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .substring(0, 50);

  const suffix = isBranded ? '_Resmi' : '';
  return `Infografis_BRIDA_${cleanTitle}_v${versionNumber}${suffix}.png`;
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
  const [isBrandingOpen, setIsBrandingOpen] = useState<boolean>(false);
  const [brandingData, setBrandingData] = useState<PosterBrandingData | null>(null);
  const [isSavingBranding, setIsSavingBranding] = useState<boolean>(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load branding when activePoster changes
  useEffect(() => {
    if (!activePoster) {
      setBrandingData(null);
      return;
    }

    let isMounted = true;
    const fetchBranding = async () => {
      try {
        const data = await InfographicApi.getBranding(activePoster.id);
        if (isMounted) {
          setBrandingData(data || DEFAULT_BRANDING(activePoster.id));
        }
      } catch (err) {
        console.warn('Gagal memuat branding poster, memakai default:', err);
        if (isMounted) {
          setBrandingData(DEFAULT_BRANDING(activePoster.id));
        }
      }
    };

    fetchBranding();

    return () => {
      isMounted = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [activePoster?.id]);

  const handleBrandingChange = (updated: PosterBrandingData) => {
    setBrandingData(updated);

    if (!activePoster) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setIsSavingBranding(true);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await InfographicApi.saveBranding(activePoster.id, updated);
      } catch (err) {
        console.error('Gagal menyimpan branding:', err);
      } finally {
        setIsSavingBranding(false);
      }
    }, 600);
  };

  const handleHeaderHeightPercentChange = (percent: number) => {
    if (!brandingData) return;
    const updated: PosterBrandingData = {
      ...brandingData,
      layoutConfig: {
        ...(brandingData.layoutConfig || {}),
        headerHeightPercent: percent,
      },
    };
    handleBrandingChange(updated);
  };

  const handleUploadLogo = async (file: File) => {
    if (!activePoster) return;
    setIsUploadingLogo(true);
    try {
      const updated = await InfographicApi.uploadBrandingLogo(activePoster.id, file);
      setBrandingData(updated);
    } catch (err: any) {
      alert(err.message || 'Gagal mengunggah logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (!activePoster) return;
    try {
      const updated = await InfographicApi.deleteBrandingLogo(activePoster.id);
      setBrandingData(updated);
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus logo');
    }
  };

  const handleResetBranding = async () => {
    if (!activePoster) return;
    const def = DEFAULT_BRANDING(activePoster.id);
    setBrandingData(def);
    try {
      await InfographicApi.saveBranding(activePoster.id, def);
    } catch (err) {
      console.error('Gagal mereset branding:', err);
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 20, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 20, 60));
  };

  const handleResetZoom = () => {
    setZoom(100);
  };

  if (!session || !activePoster) {
    return (
      <div className="w-full h-full min-h-[500px] lg:min-h-[700px] bg-slate-900 flex flex-col items-center justify-center p-8 text-center select-none rounded-none text-slate-400 font-roboto">
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

  const hasActiveBranding = !!(brandingData?.headerEnabled || brandingData?.footerEnabled);

  const handleDownloadImage = async () => {
    if (!activePoster || isDownloading) return;
    setIsDownloading(true);

    try {
      // 1. Batalkan pending debounce timer dan sinkronkan data branding terkini ke database
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      if (brandingData) {
        await InfographicApi.saveBranding(activePoster.id, brandingData);
      }

      // 2. Hitung status aktif branding berdasarkan data mutakhir
      const isBranded = !!(brandingData?.headerEnabled || brandingData?.footerEnabled);
      const downloadFilename = generateCleanDownloadFilename(
        session?.title || 'Infografis',
        activePoster.versionNumber,
        isBranded,
      );

      // 3. Selalu unduh via endpoint backend authoritative dengan token JWT
      await InfographicApi.downloadPosterFile(
        activePoster.id,
        downloadFilename,
        isBranded,
      );
    } catch (err: any) {
      console.error('Pengunduhan berkas poster gagal:', err);
      alert(err.message || 'Gagal mengunduh berkas poster resmi.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[750px] lg:min-h-[900px] bg-slate-950 flex flex-col items-center justify-center select-none font-roboto rounded-none">
      {/* ── SEAMLESS TOP BAR (NAVIGASI, ZOOM & BRANDING CONTROLS) ── */}
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
        <div className="flex items-center bg-slate-900/90 border border-slate-700 text-slate-300 rounded-none shadow-sm">
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

        {/* Tombol Toggle Panel Kop & Footer */}
        <button
          type="button"
          onClick={() => setIsBrandingOpen((prev) => !prev)}
          className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border rounded-none cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-sm ${
            isBrandingOpen
              ? 'bg-teal-700 border-teal-500 text-white'
              : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
          }`}
          title="Buka / Tutup Pengaturan Header & Footer"
        >
          <SlidersHorizontal size={13} />
          <span className="hidden sm:inline">Kop & Footer</span>
          {hasActiveBranding && !isBrandingOpen && (
            <span className="w-1.5 h-1.5 rounded-none bg-teal-400"></span>
          )}
          {isBrandingOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {/* Tombol Pratinjau Layar Penuh (Lightbox) */}
        <button
          type="button"
          onClick={() => setIsLightboxOpen(true)}
          className="p-2 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer rounded-none shadow-sm"
          title="Pratinjau Layar Penuh"
        >
          <Maximize2 size={15} />
        </button>

        {/* Tombol Unduh PNG Resmi */}
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

      {/* ── MODULAR BRANDING BAR (PENGATURAN DI ATAS FLOATING LEGA) ── */}
      {isBrandingOpen && brandingData && (
        <div className="absolute top-14 left-4 right-4 sm:left-auto sm:right-4 z-30 max-w-3xl w-full shadow-2xl max-h-[calc(100vh-90px)] overflow-y-auto">
          <PosterBrandingBar
            branding={brandingData}
            aspectRatio={activePoster?.aspectRatio || session.aspectRatio}
            onChange={handleBrandingChange}
            onUploadLogo={handleUploadLogo}
            onDeleteLogo={handleDeleteLogo}
            onReset={handleResetBranding}
            onClose={() => setIsBrandingOpen(false)}
            isSaving={isSavingBranding}
            isUploadingLogo={isUploadingLogo}
          />
        </div>
      )}

      {/* ── LOADING REVISI OVERLAY ── */}
      {isGenerating && (
        <div className="absolute inset-0 z-40 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-3 select-none rounded-none">
          <div className="w-9 h-9 border-3 border-teal-400 border-t-transparent animate-spin rounded-none" />
          <span className="text-xs font-bold uppercase tracking-widest text-teal-300">
            Merender Versi Revisi Berikutnya...
          </span>
        </div>
      )}

      {/* ── KANVAS UTAMA FULL LEBAR LEGA (UKURAN PROMINEN & RESPONSIF ZOOM) ── */}
      <div className="w-full min-h-[750px] lg:min-h-[900px] pt-18 pb-12 px-4 sm:px-8 md:px-12 flex items-center justify-center overflow-x-auto">
        <div
          style={{ maxWidth: `${Math.round(860 * (zoom / 100))}px` }}
          className="@container relative w-full flex items-center justify-center shadow-2xl drop-shadow-2xl rounded-none select-none transition-all duration-200"
        >
          <img
            src={fullImageUrl}
            alt={session.title || 'Infografis BRIDA Mimika'}
            className="w-full h-auto object-contain rounded-none select-none block"
            loading="lazy"
          />

          {/* Live Preview Overlay (Header & Footer Adaptif Sinkron) */}
          <PosterBrandingOverlay
            branding={brandingData}
            aspectRatio={activePoster?.aspectRatio || session.aspectRatio}
            onHeaderHeightPercentChange={handleHeaderHeightPercentChange}
          />
        </div>
      </div>

      {/* ── MODAL LIGHTBOX FULLSCREEN ZOOM ── */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 rounded-none">
          {/* Header Controls Lightbox */}
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2 z-20">
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

          <div className="relative w-full h-full flex items-center justify-center p-2 sm:p-6 overflow-hidden">
            <div className="@container relative max-h-[92vh] max-w-full flex items-center justify-center shadow-2xl rounded-none">
              <img
                src={fullImageUrl}
                alt={session.title}
                className="max-w-full max-h-[92vh] object-contain rounded-none block"
              />
              {/* Overlay inside Lightbox */}
              <PosterBrandingOverlay
                branding={brandingData}
                aspectRatio={activePoster?.aspectRatio || session.aspectRatio}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
