import React from 'react';
import { GPSReading } from '../types';
import { getAccuracyStatus, degreesToCardinal } from '../utils/geo';
import { Compass, Crosshair, MapPin, Satellite, RefreshCw, Copy, Check } from 'lucide-react';

interface GPSTrackerBarProps {
  gps: GPSReading | null;
  compassHeading: number | null;
  isAveraging: boolean;
  averageCount: number;
  onStartAveraging: () => void;
  onCaptureClick: () => void;
  error?: string | null;
}

export const GPSTrackerBar: React.FC<GPSTrackerBarProps> = ({
  gps,
  compassHeading,
  isAveraging,
  averageCount,
  onStartAveraging,
  onCaptureClick,
  error,
}) => {
  const [copied, setCopied] = React.useState(false);

  const accuracyInfo = gps ? getAccuracyStatus(gps.accuracy) : null;
  const headingText = degreesToCardinal(compassHeading);

  const handleCopyCoords = () => {
    if (!gps) return;
    const text = `${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)} | ${gps.utm?.formatted}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-stone-900/95 border-b border-stone-800 text-stone-200 px-3 py-2.5 shadow-lg backdrop-blur select-none">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Bloque Izquierdo: Coordenadas y Telemetría */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {/* Estado de Señal Satelital */}
          <div className="flex items-center gap-1.5 bg-stone-950/80 px-2.5 py-1 rounded border border-stone-800 font-mono text-xs">
            <Satellite
              className={`w-3.5 h-3.5 ${
                gps ? 'text-emerald-400 animate-pulse' : 'text-stone-500'
              }`}
            />
            <span className="text-stone-400 font-sans text-[11px]">GNSS:</span>
            {accuracyInfo ? (
              <span className={`font-semibold ${accuracyInfo.colorClass}`}>
                ±{gps?.accuracy.toFixed(1)}m
              </span>
            ) : (
              <span className="text-amber-400">Buscando...</span>
            )}
          </div>

          {/* Coordenadas Lat/Lon WGS84 */}
          {gps ? (
            <div className="flex items-center gap-2">
              <div className="font-mono text-xs tracking-tight">
                <span className="text-stone-400 mr-1">LAT:</span>
                <span className="text-white font-semibold">
                  {gps.latitude.toFixed(6)}°
                </span>
                <span className="text-stone-400 mx-1.5">|</span>
                <span className="text-stone-400 mr-1">LON:</span>
                <span className="text-white font-semibold">
                  {gps.longitude.toFixed(6)}°
                </span>
              </div>
              <button
                onClick={handleCopyCoords}
                title="Copiar coordenadas"
                className="text-stone-400 hover:text-amber-400 p-0.5 rounded transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          ) : (
            <span className="text-stone-500 text-xs italic">
              {error || 'Esperando posición satelital...'}
            </span>
          )}

          {/* Coordenadas UTM Geodésicas */}
          {gps?.utm && (
            <div className="hidden md:flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[11px] font-mono text-amber-300">
              <span className="font-bold text-amber-400">UTM {gps.utm.zone}{gps.utm.hemisphere}:</span>
              <span>X: {gps.utm.easting.toLocaleString('es-ES', { maximumFractionDigits: 1 })}m</span>
              <span className="text-stone-500">·</span>
              <span>Y: {gps.utm.northing.toLocaleString('es-ES', { maximumFractionDigits: 1 })}m</span>
            </div>
          )}

          {/* Elevación y Brújula */}
          {gps && (
            <div className="hidden sm:flex items-center gap-3 text-xs font-mono text-stone-300">
              <div className="flex items-center gap-1">
                <span className="text-stone-500">ALT:</span>
                <span className="text-stone-200">
                  {gps.altitude ? `${Math.round(gps.altitude)} m` : '---'}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-stone-300 font-mono text-xs">{headingText}</span>
              </div>
            </div>
          )}
        </div>

        {/* Bloque Derecho: Acciones de Campo Rápidas */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Botón Promediar */}
          <button
            onClick={onStartAveraging}
            disabled={isAveraging || !gps}
            title="Promedia 10 lecturas satelitales para mayor precisión topográfica"
            className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded font-mono border transition ${
              isAveraging
                ? 'bg-amber-950 border-amber-600 text-amber-300 animate-pulse'
                : 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-300'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAveraging ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {isAveraging ? `Muestreo ${averageCount}/10` : 'Promediar GPS'}
            </span>
          </button>

          {/* Botón Principal: TOMAR PUNTO GPS */}
          <button
            onClick={onCaptureClick}
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 active:scale-95 text-stone-950 font-bold px-3.5 py-1.5 rounded shadow-md text-xs uppercase tracking-wide transition font-sans"
          >
            <Crosshair className="w-4 h-4 stroke-[2.5]" />
            <span>Marcar Punto</span>
          </button>
        </div>
      </div>
    </div>
  );
};
