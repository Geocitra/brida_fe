import React, { useState, useEffect } from 'react';
import {
  PenTool,
  MessageSquareCode,
  BarChart3,
  FileText,
  ChevronRight,
  Database,
  Globe,
  Search,
  ChevronDown
} from 'lucide-react';
import { SpatialPreviewWrapper } from '../components/spatial-preview-wrapper.component';
import { MOCK_DATA } from '../../../services/mock-data.service';

interface LandingViewProps {
  onNavigate: (route: string) => void;
  isAuthenticated: boolean;
  onLogout: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onNavigate, isAuthenticated, onLogout }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const mainModules = [
    {
      id: 'generator',
      title: 'Generator Artikel & Laporan',
      badge: 'AI Co-Writer',
      desc: 'Collaborative workspace untuk merancang naskah publikasi kebijakan, draf artikel ilmiah, dan opini publik berbasis integrasi data dokumen secara instan.',
      icon: PenTool,
      accentBg: 'bg-teal-500',
      accentLight: 'bg-teal-50',
      accentText: 'text-teal-700',
      accentBorder: 'border-slate-200 hover:border-teal-400',
      iconBg: 'bg-teal-100 text-teal-600',
      badgeBg: 'bg-teal-50 text-teal-600 border-teal-200',
      hoverAccent: 'hover:shadow-teal-100/60',
    },
    {
      id: 'ai-request',
      title: 'AI Chat & Asisten Q&A',
      badge: 'RAG Engine',
      desc: 'Asisten dialog interaktif cerdas untuk menjelajahi repositori dokumen daerah, menjawab pertanyaan spesifik, serta mengarsipkan riwayat obrolan.',
      icon: MessageSquareCode,
      accentBg: 'bg-blue-500',
      accentLight: 'bg-blue-50',
      accentText: 'text-blue-700',
      accentBorder: 'border-slate-200 hover:border-blue-400',
      iconBg: 'bg-blue-100 text-blue-600',
      badgeBg: 'bg-blue-50 text-blue-600 border-blue-200',
      hoverAccent: 'hover:shadow-blue-100/60',
    },
    {
      id: 'analytics',
      title: 'Lembar Diagnostik & Analisa',
      badge: 'Causal Inference',
      desc: 'Sistem analisis deviasi capaian kinerja antara baseline target pembangunan vs realisasi lapangan dengan pemodelan faktor penyebab (AI).',
      icon: BarChart3,
      accentBg: 'bg-indigo-500',
      accentLight: 'bg-indigo-50',
      accentText: 'text-indigo-700',
      accentBorder: 'border-slate-200 hover:border-indigo-400',
      iconBg: 'bg-indigo-100 text-indigo-600',
      badgeBg: 'bg-indigo-50 text-indigo-600 border-indigo-200',
      hoverAccent: 'hover:shadow-indigo-100/60',
    },
    {
      id: 'reports',
      title: 'Laporan & Nota Dinas',
      badge: 'Executive Briefs',
      desc: 'Pembuatan draf laporan eksekutif terstruktur, nota dinas taklimat eksekutif, dan simulasi proyeksi dampak dari dinamika kebijakan nasional.',
      icon: FileText,
      accentBg: 'bg-amber-500',
      accentLight: 'bg-amber-50',
      accentText: 'text-amber-700',
      accentBorder: 'border-slate-200 hover:border-amber-400',
      iconBg: 'bg-amber-100 text-amber-600',
      badgeBg: 'bg-amber-50 text-amber-600 border-amber-200',
      hoverAccent: 'hover:shadow-amber-100/60',
    }
  ];

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-800 flex flex-col justify-between relative overflow-x-hidden font-roboto">

      {/* LAYERED GEOMETRIC GRID & DYNAMIC GLOW (Latar Belakang Estetis) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.25] transition-transform duration-1000 ease-out"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #94a3b8 1px, transparent 0)`,
            backgroundSize: '32px 32px',
            transform: `translate(${mousePos.x * 0.01}px, ${mousePos.y * 0.01}px)`,
          }}
        />
        <div
          className="absolute w-200 h-200 bg-blue-500/5 rounded-full blur-[140px] transition-transform duration-1500 ease-out"
          style={{
            right: '10%',
            bottom: '10%',
            transform: `translate(${(mousePos.x * -0.03)}px, ${(mousePos.y * -0.03)}px)`,
          }}
        />
      </div>

      {/* ── HEADER UTAMA ── */}
      <header className="w-full bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4 z-45 shadow-xs shrink-0 select-none">
        <div 
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <FileText size={24} className="text-blue-600 shrink-0" />
          <div className="w-px h-6 bg-slate-300 mx-2" />
          <div className="flex flex-col text-left">
            <h1 className="text-base font-black tracking-tight leading-none text-slate-900 m-0 p-0 flex items-center">
              <span>AKLS</span>
              <span className="text-blue-600 ml-1">Platform</span>
            </h1>
            <span className="text-[12px] text-slate-500 font-semibold mt-1">
              Analisa Kebijakan &amp; Laporan Strategis
            </span>
          </div>
        </div>

        {/* Right side navigation */}
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <span className="text-xs font-bold text-slate-650 font-mono hidden sm:inline">
                {sessionStorage.getItem('brida_executive_name') || 'Eksekutif'}
              </span>
              <button 
                onClick={() => onNavigate('dashboard')} 
                className="bg-[#0070c0] hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-widest px-5 py-2.5 border border-blue-800 cursor-pointer transition-colors rounded-none"
              >
                PLATFORM
              </button>
              <button 
                onClick={onLogout} 
                className="bg-red-650 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-widest px-5 py-2.5 border border-red-800 cursor-pointer transition-colors rounded-none"
              >
                KELUAR
              </button>
            </>
          ) : (
            <button 
              onClick={() => onNavigate('dashboard')} 
              className="bg-[#0070c0] hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-widest px-6 py-2.5 border border-blue-800 cursor-pointer transition-colors rounded-none"
            >
              MASUK
            </button>
          )}
        </div>
      </header>

      {/* ── MAIN CONTENT (Top-to-Bottom Flow) ── */}
      <main className="flex-1 w-full flex flex-col gap-6 z-10 pb-10">

        {/* SEKSI 1: HERO COVER BANNER */}
        <section
          className="w-full bg-[#f8fafc] bg-cover bg-center bg-no-repeat py-12 relative overflow-hidden shrink-0 select-none border-b border-slate-200"
          style={{
            backgroundImage: `url('/bg/landingpage.png')`
          }}
        >
          <div className="w-full px-4 md:px-8 relative z-10 text-left">
            <h1 
              className="text-4xl md:text-5xl font-black tracking-tight text-white! uppercase leading-none mb-4 font-roboto"
              style={{ textShadow: '0 2px 10px rgba(0, 0, 0, 0.8)' }}
            >
              Analisa Kebijakan <br className="hidden md:inline" /> &amp; Laporan Strategis
            </h1>
            <p 
              className="text-sm md:text-base text-slate-100! max-w-4xl font-medium leading-relaxed mb-4"
              style={{ textShadow: '0 1px 6px rgba(0, 0, 0, 0.8)' }}
            >
              Akses cepat dan terpadu untuk data pembangunan kognitif Mimika. Silakan pilih instrumen cerdas di bawah untuk merancang naskah kebijakan, menguji analisis deviasi kinerja daerah, atau mengakses pusat monitoring geospasial secara langsung melalui data rujukan terpercaya.
            </p>
          </div>
        </section>

        {/* SEKSI 2: DIRECT DATA EXPLORER */}
        <section className="w-full bg-white border-y border-slate-200 z-20 -mt-6 relative">
          <div className="w-full grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 py-4 px-4 md:px-8">
            <div
              onClick={() => onNavigate('knowledge-hub')}
              className="px-4 py-3 md:py-2 flex items-start gap-4 group cursor-pointer transition-colors hover:bg-slate-50/40"
            >
              <div className="w-12 h-12 flex items-center justify-center text-blue-600 shrink-0 shadow-xs group-hover:scale-105 transition-transform duration-300 rounded-none">
                <Database size={20} className="text-blue-600" />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 group-hover:text-blue-700 transition-colors">
                  Repositori Dokumen
                </h3>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed text-justify line-clamp-3">
                  Pencarian dokumen kajian akademis, rencana strategis, regulasi, dan arsip data sektoral daerah.
                </p>
                <div className="text-[10px] font-black text-blue-600 uppercase tracking-wider inline-flex items-center gap-1 mt-2.5">
                  <span>LIHAT REPOSITORI</span>
                  <span className="text-[8px] font-normal ml-0.5">&gt;</span>
                </div>
              </div>
            </div>
            <div
              onClick={() => onNavigate('dashboard')}
              className="px-4 py-3 md:py-2 flex items-start gap-4 group cursor-pointer transition-colors hover:bg-slate-50/40"
            >
              <div className="w-12 h-12 flex items-center justify-center text-blue-600 shrink-0 shadow-xs group-hover:scale-105 transition-transform duration-300 rounded-none">
                <BarChart3 size={20} className="text-blue-600" />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 group-hover:text-blue-700 transition-colors">
                  Dashboard
                </h3>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed text-justify line-clamp-3">
                  Monitoring status sesi kerja aktif, pemakaian token kuota AI, serta pratinjau ringkas peta spasial daerah.
                </p>
                <div className="text-[10px] font-black text-blue-600 uppercase tracking-wider inline-flex items-center gap-1 mt-2.5">
                  <span>LIHAT DASHBOARD</span>
                  <span className="text-[8px] font-normal ml-0.5">&gt;</span>
                </div>
              </div>
            </div>
            <div
              onClick={() => onNavigate('gis-explorer')}
              className="px-4 py-3 md:py-2 flex items-start gap-4 group cursor-pointer transition-colors hover:bg-slate-50/40"
            >
              <div className="w-12 h-12 flex items-center justify-center text-blue-600 shrink-0 shadow-xs group-hover:scale-105 transition-transform duration-300 rounded-none">
                <Globe size={20} className="text-blue-600" />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 group-hover:text-blue-700 transition-colors">
                  Pusat Spasial
                </h3>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed text-justify line-clamp-3">
                  Analisis geospasial dan pemetaan wilayah terintegrasi untuk pemantauan sebaran pembangunan secara spasial analitik.
                </p>
                <div className="text-[10px] font-black text-blue-600 uppercase tracking-wider inline-flex items-center gap-1 mt-2.5">
                  <span>BUKA PUSAT SPASIAL</span>
                  <span className="text-[8px] font-normal ml-0.5">&gt;</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SEKSI 3: RUANG KERJA & ANALISIS AI (Premium 2x2 Bento Grid) */}
        <section className="w-full px-4 md:px-8 space-y-4">
          <div className="text-left space-y-1 select-none">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">INSTRUMEN KOGNITIF AKTIF</span>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Ruang Kerja &amp; Analisis AI</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 border border-slate-200 bg-white shadow-xs rounded-none">
            {mainModules.map((mod, index) => {
              const Icon = mod.icon;
              // Determine border classes dynamically to form a clean flat grid divided only by 1px slate lines
              let borderClasses = "border-slate-200";
              if (index === 0) {
                borderClasses += " border-b md:border-r";
              } else if (index === 1) {
                borderClasses += " border-b";
              } else if (index === 2) {
                borderClasses += " border-b md:border-b-0 md:border-r";
              } else if (index === 3) {
                borderClasses += " border-b-0";
              }

              return (
                <button
                  key={mod.id}
                  onClick={() => onNavigate(mod.id)}
                  className={`group text-left bg-white p-6 flex gap-5 transition-colors duration-200 hover:bg-slate-50/50 cursor-pointer rounded-none ${borderClasses}`}
                >
                  {/* Icon (no bg) */}
                  <div className={`w-8 h-8 flex items-center justify-center shrink-0 ${mod.accentText} mt-0.5`}>
                    <Icon size={24} />
                  </div>

                  {/* Text Details */}
                  <div className="flex flex-col flex-1 justify-between gap-2 text-left">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2 select-none">
                        <h3 className={`text-xs font-extrabold text-slate-800 uppercase tracking-wide group-hover:${mod.accentText} transition-colors line-clamp-1`}>
                          {mod.title}
                        </h3>
                        <span className={`text-[9px] font-black tracking-widest uppercase shrink-0 ${mod.accentText}`}>
                          {mod.badge}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-slate-500 leading-relaxed font-normal text-justify">
                        {mod.desc}
                      </p>
                    </div>

                    {/* Footer link */}
                    <div className={`inline-flex items-center gap-1 text-[10px] font-bold ${mod.accentText} opacity-0 group-hover:opacity-100 uppercase tracking-widest transition-all group-hover:translate-x-1 mt-2 border-t border-slate-100 pt-2.5 w-full justify-between select-none`}>
                      <span>Mulai Akses Modul</span>
                      <ChevronRight size={12} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* SEKSI 4: SPATIAL PREVIEW (Paling Bawah - Expansive Container) */}
        <section className="w-full px-4 md:px-8 pt-0">
          <SpatialPreviewWrapper
            locations={MOCK_DATA.spatialLocations}
            onNavigate={onNavigate}
          />
        </section>

      </main>

      {/* ── FOOTER UTAMA ── */}
      <footer className="w-full bg-white/80 border-t border-slate-200 py-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-400 z-10 select-none">
        <div className="flex items-center gap-2">
          <Database size={11} className="text-teal-500" />
          <span className="font-semibold text-slate-650"> AKLS Platform v1.1.0</span>
        </div>
        <span className="font-semibold text-slate-500">Hak Cipta © 2026 AKLS</span>
      </footer>

    </div>
  );
};

export default LandingView;