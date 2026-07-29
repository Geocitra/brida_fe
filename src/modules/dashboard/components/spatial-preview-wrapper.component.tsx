import React, { useState, useEffect } from 'react';
import { Maximize2, Map, Shield, Radio, Activity } from 'lucide-react';
import { SpatialMap, type MapLocationPoint } from '../components/spatial-map.component';

interface SpatialPreviewWrapperProps {
    locations: MapLocationPoint[];
    onNavigate: (route: string) => void;
}

export const SpatialPreviewWrapper: React.FC<SpatialPreviewWrapperProps> = ({
    locations,
    onNavigate,
}) => {
    const [isActivated, setIsActivated] = useState(false);
    const [isTouchDevice, setIsTouchDevice] = useState(false);

    // Deteksi kapabilitas sentuh perangkat keras secara dinamis
    useEffect(() => {
        const checkTouch = () => {
            setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
        };
        checkTouch();
    }, []);

    // Perilaku Klik/Tap adaptif (Protected Variations)
    const handleInteractiveClick = (e: React.MouseEvent) => {
        if (isTouchDevice) {
            e.preventDefault();
            e.stopPropagation();
            if (!isActivated) {
                setIsActivated(true); // Sentuhan ke-1: Aktifkan Overlay di iPad/Tablet
            } else {
                onNavigate('gis-explorer'); // Sentuhan ke-2: Navigasi masuk penuh
            }
        } else {
            onNavigate('gis-explorer'); // Desktop: Klik langsung mengalihkan
        }
    };

    const handleMouseLeave = () => {
        if (!isTouchDevice) {
            setIsActivated(false);
        }
    };

    return (
        <div className="w-full py-1 flex flex-col rounded-none font-roboto select-none">

            {/* 1. HEADER SEKSI: Gaya Dashboard Kebijakan */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4 mb-4">
                <div className="space-y-1">
                    <span className="text-[10px] font-bold tracking-widest text-teal-800 uppercase flex items-center gap-1.5">
                        <Radio size={12} className="text-teal-700 animate-pulse" />
                        <span>Satelit Spasial & Pemetaan Wilayah</span>
                    </span>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                        Pratinjau Peta Sebaran Wilayah
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                        Sistem PostGIS Spatial Engine pemantauan logistik fisik dan indikator pembangunan daerah.
                    </p>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-teal-50 border border-teal-200 text-teal-800 shrink-0 self-start sm:self-auto flex items-center gap-1.5">
                    <Activity size={12} className="text-teal-700" />
                    <span>PostGIS Active</span>
                </span>
            </div>

            {/* 2. KONSOL PETA PREVIEW (Immersive Light Command Card) */}
            <div
                onClick={handleInteractiveClick}
                onMouseEnter={() => !isTouchDevice && setIsActivated(true)}
                onMouseLeave={handleMouseLeave}
                className="w-full relative overflow-hidden group cursor-pointer border border-slate-300 bg-slate-100"
                style={{ height: '540px' }}
            >
                {/* Render Map dengan Transisi Skala Visual (Tactile Zoom) */}
                <div className={`w-full h-full transition-all duration-700 ease-out ${isActivated ? 'scale-[1.015] blur-[1.5px] opacity-75' : 'scale-100'
                    }`}>
                    <SpatialMap locations={locations} />
                </div>

                {/* INSTRUMEN HUD TELEMETRI TERANG (Hanya Tampil saat Peta Normal) */}
                <div className={`absolute inset-x-0 top-0 p-4 flex justify-between items-start pointer-events-none transition-all duration-300 z-10 ${isActivated ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'
                    }`}>
                    {/* Pojok Kiri Atas: Status Satelit */}
                    <div className="bg-white/95 backdrop-blur-md border border-slate-300 px-3 py-1.5 font-mono text-[9px] text-teal-800 font-bold flex items-center gap-2 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-ping" />
                        <span>GPS LOCK: 4°32'S 136°53'E</span>
                    </div>

                    {/* Pojok Kanan Atas: Proyeksi EPSG */}
                    <div className="bg-white/95 backdrop-blur-md border border-slate-300 px-3 py-1.5 font-mono text-[9px] text-slate-700 font-bold flex items-center gap-1.5 shadow-sm">
                        <Shield size={10} className="text-teal-600" />
                        <span>EPSG:32753 (WGS 84 / UTM 53S)</span>
                    </div>
                </div>

                {/* INSTRUMEN HUD TELEMETRI BAWAH TERANG */}
                <div className={`absolute inset-x-0 bottom-0 p-4 flex justify-between items-end pointer-events-none transition-all duration-300 z-10 ${isActivated ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
                    }`}>
                    <span className="bg-white/95 backdrop-blur-md border border-slate-300 px-3 py-1 text-[9px] font-mono font-bold text-slate-600 shadow-sm">
                        BOUNDS: 136.12° - 137.98° E / -4.11° - -5.15° S
                    </span>
                    <span className="bg-teal-50 border border-teal-200 px-3 py-1 text-[9px] font-bold text-teal-800 tracking-wider uppercase select-none shadow-sm">
                        Scale: 1 : 1,250,000
                    </span>
                </div>

                {/* 3. OVERLAY SENSOR KOMANDO (Cinematic Light Backdrop Blur Overlay) */}
                <div className={`absolute inset-0 bg-white/20 backdrop-blur-xs flex items-center justify-center transition-all duration-500 z-20 ${isActivated ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}>
                    {/* Kotak Komando Terang (High Contrast Light Card) */}
                    <div className={`border border-slate-300 bg-white p-6 flex flex-col items-center justify-center gap-2 max-w-sm text-center relative rounded-none shadow-2xl transition-all duration-500 ${isActivated ? 'translate-y-0 scale-100' : 'translate-y-4 scale-95'
                        }`}>

                        {/* Aksen Siku Sudut Mekanis (Teal Tech-Corner Accents) */}
                        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-teal-600 -translate-x-0.5 -translate-y-0.5" />
                        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-teal-600 translate-x-0.5 -translate-y-0.5" />
                        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-teal-600 -translate-x-0.5 translate-y-0.5" />
                        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-teal-600 translate-x-0.5 translate-y-0.5" />

                        {/* Ikon Radar Komando Terang */}
                        <div className="p-3 bg-teal-50 border border-teal-200 rounded-none mb-1 text-teal-700">
                            <Map size={20} className="animate-pulse" />
                        </div>

                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-teal-800 select-none">
                            Command Center Spasial
                        </span>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-1 leading-snug">
                            Pusat Pengendali
                        </h3>

                        <p className="text-[10px] text-slate-600 font-semibold leading-relaxed mb-4 max-w-[280px]">
                            {isTouchDevice
                                ? "Ketuk sekali lagi pada layar atau lencana di bawah untuk masuk Pusat Pengendali Spasial penuh."
                                : "Klik di mana saja untuk mengaktifkan sistem navigasi spasial interaktif penuh (GFW Command Center)."}
                        </p>

                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onNavigate('gis-explorer');
                            }}
                            className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white text-[10px] font-black uppercase tracking-widest rounded-none inline-flex items-center gap-2 transition-all cursor-pointer border border-teal-800 shadow-md hover:scale-102"
                        >
                            <span>Masuk Command Center</span>
                            <Maximize2 size={11} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SpatialPreviewWrapper;