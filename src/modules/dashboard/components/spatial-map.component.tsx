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
  locations: MapLocationPoint[];
}

export const SpatialMap: React.FC<SpatialMapProps> = ({ locations }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Default center for Kabupaten Mimika (Timika)
    const defaultCenter: [number, number] = [-4.5463, 136.8863];

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 10,
        scrollWheelZoom: false,
      });

      // CartoDB Voyager TileLayer for cheerful, ultra-clear light cartography
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Custom Vibrant Teal Icon Marker
    const customIcon = L.divIcon({
      className: 'custom-map-marker',
      html: `<div style="background-color: #0d9488; width: 16px; height: 16px; border-radius: 0px; border: 2px solid #ffffff; box-shadow: 0 2px 8px rgba(13,148,136,0.5);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    // Add markers for location points
    locations.forEach((loc) => {
      const marker = L.marker([loc.latitude, loc.longitude], { icon: customIcon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: 'Roboto', sans-serif; padding: 4px; color: #0f172a;">
          <strong style="display: block; font-size: 13px; margin-bottom: 2px; color: #0f172a;">${loc.locationName}</strong>
          ${loc.documentTitle ? `<span style="font-size: 11px; color: #475569;">Sumber: ${loc.documentTitle}</span>` : ''}
        </div>
      `);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [locations]);

  return (
    <div className="bg-white border border-slate-200 rounded-none overflow-hidden shadow-sm flex flex-col h-[480px]">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <h2 className="text-h2 text-slate-800">Pemetaan Sebaran Spasial Wilayah (Kabupaten Mimika)</h2>
        <span className="text-xs font-roboto text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 font-semibold rounded-none">
          PostGIS Spatial Engine
        </span>
      </div>
      
      <div ref={mapContainerRef} className="flex-1 w-full relative z-0 bg-slate-100" />
    </div>
  );
};
