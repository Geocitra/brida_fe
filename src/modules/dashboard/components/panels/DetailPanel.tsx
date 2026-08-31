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
import { AdminService } from "../../../../services/admin.service";

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
    const [districtsList, setDistrictsList] = useState<any[]>([]);

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

    const quickSuggestions = data?.suggestions || [
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

            const comparedDistName = districtsList.find(d => d.id === compareDistrictId)?.name || "?";

            const sessionTitle = isCompareMode && compareDistrictId
                ? `Komparasi Spasial: ${districtName} vs ${comparedDistName}`
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
                districtsToQuery.push(comparedDistName);
            }

            const promptSuffix = isCompareMode && compareDistrictId
                ? ` [Komparasi Wilayah: ${districtName} dan ${comparedDistName}]`
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

    // Memuat profil detail wilayah secara dinamis dari database
    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError(null);

        const loadDistrictData = async () => {
            try {
                const list = await AdminService.getDistrictsPublic();
                if (!isMounted) return;

                setDistrictsList(list);

                const matched = list.find(
                    (d: any) => d.name.toLowerCase() === districtName.toLowerCase()
                );
                if (matched) {
                    // Map matched db schema fields to DetailPanel expected format
                    const formatted = {
                        district_id: matched.id,
                        district_name: matched.name,
                        profile: {
                            luas_wilayah: matched.luasWilayah,
                            jumlah_penduduk: matched.jumlahPenduduk,
                            deskripsi: matched.deskripsi,
                            batas_wilayah: matched.batasWilayah,
                            images: matched.images || [],
                        },
                        suggestions: matched.suggestions || ["Analisis Stunting", "Kendala Jalan Darat", "Kondisi Pendidikan"],
                        last_updated: matched.updatedAt
                    };
                    setData(formatted);
                } else {
                    setError(`Data profil distrik "${districtName}" tidak ditemukan di database.`);
                }
            } catch (err: any) {
                if (isMounted) {
                    setError(err.message || "Gagal memuat data distrik dari database.");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadDistrictData();
        return () => {
            isMounted = false;
        };
    }, [districtName]);


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
                                        {districtsList
                                            .filter((item) => item.name.toLowerCase() !== districtName.toLowerCase())
                                            .map((item) => (
                                                <option key={item.id} value={item.id}>{item.name}</option>
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
                                {quickSuggestions.map((sug: string, i: number) => (
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
                                ? `Komparasi: ${districtName} vs ${districtsList.find(d => d.id === compareDistrictId)?.name || '?'}`
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
                                ? `Bandingkan ${districtName} & ${districtsList.find(d => d.id === compareDistrictId)?.name || '?'}`
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