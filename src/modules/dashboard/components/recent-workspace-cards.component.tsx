import React, { useState } from 'react';
import { PenTool, MessageSquareCode, Plus, ArrowRight, Clock, BookOpen, FileText } from 'lucide-react';

export interface RecentChat {
    id: string;
    title: string;
    lastMessage: string;
    updatedAt: string;
    sourcesCount: number;
    sources: string[];
}

export interface RecentArticle {
    id: string;
    title: string;
    snippet: string;
    updatedAt: string;
    sourcesCount: number;
    sources: string[];
    tone?: string;
    targetLength?: string;
}

interface RecentWorkspaceCardsProps {
    recentChats: RecentChat[];
    recentArticles: RecentArticle[];
    onNavigate: (route: string) => void;
    onNavigateToEditor?: (sessionId: string) => void;
}

export const RecentWorkspaceCards: React.FC<RecentWorkspaceCardsProps> = ({
    recentChats,
    recentArticles,
    onNavigate,
    onNavigateToEditor,
}) => {
    const [activeTab, setActiveTab] = useState<'ARTICLE' | 'CHAT'>('ARTICLE');

    // Fungsi Takstis untuk Membersihkan Karakter Markdown Mentah (Zero-Hallucination Plain Text Preview)
    const cleanContentPreview = (text: string) => {
        if (!text) return '';
        return text
            .replace(/[#*`_>_\-]/g, '')     // Bersihkan tanda formatting markdown
            .replace(/\[doc-.*?\]/g, '')     // Bersihkan token sitasi internal
            .replace(/\s+/g, ' ')            // Satukan spasi berlebih
            .trim();
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
            });
        } catch {
            return '-';
        }
    };

    const displayedArticles = recentArticles.slice(0, 3);
    const displayedChats = recentChats.slice(0, 3);

    const handleCreateNewActivity = () => {
        if (activeTab === 'ARTICLE') {
            onNavigate('generator');
        } else {
            onNavigate('ai-request');
        }
    };

    return (
        <div className="w-full space-y-5 font-roboto no-print">

            {/* 1. HEADER SEKSI & TAB SWITCHER MINIMALIS */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-slate-200 pb-3 select-none">
                <div className="space-y-1 text-left">
                    <h2 className="text-base font-black tracking-tight text-slate-900 uppercase">
                        Aktivitas Sesi Kerja Terbaru
                    </h2>
                    <p className="text-[11px] text-slate-500 font-medium">
                        Lanjutkan draf rilis kebijakan atau tinjau kembali asisten Q&A berdasarkan subjek dokumen daerah.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                    {/* Tab Underline Datar */}
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => setActiveTab('ARTICLE')}
                            className={`pb-3 text-xs font-black uppercase tracking-widest transition-all cursor-pointer rounded-none flex items-center gap-2 border-b-2 ${activeTab === 'ARTICLE'
                                ? 'border-teal-700 text-teal-900 font-extrabold'
                                : 'border-transparent text-slate-400 hover:text-slate-700'
                                }`}
                        >
                            <PenTool size={13} />
                            <span>Draf Artikel ({recentArticles.length})</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('CHAT')}
                            className={`pb-3 text-xs font-black uppercase tracking-widest transition-all cursor-pointer rounded-none flex items-center gap-2 border-b-2 ${activeTab === 'CHAT'
                                ? 'border-teal-700 text-teal-900 font-extrabold'
                                : 'border-transparent text-slate-400 hover:text-slate-700'
                                }`}
                        >
                            <MessageSquareCode size={13} />
                            <span>Diskusi AI ({recentChats.length})</span>
                        </button>
                    </div>

                    {/* Tombol Plus Aksi */}
                    <button
                        onClick={handleCreateNewActivity}
                        className="mb-1 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-[11px] font-black uppercase tracking-wider rounded-none inline-flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                    >
                        <Plus size={14} strokeWidth={2.5} />
                        <span>
                            {activeTab === 'ARTICLE' ? 'Buat Naskah' : 'Mulai Chat'}
                        </span>
                    </button>
                </div>
            </div>

            {/* 2. PITA TERHUBUNG (Unified Connected Ribbon - Hanya Dipisahkan Garis Slate Tipis) */}
            <div className="w-full bg-white border border-slate-200 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-200 rounded-none shadow-2xs overflow-hidden">

                {activeTab === 'ARTICLE' ? (
                    <>
                        {/* Iterasi Artikel */}
                        {displayedArticles.map((article) => (
                            <div
                                key={article.id}
                                onClick={() => onNavigateToEditor ? onNavigateToEditor(article.id) : onNavigate('generator')}
                                className="flex-1 p-5 flex flex-col justify-between h-48 hover:bg-slate-50/50 cursor-pointer transition-all duration-300 rounded-none relative text-left group"
                            >
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between select-none">
                                        <span className="text-[9px] font-black text-teal-800 bg-teal-50 px-2 py-0.5 border border-teal-150 uppercase tracking-widest">
                                            {article.tone || 'Solutif'}
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                            {article.targetLength || 'Medium'}
                                        </span>
                                    </div>
                                    <h3 className="text-xs font-bold text-slate-800 group-hover:text-teal-800 line-clamp-2 leading-snug transition-colors">
                                        {cleanContentPreview(article.title)}
                                    </h3>
                                    <p className="text-[11px] text-slate-500 line-clamp-3 leading-relaxed font-normal">
                                        {cleanContentPreview(article.snippet) || 'Mempersiapkan rilis naskah komprehensif daerah...'}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2 text-[10px] text-slate-400 font-semibold select-none">
                                    <span className="flex items-center gap-1.5">
                                        <BookOpen size={11} className="text-slate-400" />
                                        <span>{article.sourcesCount} Rujukan</span>
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Clock size={11} />
                                        <span>{formatDate(article.updatedAt)}</span>
                                    </span>
                                </div>
                            </div>
                        ))}

                        {/* Placeholder kosong jika draf 0 */}
                        {displayedArticles.length === 0 && (
                            <div className="flex-1 p-8 flex flex-col items-center justify-center text-center text-slate-400 h-48 select-none bg-white">
                                <FileText size={24} className="opacity-40 mb-1" />
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Belum ada draf naskah rilis</span>
                                <p className="text-[10px] text-slate-500 max-w-xs mt-1">Gunakan tombol di atas untuk menyusun draf naskah pertama daerah.</p>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {/* Iterasi Chat Sesi */}
                        {displayedChats.map((chat) => (
                            <div
                                key={chat.id}
                                onClick={() => onNavigate(`ai-request?session=${chat.id}`)}
                                className="flex-1 p-5 flex flex-col justify-between h-48 hover:bg-slate-50/50 cursor-pointer transition-all duration-300 rounded-none relative text-left group"
                            >
                                <div className="space-y-2">
                                    <span className="text-[9px] font-black text-teal-800 bg-teal-50 px-2 py-0.5 border border-teal-150 uppercase tracking-widest select-none inline-block">
                                        Diskusi Faktual RAG
                                    </span>
                                    <h3 className="text-xs font-bold text-slate-800 group-hover:text-teal-800 line-clamp-2 leading-snug transition-colors">
                                        {cleanContentPreview(chat.title)}
                                    </h3>
                                    <p className="text-[11px] text-slate-500 line-clamp-3 leading-relaxed font-normal italic">
                                        "{cleanContentPreview(chat.lastMessage)}"
                                    </p>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2 text-[10px] text-slate-400 font-semibold select-none">
                                    <span className="flex items-center gap-1.5">
                                        <BookOpen size={11} className="text-slate-400" />
                                        <span>{chat.sourcesCount} Dokumen</span>
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Clock size={11} />
                                        <span>{formatDate(chat.updatedAt)}</span>
                                    </span>
                                </div>
                            </div>
                        ))}

                        {displayedChats.length === 0 && (
                            <div className="flex-1 p-8 flex flex-col items-center justify-center text-center text-slate-400 h-48 select-none bg-white">
                                <MessageSquareCode size={24} className="opacity-40 mb-1" />
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Belum ada diskusi kasus</span>
                                <p className="text-[10px] text-slate-500 max-w-xs mt-1">Gunakan tombol di atas untuk meluncurkan ruang diskusi interaktif.</p>
                            </div>
                        )}
                    </>
                )}

                {/* KOLOM PENUTUP: "Lihat Semua" yang Terbuka & Terang (High Readability) */}
                <div
                    onClick={() => onNavigate(activeTab === 'ARTICLE' ? 'generator' : 'ai-request')}
                    className="w-full md:w-64 p-5 bg-teal-50/40 hover:bg-teal-50/90 flex flex-col justify-between h-48 transition-all duration-300 rounded-none select-none text-left group"
                >
                    <div className="space-y-1.5">
                        <span className="text-[9px] font-black text-teal-800 uppercase tracking-widest block select-none">
                            Daftar Riwayat
                        </span>
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 leading-snug">
                            {activeTab === 'ARTICLE' ? 'Buka Ruang Artikel' : 'Tinjau Semua Chat'}
                        </h3>
                        <p className="text-[10px] text-slate-600 leading-relaxed font-normal">
                            Kelola seluruh draf naskah publikasi atau lakukan pembersihan arsip secara berkala di database.
                        </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-teal-200/50 text-[10px] text-teal-800 font-black tracking-wider uppercase group-hover:text-teal-950 transition-colors">
                        <span>Lihat Semua</span>
                        <ArrowRight size={13} className="group-hover:translate-x-1.5 transition-transform duration-300 text-teal-700" />
                    </div>
                </div>

            </div>
        </div>
    );
};

export default RecentWorkspaceCards;