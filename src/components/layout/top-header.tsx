import React from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  BarChart3,
  FileText,
  MessageSquareCode,
  PenTool,
  LogOut,
  Atom,
  Settings,
} from 'lucide-react';


interface TopHeaderProps {
  activeRoute: string;
  onNavigate: (route: string) => void;
  onLogout?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ activeRoute, onNavigate, onLogout }) => {
  const role = sessionStorage.getItem('brida_user_role') || 'USER';

  const navItems = [
    ...(role === 'ADMIN' ? [
      { id: 'admin-console', label: 'Admin Console', icon: Settings },
    ] : []),
    { id: 'dashboard', label: 'Dashboard Spasial', icon: LayoutDashboard },
    ...(role === 'USER' ? [
      { id: 'generator', label: 'Artikel Generator', icon: PenTool },
      { id: 'ai-request', label: 'AI Chat', icon: MessageSquareCode },
      { id: 'analytics', label: 'Analisa Kebijakan', icon: BarChart3 },
      { id: 'reports', label: 'Laporan', icon: FileText },
    ] : []),
    { id: 'knowledge-hub', label: 'Repositori Dokumen', icon: FolderOpen },
  ];

  return (
    <header className="bg-slate-900 text-slate-100 border-b border-slate-800 sticky top-0 z-40 rounded-none shadow-md">
      {/* Top Main Navbar Row */}
      <div className="w-full px-4 lg:px-6 h-16 flex items-center justify-between gap-4">
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
            <span className="font-roboto text-[12px] text-slate-400 font-medium hidden sm:inline">
              Analisa Kebijakan &amp; Laporan Strategis
            </span>
          </div>
        </button>

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

