import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  BarChart3,
  FileText,
  MessageSquareCode,
  PenTool,
  LogOut,
  Settings,
  Sparkles,
  Menu,
  X,
  ChevronRight,
  Shield,
  User,
  Database,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface TopHeaderProps {
  activeRoute: string;
  onNavigate: (route: string) => void;
  onLogout?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ activeRoute, onNavigate, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [tokenBudget, setTokenBudget] = useState<{
    remainingTokens: number;
    remainingCostIdr: number;
    quotaPercentage: number;
    paguStatus: 'SAFE' | 'ALERT' | 'WARNING';
  } | null>(null);
  const role = sessionStorage.getItem('brida_user_role') || 'USER';

  const navItems = [
    ...(role === 'ADMIN' ? [
      { id: 'admin-console', label: 'Admin Console', icon: Settings },
    ] : []),
    { id: 'dashboard', label: 'Dashboard Spasial', icon: LayoutDashboard },
    ...(role === 'USER' ? [
      { id: 'generator', label: 'Artikel Generator', icon: PenTool },
      { id: 'infographic', label: 'Studio Infografis', icon: Sparkles },
      { id: 'ai-request', label: 'AI Chat', icon: MessageSquareCode },
      { id: 'analytics', label: 'Analisa Kebijakan', icon: BarChart3 },
      { id: 'reports', label: 'Laporan', icon: FileText },
    ] : []),
    { id: 'knowledge-hub', label: 'Repositori Dokumen', icon: FolderOpen },
  ];

  // Tutup menu mobile jika pengguna meresize layar ke desktop (>= 1024px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Ambil data anggaran token secara berkala & tangkap event mutasi token real-time
  useEffect(() => {
    let isMounted = true;
    const fetchBudget = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/analysis/dashboard-meta`);
        const resJson = await response.json();
        if (isMounted && resJson.success && resJson.data?.tokenBudget) {
          setTokenBudget(resJson.data.tokenBudget);
        }
      } catch {
        // Fallback hening jika server belum siap
      }
    };

    fetchBudget();
    const handleUpdate = () => fetchBudget();
    window.addEventListener('brida-token-updated', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('brida-token-updated', handleUpdate);
    };
  }, [activeRoute]);

  // Tutup menu mobile saat tombol Escape ditekan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeItem = navItems.find((item) => item.id === activeRoute);

  const handleMobileNavigate = (routeId: string) => {
    onNavigate(routeId);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="bg-slate-900 text-slate-100 border-b border-slate-800 sticky top-0 z-40 rounded-none shadow-md">
      {/* ── BARIS UTAMA NAVBAR (RESPONSIVE EDGE-TO-EDGE) ── */}
      <div className="w-full px-4 lg:px-6 h-16 flex items-center justify-between gap-2 lg:gap-4">
        {/* Brand Logo & Title */}
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-2.5 shrink-0 cursor-pointer hover:opacity-90 active:scale-98 transition-all group text-left bg-transparent border-none p-0"
          title="Kembali ke Portal Utama"
        >
          <FileText size={20} className="text-teal-400 group-hover:text-teal-300 transition-colors shrink-0" />
          <div className="flex flex-col">
            <span className="font-roboto font-bold text-sm tracking-wider text-teal-400 uppercase group-hover:text-teal-300 transition-colors">
              AKLS
            </span>
            <span className="font-roboto text-[11px] xl:text-[12px] text-slate-400 font-medium hidden sm:inline truncate max-w-[200px] xl:max-w-none">
              Analisa Kebijakan &amp; Laporan Strategis
            </span>
          </div>
        </button>

        {/* ── NAVIGASI DESKTOP (DITAMPILKAN DI LAYAR BESAR >= 1024px) ── */}
        <nav className="hidden lg:flex items-center justify-center gap-1 xl:gap-1.5 flex-1 min-w-0 px-2">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeRoute === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                title={item.label}
                className={`
                  flex items-center gap-1.5 px-2 xl:px-3 py-2 text-[11px] xl:text-xs font-roboto whitespace-nowrap transition-all cursor-pointer rounded-none shrink-0
                  ${isActive
                    ? 'border-b-2 border-teal-400 text-teal-300 font-extrabold bg-teal-950/60'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80 font-semibold border-b-2 border-transparent'
                  }
                `}
              >
                <IconComponent size={14} className={isActive ? 'text-teal-400 shrink-0' : 'text-slate-400 shrink-0'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* ── BAGIAN KANAN: STATUS, ROLE BADGE & LOGOUT DESKTOP ── */}
        <div className="hidden lg:flex items-center gap-3 shrink-0">
          {/* Widget Kuota AI Real-Time ("Token yang di Depan") */}
          {tokenBudget && (
            <button
              onClick={() => onNavigate('dashboard')}
              title={`Sisa Kuota AI: ${tokenBudget.remainingTokens.toLocaleString('id-ID')} Token (Rp ${tokenBudget.remainingCostIdr.toLocaleString('id-ID')}). Klik untuk rincian kuota di Dashboard.`}
              className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-800/90 border border-slate-700 hover:border-teal-500/80 transition-all cursor-pointer rounded-none group text-left"
            >
              <div className="flex items-center gap-2">
                <Database size={13} className="text-teal-400 group-hover:scale-110 transition-transform" />
                <div className="flex flex-col leading-tight">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    SISA TOKEN
                  </span>
                  <span className="text-xs font-mono font-bold text-teal-300">
                    {tokenBudget.remainingTokens >= 1000000
                      ? `${(tokenBudget.remainingTokens / 1000000).toFixed(1)}M`
                      : tokenBudget.remainingTokens.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
              <div className="h-5 w-px bg-slate-700" />
              <div className="flex flex-col leading-tight">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  SALDO
                </span>
                <span className="text-[11px] font-mono font-bold text-slate-200">
                  Rp {(tokenBudget.remainingCostIdr / 1000).toFixed(0)}K
                </span>
              </div>
              <div
                className={`w-2 h-2 rounded-none shrink-0 ${
                  tokenBudget.paguStatus === 'WARNING'
                    ? 'bg-rose-500 animate-pulse'
                    : tokenBudget.paguStatus === 'ALERT'
                    ? 'bg-amber-500'
                    : 'bg-emerald-400'
                }`}
              />
            </button>
          )}

          <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-800/80 border border-slate-700/80 text-[10px] font-bold text-slate-300 uppercase tracking-wider rounded-none">
            {role === 'ADMIN' ? <Shield size={11} className="text-amber-400" /> : <User size={11} className="text-teal-400" />}
            <span>{role}</span>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="text-slate-400 hover:text-red-400 hover:bg-slate-800 p-2 transition-colors cursor-pointer rounded-none"
              title="Keluar Sesi"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>

        {/* ── BAGIAN KANAN MOBILE / TABLET (< 1024px) ── */}
        <div className="flex lg:hidden items-center gap-2 shrink-0">
          {/* Badge Token Ringkas di Mobile */}
          {tokenBudget && (
            <button
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-1.5 px-2 py-1 bg-slate-800 border border-slate-700 text-teal-300 text-[11px] font-mono font-bold rounded-none"
              title="Sisa Token AI"
            >
              <Database size={11} className="text-teal-400" />
              <span>
                {tokenBudget.remainingTokens >= 1000000
                  ? `${(tokenBudget.remainingTokens / 1000000).toFixed(1)}M`
                  : tokenBudget.remainingTokens.toLocaleString('id-ID')}
              </span>
            </button>
          )}
          {/* Badge Rute Aktif di Mobile agar pengguna tahu posisinya */}
          {activeItem && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-teal-950/70 border border-teal-800/80 text-[10px] font-bold text-teal-300 uppercase tracking-wider rounded-none max-w-[140px] truncate">
              <span className="w-1.5 h-1.5 bg-teal-400 shrink-0" />
              <span className="truncate">{activeItem.label}</span>
            </div>
          )}

          {/* Tombol Toggle Hamburger Menu */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-200 hover:text-white hover:bg-slate-800 transition-colors border border-slate-700 cursor-pointer rounded-none"
            aria-label={isMobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={20} className="text-teal-400" /> : <Menu size={20} className="text-teal-400" />}
          </button>
        </div>
      </div>

      {/* ── MOBILE MENU OVERLAY & DRAWER (< 1024px) ── */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop Blur */}
          <div
            className="fixed inset-0 top-16 bg-slate-950/80 backdrop-blur-xs z-40 lg:hidden animate-fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-Down Mobile Drawer Menu */}
          <div className="fixed top-16 left-0 right-0 max-h-[calc(100vh-64px)] overflow-y-auto bg-slate-900 border-b border-slate-700 shadow-2xl z-50 lg:hidden font-roboto">
            {/* Header Drawer Info */}
            <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                {role === 'ADMIN' ? <Shield size={12} className="text-amber-400" /> : <User size={12} className="text-teal-400" />}
                <span>Peran: {role}</span>
              </div>
              <span className="text-[10px] text-teal-400 font-mono font-semibold">
                Navigasi Modul BRIDA
              </span>
            </div>

            {/* List Item Navigasi Mobile (100% Full Text, Terbaca Jelas, Tidak Terpotong) */}
            <div className="py-2 divide-y divide-slate-800/80">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeRoute === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleMobileNavigate(item.id)}
                    className={`
                      w-full px-5 py-3.5 flex items-center justify-between text-left transition-colors cursor-pointer rounded-none
                      ${isActive
                        ? 'bg-teal-950/70 border-l-4 border-teal-400 text-teal-300 font-bold'
                        : 'text-slate-200 hover:bg-slate-800/80 hover:text-white font-medium border-l-4 border-transparent'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <IconComponent size={18} className={isActive ? 'text-teal-400 shrink-0' : 'text-slate-400 shrink-0'} />
                      <span className="text-xs uppercase tracking-wider truncate font-roboto">
                        {item.label}
                      </span>
                    </div>

                    {isActive ? (
                      <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/40 shrink-0 rounded-none">
                        Aktif
                      </span>
                    ) : (
                      <ChevronRight size={15} className="text-slate-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer Drawer: Tombol Keluar Sesi Mobile */}
            {onLogout && (
              <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">
                  Sesi Pengguna AKLS Mimika
                </span>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 hover:text-red-100 font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer rounded-none transition-colors"
                >
                  <LogOut size={13} />
                  <span>Keluar Sesi</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </header>
  );
};

export default TopHeader;
