"use client";

import React, { useEffect, useState } from "react";
import {
    MapPin,
    Users,
    Maximize2,
    History,
    FileText,
    AlertCircle,
    X,
    Sparkles,
    Bot,
    Send,
    Loader2
} from "lucide-react";
import { useExplorerStore } from "../../store/useExplorerStore";
import ImageCarousel from "../../../../components/ui/ImageCarousel";
import { DocumentService } from "../../../../services/document.service";
import { AiAssistantService } from "../../../../services/ai-assistant.service";
import { RichMessageRenderer } from "../../../ai-assistant/components/chat-panel.component";

// ============================================================================
// SOLID LOCAL SEEDING: Detail Drilldown 18 Distrik Kabupaten Mimika
// Berisi data factual lengkap & rasional spasial sektoral Mimika [Fase 5]
// ============================================================================
const MOCK_DRILLDOWN_DETAILS: Record<number, {
    district_id: number;
    district_name: string;
    profile: {
        luas_wilayah: number;
        jumlah_penduduk: number;
        deskripsi: string;
        batas_wilayah: string;
        images: string[];
    };
    categories: Array<{
        category_id: number;
        name: string;
        total: number;
    }>;
    last_updated: string;
}> = {
    1: {
        district_id: 1,
        district_name: "Mimika Baru",
        profile: {
            luas_wilayah: 2216,
            jumlah_penduduk: 142000,
            deskripsi: "Distrik Mimika Baru berpusat di kota Timika, berfungsi sebagai episentrum aktivitas perekonomian, perbankan, industri kreatif, serta pusat pemerintahan. Kepadatan infrastruktur dasar di distrik ini merupakan yang paling maju di seluruh kabupaten.",
            batas_wilayah: "Utara: Kuala Kencana, Selatan: Wania, Barat: Iwaka, Timur: Mimika Timur",
            images: ["/img/mimika%20baru/aerial%20view.jpg", "/img/mimika%20baru/Pasar-Sentral-Timika.jpg"]
        },
        categories: [
            { category_id: 1, name: "Kesehatan & Pendidikan", total: 45 },
            { category_id: 2, name: "Infrastruktur & Pekerjaan Umum", total: 32 },
            { category_id: 3, name: "Sosial & Logistik", total: 18 }
        ],
        last_updated: "2026-07-28T09:00:00Z"
    },
    2: {
        district_id: 2,
        district_name: "Kuala Kencana",
        profile: {
            luas_wilayah: 840,
            jumlah_penduduk: 28000,
            deskripsi: "Distrik Kuala Kencana merupakan kota modern terencana yang dikelola secara eksklusif berkolaborasi dengan pihak swasta pertambangan. Memiliki tata kota ramah lingkungan, jaringan kabel bawah tanah, dan kualitas sanitasi berstandar internasional.",
            batas_wilayah: "Utara: Tembagapura, Selatan: Mimika Baru, Barat: Iwaka, Timur: Kwamki Narama",
            images: ["/img/kualakencana/images%20(1).jpg", "/img/kualakencana/images.jpg"]
        },
        categories: [
            { category_id: 1, name: "Kesehatan & Pendidikan", total: 22 },
            { category_id: 2, name: "Infrastruktur & Pekerjaan Umum", total: 15 },
            { category_id: 3, name: "Sosial & Logistik", total: 9 }
        ],
        last_updated: "2026-07-28T09:00:00Z"
    },
    3: {
        district_id: 3,
        district_name: "Tembagapura",
        profile: {
            luas_wilayah: 1452,
            jumlah_penduduk: 23000,
            deskripsi: "Distrik Tembagapura terletak di wilayah pegunungan tinggi bersuhu dingin. Merupakan pusat operasi penambangan emas dan tembaga utama. Distrik ini memiliki tantangan geografis berupa lereng terjal dan risiko tanah longsor tinggi.",
            batas_wilayah: "Utara: Kabupaten Puncak, Selatan: Kuala Kencana, Barat: Alama, Timur: Hoya",
            images: ["/img/tembagapura/Grasberg_pano_(3200491589)_(cropped).jpg", "/img/tembagapura/Tembagapura_4.jpg"]
        },
        categories: [
            { category_id: 1, name: "Kesehatan & Pendidikan", total: 14 },
            { category_id: 2, name: "Infrastruktur & Pekerjaan Umum", total: 28 },
            { category_id: 3, name: "Sosial & Logistik", total: 12 }
        ],
        last_updated: "2026-07-28T09:00:00Z"
    },
    4: {
        district_id: 4,
        district_name: "Wania",
        profile: {
            luas_wilayah: 195,
            jumlah_penduduk: 61000,
            deskripsi: "Distrik Wania dikembangkan sebagai kawasan penyangga pemukiman perkotaan Timika. Memiliki konsentrasi pemukiman transmigrasi yang padat, pasar sentral regional, dan perkembangan ruko komersial menengah yang sangat pesat.",
            batas_wilayah: "Utara: Mimika Baru, Selatan: Mimika Timur, Barat: Iwaka, Timur: Mimika Tengah",
            images: ["/img/wania/Pasar-Sentral-1-scaled.jpg", "/img/mimika%20baru/Indahhnya-Wisata-Timika.jpg"]
        },
        categories: [
            { category_id: 1, name: "Kesehatan & Pendidikan", total: 31 },
            { category_id: 2, name: "Infrastruktur & Pekerjaan Umum", total: 19 },
            { category_id: 3, name: "Sosial & Logistik", total: 14 }
        ],
        last_updated: "2026-07-28T09:00:00Z"
    },
    5: {
        district_id: 5,
        district_name: "Iwaka",
        profile: {
            luas_wilayah: 742,
            jumlah_penduduk: 12000,
            deskripsi: "Distrik Iwaka didominasi dataran rendah subur yang dimanfaatkan sebagai kawasan perkebunan buah, penangkaran sagu lokal, serta menjadi area perlintasan utama koridor logistik berat menuju pelabuhan dan tambang.",
            batas_wilayah: "Utara: Kuala Kencana, Selatan: Amar, Barat: Mimika Barat Tengah, Timur: Mimika Baru",
            images: ["/img/iwaka/sagu-1-635c8e4408a8b57f2152e722.jpg", "/img/iwaka/WhatsApp-Image-2026-07-13-at-10.24.32.jpg"]
        },
        categories: [
            { category_id: 1, name: "Kesehatan & Pendidikan", total: 15 },
            { category_id: 2, name: "Infrastruktur & Pekerjaan Umum", total: 18 },
            { category_id: 3, name: "Sosial & Logistik", total: 6 }
        ],
        last_updated: "2026-07-28T09:00:00Z"
    },
    6: {
        district_id: 6,
        district_name: "Kwamki Narama",
        profile: {
            luas_wilayah: 45,
            jumlah_penduduk: 15000,
            deskripsi: "Distrik Kwamki Narama merupakan kawasan pemukiman adat yang padat. Pemerintah daerah memprioritaskan distrik ini untuk program asimilasi sosial, peningkatan literasi pendidikan dasar, dan pemberdayaan perkebunan rakyat.",
            batas_wilayah: "Utara: Kuala Kencana, Selatan: Mimika Baru, Barat: Kuala Kencana, Timur: Mimika Tengah",
            images: ["/img/kwamki%20narama/prosesi-kremasi-jenazah-junius-m-janempa-di-kwamki-narama-rabu-142026-foto-cenderawasih-posmoh-wahyu-welerubun-xmAu6.webp", "/img/iwaka/traditional-honai-house-dani-tribe-260nw-2635906639.jpg"]
        },
        categories: [
            { category_id: 1, name: "Kesehatan & Pendidikan", total: 24 },
            { category_id: 2, name: "Infrastruktur & Pekerjaan Umum", total: 11 },
            { category_id: 3, name: "Sosial & Logistik", total: 8 }
        ],
        last_updated: "2026-07-28T09:00:00Z"
    },
    7: {
        district_id: 7,
        district_name: "Mimika Timur",
        profile: {
            luas_wilayah: 211,
            jumlah_penduduk: 11000,
            deskripsi: "Distrik Mimika Timur merupakan pintu gerbang jalur logistik kelautan utama Mimika. Berpusat di Mapurujaya, distrik ini melayani operasional pelabuhan nasional Pomako dan industri pengolahan hasil laut laut.",
            batas_wilayah: "Utara: Mimika Baru, Selatan: Laut Arafura, Barat: Wania, Timur: Mimika Timur Jauh",
            images: ["/img/mimika%20timur/624e6c8c105e5.jpg", "/img/mimika%20timur/images.jpg"]
        },
        categories: [
            { category_id: 1, name: "Kesehatan & Pendidikan", total: 19 },
            { category_id: 2, name: "Infrastruktur & Pekerjaan Umum", total: 22 },
            { category_id: 3, name: "Sosial & Logistik", total: 11 }
        ],
        last_updated: "2026-07-28T09:00:00Z"
    },
    8: {
        district_id: 8,
        district_name: "Mimika Tengah",
        profile: {
            luas_wilayah: 341,
            jumlah_penduduk: 5500,
            deskripsi: "Distrik Mimika Tengah didominasi oleh bentang alam perairan payau dan muara sungai pesisir selatan. Mata pencaharian utama penduduknya adalah nelayan kepiting bakau dan budidaya tambak ikan tradisional.",
            batas_wilayah: "Utara: Kwamki Narama, Selatan: Laut Arafura, Barat: Wania, Timur: Jita",
            images: ["/img/jita/Panoramic_view_of_dock_at_Kampung_Rawa,_2014-06-21.jpg", "/img/mimika%20barat/061348_64937_INDAH_mimika_dalam.jpg"]
        },
        categories: [
            { category_id: 1, name: "Kesehatan & Pendidikan", total: 8 },
            { category_id: 2, name: "Infrastruktur & Pekerjaan Umum", total: 14 },
            { category_id: 3, name: "Sosial & Logistik", total: 5 }
        ],
        last_updated: "2026-07-28T09:00:00Z"
    },
    9: {
        district_id: 9,
        district_name: "Mimika Barat",
        profile: {
            luas_wilayah: 1021,
            jumlah_penduduk: 4200,
            deskripsi: "Distrik Mimika Barat berpusat di Kokonao. Merupakan kawasan administratif bersejarah yang menyimpan rekam jejak misionaris pendidikan awal di pesisir Papua. Fokus pada pelestarian peninggalan budaya lokal.",
            batas_wilayah: "Utara: Mimika Barat Tengah, Selatan: Laut Arafura, Barat: Mimika Barat Jauh, Timur: Amar",
            images: ["/img/mimika%20barat/061348_64937_INDAH_mimika_dalam.jpg", "/img/mimika%20barat/IMG-20250929-WA0041-scaled.webp"]
        },
        categories: [
            { category_id: 1, name: "Kesehatan & Pendidikan", total: 13 },
            { category_id: 2, name: "Infrastruktur & Pekerjaan Umum", total: 9 },
            { category_id: 3, name: "Sosial & Logistik", total: 7 }
        ],
        last_updated: "2026-07-28T09:00:00Z"
    },
    10: {
        district_id: 10,
        district_name: "Agimuga",
        profile: {
            luas_wilayah: 4124,
            jumlah_penduduk: 3800,
            deskripsi: "Distrik Agimuga merupakan kawasan dataran rendah timur Mimika yang dilalui banyak aliran sungai besar. Pembangunan infrastruktur jalan darat penghubung terus diupayakan untuk mengikis isolasi logistik antar wilayah.",
            batas_wilayah: "Utara: Jila, Selatan: Laut Arafura, Barat: Jita, Timur: Mimika Timur Jauh",
            images: ["/img/agimuga/209.jpg", "/img/agimuga/7311.jpg"]
        },
        categories: [
            { category_id: 1, name: "Kesehatan & Pendidikan", total: 11 },
            { category_id: 2, name: "Infrastruktur & Pekerjaan Umum", total: 34 },
            { category_id: 3, name: "Sosial & Logistik", total: 6 }
        ],
        last_updated: "2026-07-28T09:00:00Z"
    },
    11: {
        district_id: 11,
        district_name: "Jila",
        profile: {
            luas_wilayah: 6011,
            jumlah_penduduk: 4500,
            deskripsi: "Distrik Jila membentang luas di kaki jajaran pegunungan tengah Mimika. Topografi berbukit curam dan lereng batu mempersulit jaringan telekomunikasi dan pembangunan jalan trans-kabupaten.",
            batas_wilayah: "Utara: Kabupaten Puncak, Selatan: Agimuga, Barat: Hoya, Timur: Jita",
            images: ["/img/jila/615d4d4e6ff0c.jpg", "/img/jila/shutterstock_2362513197.jpg"]
        },
        categories: [
            { category_id: 1, name: "Kesehatan & Pendidikan", total: 9 },
            { category_id: 2, name: "Infrastruktur & Pekerjaan Umum", total: 18 },
            { category_id: 3, name: "Sosial & Logistik", total: 5 }
        ],
        last_updated: "2026-07-28T09:00:00Z"
    },
    12: {
        district_id: 12,
        district_name: "Jita",
        profile: {
            luas_wilayah: 4121,
            jumlah_penduduk: 2800,
            deskripsi: "Distrik Jita merupakan kawasan pedalaman berawa di timur Mimika. Sirkulasi mobilitas masyarakat sangat bergantung pada transportasi sungai, perahu kayu tradisional (*perahu jonson*), dan pasang surut air laut.",
            batas_wilayah: "Utara: Jila, Selatan: Laut Arafura, Barat: Mimika Tengah, Timur: Agimuga",
            images: ["/img/jita/images.jpg", "/img/jita/Panoramic_view_of_dock_at_Kampung_Rawa,_2014-06-21.jpg"]
        },
        categories: [
            { category_id: 1, name: "Kesehatan & Pendidikan", total: 7 },
            { category_id: 2, name: "Infrastruktur & Pekerjaan Umum", total: 12 },
            { category_id: 3, name: "Sosial & Logistik", total: 4 }
        ],
        last_updated: "2026-07-28T09:00:00Z"
    },
    13: {
        district_id: 13,
        district_name: "Mimika Timur Jauh",
        profile: {
            luas_wilayah: 2112,
            jumlah_penduduk: 3200,
            deskripsi: "Distrik Mimika Timur Jauh terletak di pesisir muara sungai ujung timur Mimika yang berbatasan langsung dengan Kabupaten Asmat. Mayoritas penduduk bekerja mencari ikan dan mengolah sagu hutan alami.",
            batas_wilayah: "Utara: Agimuga, Selatan: Laut Arafura, Barat: Mimika Timur, Timur: Kabupaten Asmat",
            images: ["/img/agimuga/7311.jpg", "/img/20170903_Papouasie_Baliem_valley_15.jpg"]
        },
        categories: [
            { category_id: 1, name: "Kesehatan & Pendidikan", total: 12 },
            { category_id: 2, name: "Infrastruktur & Pekerjaan Umum", total: 15 },
            { category_id: 3, name: "Sosial & Logistik", total: 8 }
        ],
        last_updated: "2026-07-28T09:00:00Z"
    },
    14: {
        district_id: 14,
        district_name: "Mimika Barat Jauh",
        profile: {
            luas_wilayah: 2122,
            jumlah_penduduk: 2100,
            deskripsi: "Distrik Mimika Barat Jauh berpusat di rumpun pesisir pantai Yaraya-Ipaya. Terkenal dengan potensi pasir pantai putih kelapa rakyat, dan pemanfaatan kincir angin skala mikro untuk listrik kampung pesisir.",
            batas_wilayah: "Utara: Mimika Barat Tengah, Selatan: Laut Arafura, Barat: Kabupaten Kaimana, Timur: Mimika Barat",
            images: ["/img/mimika%20barat%20jauh/pantai-minajaya-sukabumi-1747457877972_169.jpeg", "/img/mimika%20barat/IMG-20250929-WA0041-scaled.webp"]
        },
        categories: [
            { category_id: 1, name: "Kesehatan & Pendidikan", total: 10 },
            { category_id: 2, name: "Infrastruktur & Pekerjaan Umum", total: 14 },
            { category_id: 3, name: "Sosial & Logistik", total: 4 }
        ],
        last_updated: "2026-07-28T09:00:00Z"
    },
    15: {
        district_id: 15,
        district_name: "Mimika Barat Tengah",
        profile: {
            luas_wilayah: 1842,
            jumlah_penduduk: 2400,
            deskripsi: "Distrik Mimika Barat Tengah melayani rute penghubung transportasi laut logistik ringan antar pesisir barat. Memiliki bentang muara yang luas dan dilindungi ekosistem hutan bakau (*mangrove*) tebal alami.",
            batas_wilayah: "Utara: Kabupaten Deiyai, Selatan: Mimika Barat, Barat: Mimika Barat Jauh, Timur: Iwaka",
            images: ["/img/AMANNSAGOAOWA.jpg", "/img/mimika%20barat/061348_64937_INDAH_mimika_dalam.jpg"]
        },
        categories: [
            { category_id: 1, name: "Kesehatan & Pendidikan", total: 11 },
            { category_id: 2, name: "Infrastruktur & Pekerjaan Umum", total: 13 },
            { category_id: 3, name: "Sosial & Logistik", total: 5 }
        ],
        last_updated: "2026-07-28T09:00:00Z"
    },
    16: {
        district_id: 16,
        district_name: "Amar",
        profile: {
            luas_wilayah: 1221,
            jumlah_penduduk: 1800,
            deskripsi: "Distrik Amar merupakan kawasan pesisir rawa dengan mayoritas vegetasi nipa dan hutan payau. Sentra andalan daerah untuk penangkapan kepiting bakau (*Scylla serrata*) berkualitas ekspor.",
            batas_wilayah: "Utara: Iwaka, Selatan: Laut Arafura, Barat: Mimika Barat, Timur: Mimika Barat Tengah",
            images: ["/img/jita/Panoramic_view_of_dock_at_Kampung_Rawa,_2014-06-21.jpg", "/img/Mimika-300x200.jpg"]
        },
        categories: [
            { category_id: 1, name: "Kesehatan & Pendidikan", total: 6 },
            { category_id: 2, name: "Infrastruktur & Pekerjaan Umum", total: 11 },
            { category_id: 3, name: "Sosial & Logistik", total: 5 }
        ],
        last_updated: "2026-07-28T09:00:00Z"
    },
    17: {
        district_id: 17,
        district_name: "Hoya",
        profile: {
            luas_wilayah: 2450,
            jumlah_penduduk: 1200,
            deskripsi: "Distrik Hoya terletak jauh di lembah sempit terdalam pegunungan Mimika. Akses jalan darat sama sekali tidak tersedia, membuat wilayah ini memiliki tantangan keterisolasian yang tinggi dalam pemenuhan kesehatan, logistik dasar, dan guru ajar.",
            batas_wilayah: "Utara: Kabupaten Intan Jaya, Selatan: Jila, Barat: Tembagapura, Timur: Alama",
            images: ["/img/hoya/images.jpg", "/img/hoya/JembatanHoya%20(2).jpg"]
        },
        categories: [
            { category_id: 1, name: "Kesehatan & Pendidikan", total: 14 },
            { category_id: 2, name: "Infrastruktur & Pekerjaan Umum", total: 29 },
            { category_id: 3, name: "Sosial & Logistik", total: 11 }
        ],
        last_updated: "2026-07-28T09:00:00Z"
    },
    18: {
        district_id: 18,
        district_name: "Alama",
        profile: {
            luas_wilayah: 4110,
            jumlah_penduduk: 1600,
            deskripsi: "Distrik Alama terletak di ujung timur laut pegunungan terjal Mimika. Memiliki kepadatan penduduk paling kecil dengan sebaran perkampungan adat tradisional di lembah-lembah perbukitan terpencil.",
            batas_wilayah: "Utara: Kabupaten Lanny Jaya, Selatan: Jita, Barat: Hoya, Timur: Kabupaten Nduga",
            images: ["/img/alama/97295c5df6d1.jpg", "/img/alama/Taman-Nasional-Lorentz-1024x679.jpg"]
        },
        categories: [
            { category_id: 1, name: "Kesehatan & Pendidikan", total: 8 },
            { category_id: 2, name: "Infrastruktur & Pekerjaan Umum", total: 15 },
            { category_id: 3, name: "Sosial & Logistik", total: 4 }
        ],
        last_updated: "2026-07-28T09:00:00Z"
    }
};

type TabType = "umum" | "analisis";

const getCleanMarkdown = (text: string): string => {
    if (!text) return "";
    try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object') {
            return parsed.answer || parsed.fullArticleText || text;
        }
    } catch {
        // Bukan JSON, biarkan aslinya
    }
    return text;
};

export interface DetailPanelProps {
    districtId: number | string;
    districtName: string;
    panelId: string;
}

export default function DetailPanel({
    districtId,
    districtName,
    panelId
}: DetailPanelProps) {
    const { closePanel } = useExplorerStore();
    const [data, setData] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // State Pengatur Tab Visual
    const [activeTab, setActiveTab] = useState<TabType>("umum");

    const [isCompareMode, setIsCompareMode] = useState(false);
    const [compareDistrictId, setCompareDistrictId] = useState<string>("");
    const [aiPrompt, setAiPrompt] = useState("");
    const [aiResponse, setAiResponse] = useState<string>("");
    const [aiLoading, setAiLoading] = useState(false);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

    // Memuat riwayat chat/prompt terakhir untuk distrik ini secara proaktif
    useEffect(() => {
        if (activeTab !== "analisis") return;

        const loadLastSession = async () => {
            try {
                const sessions = await AiAssistantService.listQaSessions();
                // Cari sesi obrolan terakhir yang judulnya mengandung nama distrik ini
                const matchingSessions = sessions
                    .filter(s => s.title && s.title.includes(districtName))
                    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

                if (matchingSessions.length > 0) {
                    const lastSession = matchingSessions[0];
                    setActiveSessionId(lastSession.id);

                    // Ambil detail pesan dari sesi tersebut
                    const details = await AiAssistantService.getQaSessionDetail(lastSession.id);
                    if (details && details.messages && details.messages.length > 0) {
                        // Temukan pesan ASSISTANT terakhir
                        const assistantMsgs = details.messages.filter(m => m.role === 'ASSISTANT');
                        if (assistantMsgs.length > 0) {
                            setAiResponse(assistantMsgs[assistantMsgs.length - 1].content);
                        }
                    }
                } else {
                    // Reset jika tidak ada sesi sebelumnya
                    setActiveSessionId(null);
                    setAiResponse("");
                }
            } catch (err) {
                console.error("Gagal memuat riwayat sesi:", err);
            }
        };

        loadLastSession();
    }, [activeTab, districtName]);

    const quickSuggestions = [
        "Analisis Stunting",
        "Kendala Jalan Darat",
        "Kondisi Pendidikan",
    ];

    const handleSuggestionClick = (suggestion: string) => {
        setAiPrompt(suggestion);
    };

    const handleAiSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!aiPrompt.trim() || aiLoading) return;

        setAiLoading(true);
        setAiResponse("");

        try {
            const docs = await DocumentService.listDocuments();
            const docIds = docs.filter(d => d.status === 'READY').map(d => d.id);

            const sessionTitle = isCompareMode && compareDistrictId
                ? `Komparasi Spasial: ${districtName} vs ${MOCK_DRILLDOWN_DETAILS[Number(compareDistrictId)]?.district_name}`
                : `Analisis Spasial: ${districtName}`;

            let sessionId = activeSessionId;
            if (!sessionId) {
                sessionId = await AiAssistantService.createSession(
                    docIds[0] || "",
                    sessionTitle,
                    docIds
                );
                setActiveSessionId(sessionId);
            }

            const districtsToQuery = [districtName];
            if (isCompareMode && compareDistrictId) {
                const compName = MOCK_DRILLDOWN_DETAILS[Number(compareDistrictId)]?.district_name;
                if (compName) districtsToQuery.push(compName);
            }

            const promptSuffix = isCompareMode && compareDistrictId
                ? ` [Komparasi Wilayah: ${districtName} dan ${MOCK_DRILLDOWN_DETAILS[Number(compareDistrictId)]?.district_name || '?'}]`
                : ` [Konteks Wilayah: ${districtName}]`;

            const fullPrompt = `${aiPrompt}${promptSuffix}`;

            const response = await AiAssistantService.sendQuery(
                sessionId,
                fullPrompt,
                undefined,
                undefined,
                docIds,
                "solutif",
                "MEDIUM",
                districtsToQuery
            );

            if (response && response.data && response.data.answer) {
                setAiResponse(response.data.answer);
            } else {
                setAiResponse("Maaf, asisten gagal merumuskan hasil analisis. Silakan coba lagi.");
            }
        } catch (err: any) {
            console.error("Gagal melakukan analisis AI spasial:", err);
            setAiResponse(`Gagal: ${err.message || "Kesalahan jaringan."}`);
        } finally {
            setAiLoading(false);
        }
    };

    // Memuat profil detail wilayah instan secara lokal
    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError(null);

        const timer = setTimeout(() => {
            if (!isMounted) return;

            const matchedData = MOCK_DRILLDOWN_DETAILS[Number(districtId)];
            if (matchedData) {
                setData(matchedData);
            } else {
                setError("Data profil distrik tidak terdaftar di database.");
            }
            setLoading(false);
        }, 120);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [districtId]);


    if (loading) {
        return (
            <div className="space-y-4 animate-pulse px-4 py-5 bg-white h-full w-full select-none">
                <div className="h-6 w-full bg-slate-200" />
                <div className="h-3 w-3/4 bg-slate-200" />
                <div className="h-3 w-full bg-slate-200" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4 bg-white h-full w-full select-none">
                <AlertCircle className="text-rose-600 mb-3" size={28} />
                <p className="text-[12px] font-bold text-slate-700">{error || "Sistem Gagal Memuat Data"}</p>
                {panelId && (
                    <button
                        onClick={() => closePanel(panelId)}
                        className="mt-4 px-3 py-1.5 border border-slate-300 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                        Tutup Panel
                    </button>
                )}
            </div>
        );
    }

    const profileImages = data.profile.images || [];

    return (
        <div className="flex flex-col w-full h-full bg-white relative text-slate-800">

            {/* SECTION 1: HEADER & TAB - Rapat Siku (Anti Nested-Box) */}
            <div className="flex flex-col border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm select-none">
                {/* Title Bar */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-slate-50">
                    <div className="flex flex-col text-left">
                        <span className="text-[9px] font-bold text-teal-700 uppercase tracking-widest leading-none">
                            Profil Wilayah
                        </span>
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider truncate mt-1">
                            {districtName}
                        </h3>
                    </div>

                    {panelId && (
                        <button
                            onClick={() => closePanel(panelId)}
                            className="p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-900 transition-colors rounded-none cursor-pointer shrink-0"
                            title="Tutup Panel"
                        >
                            <X size={14} strokeWidth={2.5} />
                        </button>
                    )}
                </div>

                {/* Tab Navigator */}
                <div className="flex bg-white">
                    <button
                        onClick={() => setActiveTab("umum")}
                        className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${activeTab === "umum"
                            ? "border-b-2 border-teal-700 text-teal-800 bg-teal-50/30"
                            : "border-b-2 border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                            }`}
                    >
                        Data Umum
                    </button>
                    <button
                        onClick={() => setActiveTab("analisis")}
                        className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${activeTab === "analisis"
                            ? "border-b-2 border-teal-700 text-teal-800 bg-teal-50/30"
                            : "border-b-2 border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                            }`}
                    >
                        Analitik Data
                    </button>
                </div>
            </div>

            {/* TAB CONTENT A: DATA UMUM */}
            {activeTab === "umum" && (
                <div className="flex flex-col flex-1 overflow-y-auto pb-6 bg-white animate-in fade-in duration-200">
                    {/* Hero Image Slider */}
                    <ImageCarousel images={profileImages} altText={`Visualisasi Wilayah ${districtName}`} />

                    {/* Geografi & Kependudukan (High-Density Row) */}
                    <div className="flex flex-col border-b border-slate-200 py-3 px-4 gap-2.5 bg-white select-none">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-slate-500">
                                <Maximize2 size={13} strokeWidth={2.5} className="text-teal-700" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Luas Wilayah</span>
                            </div>
                            <div className="text-right flex items-baseline gap-1">
                                <span className="text-[13px] font-bold tracking-tight text-slate-800">
                                    {data.profile.luas_wilayah.toLocaleString('id-ID')}
                                </span>
                                <span className="text-[9px] text-slate-500 font-bold uppercase">km²</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-slate-500">
                                <Users size={13} strokeWidth={2.5} className="text-teal-700" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Total Populasi</span>
                            </div>
                            <div className="text-right flex items-baseline gap-1">
                                <span className="text-[13px] font-bold tracking-tight text-slate-800">
                                    {data.profile.jumlah_penduduk.toLocaleString('id-ID')}
                                </span>
                                <span className="text-[9px] text-slate-500 font-bold uppercase">Jiwa</span>
                            </div>
                        </div>
                    </div>

                    {/* Deskripsi Gambaran Umum */}
                    <div className="flex flex-col border-b border-slate-200 py-3 px-4 gap-1.5 bg-white text-left">
                        <div className="flex items-center gap-2 text-slate-500 mb-0.5 select-none">
                            <FileText size={13} strokeWidth={2.5} className="text-teal-700" />
                            <h4 className="text-[10px] font-bold uppercase tracking-wider">Gambaran Umum</h4>
                        </div>
                        <p className="text-[11px] text-slate-700 font-normal leading-relaxed text-justify">
                            {data.profile.deskripsi}
                        </p>
                    </div>

                    {/* Batas Batas Wilayah */}
                    <div className="flex flex-col border-b border-slate-200 py-3 px-4 gap-1.5 bg-white text-left">
                        <div className="flex items-center gap-2 text-slate-500 mb-0.5 select-none">
                            <MapPin size={13} strokeWidth={2.5} className="text-teal-700" />
                            <h4 className="text-[10px] font-bold uppercase tracking-wider">Batas Administrasi</h4>
                        </div>
                        <p className="text-[11px] text-slate-800 font-bold leading-relaxed">
                            {data.profile.batas_wilayah}
                        </p>
                    </div>
                </div>
            )}

            {/* TAB CONTENT B: DATA ANALISIS */}
            {activeTab === "analisis" && (
                <div className="flex flex-col flex-1 overflow-y-auto bg-white animate-in fade-in duration-200">

                    {/* SECTION: ASISTEN ANALITIK SPASIAL AI */}
                    <div className="pt-5 flex flex-col text-left">
                        <div className="flex items-center gap-2 text-slate-500 mb-1 px-4 select-none">
                            <Sparkles size={13} strokeWidth={2.5} className="text-teal-700 animate-pulse" />
                            <h4 className="text-[10px] font-bold uppercase tracking-wider">Asisten Analitik Spasial AI</h4>
                        </div>
                        <p className="text-[10px] text-slate-500 mb-4 px-4 font-normal leading-relaxed">
                            Tanyakan analisis taktis mengenai kondisi pembangunan, kemiskinan, atau kendala proyek di distrik ini menggunakan referensi dokumen kajian.
                        </p>

                        {/* COMPATIBILITY / COMPARE MODE TOGGLE */}
                        <div className="bg-slate-50 border-b border-t border-slate-200 p-3 mb-4 rounded-none">
                            <div className="flex w-full items-center justify-between px-1">
                                <label className="text-[11px] font-bold text-slate-700 uppercase cursor-pointer select-none" htmlFor="compareToggle">
                                    Bandingkan dengan Distrik Lain
                                </label>
                                <input
                                    id="compareToggle"
                                    type="checkbox"
                                    checked={isCompareMode}
                                    onChange={(e) => {
                                        setIsCompareMode(e.target.checked);
                                        if (!e.target.checked) setCompareDistrictId("");
                                    }}
                                    className="accent-teal-700 cursor-pointer h-3.5 w-3.5"
                                />
                            </div>

                            {isCompareMode && (
                                <div className="mt-3 flex flex-col gap-1.5 px-1 animate-in slide-in-from-top-2 duration-150">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pilih Distrik Pembanding:</span>
                                    <select
                                        value={compareDistrictId}
                                        onChange={(e) => setCompareDistrictId(e.target.value)}
                                        className="w-full bg-white border border-slate-300 text-slate-800 text-[11px] font-semibold px-2.5 py-1.5 rounded-none focus:outline-none focus:border-teal-600"
                                    >
                                        <option value="">-- Pilih Wilayah --</option>
                                        {Object.entries(MOCK_DRILLDOWN_DETAILS)
                                            .filter(([id]) => Number(id) !== Number(districtId))
                                            .map(([id, item]) => (
                                                <option key={id} value={id}>{item.district_name}</option>
                                            ))
                                        }
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* SUGGESTIONS */}
                        <div className="mb-4 px-4">
                            <p className="mb-2 text-[9px] font-normal uppercase text-slate-400">
                                Saran Analisis
                            </p>

                            <div className="flex flex-col">
                                {quickSuggestions.map((sug, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSuggestionClick(sug)}
                                        className="
                                            flex items-center
                                            py-2
                                            text-left
                                            text-[11px]
                                            text-slate-600
                                            border-b border-slate-100
                                            hover:text-teal-700
                                            hover:bg-slate-50
                                        "
                                    >
                                        <span className="mr-2 text-teal-600">→</span>
                                        {sug}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* CHAT DISPLAY */}
                        {aiResponse && (
                            <div className="border-t border-slate-200 p-4 bg-slate-50/30 overflow-y-auto custom-scrollbar select-text text-left">
                                <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1.5 mb-2 select-none">
                                    <Bot size={12} className="text-teal-700" />
                                    <span className="text-[9px] font-black text-teal-800 uppercase tracking-wider">Hasil Analisis AI</span>
                                </div>
                                <div className="text-[11px] leading-relaxed text-slate-700">
                                    <RichMessageRenderer text={getCleanMarkdown(aiResponse)} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* SECTION 4: FOOTER UPDATE TIMESTAMP / INPUT DOCKED BOTTOM */}
            {activeTab === "umum" ? (
                <div className="py-2.5 px-4 bg-slate-50 text-slate-500 flex items-center justify-between border-t border-slate-200 mt-auto select-none shrink-0">
                    <div className="flex items-center gap-2">
                        <History size={12} strokeWidth={2} />
                        <span className="text-[9px] font-bold uppercase tracking-wider">Sinkronisasi Terakhir</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider font-mono">
                        {data.last_updated ? new Date(data.last_updated).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}
                    </span>
                </div>
            ) : (
                <form onSubmit={handleAiSubmit} className="flex flex-col gap-2 bg-slate-50 border-t border-slate-200 p-3 mt-auto shrink-0 select-text">
                    <div className="flex items-center gap-1.5 px-1">
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-teal-800 text-white rounded-none">
                            {isCompareMode && compareDistrictId
                                ? `Komparasi: ${districtName} vs ${MOCK_DRILLDOWN_DETAILS[Number(compareDistrictId)]?.district_name || '?'}`
                                : `Fokus: Distrik ${districtName}`}
                        </span>
                    </div>
                    <div className="flex gap-2 items-center px-1">
                        <input
                            type="text"
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            disabled={aiLoading}
                            placeholder={isCompareMode && compareDistrictId
                                ? `Bandingkan ${districtName} & ${MOCK_DRILLDOWN_DETAILS[Number(compareDistrictId)]?.district_name || '?'}`
                                : `Tanyakan kondisi di ${districtName}...`}
                            className="flex-1 bg-white border border-slate-200 rounded-none py-1.5 px-3 text-[12px] font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={aiLoading || !aiPrompt.trim()}
                            className="p-2 bg-teal-700 hover:bg-teal-800 text-white rounded-none border border-teal-800 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                            title="Kirim Pertanyaan"
                        >
                            {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        </button>
                    </div>
                </form>
            )}

        </div>
    );
}