import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Waypoint, GPSReading } from '../types';
import { Layers, Crosshair, Navigation, Maximize2, Ruler } from 'lucide-react';
import { haversineDistance } from '../utils/geo';

interface MapViewProps {
  waypoints: Waypoint[];
  currentGps: GPSReading | null;
  compassHeading: number | null;
  onSelectWaypoint: (waypoint: Waypoint) => void;
  onQuickCaptureAtLocation?: (lat: number, lon: number) => void;
}

type MapLayerType = 'google_hybrid' | 'google_satellite' | 'esri_sat' | 'topo' | 'osm';

export const MapView: React.FC<MapViewProps> = ({
  waypoints,
  currentGps,
  compassHeading,
  onSelectWaypoint,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);

  const [activeLayer, setActiveLayer] = useState<MapLayerType>('google_hybrid');
  const [showPolyline, setShowPolyline] = useState<boolean>(true);
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);
  const [totalTrackDistance, setTotalTrackDistance] = useState<number>(0);

  // URLs de mosaicos de mapas satelitales y topográficos
  const tileLayers: Record<MapLayerType, { url: string; maxZoom: number; subdomains?: string[]; attribution: string }> = {
    google_hybrid: {
      url: 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      maxZoom: 21,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '&copy; Google Maps Satélite Reciente',
    },
    google_satellite: {
      url: 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      maxZoom: 21,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '&copy; Google Maps Satélite',
    },
    esri_sat: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri World Imagery',
    },
    topo: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      maxZoom: 17,
      attribution: 'Map data: &copy; OpenTopoMap (Curvas de nivel)',
    },
    osm: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    },
  };

  // Inicializar mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = currentGps ? currentGps.latitude : 4.60971;
    const initialLon = currentGps ? currentGps.longitude : -74.08175;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLon],
      zoom: 16,
      zoomControl: false,
    });

    // Control de zoom en la esquina inferior derecha
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Capa base
    const tileConfig = tileLayers[activeLayer];
    const baseLayer = L.tileLayer(tileConfig.url, {
      maxZoom: tileConfig.maxZoom,
      subdomains: tileConfig.subdomains || 'abc',
      attribution: tileConfig.attribution,
    }).addTo(map);
    baseTileLayerRef.current = baseLayer;

    // Capa de marcadores
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    // Polilínea de trazado
    const polyline = L.polyline([], {
      color: '#f59e0b',
      weight: 3.5,
      dashArray: '6, 6',
      opacity: 0.85,
    }).addTo(map);
    polylineRef.current = polyline;

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Cambiar capa de mosaicos
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
    }

    const tileConfig = tileLayers[activeLayer];
    const newBase = L.tileLayer(tileConfig.url, {
      maxZoom: tileConfig.maxZoom,
      subdomains: tileConfig.subdomains || 'abc',
      attribution: tileConfig.attribution,
    }).addTo(map);
    newBase.bringToBack();
    baseTileLayerRef.current = newBase;
  }, [activeLayer]);

  // Actualizar marcador de posición actual del usuario y radio de precisión
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !currentGps) return;

    const pos: L.LatLngExpression = [currentGps.latitude, currentGps.longitude];

    // Icono de usuario personalizado con rumbo
    const heading = compassHeading || 0;
    const userIconHtml = `
      <div style="position: relative; width: 34px; height: 34px;">
        <div style="position: absolute; inset: 0; border-radius: 50%; background: rgba(56, 189, 248, 0.25); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: absolute; inset: 4px; border-radius: 50%; background: #0284c7; border: 2.5px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;">
          <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 9px solid white; transform: rotate(${heading}deg);"></div>
        </div>
      </div>
    `;

    const userIcon = L.divIcon({
      html: userIconHtml,
      className: 'gps-user-marker',
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker(pos, { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
    } else {
      userMarkerRef.current.setLatLng(pos);
      userMarkerRef.current.setIcon(userIcon);
    }

    // Círculo de precisión
    if (!accuracyCircleRef.current) {
      accuracyCircleRef.current = L.circle(pos, {
        radius: currentGps.accuracy,
        color: '#38bdf8',
        fillColor: '#38bdf8',
        fillOpacity: 0.12,
        weight: 1.5,
      }).addTo(map);
    } else {
      accuracyCircleRef.current.setLatLng(pos);
      accuracyCircleRef.current.setRadius(currentGps.accuracy);
    }
  }, [currentGps, compassHeading]);

  // Actualizar marcadores de Waypoints y polilínea de recorrido
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    const latLngs: L.LatLngExpression[] = [];
    let calculatedDist = 0;

    waypoints.forEach((w, index) => {
      const pos: L.LatLngExpression = [w.latitude, w.longitude];
      latLngs.push(pos);

      if (index > 0) {
        calculatedDist += haversineDistance(
          waypoints[index - 1].latitude,
          waypoints[index - 1].longitude,
          w.latitude,
          w.longitude
        );
      }

      // Colores de categoría
      const categoryColors: Record<string, string> = {
        valvula: '#ef4444', // Rojo
        tuberia: '#f59e0b', // Ámbar
        cruce: '#06b6d4', // Cian
        poste_hito: '#10b981', // Esmeralda
        obra_civil: '#8b5cf6', // Violeta
        geotecnia: '#d97706', // Ocre
        ambiental: '#22c55e', // Verde
        servidumbre: '#ec4899', // Rosa
        soldadura: '#f97316', // Naranja
        general: '#64748b', // Gris
      };

      const markerColor = categoryColors[w.category] || '#f59e0b';
      const hasPhoto = w.photos && w.photos.length > 0;

      const markerHtml = `
        <div style="position: relative; width: 32px; height: 38px; cursor: pointer;">
          <svg viewBox="0 0 24 30" width="32" height="38" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.45));">
            <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 18 12 18s12-9 12-18c0-6.627-5.373-12-12-12z" fill="${markerColor}" stroke="#ffffff" stroke-width="1.5"/>
            <circle cx="12" cy="11" r="5" fill="#18181b"/>
            ${hasPhoto ? '<circle cx="17" cy="6" r="3" fill="#38bdf8" stroke="#ffffff" stroke-width="1"/>' : ''}
          </svg>
          <div style="position: absolute; top: 38px; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.9); color: white; font-family: monospace; font-size: 10px; font-weight: bold; padding: 1px 4px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.2); white-space: nowrap;">
            ${w.pointCode}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-topo-pin',
        iconSize: [32, 48],
        iconAnchor: [16, 38],
        popupAnchor: [0, -38],
      });

      const marker = L.marker(pos, { icon: customIcon });

      // Popup informativo con miniatura de la foto si tiene
      const photoThumb = hasPhoto
        ? `<div style="margin-top:6px; border-radius:4px; overflow:hidden; border:1px solid #334155;">
             <img src="${w.photos[0].dataUrl}" style="width:100%; height:110px; object-fit:cover; display:block;" />
             <div style="background:#0f172a; color:#38bdf8; font-size:9px; font-family:monospace; padding:2px 4px;">Foto con coordenadas estampadas</div>
           </div>`
        : '';

      const popupHtml = `
        <div style="font-family:sans-serif; min-width: 210px; max-width: 260px; color:#1e293b; padding:2px;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:4px; margin-bottom:6px;">
            <strong style="color:#d97706; font-size:14px; font-family:monospace;">${w.pointCode}</strong>
            <span style="font-size:10px; background:#f1f5f9; padding:2px 6px; border-radius:999px; text-transform:uppercase;">${w.category}</span>
          </div>
          <div style="font-size:11px; line-height:1.4; color:#334155;">
            <div><b>Proyecto:</b> ${w.project}</div>
            ${w.chainagePk ? `<div><b>PK:</b> ${w.chainagePk}</div>` : ''}
            <div><b>UTM:</b> <span style="font-family:monospace; font-size:10px;">${w.utm.formatted}</span></div>
            <div><b>Altitud:</b> ${w.altitude ? `${Math.round(w.altitude)} m` : '---'} | <b>Prec:</b> ±${w.accuracy ? w.accuracy.toFixed(1) : ''}m</div>
            ${w.notes ? `<div style="margin-top:4px; font-style:italic; color:#64748b;">"${w.notes.slice(0, 50)}..."</div>` : ''}
          </div>
          ${photoThumb}
          <button id="btn-view-${w.id}" style="margin-top:8px; width:100%; background:#d97706; color:white; border:none; padding:6px; font-weight:bold; font-size:11px; border-radius:4px; cursor:pointer;">
            Ver Ficha / Foto Completa
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-view-${w.id}`);
        if (btn) {
          btn.onclick = () => onSelectWaypoint(w);
        }
      });

      marker.addTo(markersLayer);
    });

    // Actualizar polilínea
    if (polylineRef.current) {
      if (showPolyline && latLngs.length > 0) {
        polylineRef.current.setLatLngs(latLngs);
      } else {
        polylineRef.current.setLatLngs([]);
      }
    }

    setTotalTrackDistance(calculatedDist);
  }, [waypoints, showPolyline, onSelectWaypoint]);

  // Centrar mapa en posición del usuario
  const centerOnUser = () => {
    if (!mapInstanceRef.current || !currentGps) return;
    mapInstanceRef.current.setView([currentGps.latitude, currentGps.longitude], 17, {
      animate: true,
    });
  };

  // Ajustar límites para ver todos los puntos
  const fitAllPoints = () => {
    if (!mapInstanceRef.current || waypoints.length === 0) return;
    const group = L.featureGroup(
      waypoints.map((w) => L.marker([w.latitude, w.longitude]))
    );
    mapInstanceRef.current.fitBounds(group.getBounds().pad(0.15));
  };

  return (
    <div className="relative w-full h-full min-h-[480px] bg-stone-950 overflow-hidden flex flex-col">
      {/* Contenedor del Mapa Leaflet */}
      <div ref={mapContainerRef} className="w-full h-full z-0 flex-1" />

      {/* Barra de control flotante superior izquierda */}
      <div className="absolute top-3 left-3 z-[400] flex flex-col gap-2">
        {/* Selector de Capas */}
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="flex items-center gap-1.5 bg-stone-900/90 hover:bg-stone-800 text-stone-200 px-3 py-2 rounded-lg shadow-lg border border-stone-700 backdrop-blur text-xs font-semibold transition"
          >
            <Layers className="w-4 h-4 text-amber-400" />
            <span className="capitalize">
              {activeLayer === 'google_hybrid'
                ? 'Google Satélite HD'
                : activeLayer === 'google_satellite'
                ? 'Google Satélite Puro'
                : activeLayer === 'esri_sat'
                ? 'Esri Satélite'
                : activeLayer === 'topo'
                ? 'Topográfico Curvas'
                : 'Calles'}
            </span>
          </button>

          {showLayerMenu && (
            <div className="absolute top-full left-0 mt-1.5 w-52 bg-stone-900/95 border border-stone-700 rounded-lg shadow-xl p-1.5 text-xs z-50 backdrop-blur">
              <div className="text-[10px] text-stone-400 font-mono uppercase px-2 py-1">Capas Satelitales y Mapa:</div>
              <button
                onClick={() => { setActiveLayer('google_hybrid'); setShowLayerMenu(false); }}
                className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between ${
                  activeLayer === 'google_hybrid' ? 'bg-amber-600 text-stone-950 font-bold' : 'text-stone-300 hover:bg-stone-800'
                }`}
              >
                <span>Google Satélite (Híbrido)</span>
              </button>
              <button
                onClick={() => { setActiveLayer('google_satellite'); setShowLayerMenu(false); }}
                className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between ${
                  activeLayer === 'google_satellite' ? 'bg-amber-600 text-stone-950 font-bold' : 'text-stone-300 hover:bg-stone-800'
                }`}
              >
                <span>Google Satélite (Puro)</span>
              </button>
              <button
                onClick={() => { setActiveLayer('esri_sat'); setShowLayerMenu(false); }}
                className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between ${
                  activeLayer === 'esri_sat' ? 'bg-amber-600 text-stone-950 font-bold' : 'text-stone-300 hover:bg-stone-800'
                }`}
              >
                <span>Esri World Imagery</span>
              </button>
              <button
                onClick={() => { setActiveLayer('topo'); setShowLayerMenu(false); }}
                className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between ${
                  activeLayer === 'topo' ? 'bg-amber-600 text-stone-950 font-bold' : 'text-stone-300 hover:bg-stone-800'
                }`}
              >
                <span>OpenTopo (Curvas)</span>
              </button>
              <button
                onClick={() => { setActiveLayer('osm'); setShowLayerMenu(false); }}
                className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between ${
                  activeLayer === 'osm' ? 'bg-amber-600 text-stone-950 font-bold' : 'text-stone-300 hover:bg-stone-800'
                }`}
              >
                <span>Calles / Relieve OSM</span>
              </button>

              <div className="border-t border-stone-800 my-1"></div>
              <label className="flex items-center gap-2 px-2 py-1 text-stone-300 cursor-pointer hover:bg-stone-800 rounded">
                <input
                  type="checkbox"
                  checked={showPolyline}
                  onChange={(e) => setShowPolyline(e.target.checked)}
                  className="rounded accent-amber-500"
                />
                <span className="text-[11px]">Trazado / Línea ducto</span>
              </label>
            </div>
          )}
        </div>

        {/* Telemetría de Puntos y Distancia de Levantamiento */}
        {waypoints.length > 0 && (
          <div className="bg-stone-900/90 border border-stone-700/80 rounded-lg p-2 text-xs font-mono text-stone-200 shadow-lg backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold">{waypoints.length}</span>
              <span className="text-stone-400 text-[11px]">Puntos registrados</span>
            </div>
            {totalTrackDistance > 0 && (
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-stone-300">
                <Ruler className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  {totalTrackDistance >= 1000
                    ? `${(totalTrackDistance / 1000).toFixed(2)} km`
                    : `${Math.round(totalTrackDistance)} m`}
                </span>
                <span className="text-stone-500 text-[10px]">recorrido</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Botones de acción flotantes superior derecha */}
      <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2">
        {/* Centrar en mi ubicación */}
        <button
          onClick={centerOnUser}
          title="Centrar en mi posición GPS"
          className="bg-stone-900/90 hover:bg-stone-800 active:scale-95 text-stone-200 p-2.5 rounded-lg shadow-lg border border-stone-700 backdrop-blur transition"
        >
          <Navigation className="w-5 h-5 text-sky-400" />
        </button>

        {/* Ver todos los puntos */}
        {waypoints.length > 0 && (
          <button
            onClick={fitAllPoints}
            title="Ajustar vista a todos los waypoints"
            className="bg-stone-900/90 hover:bg-stone-800 active:scale-95 text-stone-200 p-2.5 rounded-lg shadow-lg border border-stone-700 backdrop-blur transition"
          >
            <Maximize2 className="w-5 h-5 text-amber-400" />
          </button>
        )}
      </div>
    </div>
  );
};
