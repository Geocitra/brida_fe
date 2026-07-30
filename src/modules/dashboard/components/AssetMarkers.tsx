"use client";

import React, { useMemo, useEffect, useState } from "react";
import { Marker, Tooltip } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import { useExplorerStore } from "../store/useExplorerStore";

// ============================================================================
// PURE FABRICATION: GENERATOR PENANDA KUSTOM PIN & KLASTER DINAMIS
// Menolak dependensi icon PNG bawaan Leaflet untuk melompati bug pathing di Vite
// ============================================================================

// Generator Pin individual berbasis warna & icon backend
const createCustomPin = (iconUrl: string, color: string) => {
    return L.divIcon({
        className: "custom-pin-icon bg-transparent border-none",
        html: `
            <div style="display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 4px 3px rgb(0 0 0 / 0.3)); transform: translate(-50%, -100%); width: 32px;">
                <div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50% !important; border: 2px solid white; display: flex; align-items: center; justify-content: center; z-index: 2;">
                    <img src="${iconUrl}" style="width: 14px; height: 14px; filter: brightness(0) invert(1);" alt="pin-icon" onerror="this.style.display='none'" />
                </div>
                <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid ${color}; margin-top: -2px; z-index: 1;"></div>
            </div>
        `,
        iconSize: [32, 40],
        iconAnchor: [0, 0],
        popupAnchor: [0, -40],
    });
};

// Generator Pin Klaster Spasial (Marker Cluster)
const createClusterCustomIcon = function (cluster: any) {
    const count = cluster.getChildCount();

    let size = 'w-10 h-10';
    if (count < 10) size = 'w-8 h-8';
    else if (count > 20) size = 'w-12 h-12';

    return L.divIcon({
        html: `<div class="${size} bg-slate-800 text-white flex items-center justify-center rounded-full border-[3px] border-white shadow-md font-bold text-[12px] ring-2 ring-slate-800/30">
                ${count}
               </div>`,
        className: 'custom-cluster-icon bg-transparent',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
    });
};

// ============================================================================
// MAIN COMPONENT: AssetMarkers (Renders Spatially Clustered Markers)
// ============================================================================
export default function AssetMarkers() {
    const { activeAssetLayers, openPanel } = useExplorerStore();
    const [dbAssets, setDbAssets] = useState<Record<string, any[]>>({});

    // Memuat data koordinat spasial statis lokal secara instan (Bypass backend sementara)
    useEffect(() => {
        let isMounted = true;

        // Simulasi database internal: pre-loaded assets untuk Bapak Darius [5]
        const mockDbAssets: Record<string, any[]> = {
            "dinas_kesehatan": [
                {
                    id: 101,
                    name: "Rumah Sakit Umum Daerah (RSUD) Mimika",
                    type: "Rumah Sakit",
                    lat: -4.5448,
                    lng: 136.8870,
                    image_url: "/img/mimika%20baru/images.jpg",
                    config: { color: "#EF4444", iconUrl: "/icons/markers/hospital.svg" },
                    details: { "Kapasitas Tempat Tidur": "350 Bed", "Kelas Akreditasi": "Paripurna", "Status Operasional": "Aktif 24 Jam" }
                },
                {
                    id: 102,
                    name: "Puskesmas Hoya",
                    type: "Puskesmas",
                    lat: -4.1200,
                    lng: 137.4500,
                    image_url: "/img/hoya/images.jpg",
                    config: { color: "#F97316", iconUrl: "/icons/markers/clinic.svg" },
                    details: { "Tenaga Medis": "1 Dokter, 3 Perawat", "Fasilitas": "Rawat Jalan", "Kendala": "Hanya dijangkau Helikopter" }
                }
            ],
            "dinas_pendidikan": [
                {
                    id: 201,
                    name: "SD Negeri Inpres Nawaripi",
                    type: "Gedung Sekolah",
                    lat: -4.5710,
                    lng: 136.8920,
                    image_url: "/img/mimika%20baru/Indahhnya-Wisata-Timika.jpg",
                    config: { color: "#10B981", iconUrl: "/icons/markers/school.svg" },
                    details: { "Jumlah Murid": "180 Siswa", "Jumlah Guru": "6 Pengajar", "Status Akreditasi": "B" }
                }
            ],
            "dinas_pupr": [
                {
                    id: 301,
                    name: "Jembatan Gantung Hoya",
                    type: "Infrastruktur",
                    lat: -4.1350,
                    lng: 137.4650,
                    image_url: "/img/hoya/JembatanHoya%20(2).jpg",
                    config: { color: "#64748B", iconUrl: "/icons/markers/bridge.svg" },
                    details: { "Panjang Bentang": "120 Meter", "Target Anggaran": "Rp 16,12 Miliar", "Status Fisik": "Pengurangan Volume Kontrak" }
                },
                {
                    id: 302,
                    name: "Proyek Hotmix Jalan Agimuga",
                    type: "Infrastruktur",
                    lat: -4.7800,
                    lng: 137.3500,
                    image_url: "/img/agimuga/209.jpg",
                    config: { color: "#64748B", iconUrl: "/icons/markers/bridge.svg" },
                    details: { "Target Pemadatan": "120 Km", "Pekerjaan Aktual": "98 Km", "Status": "Penyesuaian Biaya BBM" }
                }
            ]
        };

        if (isMounted) {
            setDbAssets(mockDbAssets);
        }

        return () => { isMounted = false; };
    }, []);

    // Filter data koordinat berbasis taksonomi layer aktif di Sidebar O(M)
    const visibleMarkers = useMemo(() => {
        if (!activeAssetLayers || activeAssetLayers.length === 0) return [];
        if (Object.keys(dbAssets).length === 0) return [];

        const markers: any[] = [];

        Object.keys(dbAssets).forEach(opdKey => {
            const assets = dbAssets[opdKey] || [];

            assets.forEach(asset => {
                const layerId = `${opdKey}::${asset.type}`;

                // Jika kategori layer dicentang aktif oleh Bapak Darius, muat ke peta
                if (activeAssetLayers.includes(layerId)) {
                    markers.push(asset);
                }
            });
        });

        return markers;
    }, [activeAssetLayers, dbAssets]);

    if (visibleMarkers.length === 0) {
        return null;
    }

    const SafeMarkerClusterGroup = MarkerClusterGroup as any;
    const SafeMarker = Marker as any;
    const SafeTooltip = Tooltip as any;

    return (
        <SafeMarkerClusterGroup
            chunkedLoading
            iconCreateFunction={createClusterCustomIcon}
            showCoverageOnHover={false}
            maxClusterRadius={45}
            spiderfyOnMaxZoom={true}
        >
            {visibleMarkers.map((marker, index) => {
                const markerColor = marker.config?.color || "#0071bc";
                const markerIconUrl = marker.config?.iconUrl || "/icons/markers/office.svg";

                const primaryImage = marker.image_url || null;
                const details = marker.details || {};
                const hasDetails = Object.keys(details).length > 0;

                return (
                    <SafeMarker
                        key={`${marker.id}-${index}`}
                        position={[marker.lat, marker.lng]}
                        icon={createCustomPin(markerIconUrl, markerColor)}
                        eventHandlers={{
                            click: (e: any) => {
                                e.originalEvent.stopPropagation();
                                openPanel("detil-aset", marker.name, marker);
                            }
                        }}
                    >
                        {/* RICH HOVER TOOLTIP KARTU ASET (FRAMELESS) */}
                        <SafeTooltip
                            direction="top"
                            offset={[0, -25]}
                            opacity={1}
                            sticky={true}
                            className="p-0! border-none! bg-transparent! shadow-none! rounded-none!"
                        >
                            <div className="w-64 bg-white border border-slate-200 shadow-2xl p-0 overflow-hidden flex flex-col font-sans text-slate-800 rounded-none">
                                {/* Thumbnail Image Header */}
                                {primaryImage && (
                                    <div className="relative w-full h-24 shrink-0 bg-slate-100 overflow-hidden">
                                        <img
                                            src={primaryImage}
                                            alt=""
                                            className="w-full h-full object-cover"
                                            draggable={false}
                                        />
                                    </div>
                                )}

                                <div className="p-3.5 flex flex-col gap-2">
                                    {/* Identitas Aset */}
                                    <div className="flex flex-col">
                                        <span
                                            className="text-[9px] font-black uppercase tracking-widest leading-none mb-1"
                                            style={{ color: markerColor }}
                                        >
                                            {marker.type || "Aset Daerah"}
                                        </span>
                                        <h4 className="text-xs font-bold text-slate-900 leading-tight">
                                            {marker.name}
                                        </h4>
                                    </div>

                                    {/* Dynamic Metadata JSON Table */}
                                    {hasDetails ? (
                                        <div className="flex flex-col gap-1 text-[10px] font-medium border-t border-slate-100 pt-2 text-slate-500">
                                            {Object.entries(details).slice(0, 3).map(([key, value], idx) => (
                                                <div key={idx} className="flex justify-between items-center gap-2">
                                                    <span className="uppercase tracking-wider text-[8px] font-black text-slate-400 truncate max-w-22.5">
                                                        {key}:
                                                    </span>
                                                    <span className="text-slate-700 truncate max-w-32.5 font-bold">
                                                        {value as React.ReactNode}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-[9px] font-bold text-slate-400 italic border-t border-slate-100 pt-2 text-center tracking-wide">
                                            Belum ada spesifikasi khusus
                                        </p>
                                    )}
                                </div>
                            </div>
                        </SafeTooltip>
                    </SafeMarker>
                );
            })}
        </SafeMarkerClusterGroup>
    );
}