import React from 'react';
import { Cpu, Calendar } from 'lucide-react';

export const WelcomeHeader: React.FC = () => {
    // Mengambil tanggal dengan representasi formal bahasa lokal
    const today = new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    return (
        <div className="w-full py-1 flex flex-col md:flex-row md:items-center md:justify-between gap-4 font-roboto">
            {/* Sisi Kiri: Salam & Peran Eksekutif */}
            <div className="flex flex-col text-left space-y-1">
                <span className="text-[10px] font-bold tracking-widest text-teal-800 uppercase flex items-center gap-1.5 select-none">
                    <Cpu size={12} className="text-teal-700" />
                    <span>Sistem Manajemen Pengetahuan Terintegrasi</span>
                </span>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight uppercase">
                    Selamat Datang 
                </h1>
                <p className="text-xs text-slate-500 font-normal leading-relaxed max-w-3xl">
                    Portal Analisis Kebijakan, Inovasi, dan Pusat Pengendali Spasial Terintegrasi.
                </p>
            </div>

            {/* Sisi Kanan: Status Kalender (Gunakan border kiri tipis untuk pemisah seksi) */}
            <div className="flex items-center md:border-l md:border-slate-200 md:pl-6 shrink-0 no-print">
                <div className="text-left space-y-1 select-none">
                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-widest block">
                        Kalender Kerja Sesi
                    </span>
                    <span className="text-xs font-bold text-slate-700 block flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-500" />
                        <span>{today}</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 font-extrabold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Otorisasi Executive Aktif
                    </span>
                </div>
            </div>
        </div>
    );
};

export default WelcomeHeader;