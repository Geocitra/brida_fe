import React, { useState, useEffect } from 'react';
import {
  PenTool,
  MessageSquareCode,
  BarChart3,
  FileText,
  LayoutDashboard,
  FolderOpen,
  Clock,
  Sparkles,
  ChevronRight,
  Database,
  Globe,
  Cpu,
  Activity,
  Atom
} from 'lucide-react';

interface LandingViewProps {
  onNavigate: (route: string) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onNavigate }) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
      setCurrentDate(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      );
    };

    updateDateTime();
    const intervalId = setInterval(updateDateTime, 1000);
    return () => clearInterval(intervalId);
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
      accentBorder: 'border-teal-200 hover:border-teal-400',
      iconBg: 'bg-teal-100 text-teal-600',
      badgeBg: 'bg-teal-50 text-teal-600 border-teal-200',
      hoverAccent: 'hover:shadow-teal-100',
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
      accentBorder: 'border-blue-200 hover:border-blue-400',
      iconBg: 'bg-blue-100 text-blue-600',
      badgeBg: 'bg-blue-50 text-blue-600 border-blue-200',
      hoverAccent: 'hover:shadow-blue-100',
    },
    {
      id: 'analytics',
      title: 'Lembar Diagnostik & Analisisa Kebijakan',
      badge: 'Causal Inference',
      desc: 'Sistem analisis deviasi capaian kinerja antara baseline target pembangunan vs realisasi lapangan dengan pemodelan faktor penyebab (AI).',
      icon: BarChart3,
      accentBg: 'bg-indigo-500',
      accentLight: 'bg-indigo-50',
      accentText: 'text-indigo-700',
      accentBorder: 'border-indigo-200 hover:border-indigo-400',
      iconBg: 'bg-indigo-100 text-indigo-600',
      badgeBg: 'bg-indigo-50 text-indigo-600 border-indigo-200',
      hoverAccent: 'hover:shadow-indigo-100',
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
      accentBorder: 'border-amber-200 hover:border-amber-400',
      iconBg: 'bg-amber-100 text-amber-600',
      badgeBg: 'bg-amber-50 text-amber-600 border-amber-200',
      hoverAccent: 'hover:shadow-amber-100',
    }
  ];

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-800 flex flex-col justify-between relative overflow-hidden font-roboto">

      {/* FASE 2: LAYERED GEOMETRIC GRID (Efek Kedalaman) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">

        {/* Layer 1: Fine Dot Grid (Bergerak Sangat Lambat) */}
        <div
          className="absolute inset-0 opacity-[0.25] transition-transform duration-1000 ease-out"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #94a3b8 1px, transparent 0)`,
            backgroundSize: '32px 32px',
            // Gerakan mikro: hanya 1% dari pergerakan mouse
            transform: `translate(${mousePos.x * 0.01}px, ${mousePos.y * 0.01}px)`,
          }}
        />

        {/* Layer 2: Subtle Square Grid (Bergerak Sedikit Lebih Cepat) */}
        <div
          className="absolute inset-0 opacity-[0.12] transition-transform duration-700 ease-out"
          style={{
            backgroundImage: `
              linear-gradient(to right, #cbd5e1 1px, transparent 1px),
              linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)
            `,
            backgroundSize: '128px 128px', // Kotak lebih besar untuk struktur
            // Gerakan sedikit lebih kuat: 2% dari pergerakan mouse
            transform: `translate(${mousePos.x * -0.015}px, ${mousePos.y * -0.015}px)`,
          }}
        />

        {/* Garis Horizontal Dekoratif (Efek Scanning) */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-teal-500/20 to-transparent animate-[scan_8s_linear_infinite]" />
      </div>

      {/* FASE 1: DYNAMIC MOUSE GLOW (Peningkatan Visual) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Blob Utama (Teal) - Mengikuti Mouse dengan delay halus */}
        <div
          className="absolute w-[600px] h-[600px] bg-teal-400/10 rounded-full blur-[120px] transition-transform duration-700 ease-out"
          style={{
            // Kita kurangi 300px agar titik tengah blob pas di ujung kursor
            transform: `translate(${mousePos.x - 300}px, ${mousePos.y - 300}px)`,
          }}
        />

        {/* Blob Pendukung (Indigo) - Bergerak berlawanan (Parallax) */}
        <div
          className="absolute w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[140px] transition-transform duration-[1500ms] ease-out"
          style={{
            right: '10%',
            bottom: '10%',
            // Pergerakan hanya sedikit (3% dari gerakan mouse) untuk efek kedalaman
            transform: `translate(${(mousePos.x * -0.03)}px, ${(mousePos.y * -0.03)}px)`,
          }}
        />
      </div>

      {/* ── HEADER ── */}
      <header className="w-full bg-white/90 backdrop-blur-sm border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 z-10 shadow-xs">
        <div className="flex items-center gap-3">
          <FileText size={24} className="text-teal-600 shrink-0" />
          <div className="flex flex-col text-left">
            <span className="font-extrabold text-sm uppercase tracking-widest text-teal-700">
              AKLS
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              Aplikasi Analisa Kebijakan &amp; Laporan Strategis
            </span>
          </div>
        </div>

        {/* Real-time Clock */}
        <div className="flex items-center gap-5 text-xs text-slate-500">
          <div className="flex items-center gap-2 border-r border-slate-200 pr-5">
            <Clock size={13} className="text-teal-500" />
            <div className="text-left font-mono">
              <span className="text-slate-800 font-bold block leading-none text-sm">{currentTime}</span>
              <span className="text-[9px] text-slate-400 block mt-0.5">{currentDate}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Activity size={13} className="text-emerald-500" />
            <div>
              <span className="font-bold text-slate-700 block leading-none text-xs">SISTEM AKTIF</span>
              <span className="text-[9px] text-slate-400 block mt-0.5">Secure AI Connection</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-12 flex flex-col justify-center gap-10 z-10">

        {/* Welcome Section */}
        <div className="text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-50 border border-teal-200 text-[10px] font-bold text-teal-700 uppercase tracking-widest mb-4">
            <Sparkles size={11} className="text-teal-500" />
            PORTAL UTAMA EKSEKUTIF
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 uppercase">
            Aplikasi Analisa Kebijakan &amp; Laporan Strategis
          </h1>
          <div className="w-16 h-1 bg-teal-500 mt-3 mb-3" />
          <p className="text-sm text-slate-500 max-w-2xl font-normal leading-relaxed text-center">
            Pusat pengendali analitik terintegrasi. Silakan pilih instrumen cerdas di bawah untuk merancang kebijakan, menguji analisis deviasi, atau memantau metrik spasial.
          </p>
        </div>

        {/* 2x2 Grid of Premium Light Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-5xl mx-auto">
          {mainModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <button
                key={mod.id}
                onClick={() => onNavigate(mod.id)}
                className={`group relative text-left bg-white border-2 ${mod.accentBorder} p-6 flex gap-5 transition-all duration-300 hover:-translate-y-1.5 cursor-pointer ${mod.hoverAccent} hover:shadow-xl shadow-sm`}
              >
                {/* Top accent bar */}
                <div className={`absolute top-0 left-0 right-0 h-[3px] ${mod.accentBg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                {/* Left: Icon */}
                <div className={`w-13 h-13 w-12 h-12 flex items-center justify-center shrink-0 ${mod.iconBg} transition-transform duration-300 group-hover:scale-105`}>
                  <Icon size={22} />
                </div>

                {/* Right: Content */}
                <div className="flex flex-col flex-1 justify-between gap-2 text-left">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h2 className={`text-sm font-bold text-slate-800 uppercase tracking-wide group-hover:${mod.accentText} transition-colors`}>
                        {mod.title}
                      </h2>
                      <span className={`text-[9px] font-black tracking-widest uppercase border px-2 py-0.5 shrink-0 ${mod.badgeBg}`}>
                        {mod.badge}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-slate-500 leading-relaxed font-normal">
                      {mod.desc}
                    </p>
                  </div>

                  <div className={`inline-flex items-center gap-1 text-[10px] font-bold ${mod.accentText} opacity-0 group-hover:opacity-100 uppercase tracking-widest transition-all group-hover:translate-x-1 mt-1`}>
                    <span>Mulai Akses Modul</span>
                    <ChevronRight size={12} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── SECONDARY QUICK ACTIONS ── */}
        <div className="w-full max-w-5xl mx-auto border-t border-slate-200 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <Cpu size={13} className="text-teal-500" />
            <span>Akses Cepat Pengendali Data Daerah</span>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-4 py-2 bg-white border border-slate-300 hover:border-teal-400 hover:bg-teal-50 text-slate-600 hover:text-teal-700 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-xs active:scale-95"
            >
              <LayoutDashboard size={13} className="text-teal-500" />
              <span>Dashboard Metrik</span>
            </button>
            <button
              onClick={() => onNavigate('gis-explorer')}
              className="px-4 py-2 bg-white border border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-xs active:scale-95"
            >
              <Globe size={13} className="text-indigo-500" />
              <span>Pusat Spasial (GIS)</span>
            </button>
            <button
              onClick={() => onNavigate('knowledge-hub')}
              className="px-4 py-2 bg-white border border-slate-300 hover:border-amber-400 hover:bg-amber-50 text-slate-600 hover:text-amber-700 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-xs active:scale-95"
            >
              <FolderOpen size={13} className="text-amber-500" />
              <span>Repositori Dokumen</span>
            </button>
          </div>
        </div>

      </main>

      {/* ── FOOTER ── */}
      <footer className="w-full bg-white/80 border-t border-slate-200 py-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-400 z-10">
        <div className="flex items-center gap-2">
          <Database size={11} className="text-teal-500" />
          <span className="font-medium"> AKLS Platform v1.1.0</span>
        </div>
        <span>Hak Cipta © 2026 AKLS</span>
      </footer>

    </div>
  );
};

export default LandingView;
