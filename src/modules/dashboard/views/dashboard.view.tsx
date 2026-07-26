import React, { useEffect, useState } from 'react';
import { StatCards } from '../components/stat-cards.component';
import { SpatialMap, type MapLocationPoint } from '../components/spatial-map.component';
import { MOCK_DATA } from '../../../services/mock-data.service';

export const DashboardView: React.FC = () => {
  const [documents] = useState(MOCK_DATA.documents);
  const [mapPoints, setMapPoints] = useState<MapLocationPoint[]>([]);

  useEffect(() => {
    setMapPoints(MOCK_DATA.spatialLocations);
  }, []);

  return (
    <div className="flex flex-col w-full min-h-full bg-slate-100/70 p-6 space-y-6 font-roboto">
      {/* SECTION 1. HERO COMMAND STRIP HEADER */}
      <div className="w-full bg-white border border-slate-300 px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-none shadow-2xs">
        <div className="flex flex-col">
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
        <div className="flex items-center md:border-l md:border-slate-300 md:pl-6">
          <div className="px-1 py-2 flex flex-col justify-center rounded-none">
            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
              Status Operasional
            </span>
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              ONLINE (Optimal)
            </span>
          </div>
        </div>
      </div>

      {/* Kartu Metrik Deterministik */}
      <StatCards 
        totalDocuments={documents.length}
        totalChunks={documents.reduce((acc, d) => acc + (d.chunkCount || 0), 0)}
        totalLocations={mapPoints.length}
        systemStatus="ONLINE (Optimal)"
      />

      {/* Peta Spasial PostGIS */}
      <SpatialMap locations={mapPoints} />
    </div>
  );
};
