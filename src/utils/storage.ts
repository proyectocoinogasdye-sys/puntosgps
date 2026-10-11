import { Waypoint, ProjectSettings, FormTemplate } from '../types';

const DB_NAME = 'backcountry_gps_pro_db';
const DB_VERSION = 1;

const STORE_WAYPOINTS = 'waypoints';
const STORE_SETTINGS = 'settings';
const STORE_TEMPLATES = 'templates';

export const DEFAULT_SETTINGS: ProjectSettings = {
  projectName: 'Inspección de Gasoducto y Topografía',
  defaultInspector: 'Ing. Topógrafo de Campo',
  pointCodePrefix: 'PTO',
  nextPointNumber: 1,
  coordinateDisplayFormat: 'both',
  altitudeUnit: 'm',
  stampStyle: 'banner_solocator',
  includeTimestampOnPhoto: true,
  includeUtmOnPhoto: true,
  includeInspectorOnPhoto: true,
  includeNotesOnPhoto: true,
  includeHeadingOnPhoto: true,
  stampOpacity: 0.85,
};

export const DEFAULT_TEMPLATES: FormTemplate[] = [
  {
    id: 'gasoducto',
    name: 'Gasoductos y Redes de Tuberías',
    description: 'Levantamiento para líneas de flujo, ductos, válvulas y cruces',
    defaultCategory: 'tuberia',
    defaultFields: {
      showChainage: true,
      showDiameter: true,
      showDepth: true,
      showCondition: true,
    },
    customFields: [
      { id: 'presion', label: 'Presión de Operación (PSI)', defaultValue: '600 PSI' },
      { id: 'revestimiento', label: 'Estado de Revestimiento', defaultValue: 'FBE 3LPE Bueno' },
      { id: 'potencial_on_off', label: 'Potencial Catódico (-mV)', defaultValue: '-1150 mV' },
    ],
  },
  {
    id: 'topografia_general',
    name: 'Topografía General / Hitos y BMs',
    description: 'Mojones, vértices geodésicos, límites y puntos de control',
    defaultCategory: 'poste_hito',
    defaultFields: {
      showChainage: false,
      showDiameter: false,
      showDepth: false,
      showCondition: true,
    },
    customFields: [
      { id: 'tipo_mojon', label: 'Tipo de Materialización', defaultValue: 'Mojón de Concreto con Placa' },
      { id: 'metodo_medicion', label: 'Método / Equipo', defaultValue: 'GNSS RTK / GPS Sub-métrico' },
    ],
  },
  {
    id: 'obras_civiles',
    name: 'Obras Civiles e Infraestructura',
    description: 'Cruces subfluviales, muros de contención, zanjas, alcantarillas',
    defaultCategory: 'obra_civil',
    defaultFields: {
      showChainage: true,
      showDiameter: false,
      showDepth: true,
      showCondition: true,
    },
    customFields: [
      { id: 'tipo_estructura', label: 'Tipo de Estructura', defaultValue: 'Muro Gavión / Enrocado' },
      { id: 'longitud_m', label: 'Dimensiones / Afectación (m)', defaultValue: '15 m x 2.5 m' },
    ],
  },
  {
    id: 'ambiental_predial',
    name: 'Inspección Ambiental y Servidumbres',
    description: 'Predios, propietarios, fuentes hídricas y hallazgos ambientales',
    defaultCategory: 'ambiental',
    defaultFields: {
      showChainage: true,
      showDiameter: false,
      showDepth: false,
      showCondition: false,
    },
    customFields: [
      { id: 'nombre_predio', label: 'Nombre de Predio / Finca', defaultValue: '' },
      { id: 'propietario', label: 'Propietario / Contacto', defaultValue: '' },
      { id: 'cuerpo_agua', label: 'Cuerpo de Agua Cercano', defaultValue: 'Río / Quebrada' },
    ],
  },
];

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_WAYPOINTS)) {
        db.createObjectStore(STORE_WAYPOINTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_TEMPLATES)) {
        db.createObjectStore(STORE_TEMPLATES, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getWaypoints(): Promise<Waypoint[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_WAYPOINTS, 'readonly');
      const store = tx.objectStore(STORE_WAYPOINTS);
      const req = store.getAll();
      req.onsuccess = () => {
        const results = req.result as Waypoint[];
        // Ordenar por fecha descendente
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Error cargando waypoints de IndexedDB:', err);
    return [];
  }
}

export async function saveWaypoint(waypoint: Waypoint): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_WAYPOINTS, 'readwrite');
    const store = tx.objectStore(STORE_WAYPOINTS);
    const req = store.put(waypoint);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteWaypoint(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_WAYPOINTS, 'readwrite');
    const store = tx.objectStore(STORE_WAYPOINTS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearAllWaypoints(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_WAYPOINTS, 'readwrite');
    const store = tx.objectStore(STORE_WAYPOINTS);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getProjectSettings(): Promise<ProjectSettings> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SETTINGS, 'readonly');
      const store = tx.objectStore(STORE_SETTINGS);
      const req = store.get('main');
      req.onsuccess = () => {
        if (req.result && req.result.settings) {
          resolve({ ...DEFAULT_SETTINGS, ...req.result.settings });
        } else {
          resolve(DEFAULT_SETTINGS);
        }
      };
      req.onerror = () => resolve(DEFAULT_SETTINGS);
    });
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveProjectSettings(settings: ProjectSettings): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, 'readwrite');
    const store = tx.objectStore(STORE_SETTINGS);
    const req = store.put({ id: 'main', settings });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getFormTemplates(): Promise<FormTemplate[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_TEMPLATES, 'readonly');
      const store = tx.objectStore(STORE_TEMPLATES);
      const req = store.getAll();
      req.onsuccess = () => {
        if (req.result && req.result.length > 0) {
          resolve(req.result);
        } else {
          // Guardar por defecto si no hay
          saveDefaultTemplates().then(() => resolve(DEFAULT_TEMPLATES));
        }
      };
      req.onerror = () => resolve(DEFAULT_TEMPLATES);
    });
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

async function saveDefaultTemplates(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_TEMPLATES, 'readwrite');
    const store = tx.objectStore(STORE_TEMPLATES);
    for (const t of DEFAULT_TEMPLATES) {
      store.put(t);
    }
  } catch (e) {
    console.error(e);
  }
}
