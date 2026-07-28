// ============================================================================
// CONFIGURATION: Registrasi URL Basemap Penyedia Eksternal
// High Cohesion: Konfigurasi dipisahkan utuh dari elemen render UI
// ============================================================================
export const BASEMAP_URLS: Record<string, string> = {
    satellite: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",       // Google Satellite High-Res
    street: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",          // Google Roadmap Vector
    dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"  // CartoDB Dark Matter
};

/**
 * Mengambil URL Tile Server berdasarkan ID Basemap yang aktif.
 * @param baseMapId ID basemap (contoh: "satellite", "dark")
 * @returns String URL Endpoint dari Tile Provider
 */
export const getBasemapUrl = (baseMapId: string): string => {
    return BASEMAP_URLS[baseMapId] || BASEMAP_URLS.satellite;
};

/**
 * [CONTINUOUS CHROMATIC INTERPOLATION]
 * Menghitung warna gradasi linier (Hex) berbasis Equal Interval Dinamis (Legenda Pilar 1).
 * Menggunakan batas nominal riil hasil agregasi di database untuk menghindari bias warna spasial.
 * 
 * @param value Nilai riil di distrik bersangkutan
 * @param min Nilai minimal batas bawah peta tematik
 * @param max Nilai maksimal batas atas peta tematik
 * @param indicatorKey Kata kunci indikator spasial aktif untuk mendeteksi rumpun sektoral
 * @returns Kode warna Heksadesimal untuk pewarnaan peta Choropleth
 */
export const getSemanticColor = (value: number, min: number, max: number, indicatorKey: string): string => {
    const range = max - min;
    // Hindari pembagian nol jika data seluruh distrik bernilai seragam
    const ratio = range > 0 ? (value - min) / range : 0.5;
    const key = indicatorKey.toLowerCase();

    // KELOMPOK KESEHATAN / SOSIAL / DEMOGRAFI (Tema Gradasi: Magenta - Deep Pink - Rose)
    if (
        key.includes('stunting') ||
        key.includes('kesehatan') ||
        key.includes('penduduk') ||
        key.includes('miskin') ||
        key.includes('sekolah')
    ) {
        if (ratio > 0.8) return '#9d174d'; // Pink-800
        if (ratio > 0.6) return '#be185d'; // Pink-700
        if (ratio > 0.4) return '#db2777'; // Pink-600
        if (ratio > 0.2) return '#f43f5e'; // Rose-500
        return '#fda4af';                  // Rose-300
    }
    // KELOMPOK EKONOMI / PDRB / KEUANGAN (Tema Gradasi: Emerald - Mint Green)
    else if (
        key.includes('pdrb') ||
        key.includes('ekonomi') ||
        key.includes('uang') ||
        key.includes('dana') ||
        key.includes('pad')
    ) {
        if (ratio > 0.8) return '#064e3b'; // Emerald-900
        if (ratio > 0.6) return '#047857'; // Emerald-700
        if (ratio > 0.4) return '#059669'; // Emerald-600
        if (ratio > 0.2) return '#10b981'; // Emerald-500
        return '#6ee7b7';                  // Emerald-300
    }
    // KELOMPOK INFRASTRUKTUR / DEFAULT (Tema Gradasi: Amber - Burnt Orange)
    else {
        if (ratio > 0.8) return '#b45309'; // Amber-700
        if (ratio > 0.6) return '#d97706'; // Amber-600
        if (ratio > 0.4) return '#f59e0b'; // Amber-500
        if (ratio > 0.2) return '#fbbf24'; // Amber-400
        return '#fde68a';                  // Amber-200
    }
};

export interface SectoralStatus {
    level: number;       // Skor pembagian biner (1 sampai 5)
    label: string;       // Label interpretasi kebijakan fungsional daerah
    color: string;       // Warna heksadesimal representatif
}

/**
 * [AUTOMATIC SECTORAL CLASSIFIER - PILAR 3]
 * Menerjemahkan angka mentah statistik menjadi status kualitatif yang ramah orang awam,
 * dengan menyesuaikan arah evaluasi target indikator positif vs negatif secara otomatis.
 * 
 * @param value Nilai riil distrik
 * @param min Nilai minimal batas bawah peta tematik
 * @param max Nilai maksimal batas atas peta tematik
 * @param direction Arah kebaikan indikator ('positive' = makin tinggi makin baik, 'negative' = makin tinggi makin kritis)
 * @param indicatorKey Kata kunci indikator aktif
 * @returns Objek terstruktur SectoralStatus (Level, Label, Warna)
 */
export const getSectoralStatus = (
    value: number,
    min: number,
    max: number,
    direction: 'positive' | 'negative',
    indicatorKey: string
): SectoralStatus => {
    const range = max - min;
    const ratio = range > 0 ? (value - min) / range : 0.5;

    // Tentukan pembagian bin normalisasi (1 sampai 5) dari nilai terendah ke tertinggi
    let bin = 1;
    if (ratio > 0.8) bin = 5;
    else if (ratio > 0.6) bin = 4;
    else if (ratio > 0.4) bin = 3;
    else if (ratio > 0.2) bin = 2;

    const color = getSemanticColor(value, min, max, indicatorKey);

    let label = "";
    let level = bin;

    if (direction === 'positive') {
        // MAKIN TINGGI = MAKIN BAIK (Arah Positif, misal: IPM, Guru, PDRB)
        level = bin;
        const positiveLabels = [
            "Sangat Kurang",
            "Kurang",
            "Cukup",
            "Memadai",
            "Sangat Memadai"
        ];
        label = positiveLabels[bin - 1];
    } else {
        // MAKIN TINGGI = MAKIN KRITIS (Arah Negatif, misal: Stunting, Putus Sekolah, Kemiskinan)
        // Nilai terendah (bin 1) diartikan sebagai level teraman
        level = 6 - bin;
        const negativeLabels = [
            "Sangat Aman",
            "Aman",
            "Cukup / Sedang",
            "Waspada",
            "Kritis"
        ];
        label = negativeLabels[bin - 1];
    }

    return { level, label, color };
};