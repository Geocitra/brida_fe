import React from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  BarChart3,
  FileText,
  MessageSquareCode,
  PenTool,
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
    { id: 'generator', label: 'Generator Artikel', icon: PenTool },
    { id: 'ai-request', label: 'AI Chat', icon: MessageSquareCode },
    { id: 'analytics', label: 'Analisis', icon: BarChart3 },
    { id: 'reports', label: 'Laporan', icon: FileText },
    { id: 'knowledge-hub', label: 'Repositori Dokumen', icon: FolderOpen },
  ];

  return (
    <header className="bg-slate-900 text-slate-100 border-b border-slate-800 sticky top-0 z-40 rounded-none shadow-md">
      {/* Top Main Navbar Row */}
      <div className="w-full px-4 lg:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 bg-teal-700 flex items-center justify-center font-roboto font-bold text-white text-xs rounded-none shadow-xs">
            BM
          </div>
          <div className="flex flex-col">
            <span className="font-roboto font-bold text-sm tracking-wider text-teal-400 uppercase">
              BRIDA Mimika
            </span>
            <span className="font-roboto text-[10px] text-slate-400 font-medium hidden sm:inline">
              SMART Analysis Engine
            </span>
          </div>
        </div>

        {/* Horizontal Navigation Items Bar (Full Spanning Compact Bar) */}
        <nav className="flex items-center gap-1 sm:gap-2 flex-1 justify-center max-w-4xl overflow-x-auto py-1 scrollbar-none">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeRoute === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`
                  flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-roboto whitespace-nowrap transition-all cursor-pointer
                  ${isActive
                    ? 'border-b-2 border-teal-400 text-teal-300 font-extrabold bg-teal-950/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60 font-semibold border-b-2 border-transparent'
                  }
                `}
              >
                <IconComponent size={15} className={isActive ? 'text-teal-400' : 'text-slate-400'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Status Dot & Logout Button */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" title="System Online" />

          {onLogout && (
            <button
              onClick={onLogout}
              className="text-slate-400 hover:text-red-400 p-1.5 transition-colors cursor-pointer"
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

