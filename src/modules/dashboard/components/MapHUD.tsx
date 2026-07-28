"use client";

import React from "react";
import { Plus, Minus, Maximize } from "lucide-react";

/**
 * MapHUD - Komponen Navigasi Peta (Zoom & Center Reset)
 * Terletak melayang di Kanan Bawah layar.
 * Mengadopsi desain "Command Center" murni: tanpa sudut melengkung (rounded-none),
 * sudut siku tajam, flat, dan menyatu harmonis dengan warna border slate-300.
 */
export default function MapHUD() {

    // Memicu event kustom lokal yang akan didengar oleh komponen Leaflet utama (MimikaMap)
    const triggerZoomIn = () => {
        window.dispatchEvent(new Event('map-zoom-in'));
    };

    const triggerZoomOut = () => {
        window.dispatchEvent(new Event('map-zoom-out'));
    };

    const triggerResetView = () => {
        window.dispatchEvent(new Event('map-reset-view'));
    };

    return (
        <div className="flex flex-col items-end justify-end pointer-events-none w-full select-none">

            {/* 
                Kontainer Navigasi Frameless: 
                Menolak border-radius (rounded-none) untuk menegaskan desain siku industrial.
                 pointer-events-auto dikembalikan agar tombol tetap bisa diklik secara normal.
            */}
            <div className="pointer-events-auto flex flex-col bg-white border border-slate-300 shadow-none rounded-none overflow-hidden divide-y divide-slate-200">

                {/* Tombol Perbesar (Zoom In) */}
                <button
                    onClick={triggerZoomIn}
                    className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-teal-700 transition-colors active:bg-slate-200 rounded-none cursor-pointer"
                    title="Perbesar Tampilan Peta"
                >
                    <Plus size={18} strokeWidth={2.5} />
                </button>

                {/* Tombol Kembalikan Fokus (Center Reset) */}
                <button
                    onClick={triggerResetView}
                    className="w-10 h-9 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-teal-700 transition-colors active:bg-slate-200 group rounded-none cursor-pointer"
                    title="Reset Fokus ke Seluruh Mimika"
                >
                    <Maximize
                        size={14}
                        strokeWidth={2.5}
                        className="group-hover:scale-110 transition-transform"
                    />
                </button>

                {/* Tombol Perkecil (Zoom Out) */}
                <button
                    onClick={triggerZoomOut}
                    className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-teal-700 transition-colors active:bg-slate-200 rounded-none cursor-pointer"
                    title="Perkecil Tampilan Peta"
                >
                    <Minus size={18} strokeWidth={2.5} />
                </button>
            </div>

        </div>
    );
}