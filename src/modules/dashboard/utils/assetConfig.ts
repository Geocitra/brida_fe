// ============================================================================
// INTERFACES (Struktur Data Taksonomi Kategori Aset Daerah)
// ============================================================================
export interface AssetCategoryMetadata {
    type: string;      // Identifier unik pencarian (exact match, case-insensitive)
    label: string;     // Nama ramah pembaca untuk dirender di UI/Legenda
    iconUrl: string;   // Jalur relatif menuju aset gambar SVG marker
    color: string;     // Kode warna Heksadesimal default
}

export interface OpdAssetTaxonomy {
    opdKey: string;    // Kata kunci unik OPD (slug), misal: "dinas_kesehatan"
    opdName: string;   // Nama lengkap Instansi Pemerintah Kabupaten Mimika
    categories: AssetCategoryMetadata[];
}

// ============================================================================
// CONFIGURATION REGISTRY: Kamus Taksonomi Sektoral OPD Kabupaten Mimika
// ============================================================================
export const ASSET_TAXONOMY_CONFIG: OpdAssetTaxonomy[] = [
    {
        opdKey: "dinas_kesehatan",
        opdName: "Dinas Kesehatan",
        categories: [
            {
                type: "Rumah Sakit",
                label: "Rumah Sakit Umum",
                iconUrl: "/icons/markers/hospital.svg",
                color: "#EF4444" // Merah Terang
            },
            {
                type: "Puskesmas",
                label: "Puskesmas",
                iconUrl: "/icons/markers/clinic.svg",
                color: "#F97316" // Orange
            },
            {
                type: "Puskesmas Pembantu",
                label: "Puskesmas Pembantu",
                iconUrl: "/icons/markers/aid.svg",
                color: "#EAB308" // Kuning
            },
            {
                type: "Klinik Industri",
                label: "Klinik Industri",
                iconUrl: "/icons/markers/factory-clinic.svg",
                color: "#3B82F6" // Biru Terang
            }
        ]
    },
    {
        opdKey: "dinas_pendidikan",
        opdName: "Dinas Pendidikan",
        categories: [
            {
                type: "Gedung Sekolah",
                label: "Gedung Sekolah",
                iconUrl: "/icons/markers/school.svg",
                color: "#10B981" // Emerald Green
            },
            {
                type: "Fasilitas Umum",
                label: "Perpustakaan & Fasilitas Umum",
                iconUrl: "/icons/markers/library.svg",
                color: "#8B5CF6" // Violet/Ungu
            }
        ]
    },
    {
        opdKey: "dinas_pupr",
        opdName: "Dinas PUPR",
        categories: [
            {
                type: "Infrastruktur",
                label: "Infrastruktur Fisik",
                iconUrl: "/icons/markers/bridge.svg",
                color: "#64748B" // Slate Gray
            },
            {
                type: "Infrastruktur Dasar",
                label: "Infrastruktur Air/Sanitasi",
                iconUrl: "/icons/markers/water.svg",
                color: "#0EA5E9" // Sky Blue
            },
            {
                type: "Aset Bergerak",
                label: "Alat Berat",
                iconUrl: "/icons/markers/bulldozer.svg",
                color: "#F59E0B" // Amber/Kuning Kunyit
            },
            {
                type: "Kantor Operasional",
                label: "Kantor Pemeliharaan",
                iconUrl: "/icons/markers/office.svg",
                color: "#334155" // Dark Slate
            }
        ]
    },
    {
        opdKey: "dinas_sosial",
        opdName: "Dinas Sosial",
        categories: [
            {
                type: "Fasilitas Sosial",
                label: "Fasilitas Sosial & Logistik",
                iconUrl: "/icons/markers/social-facility.svg",
                color: "#EC4899" // Hot Pink
            }
        ]
    }
];

/**
 * Utilitas Pencarian Cadangan (Pure Fabrication)
 * Berfungsi mengekstraksi properti visual default berdasarkan nama kategori 
 * jika data dari database tidak mendefinisikan warna atau ikon kustom.
 * 
 * @param categoryName Nama kategori aset yang dicari
 * @returns Metadata kategori default (Ikon, Label, Warna) atau null jika tidak terdaftar
 */
export function getFallbackAssetMetadata(categoryName: string): AssetCategoryMetadata | null {
    if (!categoryName) return null;
    const normalized = categoryName.toLowerCase().trim();

    for (const opd of ASSET_TAXONOMY_CONFIG) {
        for (const cat of opd.categories) {
            if (cat.type.toLowerCase().trim() === normalized) {
                return cat;
            }
        }
    }
    return null;
}