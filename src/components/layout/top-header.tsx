import React from 'react';
import { Menu, ShieldCheck } from 'lucide-react';

interface TopHeaderProps {
  onToggleSidebar: () => void;
  currentPageTitle: string;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onToggleSidebar, currentPageTitle }) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 lg:px-8 rounded-none shadow-xs">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-none transition-colors"
          aria-label="Buka Menu Navigasi"
        >
          <Menu size={22} />
        </button>
        <h1 className="font-roboto font-bold text-lg text-slate-800 tracking-tight">
          {currentPageTitle}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-roboto font-medium rounded-none">
          <ShieldCheck size={14} className="text-emerald-600" />
          <span>Zero-Knowledge Guardrail Active</span>
        </div>
        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-none animate-pulse" title="System Online" />
      </div>
    </header>
  );
};
