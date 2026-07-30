"use client";

import React, { useState, useRef } from "react";
import { Layers, Maximize2 } from "lucide-react";
import { useExplorerStore } from "../../modules/dashboard/store/useExplorerStore";

interface ImageCarouselProps {
    images: string[];
    altText?: string;
}

export default function ImageCarousel({
    images,
    altText = "Media Aset"
}: ImageCarouselProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const { openGallery } = useExplorerStore();

    // ── KELAS UTAS UNTUK RASIO ASPEK KONSISTEN & HD RENDERING ──
    // Menggunakan aspect-[16/10] untuk kestabilan layout di semua panel detail wilayah & aset.
    // Menambahkan class transform-gpu dan backface-visibility untuk memastikan ketajaman (HD) rendering srgb.
    const containerClasses = "w-full aspect-[16/10] bg-slate-950 border-b border-slate-200 shrink-0 select-none overflow-hidden relative group rounded-none";
    const imageClasses = "w-full h-full object-cover object-center transform-gpu scale-100 hover:scale-103 transition-transform duration-500 ease-out will-change-transform";

    // 1. Kondisi: Tidak Ada Gambar (Fallback Frame Harus Tetap Konsisten)
    if (!images || images.length === 0) {
        return (
            <div className={`${containerClasses} flex flex-col items-center justify-center bg-slate-100`}>
                <Layers size={22} className="text-slate-300 mb-1.5 animate-pulse" />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Tidak Ada Visualisasi Foto
                </span>
            </div>
        );
    }

    // 2. Kondisi: Satu Gambar (Single Image View)
    if (images.length === 1) {
        return (
            <button
                type="button"
                onClick={() => openGallery(images, 0, altText)}
                className={`${containerClasses} block cursor-pointer border-none p-0`}
            >
                <img
                    src={images[0]}
                    alt={altText}
                    className={imageClasses}
                    loading="lazy"
                    draggable={false}
                />
                <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/20 transition-colors duration-300 pointer-events-none" />

                {/* Tombol Perbesar Hover */}
                <div className="absolute bottom-3.5 right-3.5 bg-slate-900/90 backdrop-blur-md px-3 py-2 flex items-center gap-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 border border-white/10 shadow-lg pointer-events-none">
                    <Maximize2 size={11} strokeWidth={2.5} />
                    <span className="text-[8px] font-black uppercase tracking-widest">Perbesar</span>
                </div>
            </button>
        );
    }

    // 3. Kondisi: Banyak Gambar (Carousel Scroller View)
    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const scrollPosition = scrollContainerRef.current.scrollLeft;
        const width = scrollContainerRef.current.clientWidth;
        if (width > 0) {
            const newIndex = Math.round(scrollPosition / width);
            setActiveIndex(newIndex);
        }
    };

    return (
        <div className={containerClasses}>
            {/* Viewport Scroll Horizontal */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex w-full h-full overflow-x-auto snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
                {images.map((src, idx) => (
                    <button
                        key={idx}
                        type="button"
                        onClick={() => openGallery(images, idx, altText)}
                        className="w-full h-full shrink-0 snap-center relative block cursor-pointer rounded-none border-none p-0"
                    >
                        <img
                            src={src}
                            alt={`${altText} - Foto ke-${idx + 1}`}
                            className={imageClasses}
                            loading="lazy"
                            draggable={false}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />
                    </button>
                ))}
            </div>

            {/* Tombol Aksi Kerapatan Perbesar Gambar */}
            <button
                type="button"
                onClick={() => openGallery(images, activeIndex, altText)}
                className="absolute bottom-3 right-3 z-10 bg-slate-900/90 hover:bg-teal-700 backdrop-blur-md px-3 py-2 flex items-center gap-1.5 text-white transition-all duration-300 border border-white/10 shadow-lg cursor-pointer rounded-none hover:scale-102"
            >
                <Maximize2 size={11} strokeWidth={2.5} />
                <span className="text-[8px] font-black uppercase tracking-widest select-none">
                    Lihat {images.length} Foto
                </span>
            </button>

            {/* Indikator Titik Paginasi */}
            <div className="absolute bottom-4 left-4 flex items-center gap-1.5 z-10 pointer-events-none select-none">
                {images.map((_, idx) => (
                    <div
                        key={idx}
                        className={`transition-all duration-300 h-1 rounded-none ${idx === activeIndex
                            ? "w-5 bg-teal-400 shadow-[0_0_8px_rgba(20,184,166,0.8)]"
                            : "w-1.5 bg-white/40"
                            }`}
                    />
                ))}
            </div>
        </div>
    );
}