"use client";

import React, { Suspense } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

// ============================================================================
// IMPORTS COMPONENTS (Sektor HUD Spasial GFW-Style)
// Semua diimpor secara relatif dari folder komponen dashboard [Fase 3 & 4 Ready]
// ============================================================================
import ExplorerNavbar from "../components/ExplorerNavbar";
import ExplorerSidebar from "../components/ExplorerSidebar";
import MapWrapper from "../components/MapWrapper";
import PanelOrchestrator from "../components/PanelOrchestrator";
import MapHUD from "../components/MapHUD";
import { useExplorerStore } from "../store/useExplorerStore";

// ============================================================================
// PROPS INTERFACE (Koneksi Rute SPA Klien)
// Menjaga sinkronisasi navigasi fungsional dengan App.tsx [Vite Ready]
// ============================================================================
export interface GisExplorerViewProps {
    onNavigate?: (route: string) => void;
    onLogout?: () => void;
}

// ============================================================================
// INLINED COMPONENT: GalleryOverlay (Theater Mode / Cinematic Preview)
// Menerapkan prinsip High Cohesion: Berjalan otomatis saat gambar marker diklik
// ============================================================================
const GalleryOverlay: React.FC = () => {
    const galleryState = useExplorerStore((state) => state.galleryState);
    const closeGallery = useExplorerStore((state) => state.closeGallery);
    const setGalleryIndex = useExplorerStore((state) => state.setGalleryIndex);

    if (!galleryState || !galleryState.isOpen) return null;

    const { images, currentIndex, title } = galleryState;
    const total = images.length;

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setGalleryIndex((currentIndex - 1 + total) % total);
    };

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setGalleryIndex((currentIndex + 1) % total);
    };

    return (
        <div
            className="fixed inset-0 z-999 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none animate-in fade-in duration-200"
            onClick={closeGallery} // Klik area luar teater untuk menutup galeri secara halus
        >
            {/* Header Overlay */}
            <div
                className="absolute top-0 left-0 right-0 h-16 px-6 flex items-center justify-between z-50 text-white bg-gradient-to-b from-black/80 to-transparent"
                onClick={(e) => e.stopPropagation()} // Cegah penutupan tidak sengaja saat mengklik area header
            >
                <div className="flex flex-col text-left">
                    <span className="text-[10px] font-black uppercase tracking-widest text-teal-400">Teater Visualisasi</span>
                    <h4 className="text-xs font-bold truncate max-w-lg mt-1">{title}</h4>
                </div>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        closeGallery();
                    }}
                    className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-none border border-white/20 transition-all cursor-pointer"
                    title="Tutup Galeri"
                >
                    <X size={18} strokeWidth={2.5} />
                </button>
            </div>

            {/* Bingkai Utama Gambar (Frameless Sharp Center Frame) */}
            <div
                className="relative w-full max-w-4xl aspect-video bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden"
                onClick={(e) => e.stopPropagation()} // Cegah penutupan tidak sengaja saat mengklik bingkai gambar
            >
                <img
                    src={images[currentIndex]}
                    alt={`${title} - Foto ke-${currentIndex + 1}`}
                    className="w-full h-full object-contain animate-in fade-in zoom-in-95 duration-200"
                    draggable={false}
                />

                {/* Tombol Geser Kiri */}
                {total > 1 && (
                    <button
                        onClick={handlePrev}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-teal-600 text-white rounded-none border border-white/10 transition-all cursor-pointer z-10 hover:scale-105 active:scale-95"
                    >
                        <ChevronLeft size={20} strokeWidth={2.5} />
                    </button>
                )}

                {/* Tombol Geser Kanan */}
                {total > 1 && (
                    <button
                        onClick={handleNext}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-teal-600 text-white rounded-none border border-white/10 transition-all cursor-pointer z-10 hover:scale-105 active:scale-95"
                    >
                        <ChevronRight size={20} strokeWidth={2.5} />
                    </button>
                )}
            </div>

            {/* Indikator Angka Halaman Kiri-Kanan */}
            {total > 1 && (
                <div className="absolute bottom-6 flex items-center gap-1.5 z-10 text-white/50 text-[10px] font-bold font-mono">
                    <span>{currentIndex + 1}</span>
                    <span>/</span>
                    <span>{total}</span>
                </div>
            )}
        </div>
    );
};

// ============================================================================
// MAIN VIEW COMPONENT: GisExplorerView (The Command Center Portal)
// ============================================================================
export default function GisExplorerView({
    onNavigate,
    onLogout
}: GisExplorerViewProps) {
    return (
        <main className="relative h-dvh w-screen overflow-hidden bg-slate-50 font-sans text-slate-800 selection:bg-blue-200 selection:text-blue-900 select-none">

            {/* =====================================================================
                LAYER 0: THE INFINITE CANVAS (PETA SATELIT BASE)
                Mengambil tinggi & lebar penuh layar. z-index: 0
                ====================================================================== */}
            <div className="absolute inset-0 z-0">
                <Suspense fallback={<div className="h-full w-full bg-slate-50" />}>
                    <MapWrapper isAtlasMode={true} />
                </Suspense>
            </div>

            {/* =====================================================================
                LAYER 0.5: THEATER MODE PORTAL OVERLAY
                Aktif melayang di atas peta jika gambar marka diklik. z-index: 999
                ====================================================================== */}
            <GalleryOverlay />

            {/* =====================================================================
                LAYER 1: GLOBAL CONTEXT TOPBAR (ExplorerNavbar)
                Tinggi 64px, z-index: 50 (Menjamin interaksi otentikasi & navigasi)
                ====================================================================== */}
            <div className="absolute top-0 left-0 right-0 h-16 z-50 pointer-events-auto">
                <ExplorerNavbar onNavigate={onNavigate} onLogout={onLogout} />
            </div>

            {/* =====================================================================
                LAYER 2: SLIM RIBBON SIDEBAR (ExplorerSidebar)
                Membentang di sisi kiri setinggi layar, dimulai di bawah Topbar. z-index: 40
                ====================================================================== */}
            <div className="absolute top-16 bottom-0 left-0 z-40 pointer-events-none">
                <div className="h-full pointer-events-auto">
                    <ExplorerSidebar />
                </div>
            </div>

            {/* =====================================================================
                LAYER 3: STACKING DRAWERS (PanelOrchestrator)
                Tempat meletakkan panel pencarian, katalog OPD, & detail profil. z-index: 30
                Menempel rata tepi di bawah topbar dan di samping sidebar kiri.
                ====================================================================== */}
            <div className="absolute top-16 bottom-0 left-16 z-30 pointer-events-none">
                <PanelOrchestrator />
            </div>

            {/* =====================================================================
                LAYER 4: FLOATING CONTROLS & MapHUD
                Zoom-in/Zoom-out dan tombol center-reset di kanan bawah. z-index: 30
                ====================================================================== */}
            <div className="absolute bottom-8 right-8 z-30 pointer-events-none">
                <MapHUD />
            </div>

        </main>
    );
}