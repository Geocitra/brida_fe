import React from 'react';
import { TopHeader } from './top-header';
import { AppFooter } from './app-footer';

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

      {/* 
        Main Full-Width Content (Flush edge-to-edge, maximum width)
        Mengeliminasi padding bawaan (px-4 lg:px-6 py-4) menjadi p-0 
        agar seluruh elemen anak menyatu secara solid dalam satu kesatuan grid.
      */}
      <main className="flex-1 w-full p-0 flex flex-col">
        {children}
      </main>

      {/* Global Application Footer */}
      {activeRoute !== 'article-editor' && <AppFooter />}
    </div>
  );
};