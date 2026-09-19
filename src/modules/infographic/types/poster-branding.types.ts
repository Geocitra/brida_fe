export type PosterAspectRatio = '1:1' | '9:16' | '16:9' | '3:4' | '4:3';

export type PosterGenerationProfile = 'V1_BAKED_FOOTER' | 'V2_CLEAN_CANVAS';

export interface PosterLayoutConfig {
  headerBgColor?: string;
  headerTextColor?: string;
  headerAlignment?: 'left_with_logo' | 'center';
  footerBgColor?: string;
  footerTextColor?: string;
  footerAlignment?: 'center' | 'left' | 'right';
  headerFontSize?: 'compact' | 'normal' | 'large';
  footerFontSize?: 'compact' | 'normal' | 'large';
  logoPosition?: 'left' | 'right' | 'center';
  logoSize?: 'compact' | 'normal' | 'large';
}

export interface PosterBrandingData {
  id?: string;
  posterId: string;
  headerEnabled: boolean;
  logoUrl?: string | null;
  institution?: string;
  subInstitution?: string;
  footerEnabled: boolean;
  footerText?: string;
  layoutConfig?: PosterLayoutConfig;
  composedUrl?: string | null;
  brandingHash?: string | null;
}

export const BRANDING_COLOR_PRESETS = [
  { label: 'Putih Bersih', hex: '#FFFFFF', isDark: false },
  { label: 'Navy Resmi', hex: '#0F1E36', isDark: true },
  { label: 'Slate Teal', hex: '#0D9488', isDark: true },
  { label: 'Dark Slate', hex: '#1E293B', isDark: true },
];
