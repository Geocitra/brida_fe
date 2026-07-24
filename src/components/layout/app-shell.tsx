import React, { useState } from 'react';
import { Sidebar } from './sidebar';
import { TopHeader } from './top-header';

interface AppShellProps {
  children: React.ReactNode;
  activeRoute: string;
  onNavigate: (route: string) => void;
  pageTitle: string;
  onLogout?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  activeRoute,
  onNavigate,
  pageTitle,
  onLogout,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-roboto rounded-none">
      {/* Sidebar Navigasi Responsif */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeRoute={activeRoute}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      {/* Wrapper Konten Utama yang Bergeser saat Sidebar Dibuka/Ditutup */}
      <div className={`flex-1 flex flex-col transition-all duration-200 ease-in-out ${isSidebarOpen ? 'lg:pl-64' : 'lg:pl-0'}`}>
        <TopHeader
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          currentPageTitle={pageTitle}
        />

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
