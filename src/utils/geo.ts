import { UTMCoordinates } from '../types';

/**
 * Convierte coordenadas geográficas WGS84 (Lat, Lon) a UTM (Universal Transverse Mercator)
 * Basado en las ecuaciones elipsoidales WGS84 estándar de la geodesia.
 */
export function latLonToUTM(lat: number, lon: number): UTMCoordinates {
  // Constantes del elipsoide WGS84
  const a = 6378137.0; // Semieje mayor (metros)
  const f = 1 / 298.257223563; // Achatamiento
  const e2 = 2 * f - f * f; // Primera excentricidad al cuadrado
  const ePrime2 = e2 / (1 - e2); // Segunda excentricidad al cuadrado
  const k0 = 0.9996; // Factor de escala en el meridiano central

  // Calcular zona UTM (1 a 60)
  let zone = Math.floor((lon + 180) / 6) + 1;
  if (zone > 60) zone = 60;
  if (zone < 1) zone = 1;

  // Manejo de zonas especiales (Noruega y Svalbard si aplica)
  if (lat >= 56.0 && lat < 64.0 && lon >= 3.0 && lon < 12.0) {
    zone = 32;
  }
  if (lat >= 72.0 && lat < 84.0) {
    if (lon >= 0.0 && lon < 9.0) zone = 31;
    else if (lon >= 9.0 && lon < 21.0) zone = 33;
    else if (lon >= 21.0 && lon < 33.0) zone = 35;
    else if (lon >= 33.0 && lon < 42.0) zone = 37;
  }

  const hemisphere: 'N' | 'S' = lat >= 0 ? 'N' : 'S';

  // Meridiano central de la zona en radianes
  const lonOrigin = (zone - 1) * 6 - 180 + 3;
  const lonOriginRad = (lonOrigin * Math.PI) / 180.0;

  const latRad = (lat * Math.PI) / 180.0;
  const lonRad = (lon * Math.PI) / 180.0;

  const N = a / Math.sqrt(1 - e2 * Math.sin(latRad) * Math.sin(latRad));
  const T = Math.tan(latRad) * Math.tan(latRad);
  const C = ePrime2 * Math.cos(latRad) * Math.cos(latRad);
  const A = Math.cos(latRad) * (lonRad - lonOriginRad);

  // Arco meridiano M
  const M =
    a *
    ((1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 * e2 * e2) / 256) * latRad -
      ((3 * e2) / 8 + (3 * e2 * e2) / 32 + (45 * e2 * e2 * e2) / 1024) * Math.sin(2 * latRad) +
      ((15 * e2 * e2) / 256 + (45 * e2 * e2 * e2) / 1024) * Math.sin(4 * latRad) -
      ((35 * e2 * e2 * e2) / 3072) * Math.sin(6 * latRad));

  // Coordenada Este (X)
  const easting =
    k0 *
      N *
      (A +
        ((1 - T + C) * Math.pow(A, 3)) / 6 +
        ((5 - 18 * T + T * T + 72 * C - 58 * ePrime2) * Math.pow(A, 5)) / 120) +
    500000.0; // Falso este

  // Coordenada Norte (Y)
  let northing =
    k0 *
    (M +
      N *
        Math.tan(latRad) *
        ((A * A) / 2 +
          ((5 - T + 9 * C + 4 * C * C) * Math.pow(A, 4)) / 24 +
          ((61 - 58 * T + T * T + 600 * C - 330 * ePrime2) * Math.pow(A, 6)) / 720));

  if (lat < 0) {
    northing += 10000000.0; // Falso norte para hemisferio sur
  }

  const roundedEasting = Math.round(easting * 100) / 100;
  const roundedNorthing = Math.round(northing * 100) / 100;

  return {
    zone,
    hemisphere,
    easting: roundedEasting,
    northing: roundedNorthing,
    formatted: `UTM ${zone}${hemisphere} E:${roundedEasting.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} N:${roundedNorthing.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}`,
  };
}

/**
 * Convierte grados decimales a Grados, Minutos, Segundos (DMS)
 */
export function formatDMS(deg: number, isLatitude: boolean): string {
  const absolute = Math.abs(deg);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(1);

  let direction = '';
  if (isLatitude) {
    direction = deg >= 0 ? 'N' : 'S';
  } else {
    direction = deg >= 0 ? 'E' : 'W';
  }

  return `${degrees}°${minutes}'${seconds}"${direction}`;
}

/**
 * Formato completo Lat/Lon en DMS
 */
export function formatFullDMS(lat: number, lon: number): string {
  return `${formatDMS(lat, true)} ${formatDMS(lon, false)}`;
}

/**
 * Convierte rumbo / azimut a dirección cardinal (N, NNE, NE, etc.)
 */
export function degreesToCardinal(deg: number | null): string {
  if (deg === null || isNaN(deg)) return '---';
  const val = (deg + 360) % 360;
  const directions = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
  ];
  const index = Math.round(val / 22.5) % 16;
  return `${Math.round(val)}° ${directions[index]}`;
}

/**
 * Calcula la distancia Haversine entre dos puntos en metros
 */
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Estado y color de precisión GPS para el campo
 */
export function getAccuracyStatus(accuracy: number): {
  label: string;
  colorClass: string;
  badgeBg: string;
  iconColor: string;
} {
  if (accuracy <= 3) {
    return {
      label: 'Excelente (Sub-métrica)',
      colorClass: 'text-emerald-400',
      badgeBg: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300',
      iconColor: '#10b981',
    };
  } else if (accuracy <= 8) {
    return {
      label: 'Buena (Topografía)',
      colorClass: 'text-teal-400',
      badgeBg: 'bg-teal-950/80 border-teal-500/50 text-teal-300',
      iconColor: '#14b8a6',
    };
  } else if (accuracy <= 15) {
    return {
      label: 'Aceptable (Campo)',
      colorClass: 'text-amber-400',
      badgeBg: 'bg-amber-950/80 border-amber-500/50 text-amber-300',
      iconColor: '#f59e0b',
    };
  } else {
    return {
      label: 'Baja Precisión (Esperar señal)',
      colorClass: 'text-rose-400',
      badgeBg: 'bg-rose-950/80 border-rose-500/50 text-rose-300',
      iconColor: '#f43f5e',
    };
  }
}
