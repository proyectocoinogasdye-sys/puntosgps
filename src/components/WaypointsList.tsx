import React, { useState } from 'react';
import { Waypoint, ElementCategory, StampedPhoto } from '../types';
import {
  Search,
  Filter,
  Camera,
  MapPin,
  Trash2,
  Edit2,
  Eye,
  Download,
  Calendar,
  Layers,
  FileSpreadsheet,
  CheckCircle,
  ExternalLink,
  X,
} from 'lucide-react';
import { formatFullDMS } from '../utils/geo';

interface WaypointsListProps {
  waypoints: Waypoint[];
  onSelectWaypoint: (waypoint: Waypoint) => void;
  onEditWaypoint: (waypoint: Waypoint) => void;
  onDeleteWaypoint: (id: string) => void;
  onViewOnMap: (waypoint: Waypoint) => void;
}

export const WaypointsList: React.FC<WaypointsListProps> = ({
  waypoints,
  onSelectWaypoint,
  onEditWaypoint,
  onDeleteWaypoint,
  onViewOnMap,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<StampedPhoto | null>(null);
  const [activeWaypointDetail, setActiveWaypointDetail] = useState<Waypoint | null>(null);

  // Filtrado de puntos
  const filteredWaypoints = waypoints.filter((w) => {
    const matchesSearch =
      w.pointCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.chainagePk && w.chainagePk.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (w.notes && w.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = filterCategory === 'all' || w.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  const handleDownloadPhoto = (photo: StampedPhoto, pointCode: string) => {
    const a = document.createElement('a');
    a.href = photo.dataUrl;
    a.download = `${pointCode}_foto_georeferenciada.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex-1 flex flex-col bg-stone-950 text-stone-200 overflow-hidden">
      {/* Barra superior de Búsqueda y Filtros */}
      <div className="p-4 bg-stone-900 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código (PTO-001), PK, proyecto o notas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-stone-400" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Todas las Categorías</option>
              <option value="valvula">Válvulas</option>
              <option value="tuberia">Tuberías / Ductos</option>
              <option value="cruce">Cruces Especiales</option>
              <option value="poste_hito">Hitos / Mojones BM</option>
              <option value="obra_civil">Obras Civiles</option>
              <option value="soldadura">Juntas / Soldaduras</option>
              <option value="geotecnia">Geotecnia / Taludes</option>
              <option value="ambiental">Ambiental</option>
              <option value="servidumbre">Servidumbres</option>
            </select>
          </div>
        </div>

        <div className="text-xs font-mono text-stone-400">
          Mostrando <span className="text-amber-400 font-bold">{filteredWaypoints.length}</span> de{' '}
          <span className="text-stone-300">{waypoints.length}</span> puntos
        </div>
      </div>

      {/* Contenido: Listado de Puntos */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredWaypoints.length === 0 ? (
          <div className="text-center py-16 text-stone-500">
            <MapPin className="w-12 h-12 mx-auto mb-3 stroke-1 opacity-50" />
            <p className="text-sm font-semibold">No se encontraron puntos</p>
            <p className="text-xs mt-1">
              {waypoints.length === 0
                ? 'Aún no has registrado ningún punto. Haz clic en "Marcar Punto" para comenzar el levantamiento.'
                : 'Intenta con otro término de búsqueda o limpia los filtros.'}
            </p>
          </div>
        ) : (
          filteredWaypoints.map((w) => {
            const hasPhotos = w.photos && w.photos.length > 0;

            return (
              <div
                key={w.id}
                className="bg-stone-900/90 border border-stone-800 hover:border-stone-700 rounded-xl p-3.5 transition shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                {/* Miniatura de la foto estampada */}
                <div className="flex items-center gap-3">
                  <div
                    onClick={() => hasPhotos && setSelectedPhotoModal(w.photos[0])}
                    className={`relative w-20 h-20 rounded-lg overflow-hidden border ${
                      hasPhotos ? 'border-amber-500/40 cursor-pointer group' : 'border-stone-800 bg-stone-950 flex items-center justify-center'
                    } flex-shrink-0`}
                  >
                    {hasPhotos ? (
                      <>
                        <img
                          src={w.photos[0].dataUrl}
                          alt={w.pointCode}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <Eye className="w-4 h-4 text-white" />
                        </div>
                        {w.photos.length > 1 && (
                          <span className="absolute bottom-1 right-1 bg-black/80 text-amber-400 text-[9px] font-mono font-bold px-1 rounded">
                            +{w.photos.length - 1}
                          </span>
                        )}
                      </>
                    ) : (
                      <Camera className="w-6 h-6 text-stone-700" />
                    )}
                  </div>

                  {/* Información del punto */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-amber-400 bg-stone-950 px-2 py-0.5 rounded border border-stone-800">
                        {w.pointCode}
                      </span>
                      <span className="text-stone-300 text-xs font-semibold">
                        {w.name || w.category.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-stone-800 text-stone-400">
                        {w.category}
                      </span>
                      {w.condition && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase ${
                          w.condition === 'critico' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                          w.condition === 'malo' ? 'bg-orange-950 text-orange-400' :
                          'bg-emerald-950 text-emerald-400'
                        }`}>
                          {w.condition}
                        </span>
                      )}
                    </div>

                    <div className="text-xs font-mono text-stone-400 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      <span className="text-stone-300">
                        LAT: {w.latitude.toFixed(6)}° | LON: {w.longitude.toFixed(6)}°
                      </span>
                      <span className="text-amber-400/90 font-medium">
                        {w.utm.formatted}
                      </span>
                    </div>

                    <div className="text-[11px] text-stone-500 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      {w.chainagePk && (
                        <span className="text-stone-300 font-mono font-semibold">PK: {w.chainagePk}</span>
                      )}
                      <span>Elev: {w.altitude ? `${Math.round(w.altitude)}m` : '---'}</span>
                      <span>Prec: ±{w.accuracy ? w.accuracy.toFixed(1) : ''}m</span>
                      <span>{new Date(w.createdAt).toLocaleDateString('es-ES')}</span>
                    </div>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex items-center gap-2 ml-auto w-full md:w-auto justify-end border-t md:border-t-0 pt-2 md:pt-0 border-stone-800">
                  <button
                    onClick={() => onViewOnMap(w)}
                    title="Ver en el Mapa"
                    className="flex items-center gap-1 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-medium transition"
                  >
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Mapa</span>
                  </button>

                  <button
                    onClick={() => setActiveWaypointDetail(w)}
                    title="Ver Ficha Técnica Completa"
                    className="flex items-center gap-1 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-medium transition"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ficha</span>
                  </button>

                  <button
                    onClick={() => onEditWaypoint(w)}
                    title="Editar datos"
                    className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-lg text-xs transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar el punto ${w.pointCode}?`)) {
                        onDeleteWaypoint(w.id);
                      }
                    }}
                    title="Eliminar punto"
                    className="p-1.5 bg-stone-800 hover:bg-rose-950 text-stone-400 hover:text-rose-300 rounded-lg text-xs transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Detalle de Ficha Técnica Completa */}
      {activeWaypointDetail && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 backdrop-blur-sm overflow-y-auto">
          <div className="bg-stone-900 border border-stone-700 rounded-xl max-w-2xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold bg-amber-600 text-stone-950 px-2.5 py-1 rounded">
                  {activeWaypointDetail.pointCode}
                </span>
                <h3 className="font-bold text-white text-base">
                  {activeWaypointDetail.name}
                </h3>
              </div>
              <button
                onClick={() => setActiveWaypointDetail(null)}
                className="text-stone-400 hover:text-white p-1 rounded hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Galería de fotos con coordenadas estampadas */}
            {activeWaypointDetail.photos && activeWaypointDetail.photos.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-amber-400 uppercase font-mono mb-2">
                  Fotografías con Sello Topográfico ({activeWaypointDetail.photos.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeWaypointDetail.photos.map((p, i) => (
                    <div key={p.id} className="bg-stone-950 rounded-lg p-2 border border-stone-800">
                      <img
                        src={p.dataUrl}
                        alt="Foto estampada"
                        className="w-full h-44 object-cover rounded cursor-pointer"
                        onClick={() => setSelectedPhotoModal(p)}
                      />
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-stone-800/80 text-[11px]">
                        <span className="text-stone-400 font-mono">Foto #{i + 1}</span>
                        <button
                          onClick={() => handleDownloadPhoto(p, activeWaypointDetail.pointCode)}
                          className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-medium"
                        >
                          <Download className="w-3.5 h-3.5" /> Descargar JPG
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ficha técnica de atributos */}
            <div className="bg-stone-950 p-4 rounded-lg border border-stone-800 text-xs space-y-2 font-mono">
              <div className="grid grid-cols-2 gap-2 text-stone-300">
                <div><span className="text-stone-500 font-sans">Proyecto:</span> {activeWaypointDetail.project}</div>
                <div><span className="text-stone-500 font-sans">Categoría:</span> {activeWaypointDetail.category.toUpperCase()}</div>
                <div><span className="text-stone-500 font-sans">Abscisa (PK):</span> {activeWaypointDetail.chainagePk || 'N/A'}</div>
                <div><span className="text-stone-500 font-sans">Estado:</span> {activeWaypointDetail.condition.toUpperCase()}</div>
                <div><span className="text-stone-500 font-sans">Diámetro:</span> {activeWaypointDetail.diameter || 'N/A'}</div>
                <div><span className="text-stone-500 font-sans">Profundidad:</span> {activeWaypointDetail.depthCover || 'N/A'}</div>
                <div><span className="text-stone-500 font-sans">Inspector:</span> {activeWaypointDetail.inspector}</div>
                <div><span className="text-stone-500 font-sans">Fecha:</span> {new Date(activeWaypointDetail.createdAt).toLocaleString('es-ES')}</div>
              </div>

              <div className="border-t border-stone-800 pt-2 text-stone-200">
                <div className="text-cyan-400 font-bold">WGS84: {activeWaypointDetail.latitude.toFixed(6)}°, {activeWaypointDetail.longitude.toFixed(6)}°</div>
                <div className="text-stone-400">{formatFullDMS(activeWaypointDetail.latitude, activeWaypointDetail.longitude)}</div>
                <div className="text-amber-400 font-bold">{activeWaypointDetail.utm.formatted}</div>
                <div className="text-stone-400">Elevación: {activeWaypointDetail.altitude ? `${activeWaypointDetail.altitude.toFixed(1)} m.s.n.m.` : '---'} | Error GPS: ±{activeWaypointDetail.accuracy.toFixed(1)}m</div>
              </div>

              {activeWaypointDetail.notes && (
                <div className="border-t border-stone-800 pt-2">
                  <span className="text-stone-500 font-sans block mb-1">Observaciones:</span>
                  <p className="font-sans text-stone-300 italic bg-stone-900 p-2 rounded">
                    "{activeWaypointDetail.notes}"
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  onViewOnMap(activeWaypointDetail);
                  setActiveWaypointDetail(null);
                }}
                className="bg-stone-800 hover:bg-stone-700 text-stone-200 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <MapPin className="w-4 h-4 text-cyan-400" /> Ver en Mapa
              </button>
              <button
                onClick={() => setActiveWaypointDetail(null)}
                className="bg-amber-600 hover:bg-amber-500 text-stone-950 px-4 py-2 rounded-lg text-xs font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de visualización de foto a tamaño completo con zoom */}
      {selectedPhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-3 select-none">
          <div className="relative max-w-4xl max-h-[92vh] flex flex-col items-center">
            <img
              src={selectedPhotoModal.dataUrl}
              alt="Foto estampada"
              className="max-h-[82vh] w-auto max-w-full rounded-lg shadow-2xl border border-stone-800"
            />
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={() => handleDownloadPhoto(selectedPhotoModal, 'FOTO_GPS')}
                className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition"
              >
                <Download className="w-4 h-4" /> Descargar Imagen con Estampa JPG
              </button>
              <button
                onClick={() => setSelectedPhotoModal(null)}
                className="bg-stone-800 hover:bg-stone-700 text-white px-4 py-2 rounded-lg text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
