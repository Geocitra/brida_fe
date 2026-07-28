"use client";

import React, { useState, useMemo } from "react";
import {
    Search,
    Building2,
    Map,
    Briefcase,
    Info
} from "lucide-react";
import { useExplorerStore } from "../../store/useExplorerStore";

// ============================================================================
// LOCAL TYPE DEFINITIONS (Enforsemen Struktur Indikator Rumpun OPD)
// ============================================================================
interface AtlasIndicatorBrief {
    key: string;
    title: string;
    unit: string;
    direction: 'positive' | 'negative';
    min: number;
    max: number;
}

interface AtlasCategoryBrief {
    category_id: number;
    category_name: string;
    indicators: AtlasIndicatorBrief[];
}

// ============================================================================
// SELF-CONTAINED LOCAL REGISTRY: Indikator Pembangunan Strategis Mimika 2026
// Disusun secara spesifik mewakili Rumpun Urusan Daerah Kabupaten Mimika [Fase 5]
// ============================================================================
const MOCK_OPD_CATEGORIES: AtlasCategoryBrief[] = [
    {
        category_id: 1,
        category_name: "Rumpun Pelayanan Dasar (Sosial)",
        indicators: [
            {
                key: "stunting_rate",
                title: "Tingkat Stunting Balita",
                unit: "%",
                direction: "negative",
                min: 5,
                max: 35
            },
            {
                key: "school_dropout_rate",
                title: "Angka Putus Sekolah (SD-SMP)",
                unit: "%",
                direction: "negative",
                min: 1.2,
                max: 8.5
            },
            {
                key: "poverty_rate",
                title: "Tingkat Kemiskinan Ekstrem",
                unit: "%",
                direction: "negative",
                min: 4.5,
                max: 22.4
            }
        ]
    },
    {
        category_id: 2,
        category_name: "Rumpun Infrastruktur & Wilayah",
        indicators: [
            {
                key: "road_realization",
                title: "Realisasi Jalan Hotmix",
                unit: " Km",
                direction: "positive",
                min: 20,
                max: 120
            },
            {
                key: "bridge_condition",
                title: "Kelayakan Jembatan Gantung",
                unit: "%",
                direction: "positive",
                min: 30,
                max: 100
            },
            {
                key: "sp_water_coverage",
                title: "Jangkauan SPAM Air Bersih",
                unit: "%",
                direction: "positive",
                min: 15,
                max: 95
            }
        ]
    },
    {
        category_id: 3,
        category_name: "Rumpun Ekonomi & Pendapatan",
        indicators: [
            {
                key: "pad_revenue",
                title: "Realisasi PAD Daerah",
                unit: " Miliar",
                direction: "positive",
                min: 45,
                max: 150
            },
            {
                key: "pdrb_per_capita",
                title: "PDRB Per Kapita Non-Tambang",
                unit: " Juta",
                direction: "positive",
                min: 12,
                max: 65
            }
        ]
    }
];

export default function OpdPanel() {
    const [searchQuery, setSearchQuery] = useState("");
    const { openPanel, activeIndicator, setActiveIndicator } = useExplorerStore();

    // Pemetaan Ikon visual Rumpun Urusan Daerah
    const opdGroupIcons: Record<number, any> = {
        1: Building2, // Urusan Pelayanan Sosial Dasar
        2: Map,       // Urusan Infrastruktur Fisik
        3: Briefcase, // Urusan Fiskal & Ekonomi Kreatif
    };

    // Filter Pencarian Lokal O(N)
    const filteredGroups = useMemo(() => {
        if (!searchQuery) return MOCK_OPD_CATEGORIES;
        const lowerQuery = searchQuery.toLowerCase();

        return MOCK_OPD_CATEGORIES.map(group => ({
            ...group,
            indicators: group.indicators.filter(ind =>
                ind.title.toLowerCase().includes(lowerQuery)
            )
        })).filter(group => group.indicators.length > 0);
    }, [searchQuery]);

    // Logika Sinkronisasi Switch Layer (Pseudo-Radio Toggle)
    const handleIndicatorClick = (indicator: AtlasIndicatorBrief) => {
        if (activeIndicator === indicator.key) {
            setActiveIndicator(null); // Toggle Off
        } else {
            // Set Indikator Aktif sekaligus mengunci data jangkar legenda [Pilar 1]
            setActiveIndicator(indicator.key, {
                min: indicator.min,
                max: indicator.max,
                direction: indicator.direction,
                unit: indicator.unit
            });

            // Tampilkan panel kontrol opacity di sebelah kanan
            openPanel(
                "konfigurasi",
                `Layer: ${indicator.title}`,
                { indicatorKey: indicator.key }
            );
        }
    };

    return (
        <div className="flex flex-col h-full bg-white pb-10 text-slate-800">

            {/* BAR PENCARIAN (High-Density Header) */}
            <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 sticky top-0 z-10 shadow-sm">
                <div className="relative group">
                    <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors"
                        size={14}
                    />
                    <input
                        type="text"
                        placeholder="Cari indikator atau instansi..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-none py-1.5 pl-8 pr-3 text-[12px] font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                    />
                </div>
            </div>

            {/* DAFTAR KATALOG DATA INSTANSI (Flush List) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                {filteredGroups.length > 0 ? (
                    filteredGroups.map((group) => {
                        const Icon = opdGroupIcons[group.category_id] || Info;

                        return (
                            <div key={group.category_id} className="flex flex-col">

                                {/* Rumpun OPD Header - Rapat & Tegas */}
                                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-200 text-slate-500 select-none">
                                    <Icon size={14} className="text-teal-700 shrink-0" />
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider text-left">
                                        {group.category_name}
                                    </h4>
                                </div>

                                {/* List Indikator di dalam Rumpun */}
                                <div className="flex flex-col bg-white">
                                    {group.indicators.map((indicator) => {
                                        const isActive = activeIndicator === indicator.key;

                                        return (
                                            <button
                                                key={indicator.key}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleIndicatorClick(indicator);
                                                }}
                                                className="group flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-white hover:bg-slate-50 transition-colors text-left w-full cursor-pointer"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {/* Toggle Switch */}
                                                    <div
                                                        className={`relative inline-flex h-3.5 w-7 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out ${isActive ? 'bg-teal-500' : 'bg-slate-300'
                                                            }`}
                                                    >
                                                        <span
                                                            className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${isActive ? 'translate-x-3.5' : 'translate-x-0.5'
                                                                }`}
                                                        />
                                                    </div>

                                                    {/* Label Indikator */}
                                                    <span
                                                        className={`text-[12px] transition-colors ${isActive
                                                            ? 'text-teal-800 font-bold'
                                                            : 'text-slate-700 font-medium group-hover:text-slate-900'
                                                            }`}
                                                    >
                                                        {indicator.title}
                                                    </span>
                                                </div>

                                                {/* Meta Info Trigger */}
                                                <div
                                                    className="p-1 hover:bg-slate-100 rounded-none transition-colors"
                                                    title="Spesifikasi Metadata Indikator"
                                                >
                                                    <Info size={14} className="text-slate-400 group-hover:text-teal-600" />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 px-4 select-none">
                        <div className="w-12 h-12 rounded-none bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-200">
                            <Search size={20} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[12px] font-bold text-slate-700">Indikator Tidak Ditemukan</p>
                            <p className="text-[11px] text-slate-500 font-normal">Periksa kembali kata kunci pencarian Anda</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}