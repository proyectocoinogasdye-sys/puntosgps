export type ElementCategory = 
  | 'valvula'
  | 'tuberia'
  | 'cruce'
  | 'poste_hito'
  | 'obra_civil'
  | 'geotecnia'
  | 'ambiental'
  | 'servidumbre'
  | 'soldadura'
  | 'general';

export type ConditionState = 'excelente' | 'bueno' | 'regular' | 'malo' | 'critico' | 'en_construccion';

export type StampStyle = 'banner_solocator' | 'hud_theodolite' | 'card_compact' | 'split_top_bottom';

export interface UTMCoordinates {
  zone: number;
  hemisphere: 'N' | 'S';
  easting: number;
  northing: number;
  formatted: string;
}

export interface GPSReading {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
  utm?: UTMCoordinates;
}

export interface CustomField {
  id: string;
  label: string;
  value: string;
}

export interface Waypoint {
  id: string;
  pointCode: string; // ej: PTO-001, PK-0+350
  name: string;
  project: string; // ej: Gasoducto Tramo Central
  sector?: string;
  category: ElementCategory;
  condition: ConditionState;
  chainagePk?: string; // Progresiva / Abscisa ej: K0+150
  diameter?: string; // ej: 8" ANSI 600
  depthCover?: string; // ej: 1.20 m
  inspector: string; // Nombre del técnico
  notes: string;
  
  // Georreferenciación
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number;
  heading: number | null;
  utm: UTMCoordinates;
  createdAt: string; // ISO
  
  // Fotos estampadas
  photos: StampedPhoto[];
  customFields?: CustomField[];
}

export interface StampedPhoto {
  id: string;
  dataUrl: string; // Base64 de la imagen con coordenadas estampadas
  rawPhotoUrl?: string; // Foto original sin estampa (opcional)
  timestamp: string;
  caption?: string;
  stampStyle: StampStyle;
}

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  defaultCategory: ElementCategory;
  defaultFields: {
    showChainage: boolean;
    showDiameter: boolean;
    showDepth: boolean;
    showCondition: boolean;
  };
  customFields: { id: string; label: string; defaultValue: string }[];
}

export interface ProjectSettings {
  projectName: string;
  defaultInspector: string;
  pointCodePrefix: string;
  nextPointNumber: number;
  coordinateDisplayFormat: 'both' | 'utm' | 'dd' | 'dms';
  altitudeUnit: 'm' | 'ft';
  stampStyle: StampStyle;
  includeTimestampOnPhoto: boolean;
  includeUtmOnPhoto: boolean;
  includeInspectorOnPhoto: boolean;
  includeNotesOnPhoto: boolean;
  includeHeadingOnPhoto: boolean;
  stampOpacity: number;
}
