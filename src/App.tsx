/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Waypoint, ProjectSettings } from './types';
import { useGPS } from './hooks/useGPS';
import {
  getWaypoints,
  saveWaypoint,
  deleteWaypoint,
  clearAllWaypoints,
  getProjectSettings,
  saveProjectSettings,
  DEFAULT_SETTINGS,
} from './utils/storage';
import { createDemoWaypoints } from './utils/demoData';

import { Navbar, ActiveTab } from './components/Navbar';
import { GPSTrackerBar } from './components/GPSTrackerBar';
import { MapView } from './components/MapView';
import { WaypointsList } from './components/WaypointsList';
import { CaptureModal } from './components/CaptureModal';
import { ExportModal } from './components/ExportModal';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [settings, setSettings] = useState<ProjectSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<ActiveTab>('map');

  const [isCaptureOpen, setIsCaptureOpen] = useState<boolean>(false);
  const [editingWaypoint, setEditingWaypoint] = useState<Waypoint | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // GPS Hook
  const {
    reading: liveGps,
    effectiveReading: gpsReading,
    compassHeading,
    isAveraging,
    averageCount,
    startAveraging,
    error: gpsError,
  } = useGPS();

  // Mostrar mensaje toast
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Cargar datos iniciales desde IndexedDB
  useEffect(() => {
    async function loadData() {
      try {
        const storedSettings = await getProjectSettings();
        setSettings(storedSettings);

        const storedWaypoints = await getWaypoints();
        if (storedWaypoints.length > 0) {
          setWaypoints(storedWaypoints);
        } else {
          // Si está vacío en la primera carga, inicializar con datos de prueba
          const demoPoints = await createDemoWaypoints();
          for (const dp of demoPoints) {
            await saveWaypoint(dp);
          }
          setWaypoints(demoPoints);
        }
      } catch (err) {
        console.error('Error cargando datos de IndexedDB:', err);
      }
    }

    loadData();
  }, []);

  // Guardar punto (crear o editar)
  const handleSaveWaypoint = async (savedWp: Waypoint) => {
    try {
      await saveWaypoint(savedWp);

      // Si es un punto nuevo, auto-incrementar contador en settings
      const isNew = !waypoints.some((w) => w.id === savedWp.id);
      if (isNew) {
        const updatedSettings = {
          ...settings,
          nextPointNumber: settings.nextPointNumber + 1,
        };
        setSettings(updatedSettings);
        await saveProjectSettings(updatedSettings);
      }

      // Actualizar lista en estado
      setWaypoints((prev) => {
        const index = prev.findIndex((w) => w.id === savedWp.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = savedWp;
          return updated;
        } else {
          return [savedWp, ...prev];
        }
      });

      setIsCaptureOpen(false);
      setEditingWaypoint(null);
      showToast(`Punto ${savedWp.pointCode} guardado con éxito.`);
    } catch (err) {
      console.error(err);
      alert('Error guardando el punto.');
    }
  };

  // Eliminar punto
  const handleDeleteWaypoint = async (id: string) => {
    try {
      await deleteWaypoint(id);
      setWaypoints((prev) => prev.filter((w) => w.id !== id));
      showToast('Punto eliminado.');
    } catch (err) {
      console.error(err);
    }
  };

  // Guardar configuración
  const handleSaveSettings = async (newSettings: ProjectSettings) => {
    setSettings(newSettings);
    await saveProjectSettings(newSettings);
    showToast('Ajustes guardados correctamente.');
  };

  // Cargar datos demo
  const handleLoadDemoData = async () => {
    const demo = await createDemoWaypoints();
    for (const d of demo) {
      await saveWaypoint(d);
    }
    setWaypoints(demo);
    showToast('Datos de demostración cargados con éxito.');
  };

  // Borrar todos los puntos
  const handleClearAllData = async () => {
    await clearAllWaypoints();
    setWaypoints([]);
    showToast('Todos los datos fueron borrados.');
  };

  // Importar puntos
  const handleImportWaypoints = async (imported: Waypoint[]) => {
    for (const w of imported) {
      await saveWaypoint(w);
    }
    const all = await getWaypoints();
    setWaypoints(all);
    showToast(`${imported.length} puntos importados correctamente.`);
  };

  // Ver un punto específico en el mapa
  const handleViewOnMap = (wp: Waypoint) => {
    setActiveTab('map');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-stone-950 text-stone-100 font-sans">
      {/* 1. Barra de Navegación Principal */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        waypointCount={waypoints.length}
        onOpenCapture={() => {
          setEditingWaypoint(null);
          setIsCaptureOpen(true);
        }}
        projectName={settings.projectName}
      />

      {/* 2. Barra de Telemetría GPS en Vivo (Lat/Lon, UTM, Elevación, Brújula y Disparador) */}
      <GPSTrackerBar
        gps={gpsReading}
        compassHeading={compassHeading}
        isAveraging={isAveraging}
        averageCount={averageCount}
        onStartAveraging={startAveraging}
        onCaptureClick={() => {
          setEditingWaypoint(null);
          setIsCaptureOpen(true);
        }}
        error={gpsError}
      />

      {/* 3. Área de Contenido Principal según Pestaña Activa */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {/* Pestaña: MAPA */}
        {activeTab === 'map' && (
          <MapView
            waypoints={waypoints}
            currentGps={gpsReading}
            compassHeading={compassHeading}
            onSelectWaypoint={(w) => {
              setEditingWaypoint(w);
              setIsCaptureOpen(true);
            }}
          />
        )}

        {/* Pestaña: LISTA DE PUNTOS & FOTOS */}
        {activeTab === 'list' && (
          <WaypointsList
            waypoints={waypoints}
            onSelectWaypoint={(w) => {
              setEditingWaypoint(w);
              setIsCaptureOpen(true);
            }}
            onEditWaypoint={(w) => {
              setEditingWaypoint(w);
              setIsCaptureOpen(true);
            }}
            onDeleteWaypoint={handleDeleteWaypoint}
            onViewOnMap={handleViewOnMap}
          />
        )}

        {/* Pestaña: EXPORTAR */}
        {activeTab === 'export' && (
          <div className="flex-1 p-4 overflow-y-auto">
            <ExportModal
              waypoints={waypoints}
              onImportWaypoints={handleImportWaypoints}
              onClose={() => setActiveTab('map')}
            />
          </div>
        )}

        {/* Pestaña: AJUSTES */}
        {activeTab === 'settings' && (
          <div className="flex-1 p-4 overflow-y-auto">
            <SettingsModal
              settings={settings}
              onSaveSettings={handleSaveSettings}
              onClearAllData={handleClearAllData}
              onLoadDemoData={handleLoadDemoData}
              onClose={() => setActiveTab('map')}
            />
          </div>
        )}
      </main>

      {/* 4. Modal de Formulario Técnico de Campo + Cámara con Estampado de Coordenadas */}
      {isCaptureOpen && (
        <CaptureModal
          initialGps={gpsReading}
          compassHeading={compassHeading}
          settings={settings}
          existingWaypoint={editingWaypoint}
          onSave={handleSaveWaypoint}
          onClose={() => {
            setIsCaptureOpen(false);
            setEditingWaypoint(null);
          }}
        />
      )}

      {/* Notificación Toast Flotante */}
      {toastMessage && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-stone-900 border border-amber-500/80 text-amber-300 font-mono text-xs px-4 py-2 rounded-lg shadow-2xl backdrop-blur flex items-center gap-2 animate-bounce">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
