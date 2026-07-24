import React from 'react';
import { 
  LayoutDashboard, 
  FolderOpen, 
  BarChart3, 
  FileText, 
  MessageSquareCode, 
  PenTool, 
  X,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeRoute: string;
  onNavigate: (route: string) => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, activeRoute, onNavigate, onLogout }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard Spasial', icon: LayoutDashboard },
    { id: 'knowledge-hub', label: 'Knowledge Hub', icon: FolderOpen },
    { id: 'analytics', label: 'Analisis Deterministik', icon: BarChart3 },
    { id: 'reports', label: 'Laporan Terstruktur', icon: FileText },
    { id: 'ai-request', label: 'AI Request (Q&A)', icon: MessageSquareCode },
    { id: 'generator', label: 'Article Generator', icon: PenTool },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          onClick={onClose} 
          className="fixed inset-0 bg-slate-950/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Container - Deep Executive Slate (Slate 900) */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 border-r border-slate-800
        transform transition-transform duration-200 ease-in-out flex flex-col rounded-none shadow-xl
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950">
          <div className="flex flex-col">
            <span className="font-roboto font-bold text-sm tracking-wider text-teal-400 uppercase">
              BRIDA Mimika
            </span>
            <span className="font-roboto text-xs text-slate-400 font-medium">
              SMART Analysis Engine
            </span>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-none"
            aria-label="Tutup Menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeRoute === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 text-sm font-roboto text-left rounded-none
                  transition-all border-l-4 font-semibold
                  ${isActive 
                    ? 'bg-teal-600/20 text-teal-300 border-teal-500 font-bold shadow-xs' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white border-transparent'}
                `}
              >
                <IconComponent size={18} className={isActive ? 'text-teal-400' : 'text-slate-400'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer / Executive User Info & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-teal-600 border border-teal-400 flex items-center justify-center font-roboto font-bold text-white text-xs rounded-none shadow-xs">
              KB
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="font-roboto font-semibold text-xs text-slate-200 truncate">
                Kepala BRIDA
              </span>
              <span className="font-roboto text-[11px] text-slate-400 truncate">
                Kabupaten Mimika
              </span>
            </div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="text-slate-400 hover:text-red-400 p-1.5 rounded-none transition-colors"
              title="Keluar Sesi"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
