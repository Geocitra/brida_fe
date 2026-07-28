"use client";

import React from "react";
import {
    Search,
    Layers,
    MapPin,
    Info,
    Map,
    Building2
} from "lucide-react";
import { useExplorerStore, type ExplorerPanelType } from "../store/useExplorerStore";

export default function ExplorerSidebar() {
    const { openPanel, activePanels, closePanelsToTheRight, galleryState } = useExplorerStore();

    // Deteksi apakah Mode Teater sedang aktif
    const isTheaterMode = galleryState?.isOpen;

    // Rumpun navigasi pita sempit spasial
    const navigationItems = [
        {
            type: "hasil-pencarian" as ExplorerPanelType,
            label: "Cari",
            icon: Search,
            title: "Pencarian Spasial Global"
        },
        {
            type: "katalog-wilayah" as ExplorerPanelType,
            label: "Wilayah",
            icon: Map,
            title: "Eksplorasi Wilayah Distrik Mimika"
        },
        {
            type: "konfigurasi" as ExplorerPanelType,
            label: "Basemap",
            icon: Layers,
            title: "Konfigurasi Lapisan Peta"
        }
    ];

    const isPanelActive = (type: ExplorerPanelType) => {
        return activePanels.some(p => p.type === type);
    };

    const handleNavClick = (item: typeof navigationItems[0]) => {
        if (item.type) {
            closePanelsToTheRight(-1);
            openPanel(item.type, item.title);
        }
    };

    return (
        // [INTERACTION GUARD] Meredupkan & mengunci Sidebar saat Mode Teater aktif
        <aside className={`fixed bottom-0 left-0 w-full h-16 md:static md:w-16 md:h-full flex flex-row md:flex-col items-center bg-white border-t md:border-t-0 md:border-r border-slate-200 z-50 transition-all duration-300 ease-in-out
            ${isTheaterMode ? "opacity-40 pointer-events-none grayscale" : "opacity-100"}
        `}>

            {/* BARIS UTAMA: Akses Menu Cepat */}
            <div className="flex-1 flex flex-row md:flex-col justify-around md:justify-start items-center w-full">
                {navigationItems.map((item, index) => {
                    const isActive = item.type ? isPanelActive(item.type) : false;

                    return (
                        <div key={index} className="relative group w-full flex justify-center">
                            <button
                                onClick={() => handleNavClick(item)}
                                className={`w-full h-16 flex flex-col items-center justify-center gap-1 transition-colors relative active:bg-slate-100 rounded-none cursor-pointer
                                    ${isActive
                                        ? "bg-teal-50 text-teal-700 md:border-l-[3px] border-b-[3px] md:border-b-0 border-teal-600"
                                        : "bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800 border-l-[3px] border-transparent"
                                    }`}
                            >
                                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />

                                <span className={`text-[9px] font-bold uppercase tracking-widest
                                    ${isActive ? "opacity-100" : "opacity-70"}`}>
                                    {item.label}
                                </span>
                            </button>

                            {/* Tooltip Hover (Desktop Only - Siku Siku Sharp) */}
                            <div className="hidden md:block absolute top-1/2 left-full -translate-y-1/2 ml-2 px-3 py-2 bg-slate-800 text-white text-[10px] font-bold uppercase tracking-widest rounded-none opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                {item.title}
                                {/* Panah Segitiga Tooltip Tajam */}
                                <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45 rounded-none" />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* BARIS BAWAH: Tentang Mimika DataHub */}
            <div className="hidden md:flex flex-col items-center w-full mt-auto">
                <div className="w-8 h-px bg-slate-200 mb-2" />

                <div className="relative group w-full flex justify-center">
                    <button
                        onClick={() => {
                            closePanelsToTheRight(-1);
                            openPanel("tentang", "Tentang Smart Analysis");
                        }}
                        className="w-full h-16 flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-colors active:bg-slate-100 rounded-none border-l-[3px] border-transparent cursor-pointer"
                    >
                        <Info size={20} />
                    </button>

                    {/* Tooltip Info - Sharp Edges */}
                    <div className="absolute top-1/2 left-full -translate-y-1/2 ml-2 px-3 py-2 bg-slate-800 text-white text-[10px] font-bold uppercase tracking-widest rounded-none opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                        Tentang DataHub
                        <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45 rounded-none" />
                    </div>
                </div>
            </div>

        </aside>
    );
}