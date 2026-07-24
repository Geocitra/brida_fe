import { useState } from 'react';
import { AppShell } from './components/layout/app-shell';
import { LoginView } from './modules/auth/views/login.view';
import { DashboardView } from './modules/dashboard/views/dashboard.view';
import { KnowledgeHubView } from './modules/knowledge-hub/views/knowledge-hub.view';
import { AnalyticsView } from './modules/analytics/views/analytics.view';
import { ReportsView } from './modules/reports/views/reports.view';
import { AiQaView } from './modules/ai-assistant/views/ai-qa.view';
import { ArticleGeneratorView } from './modules/ai-assistant/views/article-generator.view';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [activeRoute, setActiveRoute] = useState('dashboard');
  const [initialArticlePrompt, setInitialArticlePrompt] = useState<string | undefined>(undefined);

  const pageTitles: Record<string, string> = {
    dashboard: 'Dashboard Spasial & Metrik Perkembangan',
    'knowledge-hub': 'Knowledge Hub & Manajer Dokumen',
    analytics: 'Analisis Deterministik Statis',
    reports: 'Laporan Terstruktur & Matriks Rekap',
    'ai-request': 'AI Request & Asisten Obrolan Q&A',
    generator: 'Article Generator & Public Drafting (CoT)',
  };

  const handleNavigateToGenerator = (promptText?: string) => {
    setInitialArticlePrompt(promptText);
    setActiveRoute('generator');
  };

  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  const renderContent = () => {
    switch (activeRoute) {
      case 'dashboard':
        return <DashboardView />;
      case 'knowledge-hub':
        return <KnowledgeHubView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'reports':
        return <ReportsView />;
      case 'ai-request':
        return (
          <AiQaView 
            onNavigateToGenerator={(prompt) => handleNavigateToGenerator(prompt)} 
          />
        );
      case 'generator':
        return (
          <ArticleGeneratorView 
            initialPrompt={initialArticlePrompt}
            onNavigateToQa={() => setActiveRoute('ai-request')}
          />
        );
      default:
        return <DashboardView />;
    }
  };

  return (
    <AppShell
      activeRoute={activeRoute}
      onNavigate={(route) => setActiveRoute(route)}
      pageTitle={pageTitles[activeRoute] || 'Executive Dashboard'}
      onLogout={() => setIsAuthenticated(false)}
    >
      {renderContent()}
    </AppShell>
  );
}

export default App;
