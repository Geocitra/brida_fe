import React, { useRef } from 'react';
import {
  Upload,
  Trash2,
  Check,
  RotateCcw,
  Sparkles,
  Loader2,
  AlignLeft,
  AlignCenter,
  AlignRight,
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
  isSaving: boolean;
  isUploadingLogo: boolean;
}

export const PosterBrandingBar: React.FC<PosterBrandingBarProps> = ({
  branding,
  onChange,
  onUploadLogo,
  onDeleteLogo,
  onReset,
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

  const handleHeaderAlignment = (alignment: 'left_with_logo' | 'center') => {
    onChange({
      ...branding,
      layoutConfig: {
        ...(branding.layoutConfig || {}),
        headerAlignment: alignment,
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
  const fullLogoUrl = branding.logoUrl
    ? branding.logoUrl.startsWith('http')
      ? branding.logoUrl
      : `${API_BASE_URL}${branding.logoUrl}`
    : null;

  return (
    <div className="w-full bg-slate-950 border-b border-slate-800 text-slate-200 font-roboto rounded-none select-none transition-all">
      {/* ── MODULAR SECTION 1: HEADER & LOGO CONFIG ── */}
      <div className="p-4 sm:p-5 border-b border-slate-900 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Toggle & Logo */}
        <div className="lg:col-span-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={branding.headerEnabled}
              onChange={(e) => handleHeaderToggle(e.target.checked)}
              className="w-4 h-4 accent-teal-600 rounded-none cursor-pointer"
            />
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
              Kop / Header
            </span>
          </label>

          {/* Upload Logo Button */}
          <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png,image/jpeg"
              className="hidden"
            />
            {fullLogoUrl ? (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-2 py-1 rounded-none">
                <img
                  src={fullLogoUrl}
                  alt="Logo preview"
                  className="w-5 h-5 object-contain rounded-none"
                />
                <span className="text-[11px] text-slate-300 truncate max-w-[90px]">Logo Terpasang</span>
                <button
                  type="button"
                  onClick={onDeleteLogo}
                  className="text-slate-400 hover:text-red-400 p-0.5 transition-colors cursor-pointer"
                  title="Hapus Logo"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingLogo}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-950 border border-slate-700 text-slate-300 text-xs font-medium inline-flex items-center gap-1.5 rounded-none cursor-pointer transition-colors"
              >
                {isUploadingLogo ? (
                  <Loader2 size={12} className="animate-spin text-teal-400" />
                ) : (
                  <Upload size={12} className="text-teal-400" />
                )}
                <span>Unggah Logo</span>
              </button>
            )}
          </div>

          {/* Header Alignment */}
          <div className="flex items-center border border-slate-800 rounded-none bg-slate-900/60 p-0.5 ml-auto">
            <button
              type="button"
              onClick={() => handleHeaderAlignment('left_with_logo')}
              className={`p-1 text-xs cursor-pointer rounded-none transition-colors ${
                (branding.layoutConfig?.headerAlignment || 'left_with_logo') === 'left_with_logo'
                  ? 'bg-teal-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Logo Kiri, Teks Samping"
            >
              <AlignLeft size={13} />
            </button>
            <button
              type="button"
              onClick={() => handleHeaderAlignment('center')}
              className={`p-1 text-xs cursor-pointer rounded-none transition-colors ${
                branding.layoutConfig?.headerAlignment === 'center'
                  ? 'bg-teal-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Teks Tengah"
            >
              <AlignCenter size={13} />
            </button>
          </div>
        </div>

        {/* Input Instansi & OPD */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="text"
            value={branding.institution || ''}
            onChange={(e) => handleInstitutionChange(e.target.value)}
            disabled={!branding.headerEnabled}
            placeholder="Instansi (misal: PEMKAB MIMIKA)"
            className="w-full bg-slate-900 border border-slate-800 disabled:opacity-40 text-white text-xs px-2.5 py-1.5 outline-hidden focus:border-teal-500 rounded-none transition-colors"
          />
          <input
            type="text"
            value={branding.subInstitution || ''}
            onChange={(e) => handleSubInstitutionChange(e.target.value)}
            disabled={!branding.headerEnabled}
            placeholder="Sub-Instansi / OPD (misal: BRIDA)"
            className="w-full bg-slate-900 border border-slate-800 disabled:opacity-40 text-white text-xs px-2.5 py-1.5 outline-hidden focus:border-teal-500 rounded-none transition-colors"
          />
        </div>

        {/* Warna Latar Header */}
        <div className="lg:col-span-3 flex items-center justify-end gap-1.5">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mr-1">
            Warna:
          </span>
          {BRANDING_COLOR_PRESETS.map((preset) => {
            const isSelected = currentHeaderBg.toLowerCase() === preset.hex.toLowerCase();
            return (
              <button
                key={preset.hex}
                type="button"
                onClick={() => handleHeaderBgColor(preset.hex)}
                disabled={!branding.headerEnabled}
                style={{ backgroundColor: preset.hex }}
                className={`w-6 h-6 border rounded-none cursor-pointer transition-transform ${
                  isSelected ? 'border-teal-400 scale-110 shadow-xs' : 'border-slate-700 hover:scale-105'
                }`}
                title={`Header: ${preset.label} (${preset.hex})`}
              />
            );
          })}
        </div>
      </div>

      {/* ── MODULAR SECTION 2: FOOTER CONFIG ── */}
      <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Toggle & Alignment */}
        <div className="lg:col-span-4 flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={branding.footerEnabled}
              onChange={(e) => handleFooterToggle(e.target.checked)}
              className="w-4 h-4 accent-teal-600 rounded-none cursor-pointer"
            />
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
              Catatan Kaki / Footer
            </span>
          </label>

          {/* Footer Alignment */}
          <div className="flex items-center border border-slate-800 rounded-none bg-slate-900/60 p-0.5 ml-auto">
            <button
              type="button"
              onClick={() => handleFooterAlignment('left')}
              className={`p-1 text-xs cursor-pointer rounded-none transition-colors ${
                (branding.layoutConfig?.footerAlignment || 'center') === 'left'
                  ? 'bg-teal-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Rata Kiri"
            >
              <AlignLeft size={13} />
            </button>
            <button
              type="button"
              onClick={() => handleFooterAlignment('center')}
              className={`p-1 text-xs cursor-pointer rounded-none transition-colors ${
                (branding.layoutConfig?.footerAlignment || 'center') === 'center'
                  ? 'bg-teal-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Rata Tengah"
            >
              <AlignCenter size={13} />
            </button>
            <button
              type="button"
              onClick={() => handleFooterAlignment('right')}
              className={`p-1 text-xs cursor-pointer rounded-none transition-colors ${
                branding.layoutConfig?.footerAlignment === 'right'
                  ? 'bg-teal-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Rata Kanan"
            >
              <AlignRight size={13} />
            </button>
          </div>
        </div>

        {/* Input Footer Teks */}
        <div className="lg:col-span-5">
          <input
            type="text"
            value={branding.footerText || ''}
            onChange={(e) => handleFooterTextChange(e.target.value)}
            disabled={!branding.footerEnabled}
            placeholder="Teks Atribusi Sumber (misal: Sumber Data: BPS & BRIDA Kab. Mimika 2024)"
            className="w-full bg-slate-900 border border-slate-800 disabled:opacity-40 text-white text-xs px-2.5 py-1.5 outline-hidden focus:border-teal-500 rounded-none transition-colors"
          />
        </div>

        {/* Warna Latar Footer & Status Aksi */}
        <div className="lg:col-span-3 flex items-center justify-between lg:justify-end gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mr-1">
              Warna:
            </span>
            {BRANDING_COLOR_PRESETS.map((preset) => {
              const isSelected = currentFooterBg.toLowerCase() === preset.hex.toLowerCase();
              return (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => handleFooterBgColor(preset.hex)}
                  disabled={!branding.footerEnabled}
                  style={{ backgroundColor: preset.hex }}
                  className={`w-6 h-6 border rounded-none cursor-pointer transition-transform ${
                    isSelected ? 'border-teal-400 scale-110 shadow-xs' : 'border-slate-700 hover:scale-105'
                  }`}
                  title={`Footer: ${preset.label} (${preset.hex})`}
                />
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {isSaving ? (
              <span className="text-[11px] text-teal-400 inline-flex items-center gap-1">
                <Loader2 size={11} className="animate-spin" />
                <span>Menyimpan</span>
              </span>
            ) : (
              <span className="text-[11px] text-slate-500 font-medium">Tersimpan</span>
            )}
            <button
              type="button"
              onClick={onReset}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-none cursor-pointer transition-colors"
              title="Reset ke Nilai Baku"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
