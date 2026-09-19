import React, { useRef } from 'react';
import {
  Upload,
  Trash2,
  Check,
  RotateCcw,
  X,
  Loader2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Building2,
  FileText,
  Type,
  Image,
  Layout,
} from 'lucide-react';
import type { PosterBrandingData } from '../types/poster-branding.types';
import { BRANDING_COLOR_PRESETS } from '../types/poster-branding.types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface PosterBrandingBarProps {
  branding: PosterBrandingData;
  onChange: (updated: PosterBrandingData) => void;
  onUploadLogo: (file: File) => Promise<void>;
  onDeleteLogo: () => Promise<void>;
  onReset: () => void;
  onClose?: () => void;
  isSaving: boolean;
  isUploadingLogo: boolean;
}

export const PosterBrandingBar: React.FC<PosterBrandingBarProps> = ({
  branding,
  onChange,
  onUploadLogo,
  onDeleteLogo,
  onReset,
  onClose,
  isSaving,
  isUploadingLogo,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleHeaderToggle = (enabled: boolean) => {
    onChange({ ...branding, headerEnabled: enabled });
  };

  const handleFooterToggle = (enabled: boolean) => {
    onChange({ ...branding, footerEnabled: enabled });
  };

  const handleInstitutionChange = (val: string) => {
    onChange({ ...branding, institution: val });
  };

  const handleSubInstitutionChange = (val: string) => {
    onChange({ ...branding, subInstitution: val });
  };

  const handleFooterTextChange = (val: string) => {
    onChange({ ...branding, footerText: val });
  };

  const handleHeaderBgColor = (hex: string) => {
    onChange({
      ...branding,
      layoutConfig: {
        ...(branding.layoutConfig || {}),
        headerBgColor: hex,
      },
    });
  };

  const handleFooterBgColor = (hex: string) => {
    onChange({
      ...branding,
      layoutConfig: {
        ...(branding.layoutConfig || {}),
        footerBgColor: hex,
      },
    });
  };

  const handleLogoPosition = (position: 'left' | 'right' | 'center') => {
    onChange({
      ...branding,
      layoutConfig: {
        ...(branding.layoutConfig || {}),
        logoPosition: position,
        headerAlignment: position === 'center' ? 'center' : 'left_with_logo',
      },
    });
  };

  const handleLogoSize = (size: 'compact' | 'normal' | 'large') => {
    onChange({
      ...branding,
      layoutConfig: {
        ...(branding.layoutConfig || {}),
        logoSize: size,
      },
    });
  };

  const handleHeaderFontSize = (size: 'compact' | 'normal' | 'large') => {
    onChange({
      ...branding,
      layoutConfig: {
        ...(branding.layoutConfig || {}),
        headerFontSize: size,
      },
    });
  };

  const handleFooterFontSize = (size: 'compact' | 'normal' | 'large') => {
    onChange({
      ...branding,
      layoutConfig: {
        ...(branding.layoutConfig || {}),
        footerFontSize: size,
      },
    });
  };

  const handleFooterAlignment = (alignment: 'center' | 'left' | 'right') => {
    onChange({
      ...branding,
      layoutConfig: {
        ...(branding.layoutConfig || {}),
        footerAlignment: alignment,
      },
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadLogo(file);
    }
  };

  const currentHeaderBg = branding.layoutConfig?.headerBgColor || '#FFFFFF';
  const currentFooterBg = branding.layoutConfig?.footerBgColor || '#0F1E36';
  const currentLogoPosition = branding.layoutConfig?.logoPosition || (branding.layoutConfig?.headerAlignment === 'center' ? 'center' : 'left');
  const currentLogoSize = branding.layoutConfig?.logoSize || 'normal';
  const currentHeaderFontSize = branding.layoutConfig?.headerFontSize || 'normal';
  const currentFooterFontSize = branding.layoutConfig?.footerFontSize || 'normal';
  const currentFooterAlignment = branding.layoutConfig?.footerAlignment || 'center';

  const fullLogoUrl = branding.logoUrl
    ? branding.logoUrl.startsWith('http')
      ? branding.logoUrl
      : `${API_BASE_URL}${branding.logoUrl}`
    : null;

  return (
    <div className="w-full bg-slate-900/98 backdrop-blur-md border border-slate-700 shadow-2xl text-slate-200 font-roboto rounded-none select-none p-4 sm:p-6 space-y-5">
      {/* ── BARIS JUDUL PANEL & STATUS ── */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 bg-teal-500 rounded-none flex-shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            Pengaturan Kop & Footer Resmi
          </h3>
        </div>

        <div className="flex items-center gap-3">
          {isSaving ? (
            <span className="text-[11px] text-teal-400 font-medium inline-flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin" />
              <span className="hidden sm:inline">Menyimpan...</span>
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 font-medium inline-flex items-center gap-1">
              <Check size={12} className="text-teal-400" />
              <span className="hidden sm:inline">Tersimpan</span>
            </span>
          )}

          <button
            type="button"
            onClick={onReset}
            className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-none cursor-pointer transition-colors inline-flex items-center gap-1"
            title="Reset ke pengaturan default"
          >
            <RotateCcw size={11} />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 rounded-none cursor-pointer transition-colors"
              title="Tutup Panel"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* ── SECTION 1: KOP SURAT / HEADER RESMI ── */}
      <div
        className={`p-4 sm:p-5 border transition-all rounded-none ${
          branding.headerEnabled
            ? 'bg-slate-950/70 border-teal-800/80 shadow-inner'
            : 'bg-slate-950/30 border-slate-800 opacity-60'
        }`}
      >
        {/* Header Section Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={branding.headerEnabled}
              onChange={(e) => handleHeaderToggle(e.target.checked)}
              className="w-4 h-4 accent-teal-600 rounded-none cursor-pointer"
            />
            <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <Building2 size={13} className="text-teal-400" />
              <span>Kop / Header Instansi</span>
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-wider rounded-none ${
                branding.headerEnabled
                  ? 'bg-teal-950 text-teal-300 border border-teal-700'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {branding.headerEnabled ? 'Aktif' : 'Nonaktif'}
            </span>
          </label>

          {/* Color Presets */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Warna:
            </span>
            <div className="flex items-center gap-1">
              {BRANDING_COLOR_PRESETS.map((preset) => {
                const isSelected = currentHeaderBg.toLowerCase() === preset.hex.toLowerCase();
                return (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => handleHeaderBgColor(preset.hex)}
                    disabled={!branding.headerEnabled}
                    style={{ backgroundColor: preset.hex }}
                    className={`w-5 h-5 border rounded-none cursor-pointer transition-all disabled:opacity-30 ${
                      isSelected
                        ? 'border-teal-400 ring-2 ring-teal-400/40 scale-105'
                        : 'border-slate-700 hover:border-slate-500'
                    }`}
                    title={`${preset.label} (${preset.hex})`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Header Dynamic Sub-bar: Posisi Logo, Ukuran Logo, Ukuran Font */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 pb-3 border-b border-slate-800/60">
          {/* Posisi Logo */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
              <Layout size={11} className="text-teal-400" />
              <span>Posisi Logo:</span>
            </span>
            <div className="flex items-center border border-slate-700 rounded-none bg-slate-900 p-0.5">
              {(['left', 'center', 'right'] as const).map((pos) => {
                const labels = { left: 'Kiri', center: 'Tengah', right: 'Kanan' };
                const isSelected = currentLogoPosition === pos;
                return (
                  <button
                    key={pos}
                    type="button"
                    disabled={!branding.headerEnabled}
                    onClick={() => handleLogoPosition(pos)}
                    className={`px-2 py-1 text-[10px] font-bold uppercase cursor-pointer rounded-none transition-colors ${
                      isSelected
                        ? 'bg-teal-700 text-white'
                        : 'text-slate-400 hover:text-white disabled:opacity-40'
                    }`}
                  >
                    {labels[pos]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ukuran Logo */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
              <Image size={11} className="text-teal-400" />
              <span>Ukuran Logo:</span>
            </span>
            <div className="flex items-center border border-slate-700 rounded-none bg-slate-900 p-0.5">
              {(['compact', 'normal', 'large'] as const).map((sz) => {
                const labels = { compact: 'S', normal: 'M', large: 'L' };
                const isSelected = currentLogoSize === sz;
                return (
                  <button
                    key={sz}
                    type="button"
                    disabled={!branding.headerEnabled}
                    onClick={() => handleLogoSize(sz)}
                    className={`w-6 py-1 text-[10px] font-bold text-center uppercase cursor-pointer rounded-none transition-colors ${
                      isSelected
                        ? 'bg-teal-700 text-white'
                        : 'text-slate-400 hover:text-white disabled:opacity-40'
                    }`}
                    title={`Ukuran Logo ${labels[sz]}`}
                  >
                    {labels[sz]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ukuran Font Header */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
              <Type size={11} className="text-teal-400" />
              <span>Ukuran Teks:</span>
            </span>
            <div className="flex items-center border border-slate-700 rounded-none bg-slate-900 p-0.5">
              {(['compact', 'normal', 'large'] as const).map((sz) => {
                const labels = { compact: 'Kecil', normal: 'Sedang', large: 'Besar' };
                const isSelected = currentHeaderFontSize === sz;
                return (
                  <button
                    key={sz}
                    type="button"
                    disabled={!branding.headerEnabled}
                    onClick={() => handleHeaderFontSize(sz)}
                    className={`px-2 py-1 text-[10px] font-bold uppercase cursor-pointer rounded-none transition-colors ${
                      isSelected
                        ? 'bg-teal-700 text-white'
                        : 'text-slate-400 hover:text-white disabled:opacity-40'
                    }`}
                  >
                    {labels[sz]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Header Form: Logo & Text Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-3.5 items-start">
          {/* Logo Uploader (Kolom 4/12) */}
          <div className="md:col-span-4">
            <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
              Lambang / Logo Daerah:
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png,image/jpeg"
              className="hidden"
            />
            {fullLogoUrl ? (
              <div className="flex items-center justify-between bg-slate-900 border border-slate-700 p-2 rounded-none">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={fullLogoUrl}
                    alt="Logo preview"
                    className="w-7 h-7 object-contain rounded-none flex-shrink-0 bg-black/30 p-0.5"
                  />
                  <span className="text-xs text-slate-200 font-medium truncate">
                    Logo Terpasang
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!branding.headerEnabled || isUploadingLogo}
                    className="text-[10px] font-bold text-teal-400 hover:text-teal-300 px-1.5 py-0.5 cursor-pointer uppercase tracking-wider"
                    title="Ganti Logo"
                  >
                    Ubah
                  </button>
                  <button
                    type="button"
                    onClick={onDeleteLogo}
                    disabled={!branding.headerEnabled}
                    className="text-slate-400 hover:text-red-400 p-1 transition-colors cursor-pointer"
                    title="Hapus Logo"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!branding.headerEnabled || isUploadingLogo}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-dashed border-slate-700 text-slate-300 text-xs font-medium inline-flex items-center justify-center gap-2 rounded-none cursor-pointer transition-colors"
              >
                {isUploadingLogo ? (
                  <Loader2 size={13} className="animate-spin text-teal-400" />
                ) : (
                  <Upload size={13} className="text-teal-400" />
                )}
                <span>Unggah File Logo</span>
              </button>
            )}
          </div>

          {/* Text Inputs (Kolom 8/12 - Lega & Leluasa) */}
          <div className="md:col-span-8 space-y-2.5">
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                Instansi / Pemerintah Daerah (Baris 1):
              </label>
              <input
                type="text"
                value={branding.institution || ''}
                onChange={(e) => handleInstitutionChange(e.target.value)}
                disabled={!branding.headerEnabled}
                placeholder="misal: PEMERINTAH KABUPATEN MIMIKA"
                className="w-full bg-slate-900 border border-slate-700 disabled:opacity-40 text-white text-xs px-3 py-2 outline-hidden focus:border-teal-500 rounded-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                Sub-Instansi / OPD / Badan (Baris 2):
              </label>
              <input
                type="text"
                value={branding.subInstitution || ''}
                onChange={(e) => handleSubInstitutionChange(e.target.value)}
                disabled={!branding.headerEnabled}
                placeholder="misal: Badan Riset dan Inovasi Daerah"
                className="w-full bg-slate-900 border border-slate-700 disabled:opacity-40 text-white text-xs px-3 py-2 outline-hidden focus:border-teal-500 rounded-none transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: CATATAN KAKI / FOOTER RESMI ── */}
      <div
        className={`p-4 sm:p-5 border transition-all rounded-none ${
          branding.footerEnabled
            ? 'bg-slate-950/70 border-teal-800/80 shadow-inner'
            : 'bg-slate-950/30 border-slate-800 opacity-60'
        }`}
      >
        {/* Footer Section Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={branding.footerEnabled}
              onChange={(e) => handleFooterToggle(e.target.checked)}
              className="w-4 h-4 accent-teal-600 rounded-none cursor-pointer"
            />
            <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <FileText size={13} className="text-teal-400" />
              <span>Catatan Kaki / Footer</span>
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-wider rounded-none ${
                branding.footerEnabled
                  ? 'bg-teal-950 text-teal-300 border border-teal-700'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {branding.footerEnabled ? 'Aktif' : 'Nonaktif'}
            </span>
          </label>

          {/* Color Presets */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Warna:
            </span>
            <div className="flex items-center gap-1">
              {BRANDING_COLOR_PRESETS.map((preset) => {
                const isSelected = currentFooterBg.toLowerCase() === preset.hex.toLowerCase();
                return (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => handleFooterBgColor(preset.hex)}
                    disabled={!branding.footerEnabled}
                    style={{ backgroundColor: preset.hex }}
                    className={`w-5 h-5 border rounded-none cursor-pointer transition-all disabled:opacity-30 ${
                      isSelected
                        ? 'border-teal-400 ring-2 ring-teal-400/40 scale-105'
                        : 'border-slate-700 hover:border-slate-500'
                    }`}
                    title={`${preset.label} (${preset.hex})`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Dynamic Sub-bar: Perataan Teks & Ukuran Font */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 pb-3 border-b border-slate-800/60">
          {/* Perataan Teks Footer */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
              <AlignLeft size={11} className="text-teal-400" />
              <span>Perataan Teks:</span>
            </span>
            <div className="flex items-center border border-slate-700 rounded-none bg-slate-900 p-0.5">
              <button
                type="button"
                disabled={!branding.footerEnabled}
                onClick={() => handleFooterAlignment('left')}
                className={`px-2 py-1 text-[10px] font-bold uppercase cursor-pointer rounded-none transition-colors inline-flex items-center gap-1 ${
                  currentFooterAlignment === 'left'
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-400 hover:text-white disabled:opacity-40'
                }`}
                title="Rata Kiri"
              >
                <AlignLeft size={11} />
                <span>Kiri</span>
              </button>
              <button
                type="button"
                disabled={!branding.footerEnabled}
                onClick={() => handleFooterAlignment('center')}
                className={`px-2 py-1 text-[10px] font-bold uppercase cursor-pointer rounded-none transition-colors inline-flex items-center gap-1 ${
                  currentFooterAlignment === 'center'
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-400 hover:text-white disabled:opacity-40'
                }`}
                title="Rata Tengah"
              >
                <AlignCenter size={11} />
                <span>Tengah</span>
              </button>
              <button
                type="button"
                disabled={!branding.footerEnabled}
                onClick={() => handleFooterAlignment('right')}
                className={`px-2 py-1 text-[10px] font-bold uppercase cursor-pointer rounded-none transition-colors inline-flex items-center gap-1 ${
                  currentFooterAlignment === 'right'
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-400 hover:text-white disabled:opacity-40'
                }`}
                title="Rata Kanan"
              >
                <AlignRight size={11} />
                <span>Kanan</span>
              </button>
            </div>
          </div>

          {/* Ukuran Font Footer */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
              <Type size={11} className="text-teal-400" />
              <span>Ukuran Teks:</span>
            </span>
            <div className="flex items-center border border-slate-700 rounded-none bg-slate-900 p-0.5">
              {(['compact', 'normal', 'large'] as const).map((sz) => {
                const labels = { compact: 'Kecil', normal: 'Sedang', large: 'Besar' };
                const isSelected = currentFooterFontSize === sz;
                return (
                  <button
                    key={sz}
                    type="button"
                    disabled={!branding.footerEnabled}
                    onClick={() => handleFooterFontSize(sz)}
                    className={`px-2 py-1 text-[10px] font-bold uppercase cursor-pointer rounded-none transition-colors ${
                      isSelected
                        ? 'bg-teal-700 text-white'
                        : 'text-slate-400 hover:text-white disabled:opacity-40'
                    }`}
                  >
                    {labels[sz]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Form: Text Input Lega Full Width */}
        <div className="pt-3.5">
          <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
            Teks Catatan Kaki / Atribusi Sumber Data:
          </label>
          <input
            type="text"
            value={branding.footerText || ''}
            onChange={(e) => handleFooterTextChange(e.target.value)}
            disabled={!branding.footerEnabled}
            placeholder="misal: Sumber: Dokumen Resmi BRIDA Kabupaten Mimika | BPS 2024"
            className="w-full bg-slate-900 border border-slate-700 disabled:opacity-40 text-white text-xs px-3 py-2 outline-hidden focus:border-teal-500 rounded-none transition-colors"
          />
        </div>
      </div>
    </div>
  );
};
