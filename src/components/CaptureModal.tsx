import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { Waypoint, ElementCategory, ConditionState, GPSReading, ProjectSettings, StampedPhoto, CustomField } from '../types';
import { CameraView } from './CameraView';
import { latLonToUTM } from '../utils/geo';
import {
  X,
  Camera,
  MapPin,
  Save,
  Trash2,
  Eye,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Globe,
  Layers,
} from 'lucide-react';

interface CaptureModalProps {
  initialGps: GPSReading | null;
  compassHeading: number | null;
  settings: ProjectSettings;
  existingWaypoint?: Waypoint | null;
  onSave: (waypoint: Waypoint) => void;
  onClose: () => void;
}

export const CaptureModal: React.FC<CaptureModalProps> = ({
  initialGps,
  compassHeading,
  settings,
  existingWaypoint,
  onSave,
  onClose,
}) => {
  // Coordenadas
  const [lat, setLat] = useState<number>(existingWaypoint?.latitude ?? initialGps?.latitude ?? 4.60971);
  const [lon, setLon] = useState<number>(existingWaypoint?.longitude ?? initialGps?.longitude ?? -74.08175);
  const alt = existingWaypoint?.altitude ?? initialGps?.altitude ?? 2600;
  const acc = existingWaypoint?.accuracy ?? initialGps?.accuracy ?? 4.5;
  const heading = existingWaypoint?.heading ?? compassHeading ?? 120;

  // Campos principales simplificados para celular
  const [pointName, setPointName] = useState(
    existingWaypoint?.name ||
      existingWaypoint?.pointCode ||
      `${settings.pointCodePrefix}-${String(settings.nextPointNumber).padStart(3, '0')}`
  );
  const [category, setCategory] = useState<ElementCategory>(existingWaypoint?.category || 'valvula');
  const [notes, setNotes] = useState(existingWaypoint?.notes || '');
  const [photos, setPhotos] = useState<StampedPhoto[]>(existingWaypoint?.photos || []);

  // Campos avanzados opcionales (colapsados por defecto para rapidez en celular)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [chainagePk, setChainagePk] = useState(existingWaypoint?.chainagePk || '');
  const [diameter, setDiameter] = useState(existingWaypoint?.diameter || '');
  const [depthCover, setDepthCover] = useState(existingWaypoint?.depthCover || '');
  const [inspector, setInspector] = useState(existingWaypoint?.inspector || settings.defaultInspector);
  const [project, setProject] = useState(existingWaypoint?.project || settings.projectName);

  // Control de cámara y visualización
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [viewingPhoto, setViewingPhoto] = useState<StampedPhoto | null>(null);

  // Mini-mapa satelital interactivo de Google Maps
  const miniMapContainerRef = useRef<HTMLDivElement>(null);
  const miniMapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const utm = latLonToUTM(lat, lon);

  // Inicializar mini-mapa satelital de Google Maps
  useEffect(() => {
    if (!miniMapContainerRef.current) return;

    if (miniMapInstanceRef.current) {
      miniMapInstanceRef.current.remove();
      miniMapInstanceRef.current = null;
    }

    const map = L.map(miniMapContainerRef.current, {
      center: [lat, lon],
      zoom: 18,
      zoomControl: true,
      attributionControl: false,
    });

    // Capa Satélite Google Maps Híbrida (la más reciente con vías y relieve)
    L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      maxZoom: 21,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(map);

    // Marcador central en el punto
    const pinIcon = L.divIcon({
      html: `
        <div style="position:relative; width:30px; height:36px; transform:translate(-50%, -100%);">
          <svg viewBox="0 0 24 30" width="30" height="36" style="filter:drop-shadow(0 3px 6px rgba(0,0,0,0.7));">
            <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 18 12 18s12-9 12-18c0-6.627-5.373-12-12-12z" fill="#f59e0b" stroke="#ffffff" stroke-width="2"/>
            <circle cx="12" cy="11" r="4.5" fill="#09090b"/>
          </svg>
        </div>
      `,
      className: 'capture-pin',
      iconSize: [30, 36],
      iconAnchor: [15, 36],
    });

    const marker = L.marker([lat, lon], {
      icon: pinIcon,
      draggable: true,
    }).addTo(map);

    marker.on('dragend', () => {
      const newPos = marker.getLatLng();
      setLat(newPos.lat);
      setLon(newPos.lng);
    });

    markerRef.current = marker;
    miniMapInstanceRef.current = map;

    // Forzar redimensionado correcto
    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      map.remove();
      miniMapInstanceRef.current = null;
    };
  }, []);

  // Actualizar marcador si cambian lat/lon
  useEffect(() => {
    if (markerRef.current && miniMapInstanceRef.current) {
      markerRef.current.setLatLng([lat, lon]);
      miniMapInstanceRef.current.setView([lat, lon], miniMapInstanceRef.current.getZoom());
    }
  }, [lat, lon]);

  // Datos para pasar al estampador de cámara (sólo los 4 requeridos)
  const currentFormWaypoint: Partial<Waypoint> = {
    pointCode: pointName.trim() || 'PTO-000',
    name: pointName.trim(),
    project,
    category,
    chainagePk,
    diameter,
    depthCover,
    inspector,
    notes,
    latitude: lat,
    longitude: lon,
    altitude: alt,
    accuracy: acc,
    heading,
    utm,
    createdAt: existingWaypoint?.createdAt || new Date().toISOString(),
  };

  const handlePhotoCaptured = (stampedPhoto: StampedPhoto) => {
    setPhotos((prev) => [...prev, stampedPhoto]);
    setIsCameraOpen(false);
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalWaypoint: Waypoint = {
      id: existingWaypoint?.id || `wpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      pointCode: pointName.trim() || 'PTO-000',
      name: pointName.trim() || 'Punto GPS',
      project: project.trim() || settings.projectName,
      sector: '',
      category,
      condition: 'bueno',
      chainagePk: chainagePk.trim(),
      diameter: diameter.trim(),
      depthCover: depthCover.trim(),
      inspector: inspector.trim(),
      notes: notes.trim(),
      latitude: lat,
      longitude: lon,
      altitude: alt,
      accuracy: acc,
      heading,
      utm,
      createdAt: existingWaypoint?.createdAt || new Date().toISOString(),
      photos,
    };

    onSave(finalWaypoint);
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/85 flex items-center justify-center p-2 sm:p-4 backdrop-blur-md overflow-y-auto">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg max-h-[95vh] flex flex-col shadow-2xl text-stone-100 my-auto overflow-hidden">
          {/* Cabecera optimizada para teléfono */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800 bg-stone-950">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white leading-tight">
                  {existingWaypoint ? 'Editar Punto' : 'Toma de Punto GPS'}
                </h2>
                <div className="flex items-center gap-1.5 text-[11px] text-stone-400 font-mono">
                  <span className="text-emerald-400">● Satélite Activo</span>
                  <span>|</span>
                  <span className="text-amber-400">±{acc.toFixed(1)}m</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-stone-400 hover:text-white p-2 rounded-xl bg-stone-800/80 active:scale-95 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Formulario Scrolleable con campos amplios para celular */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* 1. VISOR SATELITAL DE GOOGLE MAPS (Imagen de Satélite más reciente) */}
            <div className="relative rounded-xl overflow-hidden border border-stone-700 bg-stone-950 shadow-md">
              <div className="h-44 w-full" ref={miniMapContainerRef} />
              
              {/* Overlay de telemetría sobre la imagen de satélite de Google */}
              <div className="absolute top-2 left-2 bg-stone-950/85 backdrop-blur px-2.5 py-1 rounded-md text-[10px] font-mono text-stone-300 border border-stone-800 flex items-center gap-1.5 z-[400]">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-white font-semibold">Google Maps Satélite</span>
              </div>

              <div className="absolute bottom-2 left-2 right-2 bg-stone-950/90 backdrop-blur px-3 py-1.5 rounded-lg text-[11px] font-mono text-stone-300 border border-stone-800 flex items-center justify-between z-[400]">
                <div>
                  <span className="text-stone-400">LAT/LON: </span>
                  <span className="text-cyan-300 font-bold">{lat.toFixed(6)}°, {lon.toFixed(6)}°</span>
                </div>
                <div className="text-amber-400 font-bold hidden sm:block">
                  {utm.formatted.split(' ')[0]} {utm.formatted.split(' ')[1]}
                </div>
              </div>
            </div>

            {/* 2. DATO 1: NOMBRE DEL PUNTO (Caja grande, muy visible y editable) */}
            <div>
              <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider mb-1.5">
                1. Nombre o Código del Punto *
              </label>
              <input
                type="text"
                required
                value={pointName}
                onChange={(e) => setPointName(e.target.value)}
                placeholder="ej. PTO-001 o Válvula de Entrada"
                className="w-full bg-stone-950 border-2 border-stone-700 focus:border-amber-500 rounded-xl px-4 py-3 text-base font-bold text-white placeholder-stone-600 focus:outline-none transition shadow-inner"
              />
            </div>

            {/* 3. DATO 2: TIPO DE ELEMENTO / INFRAESTRUCTURA (Botones táctiles grandes para pulsar con el dedo) */}
            <div>
              <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider mb-1.5">
                2. Tipo de Elemento / Infraestructura *
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'valvula', label: 'Válvula', desc: 'Control / Trampa' },
                  { id: 'tuberia', label: 'Tubería / Ducto', desc: 'Línea de flujo' },
                  { id: 'cruce', label: 'Cruce Especial', desc: 'Río / Quebrada / Vía' },
                  { id: 'poste_hito', label: 'Hito / Mojón BM', desc: 'Vértice topográfico' },
                  { id: 'obra_civil', label: 'Obra Civil', desc: 'Gavión / Muro / Zanja' },
                  { id: 'general', label: 'General / Otro', desc: 'Punto de control' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCategory(item.id as ElementCategory)}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-center active:scale-95 ${
                      category === item.id
                        ? 'bg-amber-600 border-amber-400 text-stone-950 font-bold shadow-lg shadow-amber-600/30'
                        : 'bg-stone-950/80 border-stone-800 text-stone-300 hover:bg-stone-800'
                    }`}
                  >
                    <span className="text-sm font-bold leading-tight">{item.label}</span>
                    <span className={`text-[10px] mt-0.5 ${category === item.id ? 'text-stone-900 font-medium' : 'text-stone-500'}`}>
                      {item.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. TOMA DE FOTOS CON COORDENADAS (Gran Botón Central) */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider">
                3. Fotografía Georeferenciada
              </label>

              {/* Botón grande para tomar foto desde el celular */}
              <button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 active:scale-95 text-stone-950 font-extrabold py-3.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2.5 shadow-xl transition"
              >
                <Camera className="w-5 h-5 stroke-[2.5]" />
                <span>TOMAR FOTO (Estampa 4 Datos)</span>
              </button>

              <p className="text-[11px] text-stone-400 text-center font-mono">
                La foto incluirá solo: <span className="text-amber-400 font-bold">Nombre</span>, <span className="text-amber-400 font-bold">Coordenadas</span>, <span className="text-amber-400 font-bold">Fecha/Hora</span> y <span className="text-amber-400 font-bold">Tipo de Elemento</span>
              </p>

              {/* Galería de fotos tomadas para este punto */}
              {photos.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {photos.map((photo, index) => (
                    <div
                      key={photo.id}
                      className="relative rounded-xl overflow-hidden border border-amber-500/40 bg-stone-950 shadow-md group"
                    >
                      <img
                        src={photo.dataUrl}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-28 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => setViewingPhoto(photo)}
                          className="p-2 bg-stone-800 text-white rounded-lg hover:bg-stone-700"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(photo.id)}
                          className="p-2 bg-rose-900 text-rose-200 rounded-lg hover:bg-rose-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="p-1 bg-stone-900 text-[10px] font-mono text-center text-amber-400 font-bold">
                        Foto #{index + 1} con Coordenadas
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 5. OBSERVACIONES Y DATOS DE CAMPO (Caja amplia) */}
            <div>
              <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                4. Observaciones de Campo
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Escribe aquí observaciones, accesos o detalles del elemento..."
                className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2.5 text-xs text-white placeholder-stone-600 focus:outline-none transition"
              />
            </div>

            {/* OPCIONAL: Plegable para detalles adicionales (No estorba en celular) */}
            <div className="border-t border-stone-800/80 pt-2">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center justify-between w-full text-xs text-stone-400 hover:text-stone-200 py-1"
              >
                <span>Más datos técnicos (PK, Diámetro, Inspector - Opcional)</span>
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showAdvanced && (
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-stone-800/60 text-xs">
                  <div>
                    <label className="block text-stone-400 mb-1">Abscisa / PK:</label>
                    <input
                      type="text"
                      value={chainagePk}
                      onChange={(e) => setChainagePk(e.target.value)}
                      placeholder="ej. K 04+200"
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-400 mb-1">Diámetro / Tamaño:</label>
                    <input
                      type="text"
                      value={diameter}
                      onChange={(e) => setDiameter(e.target.value)}
                      placeholder={'ej. 8" ANSI 600'}
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-400 mb-1">Profundidad Tapado:</label>
                    <input
                      type="text"
                      value={depthCover}
                      onChange={(e) => setDepthCover(e.target.value)}
                      placeholder="ej. 1.20 m"
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-400 mb-1">Inspector:</label>
                    <input
                      type="text"
                      value={inspector}
                      onChange={(e) => setInspector(e.target.value)}
                      placeholder="Nombre del técnico"
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-2 text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* BOTÓN INFERIOR GIGANTE DE GUARDADO PARA CELULAR */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-stone-950 font-extrabold py-3.5 px-4 rounded-xl text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition"
              >
                <Save className="w-5 h-5 stroke-[2.5]" />
                <span>GUARDAR PUNTO GPS</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de Cámara Topográfica en Vivo */}
      {isCameraOpen && (
        <CameraView
          waypoint={currentFormWaypoint}
          settings={settings}
          compassHeading={heading}
          onPhotoCaptured={handlePhotoCaptured}
          onClose={() => setIsCameraOpen(false)}
        />
      )}

      {/* Modal para ver foto en tamaño completo */}
      {viewingPhoto && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-3 select-none">
          <div className="relative max-w-2xl max-h-[90vh] flex flex-col items-center">
            <img
              src={viewingPhoto.dataUrl}
              alt="Foto estampada"
              className="max-h-[82vh] w-auto max-w-full rounded-xl border border-stone-700 shadow-2xl"
            />
            <button
              onClick={() => setViewingPhoto(null)}
              className="mt-3 bg-stone-800 hover:bg-stone-700 text-white px-5 py-2 rounded-xl text-xs font-bold"
            >
              Cerrar Vista Previa
            </button>
          </div>
        </div>
      )}
    </>
  );
};
