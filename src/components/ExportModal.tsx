import React, { useState } from 'react';
import { Waypoint } from '../types';
import { exportToCSV, exportToKML, exportToGeoJSON, exportToZipWithPhotos } from '../utils/exporters';
import {
  FileSpreadsheet,
  Globe,
  Archive,
  Download,
  Upload,
  CheckCircle,
  X,
  FileCode,
  HardDrive,
  RefreshCw,
} from 'lucide-react';

interface ExportModalProps {
  waypoints: Waypoint[];
  onImportWaypoints: (imported: Waypoint[]) => void;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  waypoints,
  onImportWaypoints,
  onClose,
}) => {
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [zipStatusText, setZipStatusText] = useState('');
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  const totalPhotos = waypoints.reduce((acc, w) => acc + (w.photos?.length || 0), 0);

  const handleExportCSV = () => {
    const filename = `Levantamiento_GPS_${new Date().toISOString().slice(0, 10)}.csv`;
    exportToCSV(waypoints, filename);
  };

  const handleExportKML = () => {
    const filename = `Levantamiento_GPS_${new Date().toISOString().slice(0, 10)}.kml`;
    exportToKML(waypoints, filename);
  };

  const handleExportGeoJSON = () => {
    const filename = `Levantamiento_GPS_${new Date().toISOString().slice(0, 10)}.geojson`;
    exportToGeoJSON(waypoints, filename);
  };

  const handleExportZip = async () => {
    try {
      setIsExportingZip(true);
      setZipProgress(5);
      setZipStatusText('Iniciando empaquetado de fotos y datos...');
      const zipName = `Levantamiento_GPS_Fotos_Georeferenciadas_${new Date().toISOString().slice(0, 10)}.zip`;

      await exportToZipWithPhotos(
        waypoints,
        (percent, status) => {
          setZipProgress(percent);
          setZipStatusText(status);
        },
        zipName
      );
    } catch (err) {
      console.error(err);
      alert('Error generando el archivo ZIP.');
    } finally {
      setIsExportingZip(false);
    }
  };

  // Importar archivo GeoJSON
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (parsed.type === 'FeatureCollection' && Array.isArray(parsed.features)) {
          const imported: Waypoint[] = parsed.features.map((f: any, idx: number) => {
            const coords = f.geometry?.coordinates || [0, 0, 0];
            const props = f.properties || {};

            return {
              id: props.id || `imp_${Date.now()}_${idx}`,
              pointCode: props.pointCode || `IMP-${idx + 1}`,
              name: props.name || `Punto ${idx + 1}`,
              project: props.project || 'Proyecto Importado',
              sector: props.sector || '',
              category: props.category || 'general',
              condition: props.condition || 'bueno',
              chainagePk: props.chainagePk || '',
              diameter: props.diameter || '',
              depthCover: props.depthCover || '',
              inspector: props.inspector || 'Inspector',
              notes: props.notes || '',
              longitude: coords[0],
              latitude: coords[1],
              altitude: coords[2] || 0,
              accuracy: props.accuracy || 3.0,
              heading: props.heading || 0,
              utm: {
                zone: props.utmZone || 18,
                hemisphere: props.utmHemisphere || 'N',
                easting: props.utmEasting || 500000,
                northing: props.utmNorthing || 500000,
                formatted: `UTM ${props.utmZone || 18} E:${props.utmEasting || 0} N:${props.utmNorthing || 0}`,
              },
              createdAt: props.createdAt || new Date().toISOString(),
              photos: [],
            };
          });

          onImportWaypoints(imported);
          setImportSuccessMsg(`Se importaron exitosamente ${imported.length} puntos.`);
          setTimeout(() => setImportSuccessMsg(null), 4000);
        } else {
          alert('Formato de archivo inválido. Sube un archivo GeoJSON válido.');
        }
      } catch (err) {
        alert('Error leyendo el archivo JSON.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 backdrop-blur-sm">
      <div className="bg-stone-900 border border-stone-800 rounded-xl max-w-xl w-full p-5 shadow-2xl text-stone-200 space-y-5">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">
              Exportar e Importar Levantamiento
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen actual */}
        <div className="bg-stone-950 p-3 rounded-lg border border-stone-800 flex items-center justify-between text-xs font-mono">
          <div>
            <span className="text-stone-500">Total Puntos: </span>
            <span className="text-amber-400 font-bold">{waypoints.length}</span>
          </div>
          <div>
            <span className="text-stone-500">Fotos Estampadas: </span>
            <span className="text-cyan-400 font-bold">{totalPhotos}</span>
          </div>
          <div>
            <span className="text-stone-500">Formato: </span>
            <span className="text-emerald-400 font-bold">WGS84 / UTM</span>
          </div>
        </div>

        {/* Opciones de Exportación */}
        <div className="space-y-2.5">
          {/* Opción 1: ZIP Completo con Fotos */}
          <div className="p-3.5 bg-stone-950/80 border border-amber-500/30 hover:border-amber-500/60 rounded-xl transition flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-lg">
                <Archive className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  Paquete ZIP Completo (Recomendado)
                  <span className="bg-amber-600 text-stone-950 text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase">Pro</span>
                </h4>
                <p className="text-[11px] text-stone-400">
                  Descarga archivo ZIP con el CSV de datos y todas las fotos estampadas en alta resolución con coordenadas
                </p>
              </div>
            </div>

            <button
              onClick={handleExportZip}
              disabled={isExportingZip || waypoints.length === 0}
              className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition flex-shrink-0 disabled:opacity-50"
            >
              {isExportingZip ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Descargar ZIP</span>
            </button>
          </div>

          {/* Barra de progreso de compresión ZIP */}
          {isExportingZip && (
            <div className="bg-stone-950 p-3 rounded-lg border border-amber-500/40 text-xs font-mono space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-amber-400">{zipStatusText}</span>
                <span className="text-stone-300 font-bold">{zipProgress}%</span>
              </div>
              <div className="w-full bg-stone-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-500 h-full transition-all duration-300"
                  style={{ width: `${zipProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Opción 2: Excel / CSV */}
          <div className="p-3 bg-stone-950/60 border border-stone-800 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Excel / CSV (Delimitado)</h4>
                <p className="text-[11px] text-stone-400">
                  Archivo de cálculo con UTM, WGS84, PK, atributos técnicos y notas
                </p>
              </div>
            </div>

            <button
              onClick={handleExportCSV}
              disabled={waypoints.length === 0}
              className="bg-stone-800 hover:bg-stone-700 text-stone-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          </div>

          {/* Opción 3: KML Google Earth */}
          <div className="p-3 bg-stone-950/60 border border-stone-800 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Google Earth (KML 3D)</h4>
                <p className="text-[11px] text-stone-400">
                  Placemarks con elevación, ficha emergente HTML y miniatura de fotos
                </p>
              </div>
            </div>

            <button
              onClick={handleExportKML}
              disabled={waypoints.length === 0}
              className="bg-stone-800 hover:bg-stone-700 text-stone-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> KML
            </button>
          </div>

          {/* Opción 4: GeoJSON GIS */}
          <div className="p-3 bg-stone-950/60 border border-stone-800 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">GeoJSON (ArcGIS / QGIS)</h4>
                <p className="text-[11px] text-stone-400">
                  Capa vectorial estándar con todos los atributos geográficos
                </p>
              </div>
            </div>

            <button
              onClick={handleExportGeoJSON}
              disabled={waypoints.length === 0}
              className="bg-stone-800 hover:bg-stone-700 text-stone-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> GeoJSON
            </button>
          </div>
        </div>

        {/* Sección de Importación */}
        <div className="border-t border-stone-800 pt-3">
          <label className="text-xs font-semibold text-stone-400 block mb-2">
            Importar Puntos Previos (GeoJSON):
          </label>
          <label className="flex items-center justify-center gap-2 border border-dashed border-stone-700 hover:border-amber-500 bg-stone-950 p-2.5 rounded-lg cursor-pointer text-xs text-stone-300 transition">
            <Upload className="w-4 h-4 text-amber-400" />
            <span>Seleccionar archivo GeoJSON para importar</span>
            <input
              type="file"
              accept=".geojson,.json"
              onChange={handleFileImport}
              className="hidden"
            />
          </label>
          {importSuccessMsg && (
            <p className="text-emerald-400 text-xs mt-2 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> {importSuccessMsg}
            </p>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="bg-stone-800 hover:bg-stone-700 text-stone-300 px-4 py-2 rounded-lg text-xs font-semibold transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
