"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    Search,
    MapPin,
    Building2,
    ChevronDown,
    CheckSquare,
    Square
} from "lucide-react";
import { useExplorerStore } from "../../store/useExplorerStore";

interface DynamicCategory {
    type: string;
    label: string;
    color: string;
}

interface DynamicOpdTaxonomy {
    opdKey: string;
    opdName: string;
    categories: DynamicCategory[];
}

export default function AssetPanel() {
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedOpd, setExpandedOpd] = useState<string | null>(null);
    const [dbAssets, setDbAssets] = useState<Record<string, any[]>>({});
    const [isLoading, setIsLoading] = useState(true);

    const activeAssetLayers = useExplorerStore((state) => state.activeAssetLayers);
    const toggleAssetLayer = useExplorerStore((state) => state.toggleAssetLayer);
    const toggleOpdAssets = useExplorerStore((state) => state.toggleOpdAssets);

    const safeActiveLayers = activeAssetLayers || [];

    // Mengambil data spasial aktif langsung dari database lokal [Fase 5 Ready]
    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);

        // Simulasi database internal: pre-loaded assets untuk Bapak Darius [5]
        const mockDbAssets: Record<string, any[]> = {
            "dinas_kesehatan": [
                { id: 101, name: "RSUD Mimika", type: "Rumah Sakit", lat: -4.5448, lng: 136.8870, config: { color: "#EF4444", iconUrl: "/icons/markers/hospital.svg" } },
                { id: 102, name: "Puskesmas Hoya", type: "Puskesmas", lat: -4.1200, lng: 137.4500, config: { color: "#F97316", iconUrl: "/icons/markers/clinic.svg" } }
            ],
            "dinas_pendidikan": [
                { id: 201, name: "SD Inpres Nawaripi", type: "Gedung Sekolah", lat: -4.5710, lng: 136.8920, config: { color: "#10B981", iconUrl: "/icons/markers/school.svg" } }
            ],
            "dinas_pupr": [
                { id: 301, name: "Jembatan Gantung Hoya", type: "Infrastruktur", lat: -4.1350, lng: 137.4650, config: { color: "#64748B", iconUrl: "/icons/markers/bridge.svg" } },
                { id: 302, name: "Proyek Hotmix Jalan Agimuga", type: "Infrastruktur", lat: -4.7800, lng: 137.3500, config: { color: "#64748B", iconUrl: "/icons/markers/bridge.svg" } }
            ]
        };

        const simulateDelay = setTimeout(() => {
            if (isMounted) {
                setDbAssets(mockDbAssets);
                // Buka otomatis akordion rumpun dinas pertama yang bermuatan data
                const firstOpdKey = Object.keys(mockDbAssets)[0];
                if (firstOpdKey) {
                    setExpandedOpd(firstOpdKey);
                }
                setIsLoading(false);
            }
        }, 150);

        return () => {
            isMounted = false;
            clearTimeout(simulateDelay);
        };
    }, []);

    // Memetakan struktur data lokal menjadi taksonomi dinamis ter-agregasi
    const dynamicTaxonomy = useMemo((): DynamicOpdTaxonomy[] => {
        const opdNamesMap: Record<string, string> = {
            "dinas_kesehatan": "Dinas Kesehatan",
            "dinas_pendidikan": "Dinas Pendidikan",
            "dinas_pupr": "Dinas Pekerjaan Umum & PR"
        };

        return Object.keys(dbAssets).map((opdKey) => {
            const assets = dbAssets[opdKey] || [];
            const categoryMap = new Map<string, DynamicCategory>();

            assets.forEach((asset) => {
                if (asset.type && !categoryMap.has(asset.type)) {
                    categoryMap.set(asset.type, {
                        type: asset.type,
                        label: asset.type,
                        color: asset.config?.color || "#0071bc"
                    });
                }
            });

            const resolvedOpdName = opdNamesMap[opdKey] || opdKey.replace(/_/g, " ").toUpperCase();

            return {
                opdKey,
                opdName: resolvedOpdName,
                categories: Array.from(categoryMap.values())
            };
        });
    }, [dbAssets]);

    // Filter pencarian taksonomi berdasarkan kata kunci
    const filteredTaxonomy = useMemo(() => {
        if (!searchQuery) return dynamicTaxonomy;
        const lowerQuery = searchQuery.toLowerCase();

        return dynamicTaxonomy.filter(opd =>
            opd.opdName.toLowerCase().includes(lowerQuery) ||
            opd.categories.some(cat => cat.label.toLowerCase().includes(lowerQuery))
        );
    }, [searchQuery, dynamicTaxonomy]);

    return (
        <div className="flex flex-col h-full bg-white pb-10 text-slate-800">

            {/* SEKSI SEARCH BAR */}
            <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 sticky top-0 z-10 shadow-sm">
                <div className="relative group">
                    <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors"
                        size={14}
                    />
                    <input
                        type="text"
                        placeholder="Cari jenis aset atau instansi..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-none py-1.5 pl-8 pr-3 text-[12px] font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                    />
                </div>
            </div>

            {/* SEKSI KATALOG DATA ASET */}
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">

                {/* Header Petunjuk */}
                <div className="px-4 py-3 bg-teal-50/50 border-b border-slate-200 flex items-start gap-2.5 select-none">
                    <MapPin size={14} className="text-teal-600 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-slate-600 leading-relaxed font-medium text-justify">
                        Nyalakan sakelar untuk menampilkan sebaran titik fisik aset daerah Kabupaten Mimika di atas peta. Titik di-cluster secara otomatis.
                    </p>
                </div>

                {isLoading ? (
                    /* Loading Skeletons */
                    <div className="flex flex-col select-none">
                        {[1, 2, 3].map((n) => (
                            <div key={n} className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/30 animate-pulse">
                                <div className="h-4 bg-slate-200 w-1/2 rounded-sm" />
                                <div className="h-4 bg-slate-200 w-6 rounded-sm" />
                            </div>
                        ))}
                    </div>
                ) : filteredTaxonomy.length > 0 ? (
                    filteredTaxonomy.map((opd) => {
                        const isExpanded = expandedOpd === opd.opdKey;
                        const opdLayerIds = opd.categories.map(c => `${opd.opdKey}::${c.type}`);

                        const isAllActive = opdLayerIds.length > 0 && opdLayerIds.every(id => safeActiveLayers.includes(id));
                        const isSomeActive = opdLayerIds.some(id => safeActiveLayers.includes(id)) && !isAllActive;

                        return (
                            <div key={opd.opdKey} className="flex flex-col border-b border-slate-100">

                                {/* Rumpun OPD Header */}
                                <div className="flex items-center justify-between bg-slate-50 px-4 py-2 border-b border-slate-200 transition-colors select-none">
                                    <button
                                        className="flex items-center gap-2 flex-1 text-left cursor-pointer"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setExpandedOpd(isExpanded ? null : opd.opdKey);
                                        }}
                                    >
                                        <ChevronDown
                                            size={14}
                                            className={`text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                                        />
                                        <Building2 size={13} className="text-teal-700 shrink-0" />
                                        <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider truncate">
                                            {opd.opdName}
                                        </h4>
                                    </button>

                                    {/* Master Toggle */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            toggleOpdAssets(opd.opdKey, opd.categories.map(c => c.type), !isAllActive);
                                        }}
                                        className="ml-2 text-teal-600 hover:text-teal-850 active:scale-95 transition-transform cursor-pointer"
                                        title={isAllActive ? "Matikan Semua" : "Nyalakan Semua"}
                                    >
                                        {isAllActive ? (
                                            <CheckSquare size={15} />
                                        ) : isSomeActive ? (
                                            <div className="w-3.75 h-3.75 border-2 border-teal-600 flex items-center justify-center rounded-xs bg-white">
                                                <div className="w-1.5 h-1.5 bg-teal-600" />
                                            </div>
                                        ) : (
                                            <Square size={15} className="text-slate-300" />
                                        )}
                                    </button>
                                </div>

                                {/* List Kategori Aset di dalam OPD (Flush List) */}
                                {isExpanded && (
                                    <div className="flex flex-col bg-white animate-in slide-in-from-top-1 duration-150">
                                        {opd.categories.map((cat) => {
                                            const layerId = `${opd.opdKey}::${cat.type}`;
                                            const isActive = safeActiveLayers.includes(layerId);

                                            return (
                                                <button
                                                    key={layerId}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        toggleAssetLayer(opd.opdKey, cat.type);
                                                    }}
                                                    className={`group flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-white hover:bg-slate-50/50 transition-colors text-left w-full cursor-pointer ${isActive ? "bg-teal-50/10" : ""
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {/* Toggle Switch */}
                                                        <div
                                                            className={`relative inline-flex h-3.5 w-7 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out ${isActive ? 'bg-teal-500' : 'bg-slate-300'}`}
                                                        >
                                                            <span
                                                                className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${isActive ? 'translate-x-3.5' : 'translate-x-0.5'}`}
                                                            />
                                                        </div>

                                                        {/* Label Aset */}
                                                        <span
                                                            className={`text-[11px] transition-colors ${isActive
                                                                ? 'text-teal-800 font-bold'
                                                                : 'text-slate-600 font-medium group-hover:text-slate-900'
                                                                }`}
                                                        >
                                                            {cat.label}
                                                        </span>
                                                    </div>

                                                    {/* Pin Color Circle */}
                                                    <div className="p-1 flex items-center">
                                                        <div
                                                            className="w-3 h-3 rounded-full shadow-sm"
                                                            style={{ backgroundColor: cat.color }}
                                                            title={`Warna Marker: ${cat.label}`}
                                                        />
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
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
                            <p className="text-[12px] font-bold text-slate-700">Aset Tidak Ditemukan</p>
                            <p className="text-[11px] text-slate-500 font-normal">Coba gunakan kata kunci pencarian yang lain.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}