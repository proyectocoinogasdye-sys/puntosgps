import { Waypoint } from '../types';
import { latLonToUTM } from './geo';
import { stampDataOnImage } from './cameraOverlay';
import { DEFAULT_SETTINGS } from './storage';

/**
 * Crea una imagen sintética de fondo para simular una fotografía de campo y le estampa las coordenadas y datos del formulario
 */
async function generateDemoStampedPhoto(
  title: string,
  bgColor: string,
  waypoint: Partial<Waypoint>,
  style: any = 'banner_solocator'
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d')!;

  // Dibujar paisaje de campo / terreno
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 1280, 720);

  // Patrón de terreno / textura de campo
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  for (let i = 0; i < 50; i++) {
    ctx.fillRect(Math.random() * 1280, Math.random() * 500, Math.random() * 80 + 20, Math.random() * 40 + 10);
  }

  // Elemento de infraestructura esquemático
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(400, 250, 480, 180);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 4;
  ctx.strokeRect(400, 250, 480, 180);

  // Texto del objeto en la foto
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 640, 340);
  ctx.font = '20px monospace';
  ctx.fillStyle = '#fde68a';
  ctx.fillText(`[FOTO DE REGISTRO EN CAMPO]`, 640, 380);

  // Estampar los datos del formulario y coordenadas sobre esta imagen
  return await stampDataOnImage(canvas as any, {
    waypoint,
    settings: DEFAULT_SETTINGS,
    compassHeading: waypoint.heading || 140,
    style,
  });
}

export async function createDemoWaypoints(): Promise<Waypoint[]> {
  const baseLat = 4.60971;
  const baseLon = -74.08175;

  const pointsConfig = [
    {
      pointCode: 'PTO-001',
      name: 'Válvula de Seccionamiento K0+000',
      category: 'valvula' as const,
      condition: 'excelente' as const,
      chainagePk: 'K 00+000',
      diameter: '8" ANSI 600',
      depthCover: '1.40 m',
      notes: 'Válvula de bola de alta presión con actuador mecánico. Pintura epóxica en óptimo estado.',
      lat: baseLat,
      lon: baseLon,
      alt: 2640,
      heading: 125,
      photoTitle: 'VÁLVULA DE SECCIONAMIENTO K0+000',
      bgColor: '#1e3a5f',
      style: 'banner_solocator' as const,
    },
    {
      pointCode: 'PTO-002',
      name: 'Cruce Especial Quebrada La Honda',
      category: 'cruce' as const,
      condition: 'bueno' as const,
      chainagePk: 'K 00+240',
      diameter: '8" Recubierto Concreto',
      depthCover: '2.10 m',
      notes: 'Paso subfluvial encamisado. Muro gavión de protección en margen derecha sin socavación.',
      lat: baseLat + 0.0018,
      lon: baseLon + 0.0022,
      alt: 2632,
      heading: 140,
      photoTitle: 'CRUCE SUBFLUVIAL Q. LA HONDA',
      bgColor: '#164e63',
      style: 'banner_solocator' as const,
    },
    {
      pointCode: 'PTO-003',
      name: 'Mojón de Referencia BM-01 (Vértice)',
      category: 'poste_hito' as const,
      condition: 'excelente' as const,
      chainagePk: 'K 00+410',
      diameter: 'Placa Bronce 10cm',
      depthCover: '0.00 m',
      notes: 'Hito de concreto materializado. Coordenadas amarradas a red geodésica MAGNA-SIRGAS.',
      lat: baseLat + 0.0035,
      lon: baseLon + 0.0041,
      alt: 2648,
      heading: 190,
      photoTitle: 'MOJÓN BM-01 DE CONTROL TOPOGRÁFICO',
      bgColor: '#2e3a24',
      style: 'hud_theodolite' as const,
    },
    {
      pointCode: 'PTO-004',
      name: 'Junta de Soldadura K0+590',
      category: 'soldadura' as const,
      condition: 'bueno' as const,
      chainagePk: 'K 00+590',
      diameter: '8" API 5L X52',
      depthCover: '1.60 m',
      notes: 'Inspección visual y ultrasonido aprobada. Manga termocontraíble Canusa colocada.',
      lat: baseLat + 0.0052,
      lon: baseLon + 0.0063,
      alt: 2655,
      heading: 155,
      photoTitle: 'JUNTA DE CAMPO N° 42',
      bgColor: '#3f2c20',
      style: 'card_compact' as const,
    },
  ];

  const waypoints: Waypoint[] = [];

  for (const p of pointsConfig) {
    const utm = latLonToUTM(p.lat, p.lon);
    const partialWaypoint: Partial<Waypoint> = {
      pointCode: p.pointCode,
      name: p.name,
      project: 'Inspección de Gasoducto y Topografía',
      sector: 'Sector Variante El Porvenir',
      category: p.category,
      condition: p.condition,
      chainagePk: p.chainagePk,
      diameter: p.diameter,
      depthCover: p.depthCover,
      inspector: 'Ing. Topógrafo de Campo',
      notes: p.notes,
      latitude: p.lat,
      longitude: p.lon,
      altitude: p.alt,
      accuracy: 2.1,
      heading: p.heading,
      utm,
      createdAt: new Date(Date.now() - Math.random() * 3600000 * 24).toISOString(),
    };

    const stampedPhotoUrl = await generateDemoStampedPhoto(p.photoTitle, p.bgColor, partialWaypoint, p.style);

    waypoints.push({
      id: `demo_${p.pointCode}`,
      pointCode: p.pointCode,
      name: p.name,
      project: 'Inspección de Gasoducto y Topografía',
      sector: 'Sector Variante El Porvenir',
      category: p.category,
      condition: p.condition,
      chainagePk: p.chainagePk,
      diameter: p.diameter,
      depthCover: p.depthCover,
      inspector: 'Ing. Topógrafo de Campo',
      notes: p.notes,
      latitude: p.lat,
      longitude: p.lon,
      altitude: p.alt,
      accuracy: 2.1,
      heading: p.heading,
      utm,
      createdAt: partialWaypoint.createdAt!,
      photos: [
        {
          id: `photo_${p.pointCode}_1`,
          dataUrl: stampedPhotoUrl,
          timestamp: partialWaypoint.createdAt!,
          caption: `${p.pointCode} - ${p.name}`,
          stampStyle: p.style,
        },
      ],
    });
  }

  return waypoints;
}
