import React, { useRef, useState, useEffect } from 'react';
import {
  BRANDING_SAFE_AREA_CONFIG,
  type PosterBrandingData,
  type PosterAspectRatio,
} from '../types/poster-branding.types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface PosterBrandingOverlayProps {
  branding: PosterBrandingData | null;
  aspectRatio?: PosterAspectRatio | string;
  onHeaderHeightPercentChange?: (percent: number) => void;
}

/**
 * Menghitung proporsi tinggi header dan footer adaptif sinkron dengan engine backend
 * dan konfigurasi Safe Area sentral (BRANDING_SAFE_AREA_CONFIG).
 * Mendukung persentase dinamis (custom drag / slider).
 */
export function getOverlayDimensions(
  aspectRatio?: string,
  headerHeightOption?: 'compact' | 'normal' | 'spacious',
  customHeaderHeightPercent?: number,
  customFooterHeightPercent?: number,
): {
  headerHeight: string;
  footerHeight: string;
  headerHeightNum: number;
  footerHeightNum: number;
} {
  const ratioKey = (aspectRatio && aspectRatio in BRANDING_SAFE_AREA_CONFIG)
    ? (aspectRatio as PosterAspectRatio)
    : '9:16';
  const config = BRANDING_SAFE_AREA_CONFIG[ratioKey];

  let headerNum: number;
  if (typeof customHeaderHeightPercent === 'number' && customHeaderHeightPercent > 0) {
    headerNum = customHeaderHeightPercent;
  } else {
    const headerMultiplier =
      headerHeightOption === 'compact' ? 0.85 : headerHeightOption === 'spacious' ? 1.2 : 1.0;
    headerNum = Number((config.headerBarPercent * headerMultiplier).toFixed(1));
  }

  let footerNum: number;
  if (typeof customFooterHeightPercent === 'number' && customFooterHeightPercent > 0) {
    footerNum = customFooterHeightPercent;
  } else {
    footerNum = config.footerBarPercent;
  }

  return {
    headerHeight: `${headerNum}%`,
    footerHeight: `${footerNum}%`,
    headerHeightNum: headerNum,
    footerHeightNum: footerNum,
  };
}



function isDarkColor(hex?: string): boolean {
  if (!hex || !hex.startsWith('#')) return false;
  const clean = hex.replace('#', '');
  if (clean.length !== 6 && clean.length !== 3) return false;
  const r = clean.length === 6 ? parseInt(clean.substring(0, 2), 16) : parseInt(clean[0] + clean[0], 16);
  const g = clean.length === 6 ? parseInt(clean.substring(2, 4), 16) : parseInt(clean[1] + clean[1], 16);
  const b = clean.length === 6 ? parseInt(clean.substring(4, 6), 16) : parseInt(clean[2] + clean[2], 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

const HEADER_FONT_SCALES = {
  compact: {
    title: 'text-[clamp(8px,1.8cqw,14px)]',
    sub: 'text-[clamp(6.5px,1.35cqw,11px)]',
  },
  normal: {
    title: 'text-[clamp(9px,2.2cqw,17px)]',
    sub: 'text-[clamp(7.5px,1.6cqw,13px)]',
  },
  large: {
    title: 'text-[clamp(10.5px,2.6cqw,20px)]',
    sub: 'text-[clamp(8.5px,1.9cqw,15px)]',
  },
};

const FOOTER_FONT_SCALES = {
  compact: 'text-[clamp(7px,1.05cqw,11px)]',
  normal: 'text-[clamp(8px,1.25cqw,13px)]',
  large: 'text-[clamp(9.5px,1.5cqw,15.5px)]',
};

const LOGO_HEIGHT_CLASSES = {
  compact: 'h-[58%]',
  normal: 'h-[74%]',
  large: 'h-[88%]',
};

export const PosterBrandingOverlay: React.FC<PosterBrandingOverlayProps> = ({
  branding,
  aspectRatio,
  onHeaderHeightPercentChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  if (!branding) return null;

  const {
    headerEnabled,
    logoUrl,
    institution = 'PEMERINTAH KABUPATEN MIMIKA',
    subInstitution = 'Badan Riset dan Inovasi Daerah',
    footerEnabled,
    footerText = 'Sumber: Dokumen Resmi BRIDA Kabupaten Mimika',
    layoutConfig = {},
  } = branding;

  if (!headerEnabled && !footerEnabled) return null;

  const dims = getOverlayDimensions(
    aspectRatio,
    layoutConfig.headerHeight,
    layoutConfig.headerHeightPercent,
    layoutConfig.footerHeightPercent,
  );

  const headerBgColor = layoutConfig.headerBgColor || '#FFFFFF';
  const headerTextColor = layoutConfig.headerTextColor || (isDarkColor(headerBgColor) ? '#FFFFFF' : '#0F1E36');
  const logoPosition = layoutConfig.logoPosition || (layoutConfig.headerAlignment === 'center' ? 'center' : 'left');
  const headerFontSize = layoutConfig.headerFontSize || 'normal';
  const footerFontSize = layoutConfig.footerFontSize || 'normal';
  const logoSize = layoutConfig.logoSize || 'normal';

  const fontScales = HEADER_FONT_SCALES[headerFontSize] || HEADER_FONT_SCALES.normal;
  const footerFontClass = FOOTER_FONT_SCALES[footerFontSize] || FOOTER_FONT_SCALES.normal;
  const logoHeightClass = LOGO_HEIGHT_CLASSES[logoSize] || LOGO_HEIGHT_CLASSES.normal;

  const footerBgColor = layoutConfig.footerBgColor || '#0F1E36';
  const footerTextColor = layoutConfig.footerTextColor || (isDarkColor(footerBgColor) ? '#F8FAFC' : '#0F1E36');
  const footerAlignment = layoutConfig.footerAlignment || 'center';

  const fullLogoUrl = logoUrl
    ? logoUrl.startsWith('http')
      ? logoUrl
      : `${API_BASE_URL}${logoUrl}`
    : null;

  const headerJustifyClass =
    logoPosition === 'center'
      ? 'justify-center text-center'
      : logoPosition === 'right'
      ? 'justify-between text-left'
      : 'justify-start text-left';

  const textAlignmentClass =
    logoPosition === 'center'
      ? 'items-center text-center'
      : 'items-start text-left';

  const handleUpdateHeight = (clientY: number) => {
    if (!containerRef.current || !onHeaderHeightPercentChange) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.height <= 0) return;
    const offsetY = clientY - rect.top;
    const rawPercent = (offsetY / rect.height) * 100;
    // Batasi dari minimal 4% sampai maksimal 25% dengan presisi 0.5%
    const clamped = Math.min(25, Math.max(4, Math.round(rawPercent * 2) / 2));
    onHeaderHeightPercentChange(clamped);
  };

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);

    const handleMouseMove = (ev: MouseEvent) => {
      ev.preventDefault();
      handleUpdateHeight(ev.clientY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-10 overflow-hidden font-roboto rounded-none select-none"
    >
      {/* ── HEADER RESMI DETERMINISTIK ── */}
      {headerEnabled && (
        <div
          style={{
            backgroundColor: headerBgColor,
            color: headerTextColor,
            height: dims.headerHeight,
          }}
          className={`absolute top-0 left-0 right-0 flex items-center px-[4%] border-b border-black/10 rounded-none transition-colors duration-150 ${headerJustifyClass}`}
        >
          {fullLogoUrl && (
            <img
              src={fullLogoUrl}
              alt="Logo Instansi"
              className={`${logoHeightClass} max-w-[18%] w-auto object-contain rounded-none flex-shrink-0 drop-shadow-xs ${
                logoPosition === 'right' ? 'order-2 ml-[2.5%]' : 'order-1 mr-[2.5%]'
              }`}
            />
          )}
          <div
            className={`flex flex-col justify-center leading-tight min-w-0 overflow-hidden ${
              logoPosition === 'right'
                ? 'order-1 flex-1'
                : logoPosition === 'center'
                ? 'order-2 flex-initial'
                : 'order-2 flex-1'
            } ${textAlignmentClass}`}
          >
            <span className={`${fontScales.title} font-black tracking-wider uppercase whitespace-nowrap truncate leading-normal`}>
              {institution}
            </span>
            {subInstitution && (
              <span className={`${fontScales.sub} font-medium opacity-90 tracking-normal whitespace-nowrap truncate leading-normal`}>
                {subInstitution}
              </span>
            )}
          </div>

          {/* Interactive Drag Handle (Ubah tinggi kop langsung dengan kursor) */}
          {onHeaderHeightPercentChange && (
            <div
              onMouseDown={handleDragStart}
              className={`absolute -bottom-3 left-0 right-0 h-6 cursor-ns-resize pointer-events-auto flex items-center justify-center group z-30 select-none ${
                isDragging ? 'opacity-100' : 'hover:opacity-100'
              }`}
              title="Tarik kursor ke atas/bawah untuk mengubah tinggi kop secara dinamis"
            >
              {/* Full Width Dynamic Guideline Line */}
              <div
                className={`absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] transition-all duration-150 ${
                  isDragging
                    ? 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.9)] opacity-100'
                    : 'bg-teal-500/30 group-hover:bg-teal-400 group-hover:shadow-[0_0_6px_rgba(45,212,191,0.7)] opacity-0 group-hover:opacity-100'
                }`}
              />

              {/* Central Grip Badge */}
              <div
                className={`relative px-2.5 py-0.5 border text-[9px] font-mono font-bold uppercase tracking-wider rounded-none shadow-xl flex items-center gap-1.5 transition-all duration-150 ${
                  isDragging
                    ? 'bg-slate-900 border-teal-400 text-teal-300 scale-105 shadow-teal-500/20'
                    : 'bg-slate-900/90 border-slate-600 text-slate-300 group-hover:border-teal-400 group-hover:text-teal-300'
                }`}
              >
                <span className="text-teal-400 text-[11px] leading-none">⇅</span>
                <span>{dims.headerHeightNum.toFixed(1)}%</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── FOOTER RESMI DETERMINISTIK ── */}
      {footerEnabled && (
        <div
          style={{
            backgroundColor: footerBgColor,
            color: footerTextColor,
            height: dims.footerHeight,
          }}
          className={`absolute bottom-0 left-0 right-0 flex items-center px-[4%] border-t border-white/10 rounded-none transition-colors duration-150 ${
            footerAlignment === 'center'
              ? 'justify-center text-center'
              : footerAlignment === 'right'
              ? 'justify-end text-right'
              : 'justify-start text-left'
          }`}
        >
          <span className={`${footerFontClass} font-medium tracking-wide truncate max-w-full`}>
            {footerText}
          </span>
        </div>
      )}
    </div>
  );
};
