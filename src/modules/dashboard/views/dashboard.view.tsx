import React, { useEffect, useState } from 'react';
import { StatCards } from '../components/stat-cards.component';
import { SpatialMap, type MapLocationPoint } from '../components/spatial-map.component';
import type { DocumentRecord } from '../../../services/document.service';

export const DashboardView: React.FC = () => {
  const [documents] = useState<DocumentRecord[]>([
    {
      id: 'doc-001',
      title: 'Laporan Kebijakan Pembangunan Mimika 2026',
      fileUrl: '/uploads/doc-001.pdf',
      mimeType: 'application/pdf',
      checksumHash: 'hash-001',
      status: 'READY',
      createdAt: new Date().toISOString(),
      metadata: {
        fileSizeBytes: '2450000',
        pageCount: 13,
        totalTokenCount: 12500,
        category: 'Analisis Kebijakan',
        uploadedBy: 'Kepala BRIDA',
      },
      chunkCount: 24,
    },
    {
      id: 'doc-002',
      title: 'Dokumen RTRW & Infrastruktur Wilayah',
      fileUrl: '/uploads/doc-002.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      checksumHash: 'hash-002',
      status: 'READY',
      createdAt: new Date().toISOString(),
      metadata: {
        fileSizeBytes: '1850000',
        pageCount: 8,
        totalTokenCount: 8200,
        category: 'Dokumen Hukum',
        uploadedBy: 'Kepala BRIDA',
      },
      chunkCount: 16,
    },
  ]);
  const [mapPoints, setMapPoints] = useState<MapLocationPoint[]>([]);

  useEffect(() => {
    // Representative geospatial points for Kabupaten Mimika (Timika, Tembagapura, Mimika Timur)
    const samplePoints: MapLocationPoint[] = [
      { id: '1', locationName: 'Distrik Mimika Baru (Timika)', latitude: -4.5448, longitude: 136.8870, documentTitle: 'Laporan Kebijakan Pembangunan Mimika 2026' },
      { id: '2', locationName: 'Kawasan Tembagapura / PTFI', latitude: -4.2497, longitude: 137.1122, documentTitle: 'Dokumen RTRW & Infrastruktur Wilayah' },
      { id: '3', locationName: 'Distrik Mimika Timur', latitude: -4.6120, longitude: 137.0150, documentTitle: 'Dokumen RTRW & Infrastruktur Wilayah' }
    ];
    setMapPoints(samplePoints);
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
