import React, { Suspense, lazy } from 'react';

// ============================================================================
// VITE SPA CODE-SPLITTING: Pemanggilan Peta Leaflet Secara Asinkron
// Menggantikan next/dynamic untuk memotong ukuran bundel awal bundle di SPA
// ============================================================================
const MimikaMap = lazy(() => import('./MimikaMap'));

interface MapWrapperProps {
    isAtlasMode?: boolean;
    isPreviewMode?: boolean; // Parameter pendukung visualisasi teaser di Landing Page
}

/**
 * MapWrapper - Gateway Utama Kontainer Spasial
 * Mengunci dimensi lebar dan tinggi kontainer peta secara absolut (Infinite Canvas)
 * sekaligus melengkapi pinggiran peta dengan bayangan gelap (Vignette Overlay).
 */
export default function MapWrapper({
    isAtlasMode = false,
    isPreviewMode = false
}: MapWrapperProps) {
    return (
        <div className={`w-full h-full relative z-0 overflow-hidden ${isAtlasMode ? 'bg-[#0A192F]' : 'bg-gray-50'}`}>

            {/* 
                Mekanisme Suspense menangkap kondisi peta sedang memuat file JSON batas wilayah.
                Mencegah kedipan layar putih polos saat inisialisasi kartografi.
            */}
            <Suspense fallback={
                <div className="w-full h-full flex items-center justify-center bg-[#0A192F]">
                    <div className="text-center select-none">
                        {/* Spinner Lingkaran Electric Cyan */}
                        <div className="w-12 h-12 border-4 border-[#00E5FF] border-t-transparent rounded-full animate-spin mx-auto mb-6 shadow-[0_0_20px_rgba(0,229,255,0.4)]"></div>

                        <p className="text-xs text-[#00E5FF] font-black uppercase tracking-[0.3em] animate-pulse">
                            Inisialisasi Mesin Spasial...
                        </p>
                        <p className="text-[10px] text-white/40 mt-2 font-medium">
                            Menyiapkan kanvas geospasial Kabupaten Mimika
                        </p>
                    </div>
                </div>
            }>
                <MimikaMap
                    isAtlasMode={isAtlasMode}
                    isPreviewMode={isPreviewMode}
                />
            </Suspense>

            {/* 
                [UX BEST PRACTICE - VIGNETTE EFFECT]
                Bayangan gelap melingkar di sekeliling layar (hanya aktif pada Atlas Mode).
                Membuat kontrol panel slide di kiri dan HUD di kanan terlihat lebih kontras dan tajam.
            */}
            {isAtlasMode && !isPreviewMode && (
                <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(10,25,47,0.9)] z-10" />
            )}
        </div>
    );
}