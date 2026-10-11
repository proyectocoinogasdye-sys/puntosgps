import { Waypoint } from '../types';
import { formatDMS } from './geo';
import JSZip from 'jszip';

/**
 * Genera y descarga un archivo CSV compatible con Excel en español
 */
export function exportToCSV(waypoints: Waypoint[], filename = 'levantamiento_gps.csv') {
  if (waypoints.length === 0) return;

  const headers = [
    'Codigo_Punto',
    'Nombre',
    'Proyecto',
    'Sector',
    'Categoria',
    'Estado',
    'Progresiva_PK',
    'Diametro',
    'Profundidad_m',
    'Inspector',
    'Latitud_WGS84',
    'Longitud_WGS84',
    'Latitud_DMS',
    'Longitud_DMS',
    'UTM_Zona',
    'UTM_Hemisferio',
    'UTM_Este_X',
    'UTM_Norte_Y',
    'Altitud_msnm',
    'Precision_m',
    'Rumbo_Azimut',
    'Fecha_Hora',
    'Observaciones',
    'Fotos_Adjuntas',
  ];

  const escapeCSV = (value: any) => {
    if (value === null || value === undefined) return '';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = waypoints.map((w) => {
    return [
      escapeCSV(w.pointCode),
      escapeCSV(w.name),
      escapeCSV(w.project),
      escapeCSV(w.sector || ''),
      escapeCSV(w.category),
      escapeCSV(w.condition),
      escapeCSV(w.chainagePk || ''),
      escapeCSV(w.diameter || ''),
      escapeCSV(w.depthCover || ''),
      escapeCSV(w.inspector),
      escapeCSV(w.latitude),
      escapeCSV(w.longitude),
      escapeCSV(formatDMS(w.latitude, true)),
      escapeCSV(formatDMS(w.longitude, false)),
      escapeCSV(w.utm.zone),
      escapeCSV(w.utm.hemisphere),
      escapeCSV(w.utm.easting),
      escapeCSV(w.utm.northing),
      escapeCSV(w.altitude ?? ''),
      escapeCSV(w.accuracy ?? ''),
      escapeCSV(w.heading ?? ''),
      escapeCSV(w.createdAt),
      escapeCSV(w.notes),
      escapeCSV(w.photos ? w.photos.length : 0),
    ].join(';'); // Delimitador punto y coma estándar para Excel en español / Europa / LatAm
  });

  // Agregar BOM UTF-8 (\uFEFF) para que Excel reconozca tildes y caracteres especiales
  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

/**
 * Genera el string XML KML para Google Earth
 */
export function generateKMLString(waypoints: Waypoint[]): string {
  const placemarks = waypoints.map((w) => {
    const lat = w.latitude;
    const lon = w.longitude;
    const alt = w.altitude ?? 0;
    const desc = `
      <![CDATA[
        <div style="font-family:sans-serif; font-size:13px; line-height:1.5;">
          <h3 style="color:#d97706; margin-bottom:4px;">[${escapeXml(w.pointCode)}] ${escapeXml(w.name || w.category)}</h3>
          <p><b>Proyecto:</b> ${escapeXml(w.project)}</p>
          <p><b>Categoría:</b> ${escapeXml(w.category)}</p>
          <p><b>Estado:</b> ${escapeXml(w.condition)}</p>
          ${w.chainagePk ? `<p><b>Progresiva (PK):</b> ${escapeXml(w.chainagePk)}</p>` : ''}
          ${w.diameter ? `<p><b>Diámetro:</b> ${escapeXml(w.diameter)}</p>` : ''}
          ${w.depthCover ? `<p><b>Profundidad:</b> ${escapeXml(w.depthCover)}</p>` : ''}
          <p><b>Inspector:</b> ${escapeXml(w.inspector)}</p>
          <hr/>
          <p><b>Coordenadas WGS84:</b> ${lat.toFixed(6)}, ${lon.toFixed(6)}</p>
          <p><b>UTM:</b> ${escapeXml(w.utm.formatted)}</p>
          <p><b>Altitud:</b> ${alt.toFixed(1)} m.s.n.m.</p>
          <p><b>Precisión GPS:</b> ±${w.accuracy ? w.accuracy.toFixed(1) : '---'} m</p>
          <p><b>Fecha:</b> ${w.createdAt}</p>
          ${w.notes ? `<p><b>Observaciones:</b> <i>${escapeXml(w.notes)}</i></p>` : ''}
          ${
            w.photos && w.photos.length > 0
              ? `<div style="margin-top:8px;"><b>Foto con coordenadas estampadas:</b><br/><img src="${w.photos[0].dataUrl}" style="max-width:320px; border-radius:4px; margin-top:4px;" /></div>`
              : ''
          }
        </div>
      ]]>
    `.trim();

    return `
    <Placemark>
      <name>${escapeXml(w.pointCode)} - ${escapeXml(w.name || w.category)}</name>
      <description>${desc}</description>
      <Point>
        <coordinates>${lon},${lat},${alt}</coordinates>
      </Point>
    </Placemark>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Levantamiento GPS BackCountry Pro</name>
    <description>Puntos de campo georeferenciados con telemetría técnica</description>
    ${placemarks}
  </Document>
</kml>`;
}

/**
 * Genera y descarga un archivo KML para Google Earth
 */
export function exportToKML(waypoints: Waypoint[], filename = 'levantamiento_gps.kml') {
  const kmlContent = generateKMLString(waypoints);
  const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml;charset=utf-8;' });
  downloadBlob(blob, filename);
}

/**
 * Genera y descarga un archivo GeoJSON estándar GIS
 */
export function exportToGeoJSON(waypoints: Waypoint[], filename = 'levantamiento_gps.geojson') {
  const features = waypoints.map((w) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [w.longitude, w.latitude, w.altitude ?? 0],
    },
    properties: {
      id: w.id,
      pointCode: w.pointCode,
      name: w.name,
      project: w.project,
      sector: w.sector,
      category: w.category,
      condition: w.condition,
      chainagePk: w.chainagePk,
      diameter: w.diameter,
      depthCover: w.depthCover,
      inspector: w.inspector,
      notes: w.notes,
      altitude: w.altitude,
      accuracy: w.accuracy,
      heading: w.heading,
      utmZone: w.utm.zone,
      utmHemisphere: w.utm.hemisphere,
      utmEasting: w.utm.easting,
      utmNorthing: w.utm.northing,
      createdAt: w.createdAt,
      photoCount: w.photos?.length || 0,
    },
  }));

  const geojson = {
    type: 'FeatureCollection',
    name: 'Levantamiento_GPS_BackCountry',
    features,
  };

  const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json;charset=utf-8;' });
  downloadBlob(blob, filename);
}

/**
 * Exporta un paquete ZIP completo con el informe CSV, KML, GeoJSON y todas las fotos estampadas
 */
export async function exportToZipWithPhotos(
  waypoints: Waypoint[],
  onProgress?: (percent: number, statusText: string) => void,
  zipFilename = 'Levantamiento_GPS_Fotos_Georeferenciadas.zip'
) {
  const zip = new JSZip();

  onProgress?.(10, 'Generando archivo de datos CSV...');
  // Generar CSV
  const csvHeaders = [
    'Codigo_Punto', 'Nombre', 'Proyecto', 'Categoria', 'Estado', 'Progresiva_PK',
    'Latitud', 'Longitud', 'UTM_Zona', 'UTM_Este', 'UTM_Norte', 'Altitud_m', 'Precision_m', 'Fecha', 'Archivo_Foto', 'Observaciones'
  ];
  const csvLines = [csvHeaders.join(';')];

  const photoFolder = zip.folder('fotos_georeferenciadas');

  let photoIndex = 0;
  const totalPhotos = waypoints.reduce((acc, w) => acc + (w.photos?.length || 0), 0);

  for (let i = 0; i < waypoints.length; i++) {
    const w = waypoints[i];
    const photoNames: string[] = [];

    if (w.photos && w.photos.length > 0 && photoFolder) {
      for (let p = 0; p < w.photos.length; p++) {
        photoIndex++;
        const photo = w.photos[p];
        const cleanCode = w.pointCode.replace(/[^a-zA-Z0-9_-]/g, '_');
        const photoName = `${cleanCode}_foto_${p + 1}.jpg`;
        photoNames.push(photoName);

        // Convertir base64 DataURL a binario para el zip
        const base64Data = photo.dataUrl.split(',')[1];
        if (base64Data) {
          photoFolder.file(photoName, base64Data, { base64: true });
        }

        const pct = 10 + Math.round((photoIndex / Math.max(totalPhotos, 1)) * 60);
        onProgress?.(pct, `Empaquetando foto ${photoIndex} de ${totalPhotos} (${photoName})...`);
      }
    }

    csvLines.push([
      `"${w.pointCode}"`,
      `"${w.name}"`,
      `"${w.project}"`,
      `"${w.category}"`,
      `"${w.condition}"`,
      `"${w.chainagePk || ''}"`,
      `"${w.latitude}"`,
      `"${w.longitude}"`,
      `"${w.utm.zone}${w.utm.hemisphere}"`,
      `"${w.utm.easting}"`,
      `"${w.utm.northing}"`,
      `"${w.altitude ?? ''}"`,
      `"${w.accuracy ?? ''}"`,
      `"${w.createdAt}"`,
      `"${photoNames.join(', ')}"`,
      `"${(w.notes || '').replace(/"/g, '""')}"`,
    ].join(';'));
  }

  // Agregar CSV
  zip.file('datos_campo.csv', '\uFEFF' + csvLines.join('\r\n'));

  // Agregar KML para Google Earth
  onProgress?.(70, 'Generando archivo KML para Google Earth...');
  const kmlString = generateKMLString(waypoints);
  zip.file('levantamiento_campo.kml', kmlString);

  // Agregar GeoJSON
  onProgress?.(78, 'Generando archivo GeoJSON...');
  const features = waypoints.map((w) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [w.longitude, w.latitude, w.altitude ?? 0],
    },
    properties: {
      pointCode: w.pointCode,
      name: w.name,
      category: w.category,
      utm: w.utm.formatted,
      accuracy: w.accuracy,
      date: w.createdAt,
    },
  }));
  zip.file('puntos_georeferenciados.geojson', JSON.stringify({ type: 'FeatureCollection', features }, null, 2));

  onProgress?.(85, 'Comprimiendo archivo ZIP final...');
  const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
    onProgress?.(85 + Math.round(metadata.percent * 0.14), `Comprimiendo: ${Math.round(metadata.percent)}%`);
  });

  onProgress?.(100, 'Descarga lista');
  downloadBlob(zipBlob, zipFilename);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
