"use client";

import React from "react";
import {
    ShieldCheck,
    Database,
    Code,
    Globe,
    CheckCircle2,
    Building2,
    Users,
    Cpu
} from "lucide-react";

/**
 * AboutPanel - Edge-to-Edge / Frameless Paradigm
 * Menyajikan visi digitalisasi riset tanpa nested boxes (tanpa card tumpuk).
 * Menggunakan pembatas garis rambut 1px yang sangat bersih.
 */
export default function AboutPanel() {
    return (
        <div className="flex flex-col h-full bg-white pb-12 animate-in fade-in slide-in-from-left-4 duration-500 overflow-y-auto custom-scrollbar text-slate-800">

            {/* 1. HERO BRANDING SECTION: Centered Logo & Title */}
            <div className="flex flex-col items-center text-center py-6 px-4 bg-slate-50 border-b border-slate-200 select-none">
                {/* Logo Container Sharp Edges (0px radius) */}
                <div className="relative w-16 h-16 bg-teal-50 border border-teal-200 flex items-center justify-center mb-2.5 text-teal-700">
                    <Building2 size={28} />
                </div>
                <div className="space-y-1">
                    <h2 className="text-sm font-black text-slate-800 tracking-wider leading-none uppercase">
                        Policy Brief <span className="text-teal-700">DataHub</span>
                    </h2>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] leading-none mt-1">
                        v1.0.0-dev Spasial Engine
                    </p>
                </div>
            </div>

            {/* 2. VISI & MISI: Flush List Layout */}
            <div className="flex flex-col">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-slate-500 select-none">
                    <ShieldCheck size={14} className="text-teal-700 shrink-0" />
                    <h4 className="text-[10px] font-black uppercase tracking-wider">Visi Digitalisasi Kebijakan</h4>
                </div>

                <div className="px-5 py-5 bg-teal-50/20 border-b border-slate-200 select-none">
                    <p className="text-[11px] font-bold text-teal-900 italic leading-relaxed text-center">
                        "Mewujudkan ekosistem pengambilan keputusan daerah yang akurat, deterministik, dan bebas bias melalui integrasi analisis dokumen kognitif dan spasial."
                    </p>
                </div>

                {/* List Pilar Misi (Edge-to-Edge Items) */}
                <div className="flex flex-col select-none">
                    {[
                        "Konsolidasi Kajian & Dokumen Perencanaan Daerah",
                        "Sintesis Causal Inference AI Berbasis Bukti Lapangan",
                        "Diseminasi Spasial Dinamis Pendukung Keputusan"
                    ].map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 w-full hover:bg-slate-50 transition-colors">
                            <CheckCircle2 size={13} strokeWidth={2.5} className="text-teal-600 shrink-0" />
                            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tight text-left">
                                {item}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 3. DATABASES & DATA AUTHORITY: Informasi Sumber */}
            <div className="flex flex-col mt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-slate-500 select-none">
                    <Database size={14} className="text-teal-700 shrink-0" />
                    <h4 className="text-[10px] font-black uppercase tracking-wider">Otoritas &amp; Sumber Data</h4>
                </div>

                <div className="flex flex-col bg-white">
                    <div className="px-4 py-4 border-b border-slate-200 text-left">
                        <p className="text-[11px] text-slate-600 font-medium leading-relaxed text-justify">
                            Seluruh data spasial, metadata, dan dokumen laporan daerah dikelola secara mandiri oleh tim produsen data kognitif.
                        </p>
                    </div>

                    {/* Grid OPD Tanpa Cards, Menggunakan Desain Pembatas Tipis */}
                    <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 border-b border-slate-200 bg-slate-50/50 select-none">
                        {[
                            { name: "Analis Kebijakan", icon: Cpu },
                            { name: "Perencanaan", icon: Building2 },
                            { name: "Badan Pusat Statistik", icon: Globe },
                            { name: "Sekretariat", icon: Users }
                        ].map((opd, i) => (
                            <div key={i} className="flex items-center gap-2 px-4 py-3">
                                <opd.icon size={12} className="text-teal-700 shrink-0" />
                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-700 truncate">{opd.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 4. DEVELOPER CREDITS */}
            <div className="flex flex-col mt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-slate-500 select-none">
                    <Code size={14} className="text-teal-700 shrink-0" />
                    <h4 className="text-[10px] font-black uppercase tracking-wider">Spesifikasi Sistem</h4>
                </div>

                <div className="flex flex-col px-4 py-5 bg-white border-b border-slate-200 gap-4 text-left">
                    <div className="flex items-start gap-3">
                        {/* Box Ikon Siku-siku */}
                        <div className="w-10 h-10 rounded-none bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0 select-none">
                            <Cpu size={18} strokeWidth={2} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest leading-none">Spasial Engine V1</p>
                            <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                                Dibangun secara mandiri oleh tim analis sistem menggunakan tumpukan teknologi modern Next-generation React Klien dan Leaflet Engine.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Copyright */}
                <div className="px-4 py-6 bg-white select-none">
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest text-center leading-relaxed">
                        © 2026 Policy Brief.
                    </p>
                </div>
            </div>

        </div>
    );
}