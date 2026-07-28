import { create } from "zustand";
import { devtools } from "zustand/middleware";

// ============================================================================
// TYPE DEFINITIONS (Kamus Tipe Data Lokal Spasial)
// Dideklarasikan inline demi menjamin portabilitas kompilasi penuh di Vite SPA
// ============================================================================

export type ExplorerPanelType =
    | 'seleksi-opd'
    | 'katalog-aset'
    | 'katalog-wilayah'
    | 'detil-distrik'
    | 'detil-aset'
    | 'konfigurasi'
    | 'hasil-pencarian'
    | 'tentang';

export interface ExplorerPanel {
    id: string;               // ID unik instance panel melayang
    type: ExplorerPanelType;  // Identifikasi jenis komponen panel
    title: string;            // Judul teks pada header panel
    isVisible: boolean;       // Status visibility untuk mengontrol animasi CSS
    data?: any;               // Payload data dinamis yang dibawa (ID Distrik/Aset)
}

export type DetailTabType = "umum" | "analisis";

export interface GalleryPayload {
    isOpen: boolean;
    images: string[];
    currentIndex: number;
    title: string;
}

export interface ActiveIndicatorMetadata {
    min: number;
    max: number;
    direction: 'positive' | 'negative';
    unit: string;
}

// ============================================================================
// INTERFACE STATE: Definisi Model State & Aksi Spasial GFW-Style
// ============================================================================
interface ExplorerState {
    // 1. STATE LAYOUT PANEL
    activePanels: ExplorerPanel[];
    activeDetailTab: DetailTabType;

    // 2. STATE KONTEKS PETA & INDIKATOR
    activeIndicator: string | null;
    activeMin: number | null;
    activeMax: number | null;
    activeDirection: 'positive' | 'negative' | null;
    activeUnit: string | null;

    activeAssetLayers: string[]; // Format penyimpanan layer multi-select: "opdKey::assetType"
    mapOpacity: number;
    activeBaseMap: string;

    // 3. STATE KONTROL & HOVER JANGKAR SPASIAL
    focusedDistrict: string | null;
    hoveredDistrict: string | null;
    hoveredAsset: any | null;

    // 4. STATE THEATER GALLERY OVERLAY
    galleryState: GalleryPayload | null;

    // ==========================================
    // ACTIONS: Manajemen Panel (Layout)
    // ==========================================
    openPanel: (type: ExplorerPanelType, title: string, data?: any) => void;
    closePanel: (id: string) => void;
    clearPanels: () => void;
    closePanelsToTheRight: (index: number) => void;
    setActiveDetailTab: (tab: DetailTabType) => void;

    // ==========================================
    // ACTIONS: Manajemen Konteks Spasial & Peta
    // ==========================================
    setActiveIndicator: (
        indicatorKey: string | null,
        meta?: ActiveIndicatorMetadata | null
    ) => void;

    toggleAssetLayer: (opdKey: string, assetType: string) => void;
    toggleOpdAssets: (opdKey: string, assetTypes: string[], isTurnOn: boolean) => void;
    setMapOpacity: (opacity: number) => void;
    setActiveBaseMap: (baseMapId: string) => void;

    // Kontrol Kamera Peta (FlyTo)
    setFocusDistrict: (districtName: string | null) => void;

    // Kontrol Sensor Kursor (Hover)
    setHoveredDistrict: (districtName: string | null) => void;
    setHoveredAsset: (asset: any | null) => void;

    // Kontrol Theater Mode (Cinematic Preview)
    openGallery: (images: string[], startIndex: number, title?: string) => void;
    closeGallery: () => void;
    setGalleryIndex: (index: number) => void;

    resetMapData: () => void;
}

// ============================================================================
// STORE CREATION (Zustand Instance dengan Devtools Middleware)
// ============================================================================
export const useExplorerStore = create<ExplorerState>()(
    devtools(
        (set) => ({
            // Inisialisasi State Default
            activePanels: [],
            activeDetailTab: "umum",
            activeIndicator: null,
            activeMin: null,
            activeMax: null,
            activeDirection: null,
            activeUnit: null,
            activeAssetLayers: [],
            mapOpacity: 70,
            activeBaseMap: "satellite",
            focusedDistrict: null,
            hoveredDistrict: null,
            hoveredAsset: null,
            galleryState: null,

            // Mutator Indikator Aktif sekaligus Mengunci Parameter Legenda Spasial
            setActiveIndicator: (indicatorKey, meta = null) => set({
                activeIndicator: indicatorKey,
                activeMin: meta ? meta.min : null,
                activeMax: meta ? meta.max : null,
                activeDirection: meta ? meta.direction : null,
                activeUnit: meta ? meta.unit : null
            }),

            // Mutator Layer Aset Individual (Multi-Selection Toggle)
            toggleAssetLayer: (opdKey, assetType) => set((state) => {
                const layerId = `${opdKey}::${assetType}`;
                const isExists = state.activeAssetLayers.includes(layerId);
                return {
                    activeAssetLayers: isExists
                        ? state.activeAssetLayers.filter(id => id !== layerId)
                        : [...state.activeAssetLayers, layerId]
                };
            }),

            // Mutator Master Toggle OPD Rumpun Aset sekaligus
            toggleOpdAssets: (opdKey, assetTypes, isTurnOn) => set((state) => {
                const layerIds = assetTypes.map(type => `${opdKey}::${type}`);
                if (isTurnOn) {
                    const newSet = new Set([...state.activeAssetLayers, ...layerIds]);
                    return { activeAssetLayers: Array.from(newSet) };
                } else {
                    return { activeAssetLayers: state.activeAssetLayers.filter(id => !layerIds.includes(id)) };
                }
            }),

            // Mutator Konfigurasi Peta Dasar
            setMapOpacity: (opacity) => set({ mapOpacity: opacity }),
            setActiveBaseMap: (baseMapId) => set({ activeBaseMap: baseMapId }),

            // Mutator Posisi Kamera Peta
            setFocusDistrict: (districtName) => set({ focusedDistrict: districtName }),

            // Mutator Tracking Sensor Hover Map
            setHoveredDistrict: (districtName) => set({ hoveredDistrict: districtName }),
            setHoveredAsset: (asset) => set({ hoveredAsset: asset }),

            // Mutator Theater Mode Gallery
            openGallery: (images, startIndex, title = "Visualisasi Data") => set({
                galleryState: {
                    isOpen: true,
                    images,
                    currentIndex: startIndex,
                    title
                }
            }),

            closeGallery: () => set({ galleryState: null }),

            setGalleryIndex: (index) => set((state) => ({
                galleryState: state.galleryState
                    ? { ...state.galleryState, currentIndex: index }
                    : null
            })),

            // Mutator Tab Panel Detail
            setActiveDetailTab: (tab) => set({ activeDetailTab: tab }),

            // Fungsi Reset Membersihkan Semua Sisa Metadata Layer Spasial
            resetMapData: () => set((state) => ({
                activeIndicator: null,
                activeMin: null,
                activeMax: null,
                activeDirection: null,
                activeUnit: null,
                activeAssetLayers: [],
                focusedDistrict: null,
                hoveredDistrict: null,
                hoveredAsset: null,
                galleryState: null,
                activePanels: state.activePanels.filter((p) => p.type !== "detil-distrik" && p.type !== "detil-aset"),
                activeDetailTab: "umum",
            })),

            // Logika Penambahan Panel Dinamis Bergeser (Shifting Panels)
            openPanel: (type, title, data = null) => set((state) => {
                const isDetailPanel = type === "detil-distrik" || type === "detil-aset";
                let nextPanels = [...state.activePanels];

                // Jika panel detail dibuka, tutup panel detail lainnya agar tidak tumpang tindih
                if (isDetailPanel) {
                    nextPanels = nextPanels.filter(p => p.type !== "detil-distrik" && p.type !== "detil-aset");
                } else {
                    // Jika panel menu yang sama diklik, bersihkan yang lama lalu pasang yang baru
                    nextPanels = nextPanels.filter(p => p.type !== type);
                }

                const newPanel: ExplorerPanel = {
                    id: `${type}-${Date.now()}`,
                    type,
                    title,
                    isVisible: true,
                    data,
                };

                nextPanels.push(newPanel);
                const resetTabObj = type === "detil-distrik" ? { activeDetailTab: "umum" as DetailTabType } : {};

                return { activePanels: nextPanels, ...resetTabObj };
            }),

            // Logika Penutupan Panel Individual
            closePanel: (id) => set((state) => {
                const filteredPanels = state.activePanels.filter((p) => p.id !== id);
                const isDetailClosed = !filteredPanels.some(p => p.type === "detil-distrik" || p.type === "detil-aset");

                return {
                    activePanels: filteredPanels,
                    ...(isDetailClosed && {
                        activeDetailTab: "umum",
                        focusedDistrict: null,
                        hoveredDistrict: null,
                        hoveredAsset: null,
                        galleryState: null
                    })
                };
            }),

            // Logika Penutupan Bersih Panel Sisi Kanan saat Drawer Utama Bergeser
            closePanelsToTheRight: (index) => set((state) => {
                const slicedPanels = state.activePanels.slice(0, index + 1);
                const isDetailStillOpen = slicedPanels.some(p => p.type === "detil-distrik" || p.type === "detil-aset");

                return {
                    activePanels: slicedPanels,
                    ...(!isDetailStillOpen && {
                        activeDetailTab: "umum",
                        focusedDistrict: null,
                        hoveredDistrict: null,
                        hoveredAsset: null,
                        galleryState: null
                    })
                };
            }),

            // Pembersihan Menyeluruh Seluruh Panel
            clearPanels: () => set({
                activePanels: [],
                activeDetailTab: "umum",
                focusedDistrict: null,
                hoveredDistrict: null,
                hoveredAsset: null,
                galleryState: null
            }),
        }),
        { name: "ExplorerStore" }
    )
);