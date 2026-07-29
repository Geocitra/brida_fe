"use client";

import React, { useState } from "react";
import {
    Search,
    ChevronLeft,
    Share2,
    Check,
    LogOut
} from "lucide-react";
import { useExplorerStore } from "../store/useExplorerStore";

// ============================================================================
// PROPS INTERFACE (Vite SPA Routing Integration)
// ============================================================================
interface ExplorerNavbarProps {
    onNavigate?: (route: string) => void;
    onLogout?: () => void;
}

// Profil Eksekutif Tunggal Kepala BRIDA Mimika [Fase 5 Ready]
const DARIUS_PROFILE = {
    full_name: "Darius Sabon Rain, S.E., M.Ec.Dev.",
    role: "Kepala BRIDA",
    initials: "DS"
};

export default function ExplorerNavbar({
    onNavigate,
    onLogout
}: ExplorerNavbarProps) {

    const {
        activeIndicator,
        activeBaseMap,
        openPanel,
        closePanelsToTheRight,
        clearPanels,
        resetMapData,
        galleryState
    } = useExplorerStore();

    const [searchQuery, setSearchQuery] = useState("");
    const [isCopied, setIsCopied] = useState(false);

    // Deteksi apakah Mode Teater (Cinematic Gallery) sedang aktif
    const isTheaterMode = galleryState?.isOpen;

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        closePanelsToTheRight(-1);
        openPanel("hasil-pencarian", "Hasil Pencarian", { query: searchQuery });
    };

    const handleLogoClick = (e: React.MouseEvent) => {
        e.preventDefault();
        clearPanels();
        resetMapData();
        setSearchQuery("");
    };

    const handleShareClick = async () => {
        const baseUrl = window.location.origin + window.location.pathname;
        const params = new URLSearchParams();

        if (activeIndicator) params.set("indicator", activeIndicator);
        if (activeBaseMap) params.set("basemap", activeBaseMap);

        const shareUrl = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Smart Analysis - Eksplorasi Spasial',
                    text: `Lihat data analisis spasial ${activeIndicator || 'Kabupaten Mimika'} di BRIDA DataHub.`,
                    url: shareUrl,
                });
                return;
            } catch (err) {
                console.log("Aktivitas berbagi dibatalkan", err);
            }
        }

        try {
            await navigator.clipboard.writeText(shareUrl);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error("Gagal menyalin tautan ke papan klip:", err);
        }
    };

    return (
        // [INTERACTION GUARD] Meredupkan & mengunci Topbar saat Mode Teater aktif
        <nav className={`w-full h-16 px-6 flex items-center justify-between bg-white border-b border-slate-200 relative z-50 transition-all duration-300 ease-in-out
            ${isTheaterMode ? "opacity-40 pointer-events-none grayscale" : "opacity-100"}
        `}>

            {/* SISI KIRI: Kembalikan ke Portal & Branding BRIDA */}
            <div className="flex items-center gap-6">
                <button
                    onClick={() => onNavigate?.('dashboard')} // Kembali ke Repositori Dokumen [Vite Router Bypass]
                    className="group flex items-center gap-2 text-slate-500 hover:text-teal-700 transition-all rounded-none cursor-pointer"
                >
                    <div className="p-1.5 group-hover:bg-slate-100 transition-colors rounded-none">
                        <ChevronLeft size={20} />
                    </div>
                </button>

                <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block"></div>

                <button
                    onClick={handleLogoClick}
                    className="flex items-center gap-3 active:scale-95 transition-transform group rounded-none cursor-pointer"
                >
                    <div className="flex flex-col leading-none text-left">
                        <span className="text-sm font-black text-slate-800 tracking-tighter uppercase">
                            Smart <span className="text-teal-600">Analysis</span>
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold tracking-[0.2em] uppercase">
                            Eksplorasi Spasial
                        </span>
                    </div>
                </button>
            </div>

            {/* SISI TENGAH: Global Search (Fokus Input Klien) */}
            <div className="hidden lg:flex flex-1 max-w-xl mx-12">
                <form onSubmit={handleSearchSubmit} className="w-full relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors" size={18} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari lokasi atau indikator sektoral..."
                        className="w-full bg-slate-50 border border-slate-200 py-2.5 pl-12 pr-6 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white transition-all rounded-none font-medium"
                    />
                </form>
            </div>

            {/* SISI KANAN: Tombol Share & Panel Otoritas Eksekutif Bapak Darius */}
            <div className="flex items-center gap-4">

                {/* UNITARY TOOL: Share Button */}
                <button
                    onClick={handleShareClick}
                    className={`flex items-center gap-2 px-1.5 py-2 transition-all active:scale-95 cursor-pointer ${isCopied
                        ? "text-teal-600"
                        : "text-slate-600 hover:text-teal-700"
                        }`}
                    title="Bagikan koordinat visual peta saat ini"
                >
                    {isCopied ? <Check size={18} className="stroke-[2.5px]" /> : <Share2 size={18} />}
                    <span className="text-xs font-bold uppercase tracking-widest hidden sm:block">
                        {isCopied ? "Tersalin" : "Bagikan"}
                    </span>
                </button>

                <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>

                {/* PROFILE HUB: Otoritas Tunggal Kepala BRIDA Mimika */}
                <div className="flex items-center gap-3 py-1.5 group select-none">
                    {/* Square Avatar (Gaya AV Siku Tegas) */}
                    <div className="w-9 h-9 bg-teal-50 text-teal-700 flex items-center justify-center text-xs font-black border border-teal-100/50 rounded-none shrink-0 shadow-sm">
                        {DARIUS_PROFILE.initials}
                    </div>

                    <div className="hidden sm:flex flex-col items-start leading-tight">
                        <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight line-clamp-1 max-w-44">
                            {DARIUS_PROFILE.full_name}
                        </span>
                        <span className="text-[9px] text-teal-600 font-bold uppercase tracking-widest mt-0.5">
                            {DARIUS_PROFILE.role}
                        </span>
                    </div>
                </div>

                <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

                {/* LOGOUT: Keluar Sesi Otorisasi */}
                {onLogout && (
                    <button
                        onClick={onLogout}
                        className="text-slate-400 hover:text-rose-600 p-1.5 transition-colors cursor-pointer"
                        title="Keluar Sesi Portal Eksekutif"
                    >
                        <LogOut size={16} />
                    </button>
                )}
            </div>

        </nav>
    );
}