"use client";

import React from "react";
import {
    Layers,
    Settings2,
    Map as MapIcon,
    Sun,
    Moon,
    Info
} from "lucide-react";
import { useExplorerStore } from "../../store/useExplorerStore";

export default function LayerControl() {
    const {
        mapOpacity,
        setMapOpacity,
        activeBaseMap,
        setActiveBaseMap
    } = useExplorerStore();

    // Galeri Basemap dengan deskripsi taksonomi yang komprehensif
    const baseMaps = [
        {
            id: "satellite",
            label: "Google Satellite",
            icon: Sun,
            desc: "Citra Google Resolusi Tinggi (Default)"
        },
        {
            id: "street",
            label: "Google Roadmap",
            icon: MapIcon,
            desc: "Navigasi Standar Vektor Jalan & Batas Kota"
        },
        {
            id: "dark",
            label: "Carto Dark",
            icon: Moon,
            desc: "Kanvas Gelap untuk Kontras Tematik Poligon"
        },
        {
            id: "esri",
            label: "Esri Imagery",
            icon: MapIcon,
            desc: "Citra Raster Satelit Esri Alternatif"
        },
        {
            id: "osm",
            label: "OpenStreetMap",
            icon: Layers,
            desc: "Peta Komunitas Global Berbasis Vektor"
        },
    ];

    return (
        <div className="flex flex-col h-full pb-10 bg-white text-slate-800">

            {/* SEKSI 1: BASEMAP GALLERY (Flush List Tanpa Cards) */}
            <div className="flex flex-col">
                {/* Header Rapat & Solid */}
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-200 text-slate-500 select-none">
                    <Layers size={14} className="text-teal-700" />
                    <h4 className="text-[11px] font-bold uppercase tracking-wider">Basemap Gallery</h4>
                </div>

                {/* List Items dengan Custom Toggle Switch */}
                <div className="flex flex-col bg-white">
                    {baseMaps.map((map) => {
                        const isActive = activeBaseMap === map.id;

                        return (
                            <button
                                key={map.id}
                                onClick={() => setActiveBaseMap(map.id)}
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

                                    {/* Label Teks Basemap */}
                                    <div className="flex items-center gap-2.5">
                                        <div className={`transition-colors ${isActive ? "text-teal-700" : "text-slate-400 group-hover:text-slate-600"}`}>
                                            <map.icon size={16} strokeWidth={2} />
                                        </div>
                                        <div className="flex flex-col select-none">
                                            <span
                                                className={`text-[12px] leading-tight transition-colors ${isActive
                                                    ? 'text-teal-800 font-bold'
                                                    : 'text-slate-700 font-medium group-hover:text-slate-900'
                                                    }`}
                                            >
                                                {map.label}
                                            </span>
                                            <span className="text-[10px] font-medium text-slate-400 mt-0.5">{map.desc}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Info Trigger */}
                                <div
                                    className="p-1 hover:bg-slate-100 rounded-none transition-colors"
                                    title="Detail Spesifikasi Sumber Basemap"
                                >
                                    <Info size={14} className="text-slate-400 group-hover:text-teal-600" />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* SEKSI 2: OPACITY SLIDER (Pengatur Transparansi Poligon) */}
            <div className="flex flex-col">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200 select-none">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Settings2 size={14} className="text-teal-700" />
                        <h4 className="text-[11px] font-bold uppercase tracking-wider">Opacity Control</h4>
                    </div>
                    <span className="text-[10px] font-bold text-teal-800 font-mono bg-teal-50 px-1.5 py-0.5 border border-teal-100">
                        {mapOpacity}%
                    </span>
                </div>

                {/* Input Slider Standard Accent */}
                <div className="px-4 py-3 border-b border-slate-200 bg-white space-y-2 select-none">
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={mapOpacity}
                        onChange={(e) => setMapOpacity(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-none appearance-none cursor-pointer accent-teal-600"
                    />
                    <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>Transparan</span>
                        <span>Solid (Penuh)</span>
                    </div>
                </div>
            </div>

            {/* SEKSI 3: INFORMASI METADATA KONTEKS LAYER */}
            <div className="flex flex-col px-4 py-4 gap-1.5 bg-white border-b border-slate-200 text-left select-none">
                <div className="flex items-center gap-2 text-slate-400">
                    <Info size={14} strokeWidth={2} />
                    <h4 className="text-[11px] font-bold uppercase tracking-wider">Ketentuan Penggunaan</h4>
                </div>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed text-justify">
                    Tingkat ketebalan (*opacity*) murni hanya memengaruhi rendering visual peta tematik poligon (*Choropleth*) di layar Bapak Darius untuk memudahkan komparasi wilayah.
                </p>
            </div>

        </div>
    );
}