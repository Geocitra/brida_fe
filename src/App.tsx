import { useState } from 'react';
import { AppShell } from './components/layout/app-shell';
import { KnowledgeHubView } from './modules/knowledge-hub/views/knowledge-hub.view';
import { DashboardView } from './modules/dashboard/views/dashboard.view';
import { AiWorkspaceView } from './modules/ai-assistant/views/ai-workspace.view';

export function App() {
  const [activeRoute, setActiveRoute] = useState('dashboard');

  const pageTitles: Record<string, string> = {
    dashboard: 'Dashboard Spasial & Metrik Perkembangan',
    'knowledge-hub': 'Knowledge Hub & Manajer Dokumen',
    analytics: 'Analisis Deterministik Statis',
    reports: 'Laporan Terstruktur & Matriks Rekap',
    'ai-request': 'AI Request & Asisten Obrolan Q&A',
    generator: 'Article Generator & Public Drafting (CoT)',
  };

  const renderContent = () => {
    switch (activeRoute) {
      case 'dashboard':
        return <DashboardView />;
      case 'knowledge-hub':
        return <KnowledgeHubView />;
      case 'ai-request':
      case 'generator':
        return <AiWorkspaceView />;
      default:
        return (
          <div className="bg-[#1e1b4b] border border-[#334155] p-6 rounded-none shadow-sm">
            <h2 className="text-xl font-bold text-slate-100 mb-2">
              {pageTitles[activeRoute]}
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Modul <strong>{activeRoute.toUpperCase()}</strong> telah berhasil terhubung dengan AppShell Layout responsif.
              Sistem analisis kebijakan publik BRIDA Kabupaten Mimika siap menerima interaksi data.
            </p>
          </div>
        );
    }
  };

  return (
    <AppShell
      activeRoute={activeRoute}
      onNavigate={(route) => setActiveRoute(route)}
      pageTitle={pageTitles[activeRoute] || 'Executive Dashboard'}
    >
      {renderContent()}
    </AppShell>
  );
}

export default App;
