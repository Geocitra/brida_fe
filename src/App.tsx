import { useState, useEffect } from 'react';
import { AppShell } from './components/layout/app-shell';
import { LoginView } from './modules/auth/views/login.view';
import { DashboardView } from './modules/dashboard/views/dashboard.view';
import { KnowledgeHubView } from './modules/knowledge-hub/views/knowledge-hub.view';
import { AnalyticsView } from './modules/analytics/views/analytics.view';
import { ReportsView } from './modules/reports/views/reports.view';
import { AiQaView } from './modules/ai-assistant/views/ai-qa.view';
import { ArticleGeneratorView } from './modules/ai-assistant/views/article-generator.view';
import { ArticlePreviewEditorView } from './modules/ai-assistant/views/article-preview-editor.view';

// ============================================================================
// IMPORTS NEW VIEW: GisExplorerView (Pusat Pengendali Spasial GFW-Style)
// Diimpor secara default dari direktori modular dashboard [Vite SPA Ready]
// ============================================================================
import GisExplorerView from './modules/dashboard/views/gis-explorer.view';
import { LandingView } from './modules/dashboard/views/landing.view';

const SESSION_FORWARD_DOCS_KEY = 'brida_forward_doc_ids';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [activeRoute, setActiveRoute] = useState('landing');
  const [initialArticlePrompt, setInitialArticlePrompt] = useState<string | undefined>(undefined);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Inisialisasi state secara aman dari SessionStorage (Tahan terhadap Hard Refresh / F5)
  const [sharedDocIds, setSharedDocIds] = useState<string[] | undefined>(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_FORWARD_DOCS_KEY);
      return stored ? JSON.parse(stored) : undefined;
    } catch (err) {
      console.warn('[SessionStorage] Gagal menginisialisasi sharedDocIds:', err);
      return undefined;
    }
  });

  /**
   * SINKRONISASI STATE SCROLL (Scroll State Lifecycle Guard)
   * Memastikan setiap kali rute aktif berubah, posisi gulir layar segera
   * dikembalikan ke koordinat (0,0) secara instan demi menjaga integritas pembacaan.
   */
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } catch (err) {
      window.scrollTo(0, 0);
    }
  }, [activeRoute]);

  const pageTitles: Record<string, string> = {
    landing: 'Portal Utama & Asisten Analisis',
    dashboard: 'Dashboard Spasial & Metrik Perkembangan',
    'gis-explorer': 'Pusat Pengendali Spasial',
    'knowledge-hub': 'Knowledge Hub & Manajer Dokumen',
    analytics: 'Analisis Deterministik Statis',
    reports: 'Laporan Terstruktur & Matriks Rekap',
    'ai-request': 'AI Request & Asisten Obrolan Q&A',
    generator: 'Collaborative Workspace & AI Co-Writer (A4 Canvas)',
    'article-editor': 'Pratinjau Cetak & Editor Manual',
  };

  /**
   * Mengatur navigasi forward aksi lintas modul dengan payload data dokumen terpilih.
   * Mendukung penangkapan sinyal transisi obrolan dinamis [Two-Pass Pipeline].
   */
  const handleForwardAction = (documentIds: string[], targetRoute: string, promptText?: string) => {
    try {
      sessionStorage.setItem(SESSION_FORWARD_DOCS_KEY, JSON.stringify(documentIds));
      setSharedDocIds(documentIds);

      // --- SINKRONISASI AKTIF UNTUK SENSITIVITAS TRANSISI CHAT KE ARTIKEL [Two-Pass Pipeline] ---
      if (promptText && promptText.startsWith('[TRANSITIONED_SESSION_ID]:')) {
        const transitionedId = promptText.replace('[TRANSITIONED_SESSION_ID]:', '');

        setActiveSessionId(transitionedId); // Set ID sesi artikel hasil transisi
        setInitialArticlePrompt(undefined); // Bersihkan prompt transien
        setActiveRoute('article-editor');   // Alihkan mulus ke editor cetak A4 WYSIWYG
        return;
      }

      setInitialArticlePrompt(promptText || undefined);
      setActiveRoute(targetRoute);
    } catch (err) {
      console.error('[Forward Action] Gagal mengamankan state ke SessionStorage:', err);
    }
  };

  /**
   * Fungsi koordinasi global untuk membersihkan state transien pasca-forwarding berhasil dikonsumsi.
   */
  const handleClearSharedDocIds = () => {
    try {
      sessionStorage.removeItem(SESSION_FORWARD_DOCS_KEY);
      setSharedDocIds(undefined);
    } catch (err) {
      console.error('[SessionStorage] Gagal menghapus kunci forward docs:', err);
    }
  };

  /**
   * Guardrail Lifecycle: Membersihkan memori transien jika pengguna melakukan navigasi manual secara sadar
   */
  const handleManualNavigation = (route: string, sessionId?: string | null) => {
    handleClearSharedDocIds();
    setInitialArticlePrompt(undefined);

    let finalRoute = route;
    let finalSessionId = sessionId || null;

    if (route.includes('?')) {
      const [rPath, query] = route.split('?');
      finalRoute = rPath;
      try {
        const params = new URLSearchParams(query);
        finalSessionId = params.get('session') || finalSessionId;
      } catch (e) {
        console.error('Gagal memparsing query parameters:', e);
      }
    }

    setActiveSessionId(finalSessionId);
    setActiveRoute(finalRoute);
  };

  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  // Merender konten halaman berdasarkan rute yang aktif
  const renderContent = () => {
    switch (activeRoute) {
      case 'landing':
        return (
          <LandingView
            onNavigate={handleManualNavigation}
          />
        );
      case 'dashboard':
        return (
          <DashboardView
            onNavigate={handleManualNavigation}
            onLogout={() => setIsAuthenticated(false)}
          />
        );
      case 'gis-explorer':
        return (
          <GisExplorerView
            onNavigate={handleManualNavigation}
            onLogout={() => setIsAuthenticated(false)}
          />
        );
      case 'knowledge-hub':
        return (
          <KnowledgeHubView
            onForward={(docIds, targetRoute, prompt) => handleForwardAction(docIds, targetRoute, prompt)}
          />
        );
      case 'analytics':
        return (
          <AnalyticsView
            initialSelectedDocIds={sharedDocIds}
            onClearSharedDocIds={handleClearSharedDocIds}
            onNavigateToGenerator={(prompt) => handleForwardAction(sharedDocIds || [], 'generator', prompt)}
          />
        );
      case 'reports':
        return (
          <ReportsView
            initialSelectedDocIds={sharedDocIds}
            onClearSharedDocIds={handleClearSharedDocIds}
            onNavigateToGenerator={(prompt) => handleForwardAction(sharedDocIds || [], 'generator', prompt)}
            onNavigateToDashboard={() => handleManualNavigation('dashboard')}
          />
        );
      case 'ai-request':
        return (
          <AiQaView
            initialSelectedDocIds={sharedDocIds}
            onClearSharedDocIds={handleClearSharedDocIds}
            onNavigateToGenerator={(prompt) => handleForwardAction(sharedDocIds || [], 'generator', prompt)}
            initialSessionId={activeSessionId}
          />
        );
      case 'generator':
        return (
          <ArticleGeneratorView
            initialSelectedDocIds={sharedDocIds}
            onClearSharedDocIds={handleClearSharedDocIds}
            initialPrompt={initialArticlePrompt}
            onNavigateToQa={() => handleManualNavigation('ai-request')}
            onNavigateToEditor={(sessionId) => {
              setActiveSessionId(sessionId);
              setActiveRoute('article-editor');
            }}
            initialSessionId={activeSessionId}
          />
        );
      case 'article-editor':
        return (
          <ArticlePreviewEditorView
            sessionId={activeSessionId}
            onBack={() => setActiveRoute('generator')}
          />
        );
      default:
        return (
          <LandingView
            onNavigate={handleManualNavigation}
          />
        );
    }
  };

  // ===========================================================================
  // INTERACTION GUARD & LAYOUT BYPASS
  // Jika rute aktif adalah pusat pengendali spasial ('gis-explorer') atau portal
  // landing page ('landing'), langsung render rute tanpa dibungkus AppShell global
  // demi mencapai full-bleed 100dvh dan tampilan premium.
  // ===========================================================================
  if (activeRoute === 'gis-explorer' || activeRoute === 'landing') {
    return renderContent();
  }

  // Modul lainnya dirender menggunakan layout terstruktur standar Bappeda/BRIDA
  return (
    <AppShell
      activeRoute={activeRoute}
      onNavigate={handleManualNavigation}
      pageTitle={pageTitles[activeRoute] || 'Executive Dashboard'}
      onLogout={() => setIsAuthenticated(false)}
    >
      {renderContent()}
    </AppShell>
  );
}

export default App;