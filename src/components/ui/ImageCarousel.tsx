"use client";

import React, { useState, useRef } from "react";
import { Layers, Maximize2 } from "lucide-react";
import { useExplorerStore } from "../../modules/dashboard/store/useExplorerStore";

interface ImageCarouselProps {
    images: string[];
    altText?: string;
}

/**
 * ImageCarousel - Komponen Slider Media Horizontal
 * Menggunakan mekanisme snap-scroll CSS murni yang sangat cepat dan ringan.
 * Bertindak sebagai pemantik (*trigger*) utama untuk mengaktifkan "Theater Mode" (Gallery Overlay).
 */
export default function ImageCarousel({
    images,
    altText = "Media Aset"
}: ImageCarouselProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    // Mengambil aksi Buka Galeri Sinematik dari Store Zustand
    const { openGallery } = useExplorerStore();

    // Skenario A: Tidak ada foto (Render Empty State)
    if (!images || images.length === 0) {
        return (
            <div className="w-full aspect-video bg-slate-100 flex flex-col items-center justify-center border-b border-slate-200 shrink-0 select-none">
                <Layers size={24} className="text-slate-300 mb-2" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Tidak Ada Visualisasi Foto
                </span>
            </div>
        );
    }

    // Skenario B: Hanya ada 1 gambar (Klik langsung memicu Teater)
    if (images.length === 1) {
        return (
            <button
                onClick={() => openGallery(images, 0, altText)}
                className="relative w-full aspect-video border-b border-slate-200 bg-slate-100 shrink-0 group block cursor-pointer overflow-hidden rounded-none"
            >
                <img
                    src={images[0]}
                    alt={altText}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    draggable={false}
                />
                <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-colors pointer-events-none" />

                {/* Overlay Trigger Hover */}
                <div className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-md px-2.5 py-1.5 flex items-center gap-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity border border-white/20 select-none">
                    <Maximize2 size={12} strokeWidth={2.5} />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Perbesar</span>
                </div>
            </button>
        );
    }

    // Sinkronisasi indikator pagination titik (dots) dengan pergeseran scroll kontainer
    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const scrollPosition = scrollContainerRef.current.scrollLeft;
        const width = scrollContainerRef.current.clientWidth;
        const newIndex = Math.round(scrollPosition / width);
        setActiveIndex(newIndex);
    };

    return (
        <div className="relative w-full aspect-video border-b border-slate-200 bg-slate-900 shrink-0 group">

            {/* SCROLL SNAP CONTAINER (Tanpa panah manual untuk menjaga estetika ramping) */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex w-full h-full overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
                {images.map((src, idx) => (
                    <button
                        key={idx}
                        onClick={() => openGallery(images, idx, altText)} // Klik gambar manapun membuka Teater di indeks terkait
                        className="w-full h-full shrink-0 snap-center relative block cursor-pointer rounded-none border-none p-0"
                    >
                        <img
                            src={src}
                            alt={`${altText} - Foto ke-${idx + 1}`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                            draggable={false}
                        />
                        {/* Gradasi Gelap Bawah agar indikator dots tetap kontras terlihat */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent pointer-events-none" />
                    </button>
                ))}
            </div>

            {/* TRIGGER THEATER OVERLAY - Kanan Bawah */}
            <button
                onClick={() => openGallery(images, activeIndex, altText)}
                className="absolute bottom-2 right-2 z-10 bg-slate-900/80 hover:bg-teal-600 backdrop-blur-md px-2.5 py-1.5 flex items-center gap-1.5 text-white transition-all border border-white/20 shadow-md group-hover:scale-105 cursor-pointer rounded-none"
            >
                <Maximize2 size={12} strokeWidth={2.5} />
                <span className="text-[9px] font-black uppercase tracking-widest select-none">
                    Lihat {images.length} Foto
                </span>
            </button>

            {/* DOTS PAGINATION INDICATOR - Kiri Bawah */}
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 z-10 pointer-events-none select-none">
                {images.map((_, idx) => (
                    <div
                        key={idx}
                        className={`transition-all duration-300 rounded-none ${idx === activeIndex
                            ? "w-4 h-1.5 bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]"
                            : "w-1.5 h-1.5 bg-white/40"
                            }`}
                    />
                ))}
            </div>

        </div>
    );
}