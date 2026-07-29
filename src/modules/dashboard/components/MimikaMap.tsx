"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, Polygon, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useExplorerStore } from '../store/useExplorerStore';
import { getSemanticColor, getSectoralStatus } from '../utils/gisUtils';
import AssetMarkers from "./AssetMarkers";

import type { LatLngExpression, PathOptions, Layer } from 'leaflet';

// ============================================================================
// REGISTRY: Kamus ID Distrik Kabupaten Mimika
// ============================================================================
const DISTRICT_MAP: Record<string, number> = {
    "mimikabaru": 1, "kualakencana": 2, "tembagapura": 3, "wania": 4, "iwaka": 5,
    "kwamkinarama": 6, "mimikatimur": 7, "mimikatengah": 8, "mimikabarat": 9,
    "agimuga": 10, "jila": 11, "jita": 12, "mimikatimurjauh": 13, "mimikabaratjauh": 14,
    "mimikabarattengah": 15, "amar": 16, "hoya": 17, "alama": 18
};

// ============================================================================
// SELF-CONTAINED STATIC CACHE: Profil Faktual 18 Distrik Mimika
// Menjamin performa tinggi dan rendering tooltip instan bebas lag [Fase 5]
// ============================================================================
const MOCK_DISTRICT_PROFILES: Record<number, {
    luas_wilayah: number;
    jumlah_penduduk: number;
    deskripsi: string;
    batas_wilayah: string;
    images: string[];
}> = {
    1: {
        luas_wilayah: 2216,
        jumlah_penduduk: 142000,
        deskripsi: "Distrik Mimika Baru merupakan pusat pemerintahan dan ekonomi Kabupaten Mimika (Kota Timika). Memiliki kepadatan penduduk tertinggi dengan aktivitas perdagangan dan jasa yang sangat dinamis.",
        batas_wilayah: "Utara: Kuala Kencana, Selatan: Wania, Barat: Iwaka, Timur: Mimika Timur",
        images: ["https://picsum.photos/seed/mimika-baru/320/180"]
    },
    2: {
        luas_wilayah: 840,
        jumlah_penduduk: 28000,
        deskripsi: "Distrik Kuala Kencana merupakan kawasan pemukiman modern dan pusat administratif operasional PT Freeport Indonesia di dataran rendah. Dirancang dengan konsep kota berwawasan lingkungan.",
        batas_wilayah: "Utara: Tembagapura, Selatan: Mimika Baru, Barat: Iwaka, Timur: Kwamki Narama",
        images: ["https://picsum.photos/seed/kuala-kencana/320/180"]
    },
    3: {
        luas_wilayah: 1452,
        jumlah_penduduk: 23000,
        deskripsi: "Distrik Tembagapura terletak di kawasan pegunungan tinggi Mimika. Wilayah ini merupakan pusat eksplorasi pertambangan mineral tembaga dan emas utama PT Freeport Indonesia.",
        batas_wilayah: "Utara: Kabupaten Puncak, Selatan: Kuala Kencana, Barat: Alama, Timur: Hoya",
        images: ["https://picsum.photos/seed/tembagapura/320/180"]
    },
    4: {
        luas_wilayah: 195,
        jumlah_penduduk: 61000,
        deskripsi: "Distrik Wania merupakan distrik pemekaran dari Mimika Baru yang berkembang pesat sebagai kawasan penyangga pemukiman perkotaan dan pusat sentra industri UMKM masyarakat.",
        batas_wilayah: "Utara: Mimika Baru, Selatan: Mimika Timur, Barat: Iwaka, Timur: Mimika Tengah",
        images: ["https://picsum.photos/seed/wania/320/180"]
    },
    5: {
        luas_wilayah: 742,
        jumlah_penduduk: 12000,
        deskripsi: "Distrik Iwaka didominasi oleh wilayah dataran rendah transisi, perkebunan rakyat, dan area jalur logistik penghubung pelabuhan ke wilayah pertambangan.",
        batas_wilayah: "Utara: Kuala Kencana, Selatan: Amar, Barat: Mimika Barat Tengah, Timur: Mimika Baru",
        images: ["https://picsum.photos/seed/iwaka/320/180"]
    },
    6: {
        luas_wilayah: 45,
        jumlah_penduduk: 15000,
        deskripsi: "Distrik Kwamki Narama merupakan wilayah administratif dengan luas terkecil namun memiliki kepadatan pemukiman adat yang tinggi serta sentra pertanian lokal.",
        batas_wilayah: "Utara: Kuala Kencana, Selatan: Mimika Baru, Barat: Kuala Kencana, Timur: Mimika Tengah",
        images: ["https://picsum.photos/seed/kwamki-narama/320/180"]
    },
    7: {
        luas_wilayah: 211,
        jumlah_penduduk: 11000,
        deskripsi: "Distrik Mimika Timur berpusat di Mapurujaya, merupakan kawasan sejarah pemukiman awal dan penyangga transportasi laut menuju pelabuhan nasional Pomako.",
        batas_wilayah: "Utara: Mimika Baru, Selatan: Laut Arafura, Barat: Wania, Timur: Mimika Timur Jauh",
        images: ["https://picsum.photos/seed/mimika-timur/320/180"]
    },
    8: {
        luas_wilayah: 341,
        jumlah_penduduk: 5500,
        deskripsi: "Distrik Mimika Tengah didominasi wilayah rawa-rawa pesisir pantai dan perkampungan nelayan lokal dengan komoditas perikanan laut yang melimpah.",
        batas_wilayah: "Utara: Kwamki Narama, Selatan: Laut Arafura, Barat: Wania, Timur: Jita",
        images: ["https://picsum.photos/seed/mimika-tengah/320/180"]
    },
    9: {
        luas_wilayah: 1021,
        jumlah_penduduk: 4200,
        deskripsi: "Distrik Mimika Barat berpusat di Kokonao, merupakan salah satu pusat peradaban pendidikan dan misi keagamaan tertua di wilayah pesisir selatan Papua.",
        batas_wilayah: "Utara: Mimika Barat Tengah, Selatan: Laut Arafura, Barat: Mimika Barat Jauh, Timur: Amar",
        images: ["https://picsum.photos/seed/mimika-barat/320/180"]
    },
    10: {
        luas_wilayah: 4124,
        jumlah_penduduk: 3800,
        deskripsi: "Distrik Agimuga merupakan kawasan dataran rendah pesisir luas yang dilalui banyak sungai besar. Fokus pada pembangunan jalan strategis penghubung wilayah timur Mimika.",
        batas_wilayah: "Utara: Jila, Selatan: Laut Arafura, Barat: Jita, Timur: Mimika Timur Jauh",
        images: ["https://picsum.photos/seed/agimuga/320/180"]
    },
    11: {
        luas_wilayah: 6011,
        jumlah_penduduk: 4500,
        deskripsi: "Distrik Jila merupakan wilayah pegunungan dalam yang memiliki bentang geografi sangat menantang dan berbatasan langsung dengan pegunungan tengah Papua.",
        batas_wilayah: "Utara: Kabupaten Puncak, Selatan: Agimuga, Barat: Hoya, Timur: Jita",
        images: ["https://picsum.photos/seed/jila/320/180"]
    },
    12: {
        luas_wilayah: 4121,
        jumlah_penduduk: 2800,
        deskripsi: "Distrik Jita merupakan kawasan pedalaman berawa di timur Mimika yang sangat bergantung pada akses transportasi sungai dan perahu motor sebagai urat nadi logistik.",
        batas_wilayah: "Utara: Jila, Selatan: Laut Arafura, Barat: Mimika Tengah, Timur: Agimuga",
        images: ["https://picsum.photos/seed/jita/320/180"]
    },
    13: {
        luas_wilayah: 2112,
        jumlah_penduduk: 3200,
        deskripsi: "Distrik Mimika Timur Jauh merupakan wilayah pesisir ujung timur Mimika yang berbatasan dengan wilayah Kabupaten Asmat. Mayoritas mata pencaharian penduduk adalah nelayan tradisional.",
        batas_wilayah: "Utara: Agimuga, Selatan: Laut Arafura, Barat: Mimika Timur, Timur: Kabupaten Asmat",
        images: ["https://picsum.photos/seed/mimika-timur-jauh/320/180"]
    },
    14: {
        luas_wilayah: 2122,
        jumlah_penduduk: 2100,
        deskripsi: "Distrik Mimika Barat Jauh berpusat di Ipaya (Kampung Yaraya), memiliki potensi wisata bahari pantai pasir putih dan sentra pengembangan komoditas kelapa rakyat.",
        batas_wilayah: "Utara: Mimika Barat Tengah, Selatan: Laut Arafura, Barat: Kabupaten Kaimana, Timur: Mimika Barat",
        images: ["https://picsum.photos/seed/mimika-barat-jauh/320/180"]
    },
    15: {
        luas_wilayah: 1842,
        jumlah_penduduk: 2400,
        deskripsi: "Distrik Mimika Barat Tengah merupakan distrik pesisir barat penyangga yang menghubungkan sirkulasi logistik perairan antara pelabuhan rakyat Mimika Barat dan Kokonao.",
        batas_wilayah: "Utara: Kabupaten Deiyai, Selatan: Mimika Barat, Barat: Mimika Barat Jauh, Timur: Iwaka",
        images: ["https://picsum.photos/seed/mimika-barat-tengah/320/180"]
    },
    16: {
        luas_wilayah: 1221,
        jumlah_penduduk: 1800,
        deskripsi: "Distrik Amar merupakan wilayah pemekaran pesisir barat yang memfokuskan perekonomian masyarakat pada budidaya perikanan air payau dan pencarian kepiting bakau.",
        batas_wilayah: "Utara: Iwaka, Selatan: Laut Arafura, Barat: Mimika Barat, Timur: Mimika Barat Tengah",
        images: ["https://picsum.photos/seed/amar/320/180"]
    },
    17: {
        luas_wilayah: 2450,
        jumlah_penduduk: 1200,
        deskripsi: "Distrik Hoya terletak di lembah terisolasi pegunungan tengah Mimika. Keterbatasan akses darat membuat distrik ini sangat bergantung pada jembatan gantung perintis dan helikopter logistik.",
        batas_wilayah: "Utara: Kabupaten Intan Jaya, Selatan: Jila, Barat: Tembagapura, Timur: Alama",
        images: ["https://picsum.photos/seed/hoya/320/180"]
    },
    18: {
        luas_wilayah: 4110,
        jumlah_penduduk: 1600,
        deskripsi: "Distrik Alama merupakan distrik paling timur laut di kawasan pegunungan Mimika yang berbatasan dengan wilayah rujukan adat pegunungan tengah.",
        batas_wilayah: "Utara: Kabupaten Lanny Jaya, Selatan: Jita, Barat: Hoya, Timur: Kabupaten Nduga",
        images: ["https://picsum.photos/seed/alama/320/180"]
    }
};

const DEFAULT_CENTER: LatLngExpression = [-4.5421, 136.8945];
const DEFAULT_ZOOM = 8;

interface MimikaMapProps {
    isAtlasMode?: boolean;
    isPreviewMode?: boolean;
    onNavigate?: (route: string) => void; // State-based navigation untuk SPA [Vite Ready]
}

// ============================================================================
// PURE FABRICATION: Kalkulator Dinamis Gaya Poligon (Styling Handler)
// ============================================================================
function calculateLayerStyle(
    districtName: string,
    state: any,
    indicatorValues: Record<string, number> | null,
    minValue: number,
    maxValue: number,
    zoomLevel: number
): PathOptions {
    const key = districtName.toLowerCase().replace(/\s/g, '');
    const isFocused = state.focusedDistrict && state.focusedDistrict.toLowerCase() === districtName.toLowerCase();

    let weight = zoomLevel >= 14 ? 0 : 1;
    let color = state.activeBaseMap === 'dark' ? '#ffffff' : '#000000';
    let dashArray: string | undefined = '2';
    let fillOpacity = zoomLevel >= 14 ? 0 : (state.activeBaseMap === 'dark' ? 0.1 : 0);
    let fillColor = state.activeBaseMap === 'dark' ? '#ffffff' : '#000000';

    if (state.activeIndicator && indicatorValues && indicatorValues[key] !== undefined) {
        fillColor = getSemanticColor(indicatorValues[key], minValue, maxValue, state.activeIndicator);
        fillOpacity = zoomLevel >= 14 ? 0 : (state.mapOpacity / 100);
        color = state.activeBaseMap === 'dark' ? '#000000' : '#ffffff';
        dashArray = undefined;
    }

    if (isFocused) {
        weight = 3;
        color = '#14b8a6'; // Cyan / Teal Accent
        dashArray = undefined;
        if (!state.activeIndicator) {
            fillColor = '#14b8a6';
            fillOpacity = 0.3;
        } else {
            fillOpacity = Math.min((state.mapOpacity / 100) + 0.3, 1);
        }
    } else if (state.focusedDistrict) {
        fillOpacity = 0.05;
        color = state.activeBaseMap === 'dark' ? '#334155' : '#cbd5e1';
        weight = 1;
    }

    return { fillColor, color, weight, fillOpacity, dashArray };
}

function MapEventsHandler({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
    useMapEvents({ zoomend: (e) => onZoomChange(e.target.getZoom()) });
    return null;
}

function ExternalMapController() {
    const map = useMap();
    useEffect(() => {
        const handleZoomIn = () => map.zoomIn();
        const handleZoomOut = () => map.zoomOut();
        const handleResetView = () => map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: true });

        window.addEventListener('map-zoom-in', handleZoomIn);
        window.addEventListener('map-zoom-out', handleZoomOut);
        window.addEventListener('map-reset-view', handleResetView);

        return () => {
            window.removeEventListener('map-zoom-in', handleZoomIn);
            window.removeEventListener('map-zoom-out', handleZoomOut);
            window.removeEventListener('map-reset-view', handleResetView);
        };
    }, [map]);
    return null;
}

// ============================================================================
// CONTROLLER: Cinematic Camera Spotlight & Style Synchronizer
// Memisahkan rendering gaya poligon dari kamera demi mencegah Infinite Loop
// ============================================================================
function CinematicSpotlightController({ geoData, geoJsonRef, indicatorValues, minValue, maxValue, zoomLevel }: any) {
    const map = useMap();

    const focusedDistrict = useExplorerStore((state) => state.focusedDistrict);
    const activeIndicator = useExplorerStore((state) => state.activeIndicator);
    const mapOpacity = useExplorerStore((state) => state.mapOpacity);
    const activeBaseMap = useExplorerStore((state) => state.activeBaseMap);

    // EFEK A: Mengurusi murni sinkronisasi STYLING (Warna, Garis Tepi, Opacity)
    useEffect(() => {
        if (!geoJsonRef.current || !geoData) return;

        const stateSnapshot = { focusedDistrict, activeIndicator, mapOpacity, activeBaseMap };
        const layers = geoJsonRef.current.getLayers();

        layers.forEach((layer: any) => {
            const districtName = layer.feature.properties?.district_name || "";
            const isFocused = focusedDistrict && focusedDistrict.toLowerCase() === districtName.toLowerCase();

            const newStyle = calculateLayerStyle(districtName, stateSnapshot, indicatorValues, minValue, maxValue, zoomLevel);
            layer.setStyle(newStyle);

            if (isFocused) {
                layer.bringToFront();
            }
        });

    }, [focusedDistrict, activeIndicator, mapOpacity, activeBaseMap, zoomLevel, geoData, indicatorValues, minValue, maxValue, geoJsonRef]);

    // EFEK B: Mengurusi murni pergerakan KAMERA (FlyTo)
    useEffect(() => {
        if (!geoJsonRef.current || !geoData) return;

        if (focusedDistrict) {
            const layers = geoJsonRef.current.getLayers();
            const targetLayer = layers.find((layer: any) => {
                const districtName = layer.feature.properties?.district_name || "";
                return districtName.toLowerCase() === focusedDistrict.toLowerCase();
            });

            if (targetLayer) {
                map.flyToBounds(targetLayer.getBounds(), {
                    paddingTopLeft: [380, 20],
                    paddingBottomRight: [20, 20],
                    duration: 1.5
                });
            }
        } else {
            map.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 1.5 });
        }
    }, [focusedDistrict, geoData, geoJsonRef, map]);

    return null;
}

// ============================================================================
// MAIN COMPONENT: MimikaMap (Leaflet Core Engine)
// ============================================================================
export default function MimikaMap({
    isAtlasMode = false,
    isPreviewMode = false,
    onNavigate
}: MimikaMapProps) {
    const { openPanel, setFocusDistrict } = useExplorerStore();

    // State Hover Kursor Global (Store-Driven)
    const hoveredDistrict = useExplorerStore((state) => state.hoveredDistrict);
    const setHoveredDistrict = useExplorerStore((state) => state.setHoveredDistrict);

    const activeMin = useExplorerStore((state) => state.activeMin);
    const activeMax = useExplorerStore((state) => state.activeMax);
    const activeUnit = useExplorerStore((state) => state.activeUnit);
    const activeDirection = useExplorerStore((state) => state.activeDirection);
    const activeIndicator = useExplorerStore((state) => state.activeIndicator);
    const mapOpacity = useExplorerStore((state) => state.mapOpacity);

    const geoJsonRef = useRef<L.GeoJSON>(null);

    const [geoData, setGeoData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM);
    const [mapKey] = useState(Date.now());

    const [indicatorValues, setIndicatorValues] = useState<Record<string, number> | null>(null);
    const [minValue, setMinValue] = useState<number>(0);
    const [maxValue, setMaxValue] = useState<number>(100);

    // Kordinat Melayang Pelacak Mouse Tooltip (Pilar 3)
    const [mouseCoords, setMouseCoords] = useState<{ x: number, y: number }>({ x: 0, y: 0 });

    const indicatorValuesRef = useRef(indicatorValues);
    const minValueRef = useRef(minValue);
    const maxValueRef = useRef(maxValue);

    useEffect(() => { indicatorValuesRef.current = indicatorValues; }, [indicatorValues]);
    useEffect(() => { minValueRef.current = minValue; }, [minValue]);
    useEffect(() => { maxValueRef.current = maxValue; }, [maxValue]);

    // Tracking pergerakan mouse kursor
    const handleMouseMove = (e: MouseEvent) => {
        setMouseCoords({ x: e.clientX, y: e.clientY });
    };

    useEffect(() => {
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    // Memuat Batas Wilayah Poligon GeoJSON Mimika secara lokal
    useEffect(() => {
        const loadMapResources = async () => {
            setLoading(true);
            try {
                const geoRes = await fetch('/mimika_18_distrik.json').then(res => res.json());
                setGeoData(geoRes);
            } catch (error) {
                console.error("Gagal memuat batas koordinat GeoJSON Mimika:", error);
            } finally { setLoading(false); }
        };
        loadMapResources();
    }, []);

    // Simulasi Pengisian Data Poligon Peta secara cerdas & murah saat Indikator aktif [Zero Token]
    useEffect(() => {
        let isMounted = true;
        if (activeIndicator) {
            const generateMockValues = async () => {
                await new Promise(res => setTimeout(res, 200));
                if (!isMounted) return;

                const mockData: Record<string, number> = {};
                Object.keys(DISTRICT_MAP).forEach(k => {
                    mockData[k] = Math.floor(Math.random() * 85) + 15;
                });
                setIndicatorValues(mockData);

                const vals = Object.values(mockData);
                const localMin = vals.length ? Math.min(...vals) : 0;
                const localMax = vals.length ? Math.max(...vals) : 100;
                setMinValue(activeMin ?? localMin);
                setMaxValue(activeMax ?? localMax);
            };
            generateMockValues();
        } else {
            setIndicatorValues(null);
            setMinValue(0);
            setMaxValue(100);
        }
        return () => { isMounted = false; };
    }, [activeIndicator, activeMin, activeMax]);

    // Masking Poligon Luar: Fokus murni wilayah Mimika dengan memblokir peta luar (Gelap Luar)
    const maskingPositions = useMemo(() => {
        if (!geoData) return [];
        const worldBounds: [number, number][] = [[90, -360], [90, 360], [-90, 360], [-90, -360]];
        const holes: [number, number][][] = [];
        geoData.features.forEach((feature: any) => {
            if (feature.geometry.type === 'Polygon') {
                const ring = feature.geometry.coordinates[0].map((c: number[]) => [c[1], c[0]] as [number, number]);
                holes.push(ring);
            } else if (feature.geometry.type === 'MultiPolygon') {
                feature.geometry.coordinates.forEach((poly: any[]) => {
                    const ring = poly[0].map((c: number[]) => [c[1], c[0]] as [number, number]);
                    holes.push(ring);
                });
            }
        });
        return [worldBounds, ...holes];
    }, [geoData]);

    // PENYUSUNAN EVENT HANDLERS SETIAP POLIGON WILAYAH (HOVER & CLICK)
    const onEachFeature = (feature: any, layer: Layer) => {
        const districtName = feature.properties?.district_name || "Unknown";
        const key = districtName.toLowerCase().replace(/\s/g, '');

        layer.on({
            mouseover: (e: any) => {
                const state = useExplorerStore.getState();
                const target = e.target;
                const currentZoom = target._map.getZoom();
                if (currentZoom >= 14) return; // Hirarki: Sembunyikan tooltip pada level pemukiman mikro

                // Set status hover global ke Store
                setHoveredDistrict(districtName);

                const isFocused = state.focusedDistrict && state.focusedDistrict.toLowerCase() === districtName.toLowerCase();
                if (isFocused) return;

                if (state.focusedDistrict) {
                    target.setStyle({ fillOpacity: 0.15, color: '#94a3b8', weight: 2 });
                    return;
                }

                if (state.activeIndicator) {
                    target.setStyle({
                        weight: 2.5,
                        color: '#ffffff',
                        fillOpacity: Math.min((state.mapOpacity / 100) + 0.15, 1)
                    });
                } else {
                    const isDarkMode = state.activeBaseMap === 'dark';
                    target.setStyle({
                        weight: 2,
                        color: isDarkMode ? '#ffffff' : '#000000',
                        fillOpacity: isDarkMode ? 0 : 0.15
                    });
                }
                target.bringToFront();
            },
            mouseout: (e: any) => {
                // Bersihkan status hover global
                setHoveredDistrict(null);

                const state = useExplorerStore.getState();
                const target = e.target;
                const currentZoom = target._map.getZoom();

                const originalStyle = calculateLayerStyle(
                    districtName,
                    {
                        focusedDistrict: state.focusedDistrict,
                        activeIndicator: state.activeIndicator,
                        mapOpacity: state.mapOpacity,
                        activeBaseMap: state.activeBaseMap
                    },
                    indicatorValuesRef.current,
                    minValueRef.current,
                    maxValueRef.current,
                    currentZoom
                );
                target.setStyle(originalStyle);
            },
            click: (e: any) => {
                if (isPreviewMode && onNavigate) {
                    // Jika diklik pada landing page teaser, arahkan masuk ke halaman spasial utama [Vite Router Bypass]
                    onNavigate('dashboard');
                    return;
                }

                const distId = DISTRICT_MAP[key] || 0;
                setFocusDistrict(districtName);

                openPanel("detil-distrik", `Profil Distrik ${districtName}`, {
                    id: distId,
                    name: districtName
                });
            }
        });
    };

    const getTileLayerUrl = () => {
        const baseMapId = useExplorerStore.getState().activeBaseMap;
        switch (baseMapId) {
            case 'dark': return "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
            case 'street': return "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}";
            case 'esri': return "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
            case 'osm': return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
            case 'satellite': default: return "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}";
        }
    };

    const getTileMaxZoom = () => useExplorerStore.getState().activeBaseMap === 'satellite' ? 22 : 20;

    // Evaluasi data wilayah hover secara konseptual dan real-time O(1)
    const hoveredDistrictData = useMemo(() => {
        if (!hoveredDistrict) return null;
        const key = hoveredDistrict.toLowerCase().replace(/\s/g, '');
        const distId = DISTRICT_MAP[key];
        const localProfile = distId ? MOCK_DISTRICT_PROFILES[distId] : null;
        const rawValue = (indicatorValues && key in indicatorValues) ? indicatorValues[key] : null;

        return {
            id: distId,
            name: hoveredDistrict,
            profile: localProfile || null,
            value: rawValue,
            status: (rawValue !== null && activeIndicator) ? getSectoralStatus(
                rawValue,
                minValue,
                maxValue,
                activeDirection || 'positive',
                activeIndicator
            ) : null
        };
    }, [hoveredDistrict, activeIndicator, indicatorValues, minValue, maxValue, activeDirection]);

    if (loading) return null;

    // Casting as any untuk meredam kekakuan JSX element react-leaflet versi modern
    const SafeMapContainer = MapContainer as any;
    const SafeTileLayer = TileLayer as any;
    const SafeGeoJSON = GeoJSON as any;
    const SafePolygon = Polygon as any;

    const getMaskingOpacity = () => {
        if (zoomLevel >= 14) return 0;
        return mapOpacity / 100;
    };

    return (
        <div className="h-full w-full overflow-hidden relative z-10 bg-slate-50 border-none">
            <SafeMapContainer
                key={mapKey}
                center={DEFAULT_CENTER}
                zoom={DEFAULT_ZOOM}
                minZoom={7}
                scrollWheelZoom={!isPreviewMode}
                dragging={!isPreviewMode}
                doubleClickZoom={!isPreviewMode}
                zoomControl={false}
                attributionControl={!(isAtlasMode || isPreviewMode)}
                className="h-full w-full z-0 outline-none"
            >
                <MapEventsHandler onZoomChange={setZoomLevel} />
                <ExternalMapController />

                {/* Pengontrol Sinkronisasi Peta & Kamera */}
                <CinematicSpotlightController
                    geoData={geoData}
                    geoJsonRef={geoJsonRef}
                    indicatorValues={indicatorValues}
                    minValue={minValue}
                    maxValue={maxValue}
                    zoomLevel={zoomLevel}
                />

                <SafeTileLayer
                    attribution='&copy; Smart Analysis'
                    url={getTileLayerUrl()}
                    maxZoom={getTileMaxZoom()}
                />

                {maskingPositions.length > 0 && (
                    <SafePolygon
                        positions={maskingPositions}
                        pathOptions={{
                            fillColor: '#000000',
                            fillOpacity: getMaskingOpacity(),
                            stroke: false
                        }}
                    />
                )}

                {geoData && (
                    <SafeGeoJSON
                        ref={geoJsonRef}
                        data={geoData}
                        onEachFeature={onEachFeature}
                        style={(feature: any) => {
                            const districtName = feature.properties?.district_name || "";
                            const stateSnapshot = {
                                focusedDistrict: useExplorerStore.getState().focusedDistrict,
                                activeIndicator: useExplorerStore.getState().activeIndicator,
                                mapOpacity: useExplorerStore.getState().mapOpacity,
                                activeBaseMap: useExplorerStore.getState().activeBaseMap
                            };
                            return calculateLayerStyle(
                                districtName,
                                stateSnapshot,
                                indicatorValuesRef.current,
                                minValueRef.current,
                                maxValueRef.current,
                                zoomLevel
                            );
                        }}
                    />
                )}

                <AssetMarkers />
            </SafeMapContainer>

            {/* ===========================================================================
                PORTAL RICH HOVER TOOLTIP (THEATER HUD OVERLAY - PILAR 3)
                Dibuat melayang mengikuti koordinat kursor mouse secara presisi
                =========================================================================== */}
            {hoveredDistrict && hoveredDistrictData && (
                <div
                    className="fixed pointer-events-none z-9999 bg-white border border-slate-200 shadow-2xl p-0 w-64 rounded-none animate-in fade-in zoom-in-95 duration-150 text-slate-800 flex flex-col overflow-hidden"
                    style={{
                        left: `${mouseCoords.x + 15}px`,
                        top: `${mouseCoords.y + 15}px`
                    }}
                >
                    {/* Micro-Thumbnail dari Local Cache */}
                    {hoveredDistrictData.profile && hoveredDistrictData.profile.images?.[0] && (
                        <div className="relative w-full h-20 shrink-0 bg-slate-100 overflow-hidden border-b border-slate-100">
                            <img
                                src={hoveredDistrictData.profile.images[0]}
                                alt={hoveredDistrictData.name}
                                className="w-full h-full object-cover"
                                draggable={false}
                            />
                        </div>
                    )}

                    <div className="p-3.5 flex flex-col gap-2">
                        {/* Judul Distrik */}
                        <div className="flex flex-col gap-0.5 border-b border-slate-100 pb-2">
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                                Distrik {hoveredDistrictData.name}
                            </h3>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                ID: {hoveredDistrictData.id ? hoveredDistrictData.id.toString().padStart(2, '0') : '--'}
                            </span>
                        </div>

                        {/* Detail Konten Data Sektoral */}
                        <div className="flex flex-col gap-1.5 text-[10px] font-bold">
                            {/* Kondisi A: Jika Ada Indikator Aktif (Kategori Peta Tematik) */}
                            {activeIndicator && hoveredDistrictData.value !== null && hoveredDistrictData.status && (
                                <>
                                    <div className="flex justify-between text-slate-400">
                                        <span>Indikator:</span>
                                        <span className="text-slate-600 truncate max-w-32.5 text-right uppercase tracking-tighter">
                                            {activeIndicator.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-slate-400">
                                        <span>Nilai Aktual:</span>
                                        <span className="text-slate-800 font-mono">
                                            {hoveredDistrictData.value.toLocaleString('id-ID')}{activeUnit || ""}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1 pt-2 border-t border-slate-100">
                                        <span className="text-[9px] uppercase tracking-widest text-slate-400">Status Capaian:</span>
                                        <span
                                            className="px-2 py-0.5 text-[8px] uppercase tracking-wider border font-black"
                                            style={{
                                                color: hoveredDistrictData.status.color,
                                                borderColor: `${hoveredDistrictData.status.color}50`,
                                                backgroundColor: `${hoveredDistrictData.status.color}10`
                                            }}
                                        >
                                            {hoveredDistrictData.status.label}
                                        </span>
                                    </div>
                                </>
                            )}

                            {/* Kondisi B: Jika TIDAK Ada Indikator Aktif (Kategori Demografi Dasar) */}
                            {!activeIndicator && hoveredDistrictData.profile && (
                                <div className="space-y-1.5 text-[10px] text-slate-500 font-medium">
                                    <div className="flex justify-between">
                                        <span>Luas Wilayah:</span>
                                        <span className="text-slate-800 font-bold font-mono">
                                            {hoveredDistrictData.profile.luas_wilayah?.toLocaleString('id-ID') || '-'} km²
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Total Populasi:</span>
                                        <span className="text-slate-800 font-bold font-mono">
                                            {hoveredDistrictData.profile.jumlah_penduduk?.toLocaleString('id-ID') || '-'} Jiwa
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}