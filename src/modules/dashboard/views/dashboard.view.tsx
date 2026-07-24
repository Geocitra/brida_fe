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
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-h1 mb-1">Dashboard Spasial & Analitik Eksekutif</h1>
        <p className="text-body">
          Pemantauan real-time wilayah Kabupaten Mimika berbasis data deterministik arsip dokumen dan kueri analitis terstruktur.
        </p>
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
