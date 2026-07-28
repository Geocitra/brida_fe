"use client";

import React, { useEffect, useState, useMemo } from "react";
import { X, Map as MapIcon, TrendingUp } from "lucide-react";
import { useExplorerStore, type ExplorerPanelType } from "../store/useExplorerStore";
import { getSemanticColor } from "../utils/gisUtils";

// ============================================================================
// IMPORTS PANELS (Sektor Drawer Modular)
// Semua diimpor dari sub-folder panels lokal [Fase 3 & 5 Ready]
// ============================================================================
import DetailPanel from "./panels/DetailPanel";
import LayerControl from "./panels/LayerControl";
import AboutPanel from "./panels/AboutPanel";
import AssetDetailPanel from "./panels/AssetDetailPanel";
import DistrictListPanel from "./panels/DistrictListPanel";

// ============================================================================
// HELPER: RENDERER DISTRIBUTOR (Information Expert)
// Mendistribusikan data ke komponen panel yang sesuai secara modular
// ============================================================================
function renderPanelContent(
    type: ExplorerPanelType,
    data: any,
    panelId: string,
    closePanel: (id: string) => void
) {
    switch (type) {
        case "katalog-wilayah":
            return <DistrictListPanel />;
        case "detil-distrik":
            return <DetailPanel districtId={data?.id || 0} districtName={data?.name || "Unknown"} panelId={panelId} />;
        case "detil-aset":
            return <AssetDetailPanel assetData={data} panelId={panelId} />;
        case "konfigurasi":
            return <LayerControl />;
        case "tentang":
            return <AboutPanel />;
        case "hasil-pencarian":
            return (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-3 text-slate-400 p-4 select-none">
                    <MapIcon size={32} className="text-teal-600/40" />
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Modul Pencarian</p>
                        <p className="text-[11px] text-slate-600 mt-1">Fitur pencarian spasial sedang dalam tahap integrasi.</p>
                    </div>
                </div>
            );
        default:
            return <div className="text-slate-500 text-[11px] p-4 font-bold italic">Komponen panel belum didefinisikan.</div>;
    }
}

// ============================================================================
// COMPONENT MAIN: PanelOrchestrator (The Stacking Drawer Orchestrator)
// ============================================================================
export default function PanelOrchestrator() {
    const { activePanels, closePanel, closePanelsToTheRight, activeIndicator } = useExplorerStore();
    const [isMobile, setIsMobile] = useState(false);

    // Deteksi dimensi layar untuk mengamankan responsivitas seluler (Responsive Guard)
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Sumbu X: Dimensi lebar panel diatur statis 280px (Ultra-Slim GFW Style)
    const PANEL_WIDTH = isMobile ? (typeof window !== 'undefined' ? window.innerWidth - 32 : 280) : 280;
    const PANEL_GAP = 0;

    return (
        <div className="relative h-full w-full flex items-start pointer-events-none z-30">

            {/* =====================================================================
                1. SISTEM PERGESERAN & FLOATING PANEL (DOCKING CHASSIS)
                ====================================================================== */}
            {activePanels.map((panel, index) => {
                // Panel detail diklasifikasikan sebagai melayang (floating), menu biasa sebagai merapat (docked)
                const isFloating = panel.type === "detil-distrik" || panel.type === "detil-aset";

                // Jarak geser horizontal untuk panel yang menempel berurutan
                const xOffset = index * (PANEL_WIDTH + PANEL_GAP);

                // Koordinat kiri melayang untuk panel detail
                const floatingLeft = isMobile ? 16 : (index * PANEL_WIDTH) + 16;

                return (
                    <div
                        key={panel.id}
                        className={`absolute pointer-events-auto transition-all duration-300 ease-in-out ${isFloating ? 'shadow-lg border border-slate-200' : 'border-r border-slate-200 shadow-none'
                            }`}
                        style={isFloating ? {
                            left: `${floatingLeft}px`,
                            top: '16px',
                            bottom: '16px',
                            width: '280px',
                            maxWidth: 'calc(100vw - 32px)',
                            zIndex: 50,
                        } : {
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: `${PANEL_WIDTH}px`,
                            maxWidth: 'calc(100vw - 32px)',
                            transform: `translateX(${xOffset}px)`,
                            zIndex: 40 - index,
                        }}
                    >
                        <div className="bg-white h-full w-full rounded-none flex flex-col overflow-hidden">

                            {/* Header Panel (Hanya dirender pada menu biasa, panel detail memiliki header internal) */}
                            {!isFloating && (
                                <div className="px-3 py-2 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
                                    <div className="flex flex-col text-left">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none">
                                            {panel.type.replace("-", " ")}
                                        </span>
                                        <h3 className="text-[11px] font-medium text-slate-800 truncate max-w-50 tracking-tight mt-0.5">
                                            {panel.title}
                                        </h3>
                                    </div>

                                    <button
                                        onClick={() => closePanel(panel.id)}
                                        className="p-1 rounded-none bg-transparent hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors active:scale-95 cursor-pointer"
                                    >
                                        <X size={14} strokeWidth={2.5} />
                                    </button>
                                </div>
                            )}

                            {/* BODY CONTENT AREA (Mendukung scrollbar tipis kustom) */}
                            <div
                                className="flex-1 overflow-y-auto custom-scrollbar"
                                onClick={() => !isFloating && closePanelsToTheRight(index)}
                            >
                                {renderPanelContent(panel.type, panel.data, panel.id, closePanel)}
                            </div>

                        </div>
                    </div>
                );
            })}

            {/* =====================================================================
                2. LEGENDA DINAMIS PETA (ULTRA-COMPACT CONTINUOUS COLOR RAMP - PILAR 1)
                ====================================================================== */}
            {activeIndicator && <MapLegend indicatorKey={activeIndicator} />}

        </div>
    );
}

/**
 * [REFACTOR - PILAR 1]
 * Komponen Legenda Peta (Continuous Color Ramp)
 * Menampilkan pita warna bergradasi linier utuh hasil interpolasi matematis database.
 */
function MapLegend({ indicatorKey }: { indicatorKey: string }) {
    const activeMin = useExplorerStore((state) => state.activeMin);
    const activeMax = useExplorerStore((state) => state.activeMax);
    const activeUnit = useExplorerStore((state) => state.activeUnit);

    // Format string nama indikator agar ramah pembaca
    const formattedTitle = indicatorKey
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    const minVal = activeMin ?? 0;
    const maxVal = activeMax ?? 100;
    const unitText = activeUnit || "";

    // Kalkulasi gradasi linier dinamis (Equal Interval 5-Step)
    const gradientStyle = useMemo(() => {
        const sampleRatios = [0.0, 0.25, 0.5, 0.75, 1.0];
        const colors = sampleRatios.map((ratio) => {
            const calculatedVal = minVal + (ratio * (maxVal - minVal));
            return getSemanticColor(calculatedVal, minVal, maxVal, indicatorKey);
        });
        return `linear-gradient(to right, ${colors.join(", ")})`;
    }, [minVal, maxVal, indicatorKey]);

    return (
        <div className="fixed bottom-8 right-19.5 pointer-events-auto z-50 bg-white border border-slate-200 shadow-lg w-56 rounded-none animate-in fade-in slide-in-from-bottom-4 text-slate-800">

            {/* Header Legenda */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200 select-none">
                <div className="flex items-center gap-1.5">
                    <MapIcon size={12} className="text-teal-700" />
                    <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-wider truncate">
                        Legenda Peta
                    </h4>
                </div>
            </div>

            {/* Konten Utama Gradasi */}
            <div className="p-3.5 flex flex-col gap-3">
                <div className="space-y-0.5 text-left select-none">
                    <h5 className="text-[11px] font-bold text-slate-800 leading-tight line-clamp-2 uppercase tracking-wide">
                        {formattedTitle}
                    </h5>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                        Tingkat Sebaran Data Sektoral
                    </p>
                </div>

                {/* Batang Warna Gradasi Tanpa Sekat */}
                <div className="space-y-2">
                    <div
                        className="h-2 w-full border border-slate-200/50 shadow-inner"
                        style={{ background: gradientStyle }}
                    />

                    {/* Jangkar Batas Nominal Terendah vs Tertinggi */}
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 font-mono select-none">
                        <div className="flex flex-col text-left">
                            <span>{minVal.toLocaleString('id-ID')}{unitText}</span>
                            <span className="text-[8px] text-slate-400 font-sans uppercase tracking-wider">Terendah</span>
                        </div>
                        <div className="flex flex-col text-right">
                            <span>{maxVal.toLocaleString('id-ID')}{unitText}</span>
                            <span className="text-[8px] text-slate-400 font-sans uppercase tracking-wider">Tertinggi</span>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}