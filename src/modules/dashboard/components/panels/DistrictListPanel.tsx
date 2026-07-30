"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Search, Map, ChevronRight, Image as ImageIcon } from "lucide-react";
import { useExplorerStore } from "../../store/useExplorerStore";

// ============================================================================
// SELF-CONTAINED MASTER DATA: Daftar 18 Distrik Kabupaten Mimika [Fase 5]
// Menyediakan data profil dasar instan untuk visualisasi rendering daftar
// ============================================================================
const MASTER_DISTRICTS_LIST = [
    { id: 1, name: "Mimika Baru", populasi: 142000 },
    { id: 2, name: "Kuala Kencana", populasi: 28000 },
    { id: 3, name: "Tembagapura", populasi: 23000 },
    { id: 4, name: "Wania", populasi: 61000 },
    { id: 5, name: "Iwaka", populasi: 12000 },
    { id: 6, name: "Kwamki Narama", populasi: 15000 },
    { id: 7, name: "Mimika Timur", populasi: 11000 },
    { id: 8, name: "Mimika Tengah", populasi: 5500 },
    { id: 9, name: "Mimika Barat", populasi: 4200 },
    { id: 10, name: "Agimuga", populasi: 3800 },
    { id: 11, name: "Jila", populasi: 4500 },
    { id: 12, name: "Jita", populasi: 2800 },
    { id: 13, name: "Mimika Timur Jauh", populasi: 3200 },
    { id: 14, name: "Mimika Barat Jauh", populasi: 2100 },
    { id: 15, name: "Mimika Barat Tengah", populasi: 2400 },
    { id: 16, name: "Amar", populasi: 1800 },
    { id: 17, name: "Hoya", populasi: 1200 },
    { id: 18, name: "Alama", populasi: 1600 }
];

export default function DistrictListPanel() {
    const [searchQuery, setSearchQuery] = useState("");
    const [districts, setDistricts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const { openPanel, focusedDistrict, setFocusDistrict } = useExplorerStore();

    // Memuat data master distrik secara aman & instan
    useEffect(() => {
        let isMounted = true;
        setLoading(true);

        const timer = setTimeout(() => {
            if (isMounted) {
                setDistricts(MASTER_DISTRICTS_LIST);
                setLoading(false);
            }
        }, 150);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, []);

    // Filter Pencarian Lokal O(N)
    const filteredDistricts = useMemo(() => {
        if (!searchQuery) return districts;
        const lowerQuery = searchQuery.toLowerCase();
        return districts.filter(d =>
            d.name.toLowerCase().includes(lowerQuery)
        );
    }, [searchQuery, districts]);

    // Handler Klik Baris Utama: Menggerakkan Kamera Peta (FlyTo/Zoom)
    const handleDistrictClick = (districtName: string) => {
        if (focusedDistrict === districtName) {
            setFocusDistrict(null); // Toggle Off (Peta kembali ke cakupan global)
        } else {
            setFocusDistrict(districtName); // Toggle On (Peta terbang memfokuskan wilayah)
        }
    };

    return (
        <div className="flex flex-col h-full bg-white pb-10 text-slate-800">

            {/* SEKSI SEARCH BAR (Sticky Header) */}
            <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 sticky top-0 z-10 shadow-sm">
                <div className="relative group">
                    <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors"
                        size={14}
                    />
                    <input
                        type="text"
                        placeholder="Cari wilayah distrik..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-none py-1.5 pl-8 pr-3 text-[12px] font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                    />
                </div>
            </div>

            {/* SEKSI DAFTAR WILAYAH (Flush List dengan Micro-Thumbnail Siku) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">

                {/* Header Petunjuk */}
                <div className="px-4 py-3 bg-teal-50/50 border-b border-slate-200 flex items-start gap-2.5 select-none">
                    <Map size={14} className="text-teal-600 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-slate-600 leading-relaxed font-medium text-justify">
                        Klik pada nama wilayah untuk menyorot peta (Zoom). Klik tombol panah kanan untuk membedah profil mendetail distrik bersangkutan.
                    </p>
                </div>

                {loading ? (
                    /* Loading State Pulse */
                    <div className="flex flex-col select-none">
                        {[1, 2, 3, 4, 5].map((n) => (
                            <div key={n} className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
                                <div className="w-10 h-10 bg-slate-200 animate-pulse shrink-0" />
                                <div className="flex flex-col gap-1.5 w-full">
                                    <div className="w-1/2 h-3 bg-slate-200 animate-pulse" />
                                    <div className="w-1/3 h-2 bg-slate-100 animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredDistricts.length > 0 ? (
                    <div className="flex flex-col bg-white">
                        {filteredDistricts.map((district) => {
                            const isActive = focusedDistrict === district.name;
                            
                            // Local mapping of district thumbnails consistent with DetailPanel
                            const thumbnailMap: Record<number, string> = {
                                1: "/img/mimika%20baru/aerial%20view.jpg",
                                2: "/img/kualakencana/images%20(1).jpg",
                                3: "/img/tembagapura/Grasberg_pano_(3200491589)_(cropped).jpg",
                                4: "/img/wania/Pasar-Sentral-1-scaled.jpg",
                                5: "/img/iwaka/sagu-1-635c8e4408a8b57f2152e722.jpg",
                                6: "/img/kwamki%20narama/prosesi-kremasi-jenazah-junius-m-janempa-di-kwamki-narama-rabu-142026-foto-cenderawasih-posmoh-wahyu-welerubun-xmAu6.webp",
                                7: "/img/mimika%20timur/624e6c8c105e5.jpg",
                                8: "/img/jita/Panoramic_view_of_dock_at_Kampung_Rawa,_2014-06-21.jpg",
                                9: "/img/mimika%20barat/061348_64937_INDAH_mimika_dalam.jpg",
                                10: "/img/agimuga/209.jpg",
                                11: "/img/jila/615d4d4e6ff0c.jpg",
                                12: "/img/jita/images.jpg",
                                13: "/img/agimuga/7311.jpg",
                                14: "/img/mimika%20barat%20jauh/pantai-minajaya-sukabumi-1747457877972_169.jpeg",
                                15: "/img/AMANNSAGOAOWA.jpg",
                                16: "/img/jita/Panoramic_view_of_dock_at_Kampung_Rawa,_2014-06-21.jpg",
                                17: "/img/hoya/images.jpg",
                                18: "/img/alama/97295c5df6d1.jpg"
                            };
                            const mockThumbnail = thumbnailMap[district.id] || "/img/Mimika-300x200.jpg";

                            return (
                                <button
                                    key={district.id}
                                    onClick={() => handleDistrictClick(district.name)}
                                    className={`group flex items-center justify-between px-4 py-2 border-b border-slate-200 transition-colors text-left w-full cursor-pointer ${isActive ? "bg-teal-50/40" : "bg-white hover:bg-slate-50"
                                        }`}
                                >
                                    <div className="flex items-center gap-3 w-full">

                                        {/* MICRO-THUMBNAIL (Sharp Edges / Siku Siku 40x40px) */}
                                        <div className="relative w-10 h-10 bg-slate-100 border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center">
                                            {mockThumbnail ? (
                                                <img
                                                    src={mockThumbnail}
                                                    alt={district.name}
                                                    className={`w-full h-full object-cover transition-transform duration-500 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}
                                                    draggable={false}
                                                />
                                            ) : (
                                                <ImageIcon size={14} className="text-slate-300" />
                                            )}

                                            {/* Left Highlight Border inside Thumbnail */}
                                            {isActive && (
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500 z-10 shadow-[1px_0_4px_rgba(20,184,166,0.5)]" />
                                            )}
                                        </div>

                                        {/* DETAIL TEKS IDENTITAS WILAYAH */}
                                        <div className="flex flex-col flex-1 overflow-hidden pr-2">
                                            <span className={`text-[12px] truncate transition-colors ${isActive ? 'text-teal-800 font-bold' : 'text-slate-700 font-bold group-hover:text-slate-900'
                                                }`}>
                                                {district.name}
                                            </span>

                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                    ID: {district.id.toString().padStart(2, '0')}
                                                </span>
                                                <span className="text-[8px] text-slate-300 select-none">•</span>
                                                <span className="text-[9px] font-bold text-slate-500 truncate">
                                                    {district.populasi ? `${(district.populasi / 1000).toFixed(1)}k Jiwa` : 'N/A'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* DETAIL PANEL TRIGGER */}
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation(); // Amankan agar tidak memicu click baris
                                                setFocusDistrict(district.name); // Kamera langsung mengunci wilayah

                                                openPanel("detil-distrik", `Profil Distrik ${district.name}`, {
                                                    id: district.id,
                                                    name: district.name
                                                });
                                            }}
                                            className="p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-teal-700 hover:border-teal-500 transition-all rounded-none opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                                            title="Buka Profil Lengkap"
                                        >
                                            <ChevronRight size={14} strokeWidth={2.5} />
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 px-4 select-none">
                        <div className="w-12 h-12 rounded-none bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-200">
                            <Search size={20} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[12px] font-bold text-slate-700">Wilayah Tidak Ditemukan</p>
                            <p className="text-[11px] text-slate-500 font-normal">Periksa kembali ejaan distrik</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}