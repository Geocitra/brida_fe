import React from 'react';
import type { PosterBrandingData, PosterAspectRatio } from '../types/poster-branding.types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface PosterBrandingOverlayProps {
  branding: PosterBrandingData | null;
  aspectRatio?: PosterAspectRatio | string;
}

/**
 * Menghitung proporsi tinggi header dan footer adaptif sinkron dengan engine backend
 */
export function getOverlayDimensions(aspectRatio?: string): {
  headerHeight: string;
  footerHeight: string;
} {
  switch (aspectRatio) {
    case '16:9':
      return { headerHeight: '6.0%', footerHeight: '3.5%' };
    case '4:3':
      return { headerHeight: '6.5%', footerHeight: '4.0%' };
    case '1:1':
      return { headerHeight: '7.0%', footerHeight: '4.0%' };
    case '3:4':
      return { headerHeight: '7.0%', footerHeight: '4.0%' };
    case '9:16':
    default:
      return { headerHeight: '7.5%', footerHeight: '4.0%' };
  }
}

/**
 * Menghitung CSS inline style untuk base image agar hanya menempati zona konten
 * (antara header dan footer), bukan mengisi 100% kanvas.
 *
 * ARSITEKTUR BENAR:
 *   [Header bar — clean dedicated space]
 *   [Base AI image — only occupies content zone]
 *   [Footer bar — clean dedicated space]
 *
 * Digunakan oleh PosterShowcaseStage untuk sinkronisasi preview dengan output Puppeteer.
 */
export function getImageContentZoneStyle(
  branding: { headerEnabled: boolean; footerEnabled: boolean } | null,
  aspectRatio?: string,
): React.CSSProperties {
  if (!branding || (!branding.headerEnabled && !branding.footerEnabled)) {
    return {};
  }

  const dims = getOverlayDimensions(aspectRatio);

  const topOffset = branding.headerEnabled ? dims.headerHeight : '0%';
  const bottomOffset = branding.footerEnabled ? dims.footerHeight : '0%';

  return {
    position: 'absolute' as const,
    top: topOffset,
    left: 0,
    right: 0,
    bottom: bottomOffset,
    width: '100%',
    height: `calc(100% - ${topOffset} - ${bottomOffset})`,
    objectFit: 'cover' as const,
    objectPosition: 'center top',
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

export const PosterBrandingOverlay: React.FC<PosterBrandingOverlayProps> = ({ branding, aspectRatio }) => {
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

  const dims = getOverlayDimensions(aspectRatio);

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

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden font-roboto rounded-none select-none">
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
