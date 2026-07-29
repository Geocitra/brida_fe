import React, { useEffect, useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { StatCards } from '../components/stat-cards.component';
import { SpatialMap, type MapLocationPoint } from '../components/spatial-map.component';
import { MOCK_DATA } from '../../../services/mock-data.service';

// ============================================================================
// TYPESCRIPT PROPS INTERFACE (Enforsemen Keamanan Tipe Data)
// Menjamin sinkronisasi parameter onNavigate & onLogout dengan App.tsx [TS2322 Fixed]
// ============================================================================
export interface DashboardViewProps {
  onNavigate?: (route: string) => void;
  onLogout?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
}) => {
  const [documents] = useState(MOCK_DATA.documents);
  const [mapPoints, setMapPoints] = useState<MapLocationPoint[]>([]);

  useEffect(() => {
    setMapPoints(MOCK_DATA.spatialLocations);
  }, []);

  return (
    <div className="flex flex-col w-full bg-slate-100/70 p-6 space-y-6 font-roboto">

      {/* SECTION 1. HERO COMMAND STRIP HEADER */}
      <div className="w-full bg-white border border-slate-300 px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-none shadow-2xs">
        <div className="flex flex-col text-left">
          <span className="text-[10px] font-bold tracking-widest text-teal-800 uppercase mb-1">
            Beranda / Dashboard Eksekutif
          </span>
          <h1 className="text-xl font-bold uppercase text-slate-900 tracking-tight">
            Dashboard Spasial &amp; Analitik Eksekutif
          </h1>
          <p className="text-xs text-slate-500 font-normal mt-1">
            Pemantauan real-time wilayah Kabupaten Mimika berbasis data deterministik arsip dokumen dan kueri analitis terstruktur.
          </p>
        </div>

        {/* Sisi Kanan: Status System Badge */}
        <div className="flex items-center md:border-l md:border-slate-300 md:pl-6 shrink-0">
          <div className="px-1 py-2 flex flex-col justify-center rounded-none text-left">
            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
              Status Operasional
            </span>
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 mt-0.5 select-none">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              ONLINE (Optimal)
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 2. KARTU METRIK DETERMINISTIK */}
      <StatCards
        totalDocuments={documents.length}
        totalChunks={documents.reduce((acc, d) => acc + (d.chunkCount || 0), 0)}
        totalLocations={mapPoints.length}
        systemStatus="ONLINE (Optimal)"
      />

      {/* SECTION 3. BILAH KONTROL PUSAT SPASIAL (Anti-Nested Box Gateway) */}
      <div className="w-full bg-white border border-slate-300 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-none shadow-2xs">
        <div className="flex flex-col text-left">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
            Pratinjau Peta Sebaran Wilayah
          </h3>
          <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
            Klik tombol di samping untuk mengaktifkan sistem navigasi spasial interaktif penuh (GFW Command Center).
          </p>
        </div>

        <button
          onClick={() => onNavigate?.('gis-explorer')}
          className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs uppercase tracking-wider rounded-none inline-flex items-center justify-center gap-2 border border-teal-800 shadow-xs cursor-pointer shrink-0 transition-colors active:scale-95"
          title="Masuk Mode Teater / Peta Penuh Spasial Mimika"
        >
          <span>Buka Pusat Pengendali Spasial (Full Screen GFW Mode)</span>
          <Maximize2 size={13} className="shrink-0" />
        </button>
      </div>

      {/* SECTION 4. PETA SPASIAL PREVIEW CARD */}
      <div className="w-full border border-slate-300 bg-white p-1 rounded-none shadow-2xs">
        <SpatialMap locations={mapPoints} />
      </div>

    </div>
  );
};

export default DashboardView;