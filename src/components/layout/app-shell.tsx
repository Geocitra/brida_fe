import React from 'react';
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
  onLogout,
}) => {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-roboto rounded-none w-full">
      {/* Top Navbar Header */}
      <TopHeader
        activeRoute={activeRoute}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      {/* Main Full-Width Content (Flush edge-to-edge, maximum width) */}
      <main className="flex-1 w-full px-4 lg:px-6 py-4 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};
