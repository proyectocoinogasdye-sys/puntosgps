import { Waypoint, StampStyle, ProjectSettings } from '../types';

export interface OverlayOptions {
  waypoint: Partial<Waypoint>;
  settings: ProjectSettings;
  customNotes?: string;
  compassHeading?: number | null;
  style?: StampStyle;
}

/**
 * Superpone en la fotografía EXACTAMENTE los 4 datos solicitados por el usuario:
 * 1. Nombre del punto
 * 2. Coordenadas (Latitud/Longitud WGS84 y UTM)
 * 3. Fecha y Hora exacta
 * 4. Tipo de Elemento / Infraestructura
 */
export async function stampDataOnImage(
  imageSource: HTMLImageElement | HTMLVideoElement,
  options: OverlayOptions
): Promise<string> {
  const { waypoint, settings, style = 'banner_solocator' } = options;

  // Obtener dimensiones reales
  const width =
    imageSource instanceof HTMLVideoElement
      ? imageSource.videoWidth || 1920
      : imageSource.naturalWidth || 1920;
  const height =
    imageSource instanceof HTMLVideoElement
      ? imageSource.videoHeight || 1080
      : imageSource.naturalHeight || 1080;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo inicializar el contexto 2D del Canvas');

  // 1. Dibujar la imagen base
  ctx.drawImage(imageSource, 0, 0, width, height);

  // 2. Factores de escala relativos al ancho para óptima legibilidad
  const scale = Math.max(width / 1200, 0.75);
  const pad = 24 * scale;

  // Los 4 datos exactos:
  // 1. Nombre del punto
  const pointName = (waypoint.name && waypoint.name.trim() !== '' && waypoint.name !== waypoint.pointCode)
    ? `${waypoint.pointCode || 'PTO-000'} - ${waypoint.name}`
    : (waypoint.pointCode || 'PTO-000');

  // 2. Coordenadas
  const lat = waypoint.latitude ?? 0;
  const lon = waypoint.longitude ?? 0;
  const latFormatted = `${lat >= 0 ? '+' : ''}${lat.toFixed(6)}°`;
  const lonFormatted = `${lon >= 0 ? '+' : ''}${lon.toFixed(6)}°`;
  const utmFormatted = waypoint.utm?.formatted || '';

  // 3. Fecha y Hora
  const dateObj = waypoint.createdAt ? new Date(waypoint.createdAt) : new Date();
  const dateStr = dateObj.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = dateObj.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const fullDateTime = `${dateStr}  ${timeStr}`;

  // 4. Tipo de Elemento / Infraestructura
  const categoryNames: Record<string, string> = {
    valvula: 'VÁLVULA DE CONTROL / DUCTO',
    tuberia: 'TUBERÍA / DUCTO DE TRANSPORTE',
    cruce: 'CRUCE ESPECIAL (VÍA / RÍO)',
    poste_hito: 'HITO / MOJÓN BM TOPOGRÁFICO',
    soldadura: 'JUNTA / SOLDADURA DE LÍNEA',
    obra_civil: 'OBRA CIVIL / INFRAESTRUCTURA',
    geotecnia: 'TALUD / GEOTECNIA',
    ambiental: 'PUNTO AMBIENTAL / CAUCE',
    servidumbre: 'PREDIO / SERVIDUMBRE',
    general: 'ELEMENTO GENERAL DE CAMPO',
  };
  const categoryLabel = categoryNames[waypoint.category || 'general'] || (waypoint.category || 'INFRAESTRUCTURA').toUpperCase();

  ctx.save();

  if (style === 'card_compact') {
    renderCardStyle(ctx, width, height, scale, pad, {
      pointName,
      latFormatted,
      lonFormatted,
      utmFormatted,
      fullDateTime,
      categoryLabel,
    });
  } else {
    // Banner estándar de alta visibilidad (Solocator / Topo Banner)
    renderBannerStyle(ctx, width, height, scale, pad, {
      pointName,
      latFormatted,
      lonFormatted,
      utmFormatted,
      fullDateTime,
      categoryLabel,
      opacity: settings.stampOpacity || 0.88,
    });
  }

  ctx.restore();

  return canvas.toDataURL('image/jpeg', 0.92);
}

/**
 * ESTILO BANNER: Franja inferior de alto contraste con EXACTAMENTE los 4 datos
 */
function renderBannerStyle(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number,
  pad: number,
  data: {
    pointName: string;
    latFormatted: string;
    lonFormatted: string;
    utmFormatted: string;
    fullDateTime: string;
    categoryLabel: string;
    opacity: number;
  }
) {
  const bannerHeight = Math.min(height * 0.28, 175 * scale);
  const bannerY = height - bannerHeight;

  // Fondo oscuro con opacidad
  ctx.fillStyle = `rgba(12, 14, 18, ${data.opacity})`;
  ctx.fillRect(0, bannerY, width, bannerHeight);

  // Línea divisoria superior ámbar de alta visibilidad
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(0, bannerY, width, 4 * scale);

  // 1. DATO 1: NOMBRE DEL PUNTO (Destacado en esquina superior izquierda con badge)
  const badgeX = pad;
  const badgeY = bannerY + 14 * scale;

  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, 130 * scale, 30 * scale, 6 * scale);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${15 * scale}px 'JetBrains Mono', monospace`;
  ctx.textAlign = 'left';
  ctx.fillText('PUNTO', badgeX + 10 * scale, badgeY + 20 * scale);

  // Nombre del punto en texto grande y blanco
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${18 * scale}px 'Inter', sans-serif`;
  ctx.fillText(data.pointName, badgeX + 142 * scale, badgeY + 22 * scale);

  // 2. DATO 3: FECHA Y HORA (En esquina superior derecha)
  ctx.fillStyle = '#94a3b8';
  ctx.font = `bold ${14 * scale}px 'JetBrains Mono', monospace`;
  ctx.textAlign = 'right';
  ctx.fillText(data.fullDateTime, width - pad, badgeY + 22 * scale);

  // Separador fino
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fillRect(pad, bannerY + 56 * scale, width - pad * 2, 1.5 * scale);

  // 3. DATO 4: TIPO DE ELEMENTO / INFRAESTRUCTURA (Fila 2)
  const row2Y = bannerY + 84 * scale;
  ctx.textAlign = 'left';

  ctx.fillStyle = '#f59e0b';
  ctx.font = `bold ${12 * scale}px 'Inter', sans-serif`;
  ctx.fillText('ELEMENTO / INFRAESTRUCTURA:', pad, row2Y);

  ctx.fillStyle = '#a7f3d0';
  ctx.font = `bold ${16 * scale}px 'Inter', sans-serif`;
  ctx.fillText(data.categoryLabel, pad + 225 * scale, row2Y);

  // 4. DATO 2: COORDENADAS (WGS84 y UTM) (Fila 3)
  const row3Y = bannerY + 120 * scale;

  ctx.fillStyle = '#38bdf8';
  ctx.font = `bold ${12 * scale}px 'JetBrains Mono', monospace`;
  ctx.fillText('COORDENADAS GPS:', pad, row3Y);

  // Lat / Lon
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${16 * scale}px 'JetBrains Mono', monospace`;
  const coordsText = `LAT: ${data.latFormatted}   LON: ${data.lonFormatted}`;
  ctx.fillText(coordsText, pad + 155 * scale, row3Y);

  // UTM
  if (data.utmFormatted) {
    ctx.fillStyle = '#fbbf24';
    ctx.font = `bold ${14 * scale}px 'JetBrains Mono', monospace`;
    ctx.fillText(`[${data.utmFormatted}]`, pad + 540 * scale, row3Y);
  }
}

/**
 * ESTILO TARJETA COMPACTA: Bloque flotante elegante con los 4 datos
 */
function renderCardStyle(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number,
  pad: number,
  data: {
    pointName: string;
    latFormatted: string;
    lonFormatted: string;
    utmFormatted: string;
    fullDateTime: string;
    categoryLabel: string;
  }
) {
  const cardW = Math.min(width * 0.85, 580 * scale);
  const cardH = 160 * scale;
  const cardX = pad;
  const cardY = height - cardH - pad;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2.5 * scale;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 10 * scale);
  ctx.fill();
  ctx.stroke();

  // 1. Nombre
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f59e0b';
  ctx.font = `bold ${17 * scale}px 'JetBrains Mono', monospace`;
  ctx.fillText(data.pointName, cardX + 16 * scale, cardY + 30 * scale);

  // 3. Fecha y Hora
  ctx.fillStyle = '#94a3b8';
  ctx.font = `${12 * scale}px 'JetBrains Mono', monospace`;
  ctx.fillText(data.fullDateTime, cardX + 16 * scale, cardY + 54 * scale);

  // 4. Tipo de Elemento
  ctx.fillStyle = '#a7f3d0';
  ctx.font = `bold ${15 * scale}px 'Inter', sans-serif`;
  ctx.fillText(`Elemento: ${data.categoryLabel}`, cardX + 16 * scale, cardY + 86 * scale);

  // 2. Coordenadas
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${14 * scale}px 'JetBrains Mono', monospace`;
  ctx.fillText(`LAT/LON: ${data.latFormatted}, ${data.lonFormatted}`, cardX + 16 * scale, cardY + 116 * scale);

  if (data.utmFormatted) {
    ctx.fillStyle = '#38bdf8';
    ctx.font = `bold ${12.5 * scale}px 'JetBrains Mono', monospace`;
    ctx.fillText(data.utmFormatted, cardX + 16 * scale, cardY + 140 * scale);
  }
}
