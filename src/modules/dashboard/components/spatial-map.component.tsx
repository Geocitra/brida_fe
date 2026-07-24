import React, { useEffect, useRef, useState } from 'react';
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

// Base layer definitions
const BASE_LAYERS: Record<string, { label: string; tile: string; attribution: string; maxZoom: number; subdomains?: string }> = {
  carto: {
    label: 'CartoDB Voyager',
    tile: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/" target="_blank">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OSM</a>',
    maxZoom: 19,
    subdomains: 'abcd',
  },
  google_satellite: {
    label: 'Google Satellite',
    tile: 'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attribution: '&copy; <a href="https://www.google.com/maps" target="_blank">Google Maps</a>',
    maxZoom: 22,
    subdomains: '0123',
  },
  google_hybrid: {
    label: 'Google Hybrid',
    tile: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; <a href="https://www.google.com/maps" target="_blank">Google Maps</a>',
    maxZoom: 22,
    subdomains: '0123',
  },
  google_streets: {
    label: 'Google Streets',
    tile: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; <a href="https://www.google.com/maps" target="_blank">Google Maps</a>',
    maxZoom: 22,
    subdomains: '0123',
  },
  esri_imagery: {
    label: 'ESRI Imagery',
    tile: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/" target="_blank">Esri</a>',
    maxZoom: 19,
  },
  esri_topo: {
    label: 'ESRI Topo',
    tile: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/" target="_blank">Esri</a>',
    maxZoom: 19,
  },
};

type BaseLayerKey = keyof typeof BASE_LAYERS;

export const SpatialMap: React.FC<SpatialMapProps> = ({ locations }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const geojsonLayerRef = useRef<L.GeoJSON | null>(null);
  const maskLayerRef = useRef<L.Polygon | null>(null);

  const [activeLayer, setActiveLayer] = useState<BaseLayerKey>('google_satellite');
  const [showDistrict, setShowDistrict] = useState(true);
  const [darkenOutside, setDarkenOutside] = useState(true);
  const activeLayerRef = useRef<BaseLayerKey>('google_satellite');

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const defaultCenter: [number, number] = [-4.55, 136.88];

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 9,
      scrollWheelZoom: true,
      zoomControl: true,
    });

    const def = BASE_LAYERS[activeLayerRef.current];
    const tl = L.tileLayer(def.tile, {
      attribution: def.attribution,
      maxZoom: def.maxZoom,
      subdomains: def.subdomains || 'abc',
    });
    tl.addTo(map);
    tileLayerRef.current = tl;
    mapInstanceRef.current = map;

    // Load GeoJSON Batas Wilayah Mimika
    fetch('/mimika_18_distrik.json')
      .then((r) => r.json())
      .then((geojson) => {
        if (!mapInstanceRef.current) return;

        // 1. Build Inverted Mask (Darken area outside Mimika)
        // Outer ring covers world, inner rings are district polygons (holes)
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

        // Mask Polygon: world ring + holes
        const maskPolygon = L.polygon([worldOuterRing, ...innerHoles], {
          color: '#000000',
          weight: 0,
          fillColor: '#0f172a',
          fillOpacity: 0.65,
          interactive: false,
        });

        if (darkenOutside) {
          maskPolygon.addTo(mapInstanceRef.current);
        }
        maskLayerRef.current = maskPolygon;

        // 2. Clean Boundary Lines (No individual colors, transparent fill)
        const layer = L.geoJSON(geojson, {
          style: () => ({
            color: '#38bdf8', // Vibrant Light Blue / Teal crisp outline
            weight: 1.8,
            opacity: 0.95,
            fillColor: 'transparent',
            fillOpacity: 0,
          }),
          onEachFeature: (feature, lyr) => {
            const name = feature?.properties?.district_name || feature?.properties?.WADMKK || 'Distrik';
            
            lyr.bindTooltip(name, {
              permanent: false,
              direction: 'center',
              className: 'district-tooltip',
            });

            lyr.on('mouseover', function (this: L.Path) {
              this.setStyle({ color: '#facc15', weight: 3, fillOpacity: 0.15, fillColor: '#facc15' });
            });
            lyr.on('mouseout', function (this: L.Path) {
              this.setStyle({ color: '#38bdf8', weight: 1.8, fillOpacity: 0, fillColor: 'transparent' });
            });

            lyr.bindPopup(
              `<div style="font-family:'Roboto',sans-serif;padding:6px;min-width:170px;">
                <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#0284c7;font-weight:700;display:block;">Distrik Kabupaten Mimika</span>
                <strong style="font-size:14px;color:#0f172a;display:block;margin-top:2px;">${name}</strong>
              </div>`,
            );
          },
        });

        layer.addTo(mapInstanceRef.current);
        geojsonLayerRef.current = layer;

        // Fit map to Mimika boundary
        const bounds = layer.getBounds();
        if (bounds.isValid()) mapInstanceRef.current.fitBounds(bounds, { padding: [30, 30] });
      })
      .catch((err) => console.warn('[SpatialMap] GeoJSON error:', err));

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        tileLayerRef.current = null;
        geojsonLayerRef.current = null;
        maskLayerRef.current = null;
      }
    };
  }, []);

  // Base layer switch
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);

    const def = BASE_LAYERS[activeLayer];
    const newTile = L.tileLayer(def.tile, {
      attribution: def.attribution,
      maxZoom: def.maxZoom,
      subdomains: def.subdomains || 'abc',
    });
    newTile.addTo(map);
    tileLayerRef.current = newTile;

    // Bring mask & GeoJSON boundaries to front
    if (maskLayerRef.current && map.hasLayer(maskLayerRef.current)) {
      maskLayerRef.current.bringToFront();
    }
    if (geojsonLayerRef.current && map.hasLayer(geojsonLayerRef.current)) {
      geojsonLayerRef.current.bringToFront();
    }
  }, [activeLayer]);

  // Toggle Boundary Lines
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = geojsonLayerRef.current;
    if (!map || !layer) return;

    if (showDistrict) {
      if (!map.hasLayer(layer)) layer.addTo(map);
    } else {
      if (map.hasLayer(layer)) map.removeLayer(layer);
    }
  }, [showDistrict]);

  // Toggle Darken Outside Mask
  useEffect(() => {
    const map = mapInstanceRef.current;
    const mask = maskLayerRef.current;
    if (!map || !mask) return;

    if (darkenOutside) {
      if (!map.hasLayer(mask)) mask.addTo(map);
      mask.bringToFront();
      if (geojsonLayerRef.current && map.hasLayer(geojsonLayerRef.current)) {
        geojsonLayerRef.current.bringToFront();
      }
    } else {
      if (map.hasLayer(mask)) map.removeLayer(mask);
    }
  }, [darkenOutside]);

  // Update Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    const customIcon = L.divIcon({
      className: 'custom-map-marker',
      html: `<div style="background-color:#0d9488;width:14px;height:14px;border-radius:50%;border:2.5px solid #ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    locations.forEach((loc) => {
      const marker = L.marker([loc.latitude, loc.longitude], { icon: customIcon }).addTo(map);
      marker.bindPopup(
        `<div style="font-family:'Roboto',sans-serif;padding:6px;color:#0f172a;">
          <strong style="display:block;font-size:13px;margin-bottom:2px;color:#0f172a;">${loc.locationName}</strong>
          ${loc.documentTitle ? `<span style="font-size:11px;color:#475569;">Sumber: ${loc.documentTitle}</span>` : ''}
        </div>`,
      );
    });
  }, [locations]);

  return (
    <div className="bg-white border border-slate-200 rounded-none overflow-hidden shadow-sm flex flex-col" style={{ height: 540 }}>
      {/* Header Controls */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-h2 text-slate-800">Pemetaan Sebaran Spasial Wilayah (Kabupaten Mimika)</h2>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Base Layer Switcher */}
          <select
            value={activeLayer}
            onChange={(e) => setActiveLayer(e.target.value as BaseLayerKey)}
            className="bg-white border border-slate-300 text-slate-800 text-xs font-semibold px-2.5 py-1.5 rounded-none focus:outline-none focus:border-teal-600 shadow-xs"
          >
            {Object.entries(BASE_LAYERS).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          {/* Toggle Darken Outside */}
          <button
            onClick={() => setDarkenOutside((v) => !v)}
            className={`text-xs font-bold px-2.5 py-1.5 border rounded-none shadow-xs transition-colors ${
              darkenOutside
                ? 'bg-slate-900 text-amber-300 border-slate-900'
                : 'bg-white text-slate-700 border-slate-300 hover:border-slate-500'
            }`}
          >
            {darkenOutside ? '🌙 Soliter Mimika (Gelap Luar)' : '☀️ Normal (Tanpa Mask)'}
          </button>

          {/* Toggle District Lines */}
          <button
            onClick={() => setShowDistrict((v) => !v)}
            className={`text-xs font-bold px-2.5 py-1.5 border rounded-none shadow-xs transition-colors ${
              showDistrict
                ? 'bg-teal-700 text-white border-teal-800'
                : 'bg-white text-slate-700 border-slate-300 hover:border-teal-500'
            }`}
          >
            {showDistrict ? 'Sembunyikan Garis' : 'Tampilkan Garis'}
          </button>

          <span className="text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-none">
            PostGIS Spatial Engine
          </span>
        </div>
      </div>

      {/* Map Container */}
      <div ref={mapContainerRef} className="flex-1 w-full relative z-0 bg-slate-900" />

      {/* Legend */}
      <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 flex items-center gap-4 text-[10px] text-slate-500 font-medium flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-0.5 bg-sky-400" />
          Garis Batas Distrik Mimika
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 bg-slate-900 opacity-60 border border-slate-600" />
          Mask Luar Wilayah (Fokus Mimika)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-teal-600 border border-white" />
          Titik Lokasi Dokumen
        </span>
        <span className="ml-auto">Base: <strong className="text-slate-700">{BASE_LAYERS[activeLayer].label}</strong></span>
      </div>

      <style>{`
        .district-tooltip {
          background: rgba(15,23,42,0.9);
          color: #f8fafc;
          border: 1px solid #38bdf8;
          border-radius: 2px;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        }
        .district-tooltip::before { display: none; }

        /* Eliminate focus bounding box / rectangle outline on map paths and elements */
        .leaflet-container *:focus,
        .leaflet-container path:focus,
        .leaflet-interactive:focus,
        .leaflet-interactive:focus-visible,
        path.leaflet-interactive:focus,
        path.leaflet-interactive:focus-visible {
          outline: none !important;
          box-shadow: none !important;
        }
      `}</style>
    </div>
  );
};
