import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapLocationPoint {
  id: string;
  locationName: string;
  latitude: number;
  longitude: number;
  documentTitle?: string;
}

interface SpatialMapProps {
  locations?: MapLocationPoint[]; // Properti opsional untuk menjaga kompatibilitas rute pemanggilan
}

export const SpatialMap: React.FC<SpatialMapProps> = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Citra Satelit Google Kualitas Tinggi sebagai Basemap Statis Tunggal
  const STATIC_TILE_URL = 'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}';

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Koordinat pusat Kabupaten Mimika
    const defaultCenter: [number, number] = [-4.60, 136.95];

    // Mengunci seluruh bentuk interaksi peta (Lock Navigation Model)
    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 8.5,             // Tingkat perbesaran statis yang optimal untuk layar komputer & tablet
      zoomControl: false,    // Hapus tombol zoom (+/-)
      dragging: false,       // Matikan navigasi seret geser
      touchZoom: false,      // Matikan navigasi jepit layar sentuh
      doubleClickZoom: false,// Matikan double click perbesaran
      scrollWheelZoom: false,// Matikan scroll mouse zoom
      boxZoom: false,        // Matikan kotak zoom
      keyboard: false,       // Matikan interaksi keyboard
      attributionControl: false, // Sembunyikan kredit atribusi untuk estetika mutlak
    });

    // Tempelkan Basemap Citra Satelit
    L.tileLayer(STATIC_TILE_URL, {
      subdomains: '0123',
      maxZoom: 20,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Memuat data batas wilayah 18 Distrik Mimika
    fetch('/mimika_18_distrik.json')
      .then((r) => r.json())
      .then((geojson) => {
        if (!mapInstanceRef.current) return;

        // Membentuk Mask Gelap-Terang Luar Wilayah (Inverted Hole Mask)
        const worldOuterRing: [number, number][] = [
          [-85, -180],
          [-85, 180],
          [85, 180],
          [85, -180],
        ];

        const innerHoles: [number, number][][] = [];

        geojson.features.forEach((feature: any) => {
          const geom = feature.geometry;
          if (!geom) return;

          if (geom.type === 'Polygon') {
            const outerRing = geom.coordinates[0].map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]);
            innerHoles.push(outerRing);
          } else if (geom.type === 'MultiPolygon') {
            geom.coordinates.forEach((polyCoords: any) => {
              const outerRing = polyCoords[0].map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]);
              innerHoles.push(outerRing);
            });
          }
        });

        // 1. Lapisan Gelap Luar Wilayah Mimika (Fill Opacity Kontras Tinggi)
        const maskPolygon = L.polygon([worldOuterRing, ...innerHoles], {
          color: '#000000',
          weight: 0,
          fillColor: '#090d16', // Slate Gelap Eksekutif
          fillOpacity: 0.70,   // Kontras kegelapan luar wilayah dipertebal
          interactive: false,  // Matikan interaksi
        });
        maskPolygon.addTo(mapInstanceRef.current);

        // 2. Lapisan Batas Wilayah Distrik (Outline Tanpa Warna Isian)
        const boundaryLayer = L.geoJSON(geojson, {
          interactive: false, // Matikan interaksi hover/klik batas distrik
          style: () => ({
            color: '#14b8a6', // Garis Batas Teal/Turquoise Neon Bersih
            weight: 1.5,      // Ketebalan garis minimalis
            opacity: 0.85,
            fillColor: 'transparent',
            fillOpacity: 0,
          }),
        });
        boundaryLayer.addTo(mapInstanceRef.current);

        // Fokuskan bingkai peta secara pas pada batas wilayah Mimika
        const bounds = boundaryLayer.getBounds();
        if (bounds.isValid()) {
          mapInstanceRef.current.fitBounds(bounds, { padding: [15, 15] });
        }
      })
      .catch((err) => console.warn('[SpatialMap] Gagal memproses GeoJSON:', err));

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-full bg-[#090d16] overflow-hidden select-none pointer-events-none rounded-none border-none">
      {/* Kanvas Render Peta Tunggal */}
      <div ref={mapContainerRef} className="w-full h-full relative z-0" />
    </div>
  );
};

export default SpatialMap;