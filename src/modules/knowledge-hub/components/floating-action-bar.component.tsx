import React from 'react';
import {
    MessageSquareCode,
    BarChart3,
    FileText,
    PenTool,
    X,
} from 'lucide-react';

export interface FloatingActionBarProps {
    selectedCount: number;
    onClearSelection: () => void;
    onForward: (targetRoute: string) => void;
}

export const FloatingActionBar: React.FC<FloatingActionBarProps> = ({
    selectedCount,
    onClearSelection,
    onForward,
}) => {
    // Matriks aksi dengan skema outline netral yang seragam (cohesive monochrome)
    const actionItems = [
        {
            id: 'ai-request',
            label: 'Tanya AI Chat',
            icon: MessageSquareCode,
            isPrimary: true, // Aksen putih solid kontras tinggi (Vercel/Linear style)
        },
        {
            id: 'analytics',
            label: 'Analisis Deviasi',
            icon: BarChart3,
            isPrimary: false,
        },
        {
            id: 'reports',
            label: 'Nota Dinas Bupati',
            icon: FileText,
            isPrimary: false,
        },
        {
            id: 'generator',
            label: 'Generate Artikel',
            icon: PenTool,
            isPrimary: false,
        },
    ];

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-3rem)] max-w-5xl bg-zinc-950/95 backdrop-blur-md text-zinc-100 border border-zinc-800 p-4 md:py-3 md:px-5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 rounded-none animate-in fade-in slide-in-from-bottom-3 duration-250 no-print font-roboto">

            {/* SISI KIRI: INDIKATOR SELEKSI MINIMALIS (TANPA NESTED BOX) */}
            <div className="flex items-center justify-between lg:justify-start gap-4">
                <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-extrabold text-sm text-white bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-none">
                        {selectedCount}
                    </span>
                    <span className="font-bold text-zinc-300 uppercase tracking-widest text-[10px]">
                        Dokumen Terpilih
                    </span>
                    <span className="hidden sm:inline text-zinc-600 font-normal">|</span>
                    <span className="hidden sm:inline text-[11px] text-zinc-400 font-medium">
                        Siap diteruskan ke modul AI [3]
                    </span>
                </div>

                {/* Tombol Batal: Ghost link tanpa border tebal */}
                <button
                    onClick={onClearSelection}
                    className="text-zinc-500 hover:text-zinc-200 transition-colors duration-150 cursor-pointer inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest"
                    title="Batalkan semua pilihan"
                >
                    <X size={11} />
                    <span>Batal</span>
                </button>
            </div>

            {/* SISI KANAN: PILIHAN FORWARD AKSI (OUTLINE UNIFORM) */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 shrink-0">
                {actionItems.map((item) => {
                    const IconComponent = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onForward(item.id)}
                            className={`
                px-3.5 py-2 text-[10px] font-bold uppercase tracking-widest transition-all duration-150 cursor-pointer rounded-none flex items-center justify-center gap-1.5
                ${item.isPrimary
                                    ? 'bg-white hover:bg-zinc-200 text-zinc-950 font-extrabold border border-white'
                                    : 'bg-transparent hover:bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800'
                                }
              `}
                            title={`Forward ke ${item.label}`}
                        >
                            <IconComponent size={12} className="shrink-0" />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};