import React, { useEffect, useState } from 'react';
import { WelcomeHeader } from '../components/welcome-header.component';
import { TokenBudgetGuard, type TokenBudget } from '../components/token-budget-guard.component';
import { RecentWorkspaceCards, type RecentChat, type RecentArticle } from '../components/recent-workspace-cards.component';
import { SpatialPreviewWrapper } from '../components/spatial-preview-wrapper.component';
import { MOCK_DATA } from '../../../services/mock-data.service';
import type { MapLocationPoint } from '../components/spatial-map.component';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export interface DashboardViewProps {
  onNavigate?: (route: string) => void;
  onLogout?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
}) => {
  const [mapPoints, setMapPoints] = useState<MapLocationPoint[]>([]);
  const [dashboardMeta, setDashboardMeta] = useState<{
    tokenBudget: TokenBudget;
    recentChats: RecentChat[];
    recentArticles: RecentArticle[];
  } | null>(null);
  const [isLoadingMeta, setIsLoadingMeta] = useState<boolean>(true);

  // Integrasi asinkron pengumpulan metadata analitik sistem
  useEffect(() => {
    let isMounted = true;

    // Inisialisasi titik spasial dari mock data (PostGIS pre-render)
    setMapPoints(MOCK_DATA.spatialLocations);

    const fetchDashboardMetadata = async () => {
      try {
        setIsLoadingMeta(true);
        const response = await fetch(`${API_BASE_URL}/analysis/dashboard-meta`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        const resJson = await response.json();
        if (isMounted && resJson.success) {
          setDashboardMeta(resJson.data);
        }
      } catch (err) {
        console.warn(
          '[Protected Variations] Koneksi server lokal tidak terjangkau. Mengaktifkan data simulasi terpercaya...',
          err
        );

        // Fallback Data Simulasi untuk Menjamin Keberlangsungan Operasi Eksekutif (Resilience Guard) [1.1.3]
        if (isMounted) {
          setDashboardMeta({
            tokenBudget: {
              totalTokens: 15000,
              remainingTokens: 20818333,
              estimatedCostIdr: 65,
              remainingCostIdr: 79433600,
              remainingCostUsd: 4.40,
              totalCreditUsd: 5.00,
              maxMonthlyPaguIdr: 90380,
              quotaPercentage: 12.0,
              paguStatus: 'SAFE'
            },
            recentChats: [
              {
                id: 'sess-chat-001',
                title: 'Sesi Q&A: Analisis Anggaran PAD Mimika 2026',
                lastMessage: 'Penurunan PAD utamanya didorong oleh turunnya proyeksi royalti komoditas tembaga...',
                updatedAt: new Date(Date.now() - 3600000).toISOString(), // 1 jam lalu
                sourcesCount: 2,
                sources: ['Laporan Kebijakan Pembangunan Mimika 2026', 'Dokumen RTRW & Infrastruktur Wilayah']
              },
              {
                id: 'sess-chat-002',
                title: 'Evaluasi Infrastruktur Distrik Hoya',
                lastMessage: 'Akses logistik udara menjadi satu-satunya jalur pemenuhan sarana fisik asrama sekolah...',
                updatedAt: new Date(Date.now() - 7200000).toISOString(), // 2 jam lalu
                sourcesCount: 1,
                sources: ['Evaluasi Kualitas Pendidikan Distrik Hoya']
              }
            ],
            recentArticles: [
              {
                id: 'sess-art-001',
                title: 'Rilis Pers: Strategi Penurunan Kemiskinan Ekstrem Mimika',
                snippet: 'Tim Analis AKLS merumuskan 3 rekomendasi taktis akselerasi alokasi dana bantuan sosial pasca penyesuaian tarif BBM daerah...',
                updatedAt: new Date(Date.now() - 1800000).toISOString(), // 30 menit lalu
                sourcesCount: 3,
                sources: ['Laporan Kebijakan Pembangunan Mimika 2026', 'Dokumen RTRW & Infrastruktur Wilayah', 'Audit Investigasi Pengadaan Jalan Agimuga'],
                tone: 'SOLUTIF',
                targetLength: 'MEDIUM'
              },
              {
                id: 'sess-art-002',
                title: 'Analisis Kelayakan Jembatan Gantung Hoya',
                snippet: 'Pengurangan volume kontrak fisik jembatan gantung memicu urgensi evaluasi audit kepatuhan oleh dinas teknis...',
                updatedAt: new Date(Date.now() - 86400000).toISOString(), // 1 hari lalu
                sourcesCount: 1,
                sources: ['Evaluasi Kualitas Pendidikan Distrik Hoya'],
                tone: 'KRITIS',
                targetLength: 'SHORT'
              }
            ]
          });
        }
      } finally {
        if (isMounted) setIsLoadingMeta(false);
      }
    };

    fetchDashboardMetadata();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSafeNavigation = (targetRoute: string) => {
    if (onNavigate) {
      onNavigate(targetRoute);
    }
  };

  return (
    <div className="flex flex-col w-full bg-slate-50 font-roboto min-h-0 overflow-y-auto custom-scrollbar">

      {/* SEKSI 1. SALAM SELAMAT DATANG RESMI (EXECUTIVE WELCOME) */}
      <div className="w-full bg-white border-b border-slate-200 py-6 px-8 md:px-10">
        <WelcomeHeader />
      </div>

      {/* SEKSI 2. MONITOR ANGGARAN & KUOTA AI DAERAH (TOKEN BUDGET GUARD) */}
      <div className="w-full bg-slate-50 border-b border-slate-200 py-6 px-8 md:px-10">
        <TokenBudgetGuard
          budget={dashboardMeta?.tokenBudget}
          isLoading={isLoadingMeta}
        />
      </div>

      {/* SEKSI 3. BILAH AKTIVITAS TERBARU & TOMBOL POLIMORFIK (RECENT WORKSPACES) */}
      <div className="w-full bg-white border-b border-slate-200 py-6 px-8 md:px-10">
        <RecentWorkspaceCards
          recentChats={dashboardMeta?.recentChats || []}
          recentArticles={dashboardMeta?.recentArticles || []}
          onNavigate={handleSafeNavigation}
          onNavigateToEditor={(sessionId) => {
            if (onNavigate) {
              onNavigate(`generator?session=${sessionId}`);
            }
          }}
        />
      </div>

      {/* SEKSI 4. PREVIEW PETA TEMATIK INTERAKTIF (SPATIAL PORTAL) */}
      <div className="w-full bg-slate-50 py-6 px-8 md:px-10">
        <SpatialPreviewWrapper
          locations={mapPoints}
          onNavigate={handleSafeNavigation}
        />
      </div>

    </div>
  );
};

export default DashboardView;