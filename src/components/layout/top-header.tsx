import React from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  BarChart3,
  FileText,
  MessageSquareCode,
  PenTool,
  ShieldCheck,
  LogOut,
} from 'lucide-react';

interface TopHeaderProps {
  activeRoute: string;
  onNavigate: (route: string) => void;
  onLogout?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ activeRoute, onNavigate, onLogout }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard Spasial', icon: LayoutDashboard },
    { id: 'knowledge-hub', label: 'Knowledge Hub', icon: FolderOpen },
    { id: 'analytics', label: 'Analisis Deterministik', icon: BarChart3 },
    { id: 'reports', label: 'Laporan Terstruktur', icon: FileText },
    { id: 'ai-request', label: 'AI Request (Q&A)', icon: MessageSquareCode },
    { id: 'generator', label: 'Article Generator', icon: PenTool },
  ];

  return (
    <header className="bg-slate-900 text-slate-100 border-b border-slate-800 sticky top-0 z-40 rounded-none shadow-md">
      {/* Top Main Navbar Row */}
      <div className="w-full px-4 lg:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 bg-teal-600 border border-teal-400 flex items-center justify-center font-roboto font-bold text-white text-xs rounded-none shadow-xs">
            BM
          </div>
          <div className="flex flex-col">
            <span className="font-roboto font-bold text-sm tracking-wider text-teal-400 uppercase">
              BRIDA Mimika
            </span>
            <span className="font-roboto text-[11px] text-slate-400 font-medium hidden sm:inline">
              SMART Analysis Engine
            </span>
          </div>
        </div>

        {/* Horizontal Navigation Items Bar (Pemilihan Modul Utam) */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeRoute === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`
                  flex items-center gap-2 px-3.5 py-2 text-xs font-roboto whitespace-nowrap rounded-none transition-all font-bold border border-transparent
                  ${
                    isActive
                      ? 'bg-teal-700 text-white font-extrabold shadow-2xs border-teal-600'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }
                `}
              >
                <IconComponent size={16} className={isActive ? 'text-teal-400' : 'text-slate-400'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Status Badge & User Info */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 bg-teal-950/80 border border-teal-800 text-teal-300 text-[11px] font-roboto font-bold rounded-none">
            <ShieldCheck size={14} className="text-teal-400" />
            <span>Zero-Knowledge Guardrail</span>
          </div>

          <div className="w-2 h-2 bg-emerald-500 rounded-none animate-pulse" title="System Online" />

          {onLogout && (
            <button
              onClick={onLogout}
              className="text-slate-400 hover:text-red-400 p-1.5 rounded-none transition-colors ml-1"
              title="Keluar Sesi"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
