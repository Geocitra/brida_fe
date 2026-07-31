// FILE: src/App.tsx

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

import GisExplorerView from './modules/dashboard/views/gis-explorer.view';
import { LandingView } from './modules/dashboard/views/landing.view';

const SESSION_FORWARD_DOCS_KEY = 'brida_forward_doc_ids';
const AUTH_SESSION_KEY = 'brida_is_authenticated';
const PENDING_ROUTE_KEY = 'brida_pending_route';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(AUTH_SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [activeRoute, setActiveRoute] = useState<string>(() => {
    try {
      const isAuth = sessionStorage.getItem(AUTH_SESSION_KEY) === 'true';
      const savedRoute = sessionStorage.getItem('brida_active_route');
      if (isAuth) {
        return savedRoute && savedRoute !== 'landing' ? savedRoute : 'dashboard';
      }
      return 'landing';
    } catch {
      return 'landing';
    }
  });

  const [initialArticlePrompt, setInitialArticlePrompt] = useState<string | undefined>(undefined);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // State untuk menampilkan modal/tampilan login interseptor
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

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

  // Simpan rute aktif ke sessionStorage agar bertahan saat reload
  useEffect(() => {
    try {
      sessionStorage.setItem('brida_active_route', activeRoute);
    } catch (err) {
      console.warn('[SessionStorage] Gagal menyimpan rute aktif:', err);
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

  const handleLoginSuccess = () => {
    try {
      sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
    } catch (err) {
      console.warn('[Auth] Gagal menyimpan status login ke session:', err);
    }
    setIsAuthenticated(true);
    setShowLoginModal(false);

    // Cek apakah ada rute tertunda yang ingin diakses sebelum login
    try {
      const pendingRoute = sessionStorage.getItem(PENDING_ROUTE_KEY);
      if (pendingRoute) {
        sessionStorage.removeItem(PENDING_ROUTE_KEY);
        setActiveRoute(pendingRoute);
      }
    } catch (e) {
      console.error('Gagal membaca pending route:', e);
    }
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem(AUTH_SESSION_KEY);
      sessionStorage.removeItem(SESSION_FORWARD_DOCS_KEY);
      sessionStorage.removeItem(PENDING_ROUTE_KEY);
      sessionStorage.removeItem('brida_active_route');
      sessionStorage.removeItem('brida_last_activity');
    } catch (err) {
      console.warn('[Auth] Gagal membersihkan session saat logout:', err);
    }
    setIsAuthenticated(false);
    setActiveRoute('landing');
    setActiveSessionId(null);
    setSharedDocIds(undefined);
  };

  // Inactivity timeout guard (15 minutes automatic logout)
  useEffect(() => {
    if (!isAuthenticated) return;

    const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 menit
    const LAST_ACTIVITY_KEY = 'brida_last_activity';

    const updateActivity = () => {
      try {
        sessionStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
      } catch (err) {
        // ignore
      }
    };

    // Initialize activity timestamp
    updateActivity();

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const handleEvent = () => updateActivity();

    events.forEach(event => {
      window.addEventListener(event, handleEvent);
    });

    const interval = setInterval(() => {
      try {
        const lastActivity = sessionStorage.getItem(LAST_ACTIVITY_KEY);
        if (lastActivity) {
          const timeDiff = Date.now() - parseInt(lastActivity, 10);
          if (timeDiff > INACTIVITY_TIMEOUT) {
            console.log('[Auth] Sesi berakhir karena tidak ada aktivitas selama 15 menit.');
            handleLogout();
          }
        }
      } catch (err) {
        // ignore
      }
    }, 10000); // Cek setiap 10 detik

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleEvent);
      });
      clearInterval(interval);
    };
  }, [isAuthenticated]);


  const handleNavigationAttempt = (route: string, sessionId?: string | null) => {
    // Daftar rute publik yang bebas diakses tanpa login (Hanya landing page)
    const publicRoutes = ['landing'];


    if (!publicRoutes.includes(route) && !isAuthenticated) {
      // Jika belum login dan mencoba akses modul privat, simpan tujuan & tampilkan login
      try {
        sessionStorage.setItem(PENDING_ROUTE_KEY, route);
      } catch (err) {
        console.warn('Gagal menyimpan rute tertunda:', err);
      }
      setShowLoginModal(true);
      return;
    }

    // Jika sudah login atau rute publik, lanjutkan navigasi normal
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

  const handleForwardAction = (documentIds: string[], targetRoute: string, promptText?: string) => {
    // Periksa otentikasi juga untuk aksi forward
    if (!isAuthenticated) {
      try {
        sessionStorage.setItem(PENDING_ROUTE_KEY, targetRoute);
        sessionStorage.setItem(SESSION_FORWARD_DOCS_KEY, JSON.stringify(documentIds));
      } catch (err) {
        console.warn('Gagal menyimpan state forward tertunda:', err);
      }
      setShowLoginModal(true);
      return;
    }

    try {
      sessionStorage.setItem(SESSION_FORWARD_DOCS_KEY, JSON.stringify(documentIds));
      setSharedDocIds(documentIds);

      if (promptText && promptText.startsWith('[TRANSITIONED_SESSION_ID]:')) {
        const transitionedId = promptText.replace('[TRANSITIONED_SESSION_ID]:', '');
        setActiveSessionId(transitionedId);
        setInitialArticlePrompt(undefined);
        setActiveRoute('article-editor');
        return;
      }

      setInitialArticlePrompt(promptText || undefined);
      setActiveRoute(targetRoute);
    } catch (err) {
      console.error('[Forward Action] Gagal mengamankan state ke SessionStorage:', err);
    }
  };

  const handleClearSharedDocIds = () => {
    try {
      sessionStorage.removeItem(SESSION_FORWARD_DOCS_KEY);
      setSharedDocIds(undefined);
    } catch (err) {
      console.error('[SessionStorage] Gagal menghapus kunci forward docs:', err);
    }
  };

  const renderContent = () => {
    switch (activeRoute) {
      case 'landing':
        return (
          <LandingView
            onNavigate={handleNavigationAttempt}
            isAuthenticated={isAuthenticated}
            onLogout={handleLogout}
          />
        );
      case 'dashboard':
        return (
          <DashboardView
            onNavigate={handleNavigationAttempt}
            onLogout={handleLogout}
          />
        );
      case 'gis-explorer':
        return (
          <GisExplorerView
            onNavigate={handleNavigationAttempt}
            onLogout={handleLogout}
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
            onNavigate={handleNavigationAttempt}
          />
        );
      case 'reports':
        return (
          <ReportsView
            initialSelectedDocIds={sharedDocIds}
            onClearSharedDocIds={handleClearSharedDocIds}
            onNavigateToGenerator={(prompt) => handleForwardAction(sharedDocIds || [], 'generator', prompt)}
            onNavigateToDashboard={() => handleNavigationAttempt('dashboard')}
            onNavigate={handleNavigationAttempt}
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
            onNavigateToQa={() => handleNavigationAttempt('ai-request')}
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
            onNavigate={handleNavigationAttempt}
            isAuthenticated={isAuthenticated}
            onLogout={handleLogout}
          />
        );
    }
  };

  // Jika state penampil modal login aktif, tampilkan LoginView dalam bentuk modal penuh
  if (showLoginModal) {
    return (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
        onClose={() => setShowLoginModal(false)}
      />
    );
  }

  if (activeRoute === 'gis-explorer' || activeRoute === 'landing') {
    return renderContent();
  }

  return (
    <AppShell
      activeRoute={activeRoute}
      onNavigate={handleNavigationAttempt}
      pageTitle={pageTitles[activeRoute] || 'Executive Dashboard'}
      onLogout={handleLogout}
    >
      {renderContent()}
    </AppShell>
  );
}

export default App;