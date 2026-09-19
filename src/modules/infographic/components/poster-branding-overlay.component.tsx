import React from 'react';
import type { PosterBrandingData } from '../types/poster-branding.types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface PosterBrandingOverlayProps {
  branding: PosterBrandingData | null;
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

export const PosterBrandingOverlay: React.FC<PosterBrandingOverlayProps> = ({ branding }) => {
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

  const headerBgColor = layoutConfig.headerBgColor || '#FFFFFF';
  const headerTextColor = layoutConfig.headerTextColor || (isDarkColor(headerBgColor) ? '#FFFFFF' : '#0F1E36');
  const headerAlignment = layoutConfig.headerAlignment || 'left_with_logo';

  const footerBgColor = layoutConfig.footerBgColor || '#0F1E36';
  const footerTextColor = layoutConfig.footerTextColor || (isDarkColor(footerBgColor) ? '#F8FAFC' : '#0F1E36');
  const footerAlignment = layoutConfig.footerAlignment || 'center';

  const fullLogoUrl = logoUrl
    ? logoUrl.startsWith('http')
      ? logoUrl
      : `${API_BASE_URL}${logoUrl}`
    : null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden font-roboto rounded-none select-none">
      {/* ── HEADER RESMI (0% - 8%) ── */}
      {headerEnabled && (
        <div
          style={{
            backgroundColor: headerBgColor,
            color: headerTextColor,
            height: '8%',
          }}
          className={`absolute top-0 left-0 right-0 flex items-center px-[4%] border-b border-black/10 rounded-none transition-colors duration-150 ${
            headerAlignment === 'center' ? 'justify-center text-center' : 'justify-start text-left'
          }`}
        >
          {fullLogoUrl && (
            <img
              src={fullLogoUrl}
              alt="Logo Instansi"
              className="h-[72%] max-w-[18%] w-auto object-contain mr-[2.5%] rounded-none flex-shrink-0 drop-shadow-xs"
            />
          )}
          <div className="flex flex-col justify-center leading-tight">
            <span className="text-[clamp(10px,1.8cqw,18px)] font-black tracking-wider uppercase">
              {institution}
            </span>
            {subInstitution && (
              <span className="text-[clamp(8px,1.3cqw,14px)] font-medium opacity-90 mt-[1px] tracking-normal">
                {subInstitution}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── FOOTER RESMI (94% - 100%) ── */}
      {footerEnabled && (
        <div
          style={{
            backgroundColor: footerBgColor,
            color: footerTextColor,
            height: '6%',
          }}
          className={`absolute bottom-0 left-0 right-0 flex items-center px-[4%] border-t border-white/10 rounded-none transition-colors duration-150 ${
            footerAlignment === 'center'
              ? 'justify-center text-center'
              : footerAlignment === 'right'
              ? 'justify-end text-right'
              : 'justify-start text-left'
          }`}
        >
          <span className="text-[clamp(8px,1.25cqw,13px)] font-medium tracking-wide truncate max-w-full">
            {footerText}
          </span>
        </div>
      )}
    </div>
  );
};
